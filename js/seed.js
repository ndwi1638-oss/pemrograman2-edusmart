/* ==========================================================================
   EduSmart - js/seed.js | Database Dummy (kelas, guru mapel, guru wali, siswa)
   --------------------------------------------------------------------------
   Dimuat SETELAH js/main.js + js/admin.js, hanya di dashboard-admin.html.
   - Isi: 6 kelas (X IPA 1, X IPS 1, XI IPA 2, XI IPS 2, XII IPA 3, XII IPS 3),
     11 guru mata pelajaran, 6 guru wali kelas, 10 siswa per kelas (60 siswa).
   - TIDAK membuat akun login (edusmart_users) dan TIDAK membuat nilai/tugas/
     absensi/raport. Admin yang membuatkan akun dan mengisi data acadmik.
   - ID berawalan T-DMY- (guru) dan STU-DMY- (siswa) supaya aman dijalankan
     berkali-kali (idempotent) dan mudah dihapus ulang.
   - Data yang sudah ada milik user tidak ditimpa, hanya dilengkapi.
   - Semua helper berawalan "dummy" agar tidak bentrok main.js/admin.js.
   ========================================================================== */

/* ---------- Kunci data (disimpan di SQLite) ---------- */
var D_CLASSES = "edusmart_classes";
var D_STUDENTS = "edusmart_students";
var D_TEACHERS = "edusmart_teachers";
var D_SUBJECTS = "edusmart_subjects";
var D_MATERIALS = "edusmart_materials";
var D_TASKS = "edusmart_tasks";
var D_GRADES = "edusmart_grades";
var D_ATTEND = "edusmart_attendance";
var D_REPORTS = "edusmart_reports";
var D_SCHEDULES = "edusmart_schedules";
var D_NOTICE = "edusmart_dummy_notice";

/* ---------- Helper ---------- */
function dummyGet(key) {
  try { return JSON.parse(DB.get(key)) || []; }
  catch (e) { return []; }
}

function dummySet(key, arr) {
  DB.set(key, JSON.stringify(arr));
}

function dummyAlert(msg, ok) {
  var el = document.getElementById("dummy-alert");
  if (!el) return;
  el.textContent = msg;
  el.className = "alert show " + (ok ? "alert-success" : "alert-error");
}

/* Samakan ejaan nama kelas: "Kelas XII IPA 1" == "XII IPA 1", "12 IPA 1" == "XII IPA 1" */
function dummyNormalKelas(nama) {
  var s = (nama || "").trim().toLowerCase().replace(/\s+/g, " ");
  s = s.replace(/^kelas\s+/, "");
  s = s.replace(/^(10|11|12)\b/, function (m, n) {
    return ({ 10: "x", 11: "xi", 12: "xii" })[n];
  });
  return s;
}

function dummyTingkat(nama) {
  var m = /^\s*(xii|xi|x)\b/i.exec(nama || "");
  if (!m) return "";
  var r = m[1].toUpperCase();
  return r === "XII" ? "12" : r === "XI" ? "11" : "10";
}

function dummyJurusan(nama) {
  var s = (nama || "").toLowerCase();
  if (s.indexOf("ips") !== -1) return "IPS";
  if (s.indexOf("ipa") !== -1) return "IPA";
  if (s.indexOf("bahasa") !== -1) return "Bahasa";
  return "";
}

function dummyIsDummyGuru(t) {
  return String(t.teacherId || "").indexOf("T-DMY-") === 0;
}

function dummyIsDummySiswa(s) {
  return String(s.studentId || "").indexOf("STU-DMY-") === 0;
}

/* "2009-04-12" -> "12 April 2009" */
function dummyTanggal(iso) {
  var bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "";
  return parseInt(m[3], 10) + " " + bulan[parseInt(m[2], 10) - 1] + " " + m[1];
}

/* ---------- Master mata pelajaran (dipastikan ada sebelum guru diisi) ---------- */
var DUMMY_SUBJECTS = [
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

/* ---------- 6 kelas target ---------- */
var DUMMY_KELAS = [
  { classId: "CLS-DMY-X-IPA-1", nama: "X IPA 1", jurusan: "IPA" },
  { classId: "CLS-DMY-X-IPS-1", nama: "X IPS 1", jurusan: "IPS" },
  { classId: "CLS-DMY-XI-IPA-2", nama: "XI IPA 2", jurusan: "IPA" },
  { classId: "CLS-DMY-XI-IPS-2", nama: "XI IPS 2", jurusan: "IPS" },
  { classId: "CLS-DMY-XII-IPA-3", nama: "XII IPA 3", jurusan: "IPA" },
  { classId: "CLS-DMY-XII-IPS-3", nama: "XII IPS 3", jurusan: "IPS" }
];

/* ---------- 11 guru mata pelajaran ---------- */
/* jalur: SEMUA = 6 kelas, IPA = 3 kelas IPA, IPS = 3 kelas IPS */
var DUMMY_GURU_MAPEL = [
  { teacherId: "T-DMY-G01", nama: "Andi Wijaya, S.Pd.", nip: "198204122008011001", mapel: ["SUB-MTK"], jalur: "SEMUA", telepon: "0812-1001-0001", alamat: "Jl. Merdeka No. 12, Bandung" },
  { teacherId: "T-DMY-G02", nama: "Sari Dewi, S.Pd.", nip: "198507152010012002", mapel: ["SUB-BIN"], jalur: "SEMUA", telepon: "0812-1001-0002", alamat: "Jl. Cendana No. 8, Bandung" },
  { teacherId: "T-DMY-G03", nama: "Rina Marlina, S.Pd.", nip: "198811032009012003", mapel: ["SUB-BIG"], jalur: "SEMUA", telepon: "0812-1001-0003", alamat: "Jl. Kenanga No. 21, Bogor" },
  { teacherId: "T-DMY-G04", nama: "Budi Santoso, M.Kom.", nip: "198903212011011004", mapel: ["SUB-INF"], jalur: "SEMUA", telepon: "0812-1001-0004", alamat: "Jl. Melati No. 5, Depok" },
  { teacherId: "T-DMY-G05", nama: "Joko Prasetyo, S.Pd.", nip: "198306102009011005", mapel: ["SUB-PJOK"], jalur: "SEMUA", telepon: "0812-1001-0005", alamat: "Jl. Kenanga No. 14, Bandung" },
  { teacherId: "T-DMY-G06", nama: "Ahmad Hidayat, S.Ag.", nip: "198001252006041006", mapel: ["SUB-AGM"], jalur: "SEMUA", telepon: "0812-1001-0006", alamat: "Jl. Teratai No. 3, Jakarta" },
  { teacherId: "T-DMY-G07", nama: "Dewi Anggraini, S.Pd.", nip: "199002182012012007", mapel: ["SUB-SBD"], jalur: "SEMUA", telepon: "0812-1001-0007", alamat: "Jl. Flamboyan No. 9, Bandung" },
  { teacherId: "T-DMY-G08", nama: "Maya Putri, S.Si.", nip: "198709142009012008", mapel: ["SUB-KIM", "SUB-BIO"], jalur: "IPA", telepon: "0812-1001-0008", alamat: "Jl. Cikutra No. 27, Bandung" },
  { teacherId: "T-DMY-G09", nama: "Fajar Nugroho, S.Pd.", nip: "198511052010011009", mapel: ["SUB-FIS"], jalur: "IPA", telepon: "0812-1001-0009", alamat: "Jl. Dago Atas No. 41, Bandung" },
  { teacherId: "T-DMY-G10", nama: "Dedi Kurniawan, S.E.", nip: "198403232008011010", mapel: ["SUB-EKO", "SUB-GEO"], jalur: "IPS", telepon: "0812-1001-0010", alamat: "Jl. Manyar No. 6, Surabaya" },
  { teacherId: "T-DMY-G11", nama: "Lina Kusuma, S.Sos.", nip: "199103272012012011", mapel: ["SUB-SOS"], jalur: "IPS", telepon: "0812-1001-0011", alamat: "Jl. Kenanga No. 30, Semarang" }
];

/* ---------- 6 guru wali kelas (1 kelas = 1 wali) ---------- */
var DUMMY_GURU_WALI = [
  { teacherId: "T-DMY-W01", nama: "Siti Rahmawati, S.Pd.", nip: "198609192009012012", kelas: "X IPA 1", telepon: "0812-2002-0001", alamat: "Jl. Melati No. 18, Bandung" },
  { teacherId: "T-DMY-W02", nama: "Hendra Gunawan, S.Pd.", nip: "198412052010011013", kelas: "X IPS 1", telepon: "0812-2002-0002", alamat: "Jl. Anggrek No. 22, Jakarta" },
  { teacherId: "T-DMY-W03", nama: "Nurul Hidayah, S.Pd.", nip: "199007312011012014", kelas: "XI IPA 2", telepon: "0812-2002-0003", alamat: "Jl. Kenanga No. 45, Bandung" },
  { teacherId: "T-DMY-W04", nama: "Agus Setiawan, S.Pd.", nip: "198707132009011015", kelas: "XI IPS 2", telepon: "0812-2002-0004", alamat: "Jl. Flamboyan No. 11, Yogyakarta" },
  { teacherId: "T-DMY-W05", nama: "Dewi Lestari, S.Pd.", nip: "198902242012012016", kelas: "XII IPA 3", telepon: "0812-2002-0005", alamat: "Jl. Cendana No. 7, Malang" },
  { teacherId: "T-DMY-W06", nama: "Rudi Hartono, S.Pd.", nip: "198510102010011017", kelas: "XII IPS 3", telepon: "0812-2002-0006", alamat: "Jl. Teratai No. 19, Bandung" }
];

/* ---------- 60 siswa (10 per kelas) ---------- */
/* Tiap baris: [nama, jk, tempatLahir, tanggalLahir, namaJalan] */
var DUMMY_SISWA = {
  "X IPA 1": [
    ["Ahmad Fauzi", "L", "Bandung", "2009-04-12", "Jl. Melati"],
    ["Rizky Ramadhan", "L", "Jakarta", "2009-01-27", "Jl. Kenanga"],
    ["Ilham Maulana", "L", "Bandung", "2008-11-08", "Jl. Cendana"],
    ["Bagus Wicaksono", "L", "Bogor", "2009-06-19", "Jl. Teratai"],
    ["Yoga Adi Saputra", "L", "Semarang", "2008-09-30", "Jl. Flamboyan"],
    ["Siti Nurhaliza", "P", "Bandung", "2009-02-14", "Jl. Anggrek"],
    ["Aisyah Putri", "P", "Surabaya", "2009-07-03", "Jl. Mawar"],
    ["Naila Zahra", "P", "Depok", "2008-12-22", "Jl. Dahlia"],
    ["Kirana Melati", "P", "Bandung", "2009-03-05", "Jl. Melati"],
    ["Putri Anggraini", "P", "Yogyakarta", "2008-10-16", "Jl. Kenanga"]
  ],
  "X IPS 1": [
    ["Bayu Setiawan", "L", "Malang", "2009-05-11", "Jl. Teratai"],
    ["Deni Kurniawan", "L", "Bandung", "2008-12-01", "Jl. Cendana"],
    ["Fauzan Ramadhan", "L", "Jakarta", "2009-01-09", "Jl. Melati"],
    ["Gilang Permana", "L", "Bandung", "2009-08-24", "Jl. Kenanga"],
    ["Hendra Wijaya", "L", "Semarang", "2008-07-13", "Jl. Flamboyan"],
    ["Anisa Rahma", "P", "Bandung", "2009-02-27", "Jl. Mawar"],
    ["Bunga Lestari", "P", "Bogor", "2008-11-19", "Jl. Anggrek"],
    ["Cindya Paramita", "P", "Jakarta", "2009-06-05", "Jl. Dahlia"],
    ["Diana Savira", "P", "Depok", "2008-09-08", "Jl. Teratai"],
    ["Elisa Nuraini", "P", "Yogyakarta", "2009-04-30", "Jl. Kenanga"]
  ],
  "XI IPA 2": [
    ["Irfan Maulana", "L", "Bandung", "2008-06-17", "Jl. Melati"],
    ["Jefri Tampubolon", "L", "Medan", "2008-03-26", "Jl. Cendana"],
    ["Kukuh Prasetyo", "L", "Yogyakarta", "2008-10-04", "Jl. Kenanga"],
    ["Lutfi Ramadhan", "L", "Bandung", "2008-05-21", "Jl. Flamboyan"],
    ["Maulana Yusuf", "L", "Jakarta", "2008-12-11", "Jl. Teratai"],
    ["Nabila Syakiebah", "P", "Bandung", "2008-08-02", "Jl. Mawar"],
    ["Oktaviani Putri", "P", "Surabaya", "2008-02-14", "Jl. Anggrek"],
    ["Priska Amelia", "P", "Semarang", "2008-11-28", "Jl. Dahlia"],
    ["Rahmawati Sari", "P", "Bandung", "2008-04-09", "Jl. Melati"],
    ["Safina Nuraini", "P", "Malang", "2008-09-22", "Jl. Kenanga"]
  ],
  "XI IPS 2": [
    ["Naufal Akbar", "L", "Jakarta", "2008-01-25", "Jl. Teratai"],
    ["Putra Mahendra", "L", "Bandung", "2008-07-06", "Jl. Cendana"],
    ["Rahmad Siddiq", "L", "Bogor", "2008-10-18", "Jl. Melati"],
    ["Satria Wibowo", "L", "Semarang", "2008-03-12", "Jl. Kenanga"],
    ["Taufik Hidayat", "L", "Depok", "2008-12-23", "Jl. Flamboyan"],
    ["Ulfah Bariyah", "P", "Bandung", "2008-05-30", "Jl. Mawar"],
    ["Vidya Puspita", "P", "Yogyakarta", "2008-08-16", "Jl. Anggrek"],
    ["Wulan Sari", "P", "Bandung", "2008-02-07", "Jl. Dahlia"],
    ["Yuni Astika", "P", "Malang", "2008-11-01", "Jl. Teratai"],
    ["Zahra Amelia", "P", "Jakarta", "2008-06-19", "Jl. Kenanga"]
  ],
  "XII IPA 3": [
    ["Bagas Prawira", "L", "Bandung", "2007-04-11", "Jl. Melati"],
    ["Cahyo Dwi A", "L", "Semarang", "2007-09-27", "Jl. Cendana"],
    ["Dhimas Arkan", "L", "Jakarta", "2007-01-15", "Jl. Kenanga"],
    ["Erlangga Putra", "L", "Bandung", "2007-07-03", "Jl. Flamboyan"],
    ["Farhan Abdillah", "L", "Depok", "2007-12-08", "Jl. Teratai"],
    ["Gina Maharani", "P", "Bandung", "2007-03-22", "Jl. Mawar"],
    ["Hana Kusuma", "P", "Bogor", "2007-10-14", "Jl. Anggrek"],
    ["Ina Puspita", "P", "Semarang", "2007-05-26", "Jl. Dahlia"],
    ["Jasmine Aulia", "P", "Bandung", "2007-08-09", "Jl. Melati"],
    ["Kartika Dewi", "P", "Surabaya", "2007-11-19", "Jl. Kenanga"]
  ],
  "XII IPS 3": [
    ["Lucky Novendra", "L", "Malang", "2007-02-13", "Jl. Teratai"],
    ["Reza Pratama", "L", "Bandung", "2007-06-20", "Jl. Cendana"],
    ["Surya Dharma", "L", "Jakarta", "2007-09-05", "Jl. Melati"],
    ["Tegar Wicaksono", "L", "Bogor", "2007-12-17", "Jl. Kenanga"],
    ["Uji Santoso", "L", "Yogyakarta", "2007-04-28", "Jl. Flamboyan"],
    ["Vina Oktaviani", "P", "Bandung", "2007-08-07", "Jl. Mawar"],
    ["Widya Kumala", "P", "Depok", "2007-01-31", "Jl. Anggrek"],
    ["Yuni Windari", "P", "Semarang", "2007-10-23", "Jl. Dahlia"],
    ["Zaskia Adya", "P", "Bandung", "2007-05-12", "Jl. Melati"],
    ["Zulfa Nuraini", "P", "Jakarta", "2007-07-24", "Jl. Kenanga"]
  ]
};

/* ---------- Master mapel: pastikan lengkap sebelum guru diisi ---------- */
function dummySyncSubjects() {
  var list = dummyGet(D_SUBJECTS);
  DUMMY_SUBJECTS.forEach(function (m) {
    var ada = null;
    list.forEach(function (s) { if (s.subjectId === m.subjectId) ada = s; });
    if (ada) { ada.nama = m.nama; ada.track = m.track; return; }
    list.push({ subjectId: m.subjectId, nama: m.nama, track: m.track });
  });
  dummySet(D_SUBJECTS, list);
}

/* ---------- Master kelas: pakai classId lama bila nama kelas sudah ada ---------- */
function dummySyncKelas() {
  var list = dummyGet(D_CLASSES);
  DUMMY_KELAS.forEach(function (k) {
    var kunci = dummyNormalKelas(k.nama);
    var c = null;
    list.forEach(function (x) { if (dummyNormalKelas(x.nama) === kunci) c = x; });
    if (!c) {
      c = { classId: k.classId, nama: k.nama };
      list.push(c);
    }
    c.nama = k.nama;
    c.tingkat = dummyTingkat(k.nama);
    c.jurusan = k.jurusan;
  });
  dummySet(D_CLASSES, list);
  return list;
}

function dummyCariKelas(list, nama) {
  var kunci = dummyNormalKelas(nama);
  var hasil = null;
  list.forEach(function (c) { if (dummyNormalKelas(c.nama) === kunci) hasil = c; });
  return hasil;
}

/* ---------- Guru dummy: upsert (data lama tetap dipertahankan) ---------- */
function dummySyncGuru() {
  var kelas = dummyGet(D_CLASSES);
  var idIPA = [], idIPS = [], idSemua = [];
  kelas.forEach(function (c) {
    idSemua.push(c.classId);
    if (c.jurusan === "IPA") idIPA.push(c.classId);
    if (c.jurusan === "IPS") idIPS.push(c.classId);
  });

  var list = dummyGet(D_TEACHERS);

  function upsert(data) {
    var t = null;
    list.forEach(function (x) { if (x.teacherId === data.teacherId) t = x; });
    if (!t) {
      t = { teacherId: data.teacherId, userId: "" };
      list.push(t);
    }
    t.nama = data.nama;
    t.nip = data.nip;
    t.jenisGuru = data.jenisGuru;
    t.subjectIds = data.subjectIds;
    t.classIds = data.classIds;
    t.waliClassId = data.waliClassId;
    t.status = "aktif";
    if (!t.email) t.email = "";
    if (!t.telepon) t.telepon = data.telepon || "";
    if (!t.alamat) t.alamat = data.alamat || "";
    if (!t.foto) t.foto = "";
  }

  DUMMY_GURU_MAPEL.forEach(function (g) {
    upsert({
      teacherId: g.teacherId, nama: g.nama, nip: g.nip, jenisGuru: "guru_mapel",
      subjectIds: g.mapel.slice(),
      classIds: g.jalur === "IPA" ? idIPA.slice() : g.jalur === "IPS" ? idIPS.slice() : idSemua.slice(),
      waliClassId: "", telepon: g.telepon, alamat: g.alamat
    });
  });

  DUMMY_GURU_WALI.forEach(function (g) {
    var c = dummyCariKelas(kelas, g.kelas);
    if (!c) return;
    upsert({
      teacherId: g.teacherId, nama: g.nama, nip: g.nip, jenisGuru: "wali_kelas",
      subjectIds: [], classIds: [c.classId], waliClassId: c.classId,
      telepon: g.telepon, alamat: g.alamat
    });
  });

  dummySet(D_TEACHERS, list);

  // Tandai wali kelas pada masing-masing record kelas.
  var kelasBaru = dummyGet(D_CLASSES);
  kelasBaru.forEach(function (c) {
    var wali = "";
    list.forEach(function (t) { if (t.waliClassId === c.classId) wali = t.teacherId; });
    c.waliTeacherId = wali;
  });
  dummySet(D_CLASSES, kelasBaru);
}

/* ---------- Siswa dummy: upsert ---------- */
function dummySyncSiswa() {
  var kelas = dummyGet(D_CLASSES);
  var list = dummyGet(D_STUDENTS);
  var no = 0;

  DUMMY_KELAS.forEach(function (k, urutan) {
    var c = dummyCariKelas(kelas, k.nama);
    if (!c) return;
    (DUMMY_SISWA[k.nama] || []).forEach(function (baris, idx) {
      no++;
      var studentId = "STU-DMY-" + ("000" + no).slice(-4);
      var nama = baris[0], jk = baris[1], tempat = baris[2], lahir = baris[3], jalan = baris[4];
      var alamat = jalan + " No. " + (no * 2 + 3) + ", " + tempat;
      var telepon = "0813-" + (2000 + no) + "-" + (3000 + no);
      var s = null;
      list.forEach(function (x) { if (x.studentId === studentId) s = x; });
      if (!s) {
        s = { studentId: studentId, userId: "", email: "" };
        list.push(s);
      }
      s.nama = nama;
      s.nis = String(260000 + (urutan + 1) * 100 + (idx + 1));
      s.nisn = "009" + String(1234500 + no);
      s.classId = c.classId;
      s.jk = jk;
      s.status = "aktif";
      if (!s.ttl) s.ttl = tempat + ", " + dummyTanggal(lahir);
      if (!s.alamat) s.alamat = alamat;
      if (!s.noTelepon) s.noTelepon = telepon;
    });
  });

  dummySet(D_STUDENTS, list);
}

/* ---------- Aksi utama ---------- */
/* PENTING: jangan memuat ulang halaman sebelum semua data benar-benar sampai
   ke server. Kalau langsung window.location.reload(), permintaan yang sedang
   berjalan ikut terputus dan sebagian besar data hilang (terbukti saat diuji).
   Tombol juga dikunci supaya tidak ada klik ganda. */
function dummyProses() {
  var b = document.getElementById("dummy-seed");
  var h = document.getElementById("dummy-hapus");
  if (b) { b.disabled = true; b.textContent = "Menyimpan ke database..."; }
  if (h) { h.disabled = true; }
}

function selesaiLaluMuatUlang() {
  if (typeof DB !== "undefined" && typeof DB.tulisSelesai === "function") {
    DB.tulisSelesai().then(function () { window.location.reload(); });
    return;
  }
  window.location.reload();
}

function seedDataDummy() {
  dummyProses();
  dummySyncSubjects();
  dummySyncKelas();
  dummySyncGuru();
  dummySyncSiswa();
  dummyNotice("Database dummy dibuat: 6 kelas, 11 guru mapel, 6 guru wali kelas, 60 siswa. Akun login belum dibuat — silakan dibuat/diatur Admin.");
  selesaiLaluMuatUlang();
}

function hapusDataDummy() {
  var siswa = dummyGet(D_STUDENTS).filter(dummyIsDummySiswa);
  var guru = dummyGet(D_TEACHERS).filter(dummyIsDummyGuru);
  if (!siswa.length && !guru.length) {
    dummyAlert("Belum ada data dummy untuk dihapus.", false);
    return;
  }
  if (!confirm("Hapus " + siswa.length + " data siswa dummy dan " + guru.length + " data guru dummy?\nData lain (kelas, akun, nilai) tidak ikut terhapus.")) return;

  dummyProses();
  var idSiswa = {}, idGuru = {};
  siswa.forEach(function (s) { idSiswa[s.studentId] = true; });
  guru.forEach(function (t) { idGuru[t.teacherId] = true; });

  dummySet(D_STUDENTS, dummyGet(D_STUDENTS).filter(function (s) { return !idSiswa[s.studentId]; }));
  dummySet(D_TEACHERS, dummyGet(D_TEACHERS).filter(function (t) { return !idGuru[t.teacherId]; }));
  dummySet(D_GRADES, dummyGet(D_GRADES).filter(function (g) { return !idSiswa[g.studentId] && !idGuru[g.teacherId]; }));
  dummySet(D_ATTEND, dummyGet(D_ATTEND).filter(function (a) { return !idSiswa[a.studentId] && !idGuru[a.teacherId]; }));
  dummySet(D_REPORTS, dummyGet(D_REPORTS).filter(function (r) { return !idSiswa[r.studentId]; }));
  dummySet(D_TASKS, dummyGet(D_TASKS).filter(function (t) { return !idGuru[t.teacherId]; }));
  dummySet(D_MATERIALS, dummyGet(D_MATERIALS).filter(function (m) { return !idGuru[m.teacherId]; }));
  dummySet(D_SCHEDULES, dummyGet(D_SCHEDULES).map(function (r) {
    if (idGuru[r.teacherId]) r.teacherId = "";
    return r;
  }));

  var kelas = dummyGet(D_CLASSES);
  kelas.forEach(function (c) { if (idGuru[c.waliTeacherId]) c.waliTeacherId = ""; });
  dummySet(D_CLASSES, kelas);

  dummyNotice("Data dummy dihapus: " + siswa.length + " siswa dan " + guru.length + " guru.");
  selesaiLaluMuatUlang();
}

function dummyNotice(pesan) {
  try { DB.set(D_NOTICE, JSON.stringify({ pesan: pesan })); }
  catch (e) { /* abaikan */ }
}

/* ---------- Ringkasan di halaman admin ---------- */
function renderDataDummy() {
  var kelas = dummyGet(D_CLASSES);
  var siswa = dummyGet(D_STUDENTS);
  var guru = dummyGet(D_TEACHERS);
  var mapel = dummyGet(D_SUBJECTS);

  var jmlGuru = guru.filter(dummyIsDummyGuru).length;
  var jmlSiswa = siswa.filter(dummyIsDummySiswa).length;

  var elInfo = document.getElementById("dummy-info");
  if (elInfo) {
    elInfo.textContent = jmlSiswa
      ? "Database dummy aktif: " + jmlGuru + " guru (" + (guru.filter(function (t) { return t.jenisGuru === "wali_kelas" && dummyIsDummyGuru(t); }).length) + " wali kelas) dan " + jmlSiswa + " siswa pada 6 kelas target."
      : "Database dummy belum dibuat. Tombol di bawah mengisi 6 kelas, 11 guru mapel, 6 guru wali kelas, dan 60 siswa (10 siswa per kelas).";
  }

  var tbody = document.getElementById("dummy-tbody");
  if (!tbody) return;
  tbody.innerHTML = DUMMY_KELAS.map(function (k, i) {
    var c = dummyCariKelas(kelas, k.nama);
    var nSiswa = c ? siswa.filter(function (s) { return s.classId === c.classId; }).length : 0;
    var wali = "-";
    if (c) guru.forEach(function (t) { if (t.waliClassId === c.classId) wali = t.nama; });
    var ids = {};
    if (c) guru.forEach(function (t) {
      if (t.jenisGuru !== "guru_mapel") return;
      if ((t.classIds || []).indexOf(c.classId) === -1) return;
      (t.subjectIds || []).forEach(function (id) { ids[id] = true; });
    });
    var namaMapel = Object.keys(ids).map(function (id) {
      var n = "-";
      mapel.forEach(function (s) { if (s.subjectId === id) n = s.nama; });
      return n;
    });
    return "<tr><td>" + (i + 1) + "</td><td>" + k.nama + "</td><td>" + (c ? c.classId : "-") + "</td>" +
      "<td>" + nSiswa + "</td><td>" + namaMapel.length + " &bull; " + (namaMapel.join(", ") || "-") + "</td><td>" + wali + "</td></tr>";
  }).join("");
}

/* ---------- Init panel (hanya di dashboard admin) ---------- */
function initDataDummy() {
  if (!document.getElementById("dummy-tbody") && !document.getElementById("dummy-seed")) return;

  var btnSeed = document.getElementById("dummy-seed");
  var btnHapus = document.getElementById("dummy-hapus");
  if (btnSeed) {
    btnSeed.addEventListener("click", function () {
      if (confirm("Isi database dummy (kelas, guru mapel, guru wali kelas, siswa)?\nData yang sudah ada tidak akan ditimpa.")) seedDataDummy();
    });
  }
  if (btnHapus) btnHapus.addEventListener("click", hapusDataDummy);

  // Pesan hasil aksi sebelumnya (setelah reload).
  try {
    var notice = JSON.parse(DB.get(D_NOTICE) || "null");
    if (notice && notice.pesan) {
      DB.del(D_NOTICE);
      dummyAlert(notice.pesan, true);
    }
  } catch (e) { /* abaikan */ }

  renderDataDummy();
}

window.EduSmartReady(function () {
  var guard = document.body ? document.body.getAttribute("data-guard") : null;
  if (guard !== "admin") return;
  if (typeof requireAdmin === "function" && !requireAdmin()) return;
  initDataDummy();
});
