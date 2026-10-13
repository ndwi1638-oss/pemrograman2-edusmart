/* ==========================================================================
   EduSmart - js/guru.js | Modul Guru (Vanilla JS, data via SQLite)
   --------------------------------------------------------------------------
   Dimuat SETELAH js/main.js. Memakai fungsi main.js: getUsers, saveUsers,
   findUserByEmail, hashPassword, showAlert, getSession, statusBadgeClass,
   hitungNilaiAkhir, initials.
   - Relasi data memakai ID (studentId, teacherId, classId, subjectId).
   - Guard: hanya jalan di <body data-guard="guru">, cek edusmart_current_user.
   - Seed hanya mengisi key yang masih kosong (tidak menimpa input guru).
   ========================================================================== */

/* ---------- Kunci data modul guru (disimpan di SQLite) ---------- */
var CU_KEY = "edusmart_current_user"; // ditulis saat login (lihat handleLogin)
var STUDENTS_KEY = "edusmart_students";
var TEACHERS_KEY = "edusmart_teachers";
var CLASSES_KEY = "edusmart_classes";
var SUBJECTS_KEY = "edusmart_subjects";
var MATERIALS_KEY = "edusmart_materials";
var TASKS_KEY = "edusmart_tasks";
var GRADES_KEY = "edusmart_grades";
var ATTEND_KEY = "edusmart_attendance";

/* ---------- Helper umum ---------- */
function getList(key) {
  try { return JSON.parse(DB.get(key)) || []; }
  catch (e) { return []; }
}

function setList(key, arr) {
  DB.set(key, JSON.stringify(arr));
}

/* ID unik: prefix + timestamp + nomor urut.
   Dulu memakai angka acak; sekarang memakai penghitung yang selalu naik supaya tidak
   pernah kembar. Ini penting karena ID menjadi primary key di SQLite: dua baris
   dengan ID sama akan saling menimpa (mis. jadwal 120 baris dibuat sekaligus). */
var uidCounter = Math.floor(Math.random() * 46656);
function uid(prefix) {
  uidCounter = (uidCounter + 1) % 46656;
  return prefix + "-" + Date.now().toString(36) + "-" + uidCounter.toString(36);
}

/* Amankan teks dari input agar tidak merusak HTML saat dirender. */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* ---------- Seed data (hanya jika key belum ada) ---------- */
var SCHEDULES_KEY = "edusmart_schedules";
var REPORTS_KEY = "edusmart_reports";
var MAJORS_KEY = "edusmart_majors";
var PREFILL_KEY = "edusmart_nilai_prefill"; // temp: kirim siswa+mapel+tugas ke form nilai

function subjectByName(nama) {
  var list = getList(SUBJECTS_KEY);
  var kunci = (nama || "").toLowerCase();
  for (var i = 0; i < list.length; i++) {
    if ((list[i].nama || "").toLowerCase() === kunci) return list[i];
  }
  return null;
}

/* Template mingguan kanonis (cermin dummyJadwal agar konsisten). */
var JADWAL_TEMPLATE = [
  { day: "Senin", startTime: "07.00", endTime: "08.30", mapel: "Matematika", room: "R-01" },
  { day: "Senin", startTime: "08.30", endTime: "10.00", mapel: "Bahasa Indonesia", room: "R-01" },
  { day: "Senin", startTime: "10.30", endTime: "12.00", mapel: "Fisika", room: "Lab IPA" },
  { day: "Selasa", startTime: "07.00", endTime: "08.30", mapel: "Bahasa Inggris", room: "R-01" },
  { day: "Selasa", startTime: "08.30", endTime: "10.00", mapel: "Kimia", room: "Lab IPA" },
  { day: "Selasa", startTime: "10.30", endTime: "12.00", mapel: "PJOK", room: "Lapangan" },
  { day: "Rabu", startTime: "07.00", endTime: "08.30", mapel: "Biologi", room: "Lab IPA" },
  { day: "Rabu", startTime: "08.30", endTime: "10.00", mapel: "Ekonomi", room: "R-01" },
  { day: "Rabu", startTime: "10.30", endTime: "12.00", mapel: "Informatika", room: "Lab-1" },
  { day: "Kamis", startTime: "07.00", endTime: "08.30", mapel: "Geografi", room: "R-01" },
  { day: "Kamis", startTime: "08.30", endTime: "10.00", mapel: "Sosiologi", room: "R-01" },
  { day: "Kamis", startTime: "10.30", endTime: "12.00", mapel: "Seni Budaya", room: "R-Seni" },
  { day: "Jumat", startTime: "07.00", endTime: "08.00", mapel: "Pendidikan Agama", room: "R-01" },
  { day: "Jumat", startTime: "08.00", endTime: "09.00", mapel: "Matematika", room: "R-01" },
  { day: "Jumat", startTime: "09.30", endTime: "10.30", mapel: "Informatika", room: "Lab-1" }
];

/* Buat jadwal per kelas (relasi ID penuh). Guru diisi otomatis bila cocok. */
function seedSchedules() {
  if (DB.get(SCHEDULES_KEY) !== null) return;
  var guru = getList(TEACHERS_KEY);
  var rows = [];
  getList(CLASSES_KEY).forEach(function (c) {
    JADWAL_TEMPLATE.forEach(function (r) {
      var sub = subjectByName(r.mapel);
      var subjectId = sub ? sub.subjectId : "";
      var teacherId = "";
      var i;
      for (i = 0; i < guru.length; i++) {
        if ((guru[i].subjectIds || []).indexOf(subjectId) !== -1 &&
            (guru[i].classIds || []).indexOf(c.classId) !== -1) { teacherId = guru[i].teacherId; break; }
      }
      if (!teacherId && subjectId) {
        for (i = 0; i < guru.length; i++) {
          if ((guru[i].subjectIds || []).indexOf(subjectId) !== -1) { teacherId = guru[i].teacherId; break; }
        }
      }
      rows.push({ scheduleId: uid("SCH"), classId: c.classId, subjectId: subjectId,
        teacherId: teacherId, day: r.day, startTime: r.startTime, endTime: r.endTime, room: r.room });
    });
  });
  setList(SCHEDULES_KEY, rows);
}

function seedGuruData() {
  /* Jangan menyiapkan/menulis data default saat data awan belum selesai dimuat,
     supaya tidak menimpa data yang tersimpan di server (kasus "data hilang"). */
  if (typeof window.EduSmartAwanSiap === "function" && !window.EduSmartAwanSiap()) return;
  // TIDAK ada data dummy siswa/guru/materi/tugas/nilai/absensi/raport.
  // Key yang belum ada hanya disiapkan kosong; data lama TIDAK ditimpa.
  // Data diisi oleh: Admin (siswa/guru/kelas/jadwal) ->
  // Guru (materi/tugas/nilai/absensi/raport).
  ["edusmart_students", "edusmart_teachers", "edusmart_materials",
   "edusmart_tasks", "edusmart_grades", "edusmart_attendance",
   "edusmart_reports", "edusmart_majors"].forEach(function (k) {
    if (DB.get(k) === null) setList(k, []);
  });

  // 2) Mata pelajaran (master IPA/IPS). Dijalankan setiap load (upsert):
  //    menambah yang belum ada, menyamakan nama/track, menghapus "IPA"
  //    generik yang sudah digantikan Fisika/Kimia/Biologi. ID lama
  //    dipertahankan agar nilai/materi/tugas yang sudah ada tidak rusak.
  var MASTER_SUBJECTS = [
    { subjectId: "SUB-MTK", nama: "Matematika", track: "Bersama" },
    { subjectId: "SUB-BIN", nama: "Bahasa Indonesia", track: "Bersama" },
    { subjectId: "SUB-BIG", nama: "Bahasa Inggris", track: "Bersama" },
    { subjectId: "SUB-INF", nama: "Informatika", track: "Bersama" },
    { subjectId: "SUB-PJOK", nama: "PJOK", track: "Bersama" },
    { subjectId: "SUB-AGM", nama: "Pendidikan Agama", track: "Bersama" },
    { subjectId: "SUB-SBD", nama: "Seni Budaya", track: "Bersama" },
    { subjectId: "SUB-KIM", nama: "Kimia", track: "IPA" },
    { subjectId: "SUB-FIS", nama: "Fisika", track: "IPA" },
    { subjectId: "SUB-BIO", nama: "Biologi", track: "IPA" },
    { subjectId: "SUB-GEO", nama: "Geografi", track: "IPS" },
    { subjectId: "SUB-EKO", nama: "Ekonomi", track: "IPS" },
    { subjectId: "SUB-SOS", nama: "Sosiologi", track: "IPS" }
  ];
  var subs = getList(SUBJECTS_KEY);
  var adaSub = {};
  subs.forEach(function (s) { adaSub[s.subjectId] = true; });
  MASTER_SUBJECTS.forEach(function (m) {
    if (!adaSub[m.subjectId]) { subs.push(m); return; }
    subs.forEach(function (s) {
      if (s.subjectId === m.subjectId) { s.nama = m.nama; s.track = m.track; }
    });
  });
  setList(SUBJECTS_KEY, subs.filter(function (s) { return s.subjectId !== "SUB-IPA"; }));

  // 3) Kelas (struktur awal; Admin dapat menambah/mengubah/menghapus).
  if (DB.get(CLASSES_KEY) === null) {
    setList(CLASSES_KEY, [
      { classId: "CLS-X1", nama: "X IPA 1" },
      { classId: "CLS-X2", nama: "X IPA 2" },
      { classId: "CLS-XII1", nama: "XII IPA 1" }
    ]);
  }

  // 4-8) Siswa, guru, materi, tugas, nilai: dikosongkan bila key belum ada
  //    (sudah disiapkan di awal fungsi ini). TIDAK ada dummy otomatis.
  // edusmart_attendance & edusmart_reports: terisi saat guru menginput.
  mergeDuplicateClasses(); // satukan kelas ganda beda ejaan bila ada
  normalizeTeachers(); // paksa jenisGuru ke nilai yang diizinkan
  tautkanUserGuru(); // isi userId kosong dari akun users (NIP/email sama)
  gabungSemuaGuruDuplikat(); // satukan record ganda sisa (kasus Ahmad)
  enrichClasses(); // lengkapi tingkat/jurusan/waliTeacherId
  seedSchedules(); // buat edusmart_schedules per kelas bila belum ada
}

/* ---------- Resolver ID -> data ---------- */
function subjectById(id) {
  var list = getList(SUBJECTS_KEY);
  for (var i = 0; i < list.length; i++) if (list[i].subjectId === id) return list[i];
  return null;
}

function classById(id) {
  var list = getList(CLASSES_KEY);
  for (var i = 0; i < list.length; i++) if (list[i].classId === id) return list[i];
  return null;
}

function teacherById(id) {
  var list = getList(TEACHERS_KEY);
  for (var i = 0; i < list.length; i++) if (list[i].teacherId === id) return list[i];
  return null;
}

function studentById(id) {
  var list = getList(STUDENTS_KEY);
  for (var i = 0; i < list.length; i++) if (list[i].studentId === id) return list[i];
  return null;
}

function subjectName(id) { var s = subjectById(id); return s ? s.nama : "-"; }
function className(id) { var c = classById(id); return c ? c.nama : "-"; }
function teacherName(id) { var t = teacherById(id); return t ? t.nama : "-"; }

/* Cari/buat kelas berdasarkan nama (untuk akun guru/siswa pendaftar baru).
   Samakan ejaan: "X IPS 1", "X Ips 1", "x ips 1" dianggap kelas yang SAMA.
   Samakan juga angka Arab vs Romawi di awal: "12 IPA 1" == "XII IPA 1". */
function normalKelas(nama) {
  var s = (nama || "").trim().toLowerCase().replace(/\s+/g, " ");
  s = s.replace(/^kelas\s+/, ""); // "Kelas XII IPA 1" == "XII IPA 1"
  s = s.replace(/^(10|11|12)\b/, function (m, n) {
    return ({ 10: "x", 11: "xi", 12: "xii" })[n];
  });
  return s;
}

/* Tingkat & jurusan diturunkan dari nama kelas ("X IPA 1" -> 10/IPA). */
function tingkatOf(nama) {
  var m = /^\s*(xii|xi|x)\b/i.exec(nama || "");
  if (!m) return "";
  var r = m[1].toUpperCase();
  return r === "XII" ? "12" : r === "XI" ? "11" : "10";
}

function jurusanOf(nama) {
  var s = (nama || "").toLowerCase();
  if (s.indexOf("ips") !== -1) return "IPS";
  if (s.indexOf("ipa") !== -1) return "IPA";
  if (s.indexOf("bahasa") !== -1) return "Bahasa";
  return "";
}

/* Lengkapi field struktur kelas (tingkat/jurusan/waliTeacherId) tanpa
   menghapus data lama. Dijalankan setiap load (idempotent). */
function enrichClasses() {
  var guru = getList(TEACHERS_KEY);
  var list = getList(CLASSES_KEY);
  var berubah = false;
  list.forEach(function (c) {
    var w = "";
    for (var i = 0; i < guru.length; i++) {
      if (guru[i].waliClassId === c.classId) { w = guru[i].teacherId; break; }
    }
    var t = tingkatOf(c.nama), j = jurusanOf(c.nama);
    if (c.tingkat !== t || c.jurusan !== j || (c.waliTeacherId || "") !== w) {
      c.tingkat = t; c.jurusan = j; c.waliTeacherId = w;
      berubah = true;
    }
  });
  if (berubah) setList(CLASSES_KEY, list);
}

/* Paksa jenisGuru ke dua nilai yang diizinkan (guru_mapel/wali_kelas). */
function normalizeTeachers() {
  var list = getList(TEACHERS_KEY);
  var berubah = false;
  list.forEach(function (t) {
    var v = String(t.jenisGuru || "").toLowerCase().replace(/\s+/g, "_");
    var benar = (v.indexOf("wali") !== -1 && v.indexOf("bukan") === -1) ? "wali_kelas" : "guru_mapel";
    if (t.jenisGuru !== benar) { t.jenisGuru = benar; berubah = true; }
  });
  if (berubah) setList(TEACHERS_KEY, list);
}

function resolveOrCreateClass(namaKelas) {
  var tampil = (namaKelas || "").trim() || "Kelas Baru";
  var kunci = normalKelas(tampil);
  var list = getList(CLASSES_KEY);
  for (var i = 0; i < list.length; i++) {
    if (normalKelas(list[i].nama) === kunci) return list[i];
  }
  var baru = { classId: uid("CLS"), nama: tampil, tingkat: tingkatOf(tampil), jurusan: jurusanOf(tampil), waliTeacherId: "" };
  list.push(baru);
  setList(CLASSES_KEY, list);
  return baru;
}

/* Gabungkan kelas ganda (beda huruf besar/kecil/spasi) menjadi satu ID,
   dan petakan ulang semua referensinya (siswa, guru, materi, tugas,
   nilai, absensi). Hanya bekerja bila duplikat ditemukan. */
function mergeDuplicateClasses() {
  var kelas = getList(CLASSES_KEY);
  var induk = {}; // ejaan normal -> classId yang dipertahankan
  var ganti = {}; // classId lama -> classId baru
  kelas.forEach(function (c) {
    var k = normalKelas(c.nama);
    if (!induk[k]) induk[k] = c.classId;
    else if (c.classId !== induk[k]) ganti[c.classId] = induk[k];
  });
  if (Object.keys(ganti).length === 0) return;
  function petakan(id) { return ganti[id] || id; }
  function unik(arr) {
    return arr.filter(function (v, i) { return arr.indexOf(v) === i; });
  }
  setList(CLASSES_KEY, kelas.filter(function (c) { return !ganti[c.classId]; }));
  setList(STUDENTS_KEY, getList(STUDENTS_KEY).map(function (s) { s.classId = petakan(s.classId); return s; }));
  setList(TEACHERS_KEY, getList(TEACHERS_KEY).map(function (t) {
    t.classIds = unik((t.classIds || []).map(petakan));
    if (t.waliClassId) t.waliClassId = petakan(t.waliClassId);
    return t;
  }));
  setList(MATERIALS_KEY, getList(MATERIALS_KEY).map(function (m) { m.classId = petakan(m.classId); return m; }));
  setList(TASKS_KEY, getList(TASKS_KEY).map(function (x) { x.classId = petakan(x.classId); return x; }));
  setList(GRADES_KEY, getList(GRADES_KEY).map(function (g) { g.classId = petakan(g.classId); return g; }));
  setList(ATTEND_KEY, getList(ATTEND_KEY).map(function (a) { a.classId = petakan(a.classId); return a; }));
  setList(SCHEDULES_KEY, getList(SCHEDULES_KEY).map(function (r) { r.classId = petakan(r.classId); return r; }));
}

function isWali(t) { return t.jenisGuru === "wali_kelas"; }

/* Kelas yang boleh diakses guru (wali: semua kelas, mapel: yang diajar). */
function classOptionsFor(t) {
  var semua = getList(CLASSES_KEY);
  if (isWali(t)) return semua;
  return semua.filter(function (c) { return (t.classIds || []).indexOf(c.classId) !== -1; });
}

function subjectOptionsFor(t) {
  var semua = getList(SUBJECTS_KEY);
  if (isWali(t)) return semua;
  return semua.filter(function (s) { return (t.subjectIds || []).indexOf(s.subjectId) !== -1; });
}

/* ---------- Guard & provisioning akun ---------- */
function getCurrentUser() {
  try { return JSON.parse(DB.get(CU_KEY)); }
  catch (e) { return null; }
}

/* Gabungkan record guru ganda (NIP/email/userId sama) menjadi satu.
   Kasus nyata: Admin input mapel/kelas di record A (userId kosong),
   lalu guru login membuat record B kosong. Tanpa ini guru memakai
   record B sehingga dropdown mapel/kelas kosong dan tidak bisa menilai.
   Strategi: pertahankan record yang ditaut ke login (ketemu), salin
   subjectIds/classIds/waliClassId/jenisGuru yang kosong dari duplikatnya,
   petakan ulang referensi (materi/tugas/nilai/absensi/jadwal/raport),
   lalu hapus duplikat. Kembalikan true bila ada yang digabung. */
function gabungGuruDuplikat(pertahankan) {
  var list = getList(TEACHERS_KEY);
  var kunciNip = (pertahankan.nip || "").toLowerCase();
  var kunciEmail = (pertahankan.email || "").toLowerCase();
  var kunciUser = pertahankan.userId || "";
  var duplikatIds = {};
  var ada = false;
  list.forEach(function (t) {
    if (t.teacherId === pertahankan.teacherId) return;
    var sama = false;
    if (kunciUser && t.userId && t.userId === kunciUser) sama = true;
    if (!sama && kunciNip && (t.nip || "").toLowerCase() === kunciNip) sama = true;
    if (!sama && kunciEmail && (t.email || "").toLowerCase() === kunciEmail) sama = true;
    if (sama) { duplikatIds[t.teacherId] = true; ada = true; }
  });
  if (!ada) return false;
  function unik(arr) {
    return (arr || []).filter(function (v, i) { return v && arr.indexOf(v) === i; });
  }
  // Salin data Admin (mapel/kelas/wali) dari duplikat bila record login masih kosong.
  list.forEach(function (t) {
    if (!duplikatIds[t.teacherId]) return;
    pertahankan.subjectIds = unik((pertahankan.subjectIds || []).concat(t.subjectIds || []));
    pertahankan.classIds = unik((pertahankan.classIds || []).concat(t.classIds || []));
    if (!pertahankan.waliClassId && t.waliClassId) pertahankan.waliClassId = t.waliClassId;
    if (!pertahankan.telepon && t.telepon) pertahankan.telepon = t.telepon;
    if (!pertahankan.alamat && t.alamat) pertahankan.alamat = t.alamat;
    if (!pertahankan.foto && t.foto) pertahankan.foto = t.foto;
    // jenisGuru: wali_kelas lebih spesifik, jangan ditimpa guru_mapel kosong
    if (t.jenisGuru === "wali_kelas" && pertahankan.jenisGuru !== "wali_kelas") {
      pertahankan.jenisGuru = "wali_kelas";
    }
  });
  function petakan(id) { return duplikatIds[id] ? pertahankan.teacherId : id; }
  setList(TEACHERS_KEY, list.filter(function (t) { return !duplikatIds[t.teacherId]; }).map(function (t) {
    return t.teacherId === pertahankan.teacherId ? pertahankan : t;
  }));
  // Petakan ulang semua referensi guru ke ID yang dipertahankan.
  try {
    setList(MATERIALS_KEY, getList(MATERIALS_KEY).map(function (m) { m.teacherId = petakan(m.teacherId); return m; }));
    setList(TASKS_KEY, getList(TASKS_KEY).map(function (x) { x.teacherId = petakan(x.teacherId); return x; }));
    setList(GRADES_KEY, getList(GRADES_KEY).map(function (g) { g.teacherId = petakan(g.teacherId); return g; }));
    setList(ATTEND_KEY, getList(ATTEND_KEY).map(function (a) { a.teacherId = petakan(a.teacherId); return a; }));
    setList(REPORTS_KEY, getList(REPORTS_KEY).map(function (r) { r.teacherId = petakan(r.teacherId); return r; }));
    setList(SCHEDULES_KEY, getList(SCHEDULES_KEY).map(function (r) { r.teacherId = petakan(r.teacherId); return r; }));
    var kelas = getList(CLASSES_KEY).map(function (c) {
      if (c.waliTeacherId && duplikatIds[c.waliTeacherId]) c.waliTeacherId = pertahankan.teacherId;
      return c;
    });
    setList(CLASSES_KEY, kelas);
  } catch (e) { /* abaikan, data utama sudah digabung */ }
  return true;
}

/* Isi userId guru yang masih kosong dari akun users (cocok NIP/username/email).
   Tanpa ini record Admin lama (userId kosong) tidak ketemu saat login. */
function tautkanUserGuru() {
  var users = [];
  try { users = getUsers(); } catch (e) { return; }
  var guru = getList(TEACHERS_KEY);
  var berubah = false;
  guru.forEach(function (t) {
    if (t.userId) return;
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      if (u.role !== "guru") continue;
      var nipU = (u.nip || u.username || "").toLowerCase();
      var emailU = (u.email || "").toLowerCase();
      if ((nipU && (t.nip || "").toLowerCase() === nipU) ||
          (emailU && (t.email || "").toLowerCase() === emailU)) {
        t.userId = u.id;
        berubah = true;
        break;
      }
    }
  });
  if (berubah) setList(TEACHERS_KEY, guru);
}

/* Sapu semua duplikat guru (dijalankan tiap load, idempotent). */
function gabungSemuaGuruDuplikat() {
  var list = getList(TEACHERS_KEY);
  var grup = {};
  list.forEach(function (t) {
    var k = "";
    if ((t.nip || "").trim()) k = "nip:" + (t.nip || "").toLowerCase();
    else if ((t.email || "").trim()) k = "email:" + (t.email || "").toLowerCase();
    else if (t.userId) k = "uid:" + t.userId;
    else k = "id:" + t.teacherId;
    (grup[k] = grup[k] || []).push(t);
  });
  Object.keys(grup).forEach(function (k) {
    var g = grup[k];
    if (g.length < 2 || k.indexOf("id:") === 0) return;
    // Pertahankan yang sudah tertaut userId, atau yang paling lengkap datanya.
    g.sort(function (a, b) {
      var sa = (a.userId ? 2 : 0) + (a.subjectIds || []).length + (a.classIds || []).length;
      var sb = (b.userId ? 2 : 0) + (b.subjectIds || []).length + (b.classIds || []).length;
      return sb - sa;
    });
    gabungGuruDuplikat(g[0]);
  });
}

/* Guru pendaftar baru otomatis dibuatkan record teacher (ID, bukan nama). */
function ensureTeacherForUser(cu) {
  var list = getList(TEACHERS_KEY);
  var uname = (cu.username || "").toLowerCase();
  var email = (cu.email || "").toLowerCase();
  // NIP guru = username login. cu tidak selalu membawa nip, jadi ambil dari akun users.
  var nipAkun = "";
  try {
    var akunCek = findUserByLogin(cu.username || cu.email);
    if (akunCek) nipAkun = (akunCek.nip || akunCek.username || "").toLowerCase();
  } catch (e) {}
  var nipCu = ((cu.nip || "") + "|" + nipAkun).toLowerCase();
  function cocok(t) {
    if (cu.userId && t.userId && t.userId === cu.userId) return true;
    if (email && (t.email || "").toLowerCase() === email) return true;
    if (uname && (t.email || "").toLowerCase() === uname) return true;
    if (uname && (t.nip || "").toLowerCase() === uname) return true;
    if (nipAkun && (t.nip || "").toLowerCase() === nipAkun) return true;
    if (nipCu && nipCu.indexOf((t.nip || "").toLowerCase()) !== -1 && (t.nip || "")) return true;
    return false;
  }
  var ketemu = null;
  for (var i = 0; i < list.length; i++) {
    if (cocok(list[i])) { ketemu = list[i]; break; }
  }
  if (ketemu) {
    // Tautkan userId bila record admin lama belum tertaut (userId kosong),
    // supaya login berikutnya langsung memakai record yang ada datanya
    // (mapel/kelas dari Admin) dan tidak membuat duplikat kosong.
    // Bila sudah terlanjur ada duplikat, gabungkan ke record ini.
    var perluSimpan = false;
    if (cu.userId && !ketemu.userId) { ketemu.userId = cu.userId; perluSimpan = true; }
    if (gabungGuruDuplikat(ketemu)) perluSimpan = true;
    if (perluSimpan) {
      // baca ulang karena gabungGuruDuplikat menulis ulang list
      var segar = getList(TEACHERS_KEY);
      for (var j = 0; j < segar.length; j++) {
        if (segar[j].teacherId === ketemu.teacherId) { ketemu = segar[j]; break; }
      }
      // pastikan userId tetap tertaut setelah penggabungan
      if (cu.userId && !ketemu.userId) {
        ketemu.userId = cu.userId;
        setList(TEACHERS_KEY, getList(TEACHERS_KEY).map(function (x) {
          return x.teacherId === ketemu.teacherId ? ketemu : x;
        }));
      }
    }
    return ketemu;
  }
  var akun = findUserByLogin(cu.username || cu.email);
  var mauWali = akun && akun.waliKelas && akun.waliKelas !== "Bukan wali kelas";
  var t = {
    teacherId: uid("T"), userId: cu.userId || (akun ? akun.id : ""),
    nama: cu.nama, nip: (akun && akun.nip) || "-", email: (akun && akun.email) || "",
    jenisGuru: mauWali ? "wali_kelas" : "guru_mapel",
    subjectIds: [], classIds: [], waliClassId: "",
    telepon: "", alamat: "", foto: ""
  };
  if (mauWali) {
    var k = resolveOrCreateClass(akun.waliKelas);
    t.waliClassId = k.classId;
    t.classIds = [k.classId];
  }
  list.push(t);
  setList(TEACHERS_KEY, list);
  return t;
}

/* Siswa pendaftar baru otomatis dibuatkan record student. */
function ensureStudentForUser(input) {
  input = (input || "").toLowerCase();
  var list = getList(STUDENTS_KEY);
  var akun = findUserByLogin(input);
  for (var i = 0; i < list.length; i++) {
    if (akun && list[i].userId === akun.id) return list[i];
    if (input && list[i].nis && list[i].nis.toLowerCase() === input) return list[i];
    if (input && list[i].nisn && list[i].nisn.toLowerCase() === input) return list[i];
    if (input && (list[i].email || "").toLowerCase() === input) return list[i];
  }
  if (!akun || akun.role !== "siswa") return null;
  // Hubungkan juga via userId: email record bisa beda dengan email akun
  // (mis. STU-01 Budi terikat u-siswa-1). Selaraskan email bila cocok.
  for (var j = 0; j < list.length; j++) {
    if (list[j].userId && list[j].userId === akun.id) {
      if (input && (list[j].email || "").toLowerCase() !== input) {
        list[j].email = input;
        setList(STUDENTS_KEY, list);
      }
      return list[j];
    }
  }
  var kelas = resolveOrCreateClass(akun.kelas || (getList(CLASSES_KEY)[0] || {}).nama || "X IPA 1");
  var s = {
    studentId: uid("STU"), userId: akun.id, nama: akun.nama,
    nis: akun.nis || ("2026" + String(100 + list.length + 1)), email: akun.email || "",
    classId: kelas.classId, jk: "-"
  };
  list.push(s);
  setList(STUDENTS_KEY, list);
  return s;
}

function requireGuru() {
  var cu = getCurrentUser();
  if (!cu || !(cu.username || cu.email) || cu.role !== "guru") {
    window.location.href = "login.html";
    return null;
  }
  var teacher = ensureTeacherForUser(cu);
  if (!teacher) {
    window.location.href = "login.html";
    return null;
  }
  return { cu: cu, teacher: teacher };
}

function saveTeacher(t) {
  var list = getList(TEACHERS_KEY);
  for (var i = 0; i < list.length; i++) {
    if (list[i].teacherId === t.teacherId) { list[i] = t; break; }
  }
  setList(TEACHERS_KEY, list);
}

/* ---------- Aturan hak akses ---------- */
function cekAksesNilai(t, student, subjectId) {
  // Wali kelas: BEBAS lintas kelas (tanpa validasi waliClassId).
  if (isWali(t)) return { ok: true };
  if ((t.classIds || []).indexOf(student.classId) === -1) {
    return { ok: false, msg: "Anda tidak memiliki akses untuk menilai siswa atau mata pelajaran tersebut." };
  }
  if ((t.subjectIds || []).indexOf(subjectId) === -1) {
    return { ok: false, msg: "Anda tidak memiliki akses untuk menilai siswa atau mata pelajaran tersebut." };
  }
  return { ok: true };
}

/* Absensi hanya diisi oleh wali kelas. Guru mapel tidak mengisi absen
   (nilai/tugas/materi tetap bisa dari guru mapel). Wali kelas bebas
   mengisi untuk kelas binaannya. */
function cekAksesAbsensi(t) {
  if (isWali(t)) return { ok: true };
  return { ok: false, msg: "Hanya wali kelas yang dapat mengisi absensi." };
}

/* ---------- Jembatan ke halaman siswa (dibaca nilai.html & absensi.html) ---------- */
/* Cari record siswa by email (ID, bukan nama). Sekaligus sinkronisasi:
   bila siswa mengganti kelas lewat halaman Profil, samakan classId record
   dengan kelas di profil agar filter tugas/kelas tetap benar. */
function resolveStudentByLogin(input) {
  var s = ensureStudentForUser(input);
  if (!s) return null;
  try {
    var prof = JSON.parse(DB.get("edusmart_profile_" + String(input).toLowerCase()));
    if (prof && prof.kelas) {
      var k = resolveOrCreateClass(prof.kelas);
      if (s.classId !== k.classId) {
        s.classId = k.classId;
        var list = getList(STUDENTS_KEY);
        for (var i = 0; i < list.length; i++) {
          if (list[i].studentId === s.studentId) { list[i] = s; break; }
        }
        setList(STUDENTS_KEY, list);
      }
    }
  } catch (e) { /* abaikan, pakai classId record */ }
  return s;
}

/* Nilai guru per mapel untuk satu siswa: { "Matematika": {tugas,uts,uas} }. */
function gradeOverridesByEmail(email) {
  var st = resolveStudentByLogin(email);
  if (!st) return {};
  var out = {};
  getList(GRADES_KEY).forEach(function (g) {
    if (g.studentId === st.studentId) {
      out[subjectName(g.subjectId)] = { tugas: g.tugas, uts: g.uts, uas: g.uas };
    }
  });
  return out;
}

/* Absensi guru untuk satu siswa: [{tanggal, mapel, guru, status}]. */
function attendanceByEmail(email) {
  var st = resolveStudentByLogin(email);
  if (!st) return [];
  return getList(ATTEND_KEY)
    .filter(function (a) { return a.studentId === st.studentId; })
    .map(function (a) {
      return { tanggal: a.date, mapel: subjectName(a.subjectId), guru: teacherName(a.teacherId), status: a.status };
    });
}

/* Mapel yang benar-benar diampu guru (subjectIds miliknya sendiri).
   Dipakai untuk TAMPILAN dashboard/profil; dropdown form input wali kelas
   tetap memakai subjectOptionsFor (semua mapel) sesuai hak lintas kelas. */
function mapelAmpu(t) {
  return (t.subjectIds || []).map(function (id) { return subjectName(id); }).filter(function (n) { return n !== "-"; });
}

/* Kelas yang diajar guru (classIds miliknya sendiri). */
function kelasAmpu(t) {
  return (t.classIds || []).map(function (id) { return className(id); }).filter(function (n) { return n !== "-"; });
}

/* ---------- Halaman: Dashboard guru ---------- */
function renderGuruUser(ctx) {
  var el = document.getElementById("nav-guru-nama");
  if (el) el.textContent = "Halo, " + ctx.teacher.nama;
}

function initDashboardGuru(ctx) {
  if (!document.getElementById("g-nama")) return;
  var t = ctx.teacher;
  document.getElementById("g-nama").textContent = t.nama;
  document.getElementById("g-avatar").textContent = initials(t.nama);
  document.getElementById("g-nip").textContent = "NIP: " + (t.nip || "-");
  var labelJenis = isWali(t) ? "Wali Kelas" : "Guru Mata Pelajaran";
  document.getElementById("g-jenis").textContent = labelJenis;
  document.getElementById("g-mapel").textContent = mapelAmpu(t).join(", ") || "-";
  document.getElementById("g-kelas").textContent = kelasAmpu(t).join(", ") || "-";
  var hak = document.getElementById("g-hak");
  if (hak) hak.textContent = isWali(t) ? "Hak Akses: Dapat melakukan penilaian siswa lintas kelas." : "Hak Akses: Mengelola kelas dan mata pelajaran yang diampu.";

  // Statistik (dihitung dari ID milik guru ini).
  var siswa = getList(STUDENTS_KEY).filter(function (s) {
    return isWali(t) ? s.classId === t.waliClassId : (t.classIds || []).indexOf(s.classId) !== -1;
  });
  var tugas = getList(TASKS_KEY).filter(function (x) { return x.teacherId === t.teacherId; });
  var materi = getList(MATERIALS_KEY).filter(function (x) { return x.teacherId === t.teacherId; });
  var nilai = getList(GRADES_KEY).filter(function (x) { return x.teacherId === t.teacherId; });
  var abs = getList(ATTEND_KEY).filter(function (x) { return x.teacherId === t.teacherId; });
  document.getElementById("stat-gsiswa").textContent = siswa.length;
  document.getElementById("stat-gtugas").textContent = tugas.length;
  document.getElementById("stat-gmateri").textContent = materi.length;
  document.getElementById("stat-gnilai").textContent = nilai.length;
  // Jumlah pengumpulan atas tugas milik guru ini (relasi taskId).
  var myTaskIds = {};
  tugas.forEach(function (x) { myTaskIds[x.taskId] = true; });
  var kumpul = getSubmissionsAll().filter(function (s) {
    if (s.taskId && myTaskIds[s.taskId]) return true;
    if (!s.taskId && s.namaTugas) {
      return tugas.some(function (x) { return x.title === s.namaTugas; });
    }
    return false;
  }).length;
  var elKumpul = document.getElementById("stat-gkumpul");
  if (elKumpul) elKumpul.textContent = kumpul;
  var ringkas = document.getElementById("g-absensi");
  if (ringkas) {
    if (!abs.length) { ringkas.textContent = "Belum ada absensi yang diinput."; }
    else {
      var hadir = abs.filter(function (a) { return a.status === "Hadir"; }).length;
      ringkas.textContent = abs.length + " data absensi, " + Math.round(hadir / abs.length * 100) + "% hadir.";
    }
  }
}

/* ---------- Halaman: Profil guru ---------- */
function initProfilGuru(ctx) {
  var form = document.getElementById("form-profil-guru");
  if (!form) return;
  var t = ctx.teacher;
  function isi() {
    document.getElementById("pg-nama").value = t.nama || "";
    document.getElementById("pg-nip").value = t.nip || "";
    document.getElementById("pg-email").value = t.email || "";
    document.getElementById("pg-telepon").value = t.telepon || "";
    document.getElementById("pg-alamat").value = t.alamat || "";
    document.getElementById("pg-jenis").value = isWali(t) ? "Wali Kelas (wali_kelas)" : "Guru Mata Pelajaran (guru_mapel)";
    document.getElementById("pg-mapel").value = mapelAmpu(t).join(", ") || "-";
    document.getElementById("pg-kelas").value = kelasAmpu(t).join(", ") || "-";
    // Kotak centang: semua mapel/kelas, yang sudah diampu tercentang.
    bangunBox("pg-mapel-box", getList(SUBJECTS_KEY).map(function (s) { return { id: s.subjectId, nama: s.nama }; }), t.subjectIds || []);
    bangunBox("pg-kelas-box", getList(CLASSES_KEY).map(function (c) { return { id: c.classId, nama: c.nama }; }), t.classIds || []);
    var waliRow = document.getElementById("wrap-pg-wali");
    if (isWali(t)) {
      waliRow.hidden = false;
      document.getElementById("pg-wali").value = className(t.waliClassId);
    } else { waliRow.hidden = true; }
    // Foto: tampilkan jika ada, jika tidak tampilkan inisial.
    // Inisial ditaruh di span sendiri agar textContent tidak menghapus img.
    var img = document.getElementById("pg-foto");
    var av = document.getElementById("pg-initial");
    if (img && av) {
      if (t.foto) { img.src = t.foto; img.style.display = ""; av.textContent = ""; }
      else { img.style.display = "none"; av.textContent = initials(t.nama); }
    }
  }
  isi();
  var inputs = [document.getElementById("pg-nama"), document.getElementById("pg-email"), document.getElementById("pg-telepon"), document.getElementById("pg-alamat")];
  function kunci(k) {
    inputs.forEach(function (i) { i.disabled = k; });
    document.getElementById("pg-mapel").hidden = !k;
    document.getElementById("pg-kelas").hidden = !k;
    document.getElementById("pg-mapel-box").hidden = k;
    document.getElementById("pg-kelas-box").hidden = k;
  }
  /* Isi kotak centang dari daftar master; terpilih = yang sedang diampu. */
  function bangunBox(boxId, daftar, terpilih) {
    document.getElementById(boxId).innerHTML = daftar.map(function (d) {
      var cek = terpilih.indexOf(d.id) !== -1 ? " checked" : "";
      return "<label><input type='checkbox' data-ajar-id='" + d.id + "'" + cek + "> " + esc(d.nama) + "</label>";
    }).join("");
  }
  /* Baca ID yang dicentang di satu kotak. */
  function bacaBox(boxId) {
    var out = [];
    document.getElementById(boxId).querySelectorAll("input:checked").forEach(function (c) {
      out.push(c.getAttribute("data-ajar-id"));
    });
    return out;
  }
  kunci(true);
  document.getElementById("pg-edit").addEventListener("click", function () { kunci(false); });
  document.getElementById("pg-file").addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file || file.type.indexOf("image/") !== 0) return;
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, 400 / Math.max(img.width, img.height));
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        t.foto = canvas.toDataURL("image/jpeg", 0.85);
        saveTeacher(t);
        isi();
        showAlert("profil-guru-alert", "Foto profil diperbarui.", "success");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var nama = document.getElementById("pg-nama").value.trim();
    var email = document.getElementById("pg-email").value.trim().toLowerCase();
    if (!nama || !email) { showAlert("profil-guru-alert", "Nama dan email wajib diisi.", "error"); return; }
    // Email adalah kunci login: update serentak di users + sesi jika berubah.
    if (email !== t.email) {
      var pakai = findUserByEmail(email);
      if (pakai && pakai.id !== t.userId) { showAlert("profil-guru-alert", "Email sudah dipakai akun lain.", "error"); return; }
      var users = getUsers();
      users.forEach(function (u) { if (u.id === t.userId || u.email === t.email) { u.email = email; u.nama = nama; } });
      saveUsers(users);
      var cu = getCurrentUser(); cu.email = email; cu.nama = nama;
      DB.set(CU_KEY, JSON.stringify(cu));
      try {
        var sess = getSession();
        if (sess) { sess.email = email; sess.nama = nama; DB.set("edusmart_session", JSON.stringify(sess)); }
      } catch (err) { /* abaikan */ }
    }
    t.nama = nama;
    t.email = email;
    t.telepon = document.getElementById("pg-telepon").value.trim();
    t.alamat = document.getElementById("pg-alamat").value.trim();
    t.subjectIds = bacaBox("pg-mapel-box");
    t.classIds = bacaBox("pg-kelas-box");
    saveTeacher(t);
    isi(); // segarkan ringkasan mapel/kelas
    renderGuruUser({ teacher: t });
    kunci(true);
    showAlert("profil-guru-alert", "Profil berhasil disimpan.", "success");
  });
}

/* ---------- Halaman: Kelas guru ---------- */
function initKelasGuru(ctx) {
  var sel = document.getElementById("kel-select");
  if (!sel) return;
  var t = ctx.teacher;
  var opsi = classOptionsFor(t);
  sel.innerHTML = opsi.map(function (c) {
    var tanda = isWali(t) && c.classId === t.waliClassId ? " (kelas wali)" : "";
    return "<option value='" + c.classId + "'>" + esc(c.nama) + tanda + "</option>";
  }).join("") || "<option value=''>Belum ada kelas</option>";
  function render() {
    var c = classById(sel.value);
    if (!c) {
      document.getElementById("kel-detail").innerHTML = "<p class='muted'>Belum ada kelas yang dapat ditampilkan.</p>";
      document.getElementById("kel-tbody").innerHTML = "";
      return;
    }
    var wali = getList(TEACHERS_KEY).filter(function (x) { return x.waliClassId === c.classId; })[0];
    var murid = getList(STUDENTS_KEY).filter(function (s) { return s.classId === c.classId; });
    document.getElementById("kel-detail").innerHTML =
      "<h3>" + esc(c.nama) + "</h3>" +
      "<p><strong>Tingkat:</strong> " + esc(c.tingkat || "-") +
      " &bull; <strong>Jurusan:</strong> " + esc(c.jurusan || "-") + "</p>" +
      "<p><strong>Wali kelas:</strong> " + esc(wali ? wali.nama : "-") + "</p>" +
      "<p><strong>Jumlah siswa:</strong> " + murid.length + "</p>";
    document.getElementById("kel-tbody").innerHTML = murid.map(function (s, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + esc(s.nis) + "</td><td>" + esc(s.nama) + "</td><td>" + esc(s.jk) + "</td></tr>";
    }).join("") || "<tr><td colspan='4'>Belum ada siswa di kelas ini.</td></tr>";
  }
  sel.addEventListener("change", render);
  render();
}

/* ---------- Halaman: Materi guru ---------- */
function isiSelectMateri(t) {
  document.getElementById("mat-mapel").innerHTML = subjectOptionsFor(t).map(function (s) {
    return "<option value='" + s.subjectId + "'>" + esc(s.nama) + "</option>";
  }).join("");
  document.getElementById("mat-kelas").innerHTML = classOptionsFor(t).map(function (c) {
    return "<option value='" + c.classId + "'>" + esc(c.nama) + "</option>";
  }).join("");
  document.getElementById("filter-mapel-materi").innerHTML = "<option value='semua'>Semua Mapel</option>" + subjectOptionsFor(t).map(function (s) {
    return "<option value='" + s.subjectId + "'>" + esc(s.nama) + "</option>";
  }).join("");
  document.getElementById("filter-kelas-materi").innerHTML = "<option value='semua'>Semua Kelas</option>" + classOptionsFor(t).map(function (c) {
    return "<option value='" + c.classId + "'>" + esc(c.nama) + "</option>";
  }).join("");
}

function initMateriGuru(ctx) {
  var form = document.getElementById("form-materi");
  if (!form) return;
  var t = ctx.teacher;
  isiSelectMateri(t);
  function render() {
    var q = (document.getElementById("cari-materi-guru").value || "").toLowerCase();
    var fk = document.getElementById("filter-kelas-materi").value;
    var fm = document.getElementById("filter-mapel-materi").value;
    var rows = getList(MATERIALS_KEY)
      .filter(function (m) { return m.teacherId === t.teacherId; })
      .filter(function (m) {
        return (fk === "semua" || m.classId === fk) && (fm === "semua" || m.subjectId === fm) &&
          (m.title.toLowerCase().indexOf(q) !== -1 || (m.description || "").toLowerCase().indexOf(q) !== -1);
      });
    document.getElementById("materi-guru-tbody").innerHTML = rows.map(function (m, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + esc(m.title) + "</td><td>" + esc(subjectName(m.subjectId)) + "</td><td>" + esc(className(m.classId)) + "</td><td>" + esc(m.createdAt || "-") + "</td>" +
        "<td><button class='btn-small btn-dark' data-mat-edit='" + m.materialId + "'>Edit</button> " +
        "<button class='btn-danger' data-mat-del='" + m.materialId + "'>Hapus</button></td></tr>";
    }).join("") || "<tr><td colspan='6'>Belum ada materi.</td></tr>";
  }
  ["cari-materi-guru", "filter-kelas-materi", "filter-mapel-materi"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", render);
    document.getElementById(id).addEventListener("change", render);
  });
  function resetForm() {
    form.reset();
    document.getElementById("mat-id").value = "";
    document.getElementById("mat-batal").hidden = true;
  }
  document.getElementById("mat-batal").addEventListener("click", resetForm);
  document.getElementById("materi-guru-tbody").addEventListener("click", function (e) {
    var ed = e.target.getAttribute && e.target.getAttribute("data-mat-edit");
    var del = e.target.getAttribute && e.target.getAttribute("data-mat-del");
    var list = getList(MATERIALS_KEY);
    if (ed) {
      var m = list.filter(function (x) { return x.materialId === ed; })[0];
      if (!m) return;
      document.getElementById("mat-id").value = m.materialId;
      document.getElementById("mat-judul").value = m.title;
      document.getElementById("mat-mapel").value = m.subjectId;
      document.getElementById("mat-kelas").value = m.classId;
      document.getElementById("mat-deskripsi").value = m.description || "";
      document.getElementById("mat-isi").value = m.content || "";
      document.getElementById("mat-batal").hidden = false;
      window.scrollTo(0, 0);
    } else if (del) {
      if (!confirm("Hapus materi ini?")) return;
      setList(MATERIALS_KEY, list.filter(function (x) { return x.materialId !== del; }));
      render();
    }
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var title = document.getElementById("mat-judul").value.trim();
    var subjectId = document.getElementById("mat-mapel").value;
    var classId = document.getElementById("mat-kelas").value;
    if (!title || !subjectId || !classId) { showAlert("materi-alert", "Judul, mapel, dan kelas wajib diisi.", "error"); return; }
    var list = getList(MATERIALS_KEY);
    var id = document.getElementById("mat-id").value;
    if (id) {
      list.forEach(function (m) {
        if (m.materialId === id && m.teacherId === t.teacherId) {
          m.title = title; m.subjectId = subjectId; m.classId = classId;
          m.description = document.getElementById("mat-deskripsi").value.trim();
          m.content = document.getElementById("mat-isi").value.trim();
        }
      });
      showAlert("materi-alert", "Materi berhasil diperbarui.", "success");
    } else {
      list.push({
        materialId: uid("M"), teacherId: t.teacherId, subjectId: subjectId, classId: classId,
        title: title, description: document.getElementById("mat-deskripsi").value.trim(),
        content: document.getElementById("mat-isi").value.trim(), createdAt: todayStr()
      });
      showAlert("materi-alert", "Materi berhasil ditambahkan.", "success");
    }
    setList(MATERIALS_KEY, list);
    resetForm();
    render();
  });
  render();
}

/* ---------- Halaman: Tugas guru ---------- */
/* Kunci submissions: pakai key main.js bila ada. */
function submKey() {
  return (typeof SUBMIT_KEY !== "undefined") ? SUBMIT_KEY : "edusmart_submissions";
}

/* Lengkapi satu record pengumpulan ke struktur baru (ID-based) tanpa
   menghapus field lama. Kembalikan true bila ada yang dilengkapi. */
function normalSubmission(s) {
  var ubah = false;
  function set(k, v) { if (s[k] !== v) { s[k] = v; ubah = true; } }
  if (!s.submissionId) set("submissionId", uid("SUBM"));
  if (!s.taskId && s.tugasId) set("taskId", s.tugasId);
  if (!s.studentId && s.email) {
    var st = null;
    try { st = resolveStudentByLogin(s.email); } catch (e) {}
    if (st) set("studentId", st.studentId);
  }
  if (!s.submittedAt && s.waktu) set("submittedAt", s.waktu);
  if (!s.fileName && s.namaFile) set("fileName", s.namaFile);
  if (s.answer == null && s.jawaban != null) set("answer", s.jawaban);
  if (!s.status) set("status", "Terkumpul");
  return ubah;
}

/* Baca semua pengumpulan (otomatis migrasi struktur lama, sekali tulis). */
function getSubmissionsAll() {
  var list = [];
  try { list = JSON.parse(DB.get(submKey()) || "[]"); }
  catch (e) { list = []; }
  var berubah = false;
  list.forEach(function (s) { if (normalSubmission(s)) berubah = true; });
  if (berubah) {
    try { DB.set(submKey(), JSON.stringify(list)); } catch (e) {}
  }
  return list;
}

function hitungKumpul(task) {
  // Relasi via taskId (data baru) atau judul (data lama).
  var kunci = {};
  getSubmissionsAll().forEach(function (s) {
    if (s.taskId === task.taskId || s.namaTugas === task.title) {
      kunci[s.studentId || s.email] = true;
    }
  });
  var total = getList(STUDENTS_KEY).filter(function (s) { return s.classId === task.classId; }).length;
  var sudah = Object.keys(kunci).length;
  return { sudah: sudah, belum: Math.max(0, total - sudah) };
}

function isiSelectTugas(t) {
  document.getElementById("tg-mapel").innerHTML = subjectOptionsFor(t).map(function (s) {
    return "<option value='" + s.subjectId + "'>" + esc(s.nama) + "</option>";
  }).join("");
  document.getElementById("tg-kelas").innerHTML = classOptionsFor(t).map(function (c) {
    return "<option value='" + c.classId + "'>" + esc(c.nama) + "</option>";
  }).join("");
  document.getElementById("filter-mapel-tugas").innerHTML = "<option value='semua'>Semua Mapel</option>" + subjectOptionsFor(t).map(function (s) {
    return "<option value='" + s.subjectId + "'>" + esc(s.nama) + "</option>";
  }).join("");
  document.getElementById("filter-kelas-tugas").innerHTML = "<option value='semua'>Semua Kelas</option>" + classOptionsFor(t).map(function (c) {
    return "<option value='" + c.classId + "'>" + esc(c.nama) + "</option>";
  }).join("");
}

/* Panel pengumpulan: submissions.filter(taskId) -> nama siswa via studentId. */
function renderKumpul(taskId) {
  var panel = document.getElementById("panel-kumpul");
  if (!panel) return;
  var task = null;
  var list = getList(TASKS_KEY);
  for (var i = 0; i < list.length; i++) {
    if (list[i].taskId === taskId) { task = list[i]; break; }
  }
  if (!task) { panel.hidden = true; return; }
  var rows = getSubmissionsAll().filter(function (s) {
    return s.taskId === task.taskId || s.namaTugas === task.title;
  });
  document.getElementById("kumpul-judul").textContent =
    "Pengumpulan: " + task.title + " (" + rows.length + " siswa)";
  document.getElementById("kumpul-tbody").innerHTML = rows.map(function (s, i) {
    var st = s.studentId ? studentById(s.studentId) : null;
    var nama = st ? st.nama : (s.email || "-");
    var waktu = s.submittedAt || s.waktu || "";
    var teksWaktu = waktu ? new Date(waktu).toLocaleString("id-ID") : "-";
    var tombolNilai = st
      ? "<button class='btn-small btn-dark' data-nilai-dari='" + st.studentId + "|" + task.subjectId + "|" + task.taskId + "'>Nilai</button>"
      : "-";
    return "<tr><td>" + (i + 1) + "</td><td>" + esc(nama) + "</td><td>" + esc(s.fileName || s.namaFile || "-") + "</td><td>" + esc(teksWaktu) + "</td>" +
      "<td><span class='badge b-green'>" + esc(s.status || "Terkumpul") + "</span></td><td>" + tombolNilai + "</td></tr>";
  }).join("") || "<tr><td colspan='6'>Belum ada pengumpulan.</td></tr>";
  panel.hidden = false;
}

function initTugasGuru(ctx) {
  var form = document.getElementById("form-tugas");
  if (!form) return;
  var t = ctx.teacher;
  isiSelectTugas(t);
  function render() {
    var fk = document.getElementById("filter-kelas-tugas").value;
    var fm = document.getElementById("filter-mapel-tugas").value;
    var rows = getList(TASKS_KEY)
      .filter(function (x) { return x.teacherId === t.teacherId; })
      .filter(function (x) { return (fk === "semua" || x.classId === fk) && (fm === "semua" || x.subjectId === fm); });
    document.getElementById("tugas-guru-tbody").innerHTML = rows.map(function (x, i) {
      var k = hitungKumpul(x);
      return "<tr><td>" + (i + 1) + "</td><td>" + esc(x.title) + "</td><td>" + esc(subjectName(x.subjectId)) + "</td><td>" + esc(className(x.classId)) + "</td><td>" + esc(x.deadline) + "</td>" +
        "<td><span class='badge b-green'>" + k.sudah + " sudah</span></td><td><span class='badge b-yellow'>" + k.belum + " belum</span></td>" +
        "<td><button class='btn-small btn-dark' data-tg-lihat='" + x.taskId + "'>Lihat</button> " +
        "<button class='btn-small btn-dark' data-tg-edit='" + x.taskId + "'>Edit</button> " +
        "<button class='btn-danger' data-tg-del='" + x.taskId + "'>Hapus</button></td></tr>";
    }).join("") || "<tr><td colspan='8'>Belum ada tugas.</td></tr>";
  }
  ["filter-kelas-tugas", "filter-mapel-tugas"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", render);
  });
  function resetForm() {
    form.reset();
    document.getElementById("tg-id").value = "";
    document.getElementById("tg-batal").hidden = true;
  }
  document.getElementById("tg-batal").addEventListener("click", resetForm);
  document.getElementById("tugas-guru-tbody").addEventListener("click", function (e) {
    var lihat = e.target.getAttribute && e.target.getAttribute("data-tg-lihat");
    var ed = e.target.getAttribute && e.target.getAttribute("data-tg-edit");
    var del = e.target.getAttribute && e.target.getAttribute("data-tg-del");
    var list = getList(TASKS_KEY);
    if (lihat) {
      renderKumpul(lihat);
      return;
    } else if (ed) {
      var x = list.filter(function (y) { return y.taskId === ed; })[0];
      if (!x) return;
      document.getElementById("tg-id").value = x.taskId;
      document.getElementById("tg-judul").value = x.title;
      document.getElementById("tg-mapel").value = x.subjectId;
      document.getElementById("tg-kelas").value = x.classId;
      document.getElementById("tg-deadline").value = x.deadline;
      document.getElementById("tg-deskripsi").value = x.description || "";
      document.getElementById("tg-batal").hidden = false;
      window.scrollTo(0, 0);
    } else if (del) {
      if (!confirm("Hapus tugas ini?")) return;
      setList(TASKS_KEY, list.filter(function (y) { return y.taskId !== del; }));
      render();
    }
  });
  // Tombol "Nilai" di panel pengumpulan -> titip data ke form penilaian.
  var kumpulTbody = document.getElementById("kumpul-tbody");
  if (kumpulTbody) {
    kumpulTbody.addEventListener("click", function (e) {
      var v = e.target.getAttribute && e.target.getAttribute("data-nilai-dari");
      if (!v) return;
      var p = v.split("|");
      var st = studentById(p[0]);
      if (!st) return;
      try {
        DB.set(PREFILL_KEY, JSON.stringify({
          classId: st.classId, studentId: st.studentId, subjectId: p[1], taskId: p[2]
        }));
      } catch (err) { /* abaikan */ }
      window.location.href = "penilaian-guru.html";
    });
  }
  var kumpulTutup = document.getElementById("kumpul-tutup");
  if (kumpulTutup) {
    kumpulTutup.addEventListener("click", function () {
      document.getElementById("panel-kumpul").hidden = true;
    });
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var title = document.getElementById("tg-judul").value.trim();
    var subjectId = document.getElementById("tg-mapel").value;
    var classId = document.getElementById("tg-kelas").value;
    var deadline = document.getElementById("tg-deadline").value;
    if (!title || !subjectId || !classId || !deadline) { showAlert("tugas-alert", "Semua field wajib diisi.", "error"); return; }
    var list = getList(TASKS_KEY);
    var id = document.getElementById("tg-id").value;
    if (id) {
      list.forEach(function (x) {
        if (x.taskId === id && x.teacherId === t.teacherId) {
          x.title = title; x.subjectId = subjectId; x.classId = classId;
          x.deadline = deadline; x.description = document.getElementById("tg-deskripsi").value.trim();
        }
      });
      showAlert("tugas-alert", "Tugas berhasil diperbarui.", "success");
    } else {
      list.push({
        taskId: uid("TASK"), teacherId: t.teacherId, subjectId: subjectId, classId: classId,
        title: title, description: document.getElementById("tg-deskripsi").value.trim(),
        deadline: deadline, createdAt: todayStr()
      });
      showAlert("tugas-alert", "Tugas berhasil ditambahkan.", "success");
    }
    setList(TASKS_KEY, list);
    resetForm();
    render();
  });
  render();
}

/* ---------- Halaman: Penilaian guru (PALING PENTING) ---------- */
function nilaiValid(v) {
  v = Number(v);
  return !isNaN(v) && v >= 0 && v <= 100;
}

/* Tugas yang boleh dipilih saat menilai: sekelas + semapel.
   Wali: semua tugas yang cocok; mapel: hanya tugasnya sendiri. */
function taskOptionsFor(t, classId, subjectId) {
  return getList(TASKS_KEY).filter(function (x) {
    if (x.classId !== classId || x.subjectId !== subjectId) return false;
    if (isWali(t)) return true;
    return x.teacherId === t.teacherId;
  });
}

function initPenilaianGuru(ctx) {
  var form = document.getElementById("form-nilai");
  if (!form) return;
  var t = ctx.teacher;
  var selKelas = document.getElementById("nil-kelas");
  var selSiswa = document.getElementById("nil-siswa");
  var selMapel = document.getElementById("nil-mapel");

  // Wali kelas: SEMUA kelas & mapel. Guru mapel: hanya yang diajar.
  selKelas.innerHTML = classOptionsFor(t).map(function (c) {
    return "<option value='" + c.classId + "'>" + esc(c.nama) + "</option>";
  }).join("");
  selMapel.innerHTML = subjectOptionsFor(t).map(function (s) {
    return "<option value='" + s.subjectId + "'>" + esc(s.nama) + "</option>";
  }).join("");

  function isiSiswa() {
    var murid = getList(STUDENTS_KEY).filter(function (s) { return s.classId === selKelas.value; });
    selSiswa.innerHTML = murid.map(function (s) {
      return "<option value='" + s.studentId + "'>" + esc(s.nama) + " (" + esc(s.nis) + ")</option>";
    }).join("") || "<option value=''>Belum ada siswa</option>";
  }
  selKelas.addEventListener("change", isiSiswa);
  selKelas.addEventListener("change", isiTugasLink);
  selMapel.addEventListener("change", isiTugasLink);
  function isiTugasLink() {
    var ops = taskOptionsFor(t, selKelas.value, selMapel.value);
    document.getElementById("nil-tugas-link").innerHTML =
      "<option value=''>-- Tanpa tugas (nilai umum) --</option>" + ops.map(function (x) {
        return "<option value='" + x.taskId + "'>" + esc(x.title) + "</option>";
      }).join("");
  }
  isiSiswa();
  isiTugasLink();

  // Pratinjau nilai akhir otomatis.
  function preview() {
    var a = document.getElementById("nil-tugas").value;
    var b = document.getElementById("nil-uts").value;
    var c = document.getElementById("nil-uas").value;
    var el = document.getElementById("nil-preview");
    if (a === "" || b === "" || c === "") { el.textContent = "Nilai Akhir: -"; return; }
    el.textContent = "Nilai Akhir: " + hitungNilaiAkhir(Number(a), Number(b), Number(c));
  }
  ["nil-tugas", "nil-uts", "nil-uas"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", preview);
  });

  function resetForm() {
    form.reset();
    document.getElementById("nilai-id").value = "";
    document.getElementById("nilai-batal").hidden = true;
    isiSiswa();
    preview();
  }
  document.getElementById("nilai-batal").addEventListener("click", resetForm);

  // Tabel: mapel hanya melihat nilainya sendiri; wali melihat kelas walinya + yang ia input.
  function nilaiTerlihat() {
    return getList(GRADES_KEY).filter(function (g) {
      if (isWali(t)) return g.classId === t.waliClassId || g.teacherId === t.teacherId;
      return (t.classIds || []).indexOf(g.classId) !== -1 && (t.subjectIds || []).indexOf(g.subjectId) !== -1;
    });
  }

  function renderTabel() {
    var q = (document.getElementById("cari-nilai").value || "").toLowerCase();
    var fk = document.getElementById("filter-kelas-nilai").value;
    var fm = document.getElementById("filter-mapel-nilai").value;
    var rows = nilaiTerlihat().filter(function (g) {
      var st = studentById(g.studentId);
      var nama = st ? st.nama.toLowerCase() : "";
      return (fk === "semua" || g.classId === fk) && (fm === "semua" || g.subjectId === fm) &&
        (nama.indexOf(q) !== -1 || className(g.classId).toLowerCase().indexOf(q) !== -1 || subjectName(g.subjectId).toLowerCase().indexOf(q) !== -1);
    });
    document.getElementById("nilai-guru-tbody").innerHTML = rows.map(function (g, i) {
      var st = studentById(g.studentId);
      return "<tr><td>" + (i + 1) + "</td><td>" + esc(st ? st.nama : "-") + "</td><td>" + esc(className(g.classId)) + "</td><td>" + esc(subjectName(g.subjectId)) + "</td>" +
        "<td>" + g.tugas + "</td><td>" + g.uts + "</td><td>" + g.uas + "</td><td><strong>" + g.nilaiAkhir + "</strong></td><td>" + esc(teacherName(g.teacherId)) + "</td>" +
        "<td><button class='btn-small btn-dark' data-nilai-edit='" + g.gradeId + "'>Edit</button> " +
        "<button class='btn-danger' data-nilai-del='" + g.gradeId + "'>Hapus</button></td></tr>";
    }).join("") || "<tr><td colspan='10'>Belum ada data nilai.</td></tr>";
  }
  document.getElementById("filter-kelas-nilai").innerHTML = "<option value='semua'>Semua Kelas</option>" + getList(CLASSES_KEY).map(function (c) {
    return "<option value='" + c.classId + "'>" + esc(c.nama) + "</option>";
  }).join("");
  document.getElementById("filter-mapel-nilai").innerHTML = "<option value='semua'>Semua Mapel</option>" + getList(SUBJECTS_KEY).map(function (s) {
    return "<option value='" + s.subjectId + "'>" + esc(s.nama) + "</option>";
  }).join("");
  ["cari-nilai", "filter-kelas-nilai", "filter-mapel-nilai"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", renderTabel);
    document.getElementById(id).addEventListener("change", renderTabel);
  });

  document.getElementById("nilai-guru-tbody").addEventListener("click", function (e) {
    var ed = e.target.getAttribute && e.target.getAttribute("data-nilai-edit");
    var del = e.target.getAttribute && e.target.getAttribute("data-nilai-del");
    var list = getList(GRADES_KEY);
    if (ed) {
      var g = list.filter(function (x) { return x.gradeId === ed; })[0];
      if (!g) return;
      selKelas.value = g.classId;
      isiSiswa();
      selSiswa.value = g.studentId;
      selMapel.value = g.subjectId;
      isiTugasLink();
      document.getElementById("nil-tugas-link").value = g.taskId || "";
      document.getElementById("nilai-id").value = g.gradeId;
      document.getElementById("nil-tugas").value = g.tugas;
      document.getElementById("nil-uts").value = g.uts;
      document.getElementById("nil-uas").value = g.uas;
      document.getElementById("nilai-batal").hidden = false;
      preview();
      window.scrollTo(0, 0);
    } else if (del) {
      if (!confirm("Hapus data nilai ini?")) return;
      setList(GRADES_KEY, list.filter(function (x) { return x.gradeId !== del; }));
      renderTabel();
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var student = studentById(selSiswa.value);
    var subjectId = selMapel.value;
    var tugas = document.getElementById("nil-tugas").value;
    var uts = document.getElementById("nil-uts").value;
    var uas = document.getElementById("nil-uas").value;
    if (!student || !subjectId) { showAlert("nilai-alert", "Pilih kelas, siswa, dan mata pelajaran.", "error"); return; }
    if (!nilaiValid(tugas) || !nilaiValid(uts) || !nilaiValid(uas)) {
      showAlert("nilai-alert", "Nilai harus angka 0 sampai 100.", "error");
      return;
    }
    // >>> ATURAN AKSES: wali bebas lintas kelas, mapel dibatasi. <<<
    var cek = cekAksesNilai(t, student, subjectId);
    if (!cek.ok) { showAlert("nilai-alert", cek.msg, "error"); return; }

    var akhir = hitungNilaiAkhir(Number(tugas), Number(uts), Number(uas));
    var taskId = document.getElementById("nil-tugas-link").value || "";
    var list = getList(GRADES_KEY);
    var id = document.getElementById("nilai-id").value;
    if (id) {
      // Update: classId mengikuti KELAS SISWA (bukan kelas wali penginput).
      list.forEach(function (g) {
        if (g.gradeId === id) {
          g.studentId = student.studentId; g.classId = student.classId; g.subjectId = subjectId;
          g.taskId = taskId;
          g.tugas = Number(tugas); g.uts = Number(uts); g.uas = Number(uas); g.nilaiAkhir = akhir;
        }
      });
      showAlert("nilai-alert", "Nilai berhasil diperbarui. Nilai Akhir: " + akhir, "success");
    } else {
      list.push({
        gradeId: uid("G"), studentId: student.studentId, teacherId: t.teacherId,
        classId: student.classId, subjectId: subjectId, taskId: taskId,
        tugas: Number(tugas), uts: Number(uts), uas: Number(uas), nilaiAkhir: akhir
      });
      showAlert("nilai-alert", "Nilai berhasil disimpan. Nilai Akhir: " + akhir, "success");
    }
    setList(GRADES_KEY, list);
    resetForm();
    renderTabel();
  });
  // Titipan dari panel pengumpulan (tugas-guru): isi form otomatis sekali.
  try {
    var pre = JSON.parse(DB.get(PREFILL_KEY) || "null");
    DB.del(PREFILL_KEY);
    if (pre && pre.classId) {
      selKelas.value = pre.classId;
      isiSiswa();
      if (pre.subjectId) selMapel.value = pre.subjectId;
      isiTugasLink();
      if (pre.studentId) selSiswa.value = pre.studentId;
      if (pre.taskId) document.getElementById("nil-tugas-link").value = pre.taskId;
      showAlert("nilai-alert", "Form terisi dari pengumpulan tugas. Lengkapi nilai lalu simpan.", "success");
    }
  } catch (e) { /* abaikan */ }
  renderTabel();
}

/* ---------- Halaman: Absensi guru ---------- */
function initAbsensiGuru(ctx) {
  var btnMuat = document.getElementById("abs-muat");
  if (!btnMuat) return;
  var t = ctx.teacher;
  if (!isWali(t)) {
    showAlert("absensi-alert", "Hanya wali kelas yang dapat mengisi absensi.", "error");
    document.getElementById("abs-toolbar").hidden = true;
    document.getElementById("form-absensi").hidden = true;
    return;
  }
  /* Satu wali kelas hanya punya satu kelas binaan, jadi kelas dikunci
     otomatis tanpa dropdown. */
  var classId = t.waliClassId || "";
  if (!classId) {
    showAlert("absensi-alert", "Akun Anda belum ditetapkan sebagai wali kelas mana pun. Hubungi Admin.", "error");
    document.getElementById("abs-toolbar").hidden = true;
    document.getElementById("form-absensi").hidden = true;
    return;
  }
  document.getElementById("abs-info").textContent = "Kelas binaan: " + className(classId);
  document.getElementById("abs-tanggal").value = todayStr();

  function muat() {
    var tanggal = document.getElementById("abs-tanggal").value;
    if (!tanggal) { showAlert("absensi-alert", "Pilih tanggal terlebih dahulu.", "error"); return; }
    var cek = cekAksesAbsensi(t);
    if (!cek.ok) { showAlert("absensi-alert", cek.msg, "error"); return; }
    var murid = getList(STUDENTS_KEY).filter(function (s) { return s.classId === classId; });
    var lama = getList(ATTEND_KEY);
    document.getElementById("abs-tbody").innerHTML = murid.map(function (s, i) {
      var ada = lama.filter(function (a) {
        return a.studentId === s.studentId && a.date === tanggal;
      })[0];
      var st = ada ? ada.status : "Hadir";
      function radio(val) {
        return "<label><input type='radio' name='st-" + s.studentId + "' value='" + val + "'" + (st === val ? " checked" : "") + "> " + val + "</label>";
      }
      return "<tr><td>" + (i + 1) + "</td><td>" + esc(s.nama) + "</td><td><div class='radio-row'>" +
        radio("Hadir") + radio("Izin") + radio("Sakit") + radio("Alpa") + "</div></td></tr>";
    }).join("") || "<tr><td colspan='3'>Belum ada siswa di kelas ini.</td></tr>";
    document.getElementById("form-absensi").hidden = murid.length === 0;
  }

  btnMuat.addEventListener("click", muat);

  document.getElementById("form-absensi").addEventListener("submit", function (e) {
    e.preventDefault();
    var tanggal = document.getElementById("abs-tanggal").value;
    var cek = cekAksesAbsensi(t);
    if (!cek.ok) { showAlert("absensi-alert", cek.msg, "error"); return; }
    var murid = getList(STUDENTS_KEY).filter(function (s) { return s.classId === classId; });
    if (!murid.length) return;
    // Upsert harian: satu siswa satu status per tanggal (data lama
    // tanggal+siswa sama diganti, tidak diduplikat). subjectId dikosongkan
    // karena absensi kini diisi wali kelas, bukan per mata pelajaran.
    var list = getList(ATTEND_KEY).filter(function (a) {
      return !(a.date === tanggal && a.classId === classId);
    });
    murid.forEach(function (s) {
      var pilih = document.querySelector("input[name='st-" + s.studentId + "']:checked");
      list.push({
        attendanceId: uid("A"), studentId: s.studentId, teacherId: t.teacherId,
        subjectId: "", classId: classId, date: tanggal,
        status: pilih ? pilih.value : "Hadir"
      });
    });
    setList(ATTEND_KEY, list);
    showAlert("absensi-alert", "Absensi " + tanggal + " berhasil disimpan (" + murid.length + " siswa).", "success");
  });
}

/* Tugas guru untuk halaman siswa: dipetakan ke bentuk tugas siswa dan
   disaring sesuai kelas siswa (relasi via classId, bukan nama). */
function tugasSiswaFinal(email) {
  var out = [];
  try {
    var st = resolveStudentByLogin(email);
    getList(TASKS_KEY).forEach(function (x) {
      if (st && x.classId !== st.classId) return; // hanya kelasnya sendiri
      out.push({
        id: x.taskId, nama: x.title, mapel: subjectName(x.subjectId),
        guru: teacherName(x.teacherId), diberikan: x.createdAt || x.deadline,
        deadline: x.deadline, instruksi: x.description || "-"
      });
    });
  } catch (e) { /* abaikan */ }
  return out;
}

/* Materi untuk siswa: HANYA material.classId === student.classId.
   Kosong bila belum ada ("Belum ada materi pembelajaran."). */
function materiSiswaFinal(email) {
  var st = null;
  try { st = resolveStudentByLogin(email); } catch (e) {}
  if (st && st.classId) {
    return getList(MATERIALS_KEY).filter(function (m) { return m.classId === st.classId; })
      .map(function (m) {
        return { mapel: subjectName(m.subjectId), judul: m.title, guru: teacherName(m.teacherId),
          tanggal: m.createdAt || "-", deskripsi: m.description || "-" };
      });
  }
  return [];
}

/* Jadwal untuk siswa: HANYA schedule.classId === student.classId.
   Kalau kelasnya belum punya jadwal, TIDAK ditampilkan jadwal template
   (sebelumnya muncul jadwal contoh yang sama untuk semua kelas, sehingga
   siswa mengira jadwal kelas lain ikut terbawa). Tampil "Belum ada jadwal". */
function jadwalSiswaFinal(email) {
  var st = null;
  try { st = resolveStudentByLogin(email); } catch (e) {}
  if (st && st.classId) {
    var rows = getList(SCHEDULES_KEY).filter(function (r) { return r.classId === st.classId; });
    return rows.map(function (r) {
      return { hari: r.day, jam: r.startTime + "-" + r.endTime, mapel: subjectName(r.subjectId),
        guru: teacherName(r.teacherId), ruang: r.room };
    });
  }
  return [];
}

/* Jurusan/track kelas: "IPA" / "IPS" / "Bahasa" / "" (semua). */
function trackKelas(classId) {
  var c = classById(classId);
  if (!c) return "";
  if (c.jurusan) return c.jurusan;
  try { return jurusanOf(c.nama); } catch (e) { return ""; }
}

/* Susun jadwal mingguan otomatis dari JADWAL_TEMPLATE, disaring sesuai
   track: mapel "Bersama" selalu tampil, mapel IPA/IPS mengikuti jurusan
   kelas. Nama guru diisi bila ada pengampunya, bila tidak "-". */
function jadwalTemplateUntukKelas(classId) {
  var track = trackKelas(classId);
  var guru = getList(TEACHERS_KEY);
  function guruPengampu(subjectId) {
    var i, t = null;
    for (i = 0; i < guru.length; i++) {
      if ((guru[i].subjectIds || []).indexOf(subjectId) !== -1 &&
          (guru[i].classIds || []).indexOf(classId) !== -1) { t = guru[i]; break; }
    }
    if (!t) {
      for (i = 0; i < guru.length; i++) {
        if ((guru[i].subjectIds || []).indexOf(subjectId) !== -1) { t = guru[i]; break; }
      }
    }
    return t ? t.nama : "-";
  }
  return JADWAL_TEMPLATE.filter(function (r) {
    var s = subjectByName(r.mapel);
    var tr = s ? (s.track || "Bersama") : "Bersama";
    return tr === "Bersama" || !track || tr === track;
  }).map(function (r) {
    var s = subjectByName(r.mapel);
    return { hari: r.day, jam: r.startTime + "-" + r.endTime, mapel: r.mapel,
      guru: s ? guruPengampu(s.subjectId) : "-", ruang: r.room };
  });
}

/* ---------- Halaman: Data Siswa (CRUD master edusmart_students) ----------
   SINGLE SOURCE OF TRUTH: semua halaman (kelas, penilaian, absensi,
   dashboard guru, nilai/absensi/tugas/pengumpulan siswa) membaca dari
   edusmart_students secara dinamis. Relasi selalu via classId. */
function jkTampil(s) { return s.jenisKelamin || s.jk || "-"; }

function initDataSiswa(ctx) {
  var form = document.getElementById("form-siswa");
  if (!form) return;
  // Hak akses: guru mapel hanya melihat kelas yang diajar;
  // wali kelas melihat kelas yang diwalikan (+ yang diajar bila ada).
  var bolehKelas = null;
  try {
    if (ctx && ctx.teacher) {
      if (isWali(ctx.teacher)) {
        bolehKelas = (ctx.teacher.classIds || []).slice();
        if (ctx.teacher.waliClassId && bolehKelas.indexOf(ctx.teacher.waliClassId) === -1) {
          bolehKelas.push(ctx.teacher.waliClassId);
        }
      } else {
        bolehKelas = (ctx.teacher.classIds || []).slice();
      }
    }
  } catch (e) { bolehKelas = null; }
  function bolehLihat(s) {
    if (!bolehKelas) return true;
    return bolehKelas.indexOf(s.classId) !== -1;
  }
  function kelasTerdaftar() {
    var semua = getList(CLASSES_KEY);
    if (!bolehKelas) return semua;
    return semua.filter(function (c) { return bolehKelas.indexOf(c.classId) !== -1; });
  }
  function isiFilterKelas() {
    document.getElementById("filter-kelas-siswa").innerHTML =
      "<option value='semua'>Semua Kelas</option>" + kelasTerdaftar().map(function (c) {
        return "<option value='" + c.classId + "'>" + esc(c.nama) + "</option>";
      }).join("");
  }
  function isiSelectKelas() {
    document.getElementById("sw-kelas").innerHTML = kelasTerdaftar().map(function (c) {
      return "<option value='" + c.classId + "'>" + esc(c.nama) + "</option>";
    }).join("");
  }
  function render() {
    var q = (document.getElementById("cari-siswa").value || "").toLowerCase();
    var fk = document.getElementById("filter-kelas-siswa").value;
    var rows = getList(STUDENTS_KEY).filter(bolehLihat).filter(function (s) {
      var okF = !fk || fk === "semua" || s.classId === fk;
      var okQ = (s.nama || "").toLowerCase().indexOf(q) !== -1 ||
        (s.nis || "").toLowerCase().indexOf(q) !== -1;
      return okF && okQ;
    });
    document.getElementById("ds-tbody").innerHTML = rows.map(function (s, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + esc(s.nis) + "</td><td>" + esc(s.nama) + "</td><td>" + esc(jkTampil(s)) + "</td><td>" + esc(className(s.classId)) + "</td><td>" + esc(s.email || "-") + "</td>" +
        "<td><button class='btn-small btn-dark' data-sw-lihat='" + s.studentId + "'>Detail</button> " +
        "<button class='btn-small btn-dark' data-sw-edit='" + s.studentId + "'>Edit</button> " +
        "<button class='btn-danger' data-sw-del='" + s.studentId + "'>Hapus</button></td></tr>";
    }).join("") || "<tr><td colspan='7'>Belum ada data siswa.</td></tr>";
  }
  function resetForm() {
    form.reset();
    document.getElementById("sw-id").value = "";
    document.getElementById("sw-form-title").textContent = "Tambah Siswa";
    document.getElementById("sw-batal").hidden = true;
  }
  function cariSiswa(id) {
    var list = getList(STUDENTS_KEY);
    for (var i = 0; i < list.length; i++) if (list[i].studentId === id) return list[i];
    return null;
  }
  function tutupModal() { document.getElementById("modal-siswa").classList.remove("open"); }
  ["cari-siswa", "filter-kelas-siswa"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", render);
    document.getElementById(id).addEventListener("change", render);
  });
  document.getElementById("sw-batal").addEventListener("click", resetForm);
  document.getElementById("modal-close").addEventListener("click", tutupModal);
  var modal = document.getElementById("modal-siswa");
  modal.addEventListener("click", function (e) { if (e.target === modal) tutupModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") tutupModal(); });
  document.getElementById("ds-tbody").addEventListener("click", function (e) {
    var lihat = e.target.getAttribute && e.target.getAttribute("data-sw-lihat");
    var ed = e.target.getAttribute && e.target.getAttribute("data-sw-edit");
    var del = e.target.getAttribute && e.target.getAttribute("data-sw-del");
    var list = getList(STUDENTS_KEY);
    if (lihat) {
      var s = cariSiswa(lihat);
      if (!s) return;
      document.getElementById("modal-nama").textContent = s.nama;
      document.getElementById("modal-isi").innerHTML =
        "<p><strong>NIS/NISN:</strong> " + esc(s.nis) + "</p>" +
        "<p><strong>Jenis Kelamin:</strong> " + esc(jkTampil(s)) + "</p>" +
        "<p><strong>Kelas:</strong> " + esc(className(s.classId)) + "</p>" +
        "<p><strong>Email:</strong> " + esc(s.email || "-") + "</p>" +
        "<p><strong>Alamat:</strong> " + esc(s.alamat || "-") + "</p>" +
        "<p><strong>No. Telepon:</strong> " + esc(s.noTelepon || "-") + "</p>";
      modal.classList.add("open");
    } else if (ed) {
      var x = cariSiswa(ed);
      if (!x) return;
      document.getElementById("sw-id").value = x.studentId;
      document.getElementById("sw-nis").value = x.nis || "";
      document.getElementById("sw-nama").value = x.nama || "";
      document.getElementById("sw-email").value = x.email || "";
      document.getElementById("sw-jk").value = jkTampil(x) === "-" ? "" : jkTampil(x);
      document.getElementById("sw-kelas").value = x.classId || "";
      document.getElementById("sw-alamat").value = x.alamat || "";
      document.getElementById("sw-telepon").value = x.noTelepon || "";
      document.getElementById("sw-form-title").textContent = "Edit Siswa";
      document.getElementById("sw-batal").hidden = false;
      window.scrollTo(0, 0);
    } else if (del) {
      if (!confirm("Apakah Anda yakin ingin menghapus data siswa ini?")) return;
      setList(STUDENTS_KEY, list.filter(function (y) { return y.studentId !== del; }));
      render();
    }
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var nama = document.getElementById("sw-nama").value.trim();
    var nis = document.getElementById("sw-nis").value.trim();
    var email = document.getElementById("sw-email").value.trim().toLowerCase();
    var jk = document.getElementById("sw-jk").value;
    var classId = document.getElementById("sw-kelas").value;
    var alamat = document.getElementById("sw-alamat").value.trim();
    var telepon = document.getElementById("sw-telepon").value.trim();
    if (!nama) { showAlert("siswa-alert", "Nama lengkap wajib diisi.", "error"); return; }
    if (!nis) { showAlert("siswa-alert", "NIS/NISN wajib diisi.", "error"); return; }
    if (!classId) { showAlert("siswa-alert", "Kelas wajib dipilih.", "error"); return; }
    if (email && !isValidEmail(email)) { showAlert("siswa-alert", "Format email tidak valid.", "error"); return; }
    var list = getList(STUDENTS_KEY);
    var id = document.getElementById("sw-id").value;
    var dobel = list.filter(function (x) {
      return (x.nis || "").trim().toLowerCase() === nis.toLowerCase() && x.studentId !== id;
    })[0];
    if (dobel) { showAlert("siswa-alert", "NIS sudah dipakai siswa lain (" + dobel.nama + ").", "error"); return; }
    if (id) {
      // Edit: update by studentId, ID tidak berubah.
      list.forEach(function (x) {
        if (x.studentId === id) {
          x.nama = nama; x.nis = nis; x.email = email;
          x.jenisKelamin = jk; x.jk = jk; // dua field disamakan (kompatibel data lama)
          x.classId = classId; x.alamat = alamat; x.noTelepon = telepon;
          var akun = email ? findUserByEmail(email) : null;
          if (akun) x.userId = akun.id;
        }
      });
      showAlert("siswa-alert", "Data siswa berhasil diperbarui.", "success");
    } else {
      // Tambah: studentId otomatis & unik, data lain utuh.
      var akunBaru = email ? findUserByEmail(email) : null;
      list.push({
        studentId: uid("STU"), userId: akunBaru ? akunBaru.id : "",
        nama: nama, nis: nis, email: email,
        jenisKelamin: jk, jk: jk, classId: classId,
        alamat: alamat, noTelepon: telepon
      });
      showAlert("siswa-alert", "Data siswa berhasil ditambahkan", "success");
    }
    setList(STUDENTS_KEY, list);
    resetForm();
    isiSelectKelas();
    render();
  });
  isiFilterKelas();
  isiSelectKelas();
  render();
}

/* ---------- Halaman: Jadwal guru (CRUD edusmart_schedules) ----------
   Relasi ID penuh: schedule.classId/subjectId/teacherId. Wali melihat semua,
   guru mapel hanya jadwalnya sendiri. */
function initJadwalGuru(ctx) {
  var form = document.getElementById("form-jadwal");
  if (!form) return;
  var t = ctx.teacher;
  var HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  document.getElementById("jd-hari").innerHTML = HARI.map(function (h) {
    return "<option>" + h + "</option>";
  }).join("");
  document.getElementById("jd-kelas").innerHTML = classOptionsFor(t).map(function (c) {
    return "<option value='" + c.classId + "'>" + esc(c.nama) + "</option>";
  }).join("");
  document.getElementById("jd-mapel").innerHTML = subjectOptionsFor(t).map(function (s) {
    return "<option value='" + s.subjectId + "'>" + esc(s.nama) + "</option>";
  }).join("");
  document.getElementById("jd-guru").innerHTML = getList(TEACHERS_KEY).map(function (g) {
    var pil = g.teacherId === t.teacherId ? " selected" : "";
    return "<option value='" + g.teacherId + "'" + pil + ">" + esc(g.nama) + "</option>";
  }).join("");
  document.getElementById("filter-hari-jadwal").innerHTML = "<option value='semua'>Semua Hari</option>" + HARI.map(function (h) {
    return "<option>" + h + "</option>";
  }).join("");
  /* Default filter: kelas wali (atau kelas pertama yang diajar), bukan
     "Semua Kelas" — supaya tidak tercampur jadwal kelas lain. */
  var defaultKelas = "";
  if (isWali(t) && t.waliClassId) defaultKelas = t.waliClassId;
  else {
    var opsiKelas = classOptionsFor(t);
    if (opsiKelas.length) defaultKelas = opsiKelas[0].classId;
  }
  document.getElementById("filter-kelas-jadwal").innerHTML = "<option value='semua'>Semua Kelas</option>" + classOptionsFor(t).map(function (c) {
    return "<option value='" + c.classId + "'" + (c.classId === defaultKelas ? " selected" : "") + ">" + esc(c.nama) + "</option>";
  }).join("");
  function terlihat() {
    return getList(SCHEDULES_KEY).filter(function (r) {
      if (!isWali(t) && r.teacherId !== t.teacherId) return false;
      return true;
    });
  }
  function render() {
    var fh = document.getElementById("filter-hari-jadwal").value;
    var fk = document.getElementById("filter-kelas-jadwal").value;
    var rows = terlihat().filter(function (r) {
      return (fh === "semua" || r.day === fh) && (fk === "semua" || r.classId === fk);
    });
    document.getElementById("jd-tbody").innerHTML = rows.map(function (r, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + esc(r.day) + "</td><td>" + esc(r.startTime + "-" + r.endTime) + "</td><td>" + esc(subjectName(r.subjectId)) + "</td><td>" + esc(className(r.classId)) + "</td><td>" + esc(teacherName(r.teacherId)) + "</td><td>" + esc(r.room) + "</td>" +
        "<td><button class='btn-small btn-dark' data-jd-edit='" + r.scheduleId + "'>Edit</button> " +
        "<button class='btn-danger' data-jd-del='" + r.scheduleId + "'>Hapus</button></td></tr>";
    }).join("") || "<tr><td colspan='8'>Belum ada jadwal.</td></tr>";
  }
  ["filter-hari-jadwal", "filter-kelas-jadwal"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", render);
  });
  function resetForm() {
    form.reset();
    document.getElementById("jd-id").value = "";
    document.getElementById("jd-batal").hidden = true;
    document.getElementById("jd-guru").value = t.teacherId;
  }
  document.getElementById("jd-batal").addEventListener("click", resetForm);
  document.getElementById("jd-tbody").addEventListener("click", function (e) {
    var ed = e.target.getAttribute && e.target.getAttribute("data-jd-edit");
    var del = e.target.getAttribute && e.target.getAttribute("data-jd-del");
    var list = getList(SCHEDULES_KEY);
    if (ed) {
      var r = list.filter(function (x) { return x.scheduleId === ed; })[0];
      if (!r) return;
      document.getElementById("jd-id").value = r.scheduleId;
      document.getElementById("jd-hari").value = r.day;
      document.getElementById("jd-kelas").value = r.classId;
      document.getElementById("jd-mapel").value = r.subjectId;
      document.getElementById("jd-guru").value = r.teacherId;
      document.getElementById("jd-mulai").value = r.startTime;
      document.getElementById("jd-selesai").value = r.endTime;
      document.getElementById("jd-ruang").value = r.room;
      document.getElementById("jd-batal").hidden = false;
      window.scrollTo(0, 0);
    } else if (del) {
      if (!confirm("Hapus jadwal ini?")) return;
      setList(SCHEDULES_KEY, list.filter(function (x) { return x.scheduleId !== del; }));
      render();
    }
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var day = document.getElementById("jd-hari").value;
    var classId = document.getElementById("jd-kelas").value;
    var subjectId = document.getElementById("jd-mapel").value;
    var teacherId = document.getElementById("jd-guru").value || t.teacherId;
    var startTime = document.getElementById("jd-mulai").value.trim();
    var endTime = document.getElementById("jd-selesai").value.trim();
    var room = document.getElementById("jd-ruang").value.trim();
    if (!day || !classId || !subjectId || !startTime || !endTime || !room) {
      showAlert("jadwal-alert", "Semua field wajib diisi.", "error");
      return;
    }
    var list = getList(SCHEDULES_KEY);
    var id = document.getElementById("jd-id").value;
    if (id) {
      list.forEach(function (r) {
        if (r.scheduleId === id) {
          r.day = day; r.classId = classId; r.subjectId = subjectId;
          r.teacherId = teacherId; r.startTime = startTime; r.endTime = endTime; r.room = room;
        }
      });
      showAlert("jadwal-alert", "Jadwal berhasil diperbarui.", "success");
    } else {
      list.push({ scheduleId: uid("SCH"), classId: classId, subjectId: subjectId,
        teacherId: teacherId, day: day, startTime: startTime, endTime: endTime, room: room });
      showAlert("jadwal-alert", "Jadwal berhasil ditambahkan.", "success");
    }
    setList(SCHEDULES_KEY, list);
    resetForm();
    render();
  });
  render();
}

/* ---------- Raport digital (wali kelas) ----------
   report: { reportId, studentId, teacherId, classId, semester,
   tahunAjaran, sikap, perkembangan, catatanWali, catatanTambahan,
   status: "Draft"|"Dibagikan", createdAt }.
   Draft: siswa belum melihat. Dibagikan: muncul di Raport Digital siswa. */
function nilaiSiswa(studentId) {
  return getList(GRADES_KEY).filter(function (g) { return g.studentId === studentId; })
    .map(function (g) {
      return { mapel: subjectName(g.subjectId), tugas: g.tugas, uts: g.uts, uas: g.uas, akhir: g.nilaiAkhir };
    });
}

function absensiSiswa(studentId) {
  var rows = getList(ATTEND_KEY).filter(function (a) { return a.studentId === studentId; });
  var s = { total: rows.length, hadir: 0, izin: 0, sakit: 0, alpa: 0 };
  rows.forEach(function (r) {
    if (r.status === "Hadir") s.hadir++;
    else if (r.status === "Izin") s.izin++;
    else if (r.status === "Sakit") s.sakit++;
    else if (r.status === "Alpa") s.alpa++;
  });
  return s;
}

function siswaBinaan(t) {
  if (!isWali(t) || !t.waliClassId) return [];
  return getList(STUDENTS_KEY).filter(function (s) { return s.classId === t.waliClassId; });
}

/* Siswa yang boleh diraportkan guru ini: kelas binaan (wali kelas) +
   semua siswa di kelas yang diajar (guru mapel). */
function siswaTerjangkau(t) {
  var out = siswaBinaan(t).slice();
  var ada = {};
  out.forEach(function (s) { ada[s.studentId] = true; });
  (t.classIds || []).forEach(function (cid) {
    getList(STUDENTS_KEY).forEach(function (s) {
      if (s.classId === cid && !ada[s.studentId]) { ada[s.studentId] = true; out.push(s); }
    });
  });
  return out;
}

function initRaportGuru(ctx) {
  var form = document.getElementById("form-raport");
  if (!form) return;
  var t = ctx.teacher;
  var daftar = siswaTerjangkau(t);
  if (!daftar.length) {
    document.getElementById("raport-alert").className = "alert show alert-error";
    document.getElementById("raport-alert").textContent = "Belum ada siswa yang bisa diraportkan. Wali kelas memakai kelas binaannya, guru mapel memakai kelas yang diajar (diatur Admin).";
    form.hidden = true;
  }
  var selSiswa = document.getElementById("rp-siswa");
  selSiswa.innerHTML = daftar.map(function (s) {
    return "<option value='" + s.studentId + "'>" + esc(s.nama) + " (" + esc(s.nis) + ")</option>";
  }).join("") || "<option value=''>Belum ada siswa binaan</option>";

  function renderTabel() {
    var q = (document.getElementById("cari-raport").value || "").toLowerCase();
    var fs = document.getElementById("filter-status-raport").value;
    var rows = getList(REPORTS_KEY)
      .filter(function (r) { return r.teacherId === t.teacherId; })
      .filter(function (r) {
        var st = studentById(r.studentId);
        var nama = st ? (st.nama || "").toLowerCase() : "";
        return (fs === "semua" || r.status === fs) && nama.indexOf(q) !== -1;
      });
    document.getElementById("raport-guru-tbody").innerHTML = rows.map(function (r, i) {
      var st = studentById(r.studentId);
      var badge = r.status === "Dibagikan" ? "b-green" : "b-yellow";
      var aksiBagikan = r.status === "Dibagikan"
        ? "<button class='btn-small btn-dark' data-rp-tarik='" + r.reportId + "'>Tarik</button> "
        : "<button class='btn-small btn-dark' data-rp-bagi='" + r.reportId + "'>Bagikan ke Siswa</button> ";
      return "<tr><td>" + (i + 1) + "</td><td>" + esc(st ? st.nama : "-") + "</td><td>" + esc(r.semester) + "</td><td>" + esc(r.tahunAjaran) + "</td>" +
        "<td><span class='badge " + badge + "'>" + esc(r.status) + "</span></td>" +
        "<td>" + aksiBagikan +
        "<button class='btn-small btn-dark' data-rp-lihat='" + r.reportId + "'>Lihat &amp; Cetak</button> " +
        "<button class='btn-small btn-dark' data-rp-edit='" + r.reportId + "'>Edit</button> " +
        "<button class='btn-danger' data-rp-del='" + r.reportId + "'>Hapus</button></td></tr>";
    }).join("") || "<tr><td colspan='6'>Belum ada raport.</td></tr>";
  }
  ["cari-raport", "filter-status-raport"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) { el.addEventListener("input", renderTabel); el.addEventListener("change", renderTabel); }
  });

  function resetForm() {
    form.reset();
    document.getElementById("rp-id").value = "";
    document.getElementById("rp-batal").hidden = true;
  }
  document.getElementById("rp-batal").addEventListener("click", resetForm);

  document.getElementById("raport-guru-tbody").addEventListener("click", function (e) {
    var bagi = e.target.getAttribute && e.target.getAttribute("data-rp-bagi");
    var tarik = e.target.getAttribute && e.target.getAttribute("data-rp-tarik");
    var lihat = e.target.getAttribute && e.target.getAttribute("data-rp-lihat");
    var ed = e.target.getAttribute && e.target.getAttribute("data-rp-edit");
    var del = e.target.getAttribute && e.target.getAttribute("data-rp-del");
    var list = getList(REPORTS_KEY);
    if (bagi || tarik) {
      var id = bagi || tarik;
      list.forEach(function (r) { if (r.reportId === id) r.status = bagi ? "Dibagikan" : "Draft"; });
      setList(REPORTS_KEY, list);
      showAlert("raport-alert", bagi ? "Raport dibagikan ke siswa." : "Raport ditarik kembali menjadi Draft.", "success");
      renderTabel();
      if (id) tampilRaportGuru(id);
    } else if (lihat) {
      tampilRaportGuru(lihat);
    } else if (ed) {
      var r = list.filter(function (x) { return x.reportId === ed; })[0];
      if (!r) return;
      selSiswa.value = r.studentId;
      document.getElementById("rp-id").value = r.reportId;
      document.getElementById("rp-semester").value = r.semester;
      document.getElementById("rp-tahun").value = r.tahunAjaran;
      document.getElementById("rp-sikap").value = r.sikap || "";
      document.getElementById("rp-perkembangan").value = r.perkembangan || "";
      document.getElementById("rp-catatan").value = r.catatanWali || "";
      document.getElementById("rp-tambahan").value = r.catatanTambahan || "";
      document.getElementById("rp-batal").hidden = false;
      window.scrollTo(0, 0);
    } else if (del) {
      if (!confirm("Hapus raport ini?")) return;
      setList(REPORTS_KEY, list.filter(function (x) { return x.reportId !== del; }));
      renderTabel();
    }
  });

  // Pratinjau nilai & absensi siswa terpilih (diambil otomatis via ID).
  // Nilai dibaca LIVE dari edusmart_grades, jadi nilai yang baru diinput
  // langsung muncul di sini dan di cetak raport tanpa perlu buat ulang raport.
  function predikatGuru(nilai) {
    try {
      if (typeof predikat === "function") return predikat(nilai);
    } catch (e) { /* pakai fallback di bawah */ }
    if (nilai >= 90) return "A";
    if (nilai >= 80) return "B";
    if (nilai >= 70) return "C";
    return "D";
  }
  function pratampil() {
    var st = studentById(selSiswa.value);
    var el = document.getElementById("rp-pratinjau");
    if (!el) return;
    if (!st) { el.innerHTML = "<span class='muted'>Pilih siswa untuk melihat ringkasan nilai &amp; absensi.</span>"; return; }
    var nl = nilaiSiswa(st.studentId);
    var ab = absensiSiswa(st.studentId);
    var tabelNilai = nl.length
      ? "<div class='table-wrap' style='margin-top:0.6rem'><table class='table'><thead><tr><th>Mapel</th><th>Tugas</th><th>UTS</th><th>UAS</th><th>Akhir</th><th>Predikat</th></tr></thead><tbody>" +
        nl.map(function (n) {
          return "<tr><td>" + esc(n.mapel) + "</td><td>" + n.tugas + "</td><td>" + n.uts + "</td><td>" + n.uas + "</td><td><strong>" + n.akhir + "</strong></td><td>" + predikatGuru(n.akhir) + "</td></tr>";
        }).join("") + "</tbody></table></div>"
      : "<br><span class='muted'>Belum ada nilai untuk siswa ini. Input dulu di menu Penilaian.</span>";
    el.innerHTML = "<strong>" + esc(st.nama) + "</strong> — " + nl.length + " mapel dinilai &bull; " +
      "Hadir " + ab.hadir + "/" + ab.total + " pertemuan." + tabelNilai;
  }
  selSiswa.addEventListener("change", pratampil);
  pratampil();

  // Detail raport + cetak untuk guru. Dipakai tombol "Lihat & Cetak".
  // Data nilai/absensi selalu diambil ulang (live) supaya sama dengan
  // yang dilihat siswa di raport-siswa.html.
  function tampilRaportGuru(reportId) {
    var box = document.getElementById("raport-detail");
    if (!box) return;
    var r = null;
    var list = getList(REPORTS_KEY);
    for (var i = 0; i < list.length; i++) {
      if (list[i].reportId === reportId) { r = list[i]; break; }
    }
    if (!r) { box.innerHTML = ""; return; }
    var st = studentById(r.studentId);
    var nl = nilaiSiswa(r.studentId);
    var ab = absensiSiswa(r.studentId);
    var nilaiRows = nl.map(function (n, idx) {
      return "<tr><td>" + (idx + 1) + "</td><td>" + esc(n.mapel) + "</td>" +
        "<td>" + n.tugas + "</td><td>" + n.uts + "</td><td>" + n.uas + "</td>" +
        "<td><strong>" + n.akhir + "</strong></td><td>" + predikatGuru(n.akhir) + "</td></tr>";
    }).join("") || "<tr><td colspan='7'>Belum ada nilai. Input dulu di menu Penilaian — data akan muncul otomatis di sini setelah disimpan.</td></tr>";
    var rata = nl.length
      ? Math.round(nl.map(function (n) { return n.akhir; }).reduce(function (a, b) { return a + b; }, 0) / nl.length)
      : "-";
    box.innerHTML = "<article class='card raport'>" +
      "<p class='no-print' style='text-align:right;margin-bottom:0.6rem'>" +
      "<span class='badge " + (r.status === "Dibagikan" ? "b-green" : "b-yellow") + "'>" + esc(r.status) + "</span> " +
      "<button type='button' class='btn-small btn-dark' data-cetak-raport>Cetak Rapor</button> " +
      "<button type='button' class='btn-small btn-dark' data-tutup-raport>Tutup</button></p>" +
      "<div class='raport-kop'><h3>RAPOR PESERTA DIDIK</h3><p>Kurikulum Merdeka &bull; EduSmart</p></div>" +
      "<table class='raport-id'><tbody>" +
      "<tr><td>Nama Peserta Didik</td><td>: <strong>" + esc(st ? st.nama : "-") + "</strong></td></tr>" +
      "<tr><td>NIS / NISN</td><td>: " + esc(st ? (st.nis || st.nisn || "-") : "-") + "</td></tr>" +
      "<tr><td>Kelas</td><td>: " + esc(className(r.classId || (st ? st.classId : ""))) + "</td></tr>" +
      "<tr><td>Semester</td><td>: " + esc(r.semester) + "</td></tr>" +
      "<tr><td>Tahun Ajaran</td><td>: " + esc(r.tahunAjaran) + "</td></tr>" +
      "<tr><td>Wali Kelas</td><td>: " + esc(namaWaliUntukRaport(r)) + "</td></tr>" +
      "</tbody></table>" +
      "<h4>A. Nilai Hasil Belajar (rata-rata: " + rata + ")</h4>" +
      "<div class='table-wrap'><table class='table'><thead><tr><th>No</th><th>Mata Pelajaran</th><th>Tugas</th><th>UTS</th><th>UAS</th><th>Nilai Akhir</th><th>Predikat</th></tr></thead><tbody>" + nilaiRows + "</tbody></table></div>" +
      "<h4>B. Ketidakhadiran</h4>" +
      "<div class='table-wrap'><table class='table'><thead><tr><th>Keterangan</th><th>Jumlah</th></tr></thead><tbody>" +
      "<tr><td>Sakit</td><td>" + ab.sakit + " hari</td></tr>" +
      "<tr><td>Izin</td><td>" + ab.izin + " hari</td></tr>" +
      "<tr><td>Tanpa Keterangan (Alpa)</td><td>" + ab.alpa + " hari</td></tr>" +
      "</tbody></table></div>" +
      "<h4>C. Catatan Wali Kelas</h4>" +
      "<p>" + esc(r.catatanWali || "-") + "</p>" +
      (r.perkembangan ? "<p><strong>Perkembangan:</strong> " + esc(r.perkembangan) + "</p>" : "") +
      (r.sikap ? "<p><strong>Sikap:</strong> " + esc(r.sikap) + "</p>" : "") +
      (r.catatanTambahan ? "<p><strong>Catatan Tambahan:</strong> " + esc(r.catatanTambahan) + "</p>" : "") +
      "</article>";
    if (box.scrollIntoView) box.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  // Tombol Cetak/Tutup di dalam detail (delegasi, tanpa inline JS).
  (function () {
    var box = document.getElementById("raport-detail");
    if (!box || box.getAttribute("data-bind-cetak") === "1") return;
    box.setAttribute("data-bind-cetak", "1");
    // Hapus class cetak setelah dialog print ditutup (biar tampilan kembali normal).
    try {
      window.addEventListener("afterprint", function () {
        try { document.body.classList.remove("cetak-raport"); } catch (e) {}
      });
    } catch (e) { /* abaikan */ }
    box.addEventListener("click", function (e) {
      var cetak = e.target && e.target.closest ? e.target.closest("[data-cetak-raport]") : null;
      if (cetak) {
        try { document.body.classList.add("cetak-raport"); } catch (err) {}
        window.print();
        // Cadangan bila afterprint tidak jalan: bersihkan setelah 1 detik.
        setTimeout(function () {
          try { document.body.classList.remove("cetak-raport"); } catch (err2) {}
        }, 1000);
        return;
      }
      var tutup = e.target && e.target.closest ? e.target.closest("[data-tutup-raport]") : null;
      if (tutup) { box.innerHTML = ""; }
    });
  })();

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var st = studentById(selSiswa.value);
    var semester = document.getElementById("rp-semester").value;
    var tahunAjaran = document.getElementById("rp-tahun").value.trim();
    if (!st) { showAlert("raport-alert", "Pilih siswa terlebih dahulu.", "error"); return; }
    if (!semester || !tahunAjaran) { showAlert("raport-alert", "Semester dan tahun ajaran wajib diisi.", "error"); return; }
    var list = getList(REPORTS_KEY);
    var id = document.getElementById("rp-id").value;
    var data = {
      semester: semester, tahunAjaran: tahunAjaran,
      sikap: document.getElementById("rp-sikap").value.trim(),
      perkembangan: document.getElementById("rp-perkembangan").value.trim(),
      catatanWali: document.getElementById("rp-catatan").value.trim(),
      catatanTambahan: document.getElementById("rp-tambahan").value.trim()
    };
    if (id) {
      list.forEach(function (r) {
        if (r.reportId === id && r.teacherId === t.teacherId) {
          r.studentId = st.studentId; r.classId = st.classId;
          r.semester = data.semester; r.tahunAjaran = data.tahunAjaran;
          r.sikap = data.sikap; r.perkembangan = data.perkembangan;
          r.catatanWali = data.catatanWali; r.catatanTambahan = data.catatanTambahan;
        }
      });
      showAlert("raport-alert", "Raport berhasil diperbarui.", "success");
    } else {
      list.push({ reportId: uid("RPT"), studentId: st.studentId, teacherId: t.teacherId,
        classId: st.classId, semester: data.semester, tahunAjaran: data.tahunAjaran,
        sikap: data.sikap, perkembangan: data.perkembangan,
        catatanWali: data.catatanWali, catatanTambahan: data.catatanTambahan,
        status: "Draft", createdAt: todayStr() });
      showAlert("raport-alert", "Raport Draft berhasil dibuat. Tekan “Bagikan ke Siswa” agar muncul di akun siswa.", "success");
    }
    setList(REPORTS_KEY, list);
    resetForm();
    pratampil();
    renderTabel();
  });
  renderTabel();
}

/* Nama wali yang tampil di raport siswa. Raport kini bisa dibuat wali kelas,
   guru mapel, atau Admin: utamakan wali kelas aslinya, lalu pembuatnya,
   terakhir "Admin" bila dibuat Admin dan kelasnya belum punya wali. */
function namaWaliUntukRaport(r) {
  try {
    var cls = classById(r.classId);
    if (cls && cls.waliTeacherId) {
      var w = teacherById(cls.waliTeacherId);
      if (w) return w.nama;
    }
  } catch (e) { /* abaikan */ }
  var pembuat = teacherById(r.teacherId);
  return pembuat ? pembuat.nama : "Admin";
}

/* Raport yang sudah Dibagikan untuk satu siswa (dibaca halaman siswa). */
function raportDibagikanUntuk(email) {
  var st = null;
  try { st = resolveStudentByLogin(email); } catch (e) { return []; }
  if (!st) return [];
  return getList(REPORTS_KEY)
    .filter(function (r) { return r.studentId === st.studentId && r.status === "Dibagikan"; })
    .map(function (r) {
      return { reportId: r.reportId, semester: r.semester, tahunAjaran: r.tahunAjaran,
        namaSiswa: st.nama, nis: st.nis || st.nisn || "-", namaKelas: className(r.classId || st.classId),
        namaWali: namaWaliUntukRaport(r), sikap: r.sikap,
        perkembangan: r.perkembangan, catatanWali: r.catatanWali,
        catatanTambahan: r.catatanTambahan,
        nilai: nilaiSiswa(st.studentId), absensi: absensiSiswa(st.studentId) };
    });
}

/* ---------- Init modul guru ---------- */
window.EduSmartReady(function () {
  seedGuruData(); // selalu jalan (hanya mengisi yang kosong)
  var guard = document.body ? document.body.getAttribute("data-guard") : null;
  if (guard !== "guru") return;
  var ctx = requireGuru();
  if (!ctx) return;
  renderGuruUser(ctx);
  initDashboardGuru(ctx);
  initProfilGuru(ctx);
  initKelasGuru(ctx);
  initMateriGuru(ctx);
  initTugasGuru(ctx);
  initPenilaianGuru(ctx);
  initAbsensiGuru(ctx);
  initDataSiswa(ctx);
  initJadwalGuru(ctx);
  initRaportGuru(ctx);
});
