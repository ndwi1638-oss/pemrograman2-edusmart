/* ==========================================================================
   EduSmart - js/firebase-config.js | KONFIGURASI PENYIMPANAN AWAN
   --------------------------------------------------------------------------
   >>> HANYA FILE INI YANG PERLU KAMU ISI, DAN HANYA 1 BARIS. <<<

   Tujuan: foto & data yang di-ubah admin (galeri, foto tim, beasiswa, OSIS,
   data siswa/guru, dll) tersimpan di server dan TAMPIL UNTUK SEMUA ORANG di
   semua perangkat - bukan cuma di browser admin.

   --------------------------------------------------------------------------
   CARA MENDAPATKAN ALAMATNYA (sekali saja, gratis, ± 3 menit):
     1. Buka https://console.firebase.google.com
        Masuk dengan akun Google.
     2. Klik "Create a project" / "Buat project". Beri nama apa saja
        (mis. edusmart), klik Continue sampai selesai (Google Analytics
        boleh dimatikan).
     3. Di menu kiri, klik "Build" > "Realtime Database".
        Klik "Create Database".
        - Pilih lokasi terdekat: Singapore (asia-southeast1).
        - Pilih "Start in test mode", lalu klik Enable.
     4. Setelah database terbuka, lihat bagian paling atas. Di sana tertulis
        alamat seperti:
            https://edusmart-xxxx-default-rtdb.asia-southeast1.firebasedatabase.app
        Selamat, ITU alamat yang dibutuhkan. Salin.
     5. Tempel alamat itu ke dalam tanda kutip di bawah, dan ubah
        enabled: false menjadi enabled: true.
     6. Simpan file, lalu (kalau pakai Git) commit & push. Selesai.
     7. Disarankan: tab "Rules" di halaman database, isi dengan
            { "rules": { ".read": true, ".write": true } }
        lalu Publish. Ini supaya database tidak terkunci otomatis 30 hari.

   CONTOH HASIL AKHIR:
     window.EDUSMART_FIREBASE = {
       enabled: true,
       databaseURL: "https://edusmart-xxxx-default-rtdb.asia-southeast1.firebasedatabase.app"
     };
   ========================================================================== */

window.EDUSMART_FIREBASE = {
  enabled: true,
  databaseURL: "https://edusmart-1e132-default-rtdb.asia-southeast1.firebasedatabase.app"
};
