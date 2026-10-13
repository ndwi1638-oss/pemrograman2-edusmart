# Backend EduSmart (Express + SQLite)

Aplikasi EduSmart memakai **SQLite** sebagai basis data. Folder ini berisi
backend-nya. Situsnya sendiri tetap file HTML/CSS/JS biasa di folder utama.

```
server/
  package.json   dependensi + perintah npm
  server.js      Express: menyajikan situs + API data
  db.js          koneksi SQLite + pemetaan key <-> tabel
  schema.sql     struktur tabel (dijalankan otomatis saat pertama start)
  reset.js       mengosongkan seluruh data
../data/         berkas basis data: edusmart.db  (dibuat otomatis)
```

## Menjalankan

```bash
cd server
npm install      # hanya sekali
npm start
```

Lalu buka **http://localhost:3100**

Port 3000 dipakai proses lain di komputer ini, jadi default EduSmart 3100.
Mau ganti: `set PORT=8080` (Windows) atau `PORT=8080 npm start` (Linux/Mac).

Awal masuk admin: `admin@edusmart.id` / `admin123`

## Cara kerja

1. Setiap kali halaman `.html` diminta, server menyuntikkan data SQLite ke
   halaman sebagai `window.__EDUSMART_BOOTSTRAP__` (skrip pertama di `<head>`).
2. `js/api.js` membaca suntikan itu dan installs objek global `DB`
   (`DB.get / DB.set / DB.del`) — kontrak yang sama dengan `localStorage`.
3. `DB.set()` mengisi cache di halaman (tampilan langsung berubah tanpa
   menunggu) lalu mengirim data ke server melalui `PUT /api/data`.
4. Semua penulisan ke tabel dilakukan dalam satu transaksi
   (hapus isi lama -> isi baru), jadi tidak ada data setengah jadi.

Tabel kosong sengaja tidak ikut disuntikkan, sehingga `DB.get()` mengembalikan
`null` untuk data yang belum pernah diisi — perilaku ini dipakai kode untuk
membuatkan data awal (kelas, mapel, jadwal).

## API

| Metode | Alamat | Keterangan |
| --- | --- | --- |
| GET | `/api/health` | status + jumlah baris tiap tabel |
| GET | `/api/data` | semua data (dipakai halaman & untuk debugging) |
| PUT | `/api/data` | body `{ "key": "edusmart_students", "value": "[...]" }` |
| DELETE | `/api/data/:key` | kosongkan satu tabel/key |
| GET | `/api/backup` | unduh seluruh data (.json) |
| POST | `/api/restore` | pulihkan data dari backup |

`key` memakai nama yang sama dengan key LocalStorage versi lama, jadi mudah
dicek: `edusmart_users`, `edusmart_classes`, `edusmart_subjects`,
`edusmart_majors`, `edusmart_teachers`, `edusmart_students`,
`edusmart_schedules`, `edusmart_materials`, `edusmart_tasks`,
`edusmart_grades`, `edusmart_attendance`, `edusmart_reports`,
`edusmart_submissions`, `edusmart_messages`. Selain itu disimpan ke tabel `kv`
(profil siswa, foto tim pengajar, pengumuman).

## Perintah lain

```bash
npm run dev              # otomatis restart saat berkas server berubah
npm run init-db          # hanya membuat berkas + tabel (tanpa menjalankan server)
npm run reset -- --yes   # mengosongkan semua tabel (data hilang!)
```

## Melihat isi database (DB Browser for SQLite)

Tanpa menjalankan server, cukup:

```bash
npm run init-db
```

Lalu di [DB Browser for SQLite](https://sqlitebrowser.org/):
**Open Database** -> `..\data\edusmart.db`. 17 tabel sudah otomatis
dibuat. Pilih **Read-Only** bila hanya ingin melihat; **matikan server** dulu
(`Ctrl+C`) bila ingin mengubah data, karena aplikasi menulis ulang seluruh isi
tabel setiap kali menyimpan.

Query siap pakai untuk laporan ada di **`queries.sql`** - jalankan lewat
**Database -> Run SQL Script...** (atau Ctrl+Enter per query di tab Execute SQL).

## Catatan

- Sesi login (`edusmart_session`, `edusmart_current_user`) sengaja **tidak**
  dikirim ke database, tetap di LocalStorage per browser. Gunanya agar dua
  browser bisa dipakai bersamaan (mis. admin di Chrome, guru di Edge) tanpa
  saling menimpa sesi.
- Data versi lama yang masih ada di LocalStorage browser otomatis dipindahkan
  ke SQLite satu kali, saat server pertama kali dipakai dan basis data masih
  kosong. Tidak dihapus dari browser (aman kalau server mati).
- Bila halaman dibuka langsung dari berkas (double-click, tanpa server),
  aplikasi otomatis kembali memakai LocalStorage sehingga tetap bisa jalan.
- Untuk melihat isi tabel secara visual, pakai aplikasi gratis
  [DB Browser for SQLite](https://sqlitebrowser.org/) lalu buka `../data/edusmart.db`.
- Ingin online tanpa biaya? Basis datanya kompatibel SQLite, jadi bisa
  dipindahkan ke Turso (libSQL) dengan mengganti cara koneksinya di
  `db.js` — SQL-nya sama.
