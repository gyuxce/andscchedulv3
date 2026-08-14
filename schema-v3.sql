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

ALTER TABLE sensei ADD COLUMN IF NOT EXISTS timezone TEXT;
UPDATE sensei SET timezone = 'Asia/Jakarta' WHERE timezone IS NULL OR timezone = '';
ALTER TABLE sensei ALTER COLUMN timezone SET DEFAULT 'Asia/Jakarta';
ALTER TABLE sensei DROP CONSTRAINT IF EXISTS sensei_timezone_check;
ALTER TABLE sensei ADD CONSTRAINT sensei_timezone_check
  CHECK (timezone IN ('Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'));

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

INSERT INTO app_settings (key, value)
VALUES ('late_grace_minutes', '0'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS level_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  next_level TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_by TEXT,
  notes TEXT,
  UNIQUE (student_id, level)
);

CREATE TABLE IF NOT EXISTS class_masters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name TEXT NOT NULL,
  code TEXT,
  type TEXT NOT NULL,
  level TEXT NOT NULL,
  sensei_id UUID REFERENCES sensei(id) ON DELETE SET NULL,
  student_ids JSONB DEFAULT '[]'::jsonb,
  required_meetings INT NOT NULL DEFAULT 10 CHECK (required_meetings > 0),
  session_duration_minutes INT NOT NULL DEFAULT 90 CHECK (session_duration_minutes > 0),
  start_date DATE,
  planned_end_date DATE,
  meet_link TEXT,
  classroom_link TEXT,
  chat_link TEXT,
  material_link TEXT,
  teaching_notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES class_masters(id) ON DELETE SET NULL;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('Super Admin', 'Staff', 'Kyouiku', 'Sensei', 'Student'));
