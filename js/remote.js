/* ==========================================================================
   EduSmart - js/remote.js | Penyimpanan awan (Firebase Realtime Database)
   --------------------------------------------------------------------------
   Dimuat SEBELUM js/api.js di setiap halaman.

   Tujuan: supaya data yang di-ubah admin (foto galeri, foto tim, beasiswa,
   OSIS, data siswa/guru, dsb) tersimpan di server dan TAMPIL UNTUK SEMUA
   ORANG / semua perangkat - bukan hanya di browser tempat admin meng-upload.

   Cara kerja singkat:
     - Semua kunci localStorage yang berawalan "edusmart_" (KECUALI sesi login)
       disalin ke Firebase lewat REST API.
     - Saat halaman dibuka: data terakhir dari Firebase dibaca, lalu dipakai
       sebagai isi DB. Bila Firebase masih kosong (pertama kali), data yang ada
       di browser ini di-upload ke Firebase (migrasi otomatis).
     - Saat admin mengubah sesuatu, perubahan langsung dikirim ke Firebase.

   Konfigurasi ada di js/firebase-config.js (cukup 1 alamat database).
   Bila belum diisi, file ini tidak melakukan apa-apa dan situs berjalan
   seperti biasa (localStorage saja).
   ========================================================================== */

(function () {
  "use strict";

  var CFG = window.EDUSMART_FIREBASE || {};
  var ROOT = "edusmart";                     // nama folder di database
  var MIRROR_KEY = "edusmart_remote_mirror"; // cadangan lokal data awan

  /* Kunci yang SENGAJA tetap lokal per-browser (tidak dikirim ke awan). */
  var LOKAL = {
    "edusmart_session": 1,
    "edusmart_current_user": 1,
    "edusmart_nilai_prefill": 1,
    "edusmart_sudah_pindah_sqlite": 1,
    MIRROR_KEY: 1
  };

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } }

  function bacaMirror() {
    try {
      var m = JSON.parse(lsGet(MIRROR_KEY));
      return (m && typeof m === "object") ? m : null;
    } catch (e) { return null; }
  }
  function tulisMirror(obj) { lsSet(MIRROR_KEY, JSON.stringify(obj || {})); }

  /* Ambil semua data edusmart_* yang ada di browser ini (kandidat migrasi). */
  function snapshotLokal() {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("edusmart_") === 0 && !LOKAL[k]) {
          var v = localStorage.getItem(k);
          if (v !== null && v !== "") out[k] = v;
        }
      }
    } catch (e) { /* abaikan */ }
    return out;
  }

  /* Alamat database: terima "databaseURL" langsung, atau gaya firebaseConfig
     lama ("config.databaseURL"). */
  var alamat = (CFG.databaseURL || (CFG.config && CFG.config.databaseURL) || "").trim();
  alamat = alamat.replace(/\/+$/, "");

  var aktif = CFG.enabled === true && alamat.indexOf("http") === 0;

  var REMOTE = {
    aktif: !!aktif,
    siap: null,                 // promise: selesai membaca/menyiapkan data awan
    berhasil: false,            // true setelah data awan berhasil dibaca
    put: function () { return Promise.resolve(); },
    del: function () { return Promise.resolve(); },
    muatUlang: function () { return Promise.resolve(null); }
  };
  window.EduSmartRemote = REMOTE;

  /* true bila aman menulis data default/kosong: artinya fitur awan tidak aktif,
     ATAU data awan sudah berhasil dibaca. Dipakai halaman supaya tidak menimpa
     data server dengan array kosong saat data awan belum termuat. */
  window.EduSmartAwanSiap = function () {
    return !REMOTE.aktif || REMOTE.berhasil === true;
  };

  /* Dipakai tiap halaman: jalankan fn() setelah DOM siap DAN data awan siap
     (atau langsung bila fitur awan tidak aktif). Selalu tersedia. */
  window.EduSmartReady = function (fn) {
    var jalankan = function () { try { fn(); } catch (e) { console.error("[EduSmart] init:", e); } };
    var domSiap = new Promise(function (selesai) {
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", selesai);
      else selesai();
    });
    var p = (window.EduSmartRemote && window.EduSmartRemote.siap) || Promise.resolve();
    return domSiap.then(function () { return p; }).then(jalankan, jalankan);
  };

  if (!aktif) {
    REMOTE.siap = Promise.resolve();
    return;
  }

  /* Data awal untuk tampilan pertama (sinkron): gabungan data lokal + cadangan
     awan terakhir, supaya tidak berkedip. Data awan menyusul di kerja(). */
  var lokalAwal = snapshotLokal();
  var cadanganAwal = bacaMirror() || {};
  var awal = Object.assign({}, lokalAwal, cadanganAwal);
  REMOTE._mirror = awal;
  window.__EDUSMART_BOOTSTRAP__ = {
    server: true,
    db: "firebase",
    tables: {},
    kv: awal,
    kosong: false
  };

  function urlData() { return alamat + "/" + ROOT + ".json"; }
  function urlKunci(key) { return alamat + "/" + ROOT + "/" + encodeURIComponent(key) + ".json"; }

  function ambilAwan() {
    return fetch(urlData(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (d) {
      return (d && typeof d === "object") ? d : {};
    });
  }

  function tulisAwan(obj) {
    return fetch(urlData(), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obj)
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function hapusAwan(key) {
    return fetch(urlKunci(key), { method: "DELETE" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
    });
  }

  /* true bila nilai dianggap kosong (belum ada / array / objek kosong). */
  function kosong(v) {
    if (v === null || v === undefined) return true;
    var s = String(v).trim();
    return s === "" || s === "[]" || s === "{}" || s === "null";
  }

  /* true bila dua objek {kunci: nilai} berbeda. */
  function beda(a, b) {
    a = a || {}; b = b || {};
    var ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return true;
    for (var i = 0; i < ka.length; i++) {
      if (a[ka[i]] !== b[ka[i]]) return true;
    }
    return false;
  }

  REMOTE.put = function (key, value) {
    if (key === MIRROR_KEY) return Promise.resolve();
    if (REMOTE._mirror) {
      if (value === null || value === undefined) delete REMOTE._mirror[key];
      else REMOTE._mirror[key] = value;
      tulisMirror(REMOTE._mirror);
    }
    var kirim = {};
    kirim[key] = (value === null || value === undefined) ? null : value;
    return tulisAwan(kirim);
  };

  REMOTE.del = function (key) {
    if (key === MIRROR_KEY) return Promise.resolve();
    if (REMOTE._mirror) { delete REMOTE._mirror[key]; tulisMirror(REMOTE._mirror); }
    return hapusAwan(key);
  };

  REMOTE.muatUlang = function () {
    return ambilAwan().then(function (data) {
      delete data[MIRROR_KEY];
      var mirror = bacaMirror() || {};
      delete mirror[MIRROR_KEY];
      var berubah = false;
      Object.keys(data).forEach(function (k) {
        if (mirror[k] !== data[k]) { mirror[k] = data[k]; berubah = true; }
      });
      tulisMirror(mirror);
      REMOTE._mirror = mirror;
      if (window.DB && window.DB.terapkanData) window.DB.terapkanData(mirror);
      return berubah ? mirror : null;
    });
  };

  function kerja() {
    return ambilAwan().then(function (data) {
      REMOTE.berhasil = true;   // data awan sukses dibaca -> aman menulis default
      delete data[MIRROR_KEY];
      var mirror = bacaMirror() || {};
      delete mirror[MIRROR_KEY];
      var lokal = snapshotLokal();

      /* Gabungan: data lokal + cadangan lokal, lalu data AWAN paling menang.
         TETAPI data awan yang KOSONG tidak menimpa data lokal yang ada isinya
         (perlindungan dari array kosong yang sempat tersimpan).
         Kunci cadangan (mirror) tidak boleh ikut dikirim ke awan. */
      var gabung = Object.assign({}, lokal, mirror);
      delete gabung[MIRROR_KEY];
      var dorong = {};

      Object.keys(data).forEach(function (k) {
        if (kosong(data[k]) && !kosong(gabung[k])) dorong[k] = gabung[k];
        else gabung[k] = data[k];
      });

      /* Kunci yang belum ada di awan di-upload ke awan (migrasi otomatis),
         sehingga foto/data lama di browser ini ikut tampil untuk semua. */
      Object.keys(gabung).forEach(function (k) {
        if (!(k in data)) dorong[k] = gabung[k];
      });

      tulisMirror(gabung);
      REMOTE._mirror = gabung;
      if (window.DB && window.DB.terapkanData) window.DB.terapkanData(gabung);

      var tugas = [];
      if (Object.keys(dorong).length) tugas.push(tulisAwan(dorong));

      return Promise.all(tugas).then(function () {
        /* Bila data awan baru tiba setelah init terlanjur jalan (jaringan
           lambat), muat ulang sekali supaya data terbaru tampil. */
        if (REMOTE._siapSudah && beda(data, awal)) {
          try {
            var t = Number(sessionStorage.getItem("edusmart_awan_reload") || 0);
            if (Date.now() - t > 15000) {
              sessionStorage.setItem("edusmart_awan_reload", String(Date.now()));
              location.reload();
            }
          } catch (e) { /* abaikan */ }
        }
        return gabung;
      });
    });
  }

  /* Batas waktu: jangan sampai halaman menunggu selamanya bila jaringan lambat. */
  function denganBatas(p, ms) {
    return Promise.race([
      p,
      new Promise(function (selesai) { setTimeout(selesai, ms); })
    ]);
  }

  REMOTE.siap = denganBatas(
    kerja().catch(function (e) {
      console.warn("[EduSmart] Database awan bermasalah, memakai data lokal: " + e.message);
    }),
    10000
  );

  REMOTE.siap.then(function () { REMOTE._siapSudah = true; });
})();
