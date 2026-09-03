-- ANS Dashboard V3 — additive: makeup already has makeup_of_session_id;
-- this file adds level_completions for academic "level completed" status.
-- Jalankan di staging yang sudah jalan. Aman diulang.

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

ALTER TABLE level_completions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_level_completions_student ON level_completions(student_id);
