/* ==========================================================================
   EduSmart - server/server.js | Backend + penyaji file statis
   --------------------------------------------------------------------------
   Menjalankan dua hal sekaligus:
   1. menyajikan situs (file .html/.js/.css di folder proyek) lewat Express,
   2. menyediakan API data yang membaca/menulis SQLite.

   API:
     GET    /api/health        -> status server + jumlah baris tiap tabel
     GET    /api/data          -> semua data (dipakai untuk memuat halaman)
     PUT    /api/data          -> body { key, value } (value = string JSON)
     DELETE /api/data/:key     -> hapus isi satu key
     GET    /api/backup        -> unduh seluruh data sebagai .json
     POST   /api/restore       -> body { tables, kv } (pulihkan dari backup)

   Cara pakai:  cd server  ->  npm install  ->  npm start
   Lalu buka:    http://localhost:3000
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const express = require("express");
const store = require("./db");

const ROOT = path.resolve(__dirname, "..");        // folder proyek (file statis)
const PORT = Number(process.env.PORT) || 3100;      // ganti: set PORT=8080 npm start
const app = express();

app.use(express.json({ limit: "12mb" }));          // raport & foto bisa sizeable

/* ---------- API ---------- */
function api(fn) {
  return (req, res) => {
    try {
      fn(req, res);
    } catch (err) {
      console.error("[api]", err);
      res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
    }
  };
}

app.get("/api/health", api((req, res) => {
  res.json({ ok: true, db: store.DB_FILE, kosong: store.kosong(), baris: store.statistik() });
}));

app.get("/api/data", api((req, res) => {
  const data = store.getAllData();
  res.json({
    ok: true,
    server: true,
    db: store.DB_FILE,
    kosong: store.kosong(),
    tables: data.tables,
    kv: data.kv
  });
}));

app.put("/api/data", api((req, res) => {
  const key = String(req.body && req.body.key || "");
  if (!key) return res.status(400).json({ ok: false, error: "key wajib diisi" });
  const hasil = store.putKey(key, req.body.value);
  res.json({ ok: true, key: hasil.key, rows: hasil.rows });
}));

app.delete("/api/data/:key", api((req, res) => {
  const key = decodeURIComponent(req.params.key);
  store.deleteKey(key);
  res.json({ ok: true, key: key });
}));

app.get("/api/backup", api((req, res) => {
  const data = store.getAllData();
  const nama = "edusmart-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  res.setHeader("Content-Disposition", `attachment; filename="${nama}"`);
  res.json(data);
}));

app.post("/api/restore", api((req, res) => {
  const body = req.body || {};
  let total = 0;
  if (body.tables) {
    Object.keys(body.tables).forEach((key) => {
      store.putKey(key, JSON.stringify(body.tables[key]));
      total++;
    });
  }
  if (body.kv) {
    Object.keys(body.kv).forEach((key) => { store.putKey(key, body.kv[key]); total++; });
  }
  res.json({ ok: true, kunci: total });
}));

/* ---------- Suntik data ke setiap halaman .html ----------
   Data SQLite ditanam ke dalam HTML sebagai skrip pertama di <head>, sehingga
   front-end bisa membacanya sinkron (tanpa menunggu fetch) saat script jalan. */
function tagBootstrap() {
  const data = store.getAllData();
  const muatan = {
    server: true,
    db: store.DB_FILE,
    kosong: store.kosong(),
    tables: data.tables,
    kv: data.kv
  };
  // ">" di-escape agar aman di dalam <script>, "<" di-escape penuh.
  const json = JSON.stringify(muatan).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, "");
  return "<script>window.__EDUSMART_BOOTSTRAP__=" + json + ";</script>";
}

app.use((req, res, next) => {
  if (req.method !== "GET" || !/\.html$/i.test(req.path)) return next();
  const file = path.join(ROOT, decodeURIComponent(req.path));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) return next();
  let html = fs.readFileSync(file, "utf8");
  const tag = tagBootstrap();
  if (html.indexOf("<head>") !== -1) html = html.replace("<head>", "<head>\n    " + tag);
  else html = tag + "\n" + html;
  res.set("Cache-Control", "no-store");
  res.type("html").send(html);
});

/* ---------- Folder privat tidak boleh diakses ---------- */
app.use((req, res, next) => {
  if (/(^|\/)(server|data|node_modules|package-lock\.json)(\/|$)/.test(req.path)) {
    return res.status(404).send("Tidak ditemukan");
  }
  next();
});

/* ---------- File statis (situs) ---------- */
app.use(express.static(ROOT, { extensions: ["html"] }));

app.use((req, res) => {
  res.status(404).type("text/plain").send("404 - Halaman tidak ditemukan: " + req.path);
});

app.listen(PORT, () => {
  const jml = store.statistik();
  const total = Object.keys(jml).reduce((a, k) => a + jml[k], 0);
  console.log("");
  console.log("  EduSmart aktif");
  console.log("  ----------------------------------------------------------------");
  console.log("  Situs  : http://localhost:" + PORT);
  console.log("  Basis data : " + store.DB_FILE);
  console.log("  Isi tabel  : " + total + " baris" + (store.kosong() ? " (masih kosong)" : ""));
  console.log("  ----------------------------------------------------------------");
  console.log("  Admin  : admin@edusmart.id / admin123");
  console.log("  Hentikan dengan Ctrl+C");
  console.log("");
});
