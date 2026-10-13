/* ==========================================================================
   EduSmart - js/remote.js | Penyimpanan awan (Firebase Realtime Database)
   --------------------------------------------------------------------------
   Dimuat SEBELUM js/api.js di setiap halaman.

   Tujuan: supaya data yang di-ubah admin (foto galeri, foto tim, beasiswa,
   OSIS, data siswa/guru, dsb) tersimpan di server dan TAMPIL UNTUK SEMUA
   ORANG / semua perangkat - bukan hanya di browser tempat admin meng-upload.

   Cara kerja singkat:
     - Semua kunci localStorage yang berawalan "edusmart_" (KECUALI sesi login)
       disalin ke Firebase. Kunci "edusmart_session"/"edusmart_current_user"/
       "edusmart_nilai_prefill" tetap lokal per-browser.
     - Saat halaman dibuka: data terakhir dari Firebase dibaca, lalu dipakai
       sebagai isi DB. Bila Firebase masih kosong (pertama kali), data yang ada
       di browser ini di-upload ke Firebase (migrasi otomatis).
     - Saat admin mengubah sesuatu, perubahan langsung dikirim ke Firebase.

   Bila `enabled` masih false / config kosong, file ini tidak melakukan apa-apa
   dan situs berjalan seperti biasa (localStorage saja).

   Konfigurasi ada di js/firebase-config.js (dimuat sebelum file ini).
   ========================================================================== */

(function () {
  "use strict";

  var CFG = window.EDUSMART_FIREBASE || {};
  var ROOT = "edusmart";                 // folder utama di Firebase
  var MIRROR_KEY = "edusmart_remote_mirror"; // cadangan lokal data awan
  var VERSION = "10.12.2";

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

  var aktif = CFG.enabled === true &&
    !!CFG.config && !!CFG.config.databaseURL &&
    String(CFG.config.databaseURL).indexOf("http") === 0;

  var REMOTE = {
    aktif: !!aktif,
    siap: null,                 // promise: selesai membaca/menyiapkan data awan
    put: function () { return Promise.resolve(); },
    del: function () { return Promise.resolve(); },
    muatUlang: function () { return Promise.resolve(null); }
  };
  window.EduSmartRemote = REMOTE;

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

  function muatScript(src) {
    return new Promise(function (selesai, gagal) {
      var s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = selesai;
      s.onerror = function () { gagal(new Error("Gagal memuat " + src)); };
      document.head.appendChild(s);
    });
  }

  function muatSDK() {
    if (window.firebase && window.firebase.database) return Promise.resolve();
    return muatScript("https://www.gstatic.com/firebasejs/" + VERSION + "/firebase-app-compat.js")
      .then(function () {
        return muatScript("https://www.gstatic.com/firebasejs/" + VERSION + "/firebase-database-compat.js");
      });
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

  function kerja() {
    return muatSDK().then(function () {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(CFG.config);
      var ref = firebase.database().ref(ROOT);
      REMOTE.ref = ref;

      REMOTE.put = function (key, value) {
        if (REMOTE._mirror) {
          if (value === null || value === undefined) delete REMOTE._mirror[key];
          else REMOTE._mirror[key] = value;
          tulisMirror(REMOTE._mirror);
        }
        var kirim = {};
        kirim[key] = (value === null || value === undefined) ? null : value;
        return ref.update(kirim);
      };

      REMOTE.del = function (key) {
        if (REMOTE._mirror) { delete REMOTE._mirror[key]; tulisMirror(REMOTE._mirror); }
        return ref.child(key).remove();
      };

      REMOTE.muatUlang = function () {
        return ref.once("value").then(function (snap) {
          var data = snap.val() || {};
          var mirror = bacaMirror() || {};
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

      return ref.once("value").then(function (snap) {
        var data = snap.val() || {};
        var mirror = bacaMirror() || {};
        var lokal = snapshotLokal();

        /* Gabungan: data lokal + cadangan lokal, lalu data AWAN paling menang. */
        var gabung = Object.assign({}, lokal, mirror, data);

        /* Kunci yang belum ada di awan di-upload ke awan (migrasi otomatis),
           sehingga foto/data lama di browser ini ikut tampil untuk semua. */
        var dorong = {};
        Object.keys(gabung).forEach(function (k) {
          if (!(k in data)) dorong[k] = gabung[k];
        });

        tulisMirror(gabung);
        REMOTE._mirror = gabung;
        if (window.DB && window.DB.terapkanData) window.DB.terapkanData(gabung);

        var tugas = [];
        if (Object.keys(dorong).length) tugas.push(ref.update(dorong));

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
      console.warn("[EduSmart] Firebase bermasalah, memakai data lokal: " + e.message);
    }),
    10000
  );

  REMOTE.siap.then(function () { REMOTE._siapSudah = true; });
})();
