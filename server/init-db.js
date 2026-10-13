/* Membuat berkas basis data + seluruh tabel tanpa menjalankan server.
   Jalankan: npm run init-db
   Setelah itu berkas data\edusmart.db bisa dibuka di DB Browser for SQLite. */

const store = require("./db");

const fisik = store.db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((r) => r.name);

console.log("");
console.log("  Basis data siap");
console.log("  ----------------------------------------------------------------");
console.log("  Berkas : " + store.DB_FILE);
console.log("  Tabel  : " + fisik.length + " (" + fisik.join(", ") + ")");
console.log("  Isi    : " + (store.kosong() ? "kosong (siap diisi)" : "sudah ada data"));
console.log("  ----------------------------------------------------------------");
console.log("  Buka di DB Browser for SQLite: Open Database ->");
console.log("  " + store.DB_FILE);
console.log("");
