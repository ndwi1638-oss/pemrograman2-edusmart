# Panduan Mengaktifkan Penyimpanan Awan (Firebase)

Tujuan: supaya **foto dan data yang di-ubah admin** (galeri, foto tim, beasiswa,
OSIS, data siswa/guru, dll) **tampil untuk semua orang di semua perangkat** —
bukan hanya di browser tempat admin meng-upload.

Cukup dilakukan **sekali**, gratis, ± 3 menit. Kamu hanya butuh **1 alamat**.

---

## Langkah 1 — Buat project Firebase

1. Buka <https://console.firebase.google.com> dan masuk dengan akun Google.
2. Klik **Create a project** / **Buat project**.
3. Beri nama apa saja (mis. `edusmart`), lanjutkan sampai **Create project**.
   (Google Analytics boleh dimatikan.)

## Langkah 2 — Nyalakan Realtime Database

1. Di menu kiri klik **Build > Realtime Database**.
2. Klik **Create Database**.
3. Pilih lokasi terdekat: **Singapore (asia-southeast1)**.
4. Pilih **Start in test mode**, lalu klik **Enable**.

## Langkah 3 — Salin ALAMAT database

Setelah database terbuka, lihat bagian **paling atas**. Di sana tertulis alamat
seperti:

```
https://edusmart-xxxx-default-rtdb.asia-southeast1.firebasedatabase.app
```

**Itu satu-satunya nilai yang dibutuhkan.** Salin.

## Langkah 4 — Tempel ke file konfigurasi

Buka file **`js/firebase-config.js`**, tempel alamat tadi, dan ubah
`enabled: false` menjadi `enabled: true`:

```js
window.EDUSMART_FIREBASE = {
  enabled: true,
  databaseURL: "https://edusmart-xxxx-default-rtdb.asia-southeast1.firebasedatabase.app"
};
```

## Langkah 5 — Simpan, commit, push

```bash
git add js/firebase-config.js
git commit -m "aktifkan penyimpanan awan"
git push
```

Tunggu Vercel selesai deploy (± 1 menit), lalu buka situsnya.

## Langkah 6 (disarankan) — Atur Rules

Agar database tidak terkunci otomatis setelah 30 hari:

1. Realtime Database > tab **Rules**.
2. Ganti isinya menjadi:

```json
{ "rules": { ".read": true, ".write": true } }
```

3. Klik **Publish**.

> Aturan ini membuka baca/tulis untuk siapa saja (cukup untuk tugas sekolah).
> Untuk penggunaan serius, batasi aksesnya.

---

## Cara kerja singkat

- Semua kunci `edusmart_*` di browser (kecuali sesi login) disalin ke Firebase.
- Saat halaman dibuka: data dari Firebase dibaca lebih dulu.
- Jika Firebase masih kosong (pertama kali), data yang ada di browser admin
  **otomatis di-upload**, sehingga foto yang sudah terlanjur di-upload ikut tampil.
- Setiap perubahan admin langsung dikirim ke Firebase.

## Catatan

- Sesi login tetap tersimpan per-browser, jadi admin di Chrome dan guru di Edge
  tidak saling menimpa.
- Data siswa/guru ikut tersimpan (agar beasiswa & OSIS nyambung lintas perangkat),
  jadi sebaiknya jangan isi data sensitif asli. Cocok untuk tugas/demo.

## Bila ingin mematikan kembali

Ubah `enabled: true` menjadi `enabled: false` di `js/firebase-config.js`.
Situs akan kembali memakai penyimpanan lokal (per-browser) seperti semula.
