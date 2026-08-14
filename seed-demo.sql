-- Seed data ringan untuk staging V3 (project kosong yang sudah menjalankan schema.sql)
-- Aman diulang (pakai fixed UUID + upsert).
-- Setelah ini:
-- 1. Buat user Auth di Supabase Authentication (email/password)
-- 2. Update profiles: set role + status = 'Approved'
-- 3. Samakan email Sensei dengan email Auth Sensei

INSERT INTO sensei (id, name, note, no_wa, email, level_mengajar, kelas_tersedia)
VALUES
  ('11111111-1111-1111-1111-111111111101', 'Yuki Tanaka', 'Sensei baru', '081210001001', 'yuki.tanaka@akinosora.co', 'Guntai 1,Guntai 2,N5', 'Private'),
  ('11111111-1111-1111-1111-111111111102', 'Kenji Sato', NULL, '081210001002', 'kenji.sato@akinosora.co', 'Guntai 3,N4,Custom Kaiwa', 'Semi-Private,Group'),
  ('11111111-1111-1111-1111-111111111103', 'Aiko Nakamura', 'Sedang cuti', '081210001003', 'aiko.nakamura@akinosora.co', 'N5,Pra Guntai', 'Private'),
  ('11111111-1111-1111-1111-111111111104', 'Rina Wijaya', 'UNASSIGNED contoh', '081210001004', 'rina.wijaya@akinosora.co', 'Kids Private', 'Kids Private')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  level_mengajar = EXCLUDED.level_mengajar;

INSERT INTO sensei_status (sensei_id, primary_status, join_date, leave_start, leave_end, updated_by)
VALUES
  ('11111111-1111-1111-1111-111111111101', 'ACTIVE', CURRENT_DATE - 18, NULL, NULL, 'seed'),
  ('11111111-1111-1111-1111-111111111102', 'ACTIVE', '2023-04-12', NULL, NULL, 'seed'),
  ('11111111-1111-1111-1111-111111111103', 'ACTIVE', '2022-11-01', CURRENT_DATE - 3, CURRENT_DATE + 4, 'seed'),
  ('11111111-1111-1111-1111-111111111104', 'ACTIVE', '2024-09-01', NULL, NULL, 'seed')
ON CONFLICT (sensei_id) DO UPDATE SET
  primary_status = EXCLUDED.primary_status,
  join_date = EXCLUDED.join_date,
  leave_start = EXCLUDED.leave_start,
  leave_end = EXCLUDED.leave_end;

INSERT INTO students (id, name, email, type, level, level_awal, level_sekarang, sensei_name, is_active)
VALUES
  ('22222222-2222-2222-2222-222222222201', 'Andi Pratama', 'andi@example.com', 'Private', 'Guntai 2', 'Guntai 1', 'Guntai 2', 'Yuki Tanaka', TRUE),
  ('22222222-2222-2222-2222-222222222202', 'Sari Dewi', 'sari@example.com', 'Private', 'Guntai 1', 'Pra Guntai', 'Guntai 1', 'Yuki Tanaka', TRUE),
  ('22222222-2222-2222-2222-222222222203', 'Bima Nugraha', NULL, 'Semi-Private', 'N5', 'N5', 'N5', 'Kenji Sato', TRUE),
  ('22222222-2222-2222-2222-222222222204', 'Lina Kusuma', NULL, 'Semi-Private', 'N5', 'N5', 'N5', 'Kenji Sato', TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  sensei_name = EXCLUDED.sensei_name,
  level_sekarang = EXCLUDED.level_sekarang;

INSERT INTO sensei_availability (id, sensei_id, pattern, weekday, availability_date, start_time, end_time, remarks, is_active)
VALUES
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111101', 'weekly', 1, NULL, '09:00', '13:00', 'Pagi ANS', TRUE),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111101', 'weekly', 3, NULL, '09:00', '13:00', NULL, TRUE),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111102', 'weekly', 1, NULL, '13:00', '18:00', NULL, TRUE),
  ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111104', 'weekly', 6, NULL, '09:00', '11:00', 'Menunggu alokasi', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO schedules (id, sensei_id, student_id, student_ids, type, level, date, start_time, end_time, status)
VALUES
  (
    '44444444-4444-4444-4444-444444444401',
    '11111111-1111-1111-1111-111111111101',
    '22222222-2222-2222-2222-222222222201',
    '["22222222-2222-2222-2222-222222222201"]'::jsonb,
    'Private',
    'Guntai 2',
    CURRENT_DATE,
    '09:00',
    '10:30',
    'active'
  ),
  (
    '44444444-4444-4444-4444-444444444402',
    '11111111-1111-1111-1111-111111111102',
    '22222222-2222-2222-2222-222222222203',
    '["22222222-2222-2222-2222-222222222203","22222222-2222-2222-2222-222222222204"]'::jsonb,
    'Semi-Private',
    'N5',
    CURRENT_DATE + 1,
    '13:00',
    '14:30',
    'active'
  )
ON CONFLICT (id) DO NOTHING;
