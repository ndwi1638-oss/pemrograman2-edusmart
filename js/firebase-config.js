/* ==========================================================================
   EduSmart - js/firebase-config.js | KONFIGURASI PENYIMPANAN AWAN
   --------------------------------------------------------------------------
   >>> HANYA FILE INI YANG PERLU KAMU EDIT. <<<

   Tujuan fitur ini: foto & data yang di-ubah admin (galeri, foto tim,
   beasiswa, OSIS, data siswa/guru, dll) tersimpan di server Firebase dan
   TAMPIL UNTUK SEMUA ORANG di semua perangkat - bukan cuma di browser admin.

   --------------------------------------------------------------------------
   LANGKAH-LANGKAH (sekali saja, gratis):
     1. Buka https://console.firebase.google.com  ->  "Add project".
        Beri nama (mis. edusmart), lanjutkan sampai selesai.
     2. Di menu kiri pilih "Build" > "Realtime Database" > "Create Database".
        Pilih lokasi terdekat (mis. Singapore), lalu mulai dengan "Test mode".
     3. Kembali ke "Project settings" (ikon gerigi di kiri atas) > tab
        "General" > gulir ke "Your apps" > klik ikon Web ( </> ).
        Daftarkan app (nama bebas), lalu akan muncul objek `firebaseConfig`.
     4. Salin nilai dari `firebaseConfig` ke objek `config` di bawah ini
        (biarkan tanda kutip), lalu ubah `enabled: false` menjadi `true`.
     5. Simpan, lalu commit & push. Selesai.
     6. (Disarankan) Di Realtime Database > tab "Rules", ganti isinya menjadi:
            { "rules": { ".read": true, ".write": true } }
        lalu "Publish". Ini mencegah database terkunci otomatis setelah 30 hari.
        Catatan: aturan ini membuka akses untuk siapa saja (cukup untuk tugas
        sekolah). Untuk penggunaan serius, batasi nanti.

   TIPS: file ini AMAN dibagikan. Kunci seperti apiKey memang tampil di web
   (memang begitu cara kerja Firebase web), yang mengatur keamanan adalah
   "Rules" di langkah 6, bukan kerahasiaan file ini.
   ========================================================================== */

window.EDUSMART_FIREBASE = {
  enabled: false,
  config: {
    apiKey: "ISI_API_KEY",
    authDomain: "ISI.firebaseapp.com",
    databaseURL: "https://ISI-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ISI_PROJECT_ID",
    storageBucket: "ISI.appspot.com",
    messagingSenderId: "ISI_SENDER_ID",
    appId: "ISI_APP_ID"
  }
};
