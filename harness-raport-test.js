/* Harness sementara: uji logika raport guru/admin tanpa browser. */
"use strict";
const fs = require("fs");
const vm = require("vm");

global.window = { scrollTo: function () {} };
global.document = {
  addEventListener: function () {},
  getElementById: function () { return null; },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; }
};

var db = {};
global.DB = {
  get: function (k) { return Object.prototype.hasOwnProperty.call(db, k) ? db[k] : null; },
  set: function (k, v) { db[k] = (v === undefined || v === null) ? null : String(v); },
  del: function (k) { delete db[k]; }
};
function setJ(k, v) { DB.set(k, JSON.stringify(v)); }

/* --- Data uji --- */
setJ("edusmart_users", [
  { id: "u-s1", username: "1001", nama: "Siswa Satu", email: "s1@mail.id", role: "siswa", status: "aktif" }
]);
setJ("edusmart_classes", [
  { classId: "C1", nama: "X IPA 1", waliTeacherId: "T-WALI" },
  { classId: "C2", nama: "X IPS 1", waliTeacherId: "" }
]);
setJ("edusmart_teachers", [
  { teacherId: "T-WALI", userId: "u-w", nama: "Wali Wati", nip: "1", jenisGuru: "wali_kelas", waliClassId: "C1", classIds: ["C1"], subjectIds: [] },
  { teacherId: "T-MAPEL", userId: "u-m", nama: "Mapel Budi", nip: "2", jenisGuru: "guru_mapel", waliClassId: "", classIds: ["C1", "C2"], subjectIds: ["SUB-MTK"] }
]);
setJ("edusmart_students", [
  { studentId: "S1", userId: "u-s1", nama: "Siswa Satu", nis: "1001", email: "s1@mail.id", classId: "C1" },
  { studentId: "S2", userId: "", nama: "Siswa Dua", nis: "1002", email: "", classId: "C2" }
]);
setJ("edusmart_subjects", [{ subjectId: "SUB-MTK", nama: "Matematika", track: "Bersama" }]);
setJ("edusmart_grades", []);
setJ("edusmart_attendance", []);
setJ("edusmart_reports", [
  { reportId: "R-ADM", studentId: "S2", teacherId: "", classId: "C2", semester: "1", tahunAjaran: "2026/2027", sikap: "Baik", perkembangan: "-", catatanWali: "-", catatanTambahan: "", status: "Dibagikan", createdAt: "2026-10-01" },
  { reportId: "R-MAPEL", studentId: "S1", teacherId: "T-MAPEL", classId: "C1", semester: "1", tahunAjaran: "2026/2027", sikap: "Baik", perkembangan: "-", catatanWali: "-", catatanTambahan: "", status: "Dibagikan", createdAt: "2026-10-01" },
  { reportId: "R-WALI", studentId: "S1", teacherId: "T-WALI", classId: "C1", semester: "1", tahunAjaran: "2026/2027", sikap: "Baik", perkembangan: "-", catatanWali: "-", catatanTambahan: "", status: "Dibagikan", createdAt: "2026-10-01" }
]);

vm.runInThisContext(fs.readFileSync("js/main.js", "utf8"), { filename: "main.js" });
vm.runInThisContext(fs.readFileSync("js/guru.js", "utf8"), { filename: "guru.js" });

var gagal = 0;
function cek(nama, aktual, harap) {
  var ok = JSON.stringify(aktual) === JSON.stringify(harap);
  console.log((ok ? "OK  " : "FAIL") + " " + nama + (ok ? "" : " | dapat=" + JSON.stringify(aktual) + " harap=" + JSON.stringify(harap)));
  if (!ok) gagal++;
}

var mapel = teacherById("T-MAPEL");
var wali = teacherById("T-WALI");
cek("mapel menjangkau S1+S2", siswaTerjangkau(mapel).map(function (s) { return s.studentId; }).sort(), ["S1", "S2"]);
cek("wali menjangkau S1", siswaTerjangkau(wali).map(function (s) { return s.studentId; }), ["S1"]);

/* S2 login pakai NIS 1002? S2 tak punya user; uji via S1 (punya user u-s1/nis 1001). */
var r1 = raportDibagikanUntuk("1001").filter(function (r) { return r.reportId === "R-MAPEL"; })[0];
cek("raport mapel tampil ke siswa", !!r1, true);
cek("namaWali raport mapel = wali kelas", r1 && r1.namaWali, "Wali Wati");
var r2 = raportDibagikanUntuk("1001").filter(function (r) { return r.reportId === "R-WALI"; })[0];
cek("namaWali raport wali tetap", r2 && r2.namaWali, "Wali Wati");

/* S2 tanpa akun: panggil Lawson langsung via studentId dengan membuat user sementara. */
db["edusmart_users"] = JSON.stringify(JSON.parse(db["edusmart_users"]).concat(
  [{ id: "u-s2", username: "1002", nama: "Siswa Dua", email: "", role: "siswa", status: "aktif" }]));
var listS = JSON.parse(db["edusmart_students"]); listS[1].userId = "u-s2"; db["edusmart_students"] = JSON.stringify(listS);
var r3 = raportDibagikanUntuk("1002").filter(function (r) { return r.reportId === "R-ADM"; })[0];
cek("raport admin tampil ke siswa", !!r3, true);
cek("namaWali raport admin (kelas tanpa wali) = Admin", r3 && r3.namaWali, "Admin");

console.log(gagal ? ("GAGAL: " + gagal) : "SEMUA UJI LOLOS");
process.exit(gagal ? 1 : 0);
