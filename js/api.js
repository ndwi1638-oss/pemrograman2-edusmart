/* ==========================================================================
   EduSmart - js/api.js | Lapisan penyimpanan data
   --------------------------------------------------------------------------
   Dipakai oleh seluruh halaman (dimuat sebelum js/main.js). Fungsinya satu:
   menyediakan objek global DB dengan kontrak yang sama dengan localStorage
   (getItem/setItem/removeItem), tetapi datanya diambil dari SQLite.

  Alur kerja:
   - Server menyuntikkan data ke setiap halaman .html sebagai skrip pertama
     (window.__EDUSMART_BOOTSTRAP__), jadi DB.get() bisa dijawab sinkron dari
     cache tanpa menunggu fetch. Karena itu seluruh kode lama yang membaca
     "JSON.parse(DB.get(key))" tetap bekerja tanpa perubahan.
   - DB.set()/DB.del() menulis ke cache lalu mengirim ke server (antrean, agar
     urutannya tidak kacau). Tampilan di halaman tidak menunggu server.
   - Data di LocalStorage lama (dari versi sebelum migrasi) dipindahkan ke
     SQLite satu kali saat pertama kali memakai server dengan DB kosong.

   Mode cadangan:
   - Bila halaman dibuka langsung dari berkas (file://, tanpa server),
     __EDUSMART_BOOTSTRAP__ tidak ada sehingga DB memakai LocalStorage seperti
     sebelumnya. Aplikasi tetap berjalan, hanya tidak tersinkron antar DEVICE.

   Kunci yang tetap lokal per browser (sengaja tidak dikirim ke server):
   sesi login (edusmart_session, edusmart_current_user) dan data sementara
   antar halaman (edusmart_nilai_prefill). Alasannya: satu orang bisa membuka
   dua browser (mis. admin di Chrome, guru di Edge) tanpa saling menimpa sesi.
   ========================================================================== */

(function () {
  "use strict";

  var boot = window.__EDUSMART_BOOTSTRAP__ || null;
  var serverAktif = !!(boot && boot.server);

  var LOKAL = {
    "edusmart_session": 1,
    "edusmart_current_user": 1,
    "edusmart_nilai_prefill": 1
  };

  var cache = {};        // key -> string (isi mentah, seperti localStorage)
  var antre = Promise.resolve();

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } }

  /* Isi cache dari data server.
     PENTING: tabel/kv yang KOSONG tidak dimuat, supaya DB.get() mengembalikan
     null untuk data yang belum pernah diisi - persis seperti LocalStorage
     versi lama. Kode lama memakai pola "if (DB.get(k) === null) isi default",
     jadi tabel kosong harus tetap terbaca sebagai "belum ada". */
  function isiCache(tables, kv) {
    cache = {};
    Object.keys(tables || {}).forEach(function (k) {
      var v = tables[k];
      if (Array.isArray(v) && v.length === 0) return;
      cache[k] = JSON.stringify(v);
    });
    Object.keys(kv || {}).forEach(function (k) {
      if (kv[k] === null || kv[k] === "") return;
      cache[k] = kv[k];
    });
  }

  if (serverAktif) isiCache(boot.tables, boot.kv);

  function antrekan(tugas) {
    antre = antre.then(tugas, tugas);
    return antre;
  }

  function kirim(key, value) {
    antrekan(function () {
      return fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key, value: value })
      }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
      }).catch(function (e) {
        console.warn("[EduSmart] gagal menyimpan \"" + key + "\" ke server: " + e.message);
      });
    });
  }

  window.DB = {
    /* true bila data berasal dari SQLite (server aktif) */
    aktif: serverAktif,
    basisdata: serverAktif ? boot.db : null,

    get: function (key) {
      if (!serverAktif || LOKAL[key]) return lsGet(key);
      return Object.prototype.hasOwnProperty.call(cache, key) ? cache[key] : null;
    },

    set: function (key, value) {
      var v = (value === undefined || value === null) ? null : String(value);
      if (!serverAktif || LOKAL[key]) { lsSet(key, v); return; }
      cache[key] = v;
      kirim(key, v);
    },

    del: function (key) {
      if (!serverAktif || LOKAL[key]) { lsDel(key); return; }
      delete cache[key];
      antrekan(function () {
        return fetch("/api/data/" + encodeURIComponent(key), { method: "DELETE" })
          .catch(function (e) {
            console.warn("[EduSmart] gagal menghapus \"" + key + "\": " + e.message);
          });
      });
    },

    /* Tunggu semua antrean tulis selesai (dipakai halaman Thank you/backup). */
    tulisSelesai: function () { return antre; },

    /* Muat ulang data dari server (setelah halaman lain mengubah data). */
    muatUlang: function () {
      if (!serverAktif) return antre;
      return antrekan(function () {
        return fetch("/api/data", { cache: "no-store" }).then(function (r) { return r.json(); })
          .then(function (d) {
            if (!d || !d.tables) return;
            isiCache(d.tables, d.kv);
          }).catch(function (e) {
            console.warn("[EduSmart] gagal memuat ulang data: " + e.message);
          });
      });
    }
  };

  /* ---------- Pindah sekali data LocalStorage lama ke SQLite ---------- */
  var TANDA = "edusmart_sudah_pindah_sqlite";
  if (serverAktif && boot.kosong && !lsGet(TANDA)) {
    var kunci = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf("edusmart_") === 0 && !LOKAL[k]) kunci.push(k);
    }
    if (kunci.length) {
      kunci.forEach(function (k) {
        var v = lsGet(k);
        cache[k] = v;
        kirim(k, v);
      });
      console.info("[EduSmart] " + kunci.length + " data lama dipindahkan dari LocalStorage ke SQLite.");
    }
    lsSet(TANDA, new Date().toISOString());
  }
})();
