/* Mengosongkan basis data (semua tabel + kv) tanpa menghapus file .db.
   Jalankan: npm run reset                                              */

const fs = require("fs");
const store = require("./db");

if (!process.argv.includes("--yes")) {
  console.log("PERINGATAN: semua data EduSmart pada SQLite akan dihapus.");
  console.log("Jalankan ulang dengan:  npm run reset -- --yes");
  process.exit(1);
}

store.TABLE_KEYS.forEach((key) => {
  const spec = store.REGISTRY[key];
  store.db.exec(`DELETE FROM ${spec.table}`);
  if (spec.rel) Object.keys(spec.rel).forEach((f) => store.db.exec(`DELETE FROM ${spec.rel[f].table}`));
});
store.db.exec("DELETE FROM kv");
store.db.exec("DELETE FROM sqlite_sequence WHERE name = 'messages'");
console.log("Basis data dikosongkan: " + store.DB_FILE);
console.log("Jalankan ulang server, lalu klik 'Isi Data Dummy' di Dashboard Admin.");
