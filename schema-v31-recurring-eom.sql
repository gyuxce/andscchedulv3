-- ANS V3.1 patch — CONTEXT Update 11.14
-- Additive only. Aman diulang.

ALTER TABLE class_masters ADD COLUMN IF NOT EXISTS projected_end_date DATE;

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS is_extra BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN class_masters.projected_end_date IS 'Current/projected end from latest non-cancelled sessions; original planned_end_date is never overwritten by moves';
COMMENT ON COLUMN schedules.is_extra IS 'Extra meeting beyond original required plan (distinct from makeup/replacement)';
