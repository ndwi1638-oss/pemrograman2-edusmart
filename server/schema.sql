-- ===========================================================================
-- EduSmart - skema basis data (SQLite)
-- Dipanggil otomatis oleh server/db.js saat pertama kali dijalankan.
-- Struktur mengikuti relasi ID yang sudah dipakai di kode front-end:
--   kelas <-> siswa, guru <-> mapel, guru <-> kelas, guru <-> tugas/materi,
--   guru <-> nilai/absensi, siswa <-> pengumpulan, wali kelas <-> raport.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,          -- id akun (dipakai userId di tabel lain)
  username      TEXT,                      -- NIS/NISN (siswa) atau NIP/NUPTK (guru) - dipakai login
  nama          TEXT NOT NULL,
  email         TEXT UNIQUE,               -- opsional, hanya untuk kontak
  password      TEXT NOT NULL,             -- hash sederhana (prototype)
  role          TEXT NOT NULL,             -- admin | guru | siswa
  status        TEXT NOT NULL DEFAULT 'aktif',  -- aktif | menunggu
  nis           TEXT,
  nip           TEXT,
  kelas         TEXT,                      -- nama kelas hasil verifikasi Admin
  kelas_id      TEXT,
  jenis_guru    TEXT,                      -- guru_mapel | wali_kelas
  wali_kelas    TEXT,
  created_at    TEXT
);

CREATE TABLE IF NOT EXISTS classes (
  class_id       TEXT PRIMARY KEY,
  nama           TEXT NOT NULL,
  tingkat        TEXT,                     -- 10 | 11 | 12
  jurusan        TEXT,                     -- IPA | IPS | Bahasa
  wali_teacher_id TEXT
);

CREATE TABLE IF NOT EXISTS subjects (
  subject_id  TEXT PRIMARY KEY,
  nama        TEXT NOT NULL,
  track       TEXT                        -- Bersama | IPA | IPS
);

CREATE TABLE IF NOT EXISTS majors (
  major_id  TEXT PRIMARY KEY,
  nama      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teachers (
  teacher_id    TEXT PRIMARY KEY,
  user_id       TEXT,
  nama          TEXT NOT NULL,
  nip           TEXT,
  email         TEXT,
  jenis_guru    TEXT NOT NULL DEFAULT 'guru_mapel',  -- guru_mapel | wali_kelas
  wali_class_id TEXT,
  status        TEXT,
  telepon       TEXT,
  alamat        TEXT,
  foto          TEXT
);

-- Relasi guru <-> mata pelajaran yang diampu (banyak-ke-banyak)
CREATE TABLE IF NOT EXISTS teacher_subjects (
  teacher_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  PRIMARY KEY (teacher_id, subject_id)
);

-- Relasi guru <-> kelas yang diajar (banyak-ke-banyak)
CREATE TABLE IF NOT EXISTS teacher_classes (
  teacher_id TEXT NOT NULL,
  class_id   TEXT NOT NULL,
  PRIMARY KEY (teacher_id, class_id)
);

CREATE TABLE IF NOT EXISTS students (
  student_id          TEXT PRIMARY KEY,
  user_id             TEXT,
  nama                TEXT NOT NULL,
  nis                 TEXT,
  nisn                TEXT,
  email               TEXT,
  class_id            TEXT,               -- relasi ke classes
  requested_class_id  TEXT,               -- usulan kelas saat registrasi
  jk                  TEXT,               -- L | P
  ttl                 TEXT,
  alamat              TEXT,
  no_telepon          TEXT,
  status              TEXT
);

CREATE TABLE IF NOT EXISTS schedules (
  schedule_id TEXT PRIMARY KEY,
  class_id    TEXT,
  subject_id  TEXT,
  teacher_id  TEXT,
  day         TEXT,
  start_time  TEXT,
  end_time    TEXT,
  room        TEXT
);

CREATE TABLE IF NOT EXISTS materials (
  material_id TEXT PRIMARY KEY,
  teacher_id  TEXT,
  subject_id  TEXT,
  class_id    TEXT,
  title       TEXT,
  description TEXT,
  content     TEXT,
  created_at  TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
  task_id     TEXT PRIMARY KEY,
  teacher_id  TEXT,
  subject_id  TEXT,
  class_id    TEXT,
  title       TEXT,
  description TEXT,
  deadline    TEXT,
  created_at  TEXT
);

CREATE TABLE IF NOT EXISTS grades (
  grade_id     TEXT PRIMARY KEY,
  student_id   TEXT,
  class_id     TEXT,
  subject_id   TEXT,
  task_id      TEXT,
  teacher_id   TEXT,
  tugas        REAL,
  uts          REAL,
  uas          REAL,
  nilai_akhir  REAL
);

CREATE TABLE IF NOT EXISTS attendance (
  attendance_id TEXT PRIMARY KEY,
  student_id    TEXT,
  teacher_id    TEXT,
  subject_id    TEXT,
  class_id      TEXT,
  date          TEXT,
  status        TEXT                      -- Hadir | Izin | Sakit | Alpa
);

CREATE TABLE IF NOT EXISTS reports (
  report_id       TEXT PRIMARY KEY,
  student_id      TEXT,
  teacher_id      TEXT,                    -- wali kelas pembuat
  class_id        TEXT,
  semester        TEXT,
  tahun_ajaran    TEXT,
  sikap           TEXT,
  perkembangan    TEXT,
  catatan_wali    TEXT,
  catatan_tambahan TEXT,
  status          TEXT,                    -- Draft | Dibagikan
  created_at      TEXT
);

CREATE TABLE IF NOT EXISTS submissions (
  submission_id TEXT PRIMARY KEY,
  task_id       TEXT,
  student_id    TEXT,
  email         TEXT,
  tugas_id      TEXT,
  nama_tugas    TEXT,
  mapel         TEXT,
  jawaban       TEXT,
  answer        TEXT,
  nama_file     TEXT,
  file_name     TEXT,
  waktu         TEXT,
  submitted_at  TEXT,
  status        TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nama       TEXT,
  email      TEXT,
  pesan      TEXT,
  created_at TEXT
);

-- Kho-Kv untuk data non-tabel: profil siswa, foto tim pengajar, pengumuman
-- hasil aksi, danatorial lain yang bentuknya bebas (JSON string).
CREATE TABLE IF NOT EXISTS kv (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- ---------- Indeks untuk mempercepat query yang sering dipakai ----------
CREATE INDEX IF NOT EXISTS idx_students_class    ON students (class_id);
CREATE INDEX IF NOT EXISTS idx_students_user     ON students (user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user     ON teachers (user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_wali     ON teachers (wali_class_id);
CREATE INDEX IF NOT EXISTS idx_sched_class       ON schedules (class_id);
CREATE INDEX IF NOT EXISTS idx_sched_teacher     ON schedules (teacher_id);
CREATE INDEX IF NOT EXISTS idx_materials_teacher ON materials (teacher_id);
CREATE INDEX IF NOT EXISTS idx_materials_class   ON materials (class_id);
CREATE INDEX IF NOT EXISTS idx_tasks_teacher     ON tasks (teacher_id);
CREATE INDEX IF NOT EXISTS idx_tasks_class       ON tasks (class_id);
CREATE INDEX IF NOT EXISTS idx_grades_student    ON grades (student_id);
CREATE INDEX IF NOT EXISTS idx_grades_teacher    ON grades (teacher_id);
CREATE INDEX IF NOT EXISTS idx_grades_task       ON grades (task_id);
CREATE INDEX IF NOT EXISTS idx_attend_student    ON attendance (student_id);
CREATE INDEX IF NOT EXISTS idx_attend_teacher    ON attendance (teacher_id);
CREATE INDEX IF NOT EXISTS idx_reports_student   ON reports (student_id);
CREATE INDEX IF NOT EXISTS idx_reports_teacher   ON reports (teacher_id);
CREATE INDEX IF NOT EXISTS idx_subm_student      ON submissions (student_id);
CREATE INDEX IF NOT EXISTS idx_subm_task         ON submissions (task_id);
