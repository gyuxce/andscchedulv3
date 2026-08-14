-- ANS Dashboard V3 — ADDITIVE only
-- Pakai file ini HANYA jika project sudah punya tabel V2:
-- sensei, students, schedules, profiles, dll.
--
-- Kalau project masih kosong → JANGAN pakai file ini.
-- Pakai schema.sql (full) untuk project baru.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS sensei_status (
  sensei_id UUID PRIMARY KEY REFERENCES sensei(id) ON DELETE CASCADE,
  primary_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (primary_status IN ('ACTIVE', 'INACTIVE')),
  join_date DATE,
  leave_start DATE,
  leave_end DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS sensei_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sensei_id UUID NOT NULL REFERENCES sensei(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL CHECK (pattern IN ('specific_date', 'weekly')),
  availability_date DATE,
  weekday INT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  remarks TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  sensei_id UUID REFERENCES sensei(id) ON DELETE SET NULL,
  clock_in_at TIMESTAMPTZ,
  clock_out_at TIMESTAMPTZ,
  late_join BOOLEAN DEFAULT FALSE,
  overridden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  submitted_by TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  material_covered TEXT,
  level_progress TEXT,
  session_notes TEXT,
  recording_url TEXT,
  recording_status TEXT CHECK (recording_status IN ('Available', 'Missing', 'Not Required')),
  qa_review_status TEXT DEFAULT 'Not Reviewed' CHECK (qa_review_status IN ('Not Reviewed', 'Reviewed')),
  qa_reviewer_id TEXT,
  qa_reviewed_at TIMESTAMPTZ,
  qa_review_notes TEXT
);

CREATE TABLE IF NOT EXISTS session_student_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_report_id UUID REFERENCES session_reports(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  attendance TEXT CHECK (attendance IN ('Present', 'Late', 'Excused', 'Absent', 'Partial')),
  performance_score NUMERIC,
  performance_note TEXT
);

CREATE TABLE IF NOT EXISTS teaching_qa_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sensei_id UUID REFERENCES sensei(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS makeup_of_session_id UUID;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS cancellation_initiator TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS replacement_secured BOOLEAN;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS swap_initiator TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS swap_reason TEXT;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('Super Admin', 'Staff', 'Kyouiku', 'Sensei', 'Student'));
