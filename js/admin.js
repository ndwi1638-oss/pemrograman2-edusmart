/* ==========================================================================
   EduSmart - js/admin.js | Modul Admin (Vanilla JS, data via SQLite)
   Dimuat SETELAH js/main.js, TANPA js/guru.js (helper didefinisikan sendiri).
   Relasi data memakai ID (userId, studentId, teacherId, classId, subjectId).
   Guard: hanya jalan di <body data-guard="admin">.
   TIDAK membuat data dummy siswa/guru/tugas/materi/nilai/absensi/raport.
   Data lama tidak pernah dihapus otomatis.
   ========================================================================== */

var A_CU_KEY = "edusmart_current_user";
var A_USERS_KEY = "edusmart_users";
var A_STUDENTS_KEY = "edusmart_students";
var A_TEACHERS_KEY = "edusmart_teachers";
var A_CLASSES_KEY = "edusmart_classes";
var A_SUBJECTS_KEY = "edusmart_subjects";
var A_MAJORS_KEY = "edusmart_majors";
var A_MATERIALS_KEY = "edusmart_materials";
var A_TASKS_KEY = "edusmart_tasks";
var A_GRADES_KEY = "edusmart_grades";
var A_ATTEND_KEY = "edusmart_attendance";
var A_SCHEDULES_KEY = "edusmart_schedules";
var A_REPORTS_KEY = "edusmart_reports";
var A_OSIS_KEY = "edusmart_osis";
var A_EKSKUL_KEY = "edusmart_ekskul";
var A_LOMBA_KEY = "edusmart_lomba";
var A_BEASISWA_KEY = "edusmart_beasiswa";

/* ---------- Helper ---------- */
function aGet(key) {
  try { return JSON.parse(DB.get(key)) || []; }
  catch (e) { return []; }
}

function aSet(key, arr) {
  DB.set(key, JSON.stringify(arr));
}

function aUid(prefix) {
  return prefix + "-" + Date.now().toString(36) + Math.floor(Math.random() * 999);
}

function aEsc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function aToday() {
  return new Date().toISOString().slice(0, 10);
}

function aClassById(id) {
  var list = aGet(A_CLASSES_KEY);
  for (var i = 0; i < list.length; i++) if (list[i].classId === id) return list[i];
  return null;
}

function aSubjectById(id) {
  var list = aGet(A_SUBJECTS_KEY);
  for (var i = 0; i < list.length; i++) if (list[i].subjectId === id) return list[i];
  return null;
}

function aTeacherById(id) {
  var list = aGet(A_TEACHERS_KEY);
  for (var i = 0; i < list.length; i++) if (list[i].teacherId === id) return list[i];
  return null;
}

function aClassName(id) { var c = aClassById(id); return c ? c.nama : "-"; }
function aSubjectName(id) { var s = aSubjectById(id); return s ? s.nama : "-"; }
function aTeacherName(id) { var t = aTeacherById(id); return t ? t.nama : "-"; }

/* ---------- Seed struktural (tanpa dummy nama) ---------- */
function aSeed() {
  var majors = aGet(A_MAJORS_KEY);
  if (DB.get(A_MAJORS_KEY) === null) {
    aSet(A_MAJORS_KEY, [
      { majorId: "MAJ-IPA", nama: "IPA" },
      { majorId: "MAJ-IPS", nama: "IPS" },
      { majorId: "MAJ-BHS", nama: "Bahasa" }
    ]);
  } else if (!majors.length) {
    aSet(A_MAJORS_KEY, [
      { majorId: "MAJ-IPA", nama: "IPA" },
      { majorId: "MAJ-IPS", nama: "IPS" },
      { majorId: "MAJ-BHS", nama: "Bahasa" }
    ]);
  }
  [A_STUDENTS_KEY, A_TEACHERS_KEY, A_MATERIALS_KEY, A_TASKS_KEY,
   A_GRADES_KEY, A_ATTEND_KEY, A_SCHEDULES_KEY, A_REPORTS_KEY].forEach(function (k) {
    if (DB.get(k) === null) aSet(k, []);
  });
  if (DB.get(A_CLASSES_KEY) === null) {
    aSet(A_CLASSES_KEY, [
      { classId: "CLS-X1", nama: "X IPA 1" },
      { classId: "CLS-X2", nama: "X IPA 2" },
      { classId: "CLS-XII1", nama: "XII IPA 1" }
    ]);
  }
  if (DB.get(A_SUBJECTS_KEY) === null) {
    aSet(A_SUBJECTS_KEY, [
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
    ]);
  }
}

/* ---------- Guard ---------- */
function aCurrentUser() {
  try { return JSON.parse(DB.get(A_CU_KEY)); }
  catch (e) { return null; }
}

function requireAdmin() {
  var cu = aCurrentUser();
  if (!cu || !(cu.username || cu.email) || cu.role !== "admin") {
    window.location.href = "login.html";
    return null;
  }
  return cu;
}

/* ---------- Dashboard ---------- */
function initAdminDashboard(cu) {
  if (!document.getElementById("adm-nama")) return;
  if (!cu) return;
  document.getElementById("adm-nama").textContent = cu.nama;
  function set(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  set("stat-asiswa", aGet(A_STUDENTS_KEY).length);
  set("stat-aguru", aGet(A_TEACHERS_KEY).length);
  set("stat-akelas", aGet(A_CLASSES_KEY).length);
  set("stat-amapel", aGet(A_SUBJECTS_KEY).length);
  set("stat-atugas", aGet(A_TASKS_KEY).length);
  var info = document.getElementById("adm-info");
  if (info) {
    info.textContent = "Semua akun dibuat Admin. Password diberikan ke siswa/guru, " +
      "dan bisa diganti sendiri olehnya di halaman Profil.";
  }
}

/* ---------- Tambah Siswa & akun login (Admin) ---------- */
function initAdminTambahSiswa() {
  var form = document.getElementById("form-siswa-admin");
  if (!form) return;
  function isiKelas() {
    document.getElementById("ts-kelas").innerHTML = "<option value=''>-- Pilih Kelas --</option>" +
      aGet(A_CLASSES_KEY).map(function (c) {
        return "<option value='" + c.classId + "'>" + aEsc(c.nama) + "</option>";
      }).join("");
  }
  isiKelas();

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var nis = document.getElementById("ts-nis").value.trim();
    var nama = document.getElementById("ts-nama").value.trim();
    var classId = document.getElementById("ts-kelas").value;
    var jk = document.getElementById("ts-jk").value;
    var email = document.getElementById("ts-email").value.trim().toLowerCase();
    var telp = document.getElementById("ts-telp").value.trim();
    var alamat = document.getElementById("ts-alamat").value.trim();
    var sandun = document.getElementById("ts-sandun").value.trim();

    if (!nis || !nama || !classId || !sandun) {
      showAlert("asiswa-alert", "NIS/NISN, nama, kelas, dan password wajib diisi.", "error");
      return;
    }
    if (sandun.length < 6) { showAlert("asiswa-alert", "Password minimal 6 karakter.", "error"); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert("asiswa-alert", "Format email tidak valid.", "error"); return;
    }
    var users = aGet(A_USERS_KEY);
    var dipakai = users.some(function (u) { return (u.username || "").toLowerCase() === nis.toLowerCase(); });
    if (dipakai) { showAlert("asiswa-alert", "NIS/NISN " + nis + " sudah dipakai. Gunakan yang lain.", "error"); return; }
    if (aGet(A_STUDENTS_KEY).some(function (s) { return (s.nis || "") === nis; })) {
      showAlert("asiswa-alert", "Siswa dengan NIS " + nis + " sudah ada di tabel bawah.", "error");
      return;
    }

    var akun = {
      id: aUid("u"), username: nis, nama: nama, email: email, password: hashPassword(sandun),
      role: "siswa", status: "aktif", nis: nis, kelas_id: classId, kelas: aClassName(classId),
      createdAt: new Date().toISOString()
    };
    users.push(akun);
    aSet(A_USERS_KEY, users);

    var siswa = aGet(A_STUDENTS_KEY);
    siswa.push({
      studentId: aUid("STU"), userId: akun.id, nama: nama, nis: nis, nisn: "", email: email,
      classId: classId, jk: jk, ttl: "", alamat: alamat, noTelepon: telp, status: "aktif"
    });
    aSet(A_STUDENTS_KEY, siswa);

    form.reset();
    isiKelas();
    showAlert("asiswa-alert", "Siswa " + nama + " tersimpan. Username: " + nis + " | password: " + sandun, "success");
    renderAdminSiswa();
    initAdminDashboard(aCurrentUser());
  });

  document.getElementById("ts-reset").addEventListener("click", function () {
    form.reset();
    isiKelas();
  });
}

/* Tombol "Acak" pada form password (mengisi password acak) */
function initTombolAcak() {
  document.querySelectorAll("[data-acak]").forEach(function (b) {
    b.addEventListener("click", function () {
      var el = document.getElementById(b.getAttribute("data-acak"));
      if (el && typeof acakPassword === "function") el.value = acakPassword();
    });
  });
}

/* ---------- Data siswa (admin menentukan kelas) ---------- */
/* ---------- Reset password oleh Admin ----------
   Dipakai kalau siswa/guru lupa password: Admin yang menentukan password
   baru, lalu menyampaikannya ke yang bersangkutan. Siswa/guru tetap bisa
   menggantinya sendiri di halaman Profilnya. */
function aSetPassword(o) {
  var alertId = o.alert;
  var sandunBaru = o.sandun;
  if (!sandunBaru) { showAlert(alertId, "Password baru belum diisi.", "error"); return null; }
  if (sandunBaru.length < 6) { showAlert(alertId, "Password baru minimal 6 karakter.", "error"); return null; }
  var users = aGet(A_USERS_KEY);
  var akun = null;
  users.forEach(function (u) {
    if ((o.akunId && u.id === o.akunId) || (o.username && (u.username || "") === o.username)) akun = u;
  });
  var baruDibuat = false;
  if (!akun) {
    /* Akun belum pernah dibuat (mis. siswa yang didata sekolah tanpa daftar,
       atau guru yang datanya diimpor). Sekalian dibuatkan di sini. */
    akun = {
      id: aUid("u"), username: o.username || "", nama: o.nama || "", email: o.email || "",
      password: hashPassword(sandunBaru), role: o.role || "siswa", status: "aktif",
      createdAt: new Date().toISOString()
    };
    if (o.role === "guru") { akun.nip = o.username || ""; akun.jenisGuru = o.jenisGuru || "guru_mapel"; }
    else { akun.nis = o.username || ""; akun.kelas_id = o.kelasId || ""; akun.kelas = o.kelasNama || ""; }
    users.push(akun);
    baruDibuat = true;
  } else {
    akun.password = hashPassword(sandunBaru);
    akun.status = "aktif";
  }
  aSet(A_USERS_KEY, users);
  showAlert(alertId, (baruDibuat ? "Akun login dibuat. " : "") + "Username " + (akun.username || "-") + " | password: " +
    sandunBaru + " (catat & beri tahu).", "success");
  return akun;
}

/* Panel reset password (dipakai tabel siswa & tabel guru) */
function aInitPanelReset(cfg) {
  var box = document.getElementById(cfg.box);
  if (!box) return null;
  var info = document.getElementById(cfg.info);
  var input = document.getElementById(cfg.input);
  var target = null;
  function tutup() { target = null; box.style.display = "none"; if (input) input.value = ""; }
  function buka(data) {
    target = data;
    if (info) info.textContent = "Password baru untuk: " + (data.nama || "-") + " (username " + (data.username || "-") + ").";
    if (input) input.value = acakPassword();
    box.style.display = "block";
    if (input) input.focus();
  }
  var btnSimpan = document.getElementById(cfg.simpan);
  if (btnSimpan) {
    btnSimpan.addEventListener("click", function () {
      if (!target) { showAlert(cfg.alert, "Pilih tombol Reset Password pada tabel lebih dulu.", "error"); return; }
      target.sandun = input.value.trim();
      target.alert = cfg.alert;
      var akun = aSetPassword(target);
      if (akun) { tutup(); if (cfg.selesai) cfg.selesai(akun, target); }
    });
  }
  var btnBatal = document.getElementById(cfg.batal);
  if (btnBatal) btnBatal.addEventListener("click", tutup);
  return { buka: buka, tutup: tutup };
}

function renderAdminSiswa() {
  var tbody = document.getElementById("admin-siswa-tbody");
  if (!tbody) return;
  var q = ((document.getElementById("cari-admin-siswa") || {}).value || "").toLowerCase();
  var fk = (document.getElementById("filter-kelas-admin-siswa") || {}).value || "semua";
  var kelas = aGet(A_CLASSES_KEY);
  var beasiswa = aGet(A_BEASISWA_KEY);
  var rows = aGet(A_STUDENTS_KEY).filter(function (s) {
    var okQ = (s.nama || "").toLowerCase().indexOf(q) !== -1 || (s.nis || "").toLowerCase().indexOf(q) !== -1;
    var okF = fk === "semua" || s.classId === fk || (fk === "belum" && !s.classId);
    return okQ && okF;
  });
  tbody.innerHTML = rows.map(function (s) {
    var opsi = "<option value=''>-- Belum ditentukan --</option>" + kelas.map(function (c) {
      return "<option value='" + c.classId + "'" + (s.classId === c.classId ? " selected" : "") + ">" + aEsc(c.nama) + "</option>";
    }).join("");
    /* Beasiswa milik siswa ini (terhubung lewat studentId / NIS / akun). */
    var bsw = beasiswa.filter(function (b) {
      return (s.studentId && b.studentId === s.studentId) ||
        (s.userId && b.userId && b.userId === s.userId) ||
        (s.nis && b.nis && String(b.nis) === String(s.nis));
    });
    var selBeasiswa = bsw.length
      ? "<span class='badge b-green'>" + bsw.length + " beasiswa</span><br><span class='muted' style='font-size:.78rem'>" +
        aEsc(bsw.map(function (b) { return b.namaBeasiswa; }).join(", ")) + "</span>"
      : "<span class='muted'>-</span>";
    return "<tr><td>" + aEsc(s.nis || "-") + "</td><td>" + aEsc(s.nama) + "</td><td>" + aEsc(s.email || "-") + "</td>" +
      "<td><select data-adm-siswa-kelas='" + s.studentId + "'>" + opsi + "</select></td>" +
      "<td>" + selBeasiswa + "</td>" +
      "<td><span class='badge " + ((s.status || "aktif") === "aktif" ? "b-green" : "b-yellow") + "'>" + aEsc(s.status || "aktif") + "</span></td>" +
      "<td><button class='btn-small btn-dark' data-adm-siswa-simpan='" + s.studentId + "'>Simpan</button> " +
      "<button class='btn-small btn-secondary' style='color:#1e293b;border-color:#cbd5e1' data-adm-siswa-sandun='" + s.studentId + "'>Reset Password</button> " +
      "<button class='btn-danger' data-adm-siswa-hapus='" + s.studentId + "'>Hapus</button></td></tr>";
  }).join("") || "<tr><td colspan='7'>Belum ada data siswa.</td></tr>";
  /* Beri tahu modul lain (mis. dropdown Beasiswa) bahwa daftar siswa berubah. */
  document.dispatchEvent(new Event("edusmart:siswa-berubah"));
}

function initAdminSiswa() {
  if (!document.getElementById("admin-siswa-tbody")) return;
  var panel = aInitPanelReset({
    box: "reset-siswa-box", info: "reset-siswa-info", input: "reset-siswa-input",
    simpan: "reset-siswa-simpan", batal: "reset-siswa-batal", alert: "asiswa-alert",
    /* Kalau akunnya baru dibuat, tautkan id-nya ke data siswa */
    selesai: function (akun, target) {
      var listS = aGet(A_STUDENTS_KEY), ubah = false;
      listS.forEach(function (s) {
        if (s.studentId === target.siswaId && s.userId !== akun.id) { s.userId = akun.id; ubah = true; }
      });
      if (ubah) aSet(A_STUDENTS_KEY, listS);
    }
  });
  var sel = document.getElementById("filter-kelas-admin-siswa");
  if (sel) {
    sel.innerHTML = "<option value='semua'>Semua Kelas</option><option value='belum'>Belum ditentukan</option>" +
      aGet(A_CLASSES_KEY).map(function (c) { return "<option value='" + c.classId + "'>" + aEsc(c.nama) + "</option>"; }).join("");
    sel.addEventListener("change", renderAdminSiswa);
  }
  var cari = document.getElementById("cari-admin-siswa");
  if (cari) cari.addEventListener("input", renderAdminSiswa);
  document.getElementById("admin-siswa-tbody").addEventListener("click", function (e) {
    var simpan = e.target.getAttribute && e.target.getAttribute("data-adm-siswa-simpan");
    var hapus = e.target.getAttribute && e.target.getAttribute("data-adm-siswa-hapus");
    var resetPw = e.target.getAttribute && e.target.getAttribute("data-adm-siswa-sandun");
    var list = aGet(A_STUDENTS_KEY);
    if (resetPw) {
      var s = null;
      list.forEach(function (x) { if (x.studentId === resetPw) s = x; });
      if (!s) return;
      if (panel) panel.buka({
        akunId: s.userId || "", username: s.nis || s.nisn || "", nama: s.nama || "",
        email: s.email || "", role: "siswa", kelasId: s.classId || "", kelasNama: aClassName(s.classId),
        siswaId: s.studentId
      });
    } else if (simpan) {
      var selK = document.querySelector("[data-adm-siswa-kelas='" + simpan + "']");
      list.forEach(function (s) { if (s.studentId === simpan) s.classId = selK ? selK.value : s.classId; });
      aSet(A_STUDENTS_KEY, list);
      showAlert("asiswa-alert", "Kelas siswa diperbarui.", "success");
      renderAdminSiswa();
    } else if (hapus) {
      if (!confirm("Hapus data siswa ini? (Nilai/absensi/raport miliknya ikut terhapus.)")) return;
      aSet(A_STUDENTS_KEY, list.filter(function (s) { return s.studentId !== hapus; }));
      aSet(A_GRADES_KEY, aGet(A_GRADES_KEY).filter(function (g) { return g.studentId !== hapus; }));
      aSet(A_ATTEND_KEY, aGet(A_ATTEND_KEY).filter(function (a) { return a.studentId !== hapus; }));
      aSet(A_REPORTS_KEY, aGet(A_REPORTS_KEY).filter(function (r) { return r.studentId !== hapus; }));
      showAlert("asiswa-alert", "Data siswa dihapus.", "success");
      renderAdminSiswa();
      initAdminDashboard(aCurrentUser());
    }
  });
  renderAdminSiswa();
}

/* ---------- Data guru (jenis, kelas, mapel, wali) ---------- */
function renderAdminGuru() {
  var tbody = document.getElementById("admin-guru-tbody");
  if (!tbody) return;
  var q = ((document.getElementById("cari-admin-guru") || {}).value || "").toLowerCase();
  var rows = aGet(A_TEACHERS_KEY).filter(function (t) {
    return (t.nama || "").toLowerCase().indexOf(q) !== -1 || (t.nip || "").indexOf(q) !== -1 ||
      (t.email || "").toLowerCase().indexOf(q) !== -1;
  });
  tbody.innerHTML = rows.map(function (t) {
    var jenis = t.jenisGuru === "wali_kelas" ? "Wali Kelas" : "Guru Mapel";
    var mapel = (t.subjectIds || []).map(aSubjectName).join(", ") || "-";
    var kelas = (t.classIds || []).map(aClassName).join(", ") || "-";
    var wali = t.waliClassId ? aClassName(t.waliClassId) : "-";
    return "<tr><td>" + aEsc(t.nama) + "</td><td>" + aEsc(t.email || "-") + "</td>" +
      "<td>" + aEsc(t.nip || "-") + "</td><td><span class='badge b-blue'>" + jenis + "</span></td><td>" + aEsc(mapel) + "</td><td>" + aEsc(kelas) + "</td><td>" + aEsc(wali) + "</td>" +
      "<td><span class='badge " + ((t.status || "aktif") === "aktif" ? "b-green" : "b-yellow") + "'>" + aEsc(t.status || "aktif") + "</span></td>" +
      "<td><button class='btn-small btn-dark' data-adm-guru-edit='" + t.teacherId + "'>Atur</button> " +
      "<button class='btn-small btn-secondary' style='color:#1e293b;border-color:#cbd5e1' data-adm-guru-sandun='" + t.teacherId + "'>Reset Password</button> " +
      "<button class='btn-danger' data-adm-guru-hapus='" + t.teacherId + "'>Hapus</button></td></tr>";
  }).join("") || "<tr><td colspan='8'>Belum ada data guru.</td></tr>";
}

function initAdminGuru() {
  var form = document.getElementById("form-guru-admin");
  if (!form) return;
  var panelGuru = aInitPanelReset({
    box: "reset-guru-box", info: "reset-guru-info", input: "reset-guru-input",
    simpan: "reset-guru-simpan", batal: "reset-guru-batal", alert: "aguru-alert",
    /* Kalau akunnya baru dibuat, tautkan id-nya ke data guru */
    selesai: function (akun, target) {
      var listG = aGet(A_TEACHERS_KEY), ubah = false;
      listG.forEach(function (t) {
        if (t.teacherId === target.guruId && t.userId !== akun.id) { t.userId = akun.id; ubah = true; }
      });
      if (ubah) aSet(A_TEACHERS_KEY, listG);
    }
  });
  var cari = document.getElementById("cari-admin-guru");
  if (cari) cari.addEventListener("input", renderAdminGuru);

  function isiOpsi() {
    document.getElementById("ag-mapel-box").innerHTML = aGet(A_SUBJECTS_KEY).map(function (s) {
      return "<label><input type='checkbox' data-ag-mapel='" + s.subjectId + "'> " + aEsc(s.nama) + "</label>";
    }).join("");
    document.getElementById("ag-kelas-box").innerHTML = aGet(A_CLASSES_KEY).map(function (c) {
      return "<label><input type='checkbox' data-ag-kelas='" + c.classId + "'> " + aEsc(c.nama) + "</label>";
    }).join("");
    document.getElementById("ag-wali").innerHTML = "<option value=''>-- Bukan wali kelas --</option>" +
      aGet(A_CLASSES_KEY).map(function (c) { return "<option value='" + c.classId + "'>Wali " + aEsc(c.nama) + "</option>"; }).join("");
  }
  isiOpsi();

  function bacaBox(attr) {
    var out = [];
    form.querySelectorAll("input[" + attr + "]:checked").forEach(function (c) {
      out.push(c.getAttribute(attr));
    });
    return out;
  }

  /* Satu form untuk dua keperluan:
     mode "atur" = mengubah guru yang sudah ada (dipilih lewat tombol Atur)
     mode "baru" = menambah guru baru (tombol "+ Tambah Guru Baru")        */
  var mode = "atur";

  function setMode(m) {
    mode = m;
    var baru = m === "baru";
    document.getElementById("ag-form-title").textContent = baru ? "Tambah Guru Baru" : "Atur Guru";
    document.getElementById("ag-simpan").textContent = baru ? "Simpan Guru Baru" : "Simpan Pengaturan";
    // Nama & NIP (username login) hanya diisi saat menambah guru baru.
    ["ag-nama-input", "ag-nip"].forEach(function (id) {
      document.getElementById(id).disabled = !baru;
    });
    document.getElementById("ag-nama").textContent = baru
      ? "Isi nama, NIP, jenis guru, mapel, dan kelas. Email boleh dikosongkan."
      : "Atur mapel, kelas, dan wali guru yang dipilih. Untuk lupa password, pakai tombol Reset Password.";
  }

  function resetForm() {
    form.reset();
    document.getElementById("ag-id").value = "";
    document.getElementById("ag-batal").hidden = true;
    setMode("atur");
  }
  document.getElementById("ag-batal").addEventListener("click", resetForm);
  document.getElementById("ag-baru").addEventListener("click", function () {
    resetForm();
    setMode("baru");
    document.getElementById("ag-batal").hidden = false;
    document.getElementById("ag-nama-input").focus();
    window.scrollTo(0, 0);
  });

  document.getElementById("admin-guru-tbody").addEventListener("click", function (e) {
    var ed = e.target.getAttribute && e.target.getAttribute("data-adm-guru-edit");
    var del = e.target.getAttribute && e.target.getAttribute("data-adm-guru-hapus");
    var resetPw = e.target.getAttribute && e.target.getAttribute("data-adm-guru-sandun");
    var list = aGet(A_TEACHERS_KEY);
    if (resetPw) {
      var tr = null;
      list.forEach(function (x) { if (x.teacherId === resetPw) tr = x; });
      if (!tr) return;
      if (panelGuru) panelGuru.buka({
        akunId: tr.userId || "", username: tr.nip || "", nama: tr.nama || "",
        email: tr.email || "", role: "guru", jenisGuru: tr.jenisGuru || "guru_mapel",
        guruId: tr.teacherId
      });
    } else if (ed) {
      var t = null;
      list.forEach(function (x) { if (x.teacherId === ed) t = x; });
      if (!t) return;
      setMode("atur");
      document.getElementById("ag-id").value = t.teacherId;
      document.getElementById("ag-nama").textContent = t.nama + (t.email ? " (" + t.email + ")" : " (belum ada email)");
      document.getElementById("ag-nama-input").value = t.nama || "";
      document.getElementById("ag-nip").value = t.nip || "";
      document.getElementById("ag-email").value = t.email || "";
      document.getElementById("ag-jenis").value = t.jenisGuru || "guru_mapel";
      form.querySelectorAll("input[data-ag-mapel]").forEach(function (c) {
        c.checked = (t.subjectIds || []).indexOf(c.getAttribute("data-ag-mapel")) !== -1;
      });
      form.querySelectorAll("input[data-ag-kelas]").forEach(function (c) {
        c.checked = (t.classIds || []).indexOf(c.getAttribute("data-ag-kelas")) !== -1;
      });
      document.getElementById("ag-wali").value = t.waliClassId || "";
      document.getElementById("ag-form-title").textContent = "Atur: " + t.nama;
      document.getElementById("ag-batal").hidden = false;
      window.scrollTo(0, 0);
    } else if (del) {
      if (!confirm("Hapus data guru ini?")) return;
      aSet(A_TEACHERS_KEY, list.filter(function (x) { return x.teacherId !== del; }));
      showAlert("aguru-alert", "Data guru dihapus.", "success");
      renderAdminGuru();
      initAdminDashboard(aCurrentUser());
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var id = document.getElementById("ag-id").value;
    var jenis = document.getElementById("ag-jenis").value;
    var waliClassId = document.getElementById("ag-wali").value;
    if (jenis === "wali_kelas" && !waliClassId) {
      showAlert("aguru-alert", "Wali kelas wajib memiliki kelas yang diwalikan.", "error");
      return;
    }
    var mapel = bacaBox("data-ag-mapel");
    var kelas = bacaBox("data-ag-kelas");
    if (jenis === "wali_kelas" && kelas.indexOf(waliClassId) === -1) kelas.push(waliClassId);
    var list = aGet(A_TEACHERS_KEY);

    /* Satu kelas hanya boleh punya SATU wali. Kalau kelas yang dipilih sudah
       diwali guru lain, tanyakan dulu sebelum wali dipindahkan. */
    function selesaikanWaliLama(guruId, namaGuru) {
      if (jenis !== "wali_kelas") return true;
      var waliLama = null;
      list.forEach(function (t) {
        if (t.waliClassId === waliClassId && t.teacherId !== guruId) waliLama = t;
      });
      if (!waliLama) return true;
      if (!confirm("Kelas " + aClassName(waliClassId) + " saat ini diwali oleh " + waliLama.nama +
        ". Pindahkan wali kelas ke " + (namaGuru || "guru ini") + "?")) {
        showAlert("aguru-alert", "Dibatalkan: kelas tersebut sudah memiliki wali kelas.", "error");
        return false;
      }
      waliLama.waliClassId = "";
      if (waliLama.jenisGuru === "wali_kelas") waliLama.jenisGuru = "guru_mapel";
      return true;
    }

    /* Samakan waliTeacherId pada record kelas dengan guru yang mengwalikan. */
    function tandaiWaliKelas() {
      var kelasList = aGet(A_CLASSES_KEY);
      var berubah = false;
      kelasList.forEach(function (c) {
        var wali = c.waliTeacherId;
        list.forEach(function (t) { if (t.waliClassId === c.classId) wali = t.teacherId; });
        if (c.waliTeacherId !== wali) { c.waliTeacherId = wali; berubah = true; }
      });
      if (berubah) aSet(A_CLASSES_KEY, kelasList);
    }

    /* ---------- MODE BARU: menambah guru ---------- */
    if (mode === "baru") {
      var nama = document.getElementById("ag-nama-input").value.trim();
      var nip = document.getElementById("ag-nip").value.trim();
      var email = document.getElementById("ag-email").value.trim().toLowerCase();
      var sandun = document.getElementById("ag-sandun").value.trim();
      if (!nama) { showAlert("aguru-alert", "Nama guru wajib diisi.", "error"); return; }
      if (!nip) { showAlert("aguru-alert", "NIP/NUPTK wajib diisi (dipakai sebagai username login).", "error"); return; }
      if (!sandun) { showAlert("aguru-alert", "Password wajib diisi (diberikan ke guru).", "error"); return; }
      if (sandun.length < 6) { showAlert("aguru-alert", "Password minimal 6 karakter.", "error"); return; }
      if (email && list.some(function (t) { return (t.email || "").toLowerCase() === email; })) {
        showAlert("aguru-alert", "Email tersebut sudah dipakai guru lain.", "error");
        return;
      }
      if (!selesaikanWaliLama("", nama)) return;

      /* Akun login: pakai akun yang NIP-nya sama, atau buat baru (aktif). */
      var akun = null;
      var users = aGet(A_USERS_KEY);
      users.forEach(function (u) { if ((u.username || u.nip) === nip) akun = u; });
      var sandunAkun = sandun;
      if (akun) {
        akun.status = "aktif";
        akun.role = "guru";
        akun.nama = nama;
        if (email) akun.email = email;
        akun.nip = nip;
        akun.username = nip;
        akun.jenisGuru = jenis;
        akun.password = hashPassword(sandun);
      } else {
        akun = {
          id: aUid("u"), username: nip, nama: nama, email: email, password: hashPassword(sandun),
          role: "guru", status: "aktif", nip: nip, jenisGuru: jenis, createdAt: new Date().toISOString()
        };
        users.push(akun);
      }
      aSet(A_USERS_KEY, users);
      var guruBaru = {
        teacherId: aUid("T"),
        userId: akun.id,
        nama: nama,
        nip: nip,
        email: email,
        jenisGuru: jenis,
        subjectIds: mapel,
        classIds: kelas,
        waliClassId: jenis === "wali_kelas" ? waliClassId : "",
        status: "aktif",
        telepon: "",
        alamat: "",
        foto: ""
      };
      list.push(guruBaru);
      aSet(A_TEACHERS_KEY, list);
      tandaiWaliKelas();
      showAlert("aguru-alert", "Guru " + nama + " ditambahkan. Username login: " + nip +
        " | password: " + sandunAkun + " (diberikan ke guru).", "success");
      resetForm();
      renderAdminGuru();
      initAdminDashboard(aCurrentUser());
      return;
    }

    /* ---------- MODE ATUR: mengubah guru yang sudah ada ---------- */
    if (!id) { showAlert("aguru-alert", "Pilih guru pada tabel (tombol Atur) atau tekan \"+ Tambah Guru Baru\".", "error"); return; }
    var emailAtur = document.getElementById("ag-email").value.trim().toLowerCase();
    if (emailAtur && list.some(function (t) {
      return t.teacherId !== id && (t.email || "").toLowerCase() === emailAtur;
    })) {
      showAlert("aguru-alert", "Email tersebut sudah dipakai guru lain.", "error");
      return;
    }
    /* Sinkronkan data guru dengan akun loginny (dicari lewat NIP) */
    var nipAtur = document.getElementById("ag-nip").value.trim();
    var akunAtur = null;
    var usersAtur = aGet(A_USERS_KEY);
    usersAtur.forEach(function (u) {
      if (u.role === "guru" && nipAtur && (u.nip === nipAtur || u.username === nipAtur)) akunAtur = u;
    });
    if (!selesaikanWaliLama(id, "")) return;
    list.forEach(function (t) {
      if (t.teacherId === id) {
        t.jenisGuru = jenis; t.subjectIds = mapel; t.classIds = kelas;
        t.waliClassId = jenis === "wali_kelas" ? waliClassId : "";
        if (emailAtur) t.email = emailAtur;
        if (akunAtur) { t.userId = akunAtur.id; akunAtur.jenisGuru = jenis; }
      }
    });
    aSet(A_TEACHERS_KEY, list);
    tandaiWaliKelas();
    if (akunAtur) aSet(A_USERS_KEY, usersAtur);
    showAlert("aguru-alert", "Pengaturan guru disimpan. Ubah password lewat tombol Reset Password bila perlu.", "success");
    resetForm();
    renderAdminGuru();
    initAdminDashboard(aCurrentUser());
  });
  setMode("atur");
  renderAdminGuru();
}

/* ---------- Kelola kelas ---------- */
function initAdminKelas() {
  var form = document.getElementById("form-kelas-admin");
  if (!form) return;
  function render() {
    var rows = aGet(A_CLASSES_KEY);
    var guru = aGet(A_TEACHERS_KEY);
    document.getElementById("admin-kelas-tbody").innerHTML = rows.map(function (c, i) {
      var wali = null;
      guru.forEach(function (t) { if (t.waliClassId === c.classId) wali = t; });
      var jml = aGet(A_STUDENTS_KEY).filter(function (s) { return s.classId === c.classId; }).length;
      return "<tr><td>" + (i + 1) + "</td><td>" + aEsc(c.nama) + "</td><td>" + jml + "</td><td>" + aEsc(wali ? wali.nama : "-") + "</td>" +
        "<td><button class='btn-small btn-dark' data-adm-kelas-edit='" + c.classId + "'>Edit</button> " +
        "<button class='btn-danger' data-adm-kelas-hapus='" + c.classId + "'>Hapus</button></td></tr>";
    }).join("") || "<tr><td colspan='5'>Belum ada data kelas.</td></tr>";
  }
  function resetForm() {
    form.reset();
    document.getElementById("ak-id").value = "";
    document.getElementById("ak-batal").hidden = true;
  }
  document.getElementById("ak-batal").addEventListener("click", resetForm);
  document.getElementById("admin-kelas-tbody").addEventListener("click", function (e) {
    var ed = e.target.getAttribute && e.target.getAttribute("data-adm-kelas-edit");
    var del = e.target.getAttribute && e.target.getAttribute("data-adm-kelas-hapus");
    var list = aGet(A_CLASSES_KEY);
    if (ed) {
      var c = null;
      list.forEach(function (x) { if (x.classId === ed) c = x; });
      if (!c) return;
      document.getElementById("ak-id").value = c.classId;
      document.getElementById("ak-nama").value = c.nama;
      document.getElementById("ak-batal").hidden = false;
      window.scrollTo(0, 0);
    } else if (del) {
      var pakai = aGet(A_STUDENTS_KEY).some(function (s) { return s.classId === del; });
      if (pakai) { showAlert("akelas-alert", "Kelas tidak dapat dihapus: masih ada siswa di kelas ini.", "error"); return; }
      if (!confirm("Hapus kelas ini?")) return;
      aSet(A_CLASSES_KEY, list.filter(function (x) { return x.classId !== del; }));
      showAlert("akelas-alert", "Kelas dihapus.", "success");
      render();
      initAdminDashboard(aCurrentUser());
    }
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var nama = document.getElementById("ak-nama").value.trim();
    if (!nama) { showAlert("akelas-alert", "Nama kelas wajib diisi.", "error"); return; }
    var list = aGet(A_CLASSES_KEY);
    var dobel = list.some(function (x) {
      return x.nama.toLowerCase() === nama.toLowerCase() && x.classId !== document.getElementById("ak-id").value;
    });
    if (dobel) { showAlert("akelas-alert", "Kelas dengan nama tersebut sudah ada.", "error"); return; }
    var id = document.getElementById("ak-id").value;
    if (id) {
      list.forEach(function (x) { if (x.classId === id) x.nama = nama; });
      showAlert("akelas-alert", "Kelas diperbarui.", "success");
    } else {
      list.push({ classId: aUid("CLS"), nama: nama });
      showAlert("akelas-alert", "Kelas ditambahkan.", "success");
    }
    aSet(A_CLASSES_KEY, list);
    resetForm();
    render();
    renderAdminSiswa();
    initAdminDashboard(aCurrentUser());
  });
  render();
}

/* ---------- Kelola jurusan ---------- */
function initAdminJurusan() {
  var form = document.getElementById("form-jurusan-admin");
  if (!form) return;
  function render() {
    var rows = aGet(A_MAJORS_KEY);
    document.getElementById("admin-jurusan-tbody").innerHTML = rows.map(function (m, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + aEsc(m.nama) + "</td>" +
        "<td><button class='btn-small btn-dark' data-adm-jur-edit='" + m.majorId + "'>Edit</button> " +
        "<button class='btn-danger' data-adm-jur-hapus='" + m.majorId + "'>Hapus</button></td></tr>";
    }).join("") || "<tr><td colspan='3'>Belum ada data jurusan.</td></tr>";
  }
  function resetForm() {
    form.reset();
    document.getElementById("aj-id").value = "";
    document.getElementById("aj-batal").hidden = true;
  }
  document.getElementById("aj-batal").addEventListener("click", resetForm);
  document.getElementById("admin-jurusan-tbody").addEventListener("click", function (e) {
    var ed = e.target.getAttribute && e.target.getAttribute("data-adm-jur-edit");
    var del = e.target.getAttribute && e.target.getAttribute("data-adm-jur-hapus");
    var list = aGet(A_MAJORS_KEY);
    if (ed) {
      var m = null;
      list.forEach(function (x) { if (x.majorId === ed) m = x; });
      if (!m) return;
      document.getElementById("aj-id").value = m.majorId;
      document.getElementById("aj-nama").value = m.nama;
      document.getElementById("aj-batal").hidden = false;
    } else if (del) {
      if (!confirm("Hapus jurusan ini?")) return;
      aSet(A_MAJORS_KEY, list.filter(function (x) { return x.majorId !== del; }));
      showAlert("ajurusan-alert", "Jurusan dihapus.", "success");
      render();
    }
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var nama = document.getElementById("aj-nama").value.trim();
    if (!nama) { showAlert("ajurusan-alert", "Nama jurusan wajib diisi.", "error"); return; }
    var list = aGet(A_MAJORS_KEY);
    var id = document.getElementById("aj-id").value;
    if (id) {
      list.forEach(function (x) { if (x.majorId === id) x.nama = nama; });
      showAlert("ajurusan-alert", "Jurusan diperbarui.", "success");
    } else {
      if (list.some(function (x) { return x.nama.toLowerCase() === nama.toLowerCase(); })) {
        showAlert("ajurusan-alert", "Jurusan tersebut sudah ada.", "error");
        return;
      }
      list.push({ majorId: aUid("MAJ"), nama: nama });
      showAlert("ajurusan-alert", "Jurusan ditambahkan.", "success");
    }
    aSet(A_MAJORS_KEY, list);
    resetForm();
    render();
  });
  render();
}

/* ---------- Kelola mata pelajaran ---------- */
function initAdminMapel() {
  var form = document.getElementById("form-mapel-admin");
  if (!form) return;
  function render() {
    var rows = aGet(A_SUBJECTS_KEY);
    document.getElementById("admin-mapel-tbody").innerHTML = rows.map(function (s, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + aEsc(s.nama) + "</td><td>" + aEsc(s.track || "Bersama") + "</td>" +
        "<td><button class='btn-small btn-dark' data-adm-mapel-edit='" + s.subjectId + "'>Edit</button> " +
        "<button class='btn-danger' data-adm-mapel-hapus='" + s.subjectId + "'>Hapus</button></td></tr>";
    }).join("") || "<tr><td colspan='4'>Belum ada data mata pelajaran.</td></tr>";
  }
  function resetForm() {
    form.reset();
    document.getElementById("am-id").value = "";
    document.getElementById("am-batal").hidden = true;
  }
  document.getElementById("am-batal").addEventListener("click", resetForm);
  document.getElementById("admin-mapel-tbody").addEventListener("click", function (e) {
    var ed = e.target.getAttribute && e.target.getAttribute("data-adm-mapel-edit");
    var del = e.target.getAttribute && e.target.getAttribute("data-adm-mapel-hapus");
    var list = aGet(A_SUBJECTS_KEY);
    if (ed) {
      var s = null;
      list.forEach(function (x) { if (x.subjectId === ed) s = x; });
      if (!s) return;
      document.getElementById("am-id").value = s.subjectId;
      document.getElementById("am-nama").value = s.nama;
      document.getElementById("am-track").value = s.track || "Bersama";
      document.getElementById("am-batal").hidden = false;
    } else if (del) {
      var pakai = aGet(A_MATERIALS_KEY).some(function (x) { return x.subjectId === del; }) ||
        aGet(A_TASKS_KEY).some(function (x) { return x.subjectId === del; }) ||
        aGet(A_GRADES_KEY).some(function (x) { return x.subjectId === del; });
      if (pakai) { showAlert("amapel-alert", "Mapel tidak dapat dihapus: masih dipakai materi/tugas/nilai.", "error"); return; }
      if (!confirm("Hapus mata pelajaran ini?")) return;
      aSet(A_SUBJECTS_KEY, list.filter(function (x) { return x.subjectId !== del; }));
      showAlert("amapel-alert", "Mata pelajaran dihapus.", "success");
      render();
      initAdminDashboard(aCurrentUser());
    }
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var nama = document.getElementById("am-nama").value.trim();
    var track = document.getElementById("am-track").value;
    if (!nama) { showAlert("amapel-alert", "Nama mata pelajaran wajib diisi.", "error"); return; }
    var list = aGet(A_SUBJECTS_KEY);
    var id = document.getElementById("am-id").value;
    if (id) {
      list.forEach(function (x) { if (x.subjectId === id) { x.nama = nama; x.track = track; } });
      showAlert("amapel-alert", "Mata pelajaran diperbarui.", "success");
    } else {
      if (list.some(function (x) { return x.nama.toLowerCase() === nama.toLowerCase(); })) {
        showAlert("amapel-alert", "Mata pelajaran tersebut sudah ada.", "error");
        return;
      }
      list.push({ subjectId: aUid("SUB"), nama: nama, track: track });
      showAlert("amapel-alert", "Mata pelajaran ditambahkan.", "success");
    }
    aSet(A_SUBJECTS_KEY, list);
    resetForm();
    render();
    initAdminDashboard(aCurrentUser());
  });
  render();
}

/* ---------- Kelola jadwal (relasi classId/subjectId/teacherId) ---------- */
function initAdminJadwal() {
  var form = document.getElementById("form-jadwal-admin");
  if (!form) return;
  var HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  function isiOpsi() {
    document.getElementById("aja-hari").innerHTML = HARI.map(function (h) { return "<option>" + h + "</option>"; }).join("");
    document.getElementById("aja-kelas").innerHTML = aGet(A_CLASSES_KEY).map(function (c) {
      return "<option value='" + c.classId + "'>" + aEsc(c.nama) + "</option>";
    }).join("");
    document.getElementById("aja-mapel").innerHTML = aGet(A_SUBJECTS_KEY).map(function (s) {
      return "<option value='" + s.subjectId + "'>" + aEsc(s.nama) + "</option>";
    }).join("");
    document.getElementById("aja-guru").innerHTML = "<option value=''>-- Pilih Guru --</option>" + aGet(A_TEACHERS_KEY).map(function (t) {
      return "<option value='" + t.teacherId + "'>" + aEsc(t.nama) + "</option>";
    }).join("");
    // Opsi salin jadwal (kalau panelnya ada di halaman ini)
    var opsiSalin = "<option value=''>-- Pilih Kelas --</option>" + aGet(A_CLASSES_KEY).map(function (c) {
      return "<option value='" + c.classId + "'>" + aEsc(c.nama) + "</option>";
    }).join("");
    var sDari = document.getElementById("salin-dari");
    var sKe = document.getElementById("salin-ke");
    if (sDari) sDari.innerHTML = opsiSalin;
    if (sKe) sKe.innerHTML = opsiSalin;
  }
  isiOpsi();

  /* Salin seluruh jadwal mingguan dari satu kelas ke kelas lain. Jadwal
     kelas tujuan yang sudah ada digantikan (dengan konfirmasi). */
  var btnSalin = document.getElementById("btn-salin");
  if (btnSalin) {
    btnSalin.addEventListener("click", function () {
      var dari = document.getElementById("salin-dari").value;
      var ke = document.getElementById("salin-ke").value;
      if (!dari || !ke) { showAlert("ajadwal-alert", "Pilih kelas asal dan kelas tujuan.", "error"); return; }
      if (dari === ke) { showAlert("ajadwal-alert", "Kelas asal dan kelas tujuan tidak boleh sama.", "error"); return; }
      var list = aGet(A_SCHEDULES_KEY);
      var sumber = list.filter(function (r) { return r.classId === dari; });
      if (!sumber.length) {
        showAlert("ajadwal-alert", "Kelas " + aClassName(dari) + " belum punya jadwal untuk disalin.", "error");
        return;
      }
      var lama = list.filter(function (r) { return r.classId === ke; });
      if (lama.length && !confirm("Kelas " + aClassName(ke) + " sudah punya " + lama.length +
        " baris jadwal.\nGanti semuanya dengan salinan dari " + aClassName(dari) + "?")) {
        return;
      }
      var salinan = sumber.map(function (r) {
        return {
          scheduleId: aUid("SCH"), classId: ke, subjectId: r.subjectId, teacherId: r.teacherId,
          day: r.day, startTime: r.startTime, endTime: r.endTime, room: r.room
        };
      });
      aSet(A_SCHEDULES_KEY, list.filter(function (r) { return r.classId !== ke; }).concat(salinan));
      showAlert("ajadwal-alert", "Jadwal " + aClassName(ke) + " disalin dari " + aClassName(dari) +
        " (" + salinan.length + " baris). Ruang & jam bisa diedit lagi.", "success");
      render();
    });
  }
  function render() {
    var fk = document.getElementById("filter-kelas-ajadwal").value;
    var rows = aGet(A_SCHEDULES_KEY).filter(function (r) { return fk === "semua" || r.classId === fk; });
    document.getElementById("admin-jadwal-tbody").innerHTML = rows.map(function (r, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + aEsc(r.day) + "</td><td>" + aEsc(r.startTime + "-" + r.endTime) + "</td>" +
        "<td>" + aEsc(aSubjectName(r.subjectId)) + "</td><td>" + aEsc(aClassName(r.classId)) + "</td><td>" + aEsc(aTeacherName(r.teacherId)) + "</td><td>" + aEsc(r.room) + "</td>" +
        "<td><button class='btn-small btn-dark' data-adm-jad-edit='" + r.scheduleId + "'>Edit</button> " +
        "<button class='btn-danger' data-adm-jad-hapus='" + r.scheduleId + "'>Hapus</button></td></tr>";
    }).join("") || "<tr><td colspan='8'>Belum ada jadwal.</td></tr>";
  }
  var fkelas = document.getElementById("filter-kelas-ajadwal");
  fkelas.innerHTML = "<option value='semua'>Semua Kelas</option>" + aGet(A_CLASSES_KEY).map(function (c) {
    return "<option value='" + c.classId + "'>" + aEsc(c.nama) + "</option>";
  }).join("");
  fkelas.addEventListener("change", render);
  function resetForm() {
    form.reset();
    document.getElementById("aja-id").value = "";
    document.getElementById("aja-batal").hidden = true;
  }
  document.getElementById("aja-batal").addEventListener("click", resetForm);
  document.getElementById("admin-jadwal-tbody").addEventListener("click", function (e) {
    var ed = e.target.getAttribute && e.target.getAttribute("data-adm-jad-edit");
    var del = e.target.getAttribute && e.target.getAttribute("data-adm-jad-hapus");
    var list = aGet(A_SCHEDULES_KEY);
    if (ed) {
      var r = null;
      list.forEach(function (x) { if (x.scheduleId === ed) r = x; });
      if (!r) return;
      document.getElementById("aja-id").value = r.scheduleId;
      document.getElementById("aja-hari").value = r.day;
      document.getElementById("aja-kelas").value = r.classId;
      document.getElementById("aja-mapel").value = r.subjectId;
      document.getElementById("aja-guru").value = r.teacherId || "";
      document.getElementById("aja-mulai").value = r.startTime;
      document.getElementById("aja-selesai").value = r.endTime;
      document.getElementById("aja-ruang").value = r.room;
      document.getElementById("aja-batal").hidden = false;
    } else if (del) {
      if (!confirm("Hapus jadwal ini?")) return;
      aSet(A_SCHEDULES_KEY, list.filter(function (x) { return x.scheduleId !== del; }));
      showAlert("ajadwal-alert", "Jadwal dihapus.", "success");
      render();
    }
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var day = document.getElementById("aja-hari").value;
    var classId = document.getElementById("aja-kelas").value;
    var subjectId = document.getElementById("aja-mapel").value;
    var teacherId = document.getElementById("aja-guru").value;
    var startTime = document.getElementById("aja-mulai").value.trim();
    var endTime = document.getElementById("aja-selesai").value.trim();
    var room = document.getElementById("aja-ruang").value.trim();
    if (!day || !classId || !subjectId || !startTime || !endTime || !room) {
      showAlert("ajadwal-alert", "Semua field wajib diisi.", "error");
      return;
    }
    var list = aGet(A_SCHEDULES_KEY);
    var id = document.getElementById("aja-id").value;
    if (id) {
      list.forEach(function (r) {
        if (r.scheduleId === id) {
          r.day = day; r.classId = classId; r.subjectId = subjectId;
          r.teacherId = teacherId; r.startTime = startTime; r.endTime = endTime; r.room = room;
        }
      });
      showAlert("ajadwal-alert", "Jadwal diperbarui.", "success");
    } else {
      list.push({ scheduleId: aUid("SCH"), classId: classId, subjectId: subjectId,
        teacherId: teacherId, day: day, startTime: startTime, endTime: endTime, room: room });
      showAlert("ajadwal-alert", "Jadwal ditambahkan.", "success");
    }
    aSet(A_SCHEDULES_KEY, list);
    resetForm();
    render();
  });
  render();
}

/* ---------- Raport digital (Admin: seluruh siswa) ---------- */
function aStudentById(id) {
  var list = aGet(A_STUDENTS_KEY);
  for (var i = 0; i < list.length; i++) if (list[i].studentId === id) return list[i];
  return null;
}

/* Nilai & absensi satu siswa (dibaca otomatis dari input guru). */
function aNilaiSiswa(studentId) {
  return aGet(A_GRADES_KEY).filter(function (g) { return g.studentId === studentId; })
    .map(function (g) {
      return { mapel: aSubjectName(g.subjectId), tugas: g.tugas, uts: g.uts, uas: g.uas, akhir: g.nilaiAkhir };
    });
}

function aAbsensiSiswa(studentId) {
  var rows = aGet(A_ATTEND_KEY).filter(function (a) { return a.studentId === studentId; });
  var s = { total: rows.length, hadir: 0, izin: 0, sakit: 0, alpa: 0 };
  rows.forEach(function (r) {
    if (r.status === "Hadir") s.hadir++;
    else if (r.status === "Izin") s.izin++;
    else if (r.status === "Sakit") s.sakit++;
    else if (r.status === "Alpa") s.alpa++;
  });
  return s;
}

/* Pembuat raport: nama guru bila teacherId cocok, "Admin" bila tidak. */
function aPembuatRaport(r) {
  var t = aTeacherById(r.teacherId);
  return t ? t.nama : "Admin";
}

function initAdminRaport() {
  var form = document.getElementById("form-raport-admin");
  if (!form) return;
  var selKelas = document.getElementById("ar-kelas");
  var selSiswa = document.getElementById("ar-siswa");

  function isiKelas() {
    selKelas.innerHTML = aGet(A_CLASSES_KEY).map(function (c) {
      return "<option value='" + c.classId + "'>" + aEsc(c.nama) + "</option>";
    }).join("") || "<option value=''>Belum ada kelas</option>";
    var fkelas = document.getElementById("filter-kelas-raport-admin");
    if (fkelas) {
      fkelas.innerHTML = "<option value='semua'>Semua Kelas</option>" + aGet(A_CLASSES_KEY).map(function (c) {
        return "<option value='" + c.classId + "'>" + aEsc(c.nama) + "</option>";
      }).join("");
    }
  }
  isiKelas();

  function isiSiswa() {
    var cid = selKelas.value;
    var daftar = aGet(A_STUDENTS_KEY).filter(function (s) { return !cid || s.classId === cid; });
    selSiswa.innerHTML = daftar.map(function (s) {
      return "<option value='" + s.studentId + "'>" + aEsc(s.nama) + " (" + aEsc(s.nis || "-") + ")</option>";
    }).join("") || "<option value=''>Belum ada siswa di kelas ini</option>";
    pratampil();
  }
  selKelas.addEventListener("change", isiSiswa);
  isiSiswa();

  /* Pratinjau nilai & absensi siswa terpilih (diambil otomatis via ID). */
  function pratampil() {
    var st = aStudentById(selSiswa.value);
    var el = document.getElementById("ar-pratinjau");
    if (!st) { el.innerHTML = "<span class='muted'>Pilih siswa untuk melihat ringkasan nilai &amp; absensi.</span>"; return; }
    var nl = aNilaiSiswa(st.studentId);
    var ab = aAbsensiSiswa(st.studentId);
    el.innerHTML = "<strong>" + aEsc(st.nama) + "</strong> — " + nl.length + " mapel dinilai &bull; " +
      "Hadir " + ab.hadir + "/" + ab.total + " pertemuan." +
      (nl.length ? "<br>" + nl.map(function (n) { return aEsc(n.mapel) + ": " + n.akhir; }).join(" &bull; ") : "<br><span class='muted'>Belum ada nilai untuk siswa ini.</span>");
  }
  selSiswa.addEventListener("change", pratampil);

  function render() {
    var q = (document.getElementById("cari-raport-admin").value || "").toLowerCase();
    var fk = document.getElementById("filter-kelas-raport-admin").value;
    var fs = document.getElementById("filter-status-raport-admin").value;
    var rows = aGet(A_REPORTS_KEY).filter(function (r) {
      var st = aStudentById(r.studentId);
      var nama = st ? (st.nama || "").toLowerCase() : "";
      var okKelas = fk === "semua" || r.classId === fk;
      return okKelas && (fs === "semua" || r.status === fs) && nama.indexOf(q) !== -1;
    });
    document.getElementById("admin-raport-tbody").innerHTML = rows.map(function (r, i) {
      var st = aStudentById(r.studentId);
      var badge = r.status === "Dibagikan" ? "b-green" : "b-yellow";
      var aksiBagikan = r.status === "Dibagikan"
        ? "<button class='btn-small btn-dark' data-adm-rp-tarik='" + r.reportId + "'>Tarik</button> "
        : "<button class='btn-small btn-dark' data-adm-rp-bagi='" + r.reportId + "'>Bagikan ke Siswa</button> ";
      return "<tr><td>" + (i + 1) + "</td><td>" + aEsc(st ? st.nama : "-") + "</td><td>" + aEsc(aClassName(r.classId)) + "</td>" +
        "<td>" + aEsc(r.semester) + "</td><td>" + aEsc(r.tahunAjaran) + "</td><td>" + aEsc(aPembuatRaport(r)) + "</td>" +
        "<td><span class='badge " + badge + "'>" + aEsc(r.status) + "</span></td>" +
        "<td>" + aksiBagikan +
        "<button class='btn-small btn-dark' data-adm-rp-edit='" + r.reportId + "'>Edit</button> " +
        "<button class='btn-danger' data-adm-rp-hapus='" + r.reportId + "'>Hapus</button></td></tr>";
    }).join("") || "<tr><td colspan='8'>Belum ada raport.</td></tr>";
  }
  ["cari-raport-admin", "filter-kelas-raport-admin", "filter-status-raport-admin"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) { el.addEventListener("input", render); el.addEventListener("change", render); }
  });

  function resetForm() {
    form.reset();
    document.getElementById("ar-id").value = "";
    document.getElementById("ar-batal").hidden = true;
    isiSiswa();
  }
  document.getElementById("ar-batal").addEventListener("click", resetForm);

  document.getElementById("admin-raport-tbody").addEventListener("click", function (e) {
    var bagi = e.target.getAttribute && e.target.getAttribute("data-adm-rp-bagi");
    var tarik = e.target.getAttribute && e.target.getAttribute("data-adm-rp-tarik");
    var ed = e.target.getAttribute && e.target.getAttribute("data-adm-rp-edit");
    var del = e.target.getAttribute && e.target.getAttribute("data-adm-rp-hapus");
    var list = aGet(A_REPORTS_KEY);
    if (bagi || tarik) {
      var id = bagi || tarik;
      list.forEach(function (r) { if (r.reportId === id) r.status = bagi ? "Dibagikan" : "Draft"; });
      aSet(A_REPORTS_KEY, list);
      showAlert("araport-alert", bagi ? "Raport dibagikan ke siswa." : "Raport ditarik kembali menjadi Draft.", "success");
      render();
    } else if (ed) {
      var r = null;
      list.forEach(function (x) { if (x.reportId === ed) r = x; });
      if (!r) return;
      selKelas.value = r.classId;
      isiSiswa();
      selSiswa.value = r.studentId;
      document.getElementById("ar-id").value = r.reportId;
      document.getElementById("ar-semester").value = r.semester;
      document.getElementById("ar-tahun").value = r.tahunAjaran;
      document.getElementById("ar-sikap").value = r.sikap || "";
      document.getElementById("ar-perkembangan").value = r.perkembangan || "";
      document.getElementById("ar-catatan").value = r.catatanWali || "";
      document.getElementById("ar-tambahan").value = r.catatanTambahan || "";
      document.getElementById("ar-batal").hidden = false;
      pratampil();
      window.scrollTo(0, 0);
    } else if (del) {
      if (!confirm("Hapus raport ini?")) return;
      aSet(A_REPORTS_KEY, list.filter(function (x) { return x.reportId !== del; }));
      showAlert("araport-alert", "Raport dihapus.", "success");
      render();
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var st = aStudentById(selSiswa.value);
    var semester = document.getElementById("ar-semester").value;
    var tahunAjaran = document.getElementById("ar-tahun").value.trim();
    if (!st) { showAlert("araport-alert", "Pilih siswa terlebih dahulu.", "error"); return; }
    if (!semester || !tahunAjaran) { showAlert("araport-alert", "Semester dan tahun ajaran wajib diisi.", "error"); return; }
    var list = aGet(A_REPORTS_KEY);
    var id = document.getElementById("ar-id").value;
    var data = {
      semester: semester, tahunAjaran: tahunAjaran,
      sikap: document.getElementById("ar-sikap").value.trim(),
      perkembangan: document.getElementById("ar-perkembangan").value.trim(),
      catatanWali: document.getElementById("ar-catatan").value.trim(),
      catatanTambahan: document.getElementById("ar-tambahan").value.trim()
    };
    if (id) {
      list.forEach(function (r) {
        if (r.reportId === id) {
          r.studentId = st.studentId; r.classId = st.classId;
          r.semester = data.semester; r.tahunAjaran = data.tahunAjaran;
          r.sikap = data.sikap; r.perkembangan = data.perkembangan;
          r.catatanWali = data.catatanWali; r.catatanTambahan = data.catatanTambahan;
        }
      });
      showAlert("araport-alert", "Raport berhasil diperbarui.", "success");
    } else {
      /* teacherId diisi wali kelasnya bila ada, supaya raport ikut tampil
         di daftar wali kelas; kosong ("Admin") bila kelas belum punya wali. */
      var cls = aClassById(st.classId);
      var waliId = cls && cls.waliTeacherId ? cls.waliTeacherId : "";
      list.push({ reportId: aUid("RPT"), studentId: st.studentId, teacherId: waliId,
        classId: st.classId, semester: data.semester, tahunAjaran: data.tahunAjaran,
        sikap: data.sikap, perkembangan: data.perkembangan,
        catatanWali: data.catatanWali, catatanTambahan: data.catatanTambahan,
        status: "Draft", createdAt: aToday() });
      showAlert("araport-alert", "Raport Draft berhasil dibuat. Tekan “Bagikan ke Siswa” agar muncul di akun siswa.", "success");
    }
    aSet(A_REPORTS_KEY, list);
    resetForm();
    render();
    initAdminDashboard(aCurrentUser());
  });
  render();
}

/* ---------- Kelola Kegiatan: OSIS, Ekskul, Lomba (tampil di halaman Kegiatan) ---------- */
/* Daftar dibaca dari DB; bila Admin belum menginput, tampilkan default
   dari main.js (EKSKUL_DEFAULT/LOMBA_DEFAULT). Sekali disimpan, DB yang dipakai. */
function aGetEkskul() {
  try {
    var raw = DB.get(A_EKSKUL_KEY);
    if (raw) { var arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; }
  } catch (e) { /* abaikan */ }
  return EKSKUL_DEFAULT.map(function (x) { return Object.assign({}, x); });
}

function aGetLomba() {
  try {
    var raw = DB.get(A_LOMBA_KEY);
    if (raw) { var arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; }
  } catch (e) { /* abaikan */ }
  return LOMBA_DEFAULT.map(function (x) { return Object.assign({}, x); });
}

/* Unggah foto kecil (maks 800px) untuk form kegiatan; hasil di temp var. */
function aBindFotoKegiatan(inputId, noteId, simpan) {
  var input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener("change", function (e) {
    var note = document.getElementById(noteId);
    kecilkanFoto(e.target.files && e.target.files[0], 800, function (dataUrl, galat) {
      e.target.value = "";
      if (galat) { if (note) { note.textContent = galat; note.style.color = "#dc2626"; } simpan(""); return; }
      simpan(dataUrl);
      if (note) { note.textContent = "Foto siap disimpan."; note.style.color = "#16a34a"; }
    });
  });
}

function initAdminKegiatan() {
  if (!document.getElementById("form-osis-admin")) return;

  /* ---- Info OSIS ---- */
  var aoFotoBaru = "";
  var cur = getOsis();
  var selAkun = document.getElementById("ao-akun");
  document.getElementById("ao-nama").value = cur.ketua;
  document.getElementById("ao-periode").value = cur.periode;
  document.getElementById("ao-visi").value = cur.visi;
  document.getElementById("ao-proker").value = cur.proker.join("\n");
  aBindFotoKegiatan("ao-foto", "ao-foto-note", function (v) { aoFotoBaru = v; });

  /* Dropdown akun siswa (dikelompokkan per kelas). */
  function isiAkunOsis() {
    var terpilih = selAkun.value || cur.ketuaId || "";
    var siswa = aGet(A_STUDENTS_KEY);
    var kelas = aGet(A_CLASSES_KEY);
    var html = "<option value=''>-- Pilih siswa --</option>";
    kelas.forEach(function (k) {
      var anggota = siswa.filter(function (s) { return s.classId === k.classId; });
      if (!anggota.length) return;
      html += "<optgroup label='" + aEsc(k.nama) + "'>";
      anggota.forEach(function (s) {
        html += "<option value='" + aEsc(s.studentId) + "'>" + aEsc(s.nama) + " (" + aEsc(s.nis || "-") + ")</option>";
      });
      html += "</optgroup>";
    });
    var tanpa = siswa.filter(function (s) { return !s.classId || !aClassById(s.classId); });
    if (tanpa.length) {
      html += "<optgroup label='Tanpa Kelas'>";
      tanpa.forEach(function (s) {
        html += "<option value='" + aEsc(s.studentId) + "'>" + aEsc(s.nama) + " (" + aEsc(s.nis || "-") + ")</option>";
      });
      html += "</optgroup>";
    }
    selAkun.innerHTML = html;
    if (terpilih) selAkun.value = terpilih;
  }

  document.getElementById("form-osis-admin").addEventListener("submit", function (e) {
    e.preventDefault();
    var ketua = document.getElementById("ao-nama").value.trim();
    var periode = document.getElementById("ao-periode").value.trim();
    var visi = document.getElementById("ao-visi").value.trim();
    var proker = document.getElementById("ao-proker").value.split("\n").map(function (s) { return s.trim(); }).filter(function (s) { return s; });
    if (!ketua || !periode) { showAlert("ao-alert", "Nama ketua dan periode wajib diisi.", "error"); return; }
    var data = getOsis();
    data.ketua = ketua; data.periode = periode; data.visi = visi;
    data.proker = proker.length ? proker : OSIS_DEFAULT.proker.slice();
    if (aoFotoBaru) data.foto = aoFotoBaru;

    /* Tautkan ke AKUN siswa agar info Ketua OSIS tampil di akunnya. */
    var st = aGet(A_STUDENTS_KEY).filter(function (s) { return s.studentId === selAkun.value; })[0];
    if (!st && ketua) {
      var kt = ketua.toLowerCase();
      st = aGet(A_STUDENTS_KEY).filter(function (s) { return (s.nama || "").toLowerCase() === kt; })[0];
    }
    var akun = st ? aGet(A_USERS_KEY).filter(function (u) {
      return (st.userId && u.id === st.userId) ||
        (u.username && String(u.username) === String(st.nis || "")) ||
        (u.email && st.email && String(u.email).toLowerCase() === String(st.email).toLowerCase());
    })[0] : null;
    data.ketuaId = st ? st.studentId : "";
    data.ketuaUserId = (akun && akun.id) || (st && st.userId) || "";
    data.ketuaNis = st ? (st.nis || "") : "";

    DB.set(A_OSIS_KEY, JSON.stringify(data));
    aoFotoBaru = "";
    document.getElementById("ao-foto-note").textContent = "";
    showAlert("ao-alert", st
      ? "Info OSIS disimpan. " + st.nama + " akan melihat info Ketua OSIS di akunnya."
      : "Info OSIS disimpan dan tampil di halaman Kegiatan.", "success");
  });

  isiAkunOsis();
  document.addEventListener("edusmart:siswa-berubah", isiAkunOsis);
  selAkun.addEventListener("focus", isiAkunOsis);
  document.querySelectorAll('a[href="#kegiatan"]').forEach(function (a) { a.addEventListener("click", isiAkunOsis); });

  /* ---- Ekstrakurikuler ---- */
  var akFotoBaru = "";
  aBindFotoKegiatan("ak-foto", "ak-foto-note", function (v) { akFotoBaru = v; });
  function renderEkskul() {
    document.getElementById("admin-ekskul-tbody").innerHTML = aGetEkskul().map(function (k, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + aEsc(k.nama) + "</td><td>" + aEsc(k.tag) + "</td><td>" + aEsc(k.jadwal) + "</td>" +
        "<td><button class='btn-small btn-dark' data-adm-eks-edit='" + k.id + "'>Edit</button> " +
        "<button class='btn-danger' data-adm-eks-hapus='" + k.id + "'>Hapus</button></td></tr>";
    }).join("") || "<tr><td colspan='5'>Belum ada ekstrakurikuler.</td></tr>";
  }
  function resetEkskul() {
    document.getElementById("form-ekskul-admin").reset();
    document.getElementById("ak-id").value = "";
    document.getElementById("ak-foto-note").textContent = "";
    akFotoBaru = "";
    document.getElementById("ak-batal").hidden = true;
  }
  document.getElementById("ak-batal").addEventListener("click", resetEkskul);
  document.getElementById("admin-ekskul-tbody").addEventListener("click", function (e) {
    var ed = e.target.getAttribute && e.target.getAttribute("data-adm-eks-edit");
    var del = e.target.getAttribute && e.target.getAttribute("data-adm-eks-hapus");
    var list = aGetEkskul();
    if (ed) {
      var r = null;
      list.forEach(function (x) { if (x.id === ed) r = x; });
      if (!r) return;
      document.getElementById("ak-id").value = r.id;
      document.getElementById("ak-nama").value = r.nama || "";
      document.getElementById("ak-tag").value = r.tag || "";
      document.getElementById("ak-deskripsi").value = r.deskripsi || "";
      document.getElementById("ak-jadwal").value = r.jadwal || "";
      document.getElementById("ak-pembina").value = r.pembina || "";
      document.getElementById("ak-batal").hidden = false;
      window.scrollTo(0, 0);
    } else if (del) {
      if (!confirm("Hapus ekstrakurikuler ini dari halaman Kegiatan?")) return;
      aSet(A_EKSKUL_KEY, list.filter(function (x) { return x.id !== del; }));
      showAlert("ak-alert", "Ekstrakurikuler dihapus.", "success");
      renderEkskul();
    }
  });
  document.getElementById("form-ekskul-admin").addEventListener("submit", function (e) {
    e.preventDefault();
    var nama = document.getElementById("ak-nama").value.trim();
    if (!nama) { showAlert("ak-alert", "Nama ekstrakurikuler wajib diisi.", "error"); return; }
    var list = aGetEkskul();
    var id = document.getElementById("ak-id").value;
    var data = {
      nama: nama,
      tag: document.getElementById("ak-tag").value.trim() || "Ekstrakurikuler",
      deskripsi: document.getElementById("ak-deskripsi").value.trim(),
      jadwal: document.getElementById("ak-jadwal").value.trim(),
      pembina: document.getElementById("ak-pembina").value.trim()
    };
    if (id) {
      var ketemu = false;
      list.forEach(function (x) {
        if (x.id === id) {
          ketemu = true;
          x.nama = data.nama; x.tag = data.tag; x.deskripsi = data.deskripsi;
          x.jadwal = data.jadwal; x.pembina = data.pembina;
          if (akFotoBaru) x.foto = akFotoBaru;
        }
      });
      if (!ketemu) { showAlert("ak-alert", "Data tidak ditemukan.", "error"); return; }
      showAlert("ak-alert", "Ekstrakurikuler diperbarui.", "success");
    } else {
      list.push({ id: aUid("EKS"), nama: data.nama, tag: data.tag, deskripsi: data.deskripsi,
        jadwal: data.jadwal, pembina: data.pembina, foto: akFotoBaru });
      showAlert("ak-alert", "Ekstrakurikuler ditambahkan.", "success");
    }
    aSet(A_EKSKUL_KEY, list);
    resetEkskul();
    renderEkskul();
  });
  renderEkskul();

  /* ---- Lomba ---- */
  var alFotoBaru = "";
  aBindFotoKegiatan("al-foto", "al-foto-note", function (v) { alFotoBaru = v; });
  function renderLomba() {
    document.getElementById("admin-lomba-tbody").innerHTML = aGetLomba().map(function (l, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + aEsc(l.judul) + "</td><td>" + aEsc(l.tag) + "</td>" +
        "<td><button class='btn-small btn-dark' data-adm-lomba-edit='" + l.id + "'>Edit</button> " +
        "<button class='btn-danger' data-adm-lomba-hapus='" + l.id + "'>Hapus</button></td></tr>";
    }).join("") || "<tr><td colspan='4'>Belum ada lomba.</td></tr>";
  }
  function resetLomba() {
    document.getElementById("form-lomba-admin").reset();
    document.getElementById("al-id").value = "";
    document.getElementById("al-foto-note").textContent = "";
    alFotoBaru = "";
    document.getElementById("al-batal").hidden = true;
  }
  document.getElementById("al-batal").addEventListener("click", resetLomba);
  document.getElementById("admin-lomba-tbody").addEventListener("click", function (e) {
    var ed = e.target.getAttribute && e.target.getAttribute("data-adm-lomba-edit");
    var del = e.target.getAttribute && e.target.getAttribute("data-adm-lomba-hapus");
    var list = aGetLomba();
    if (ed) {
      var r = null;
      list.forEach(function (x) { if (x.id === ed) r = x; });
      if (!r) return;
      document.getElementById("al-id").value = r.id;
      document.getElementById("al-judul").value = r.judul || "";
      document.getElementById("al-tag").value = r.tag || "";
      document.getElementById("al-deskripsi").value = r.deskripsi || "";
      document.getElementById("al-batal").hidden = false;
      window.scrollTo(0, 0);
    } else if (del) {
      if (!confirm("Hapus lomba ini dari halaman Kegiatan?")) return;
      aSet(A_LOMBA_KEY, list.filter(function (x) { return x.id !== del; }));
      showAlert("al-alert", "Lomba dihapus.", "success");
      renderLomba();
    }
  });
  document.getElementById("form-lomba-admin").addEventListener("submit", function (e) {
    e.preventDefault();
    var judul = document.getElementById("al-judul").value.trim();
    if (!judul) { showAlert("al-alert", "Judul lomba wajib diisi.", "error"); return; }
    var list = aGetLomba();
    var id = document.getElementById("al-id").value;
    var tag = document.getElementById("al-tag").value.trim() || "Lomba";
    var deskripsi = document.getElementById("al-deskripsi").value.trim();
    if (id) {
      var ketemu = false;
      list.forEach(function (x) {
        if (x.id === id) { ketemu = true; x.judul = judul; x.tag = tag; x.deskripsi = deskripsi; if (alFotoBaru) x.foto = alFotoBaru; }
      });
      if (!ketemu) { showAlert("al-alert", "Data tidak ditemukan.", "error"); return; }
      showAlert("al-alert", "Lomba diperbarui.", "success");
    } else {
      list.push({ id: aUid("LMB"), judul: judul, tag: tag, deskripsi: deskripsi, foto: alFotoBaru });
      showAlert("al-alert", "Lomba ditambahkan.", "success");
    }
    aSet(A_LOMBA_KEY, list);
    resetLomba();
    renderLomba();
  });
  renderLomba();
}

/* ---------- Navigasi admin ---------- */
function bindAdminNav() {
  var toggle = document.getElementById("sideToggle");
  var sidebar = document.getElementById("sidebar");
  if (toggle && sidebar) {
    toggle.addEventListener("click", function () { sidebar.classList.toggle("open"); });
    sidebar.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { sidebar.classList.remove("open"); });
    });
  }
  document.querySelectorAll("#btn-logout").forEach(function (b) {
    b.addEventListener("click", function () {
      DB.del("edusmart_session");
      DB.del(A_CU_KEY);
      window.location.href = "login.html";
    });
  });
  var el = document.getElementById("nav-admin-nama");
  var cu = aCurrentUser();
  if (el && cu) el.textContent = "Halo, " + cu.nama;
}

/* ---------- Kelola Galeri ---------- */
function initAdminGaleri() {
  var form = document.getElementById("form-galeri-admin");
  if (!form) return;
  var tbody = document.getElementById("admin-galeri-tbody");
  var cari = document.getElementById("cari-admin-galeri");

  function render() {
    var q = ((cari && cari.value) || "").toLowerCase();
    var arr = getGaleriCustom().filter(function (c) {
      return !q || (c.judul || "").toLowerCase().indexOf(q) !== -1;
    });
    if (!arr.length) {
      tbody.innerHTML = "<tr><td colspan='4'>Belum ada foto tambahan. Foto bawaan bisa diganti di halaman <a href='galeri.html'>Galeri</a>.</td></tr>";
      return;
    }
    tbody.innerHTML = arr.map(function (c) {
      return "<tr>" +
        "<td><img src='" + c.file + "' alt='' style='width:72px;height:54px;object-fit:cover;border-radius:6px'></td>" +
        "<td>" + escKegiatan(c.judul) + "</td>" +
        "<td>" + escKegiatan(GALERI_LABEL[c.kategori] || c.kategori || "-") + "</td>" +
        "<td><button type='button' class='btn-reset' data-galeri-admin-hapus='" + escKegiatan(c.id) + "'>Hapus</button></td>" +
        "</tr>";
    }).join("");
  }

  if (cari) cari.addEventListener("input", render);

  tbody.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-galeri-admin-hapus]") : null;
    if (!btn) return;
    if (!window.confirm("Hapus foto ini dari galeri?")) return;
    hapusGaleriCustom(btn.getAttribute("data-galeri-admin-hapus"));
    showAlert("agal-alert", "Foto dihapus dari galeri.", "success");
    render();
  });

  pasangFormTambahGaleri({
    formId: "form-galeri-admin", judulId: "agal-judul", kategoriId: "agal-kategori",
    deskripsiId: "agal-deskripsi", fileId: "agal-file", noteId: "agal-file-note",
    onSukses: function () { showAlert("agal-alert", "Foto berhasil ditambahkan ke galeri.", "success"); render(); }
  });

  render();
}

/* ---------- Kelola Beasiswa ---------- */
function initAdminBeasiswa() {
  var form = document.getElementById("form-beasiswa-admin");
  if (!form) return;
  var selSiswa = document.getElementById("abs-siswa");
  var tbody = document.getElementById("admin-beasiswa-tbody");
  var cari = document.getElementById("cari-admin-beasiswa");

  /* Isi dropdown siswa dikelompokkan per kelas. */
  function isiSiswa() {
    var terpilih = selSiswa.value;
    var siswa = aGet(A_STUDENTS_KEY);
    var kelas = aGet(A_CLASSES_KEY);
    var html = "<option value=''>-- Pilih Siswa --</option>";
    kelas.forEach(function (k) {
      var anggota = siswa.filter(function (s) { return s.classId === k.classId; });
      if (!anggota.length) return;
      html += "<optgroup label='" + aEsc(k.nama) + "'>";
      anggota.forEach(function (s) {
        html += "<option value='" + aEsc(s.studentId) + "'>" + aEsc(s.nama) + " (" + aEsc(s.nis || "-") + ")</option>";
      });
      html += "</optgroup>";
    });
    var tanpa = siswa.filter(function (s) { return !s.classId || !aClassById(s.classId); });
    if (tanpa.length) {
      html += "<optgroup label='Tanpa Kelas'>";
      tanpa.forEach(function (s) {
        html += "<option value='" + aEsc(s.studentId) + "'>" + aEsc(s.nama) + " (" + aEsc(s.nis || "-") + ")</option>";
      });
      html += "</optgroup>";
    }
    selSiswa.innerHTML = html;
    if (terpilih) selSiswa.value = terpilih;
  }

  function render() {
    var q = ((cari && cari.value) || "").toLowerCase();
    var arr = aGet(A_BEASISWA_KEY).filter(function (b) {
      return !q || (b.nama || "").toLowerCase().indexOf(q) !== -1 || (b.namaBeasiswa || "").toLowerCase().indexOf(q) !== -1;
    });
    if (!arr.length) {
      tbody.innerHTML = "<tr><td colspan='7'>Belum ada beasiswa yang diberikan.</td></tr>";
      return;
    }
    tbody.innerHTML = arr.map(function (b, i) {
      return "<tr>" +
        "<td>" + (i + 1) + "</td>" +
        "<td>" + aEsc(b.nama) + "<br><span class='muted' style='font-size:.8rem'>" + aEsc(b.nis || "-") + "</span></td>" +
        "<td>" + aEsc(aClassName(b.classId)) + "</td>" +
        "<td>" + aEsc(b.namaBeasiswa) + (b.nominal ? "<br><span class='muted' style='font-size:.8rem'>" + aEsc(b.nominal) + "</span>" : "") + "</td>" +
        "<td>" + aEsc(b.tahun || "-") + "</td>" +
        "<td>" + (b.dibaca ? "Sudah" : "<span class='tag'>Belum</span>") + "</td>" +
        "<td><button type='button' class='btn-reset' data-beasiswa-hapus='" + aEsc(b.id) + "'>Hapus</button></td>" +
        "</tr>";
    }).join("");
  }

  if (cari) cari.addEventListener("input", render);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var sid = selSiswa.value;
    var st = aGet(A_STUDENTS_KEY).filter(function (s) { return s.studentId === sid; })[0];
    var namaBeasiswa = document.getElementById("abs-nama").value.trim();
    if (!st) { showAlert("abs-alert", "Pilih siswa penerima terlebih dahulu.", "error"); return; }
    if (!namaBeasiswa) { showAlert("abs-alert", "Nama beasiswa wajib diisi.", "error"); return; }
    /* Tautkan ke AKUN siswa (userId), bukan hanya data siswa, agar terbaca saat login. */
    var akun = aGet(A_USERS_KEY).filter(function (u) {
      return (st.userId && u.id === st.userId) ||
        (u.username && String(u.username) === String(st.nis || "")) ||
        (u.email && st.email && String(u.email).toLowerCase() === String(st.email).toLowerCase());
    })[0];
    var arr = aGet(A_BEASISWA_KEY);
    arr.unshift({
      id: aUid("BSW"),
      studentId: st.studentId, userId: (akun && akun.id) || st.userId || "",
      nis: st.nis || "", username: (akun && akun.username) || st.nis || "",
      nama: st.nama || "", classId: st.classId || "",
      namaBeasiswa: namaBeasiswa,
      jenis: document.getElementById("abs-jenis").value,
      nominal: document.getElementById("abs-nominal").value.trim(),
      tahun: document.getElementById("abs-tahun").value.trim(),
      keterangan: document.getElementById("abs-keterangan").value.trim(),
      tanggal: aToday(), dibaca: false, createdAt: new Date().toISOString()
    });
    aSet(A_BEASISWA_KEY, arr);
    form.reset();
    isiSiswa();
    showAlert("abs-alert", "Beasiswa untuk " + st.nama + " tersimpan. Siswa akan melihat pemberitahuan di akunnya.", "success");
    render();
  });

  tbody.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-beasiswa-hapus]") : null;
    if (!btn) return;
    if (!window.confirm("Hapus data beasiswa ini?")) return;
    aSet(A_BEASISWA_KEY, aGet(A_BEASISWA_KEY).filter(function (b) { return b.id !== btn.getAttribute("data-beasiswa-hapus"); }));
    showAlert("abs-alert", "Data beasiswa dihapus.", "success");
    render();
  });

  isiSiswa();
  render();

  /* Segarkan daftar siswa saat berubah / saat bagian ini dibuka. */
  document.addEventListener("edusmart:siswa-berubah", isiSiswa);
  selSiswa.addEventListener("focus", isiSiswa);
  document.querySelectorAll('a[href="#beasiswa"]').forEach(function (a) { a.addEventListener("click", isiSiswa); });
}

/* ---------- Init ---------- */
window.EduSmartReady(function () {
  aSeed();
  var guard = document.body ? document.body.getAttribute("data-guard") : null;
  if (guard !== "admin") return;
  var cu = requireAdmin();
  if (!cu) return;
  bindAdminNav();
  initAdminDashboard(cu);
  initAdminTambahSiswa();
  initTombolAcak();
  initAdminSiswa();
  initAdminGuru();
  initAdminKelas();
  initAdminJurusan();
  initAdminMapel();
  initAdminJadwal();
  initAdminRaport();
  initAdminKegiatan();
  initAdminGaleri();
  initAdminBeasiswa();
});
