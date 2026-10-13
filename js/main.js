/* EduSmart - js/main.js | Vanilla JS, tanpa framework. Data: SQLite (lihat js/api.js) */

var USERS_KEY = "edusmart_users";
var SESSION_KEY = "edusmart_session";
var MESSAGES_KEY = "edusmart_messages";

var DASHBOARD_BY_ROLE = {
  siswa: "dashboard-siswa.html",
  guru: "dashboard-guru.html",
  admin: "dashboard-admin.html"
};

/* ---------- Util ---------- */
function getUsers() {
  try {
    return JSON.parse(DB.get(USERS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  DB.set(USERS_KEY, JSON.stringify(users));
}

function findUserByEmail(email) {
  var list = getUsers();
  email = (email || "").trim().toLowerCase();
  for (var i = 0; i < list.length; i++) {
    if (list[i].email === email) return list[i];
  }
  return null;
}

/* Username = NIS/NISN (siswa) atau NIP/NUPTK (guru). Email tetap diterima
   sebagai alternatif supaya data lama & form yang dulu memakai email jalan. */
function findUserByUsername(username) {
  var list = getUsers();
  username = (username || "").trim().toLowerCase();
  if (!username) return null;
  for (var i = 0; i < list.length; i++) {
    if ((list[i].username || "").toLowerCase() === username) return list[i];
  }
  return null;
}

function findUserByLogin(input) {
  return findUserByUsername(input) || findUserByEmail(input);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
}

/* Hash sederhana untuk prototype (bukan pengganti bcrypt di production). */
function hashPassword(pw) {
  return btoa(unescape(encodeURIComponent("edusmart$" + pw)));
}

/* Password acak 8 karakter (huruf + angka) untuk diberikan Admin ke
   siswa/guru. Contoh: "k7rt2mqa" */
function acakPassword() {
  var huruf = "abcdefghjkmnpqrstuvwxyz23456789";
  var out = "", i;
  for (i = 0; i < 8; i++) out += huruf.charAt(Math.floor(Math.random() * huruf.length));
  return out;
}

/* ---------- Ganti password sendiri (siswa & guru) ----------
   Akun dibuat Admin, jadi siswa/guru tidak daftar sendiri. Halaman profil
   siswa & profil guru punya form ini untuk mengganti password. */
function handleChangePassword(event) {
  event.preventDefault();
  var form = event.target;
  var alertId = form.getAttribute("data-alert") || "ganti-sandun-alert";
  var lama = form.querySelector("[data-pass-lama]").value;
  var baru = form.querySelector("[data-pass-baru]").value;
  var konfirmasi = form.querySelector("[data-pass-konfirmasi]").value;

  var sess = getSession();
  if (!sess || !loginKey(sess)) { showAlert(alertId, "Sesi tidak ditemukan. Silakan login kembali.", "error"); return; }
  if (!lama || !baru || !konfirmasi) { showAlert(alertId, "Semua field wajib diisi.", "error"); return; }
  if (baru.length < 6) { showAlert(alertId, "Password baru minimal 6 karakter.", "error"); return; }
  if (baru !== konfirmasi) { showAlert(alertId, "Konfirmasi password tidak sama dengan password baru.", "error"); return; }

  var akun = findUserByLogin(loginKey(sess));
  if (!akun) { showAlert(alertId, "Akun tidak ditemukan.", "error"); return; }
  if (akun.password !== hashPassword(lama)) { showAlert(alertId, "Password lama salah.", "error"); return; }
  if (lama === baru) { showAlert(alertId, "Password baru harus berbeda dari password lama.", "error"); return; }

  var users = getUsers();
  users.forEach(function (u) { if (u.id === akun.id) u.password = hashPassword(baru); });
  saveUsers(users);
  form.reset();
  showAlert(alertId, "Password berhasil diganti. Gunakan password baru saat login berikutnya.", "success");
}

function showAlert(id, msg, type) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = "alert show " + (type === "success" ? "alert-success" : "alert-error");
}

/* ---------- Data awal ---------- */
/* Hanya akun Admin yang dipastikan ada. Data lama TIDAK pernah dihapus.
   Akun siswa/guru dibuat Admin dari Dashboard Admin (username = NIS/NISN
   atau NIP/NUPTK, password-nya dibuat Admin) — tidak ada pendaftaran
   mandiri, dan tidak ada dummy siswa/guru/tugas/materi otomatis. */
function seedDummyUsers() {
  var users = getUsers();
  var ada = false, berubah = false;
  for (var i = 0; i < users.length; i++) {
    if (users[i].email === "admin@edusmart.id" || users[i].username === "admin") { ada = true; break; }
  }
  if (!ada) {
    users.push({
      id: "u-admin-1", username: "admin", nama: "Admin EduSmart", email: "admin@edusmart.id",
      password: hashPassword("admin123"), role: "admin", status: "aktif",
      createdAt: new Date().toISOString()
    });
    saveUsers(users);
    return;
  }
  /* Migrasi sekali untuk data lama: tanpa status = aktif, tanpa username =
     diisi dari NIS/NIP (atau email untuk admin). */
  users.forEach(function (u) {
    if (!u.status) { u.status = "aktif"; berubah = true; }
    if (!u.username) {
      /* Akun lama belum punya username. Siswa = NIS/NISN, guru = NIP/NUPTK,
         admin tetap "admin" supaya cara loginnya tidak berubah. */
      if (u.role === "admin") u.username = "admin";
      else if (u.role === "siswa") u.username = (u.nis || u.email) || "";
      else if (u.role === "guru") u.username = (u.nip || u.email) || "";
      else u.username = u.email || "";
      berubah = true;
    }
  });
  if (berubah) saveUsers(users);
}

/* ---------- Redirect berdasar role ---------- */
function redirectByRole(role) {
  var target = DASHBOARD_BY_ROLE[role] || "index.html";
  // Dashboard belum dibuat pada tahap 1 — fungsi redirect sudah disiapkan.
  // Ketika file dashboard tersedia, baris di bawah akan membukanya otomatis.
  window.location.href = target;
}


/* ---------- Login ---------- */
function handleLogin(event) {
  event.preventDefault();
  var username = document.getElementById("login-username").value.trim();
  var password = document.getElementById("login-password").value;

  if (!username || !password) {
    showAlert("login-alert", "Username dan password wajib diisi.", "error");
    return;
  }

  var user = findUserByLogin(username);
  if (!user || user.password !== hashPassword(password)) {
    showAlert("login-alert", "Username atau password salah.", "error");
    return;
  }
  if ((user.status || "aktif") !== "aktif") {
    showAlert("login-alert", "Akun Anda belum aktif. Silakan hubungi Admin sekolah.", "error");
    return;
  }

  var loginAt = new Date().toISOString();
  var sesi = { username: user.username || user.email, nama: user.nama, role: user.role, loginAt: loginAt };
  DB.set(SESSION_KEY, JSON.stringify(sesi));
  // Sesi kanonis modul guru/admin (dipakai guard halaman guru).
  DB.set("edusmart_current_user", JSON.stringify({
    userId: user.id, username: user.username || user.email, email: user.email,
    nama: user.nama, role: user.role, loginAt: loginAt
  }));

  showAlert("login-alert", "Login berhasil sebagai " + user.role + ". Mengalihkan...", "success");
  setTimeout(function () {
    redirectByRole(user.role);
  }, 900);
}

function logout() {
  DB.del(SESSION_KEY);
  DB.del("edusmart_current_user");
  window.location.href = "login.html";
}

/* ---------- Toggle password ---------- */
function bindToggleButtons() {
  var buttons = document.querySelectorAll("[data-toggle-pass]");
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var input = document.getElementById(btn.getAttribute("data-toggle-pass"));
      if (!input) return;
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "Sembunyi" : "Lihat";
    });
  });
}


/* ---------- Navbar mobile + status login ---------- */
function initNavbar() {
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
    });
  }
}

function renderAuthState() {
  var slot = document.getElementById("nav-auth-state");
  if (!slot) return;
  try {
    var session = JSON.parse(DB.get(SESSION_KEY));
    if (session && loginKey(session)) {
      slot.textContent = "Halo, " + session.nama + " (" + session.role + ")";
    }
  } catch (e) { /* abaikan */ }
}

/* ---------- Form kontak (disimpan ke basis data) ---------- */
function handleContact(event) {
  event.preventDefault();
  var nama = document.getElementById("kontak-nama").value.trim();
  var email = document.getElementById("kontak-email").value.trim();
  var pesan = document.getElementById("kontak-pesan").value.trim();
  if (!nama || !email || !pesan) {
    showAlert("kontak-alert", "Semua field wajib diisi.", "error");
    return;
  }
  if (!isValidEmail(email)) {
    showAlert("kontak-alert", "Format email tidak valid.", "error");
    return;
  }
  var list = [];
  try { list = JSON.parse(DB.get(MESSAGES_KEY)) || []; } catch (e) {}
  list.push({ nama: nama, email: email, pesan: pesan, createdAt: new Date().toISOString() });
  DB.set(MESSAGES_KEY, JSON.stringify(list));
  showAlert("kontak-alert", "Pesan terkirim. Terima kasih sudah menghubungi EduSmart!", "success");
  document.getElementById("form-kontak").reset();
}

/* ===== MODUL SISWA (tahap 2, tambahan; fungsi tahap 1 di atas tidak diubah) ===== */

var PROFILE_PREFIX = "edusmart_profile_";
var SUBMIT_KEY = "edusmart_submissions";

function getSession() {
  try { return JSON.parse(DB.get(SESSION_KEY)); }
  catch (e) { return null; }
}

/* Kunci login: username (NIS/NISN untuk siswa, NIP/NUPTK untuk guru).
   Tetap jatuh ke email supaya data lama bisa dipakai. */
function loginKey(sess) {
  return (sess && (sess.username || sess.email)) || "";
}

/* Guard halaman siswa: belum login -> login.html; role bukan siswa -> login.html */
function requireSiswa() {
  var sess = getSession();
  if (!sess || !loginKey(sess)) {
    window.location.href = "login.html";
    return null;
  }
  if (sess.role !== "siswa") {
    window.location.href = "login.html";
    return null;
  }
  return sess;
}

function profileKey(email) {
  return PROFILE_PREFIX + (email || "").toLowerCase();
}

function defaultProfile(sess) {
  // Profil dibaca dari record siswa (edusmart_students) bila ada.
  try {
    if (typeof resolveStudentByLogin === "function" && sess && loginKey(sess)) {
      var st = resolveStudentByLogin(loginKey(sess));
      if (st) {
        var namaKelas = (typeof className === "function" && st.classId) ? className(st.classId) : "-";
        return {
          nama: st.nama || sess.nama, nis: st.nis || "-",
          email: st.email || "", kelas: namaKelas,
          jurusan: "", jk: st.jk || st.jenisKelamin || "-",
          ttl: "", alamat: st.alamat || "", telepon: st.noTelepon || ""
        };
      }
    }
  } catch (e) { /* abaikan, pakai default kosong */ }
  var nama = (sess && sess.nama) ? sess.nama : "-";
  var akun = (sess && loginKey(sess)) ? findUserByLogin(loginKey(sess)) : null;
  return {
    nama: nama,
    nis: (akun && akun.nis) || "-",
    email: (akun && akun.email) ? akun.email : "-",
    kelas: "-",
    jurusan: "",
    jk: "-",
    ttl: "",
    alamat: "",
    telepon: ""
  };
}

function getProfile(sess) {
  try {
    var raw = DB.get(profileKey(loginKey(sess)));
    if (raw) return Object.assign(defaultProfile(sess), JSON.parse(raw));
  } catch (e) { /* abaikan */ }
  return defaultProfile(sess);
}

function saveProfile(sess, data) {
  DB.set(profileKey(loginKey(sess)), JSON.stringify(data));
}

function initials(nama) {
  var parts = (nama || "S").trim().split(/\s+/);
  return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : "")).toUpperCase();
}

/* ---------- Data dummy siswa ---------- */
/* Jadwal mingguan siswa: 15 jam (Senin-Jumat) mencakup 13 mapel master
   (Matematika, B. Indonesia, B. Inggris, Informatika, PJOK,
   Pendidikan Agama, Seni Budaya, Kimia, Fisika, Biologi,
   Geografi, Ekonomi, Sosiologi). */
function dummyJadwal() {
  return [
    { hari: "Senin", jam: "07.00-08.30", mapel: "Matematika", guru: "Pak Andi Wijaya", ruang: "R-01" },
    { hari: "Senin", jam: "08.30-10.00", mapel: "Bahasa Indonesia", guru: "Bu Sari Dewi", ruang: "R-01" },
    { hari: "Senin", jam: "10.30-12.00", mapel: "Fisika", guru: "Pak Fajar Nugroho", ruang: "Lab IPA" },
    { hari: "Selasa", jam: "07.00-08.30", mapel: "Bahasa Inggris", guru: "Bu Rina Marlina", ruang: "R-01" },
    { hari: "Selasa", jam: "08.30-10.00", mapel: "Kimia", guru: "Bu Maya Putri", ruang: "Lab IPA" },
    { hari: "Selasa", jam: "10.30-12.00", mapel: "PJOK", guru: "Pak Joko Prasetyo", ruang: "Lapangan" },
    { hari: "Rabu", jam: "07.00-08.30", mapel: "Biologi", guru: "Bu Maya Putri", ruang: "Lab IPA" },
    { hari: "Rabu", jam: "08.30-10.00", mapel: "Ekonomi", guru: "Pak Dedi Kurniawan", ruang: "R-01" },
    { hari: "Rabu", jam: "10.30-12.00", mapel: "Informatika", guru: "Pak Budi Santoso", ruang: "Lab-1" },
    { hari: "Kamis", jam: "07.00-08.30", mapel: "Geografi", guru: "Pak Dedi Kurniawan", ruang: "R-01" },
    { hari: "Kamis", jam: "08.30-10.00", mapel: "Sosiologi", guru: "Bu Lina Kusuma", ruang: "R-01" },
    { hari: "Kamis", jam: "10.30-12.00", mapel: "Seni Budaya", guru: "Bu Dewi Anggraini", ruang: "R-Seni" },
    { hari: "Jumat", jam: "07.00-08.00", mapel: "Pendidikan Agama", guru: "Pak Ahmad Hidayat", ruang: "R-01" },
    { hari: "Jumat", jam: "08.00-09.00", mapel: "Matematika", guru: "Pak Andi Wijaya", ruang: "R-01" },
    { hari: "Jumat", jam: "09.30-10.30", mapel: "Informatika", guru: "Pak Budi Santoso", ruang: "Lab-1" }
  ];
}

function dummyMateri() {
  return [
    { judul: "Aljabar Linear Dasar", mapel: "Matematika", guru: "Pak Andi Wijaya", tanggal: "2026-09-10", deskripsi: "Operasi matriks, determinan, dan sistem persamaan linear dua variabel beserta contoh soal." },
    { judul: "Teks Eksposisi", mapel: "Bahasa Indonesia", guru: "Bu Sari Dewi", tanggal: "2026-09-11", deskripsi: "Struktur, ciri kebahasaan, dan langkah menulis teks eksposisi yang baik dan benar." },
    { judul: "Present Continuous Tense", mapel: "Bahasa Inggris", guru: "Bu Rina Marlina", tanggal: "2026-09-12", deskripsi: "Pola kalimat, contoh penggunaan, dan latihan menyusun kalimat present continuous." },
    { judul: "Dasar HTML dan CSS", mapel: "Informatika", guru: "Pak Budi Santoso", tanggal: "2026-09-13", deskripsi: "Struktur dokumen HTML, selector CSS, layout responsif, dan praktik membuat halaman profil." },
    { judul: "Sistem Pencernaan Manusia", mapel: "IPA", guru: "Bu Maya Putri", tanggal: "2026-09-14", deskripsi: "Organ pencernaan, proses kimiawi, enzim, dan gangguan sistem pencernaan." },
    { judul: "Perdagangan Internasional", mapel: "IPS", guru: "Pak Dedi Kurniawan", tanggal: "2026-09-15", deskripsi: "Pengertian ekspor-impor, neraca perdagangan, dan dampak globalisasi ekonomi." },
    { judul: "Tata Cara Salat Wajib", mapel: "Pendidikan Agama", guru: "Pak Ahmad Hidayat", tanggal: "2026-09-16", deskripsi: "Syarat, rukun, dan bacaan salat lima waktu beserta hikmahnya." },
    { judul: "Kebugaran Jasmani", mapel: "PJOK", guru: "Pak Joko Prasetyo", tanggal: "2026-09-17", deskripsi: "Komponen kebugaran, tes daya tahan, dan program latihan sederhana di rumah." },
    { judul: "Statistika Dasar", mapel: "Matematika", guru: "Pak Andi Wijaya", tanggal: "2026-09-18", deskripsi: "Mean, median, modus, dan penyajian data dalam tabel serta diagram." }
  ];
}

/* Daftar tugas dummy siswa dikosongkan: tugas siswa kini murni berasal dari
   edusmart_tasks (input guru) sesuai kelasnya via daftarTugasSiswa(). */
function dummyTugas() {
  return [];
}

function dummyNilai() {
  return [
    { mapel: "Matematika", tugas: 85, uts: 80, uas: 88 },
    { mapel: "Bahasa Indonesia", tugas: 90, uts: 85, uas: 87 },
    { mapel: "Bahasa Inggris", tugas: 78, uts: 82, uas: 80 },
    { mapel: "Informatika", tugas: 95, uts: 90, uas: 93 },
    { mapel: "IPA", tugas: 82, uts: 76, uas: 84 },
    { mapel: "IPS", tugas: 88, uts: 84, uas: 86 },
    { mapel: "Pendidikan Agama", tugas: 92, uts: 88, uas: 90 },
    { mapel: "PJOK", tugas: 90, uts: 85, uas: 92 }
  ];
}

function dummyAbsensi() {
  return [
    { tanggal: "2026-09-01", mapel: "Matematika", guru: "Pak Andi Wijaya", status: "Hadir" },
    { tanggal: "2026-09-02", mapel: "Bahasa Inggris", guru: "Bu Rina Marlina", status: "Hadir" },
    { tanggal: "2026-09-03", mapel: "IPS", guru: "Pak Dedi Kurniawan", status: "Hadir" },
    { tanggal: "2026-09-04", mapel: "Bahasa Inggris", guru: "Bu Rina Marlina", status: "Izin" },
    { tanggal: "2026-09-07", mapel: "Matematika", guru: "Pak Andi Wijaya", status: "Hadir" },
    { tanggal: "2026-09-08", mapel: "IPA", guru: "Bu Maya Putri", status: "Hadir" },
    { tanggal: "2026-09-09", mapel: "Pendidikan Agama", guru: "Pak Ahmad Hidayat", status: "Hadir" },
    { tanggal: "2026-09-10", mapel: "Informatika", guru: "Pak Budi Santoso", status: "Sakit" },
    { tanggal: "2026-09-11", mapel: "IPA", guru: "Bu Maya Putri", status: "Hadir" },
    { tanggal: "2026-09-14", mapel: "Matematika", guru: "Pak Andi Wijaya", status: "Hadir" },
    { tanggal: "2026-09-15", mapel: "Bahasa Indonesia", guru: "Bu Sari Dewi", status: "Hadir" },
    { tanggal: "2026-09-16", mapel: "Bahasa Inggris", guru: "Bu Rina Marlina", status: "Alpa" },
    { tanggal: "2026-09-17", mapel: "Informatika", guru: "Pak Budi Santoso", status: "Hadir" },
    { tanggal: "2026-09-18", mapel: "Matematika", guru: "Pak Andi Wijaya", status: "Hadir" },
    { tanggal: "2026-09-21", mapel: "IPA", guru: "Bu Maya Putri", status: "Hadir" },
    { tanggal: "2026-09-22", mapel: "Bahasa Indonesia", guru: "Bu Sari Dewi", status: "Hadir" }
  ];
}

function dummyPengumuman() {
  return [
    { tanggal: "2026-09-20", isi: "Ujian Tengah Semester dimulai 13 Oktober 2026. Jadwal detail menyusul." },
    { tanggal: "2026-09-18", isi: "Lomba web design tingkat sekolah dibuka. Daftar ke Pak Budi paling lambat 30 September." },
    { tanggal: "2026-09-15", isi: "Senam pagi bersama setiap Jumat pukul 07.00 di lapangan utama." }
  ];
}

/* ---------- Helper pengumpulan & nilai ---------- */
function getSubmissions() {
  try { return JSON.parse(DB.get(SUBMIT_KEY)) || []; }
  catch (e) { return []; }
}

function findSubmission(email, tugasId) {
  var list = getSubmissions();
  for (var i = 0; i < list.length; i++) {
    if (list[i].email === email && (list[i].taskId === tugasId || list[i].tugasId === tugasId)) return list[i];
  }
  return null;
}

function tugasStatus(t, email) {
  if (findSubmission(email, t.id)) return "Sudah Dikumpulkan";
  // Terhubung juga lewat judul (tugas guru vs tugas dummy yang sama).
  var subs = getSubmissions();
  for (var i = 0; i < subs.length; i++) {
    if (subs[i].email === email && subs[i].namaTugas === t.nama) return "Sudah Dikumpulkan";
  }
  var today = new Date(); today.setHours(0, 0, 0, 0);
  if (new Date(t.deadline + "T00:00:00") < today) return "Terlambat";
  return "Belum Dikerjakan";
}

/* Daftar materi siswa: HANYA materi guru untuk classId siswa tersebut.
   Jika belum ada: kembalikan [] ("Belum ada materi pembelajaran."). */
function daftarMateri(email) {
  try {
    if (typeof materiSiswaFinal === "function" && email) return materiSiswaFinal(email);
  } catch (e) { /* abaikan */ }
  return [];
}

function daftarJadwal(email) {
  try {
    if (typeof jadwalSiswaFinal === "function" && email) return jadwalSiswaFinal(email);
  } catch (e) { /* abaikan */ }
  return jadwalFinal(email);
}

/* Daftar tugas siswa: HANYA tugas guru (edusmart_tasks) sesuai classId.
   Jika belum ada: kembalikan [] ("Belum ada tugas."). */
function daftarTugasSiswa(email) {
  var semua = [];
  try {
    if (typeof tugasSiswaFinal === "function" && email) {
      semua = semua.concat(tugasSiswaFinal(email));
    }
  } catch (e) { /* abaikan */ }
  return semua;
}
function statusBadgeClass(status) {
  if (status === "Hadir" || status === "Sudah Dikumpulkan") return "b-green";
  if (status === "Alpa" || status === "Terlambat") return "b-red";
  if (status === "Belum Dikerjakan" || status === "Izin") return "b-yellow";
  if (status === "Sakit") return "b-blue";
  return "b-gray";
}

function hitungNilaiAkhir(tugas, uts, uas) {
  return Math.round(tugas * 0.3 + uts * 0.3 + uas * 0.4);
}

function predikat(nilai) {
  if (nilai >= 90) return "A";
  if (nilai >= 80) return "B";
  if (nilai >= 70) return "C";
  return "D";
}

/* Nilai siswa: HANYA dari edusmart_grades (input guru) untuk studentId
   pemilik akun. Kosong bila guru belum menginput nilai. */
function nilaiRowsFinal() {
  var rows = [];
  try {
    if (typeof gradeOverridesByEmail === "function") {
      var sess = getSession();
      var ov = (sess && loginKey(sess)) ? gradeOverridesByEmail(loginKey(sess)) : {};
      Object.keys(ov).forEach(function (nama) {
        rows.push({ mapel: nama, tugas: ov[nama].tugas, uts: ov[nama].uts, uas: ov[nama].uas });
      });
    }
  } catch (e) { /* abaikan */ }
  return rows;
}

/* Absensi siswa: HANYA dari edusmart_attendance (input guru). */
function absensiRowsFinal() {
  var rows = [];
  try {
    if (typeof attendanceByEmail === "function") {
      var sess = getSession();
      if (sess && loginKey(sess)) rows = attendanceByEmail(loginKey(sess));
    }
  } catch (e) { /* abaikan */ }
  return rows;
}

function ringkasanNilai() {
  var rows = nilaiRowsFinal().map(function (r) { return hitungNilaiAkhir(r.tugas, r.uts, r.uas); });
  if (!rows.length) return { rata: "-", max: "-", min: "-" };
  var sum = rows.reduce(function (a, b) { return a + b; }, 0);
  return { rata: Math.round(sum / rows.length), max: Math.max.apply(null, rows), min: Math.min.apply(null, rows) };
}

function ringkasanAbsensi() {
  var rows = absensiRowsFinal();
  var s = { total: rows.length, hadir: 0, izin: 0, sakit: 0, alpa: 0 };
  rows.forEach(function (r) {
    if (r.status === "Hadir") s.hadir++;
    else if (r.status === "Izin") s.izin++;
    else if (r.status === "Sakit") s.sakit++;
    else if (r.status === "Alpa") s.alpa++;
  });
  s.persen = s.total ? Math.round(s.hadir / s.total * 100) : 0;
  return s;
}

function namaHariIni() {
  return ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][new Date().getDay()];
}

/* ---------- Navigasi siswa ---------- */
function bindStudentNav() {
  var toggle = document.getElementById("sideToggle");
  var sidebar = document.getElementById("sidebar");
  if (toggle && sidebar) {
    toggle.addEventListener("click", function () { sidebar.classList.toggle("open"); });
    sidebar.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { sidebar.classList.remove("open"); });
    });
  }
  document.querySelectorAll("#btn-logout").forEach(function (b) {
    b.addEventListener("click", logout);
  });
}

function renderStudentUser(sess) {
  var el = document.getElementById("nav-siswa-nama");
  if (el) el.textContent = "Halo, " + sess.nama;
}

/* ---------- Inisialisasi per halaman ---------- */
function initDashboard(sess) {
  if (!document.getElementById("dash-nama")) return;
  var p = getProfile(sess);
  // Tampilkan identitas dari SINGLE SOURCE (edusmart_students) bila ada.
  try {
    if (typeof resolveStudentByLogin === "function") {
      var rst = resolveStudentByLogin(loginKey(sess));
      if (rst) {
        if (rst.nama) p.nama = rst.nama;
        if (rst.nis) p.nis = rst.nis;
        if (rst.classId && typeof className === "function") p.kelas = className(rst.classId);
      }
    }
  } catch (e) { /* abaikan, pakai profil */ }
  document.getElementById("dash-nama").textContent = p.nama;
  var metaKelas = (p.kelas && p.kelas !== "-") ? "Kelas " + p.kelas : "Kelas belum ditentukan Admin";
  var metaNis = (p.nis && p.nis !== "-") ? " \u2022 NIS " + p.nis : "";
  document.getElementById("dash-meta").textContent = metaKelas + metaNis;
  document.getElementById("dash-avatar").textContent = initials(p.nama);
  var today = document.getElementById("dash-today");
  if (today) today.textContent = "Hari ini: " + namaHariIni() + ", " + new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  var n = ringkasanNilai();
  document.getElementById("stat-nilai").textContent = n.rata;
  var a = ringkasanAbsensi();
  document.getElementById("stat-hadir").textContent = a.persen + "%";
  var tugas = daftarTugasSiswa(loginKey(sess));
  var belum = tugas.filter(function (t) { return tugasStatus(t, loginKey(sess)) !== "Sudah Dikumpulkan"; }).length;
  document.getElementById("stat-tugas").textContent = belum;
  document.getElementById("stat-materi").textContent = daftarMateri(loginKey(sess)).length;

  var pu = document.getElementById("pengumuman-list");
  if (pu) pu.innerHTML = dummyPengumuman().map(function (x) {
    return "<li><strong>" + x.tanggal + "</strong> &mdash; " + x.isi + "</li>";
  }).join("");

  var jh = document.getElementById("jadwal-hari-ini");
  if (jh) {
    var hari = namaHariIni();
    var list = daftarJadwal(loginKey(sess)).filter(function (j) { return j.hari === hari; });
    if (!list.length) {
      jh.innerHTML = "<li class='muted'>Belum ada jadwal.</li>";
    } else {
      jh.innerHTML = list.map(function (j) {
        return "<li><strong>" + j.jam + "</strong> &mdash; " + j.mapel + " (" + j.guru + ", " + j.ruang + ")</li>";
      }).join("");
    }
  }
}

function initProfil(sess) {
  var form = document.getElementById("form-profil");
  if (!form) return;
  var p = getProfile(sess);
  var fields = { nama: "pf-nama", nis: "pf-nis", email: "pf-email", kelas: "pf-kelas", jurusan: "pf-jurusan", jk: "pf-jk", ttl: "pf-ttl", alamat: "pf-alamat", telepon: "pf-telepon" };
  Object.keys(fields).forEach(function (k) { document.getElementById(fields[k]).value = p[k] || ""; });
  document.getElementById("pf-avatar").textContent = initials(p.nama);
  var inputs = form.querySelectorAll("input, select");
  function setDisabled(d) { inputs.forEach(function (i) { if (i.id !== "pf-email") i.disabled = d; }); }
  setDisabled(true);
  document.getElementById("pf-email").disabled = true;
  document.getElementById("btn-edit").addEventListener("click", function () { setDisabled(false); });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = { email: p.email };
    Object.keys(fields).forEach(function (k) {
      if (k !== "email") data[k] = document.getElementById(fields[k]).value.trim();
    });
    if (!data.nama || !data.nis || !data.kelas) {
      showAlert("profil-alert", "Nama, NIS, dan kelas wajib diisi.", "error");
      return;
    }
    saveProfile(sess, data);
    document.getElementById("pf-avatar").textContent = initials(data.nama);
    setDisabled(true);
    showAlert("profil-alert", "Profil berhasil disimpan.", "success");
  });
}

/* Jurusan siswa ("IPA"/"IPS"/""): dibaca dari Profil, fallback nama kelas.
   Jika tidak terdeteksi, kembalikan "" (tampilkan semua). */
function trackSiswa(email) {
  function dariTeks(s) {
    s = (s || "").toLowerCase();
    if (s.indexOf("ips") !== -1) return "IPS";
    if (s.indexOf("ipa") !== -1) return "IPA";
    return "";
  }
  try {
    var prof = JSON.parse(DB.get("edusmart_profile_" + String(email).toLowerCase()));
    var t = prof && dariTeks(prof.jurusan);
    if (t) return t;
  } catch (e) { /* abaikan */ }
  try {
    if (typeof resolveStudentByLogin === "function" && typeof className === "function") {
      var st = resolveStudentByLogin(email);
      if (st) {
        var k = dariTeks(className(st.classId));
        if (k) return k;
      }
    }
  } catch (e) { /* abaikan */ }
  return "";
}

/* Jadwal sesuai jurusan: mapel "Bersama" selalu tampil, mapel IPA/IPS
   mengikuti jurusan siswa (baca track dari edusmart_subjects). */
function jadwalFinal(email) {
  var semua = dummyJadwal().slice();
  var track = trackSiswa(email);
  if (!track) return semua;
  var master = {};
  try {
    if (typeof getList === "function" && typeof SUBJECTS_KEY !== "undefined") {
      getList(SUBJECTS_KEY).forEach(function (s) { master[s.nama] = s.track || "Bersama"; });
    }
  } catch (e) { /* abaikan */ }
  return semua.filter(function (j) {
    var tr = master[j.mapel] || "Bersama";
    return tr === "Bersama" || tr === track;
  });
}

function initJadwal() {
  var tbody = document.getElementById("jadwal-tbody");
  if (!tbody) return;
  var filter = document.getElementById("filter-hari");
  var email = "";
  try { var s0 = getSession(); if (s0) email = loginKey(s0); } catch (e) { /* abaikan */ }
  var infoJ = document.getElementById("jadwal-jurusan-info");
  if (infoJ) {
    var tr0 = trackSiswa(email);
    infoJ.textContent = tr0 ? "Jadwal untuk jurusan: " + tr0 : "Jadwal semua jurusan.";
  }
  function render() {
    var hari = filter ? filter.value : "Semua";
    var rows = daftarJadwal(email).filter(function (j) { return hari === "Semua" || j.hari === hari; });
    tbody.innerHTML = rows.map(function (j) {
      return "<tr><td>" + j.hari + "</td><td>" + j.jam + "</td><td>" + j.mapel + "</td><td>" + j.guru + "</td><td>" + j.ruang + "</td></tr>";
    }).join("") || "<tr><td colspan='5'>Belum ada jadwal pelajaran.</td></tr>";
  }
  if (filter) filter.addEventListener("change", render);
  render();
}

function initMateri() {
  var list = document.getElementById("materi-list");
  if (!list) return;
  var cari = document.getElementById("cari-materi");
  var fmapel = document.getElementById("filter-mapel");
  var emailM = "";
  try { var sM = getSession(); if (sM) emailM = loginKey(sM); } catch (e) { /* abaikan */ }
  var semuaMateri = daftarMateri(emailM);
  if (!semuaMateri.length) {
    list.innerHTML = "<p class='muted'>Belum ada materi pembelajaran.</p>";
    if (fmapel) fmapel.innerHTML = "<option value='Semua'>Semua Mata Pelajaran</option>";
    return;
  }
  var mapels = [];
  semuaMateri.forEach(function (m) { if (mapels.indexOf(m.mapel) === -1) mapels.push(m.mapel); });
  fmapel.innerHTML = "<option value='Semua'>Semua Mata Pelajaran</option>" + mapels.map(function (m) {
    return "<option value='" + m + "'>" + m + "</option>";
  }).join("");
  function render() {
    var q = (cari.value || "").toLowerCase();
    var f = fmapel.value;
    var rows = semuaMateri.filter(function (m) {
      var cocokQ = m.judul.toLowerCase().indexOf(q) !== -1 || m.deskripsi.toLowerCase().indexOf(q) !== -1;
      var cocokF = f === "Semua" || m.mapel === f;
      return cocokQ && cocokF;
    });
    list.innerHTML = rows.map(function (m) {
      return "<div class='card'><span class='tag'>" + m.mapel + "</span><h3>" + m.judul + "</h3>" +
        "<p>" + m.guru + " &bull; " + m.tanggal + "</p><p>" + m.deskripsi + "</p></div>";
    }).join("") || "<p class='muted'>Materi tidak ditemukan.</p>";
  }
  cari.addEventListener("input", render);
  fmapel.addEventListener("change", render);
  render();
}

function initTugas(sess) {
  var list = document.getElementById("tugas-list");
  if (!list) return;
  var filter = document.getElementById("filter-status");
  // Info transparansi: tugas guru disaring sesuai kelas siswa ini.
  var infoEl = document.getElementById("tugas-kelas-info");
  if (infoEl) {
    var namaKelas = "-";
    try {
      if (typeof resolveStudentByLogin === "function") {
        var st = resolveStudentByLogin(loginKey(sess));
        if (st && typeof className === "function") namaKelas = className(st.classId);
      }
    } catch (e) { /* abaikan */ }
    infoEl.textContent = "Menampilkan tugas untuk kelas: " + namaKelas;
  }
  function render() {
    var f = filter ? filter.value : "Semua";
    var semua = daftarTugasSiswa(loginKey(sess));
    if (!semua.length) {
      list.innerHTML = "<p class='muted'>Belum ada tugas.</p>";
      return;
    }
    var rows = semua.map(function (t) { return { t: t, s: tugasStatus(t, loginKey(sess)) }; })
      .filter(function (x) { return f === "Semua" || x.s === f; });
    list.innerHTML = rows.map(function (x) {
      return "<div class='card'><span class='badge " + statusBadgeClass(x.s) + "'>" + x.s + "</span>" +
        "<h3 style='margin-top:0.4rem'>" + x.t.nama + "</h3>" +
        "<p>" + x.t.mapel + " &bull; " + x.t.guru + "</p>" +
        "<p>Diberikan: " + x.t.diberikan + " &bull; Deadline: <strong>" + x.t.deadline + "</strong></p>" +
        "<p style='margin-top:0.6rem'><a class='btn btn-dark' style='width:auto;display:inline-block' href='pengumpulan-tugas.html?id=" + x.t.id + "'>Kerjakan / Kumpulkan</a></p></div>";
    }).join("") || "<p class='muted'>Tidak ada tugas pada filter ini.</p>";
  }
  if (filter) filter.addEventListener("change", render);
  render();
}

function initPengumpulan(sess) {
  var form = document.getElementById("form-kumpul");
  if (!form) return;
  var sel = document.getElementById("kumpul-tugas");
  var info = document.getElementById("kumpul-info");
  var params = new URLSearchParams(window.location.search);
  var preselect = params.get("id");
  var semuaTugas = daftarTugasSiswa(loginKey(sess));
  sel.innerHTML = semuaTugas.map(function (t) {
    return "<option value='" + t.id + "'>" + t.nama + " (" + t.mapel + ")</option>";
  }).join("");
  if (!semuaTugas.length) form.hidden = true; // tidak ada tugas: sembunyikan form
  function tugasById(id) {
    for (var i = 0; i < semuaTugas.length; i++) if (semuaTugas[i].id === id) return semuaTugas[i];
    return semuaTugas[0];
  }
  function renderInfo() {
    var t = tugasById(sel.value);
    if (!t) {
      info.innerHTML = "<p class='muted'>Belum ada tugas yang tersedia.</p>";
      return;
    }
    info.innerHTML = "<span class='tag'>" + t.mapel + "</span><h3>" + t.nama + "</h3>" +
      "<p><strong>Guru:</strong> " + t.guru + " &bull; <strong>Deadline:</strong> " + t.deadline + "</p>" +
      "<p><strong>Instruksi:</strong> " + t.instruksi + "</p>" +
      "<p><strong>Status:</strong> <span class='badge " + statusBadgeClass(tugasStatus(t, loginKey(sess))) + "'>" + tugasStatus(t, loginKey(sess)) + "</span></p>";
  }
  function renderRiwayat() {
    var mine = getSubmissions().filter(function (s) { return s.email === loginKey(sess); });
    var box = document.getElementById("riwayat-list");
    if (!box) return;
    box.innerHTML = mine.length ? mine.map(function (s) {
      return "<li><strong>" + s.namaTugas + "</strong> (" + s.mapel + ") &mdash; file: " + s.namaFile + " &mdash; " + new Date(s.waktu).toLocaleString("id-ID") + "</li>";
    }).join("") : "<li class='muted'>Belum ada tugas yang dikumpulkan.</li>";
  }
  if (preselect) sel.value = preselect;
  sel.addEventListener("change", renderInfo);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var t = tugasById(sel.value);
    if (!t) {
      showAlert("kumpul-alert", "Belum ada tugas yang tersedia.", "error");
      return;
    }
    var jawaban = document.getElementById("kumpul-jawaban").value.trim();
    var namaFile = document.getElementById("kumpul-file").value.trim();
    if (!jawaban || !namaFile) {
      showAlert("kumpul-alert", "Jawaban dan nama file wajib diisi.", "error");
      return;
    }
    var waktuKumpul = new Date().toISOString();
    // Relasi ID: cari studentId pemilik akun ini (bila modul guru dimuat).
    var studentId = "";
    try {
      if (typeof resolveStudentByLogin === "function") {
        var pemilik = resolveStudentByLogin(loginKey(sess));
        if (pemilik) studentId = pemilik.studentId;
      }
    } catch (e) { /* abaikan */ }
    var list = getSubmissions().filter(function (s) {
      return !(s.email === loginKey(sess) && (s.taskId === t.id || s.tugasId === t.id));
    });
    // Superset: field baru (ID-based) + field lama (kompatibel tampilan lama).
    list.push({ submissionId: "SUBM-" + Date.now().toString(36), taskId: t.id, studentId: studentId,
      email: loginKey(sess), tugasId: t.id, namaTugas: t.nama, mapel: t.mapel,
      jawaban: jawaban, answer: jawaban, namaFile: namaFile, fileName: namaFile,
      waktu: waktuKumpul, submittedAt: waktuKumpul, status: "Terkumpul" });
    DB.set(SUBMIT_KEY, JSON.stringify(list));
    showAlert("kumpul-alert", "Tugas berhasil dikumpulkan.", "success");
    form.reset();
    sel.value = t.id;
    renderInfo();
    renderRiwayat();
  });
  renderInfo();
  renderRiwayat();
}

function initNilai() {
  var tbody = document.getElementById("nilai-tbody");
  if (!tbody) return;
  var rows = nilaiRowsFinal();
  if (!rows.length) {
    tbody.innerHTML = "<tr><td colspan='6'>Belum ada nilai. Nilai muncul setelah guru menginput penilaian.</td></tr>";
    document.getElementById("ring-rata").textContent = "-";
    document.getElementById("ring-max").textContent = "-";
    document.getElementById("ring-min").textContent = "-";
    return;
  }
  tbody.innerHTML = rows.map(function (r) {
    var akhir = hitungNilaiAkhir(r.tugas, r.uts, r.uas);
    return "<tr><td>" + r.mapel + "</td><td>" + r.tugas + "</td><td>" + r.uts + "</td><td>" + r.uas + "</td><td><strong>" + akhir + "</strong></td><td><span class='badge " + (akhir >= 80 ? "b-green" : akhir >= 70 ? "b-blue" : "b-red") + "'>" + predikat(akhir) + "</span></td></tr>";
  }).join("");
  var n = ringkasanNilai();
  document.getElementById("ring-rata").textContent = n.rata;
  document.getElementById("ring-max").textContent = n.max;
  document.getElementById("ring-min").textContent = n.min;
}

function initAbsensi(sess) {
  var tbody = document.getElementById("absensi-tbody");
  if (!tbody) return;
  var p = getProfile(sess);
  document.getElementById("ab-nama").textContent = p.nama;
  var abKelas = (p.kelas && p.kelas !== "-") ? "Kelas " + p.kelas : "Kelas belum ditentukan Admin";
  var abNis = (p.nis && p.nis !== "-") ? " \u2022 NIS " + p.nis : "";
  document.getElementById("ab-kelas").textContent = abKelas + abNis;
  var s = ringkasanAbsensi();
  document.getElementById("ab-total").textContent = s.total ? (s.total + " hari") : "Belum ada data absensi";
  document.getElementById("ab-hadir").textContent = s.hadir;
  document.getElementById("ab-izin").textContent = s.izin;
  document.getElementById("ab-sakit").textContent = s.sakit;
  document.getElementById("ab-alpa").textContent = s.alpa;
  document.getElementById("ab-persen").textContent = s.total ? (s.persen + "%") : "-";
  var absRows = absensiRowsFinal();
  tbody.innerHTML = absRows.length ? absRows.map(function (r) {
    return "<tr><td>" + r.tanggal + "</td><td>" + r.guru + "</td><td><span class='badge " + statusBadgeClass(r.status) + "'>" + r.status + "</span></td></tr>";
  }).join("") : "<tr><td colspan='3'>Belum ada data absensi.</td></tr>";
}

/* ---------- Raport digital siswa (format Rapor Kurikulum Merdeka) ---------- */
/* Hanya raport milik sendiri (studentId login) dengan status Dibagikan. */

/* Amankan teks (main.js tidak memakai esc() guru.js). */
function escRaport(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* Deskripsi capaian per mapel ala Kurikulum Merdeka dari nilai akhir. */
function deskripsiCapaian(mapel, akhir) {
  if (akhir >= 90) return "Menunjukkan penguasaan sangat baik dalam " + mapel + " dan mampu menerapkan konsep secara mandiri.";
  if (akhir >= 80) return "Menunjukkan penguasaan baik dalam " + mapel + ".";
  if (akhir >= 70) return "Cukup baik dalam " + mapel + ", perlu peningkatan konsistensi belajar.";
  return "Perlu bimbingan dan peningkatan dalam memahami " + mapel + ".";
}

/* Satu kartu rapor (fungsi murni dari data -> HTML, tanpa akses DOM). */
function raportMerdekaHTML(r) {
  var nilaiRows = (r.nilai || []).map(function (n, i) {
    return "<tr><td>" + (i + 1) + "</td><td>" + escRaport(n.mapel) + "</td>" +
      "<td><strong>" + n.akhir + "</strong></td><td>" + predikat(n.akhir) + "</td>" +
      "<td>" + escRaport(deskripsiCapaian(n.mapel, n.akhir)) + "</td></tr>";
  }).join("") || "<tr><td colspan='5'>Belum ada nilai.</td></tr>";
  var nilaiRata = (r.nilai || []).length
    ? Math.round((r.nilai || []).map(function (n) { return n.akhir; }).reduce(function (a, b) { return a + b; }, 0) / r.nilai.length)
    : "-";
  var abs = r.absensi || { hadir: 0, izin: 0, sakit: 0, alpa: 0, total: 0 };
  var catatan = "<p>" + escRaport(r.catatanWali || "-") + "</p>" +
    (r.perkembangan ? "<p><strong>Perkembangan:</strong> " + escRaport(r.perkembangan) + "</p>" : "") +
    (r.sikap ? "<p><strong>Sikap:</strong> " + escRaport(r.sikap) + "</p>" : "") +
    (r.catatanTambahan ? "<p><strong>Catatan Tambahan:</strong> " + escRaport(r.catatanTambahan) + "</p>" : "");
  return "<article class='card raport'>" +
    "<p class='no-print' style='text-align:right;margin-bottom:0.6rem'><button type='button' class='btn-small btn-dark' data-cetak>Cetak Rapor</button></p>" +
    "<div class='raport-kop'><h3>RAPOR PESERTA DIDIK</h3><p>Kurikulum Merdeka &bull; EduSmart</p></div>" +
    "<table class='raport-id'><tbody>" +
    "<tr><td>Nama Peserta Didik</td><td>: <strong>" + escRaport(r.namaSiswa) + "</strong></td></tr>" +
    "<tr><td>NIS / NISN</td><td>: " + escRaport(r.nis || "-") + "</td></tr>" +
    "<tr><td>Kelas</td><td>: " + escRaport(r.namaKelas) + "</td></tr>" +
    "<tr><td>Semester</td><td>: " + escRaport(r.semester) + "</td></tr>" +
    "<tr><td>Tahun Ajaran</td><td>: " + escRaport(r.tahunAjaran) + "</td></tr>" +
    "</tbody></table>" +
    "<h4>A. Nilai Hasil Belajar (rata-rata: " + nilaiRata + ")</h4>" +
    "<div class='table-wrap'><table class='table'><thead><tr><th>No</th><th>Mata Pelajaran</th><th>Nilai Akhir</th><th>Predikat</th><th>Deskripsi</th></tr></thead><tbody>" + nilaiRows + "</tbody></table></div>" +
    "<h4>B. Ketidakhadiran</h4>" +
    "<div class='table-wrap'><table class='table'><thead><tr><th>Keterangan</th><th>Jumlah</th></tr></thead><tbody>" +
    "<tr><td>Sakit</td><td>" + abs.sakit + " hari</td></tr>" +
    "<tr><td>Izin</td><td>" + abs.izin + " hari</td></tr>" +
    "<tr><td>Tanpa Keterangan (Alpa)</td><td>" + abs.alpa + " hari</td></tr>" +
    "</tbody></table></div>" +
    "<h4>C. Catatan Wali Kelas</h4>" + catatan +
    "<div class='raport-ttd'><div><p>Mengetahui,<br>Orang Tua/Wali</p><br><br><p>( ............................ )</p></div>" +
    "<div><p>Wali Kelas</p><br><br><p><strong><u>" + escRaport(r.namaWali) + "</u></strong></p></div></div>" +
    "</article>";
}

function initRaportSiswa(sess) {
  var box = document.getElementById("raport-list");
  if (!box) return;
  var daftar = [];
  try {
    if (typeof raportDibagikanUntuk === "function" && sess && loginKey(sess)) {
      daftar = raportDibagikanUntuk(loginKey(sess));
    }
  } catch (e) { daftar = []; }
  if (!daftar.length) {
    box.innerHTML = "<p class='muted'>Belum ada raport yang dibagikan untuk Anda.</p>";
    return;
  }
  box.innerHTML = daftar.map(raportMerdekaHTML).join("");
  /* Tombol cetak per rapor (delegasi, tanpa inline JavaScript). */
  box.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest ? e.target.closest("[data-cetak]") : null;
    if (btn) window.print();
  });
}
/* Fallback rapi jika file foto tidak ditemukan: sembunyikan img rusak,
   tampilkan inisial di belakangnya. Tanpa inline JavaScript. */
function bindImageFallbacks() {
  document.querySelectorAll("img[data-photo-fallback]").forEach(function (img) {
    function hide() { img.style.display = "none"; }
    if (img.complete && img.naturalWidth === 0) hide();
    img.addEventListener("error", hide);
  });
}

/* Baca file gambar dari <input type="file">, perkecil lewat canvas supaya
   hemat tempat di LocalStorage/SQLite, lalu serahkan data URL-nya ke callback.
   Dipakai bersama oleh upload foto tim pengembang dan upload foto galeri. */
function kecilkanFoto(file, maksPx, selesai) {
  if (!file || file.type.indexOf("image/") !== 0) {
    selesai(null, "File harus berupa gambar.");
    return;
  }
  var reader = new FileReader();
  reader.onerror = function () { selesai(null, "File gambar tidak dapat dibaca."); };
  reader.onload = function () {
    var img = new Image();
    img.onerror = function () { selesai(null, "File gambar tidak dapat dibaca."); };
    img.onload = function () {
      try {
        var skala = Math.min(1, maksPx / Math.max(img.width, img.height));
        var w = Math.max(1, Math.round(img.width * skala));
        var h = Math.max(1, Math.round(img.height * skala));
        var canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        selesai(canvas.toDataURL("image/jpeg", 0.85), null);
      } catch (e) {
        selesai(null, "Gagal memproses gambar.");
      }
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

/* Upload foto tim pengembang: file diperkecil (maks 500px, JPEG),
   lalu disimpan ke basis data. */
var TEAM_PHOTOS_KEY = "edusmart_team_photos";
var TEAM_PHOTO_MAX = 500;

function getTeamPhotos() {
  try { return JSON.parse(DB.get(TEAM_PHOTOS_KEY)) || {}; }
  catch (e) { return {}; }
}

function applyTeamPhotos() {
  var saved = getTeamPhotos();
  document.querySelectorAll("img[data-team-photo]").forEach(function (img) {
    var key = img.getAttribute("data-team-photo");
    if (saved[key]) { img.style.display = ""; img.src = saved[key]; }
  });
}

function bindTeamUploads() {
  document.querySelectorAll("input[data-team-upload]").forEach(function (input) {
    input.addEventListener("change", function () {
      var key = input.getAttribute("data-team-upload");
      var note = document.getElementById("note-" + key);
      function pesan(msg, ok) {
        if (!note) return;
        note.textContent = msg;
        note.style.color = ok ? "#16a34a" : "#dc2626";
      }
      kecilkanFoto(input.files && input.files[0], TEAM_PHOTO_MAX, function (dataUrl, galat) {
        input.value = "";
        if (galat) { pesan(galat, false); return; }
        try {
          var saved = getTeamPhotos();
          saved[key] = dataUrl;
          DB.set(TEAM_PHOTOS_KEY, JSON.stringify(saved));
          var target = document.querySelector("img[data-team-photo='" + key + "']");
          if (target) { target.style.display = ""; target.src = dataUrl; }
          pesan("Foto berhasil diperbarui.", true);
        } catch (e) {
          pesan("Gagal menyimpan foto (penyimpanan penuh?).", false);
        }
      });
    });
  });
}

/* ---------- Galeri sekolah ---------- */
var GALERI_LABEL = {
  gedung: "Gedung Sekolah",
  kepala: "Kepala Sekolah",
  wakil: "Wakil Kepala Sekolah",
  ekstra: "Ekstrakurikuler",
  lomba: "Lomba"
};

/* Fotoimu (kepala sekolah & wakil) bisa diunggah dari halaman galeri.
   Disimpan di basis data dengan kunci "kartu -> data URL", dan file bawaan
   di folder images/galeri/ tetap dipakai sebagai cadangan. */
var GALERI_UPLOAD_KEY = "edusmart_galeri_photos";
var GALERI_UPLOAD_MAKS = 800;

function dummyGaleri() {
  return [
    { file: "images/galeri/gedung/gedung-sekolah.jpg", judul: "Gedung Sekolah Tampak Depan", kategori: "gedung", deskripsi: "Gerbang dan tampak depan gedung utama EduSmart yang modern dan asri." },
    { file: "images/galeri/gedung/lingkungan-sekolah.jpg", judul: "Lingkungan Sekolah", kategori: "gedung", deskripsi: "Taman dan area hijau yang nyaman untuk belajar dan beristirahat." },
    { file: "images/galeri/gedung/ruang-kelas.jpg", judul: "Ruang Kelas", kategori: "gedung", deskripsi: "Ruang kelas bersih dengan papan tulis, proyektor, dan meja belajar ergonomis." },
    { file: "images/galeri/kepala-sekolah/kepala-sekolah.jpg", judul: "Kepala Sekolah", kategori: "kepala", deskripsi: "Foto resmi Kepala Sekolah EduSmart." },
    { file: "images/galeri/kepala-sekolah/kepala-sekolah-kegiatan.jpg", judul: "Kepala Sekolah saat Upacara", kategori: "kepala", deskripsi: "Kepala sekolah memberikan amanat pada upacara bendera Senin pagi." },
    { file: "images/galeri/wakil-kepala-sekolah/wakil-kepala-sekolah.jpg", judul: "Wakil Kepala Sekolah", kategori: "wakil", deskripsi: "Foto resmi Wakil Kepala Sekolah bidang kurikulum." },
    { file: "images/galeri/wakil-kepala-sekolah/wakil-kepala-sekolah-kegiatan.jpg", judul: "Wakil Kepala Sekolah saat Rapat", kategori: "wakil", deskripsi: "Wakil kepala sekolah memimpin rapat koordinasi dewan guru." },
    { file: "images/galeri/ekstrakurikuler/pramuka.jpg", judul: "Pramuka", kategori: "ekstra", deskripsi: "Latihan baris-berbaris dan tali-temali ekstrakurikuler Pramuka." },
    { file: "images/galeri/ekstrakurikuler/olahraga.jpg", judul: "Olahraga", kategori: "ekstra", deskripsi: "Latihan futsal sore hari di lapangan utama sekolah." },
    { file: "images/galeri/ekstrakurikuler/seni.jpg", judul: "Seni", kategori: "ekstra", deskripsi: "Pentas seni musik dan tari tradisional oleh siswa." },
    { file: "images/galeri/ekstrakurikuler/robotik.jpg", judul: "Robotik", kategori: "ekstra", deskripsi: "Klub robotik merakit dan memprogram robot sederhana." },
    { file: "images/galeri/lomba/lomba-akademik.jpg", judul: "Lomba Akademik", kategori: "lomba", deskripsi: "Final olimpiade matematika tingkat kabupaten di aula sekolah." },
    { file: "images/galeri/lomba/lomba-olahraga.jpg", judul: "Lomba Olahraga", kategori: "lomba", deskripsi: "Tim basket sekolah bertanding pada turnamen antar-SMA." },
    { file: "images/galeri/lomba/lomba-seni.jpg", judul: "Lomba Seni", kategori: "lomba", deskripsi: "Penampilan tari kontemporer pada festival seni pelajar." },
    { file: "images/galeri/lomba/penerimaan-penghargaan.jpg", judul: "Penerimaan Penghargaan", kategori: "lomba", deskripsi: "Siswa berprestasi menerima piala dan piagam penghargaan." }
  ];
}

/* Hanya admin yang boleh mengganti foto di galeri. Siswa, guru, dan
   pengunjung tanpa login tetap melihat galeri, hanya tanpa tombol upload.
   Semua kategori bisa diganti, bukan hanya foto kepsek.
   CATATAN: ini penjaga di sisi browser. Keterangan "Tahap 1" di footer
   masih berlaku - endpoint /api/data belum diautentikasi, jadi ini
   menutup jalan biasa, bukan pengaman penuh. */
function bolehUploadGaleri() {
  var sess = getSession();
  return !!(sess && sess.role === "admin");
}

function initGaleri() {
  var list = document.getElementById("galeri-list");
  if (!list) return;
  var cari = document.getElementById("cari-galeri");
  var box = document.getElementById("lightbox");
  var aktif = "semua";
  var bolehUpload = bolehUploadGaleri();

  /* Petunjuk upload hanya relevan untuk admin. Untuk pengunjung/siswa/guru,
     jangan dihilangkan diam-diam - beri tahu bahwa perlu login admin. */
  if (!bolehUpload) {
    var hint = document.getElementById("galeri-hint");
    if (hint) {
      hint.innerHTML = "Tombol <strong>Ganti Foto</strong> hanya tersedia untuk <strong>admin</strong>. " +
        "<a href=\"login.html\">Login sebagai admin</a> untuk mengganti foto galeri.";
    }
  }

  /* Kunci unik tiap kartu, diambil dari nama file:
     images/galeri/kepala-sekolah/kepala-sekolah.jpg -> "kepala-sekolah-kepala-sekolah" */
  function kunciGaleri(g) {
    return g.file.replace(/^images\/galeri\//, "").replace(/\//g, "-").replace(/\.[^.]+$/, "");
  }
  function getFotoGaleri() {
    try { return JSON.parse(DB.get(GALERI_UPLOAD_KEY)) || {}; }
    catch (e) { return {}; }
  }
  /* Foto yang tampil: hasil upload kalau ada, kalau tidak file bawaan. */
  function fotoGaleri(g, photos) {
    return (photos || getFotoGaleri())[kunciGaleri(g)] || g.file;
  }
  function setCatatan(kunci, msg, ok) {
    var note = document.getElementById("galeri-note-" + kunci);
    if (!note) return;
    note.textContent = msg;
    note.style.color = ok ? "#16a34a" : "#dc2626";
  }

  function render() {
    var q = (cari.value || "").toLowerCase();
    var rows = dummyGaleri().map(function (g, i) { return { g: g, i: i }; }).filter(function (x) {
      var okF = aktif === "semua" || x.g.kategori === aktif;
      var okQ = x.g.judul.toLowerCase().indexOf(q) !== -1 || x.g.deskripsi.toLowerCase().indexOf(q) !== -1;
      return okF && okQ;
    });
    var photos = getFotoGaleri();
    list.innerHTML = rows.map(function (x) {
      var g = x.g;
      var kunci = kunciGaleri(g);
      var diunggah = !!photos[kunci];
      /* Semua kategori bisa diganti fotonya, tapi hanya oleh admin. */
      var aksi = "";
      if (bolehUpload) {
        aksi = "<p class='g-aksi'>" +
          "<label class='btn-upload'>Ganti Foto<input type='file' data-galeri-upload='" + kunci + "' accept='image/*' hidden></label>" +
          "<button type='button' class='btn-reset' data-galeri-reset='" + kunci + "'" + (diunggah ? "" : " hidden") + ">Kembalikan</button>" +
          "</p><p class='upload-note' id='galeri-note-" + kunci + "'></p>";
      }
      return "<div class='card g-card'><button class='g-img-btn' data-galeri-idx='" + x.i + "' aria-label='Lihat " + g.judul + "'>" +
        "<img src='" + fotoGaleri(g, photos) + "' alt='" + g.judul + "' loading='lazy' data-photo-fallback></button>" +
        "<span class='tag'>" + GALERI_LABEL[g.kategori] + "</span><h3>" + g.judul + "</h3><p>" + g.deskripsi + "</p>" +
        aksi + "</div>";
    }).join("") || "<p class='muted'>Galeri tidak ditemukan.</p>";
  }
  document.querySelectorAll("[data-galeri-filter]").forEach(function (b) {
    b.addEventListener("click", function () {
      aktif = b.getAttribute("data-galeri-filter");
      document.querySelectorAll("[data-galeri-filter]").forEach(function (x) { x.classList.toggle("active", x === b); });
      render();
    });
  });
  cari.addEventListener("input", render);
  function tutup() { box.classList.remove("open"); }

  /* Upload foto: input dibuat ulang setiap render, jadi didengarkan lewat
     delegasi di elemen daftar, bukan satu listener per input. */
  list.addEventListener("change", function (e) {
    var input = e.target.closest ? e.target.closest("input[data-galeri-upload]") : null;
    if (!input) return;
    if (!bolehUpload) return;
    var kunci = input.getAttribute("data-galeri-upload");
    kecilkanFoto(input.files && input.files[0], GALERI_UPLOAD_MAKS, function (dataUrl, galat) {
      var pesan = galat;
      if (!galat) {
        try {
          var photos = getFotoGaleri();
          photos[kunci] = dataUrl;
          DB.set(GALERI_UPLOAD_KEY, JSON.stringify(photos));
          pesan = "Foto berhasil diperbarui.";
        } catch (err) {
          pesan = "Gagal menyimpan foto (penyimpanan penuh?).";
        }
      }
      render();
      setCatatan(kunci, pesan, !galat);
    });
  });

  list.addEventListener("click", function (e) {
    var kembali = e.target.closest ? e.target.closest("[data-galeri-reset]") : null;
    if (kembali) {
      if (!bolehUpload) return;
      var kunciReset = kembali.getAttribute("data-galeri-reset");
      var photos = getFotoGaleri();
      if (photos[kunciReset]) {
        delete photos[kunciReset];
        DB.set(GALERI_UPLOAD_KEY, JSON.stringify(photos));
      }
      render();
      setCatatan(kunciReset, "Foto dikembalikan ke foto bawaan.", true);
      return;
    }
    var btn = e.target.closest ? e.target.closest("[data-galeri-idx]") : null;
    if (!btn) return;
    var g = dummyGaleri()[parseInt(btn.getAttribute("data-galeri-idx"), 10)];
    var big = document.getElementById("lightbox-img");
    big.src = fotoGaleri(g);
    big.alt = g.judul;
    document.getElementById("lightbox-judul").textContent = g.judul;
    document.getElementById("lightbox-deskripsi").textContent = g.deskripsi;
    box.classList.add("open");
  });
  document.getElementById("lightbox-close").addEventListener("click", tutup);
  box.addEventListener("click", function (e) { if (e.target === box) tutup(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") tutup(); });
  render();
}

/* ---------- Detail program (halaman program.html, bisa diklik) ---------- */
var PROGRAMS = [
  { id: "reguler", tag: "Reguler", nama: "Kelas Reguler",
    deskripsi: "Pembelajaran tatap muka terjadwal setiap hari dengan kurikulum nasional. Cocok untuk semua jenjang yang ingin belajar terstruktur bersama guru dan teman sekelas.",
    kriteria: ["Terdaftar sebagai siswa EduSmart", "Mengikuti jadwal tatap muka sesuai kelas", "Mengerjakan tugas dan ulangan terjadwal"],
    foto: [
      { file: "images/galeri/gedung/ruang-kelas.jpg", judul: "Ruang Kelas" },
      { file: "images/galeri/gedung/gedung-sekolah.jpg", judul: "Gedung Sekolah" },
      { file: "images/galeri/gedung/lingkungan-sekolah.jpg", judul: "Lingkungan Sekolah" }
    ] },
  { id: "unggulan", tag: "Unggulan", nama: "Kelas Unggulan",
    deskripsi: "Pendalaman materi di luar jam reguler untuk persiapan olimpiade, lomba akademik, dan ujian masuk perguruan tinggi. Dibimbing guru terbaik per bidang.",
    kriteria: ["Nilai rata-rata minimal 80", "Lolos seleksi tes masuk kelas unggulan", "Berkomitmen mengikuti pembinaan tambahan"],
    foto: [
      { file: "images/galeri/lomba/lomba-akademik.jpg", judul: "Lomba Akademik" },
      { file: "images/galeri/lomba/penerimaan-penghargaan.jpg", judul: "Penerimaan Penghargaan" },
      { file: "images/galeri/gedung/ruang-kelas.jpg", judul: "Ruang Pembinaan" }
    ] },
  { id: "daring", tag: "Online", nama: "Kelas Daring",
    deskripsi: "Belajar fleksibel dari mana saja: materi video, kuis interaktif, dan diskusi online bersama guru. Nilai dan tugas tercatat sama seperti kelas reguler.",
    kriteria: ["Memiliki perangkat dan koneksi internet", "Akun siswa EduSmart yang aktif", "Mengumpulkan tugas daring tepat waktu"],
    foto: [
      { file: "images/galeri/ekstrakurikuler/robotik.jpg", judul: "Belajar Berbasis Komputer" },
      { file: "images/galeri/gedung/ruang-kelas.jpg", judul: "Kelas Pendukung" }
    ] },
  { id: "bahasa", tag: "Bahasa", nama: "Kursus Bahasa",
    deskripsi: "Kursus Bahasa Inggris, Arab, dan Jepang dari level dasar hingga mahir: percakapan, tata bahasa, dan persiapan sertifikasi.",
    kriteria: ["Terbuka untuk semua siswa", "Penempatan level lewat tes awal", "Hadir minimal 75% pertemuan"],
    foto: [
      { file: "images/galeri/ekstrakurikuler/seni.jpg", judul: "Kegiatan Bahasa & Seni" },
      { file: "images/galeri/lomba/lomba-seni.jpg", judul: "Pentas Bahasa" }
    ] },
  { id: "it", tag: "Keterampilan", nama: "Pelatihan IT",
    deskripsi: "Keterampilan digital praktis: dasar komputer, desain, dan pemrograman web (HTML/CSS/JS) dengan proyek nyata di akhir pelatihan.",
    kriteria: ["Minat di bidang komputer (tanpa pengalaman pun boleh)", "Mengikuti praktik di laboratorium komputer", "Menyelesaikan proyek akhir"],
    foto: [
      { file: "images/galeri/ekstrakurikuler/robotik.jpg", judul: "Praktik Komputer & Robotik" },
      { file: "images/galeri/gedung/ruang-kelas.jpg", judul: "Ruang Praktik" }
    ] },
  { id: "beasiswa", tag: "Beasiswa", nama: "Beasiswa Prestasi",
    deskripsi: "Potongan biaya pendidikan bagi siswa berprestasi akademik maupun non-akademik (olahraga, seni, olimpiade). Dibuka setiap awal tahun ajaran.",
    kriteria: ["Nilai rata-rata minimal 85 (akademik) atau juara lomba (non-akademik)", "Berkelakuan baik dan aktif berorganisasi", "Lolos seleksi berkas dan wawancara"],
    foto: [
      { file: "images/galeri/lomba/penerimaan-penghargaan.jpg", judul: "Penerimaan Penghargaan" },
      { file: "images/galeri/lomba/lomba-akademik.jpg", judul: "Lomba Akademik" },
      { file: "images/galeri/lomba/lomba-olahraga.jpg", judul: "Lomba Olahraga" }
    ] }
];

function programById(id) {
  for (var i = 0; i < PROGRAMS.length; i++) if (PROGRAMS[i].id === id) return PROGRAMS[i];
  return null;
}

function initProgram() {
  var box = document.getElementById("program-detail");
  if (!box) return;
  function tutup() { box.hidden = true; box.innerHTML = ""; }
  function buka(id) {
    var p = programById(id);
    if (!p) return;
    box.innerHTML = "<div class='card'>" +
      "<span class='tag'>" + p.tag + "</span><h3>" + p.nama + "</h3><p>" + p.deskripsi + "</p>" +
      "<h4 style='margin-top:0.9rem'>Kriteria Peserta</h4><ul class='list-plain'>" +
      p.kriteria.map(function (k) { return "<li>&check; " + k + "</li>"; }).join("") + "</ul>" +
      "<h4 style='margin-top:0.9rem'>Suasana Program</h4>" +
      "<div class='gallery-grid'>" + p.foto.map(function (f) {
        return "<div class='card g-card'><img src='" + f.file + "' alt='" + f.judul + "' loading='lazy' data-photo-fallback><h3>" + f.judul + "</h3></div>";
      }).join("") + "</div>" +
      "<div class='toolbar' style='margin-top:1rem'><a class='btn btn-dark btn-auto' href='login.html'>Daftar / Login</a>" +
      "<a class='btn btn-secondary' style='color:#1e293b;border-color:#cbd5e1' href='kontak.html'>Tanya via Kontak</a>" +
      "<button type='button' class='btn btn-secondary' style='color:#1e293b;border-color:#cbd5e1' data-program-tutup>Tutup Detail</button></div>" +
      "</div>";
    box.hidden = false;
    bindImageFallbacks();
    if (box.scrollIntoView) box.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  document.addEventListener("click", function (e) {
    var lihat = e.target && e.target.closest ? e.target.closest("[data-program-lihat]") : null;
    if (lihat) { buka(lihat.getAttribute("data-program-lihat")); return; }
    var kartu = e.target && e.target.closest ? e.target.closest("[data-program-card]") : null;
    if (kartu && box) { buka(kartu.getAttribute("data-program-card")); return; }
    var tutupBtn = e.target && e.target.closest ? e.target.closest("[data-program-tutup]") : null;
    if (tutupBtn) tutup();
  });
  /* Deep link: program.html?program=beasiswa langsung membuka detailnya. */
  try {
    var q = new URLSearchParams(window.location.search).get("program");
    if (q && programById(q)) buka(q);
  } catch (e) { /* abaikan */ }
}

/* ---------- Kegiatan: OSIS, Ekskul, Lomba (diinput via Dashboard Admin) ---------- */
var OSIS_KEY = "edusmart_osis";
var EKSKUL_KEY = "edusmart_ekskul";
var LOMBA_KEY = "edusmart_lomba";
var OSIS_DEFAULT = {
  ketua: "Ketua OSIS EduSmart",
  periode: "2026/2027",
  visi: "Menjadikan OSIS sebagai wadah aspirasi, kreativitas, dan kepemimpinan siswa.",
  foto: "",
  proker: ["MPLS siswa baru", "Peringatan HUT sekolah", "Bakti sosial", "Lomba antar kelas"]
};

/* Default 8 ekskul (dipakai bila Admin belum menginput). */
var EKSKUL_DEFAULT = [
  { id: "EKS-PRAMUKA", nama: "Pramuka", tag: "Wajib Kelas X", deskripsi: "Latihan baris-berbaris, tali-temali, dan kemah bakti.", jadwal: "Jumat 13.30", pembina: "Hubungi OSIS", foto: "images/galeri/ekstrakurikuler/pramuka.jpg" },
  { id: "EKS-PASKIBRA", nama: "Paskibra", tag: "Kesiswaan", deskripsi: "Pasukan pengibar bendera upacara dan lomba baris-berbaris.", jadwal: "Sabtu 07.00", pembina: "Hubungi OSIS", foto: "images/galeri/kepala-sekolah/kepala-sekolah-kegiatan.jpg" },
  { id: "EKS-PMR", nama: "PMR", tag: "Kesiswaan", deskripsi: "Palang Merah Remaja: pertolongan pertama dan bakti sosial.", jadwal: "Sabtu 13.00", pembina: "Hubungi OSIS", foto: "images/galeri/gedung/lingkungan-sekolah.jpg" },
  { id: "EKS-FUTSAL", nama: "Futsal", tag: "Olahraga", deskripsi: "Latihan rutin dan liga antar kelas hingga antar sekolah.", jadwal: "Rabu 15.30", pembina: "Hubungi OSIS", foto: "images/galeri/ekstrakurikuler/olahraga.jpg" },
  { id: "EKS-BASKET", nama: "Basket", tag: "Olahraga", deskripsi: "Tim basket sekolah untuk turnamen pelajar.", jadwal: "Kamis 15.30", pembina: "Hubungi OSIS", foto: "images/galeri/lomba/lomba-olahraga.jpg" },
  { id: "EKS-SENI", nama: "Seni Musik & Tari", tag: "Seni", deskripsi: "Band, tari tradisional, dan pentas seni tahunan.", jadwal: "Jumat 15.30", pembina: "Hubungi OSIS", foto: "images/galeri/ekstrakurikuler/seni.jpg" },
  { id: "EKS-ROBOTIK", nama: "Robotik", tag: "Keterampilan", deskripsi: "Merakit dan memprogram robot untuk lomba teknologi.", jadwal: "Sabtu 09.00", pembina: "Hubungi OSIS", foto: "images/galeri/ekstrakurikuler/robotik.jpg" },
  { id: "EKS-JURNALISTIK", nama: "Jurnalistik", tag: "Keterampilan", deskripsi: "Mading, buletin sekolah, fotografi, dan liputan kegiatan.", jadwal: "Jumat 14.00", pembina: "Hubungi OSIS", foto: "images/galeri/gedung/ruang-kelas.jpg" }
];

/* Default lomba & prestasi (dipakai bila Admin belum menginput). */
var LOMBA_DEFAULT = [
  { id: "LMB-AKADEMIK", judul: "Olimpiade & Cerdas Cermat", tag: "Akademik", deskripsi: "Matematika, IPA, dan informatika tingkat kabupaten ke nasional.", foto: "images/galeri/lomba/lomba-akademik.jpg" },
  { id: "LMB-OLAHRAGA", judul: "Turnamen Olahraga", tag: "Olahraga", deskripsi: "Futsal dan basket antar sekolah se-kabupaten.", foto: "images/galeri/lomba/lomba-olahraga.jpg" },
  { id: "LMB-SENI", judul: "Festival Seni Pelajar", tag: "Seni", deskripsi: "Tari, musik, dan teater tingkat kota.", foto: "images/galeri/lomba/lomba-seni.jpg" },
  { id: "LMB-PENGHARGAAN", judul: "Penghargaan Siswa", tag: "Prestasi", deskripsi: "Apresiasi bagi siswa berprestasi tiap akhir semester.", foto: "images/galeri/lomba/penerimaan-penghargaan.jpg" }
];

function getOsis() {
  try {
    var raw = DB.get(OSIS_KEY);
    if (raw) {
      var o = Object.assign({}, OSIS_DEFAULT, JSON.parse(raw));
      if (!Array.isArray(o.proker)) o.proker = OSIS_DEFAULT.proker.slice();
      return o;
    }
  } catch (e) { /* abaikan, pakai default */ }
  return Object.assign({}, OSIS_DEFAULT, { proker: OSIS_DEFAULT.proker.slice() });
}

function getEkskul() {
  try {
    var raw = DB.get(EKSKUL_KEY);
    if (raw) { var arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; }
  } catch (e) { /* abaikan, pakai default */ }
  return EKSKUL_DEFAULT.slice();
}

function getLomba() {
  try {
    var raw = DB.get(LOMBA_KEY);
    if (raw) { var arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; }
  } catch (e) { /* abaikan, pakai default */ }
  return LOMBA_DEFAULT.slice();
}

function escKegiatan(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function initKegiatan() {
  var card = document.getElementById("osis-card");
  if (!card) return;
  function render() {
    var o = getOsis();
    var fotoHtml = o.foto
      ? "<span class='team-initial'>" + initials(o.ketua) + "</span><img class='team-photo' src='" + o.foto + "' alt='Foto Ketua OSIS' data-photo-fallback>"
      : "<span class='team-initial'>" + initials(o.ketua) + "</span>";
    card.innerHTML = "<div class='profile-top'><div class='team-photo-wrap'>" + fotoHtml + "</div>" +
      "<div><h3>" + escKegiatan(o.ketua) + "</h3>" +
      "<p class='team-nim'>Ketua OSIS &bull; Periode " + escKegiatan(o.periode) + "</p>" +
      "<p class='muted'>" + escKegiatan(o.visi) + "</p></div></div>" +
      "<h4>Program Kerja</h4><ul class='list-plain'>" +
      o.proker.map(function (p) { return "<li>&check; " + escKegiatan(p) + "</li>"; }).join("") + "</ul>";
    var gridEks = document.getElementById("ekskul-grid");
    if (gridEks) {
      gridEks.innerHTML = getEkskul().map(function (k) {
        return "<div class='card g-card'>" +
          (k.foto ? "<img src='" + k.foto + "' alt='" + escKegiatan(k.nama) + "' loading='lazy' data-photo-fallback>" : "") +
          "<span class='tag'>" + escKegiatan(k.tag || "Ekstrakurikuler") + "</span><h3>" + escKegiatan(k.nama) + "</h3>" +
          "<p>" + escKegiatan(k.deskripsi) + "</p>" +
          "<p class='muted'>" + escKegiatan(k.jadwal || "-") + " &bull; Pembina: " + escKegiatan(k.pembina || "-") + "</p></div>";
      }).join("") || "<p class='muted'>Belum ada ekstrakurikuler.</p>";
    }
    var gridLomba = document.getElementById("lomba-grid");
    if (gridLomba) {
      gridLomba.innerHTML = getLomba().map(function (l) {
        return "<div class='card g-card'>" +
          (l.foto ? "<img src='" + l.foto + "' alt='" + escKegiatan(l.judul) + "' loading='lazy' data-photo-fallback>" : "") +
          "<span class='tag'>" + escKegiatan(l.tag || "Lomba") + "</span><h3>" + escKegiatan(l.judul) + "</h3>" +
          "<p>" + escKegiatan(l.deskripsi) + "</p></div>";
      }).join("") || "<p class='muted'>Belum ada lomba.</p>";
    }
    bindImageFallbacks();
  }
  render();
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", function () {
  seedDummyUsers();
  initNavbar();
  renderAuthState();
  bindToggleButtons();
  bindImageFallbacks();
  applyTeamPhotos();
  bindTeamUploads();
  initGaleri();
  initProgram();
  initKegiatan();

  var fl = document.getElementById("form-login");
  if (fl) fl.addEventListener("submit", handleLogin);

  var fk = document.getElementById("form-kontak");
  if (fk) fk.addEventListener("submit", handleContact);

  /* Form ganti password (ada di halaman profil siswa & profil guru) */
  document.querySelectorAll("form[data-ganti-sandun]").forEach(function (f) {
    f.addEventListener("submit", handleChangePassword);
  });

  /* Inisialisasi modul siswa */
  bindStudentNav();
  var guard = document.body ? document.body.getAttribute("data-guard") : null;
  if (guard === "siswa") {
    var sess = requireSiswa();
    if (!sess) return;
    renderStudentUser(sess);
    initDashboard(sess);
    initProfil(sess);
    initJadwal();
    initMateri();
    initTugas(sess);
    initPengumpulan(sess);
    initNilai();
    initAbsensi(sess);
    initRaportSiswa(sess);
  }
});
