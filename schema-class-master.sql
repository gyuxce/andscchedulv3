-- ANS Dashboard V3 — Class Master + session.class_id
-- Jalankan di staging yang sudah jalan. Aman diulang.

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

CREATE INDEX IF NOT EXISTS idx_class_masters_sensei ON class_masters(sensei_id);
CREATE INDEX IF NOT EXISTS idx_class_masters_status ON class_masters(status);
CREATE INDEX IF NOT EXISTS idx_schedules_class_id ON schedules(class_id);

ALTER TABLE class_masters ENABLE ROW LEVEL SECURITY;
