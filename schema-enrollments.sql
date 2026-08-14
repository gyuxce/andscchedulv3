-- ANS Dashboard V3 — Enrollment / Learning Journey
-- 1 siswa × 1 level = 1 journey. Jangan overwrite; buat record baru saat naik level.
-- PRASYARAT: jalankan schema-class-master.sql dulu (butuh tabel class_masters).
-- Aman diulang.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Safety: class_masters harus sudah ada (dari schema-class-master.sql)
DO $$
BEGIN
  IF to_regclass('public.class_masters') IS NULL THEN
    RAISE EXCEPTION
      'Tabel class_masters belum ada. Jalankan schema-class-master.sql dulu, lalu ulang schema-enrollments.sql';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  class_type TEXT,
  class_id UUID REFERENCES class_masters(id) ON DELETE SET NULL,
  sensei_id UUID REFERENCES sensei(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'transferred', 'cancelled')),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS material_url TEXT;
