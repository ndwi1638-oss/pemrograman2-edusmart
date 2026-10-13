-- ===========================================================================
-- EduSmart - Query Laporan
-- ---------------------------------------------------------------------------
-- Cara pakai di DB Browser for SQLite:
--   1. Open Database -> data\edusmart.db
--   2. Database -> Run SQL Script... -> pilih berkas ini -> Run
--   (atau tekan Ctrl+Enter pada tiap query di tab Execute SQL)
--
-- SEMUA query di bawah hanya berisi SELECT (aman, tidak mengubah data).
-- Catatan: nama kolom memakai snake_case (class_id, nis, nilai_akhir),
--           berbeda dengan nama field di JavaScript (classId, nilaiAkhir).
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. REKAP SISWA: jumlah siswa per kelas
-- ---------------------------------------------------------------------------
SELECT c.nama        AS kelas,
       c.tingkat     AS tingkat,
       c.jurusan     AS jurusan,
       COUNT(s.student_id) AS jumlah_siswa
FROM classes c
LEFT JOIN students s ON s.class_id = c.class_id
GROUP BY c.class_id, c.nama, c.tingkat, c.jurusan
ORDER BY c.tingkat, c.jurusan, c.nama;


-- ---------------------------------------------------------------------------
-- 2. WALI KELAS: wali yang diunjuk tiap kelas
-- ---------------------------------------------------------------------------
SELECT c.nama AS kelas,
       t.nama AS wali_kelas,
       t.nip
FROM classes c
LEFT JOIN teachers t ON t.wali_class_id = c.class_id
ORDER BY c.nama;


-- ---------------------------------------------------------------------------
-- 3. GURU MATA PELAJARAN: mapel yang diampu + jumlah kelas
-- ---------------------------------------------------------------------------
SELECT t.nama AS guru,
       GROUP_CONCAT(DISTINCT s.nama) AS mapel,
       COUNT(DISTINCT tc.class_id)    AS jumlah_kelas
FROM teachers t
LEFT JOIN teacher_subjects ts ON ts.teacher_id = t.teacher_id
LEFT JOIN subjects s         ON s.subject_id   = ts.subject_id
LEFT JOIN teacher_classes tc ON tc.teacher_id  = t.teacher_id
WHERE t.jenis_guru = 'guru_mapel'
GROUP BY t.teacher_id, t.nama
ORDER BY t.nama;


-- ---------------------------------------------------------------------------
-- 4. NILAI SISWA + PREDIKAT
--    nilai akhir = (tugas 30% + UTS 30% + UAS 40%)
-- ---------------------------------------------------------------------------
SELECT st.nama AS siswa,
       c.nama  AS kelas,
       s.nama  AS mapel,
       g.tugas, g.uts, g.uas,
       g.nilai_akhir,
       CASE WHEN g.nilai_akhir >= 90 THEN 'A'
            WHEN g.nilai_akhir >= 80 THEN 'B'
            WHEN g.nilai_akhir >= 70 THEN 'C'
            ELSE 'D' END AS predikat
FROM grades g
JOIN students st ON st.student_id = g.student_id
JOIN classes  c  ON c.class_id     = g.class_id
JOIN subjects s  ON s.subject_id   = g.subject_id
ORDER BY c.nama, st.nama, s.nama;


-- ---------------------------------------------------------------------------
-- 5. REKAP ABSENSI per siswa
-- ---------------------------------------------------------------------------
SELECT c.nama AS kelas,
       st.nama AS siswa,
       SUM(CASE WHEN a.status = 'Hadir' THEN 1 ELSE 0 END) AS hadir,
       SUM(CASE WHEN a.status = 'Izin'  THEN 1 ELSE 0 END) AS izin,
       SUM(CASE WHEN a.status = 'Sakit' THEN 1 ELSE 0 END) AS sakit,
       SUM(CASE WHEN a.status = 'Alpa'   THEN 1 ELSE 0 END) AS alpa,
       COUNT(a.attendance_id) AS total_pertemuan
FROM attendance a
JOIN students st ON st.student_id = a.student_id
JOIN classes  c  ON c.class_id     = a.class_id
GROUP BY st.student_id, st.nama, c.nama
ORDER BY c.nama, st.nama;


-- ---------------------------------------------------------------------------
-- 6. TUGAS + berapa siswa yang sudah mengumpulkan
-- ---------------------------------------------------------------------------
SELECT c.nama  AS kelas,
       s.nama  AS mapel,
       t.title,
       t.deadline,
       COUNT(sb.submission_id) AS sudah_kumpul,
       (SELECT COUNT(*) FROM students x WHERE x.class_id = t.class_id) AS jumlah_siswa
FROM tasks t
JOIN classes  c ON c.class_id   = t.class_id
JOIN subjects s ON s.subject_id = t.subject_id
LEFT JOIN submissions sb ON sb.task_id = t.task_id
GROUP BY t.task_id
ORDER BY c.nama, t.deadline;


-- ---------------------------------------------------------------------------
-- 7. JADWAL MINGGUAN satu kelas (ganti 'XI IPA 2' sesuai kebutuhan)
-- ---------------------------------------------------------------------------
SELECT sc.day AS hari,
       sc.start_time || '-' || sc.end_time AS jam,
       s.nama AS mapel,
       t.nama AS guru,
       sc.room AS ruang
FROM schedules sc
JOIN subjects s         ON s.subject_id  = sc.subject_id
LEFT JOIN teachers t    ON t.teacher_id  = sc.teacher_id
WHERE sc.class_id = (SELECT class_id FROM classes WHERE nama = 'XI IPA 2')
ORDER BY CASE sc.day WHEN 'Senin' THEN 1 WHEN 'Selasa' THEN 2 WHEN 'Rabu' THEN 3
                     WHEN 'Kamis' THEN 4 WHEN 'Jumat' THEN 5 ELSE 6 END,
         sc.start_time;


-- ---------------------------------------------------------------------------
-- 8. RAPORT: raport siswa yang sudah dibagikan wali kelas
-- ---------------------------------------------------------------------------
SELECT st.nama AS siswa,
       c.nama  AS kelas,
       r.semester,
       r.tahun_ajaran,
       r.status,
       r.sikap,
       r.perkembangan,
       r.catatan_wali
FROM reports r
JOIN students st ON st.student_id = r.student_id
JOIN classes  c  ON c.class_id     = r.class_id
ORDER BY c.nama, st.nama, r.semester;


-- ---------------------------------------------------------------------------
-- 9. VERIFIKASI: akun yang masih menunggu persetujuan Admin
-- ---------------------------------------------------------------------------
SELECT nama, email, role, nis, nip
FROM users
WHERE status = 'menunggu'
ORDER BY role, nama;


-- ---------------------------------------------------------------------------
-- 10. DATA DUMP: isi semua tabel inti (untik laporan/kelengkapan)
-- ---------------------------------------------------------------------------
SELECT 'kelas'    AS tabel, COUNT(*) AS jumlah FROM classes
UNION ALL SELECT 'mata pelajaran',  COUNT(*) FROM subjects
UNION ALL SELECT 'guru',             COUNT(*) FROM teachers
UNION ALL SELECT 'siswa',            COUNT(*) FROM students
UNION ALL SELECT 'jadwal',           COUNT(*) FROM schedules
UNION ALL SELECT 'materi',           COUNT(*) FROM materials
UNION ALL SELECT 'tugas',            COUNT(*) FROM tasks
UNION ALL SELECT 'nilai',            COUNT(*) FROM grades
UNION ALL SELECT 'absensi',          COUNT(*) FROM attendance
UNION ALL SELECT 'raport',           COUNT(*) FROM reports
UNION ALL SELECT 'pengumpulan',      COUNT(*) FROM submissions
UNION ALL SELECT 'akun (users)',     COUNT(*) FROM users;
