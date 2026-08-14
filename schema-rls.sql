-- ANS Dashboard V3 — RLS hardening (run on staging AFTER real data)
-- Jalankan di SQL Editor project staging yang sudah punya schema.sql
-- File ini:
-- 1) menghapus policy longgar staging_all_authenticated
-- 2) memasang RBAC: Super Admin / Kyouiku / Sensei

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- HELPERS
-- =========================================================

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM profiles
  WHERE id = auth.uid()
    AND status = 'Approved'
$$;

CREATE OR REPLACE FUNCTION public.is_ops()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_profile_role() IN ('Super Admin', 'Staff')
$$;

CREATE OR REPLACE FUNCTION public.is_kyouiku_or_ops()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_profile_role() IN ('Super Admin', 'Staff', 'Kyouiku')
$$;

CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_profile_role() IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.current_sensei_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM sensei s
  WHERE lower(coalesce(s.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.owns_schedule(p_schedule_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM schedules sch
    WHERE sch.id = p_schedule_id
      AND (
        sch.sensei_id = public.current_sensei_id()
        OR sch.original_sensei_id = public.current_sensei_id()::text
      )
  )
$$;

-- =========================================================
-- DROP LOOSE STAGING POLICIES + OLD NAMES
-- =========================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        policyname = 'staging_all_authenticated'
        OR policyname LIKE 'v3_%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- =========================================================
-- ENABLE RLS
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
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- PROFILES
-- =========================================================

CREATE POLICY v3_profiles_select
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_ops());

CREATE POLICY v3_profiles_insert_own
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND role IN ('Sensei', 'Staff', 'Kyouiku')
    AND status = 'Pending'
  );

CREATE POLICY v3_profiles_insert_ops
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_ops());

CREATE POLICY v3_profiles_update_ops
  ON profiles FOR UPDATE TO authenticated
  USING (public.is_ops())
  WITH CHECK (public.is_ops());

CREATE POLICY v3_profiles_delete_ops
  ON profiles FOR DELETE TO authenticated
  USING (public.is_ops());

-- =========================================================
-- SENSEI MASTER
-- =========================================================

CREATE POLICY v3_sensei_select
  ON sensei FOR SELECT TO authenticated
  USING (
    public.is_kyouiku_or_ops()
    OR id = public.current_sensei_id()
  );

CREATE POLICY v3_sensei_write_ops
  ON sensei FOR ALL TO authenticated
  USING (public.is_ops())
  WITH CHECK (public.is_ops());

-- =========================================================
-- SENSEI STATUS / LABELS SUPPORT
-- =========================================================

CREATE POLICY v3_sensei_status_select
  ON sensei_status FOR SELECT TO authenticated
  USING (
    public.is_kyouiku_or_ops()
    OR sensei_id = public.current_sensei_id()
  );

CREATE POLICY v3_sensei_status_write_ops
  ON sensei_status FOR ALL TO authenticated
  USING (public.is_ops())
  WITH CHECK (public.is_ops());

-- =========================================================
-- STUDENTS (akademik operasional saja)
-- =========================================================

CREATE POLICY v3_students_select
  ON students FOR SELECT TO authenticated
  USING (
    public.is_kyouiku_or_ops()
    OR EXISTS (
      SELECT 1
      FROM schedules sch
      WHERE sch.sensei_id = public.current_sensei_id()
        AND (
          sch.student_id = students.id
          OR sch.student_ids ? students.id::text
        )
    )
    OR lower(coalesce(students.sensei_name, '')) = (
      SELECT lower(coalesce(s.name, ''))
      FROM sensei s
      WHERE s.id = public.current_sensei_id()
    )
  );

CREATE POLICY v3_students_write_ops
  ON students FOR ALL TO authenticated
  USING (public.is_ops())
  WITH CHECK (public.is_ops());

-- =========================================================
-- GROUPS
-- =========================================================

CREATE POLICY v3_groups_select
  ON groups FOR SELECT TO authenticated
  USING (
    public.is_kyouiku_or_ops()
    OR EXISTS (
      SELECT 1
      FROM schedules sch
      WHERE sch.group_id = groups.id
        AND sch.sensei_id = public.current_sensei_id()
    )
  );

CREATE POLICY v3_groups_write_ops
  ON groups FOR ALL TO authenticated
  USING (public.is_ops())
  WITH CHECK (public.is_ops());

-- =========================================================
-- OFFICIAL SCHEDULES (hanya Ops yang menulis)
-- =========================================================

CREATE POLICY v3_schedules_select
  ON schedules FOR SELECT TO authenticated
  USING (
    public.is_kyouiku_or_ops()
    OR sensei_id = public.current_sensei_id()
    OR original_sensei_id = public.current_sensei_id()::text
  );

CREATE POLICY v3_schedules_write_ops
  ON schedules FOR INSERT TO authenticated
  WITH CHECK (public.is_ops());

CREATE POLICY v3_schedules_update_ops
  ON schedules FOR UPDATE TO authenticated
  USING (public.is_ops())
  WITH CHECK (public.is_ops());

CREATE POLICY v3_schedules_delete_ops
  ON schedules FOR DELETE TO authenticated
  USING (public.is_ops());

-- =========================================================
-- AVAILABILITY (Sensei punya sendiri; Ops override)
-- =========================================================

CREATE POLICY v3_availability_select
  ON sensei_availability FOR SELECT TO authenticated
  USING (
    public.is_kyouiku_or_ops()
    OR sensei_id = public.current_sensei_id()
  );

CREATE POLICY v3_availability_insert
  ON sensei_availability FOR INSERT TO authenticated
  WITH CHECK (
    public.is_ops()
    OR sensei_id = public.current_sensei_id()
  );

CREATE POLICY v3_availability_update
  ON sensei_availability FOR UPDATE TO authenticated
  USING (
    public.is_ops()
    OR sensei_id = public.current_sensei_id()
  )
  WITH CHECK (
    public.is_ops()
    OR sensei_id = public.current_sensei_id()
  );

CREATE POLICY v3_availability_delete
  ON sensei_availability FOR DELETE TO authenticated
  USING (
    public.is_ops()
    OR sensei_id = public.current_sensei_id()
  );

-- =========================================================
-- TIME BLOCKS / OFFDAYS / LESSON TRACKERS (kompat V2)
-- =========================================================

CREATE POLICY v3_time_blocks_select
  ON sensei_time_blocks FOR SELECT TO authenticated
  USING (
    public.is_kyouiku_or_ops()
    OR sensei_id = public.current_sensei_id()
  );

CREATE POLICY v3_time_blocks_write
  ON sensei_time_blocks FOR ALL TO authenticated
  USING (
    public.is_ops()
    OR sensei_id = public.current_sensei_id()
  )
  WITH CHECK (
    public.is_ops()
    OR sensei_id = public.current_sensei_id()
  );

CREATE POLICY v3_offdays_select
  ON offdays FOR SELECT TO authenticated
  USING (
    public.is_kyouiku_or_ops()
    OR sensei_id = public.current_sensei_id()
  );

CREATE POLICY v3_offdays_write
  ON offdays FOR ALL TO authenticated
  USING (
    public.is_ops()
    OR sensei_id = public.current_sensei_id()
  )
  WITH CHECK (
    public.is_ops()
    OR sensei_id = public.current_sensei_id()
  );

CREATE POLICY v3_trackers_select
  ON lesson_trackers FOR SELECT TO authenticated
  USING (
    public.is_kyouiku_or_ops()
    OR sensei_id = public.current_sensei_id()
  );

CREATE POLICY v3_trackers_write
  ON lesson_trackers FOR ALL TO authenticated
  USING (
    public.is_ops()
    OR sensei_id = public.current_sensei_id()
  )
  WITH CHECK (
    public.is_ops()
    OR sensei_id = public.current_sensei_id()
  );

-- =========================================================
-- SESSION LOGS (clock in/out)
-- =========================================================

CREATE POLICY v3_session_logs_select
  ON session_logs FOR SELECT TO authenticated
  USING (
    public.is_kyouiku_or_ops()
    OR sensei_id = public.current_sensei_id()
  );

CREATE POLICY v3_session_logs_insert
  ON session_logs FOR INSERT TO authenticated
  WITH CHECK (
    public.is_ops()
    OR sensei_id = public.current_sensei_id()
  );

CREATE POLICY v3_session_logs_update
  ON session_logs FOR UPDATE TO authenticated
  USING (
    public.is_ops()
    OR sensei_id = public.current_sensei_id()
  )
  WITH CHECK (
    public.is_ops()
    OR sensei_id = public.current_sensei_id()
  );

CREATE POLICY v3_session_logs_delete_ops
  ON session_logs FOR DELETE TO authenticated
  USING (public.is_ops());

-- =========================================================
-- SESSION REPORTS + PER-STUDENT RECORDS
-- =========================================================

CREATE POLICY v3_session_reports_select
  ON session_reports FOR SELECT TO authenticated
  USING (
    public.is_kyouiku_or_ops()
    OR public.owns_schedule(schedule_id)
  );

CREATE POLICY v3_session_reports_insert
  ON session_reports FOR INSERT TO authenticated
  WITH CHECK (
    public.is_ops()
    OR public.owns_schedule(schedule_id)
  );

-- Ops override akademik; Kyouiku review rekaman/QA metadata; Sensei isi laporan milik sendiri
CREATE POLICY v3_session_reports_update
  ON session_reports FOR UPDATE TO authenticated
  USING (
    public.is_kyouiku_or_ops()
    OR public.owns_schedule(schedule_id)
  )
  WITH CHECK (
    public.is_kyouiku_or_ops()
    OR public.owns_schedule(schedule_id)
  );

CREATE POLICY v3_session_reports_delete_ops
  ON session_reports FOR DELETE TO authenticated
  USING (public.is_ops());

CREATE POLICY v3_session_student_records_select
  ON session_student_records FOR SELECT TO authenticated
  USING (
    public.is_kyouiku_or_ops()
    OR EXISTS (
      SELECT 1
      FROM session_reports sr
      WHERE sr.id = session_student_records.session_report_id
        AND public.owns_schedule(sr.schedule_id)
    )
  );

CREATE POLICY v3_session_student_records_write
  ON session_student_records FOR ALL TO authenticated
  USING (
    public.is_ops()
    OR EXISTS (
      SELECT 1
      FROM session_reports sr
      WHERE sr.id = session_student_records.session_report_id
        AND (
          public.is_kyouiku_or_ops()
          OR public.owns_schedule(sr.schedule_id)
        )
    )
  )
  WITH CHECK (
    public.is_ops()
    OR EXISTS (
      SELECT 1
      FROM session_reports sr
      WHERE sr.id = session_student_records.session_report_id
        AND (
          public.is_kyouiku_or_ops()
          OR public.owns_schedule(sr.schedule_id)
        )
    )
  );

-- =========================================================
-- TEACHING QA SCORES
-- =========================================================

CREATE POLICY v3_qa_select
  ON teaching_qa_scores FOR SELECT TO authenticated
  USING (
    public.is_kyouiku_or_ops()
    OR sensei_id = public.current_sensei_id()
  );

CREATE POLICY v3_qa_write_kyouiku
  ON teaching_qa_scores FOR INSERT TO authenticated
  WITH CHECK (public.is_kyouiku_or_ops());

CREATE POLICY v3_qa_update_kyouiku
  ON teaching_qa_scores FOR UPDATE TO authenticated
  USING (public.is_kyouiku_or_ops())
  WITH CHECK (public.is_kyouiku_or_ops());

CREATE POLICY v3_qa_delete_ops
  ON teaching_qa_scores FOR DELETE TO authenticated
  USING (public.is_ops());

-- =========================================================
-- AUDIT LOGS
-- =========================================================

CREATE POLICY v3_audit_select
  ON audit_logs FOR SELECT TO authenticated
  USING (public.is_kyouiku_or_ops());

CREATE POLICY v3_audit_insert
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_approved_user());

CREATE POLICY v3_audit_delete_ops
  ON audit_logs FOR DELETE TO authenticated
  USING (public.is_ops());

-- =========================================================
-- APP SETTINGS (late-join grace, dll)
-- =========================================================

CREATE POLICY v3_app_settings_select
  ON app_settings FOR SELECT TO authenticated
  USING (public.is_approved_user());

CREATE POLICY v3_app_settings_write_ops
  ON app_settings FOR ALL TO authenticated
  USING (public.is_ops())
  WITH CHECK (public.is_ops());

-- =========================================================
-- QUICK VERIFY (optional)
-- SELECT policyname, tablename FROM pg_policies WHERE schemaname='public' AND policyname LIKE 'v3_%' ORDER BY tablename, policyname;
-- =========================================================
