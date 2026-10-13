# Panduan Mengaktifkan Penyimpanan Awan (Firebase)

Tujuan: supaya **foto dan data yang di-ubah admin** (galeri, foto tim, beasiswa,
OSIS, data siswa/guru, dll) **tampil untuk semua orang di semua perangkat** —
bukan hanya di browser tempat admin meng-upload.

Cukup dilakukan **sekali**. Gratis.

---

## Langkah 1 — Buat project Firebase

1. Buka <https://console.firebase.google.com>
2. Klik **Add project** / **Tambahkan project**.
3. Beri nama (mis. `edusmart`), lanjutkan sampai **Create project**.

## Langkah 2 — Nyalakan Realtime Database

1. Di menu kiri pilih **Build > Realtime Database**.
2. Klik **Create Database**.
3. Pilih lokasi terdekat (mis. **Singapore / asia-southeast1**).
4. Mulai dengan **Test mode**, lalu **Enable**.

## Langkah 3 — Ambil konfigurasi

1. Klik ikon **gerigi** (kiri atas) > **Project settings**.
2. Tab **General** > gulir ke **Your apps**.
3. Klik ikon **Web** `< / >`, beri nama app (bebas), klik **Register app**.
4. Akan muncul objek `firebaseConfig`. Salin nilai-nilainya.

## Langkah 4 — Tempel ke file

Buka file **`js/firebase-config.js`**, isi bagian `config` dengan nilai yang
kamu salin, **dan ubah `enabled: false` menjadi `enabled: true`**.

```js
window.EDUSMART_FIREBASE = {
  enabled: true,                       // <-- ubah menjadi true
  config: {
    apiKey: "AIza....",
    authDomain: "edusmart-xxxx.firebaseapp.com",
    databaseURL: "https://edusmart-xxxx-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "edusmart-xxxx",
    storageBucket: "edusmart-xxxx.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef"
  }
};
```

> Catatan: `databaseURL` **wajib ada**. Itu alamat Realtime Database dari Langkah 2.

## Langkah 5 — Simpan, commit, push

```bash
git add js/firebase-config.js
git commit -m "aktifkan Firebase"
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

## Catatan keamanan

- `apiKey` di file ini memang tampil di web; itu wajar untuk Firebase web.
  Yang mengatur keamanan adalah **Rules** di Langkah 6.
- Sesi login tetap tersimpan per-browser, jadi admin di Chrome dan guru di Edge
  tidak saling menimpa.

## Bila ingin mematikan kembali

Ubah `enabled: true` menjadi `enabled: false` di `js/firebase-config.js`.
Situs akan kembali memakai penyimpanan lokal (per-browser) seperti semula.
