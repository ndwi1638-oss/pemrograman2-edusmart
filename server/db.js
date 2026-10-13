/* ==========================================================================
   EduSmart - server/db.js | Akses SQLite
   --------------------------------------------------------------------------
   Satu-satunya tempat yang mengenal tabel. Semua pertukaran data dengan
   front-end memakai "key" yang sama dengan nama key LocalStorage lama
   (mis. "edusmart_students"), jadi front-end tidak perlu tahu nama tabel.

   Pembacaan : key -> array objek (field camelCase seperti di front-end)
   Penulisan : key + string JSON -> ganti seluruh isi tabel (dalam transaksi)
   Key yang tidak terdaftar disimpan ke tabel kv (data bebas / non-relasional).

   Memakai modul bawaan Node (node:sqlite, tanpa dependensi native) supaya
   "npm install && npm start" langsung jalan di Node 22.5+/24 tanpa
   Visual Studio Build Tools.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const ROOT = path.resolve(__dirname, "..");
const DB_FILE = process.env.EDUSMART_DB || path.join(ROOT, "data", "edusmart.db");

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = OFF"); // ganti-bulk tabel lebih dulu baru isi
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

/* ---------- Migrasi ringan untuk basis data yang sudah ada ----------
   Menambah kolom baru tidak mengubah tabel lama, jadi dicek dulu lewat
   PRAGMA table_info. Contoh: kolom users.username ditambahkan agar siswa
   bisa login memakai NIS/NISN dan guru memakai NIP/NUPTK.               */
function tambahKolomJikaBelum( tabel, kolom, definisi ) {
  const ada = db.prepare(`PRAGMA table_info(${tabel})`).all().some( (c) => c.name === kolom );
  if ( !ada ) {
    db.exec( `ALTER TABLE ${tabel} ADD COLUMN ${kolom} ${definisi}` );
    console.log( `[migrasi] ${tabel}.${kolom} ditambahkan` );
  }
}
tambahKolomJikaBelum( "users", "username", "TEXT" );

/* Email tidak lagi wajib (dipakai hanya untuk kontak, boleh dikosongkan).
   Tabel users yang dibuat versi lama masih punya batasan NOT NULL, dan SQLite
   tidak bisa menghapus batasan tanpa membuat ulang tabel. Jadi tabel
   dibangun ulang satu kali, semua data akun disalin apa adanya. */
function migrasiUsersEmailBolehKosong() {
  const info = db.prepare("PRAGMA table_info(users)").all();
  const email = info.filter( (c) => c.name === "email" )[0];
  if ( !email || !email.notnull ) return;
  const ada = db.prepare( "SELECT * FROM users" ).all();
  const skema = fs.readFileSync( path.join( __dirname, "schema.sql" ), "utf8" );
  const mulai = skema.indexOf( "CREATE TABLE IF NOT EXISTS users (" );
  const definisi = skema.slice( mulai, skema.indexOf( ");", mulai ) + 2 )
    .replace( "CREATE TABLE IF NOT EXISTS users", "CREATE TABLE users__migrasi" );
  db.exec( "DROP TABLE IF EXISTS users__migrasi" );
  db.exec( definisi );
  if ( ada.length ) {
    const kolom = Object.keys( ada[0] );
    db.transaction( () => {
      ada.forEach( (r) => {
        const ks = kolom.filter( (k) => k in r );
        db.prepare( `INSERT INTO users__migrasi (${ks.join( ", " )}) VALUES (${ks.map( () => "?" ).join( ", " )})` )
          .run( ...ks.map( (k) => ( r[k] === undefined ? null : r[k] ) ) );
      } );
    } )();
  }
  db.exec( "DROP TABLE users" );
  db.exec( "ALTER TABLE users__migrasi RENAME TO users" );
  console.log( `[migrasi] users.email boleh kosong (${ada.length} akun disalin)` );
}
migrasiUsersEmailBolehKosong();

/* ---------- Peta key <-> tabel ---------- */
/* fields  : nama field di front-end  ->  nama kolom di SQLite
   nums    : kolom bertipe angka (dibaca sebagai number, bukan string)
   rel     : field array di front-end -> tabel relasi (banyak-ke-banyak)
   uniq    : kolom dengan batasan UNIQUE. Nilai kosong harus ditulis sebagai
             NULL, bukan "", karena SQLite menganggap beberapa NULL berbeda
             tetapi "" dianggap sama -> INSERT OR REPLACE diam-diam menimpa
             akun lain. */
const REGISTRY = {
  "edusmart_users": {
    table: "users", pk: "id", uniq: ["email"],
    fields: {
      id: "id", username: "username", nama: "nama", email: "email", password: "password",
      role: "role", status: "status", nis: "nis", nip: "nip", kelas: "kelas", kelasId: "kelas_id",
      jenisGuru: "jenis_guru", waliKelas: "wali_kelas", createdAt: "created_at"
    }
  },
  "edusmart_classes": {
    table: "classes", pk: "classId",
    fields: { classId: "class_id", nama: "nama", tingkat: "tingkat", jurusan: "jurusan", waliTeacherId: "wali_teacher_id" }
  },
  "edusmart_subjects": {
    table: "subjects", pk: "subjectId",
    fields: { subjectId: "subject_id", nama: "nama", track: "track" }
  },
  "edusmart_majors": {
    table: "majors", pk: "majorId",
    fields: { majorId: "major_id", nama: "nama" }
  },
  "edusmart_teachers": {
    table: "teachers", pk: "teacherId",
    fields: {
      teacherId: "teacher_id", userId: "user_id", nama: "nama", nip: "nip", email: "email",
      jenisGuru: "jenis_guru", waliClassId: "wali_class_id", status: "status",
      telepon: "telepon", alamat: "alamat", foto: "foto"
    },
    rel: {
      subjectIds: { table: "teacher_subjects", fk: "teacher_id", col: "subject_id" },
      classIds: { table: "teacher_classes", fk: "teacher_id", col: "class_id" }
    }
  },
  "edusmart_students": {
    table: "students", pk: "studentId",
    fields: {
      studentId: "student_id", userId: "user_id", nama: "nama", nis: "nis", nisn: "nisn",
      email: "email", classId: "class_id", requestedClassId: "requested_class_id",
      jk: "jk", ttl: "ttl", alamat: "alamat", noTelepon: "no_telepon",
      status: "status"
    }
  },
  "edusmart_schedules": {
    table: "schedules", pk: "scheduleId",
    fields: {
      scheduleId: "schedule_id", classId: "class_id", subjectId: "subject_id",
      teacherId: "teacher_id", day: "day", startTime: "start_time",
      endTime: "end_time", room: "room"
    }
  },
  "edusmart_materials": {
    table: "materials", pk: "materialId",
    fields: {
      materialId: "material_id", teacherId: "teacher_id", subjectId: "subject_id",
      classId: "class_id", title: "title", description: "description",
      content: "content", createdAt: "created_at"
    }
  },
  "edusmart_tasks": {
    table: "tasks", pk: "taskId",
    fields: {
      taskId: "task_id", teacherId: "teacher_id", subjectId: "subject_id",
      classId: "class_id", title: "title", description: "description",
      deadline: "deadline", createdAt: "created_at"
    }
  },
  "edusmart_grades": {
    table: "grades", pk: "gradeId",
    fields: {
      gradeId: "grade_id", studentId: "student_id", classId: "class_id",
      subjectId: "subject_id", taskId: "task_id", teacherId: "teacher_id",
      tugas: "tugas", uts: "uts", uas: "uas", nilaiAkhir: "nilai_akhir"
    },
    nums: ["tugas", "uts", "uas", "nilaiAkhir"]
  },
  "edusmart_attendance": {
    table: "attendance", pk: "attendanceId",
    fields: {
      attendanceId: "attendance_id", studentId: "student_id", teacherId: "teacher_id",
      subjectId: "subject_id", classId: "class_id", date: "date", status: "status"
    }
  },
  "edusmart_reports": {
    table: "reports", pk: "reportId",
    fields: {
      reportId: "report_id", studentId: "student_id", teacherId: "teacher_id",
      classId: "class_id", semester: "semester", tahunAjaran: "tahun_ajaran",
      sikap: "sikap", perkembangan: "perkembangan", catatanWali: "catatan_wali",
      catatanTambahan: "catatan_tambahan", status: "status", createdAt: "created_at"
    }
  },
  "edusmart_submissions": {
    table: "submissions", pk: "submissionId",
    fields: {
      submissionId: "submission_id", taskId: "task_id", studentId: "student_id",
      email: "email", tugasId: "tugas_id", namaTugas: "nama_tugas", mapel: "mapel",
      jawaban: "jawaban", answer: "answer", namaFile: "nama_file", fileName: "file_name",
      waktu: "waktu", submittedAt: "submitted_at", status: "status"
    }
  },
  "edusmart_messages": {
    table: "messages", pk: "id",
    fields: { id: "id", nama: "nama", email: "email", pesan: "pesan", createdAt: "created_at" }
  }
};

const TABLE_KEYS = Object.keys(REGISTRY);

/* node:sqlite tidak punya db.transaction() seperti better-sqlite3,
   jadi transaksi ditulis manual (BEGIN/COMMIT/ROLLBACK). */
function transaksi(fn) {
  db.exec("BEGIN");
  try {
    fn();
    db.exec("COMMIT");
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch (_) { /* abaikan */ }
    throw e;
  }
}

/* ---------- Baca ---------- */
function num(v) { return v === null || v === undefined ? 0 : v; }
function teks(v) { return v === null || v === undefined ? "" : v; }

function readTable(key) {
  const spec = REGISTRY[key];
  const rows = db.prepare(`SELECT * FROM ${spec.table}`).all();
  return rows.map((row) => {
    const out = {};
    Object.keys(spec.fields).forEach((field) => {
      const col = spec.fields[field];
      out[field] = spec.nums && spec.nums.indexOf(field) !== -1 ? num(row[col]) : teks(row[col]);
    });
    if (spec.rel) {
      Object.keys(spec.rel).forEach((field) => {
        const r = spec.rel[field];
        const items = db
          .prepare(`SELECT ${r.col} AS v FROM ${r.table} WHERE ${r.fk} = ? ORDER BY ${r.col}`)
          .all(teks(row[spec.fields[spec.pk]]))
          .map((x) => x.v);
        out[field] = items;
      });
    }
    return out;
  });
}

function readKv() {
  const out = {};
  db.prepare("SELECT key, value FROM kv").all().forEach((r) => { out[r.key] = r.value === null ? "" : r.value; });
  return out;
}

function getAllTables() {
  const out = {};
  TABLE_KEYS.forEach((key) => { out[key] = readTable(key); });
  return out;
}

function getAllData() {
  return { tables: getAllTables(), kv: readKv() };
}

/* ---------- Tulis ---------- */
function writeTable(key, arr) {
  const spec = REGISTRY[key];
  const rows = Array.isArray(arr) ? arr : [];
  const cols = Object.keys(spec.fields).map((f) => spec.fields[f]);
  const placeholders = cols.map(() => "?").join(", ");
  const fields = Object.keys(spec.fields);
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO ${spec.table} (${cols.join(", ")}) VALUES (${placeholders})`
  );
  const relStmts = {};
  if (spec.rel) {
    Object.keys(spec.rel).forEach((field) => {
      const r = spec.rel[field];
      relStmts[field] = {
        del: db.prepare(`DELETE FROM ${r.table} WHERE ${r.fk} = ?`),
        add: db.prepare(`INSERT OR IGNORE INTO ${r.table} (${r.fk}, ${r.col}) VALUES (?, ?)`),
        fk: r.fk,
        col: r.col
      };
    });
  }
  transaksi(() => {
    db.prepare(`DELETE FROM ${spec.table}`).run();
    // Tabel relasi juga dibersihkan penuh, supaya tidak tertinggal baris yatim
    // (mis. guru dihapus lewat "Hapus Data Dummy" sementara relasinya utuh).
    if (spec.rel) Object.keys(spec.rel).forEach((f) => db.exec(`DELETE FROM ${spec.rel[f].table}`));
    rows.forEach((row) => {
      const id = row[spec.pk];
      stmt.run(...fields.map((f) => {
        const v = row[f];
        // PK kosong (mis. pesan kontak tanpa id) -> NULL supaya INTEGER
        // PRIMARY KEY AUTOINCREMENT terisi otomatis. Tabel ber-PK TEXT selalu
        // dikirim front-end dengan id, jadi ini tidak mengubah perilaku lain.
        if (f === spec.pk && (v === undefined || v === null || v === "")) return null;
        if (spec.nums && spec.nums.indexOf(f) !== -1) {
          return v === "" || v === null || v === undefined ? null : Number(v);
        }
        if (v === undefined || v === null) return "";
        // Kolom UNIQUE: string kosong -> NULL supaya tidak saling menimpa
        if (spec.uniq && spec.uniq.indexOf(f) !== -1 && v === "") return null;
        return v;
      }));
      if (id !== undefined && id !== null && id !== "" && relStmts) {
        Object.keys(relStmts).forEach((field) => {
          const s = relStmts[field];
          s.del.run(String(id));
          const arrRel = Array.isArray(row[field]) ? row[field] : [];
          arrRel.forEach((v) => { if (v !== undefined && v !== null && v !== "") s.add.run(String(id), String(v)); });
        });
      }
    });
  });
}

function putKey(key, rawValue) {
  const nilai = rawValue === undefined || rawValue === null ? null : String(rawValue);
  if (REGISTRY[key]) {
    let arr = [];
    if (nilai !== null && nilai !== "") {
      try { arr = JSON.parse(nilai); } catch (e) { arr = []; }
    }
    writeTable(key, Array.isArray(arr) ? arr : []);
    return { key: key, rows: Array.isArray(arr) ? arr.length : 0 };
  }
  if (nilai === null) {
    db.prepare("DELETE FROM kv WHERE key = ?").run(key);
  } else {
    db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)").run(key, nilai);
  }
  return { key: key, rows: 1 };
}

function deleteKey(key) {
  if (REGISTRY[key]) {
    const spec = REGISTRY[key];
    db.prepare(`DELETE FROM ${spec.table}`).run();
    if (spec.rel) Object.keys(spec.rel).forEach((f) => db.exec(`DELETE FROM ${spec.rel[f].table}`));
    return;
  }
  db.prepare("DELETE FROM kv WHERE key = ?").run(key);
}

function kosong() {
  return TABLE_KEYS.every((key) => db.prepare(`SELECT COUNT(*) AS n FROM ${REGISTRY[key].table}`).get().n === 0);
}

function statistik() {
  const out = {};
  TABLE_KEYS.forEach((key) => {
    out[key] = db.prepare(`SELECT COUNT(*) AS n FROM ${REGISTRY[key].table}`).get().n;
  });
  out["(kv)"] = db.prepare("SELECT COUNT(*) AS n FROM kv").get().n;
  return out;
}

module.exports = { db, DB_FILE, REGISTRY, TABLE_KEYS, getAllData, getAllTables, putKey, deleteKey, kosong, statistik };
