-- ANS Dashboard V3 — FULL schema for a NEW empty Supabase project (staging)
-- Jalankan file INI di SQL Editor project BARU.
-- JANGAN jalankan di project produksi V2 yang sedang dipakai Sensei.
--
-- Cara:
-- 1. Buka Supabase → project staging baru (kosong)
-- 2. SQL Editor → New query
-- 3. Paste seluruh file ini → Run
-- 4. Pastikan tidak ada error merah

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- BASE TABLES (inti yang dibutuhkan V3)
-- =========================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Sensei'
    CHECK (role IN ('Super Admin', 'Staff', 'Kyouiku', 'Sensei', 'Student')),
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Approved', 'Pending', 'Suspended')),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sensei (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  note TEXT,
  no_wa TEXT,
  email TEXT,
  level_mengajar TEXT,
  kelas_tersedia TEXT,
  sensei_leave_quota INTEGER DEFAULT 4,
  -- Zona waktu Sensei untuk jam kelas & late-join (bukan paksa WIB)
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta'
    CHECK (timezone IN ('Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'))
);

CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  level TEXT,
  type TEXT,
  sensei_name TEXT,
  level_awal TEXT,
  level_sekarang TEXT,
  durasi_kelas TEXT,
  session_quota INTEGER DEFAULT 10,
  student_leave_quota INTEGER DEFAULT 3,
  payment_status TEXT DEFAULT 'Unpaid',
  is_active BOOLEAN DEFAULT TRUE,
  inactive_reason TEXT,
  special_note TEXT,
  exam_note TEXT,
  admin_note TEXT,
  curriculum_level TEXT,
  curriculum_unit TEXT,
  curriculum_progress TEXT,
  graduate_level TEXT,
  classroom_link TEXT,
  chat_link TEXT,
  progress_link TEXT,
  curriculum_link TEXT,
  profile_id TEXT,
  email TEXT
);

CREATE TABLE IF NOT EXISTS groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  student_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS offdays (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sensei_id UUID REFERENCES sensei(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS schedules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sensei_id UUID REFERENCES sensei(id) ON DELETE SET NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  student_ids JSONB DEFAULT '[]'::jsonb,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  type TEXT,
  level TEXT,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  updated_at TIMESTAMPTZ,
  updated_by TEXT,
  original_sensei_id TEXT,
  substitution_status TEXT CHECK (substitution_status IN ('requested', 'assigned', 'cancelled')),
  substitution_requested_at TIMESTAMPTZ,
  substitution_requested_by TEXT,
  substitution_assigned_at TIMESTAMPTZ,
  substitution_assigned_by TEXT,
  substitution_sensei_name TEXT,
  -- kolom V3
  makeup_of_session_id UUID,
  cancellation_reason TEXT,
  cancellation_initiator TEXT,
  replacement_secured BOOLEAN,
  swap_initiator TEXT,
  swap_reason TEXT
);

CREATE TABLE IF NOT EXISTS sensei_time_blocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sensei_id UUID REFERENCES sensei(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'busy_cakap'
    CHECK (status IN ('available_ans', 'ans_class', 'busy_cakap', 'busy_personal', 'off')),
  note TEXT,
  updated_at TIMESTAMPTZ,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS lesson_trackers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  sensei_id UUID REFERENCES sensei(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  attendance TEXT DEFAULT 'Hadir'
    CHECK (attendance IN ('Hadir', 'Izin', 'Sakit', 'Alpa', 'No Show')),
  curriculum_unit TEXT,
  material TEXT,
  score NUMERIC DEFAULT 0,
  notes TEXT,
  case_notes TEXT,
  student_feedback TEXT,
  actual_start_time TEXT,
  actual_end_time TEXT,
  time_adjustment_note TEXT,
  time_adjustment_status TEXT DEFAULT 'None'
    CHECK (time_adjustment_status IN ('None', 'Pending', 'Approved', 'Rejected')),
  is_delayed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  collection_name TEXT NOT NULL,
  record_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- V3 TABLES
-- =========================================================

CREATE TABLE IF NOT EXISTS sensei_status (
  sensei_id UUID PRIMARY KEY REFERENCES sensei(id) ON DELETE CASCADE,
  primary_status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (primary_status IN ('ACTIVE', 'INACTIVE')),
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
  recording_status TEXT
    CHECK (recording_status IN ('Available', 'Missing', 'Not Required')),
  qa_review_status TEXT DEFAULT 'Not Reviewed'
    CHECK (qa_review_status IN ('Not Reviewed', 'Reviewed')),
  qa_reviewer_id TEXT,
  qa_reviewed_at TIMESTAMPTZ,
  qa_review_notes TEXT
);

CREATE TABLE IF NOT EXISTS session_student_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_report_id UUID REFERENCES session_reports(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  attendance TEXT
    CHECK (attendance IN ('Present', 'Late', 'Excused', 'Absent', 'Partial')),
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

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

INSERT INTO app_settings (key, value)
VALUES ('late_grace_minutes', '0'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_sensei_email ON sensei(email);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
CREATE INDEX IF NOT EXISTS idx_schedules_sensei_date ON schedules(sensei_id, date);
CREATE INDEX IF NOT EXISTS idx_sensei_time_blocks_sensei_date ON sensei_time_blocks(sensei_id, date);
CREATE INDEX IF NOT EXISTS idx_lesson_trackers_student_date ON lesson_trackers(student_id, date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensei_availability_sensei ON sensei_availability(sensei_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_schedule ON session_logs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_session_reports_schedule ON session_reports(schedule_id);
CREATE INDEX IF NOT EXISTS idx_teaching_qa_sensei_month ON teaching_qa_scores(sensei_id, month);
CREATE INDEX IF NOT EXISTS idx_level_completions_student ON level_completions(student_id);
CREATE INDEX IF NOT EXISTS idx_class_masters_sensei ON class_masters(sensei_id);
CREATE INDEX IF NOT EXISTS idx_schedules_class_id ON schedules(class_id);

-- =========================================================
-- BASIC RLS HELPERS (staging-friendly)
-- Ganti email bootstrap admin sebelum pakai auth sungguhan.
-- =========================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensei ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE offdays ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensei_time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensei_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensei_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_student_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_qa_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id::text = auth.uid()::text AND status = 'Approved'
$$;

CREATE OR REPLACE FUNCTION public.is_bootstrap_admin_email(profile_email TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
SET search_path = public
AS $$
  -- Ganti dengan email Super Admin kamu (opsional, untuk bootstrap)
  SELECT lower(coalesce(profile_email, '')) IN ('replace-with-your-admin-email@example.com')
$$;

-- RLS diaktifkan di atas, tapi policy ketat ada di schema-rls.sql
-- Setelah file ini sukses, LANGSUNG jalankan schema-rls.sql
-- (jangan biarkan staging tanpa policy / dengan policy longgar).
