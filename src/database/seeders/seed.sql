-- Seed Data untuk Ujian SEGAK

-- 1. Sekolah
INSERT OR IGNORE INTO schools (id, name, code, address, state, created_at, updated_at) VALUES
(1, 'SK Seri Bintang Utama', 'BBA1234', 'Jalan Seri Bintang, Kuala Lumpur', 'W.P. Kuala Lumpur', strftime('%s', 'now'), strftime('%s', 'now'));

-- 2. Pengguna & Profil (Password Hash generated via Hash.make)
-- Admin (admin@segak.moe.edu.my / 123456)
INSERT OR REPLACE INTO smartfit_app_users (id, username, email, password_hash, role, status, created_at, updated_at) VALUES
(1, 'admin@segak.moe.edu.my', 'admin@segak.moe.edu.my', 'a56c1409204e2c13705201000c367c7c0a41e59340cf5b58e7bbe9b9bdc5a091', 'admin', 'active', strftime('%s', 'now'), strftime('%s', 'now'));

-- Guru (g-60579088@moe-dl.edu.my / 123456)
INSERT OR REPLACE INTO smartfit_app_users (id, username, email, password_hash, role, status, created_at, updated_at) VALUES
(2, 'g-60579088@moe-dl.edu.my', 'g-60579088@moe-dl.edu.my', 'a56c1409204e2c13705201000c367c7c0a41e59340cf5b58e7bbe9b9bdc5a091', 'teacher', 'active', strftime('%s', 'now'), strftime('%s', 'now'));

INSERT OR IGNORE INTO teacher_profiles (id, user_id, school_id, full_name, phone, created_at, updated_at) VALUES
(1, 2, 1, 'Cikgu Ahmad bin Razali', '012-3456789', strftime('%s', 'now'), strftime('%s', 'now'));

-- Murid (M1001 - M1005 / 123456)
INSERT OR REPLACE INTO smartfit_app_users (id, username, email, password_hash, role, status, created_at, updated_at) VALUES
(3, 'M1001', 'm1001@student.edu.my', 'a56c1409204e2c13705201000c367c7c0a41e59340cf5b58e7bbe9b9bdc5a091', 'student', 'active', strftime('%s', 'now'), strftime('%s', 'now')),
(4, 'M1002', 'm1002@student.edu.my', 'a56c1409204e2c13705201000c367c7c0a41e59340cf5b58e7bbe9b9bdc5a091', 'student', 'active', strftime('%s', 'now'), strftime('%s', 'now')),
(5, 'M1003', 'm1003@student.edu.my', 'a56c1409204e2c13705201000c367c7c0a41e59340cf5b58e7bbe9b9bdc5a091', 'student', 'active', strftime('%s', 'now'), strftime('%s', 'now')),
(6, 'M1004', 'm1004@student.edu.my', 'a56c1409204e2c13705201000c367c7c0a41e59340cf5b58e7bbe9b9bdc5a091', 'student', 'active', strftime('%s', 'now'), strftime('%s', 'now')),
(7, 'M1005', 'm1005@student.edu.my', 'a56c1409204e2c13705201000c367c7c0a41e59340cf5b58e7bbe9b9bdc5a091', 'student', 'active', strftime('%s', 'now'), strftime('%s', 'now'));

INSERT OR IGNORE INTO student_profiles (id, user_id, school_id, student_id_num, full_name, gender, dob, height_cm, weight_kg, created_at, updated_at) VALUES
(1, 3, 1, 'M1001', 'Amirul bin Asyraf', 'L', '2015-04-12', 138.5, 34.0, strftime('%s', 'now'), strftime('%s', 'now')),
(2, 4, 1, 'M1002', 'Siti Nurhaliza binti Ali', 'P', '2015-06-25', 135.0, 31.5, strftime('%s', 'now'), strftime('%s', 'now')),
(3, 5, 1, 'M1003', 'Danial bin Hakimi', 'L', '2015-01-15', 140.0, 38.0, strftime('%s', 'now'), strftime('%s', 'now')),
(4, 6, 1, 'M1004', 'Aina Zulaikha binti Zamri', 'P', '2015-09-08', 132.0, 29.0, strftime('%s', 'now'), strftime('%s', 'now')),
(5, 7, 1, 'M1005', 'Muhammad Harith bin Imran', 'L', '2015-11-30', 142.0, 42.0, strftime('%s', 'now'), strftime('%s', 'now'));

-- 3. Sesi Akademik & Kelas
INSERT OR IGNORE INTO academic_sessions (id, school_id, year, name, is_current, created_at, updated_at) VALUES
(1, 1, 2026, 'Sesi 2026/2027', 1, strftime('%s', 'now'), strftime('%s', 'now'));

INSERT OR REPLACE INTO classes (id, school_id, academic_session_id, teacher_id, name, status, created_at, updated_at) VALUES
(1, 1, 1, 2, '5 Cemerlang', 'active', strftime('%s', 'now'), strftime('%s', 'now'));

INSERT OR IGNORE INTO class_students (id, class_id, student_id, status, created_at, updated_at) VALUES
(1, 1, 3, 'active', strftime('%s', 'now'), strftime('%s', 'now')),
(2, 1, 4, 'active', strftime('%s', 'now'), strftime('%s', 'now')),
(3, 1, 5, 'active', strftime('%s', 'now'), strftime('%s', 'now')),
(4, 1, 6, 'active', strftime('%s', 'now'), strftime('%s', 'now')),
(5, 1, 7, 'active', strftime('%s', 'now'), strftime('%s', 'now'));

-- 4. Aktiviti SEGAK Standard
INSERT OR IGNORE INTO segak_activities (id, code, name, description, measurement_type, unit, gender_applicability, min_age, max_age, is_active, created_at, updated_at) VALUES
(1, 'BMI', 'Indeks Jisim Badan (BMI)', 'Pengiraan berat dan tinggi', 'bmi', 'kg/m2', 'ALL', 9, 17, 1, strftime('%s', 'now'), strftime('%s', 'now')),
(2, 'STEP_TEST', 'Naik Turun Bangku 3 Minit', 'Ujian daya tahan kardiovaskular', 'pulse', 'bpm', 'ALL', 9, 17, 1, strftime('%s', 'now'), strftime('%s', 'now')),
(3, 'PUSH_UP', 'Tekan Tubi / Tekan Tubi Diubahsuai', 'Ujian daya tahan otot bahagian atas badan', 'count', 'ulangan', 'ALL', 9, 17, 1, strftime('%s', 'now'), strftime('%s', 'now')),
(4, 'CURL_UP', 'Ringkuk Tubi Separa', 'Ujian daya tahan otot abdomen', 'count', 'ulangan', 'ALL', 9, 17, 1, strftime('%s', 'now'), strftime('%s', 'now')),
(5, 'SIT_REACH', 'Jangkauan Melunjur', 'Ujian fleksibiliti bahagian belakang dan paha', 'cm', 'cm', 'ALL', 9, 17, 1, strftime('%s', 'now'), strftime('%s', 'now'));

-- 5. Peraturan Skor Pemarkahan (Placeholder Standard SEGAK)
INSERT OR IGNORE INTO segak_scoring_rules (id, activity_code, gender, age, min_measurement, max_measurement, score, performance_category, rule_version, created_at, updated_at) VALUES
-- Tekan Tubi (Lelaki Umur 11)
(1, 'PUSH_UP', 'L', 11, 20.0, 99.0, 5, 'Cemerlang', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),
(2, 'PUSH_UP', 'L', 11, 15.0, 19.0, 4, 'Tinggi', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),
(3, 'PUSH_UP', 'L', 11, 10.0, 14.0, 3, 'Sederhana', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),
(4, 'PUSH_UP', 'L', 11, 5.0, 9.0, 2, 'Perlu Perhatian', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),
(5, 'PUSH_UP', 'L', 11, 0.0, 4.0, 1, 'Rendah', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),

-- Ringkuk Tubi Separa (Lelaki Umur 11)
(6, 'CURL_UP', 'L', 11, 19.0, 99.0, 5, 'Cemerlang', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),
(7, 'CURL_UP', 'L', 11, 14.0, 18.0, 4, 'Tinggi', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),
(8, 'CURL_UP', 'L', 11, 9.0, 13.0, 3, 'Sederhana', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),
(9, 'CURL_UP', 'L', 11, 4.0, 8.0, 2, 'Perlu Perhatian', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),
(10, 'CURL_UP', 'L', 11, 0.0, 3.0, 1, 'Rendah', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),

-- Jangkauan Melunjur (Lelaki Umur 11)
(11, 'SIT_REACH', 'L', 11, 35.0, 99.0, 5, 'Cemerlang', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),
(12, 'SIT_REACH', 'L', 11, 28.0, 34.0, 4, 'Tinggi', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),
(13, 'SIT_REACH', 'L', 11, 21.0, 27.0, 3, 'Sederhana', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),
(14, 'SIT_REACH', 'L', 11, 14.0, 20.0, 2, 'Perlu Perhatian', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),
(15, 'SIT_REACH', 'L', 11, 0.0, 13.0, 1, 'Rendah', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),

-- Naik Turun Bangku (Lelaki Umur 11 - kadar denyutan nadi)
(16, 'STEP_TEST', 'L', 11, 0.0, 95.0, 5, 'Cemerlang', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),
(17, 'STEP_TEST', 'L', 11, 96.0, 110.0, 4, 'Tinggi', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),
(18, 'STEP_TEST', 'L', 11, 111.0, 125.0, 3, 'Sederhana', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),
(19, 'STEP_TEST', 'L', 11, 126.0, 140.0, 2, 'Perlu Perhatian', '1.0', strftime('%s', 'now'), strftime('%s', 'now')),
(20, 'STEP_TEST', 'L', 11, 141.0, 300.0, 1, 'Rendah', '1.0', strftime('%s', 'now'), strftime('%s', 'now'));
