-- ANS Dashboard V3.1 — Master data + richer Enrollment / Learning Journey
-- Additive only. Jalankan di SQL Editor (aman diulang).
-- Setelah ini: jalankan ulang schema-rls.sql jika perlu.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sensei display name (opsional; fallback ke name di app)
ALTER TABLE sensei ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Enrollment enrichment
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS planned_end_date DATE;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS required_meetings INT;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS sessions_completed INT DEFAULT 0;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS payment_status TEXT
  CHECK (payment_status IS NULL OR payment_status IN ('LUNAS', 'CICILAN', 'BELUM_BAYAR'));
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS payment_remark TEXT;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS enrollment_remark TEXT;

-- Expand status values (drop old check if present, re-add)
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_status_check;
ALTER TABLE enrollments
  ADD CONSTRAINT enrollments_status_check
  CHECK (status IN ('active', 'ending_soon', 'completed', 'stopped', 'transferred', 'cancelled'));

-- Normalize legacy cancelled → stopped is optional; leave data as-is for history.

COMMENT ON COLUMN enrollments.payment_status IS 'LUNAS | CICILAN | BELUM_BAYAR';
COMMENT ON COLUMN enrollments.status IS 'active | ending_soon | completed | stopped (+ legacy transferred/cancelled)';
