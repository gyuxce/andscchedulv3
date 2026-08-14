import type {
  AppSettings,
  ClassMaster,
  DashboardSnapshot,
  Enrollment,
  LevelCompletion,
  SenseiTimezone,
  Student,
  UserAccount
} from '../types';
import { WEEKLY_HOUR_TARGET } from '../constants';
import {
  availabilityToRow,
  classMasterToRow,
  enrollmentToRow,
  mapAudit,
  mapAvailability,
  mapClassMaster,
  mapEnrollment,
  mapLeaveFromStatus,
  mapLevelCompletion,
  mapProfile,
  mapQaScore,
  mapSchedule,
  mapSensei,
  mapSenseiWithStatus,
  mapSessionLog,
  mapSessionReport,
  mapStudent,
  scheduleToRow
} from '../lib/mappers';
import { getSupabase } from '../lib/supabase';
import type { AvailabilitySlot, ClassSession, SessionLog, SessionReport, TeachingQaScore } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  lateGraceMinutes: 0,
  minAttendancePercent: null,
  weeklyHourTarget: WEEKLY_HOUR_TARGET
};

function parseSettings(rows: Record<string, unknown>[]): AppSettings {
  const byKey = new Map(rows.map((row) => [String(row.key), row.value]));
  const graceRaw = byKey.get('late_grace_minutes');
  const grace = typeof graceRaw === 'number' ? graceRaw : Number(graceRaw);
  return {
    ...DEFAULT_SETTINGS,
    lateGraceMinutes: Number.isFinite(grace) && grace >= 0 ? grace : DEFAULT_SETTINGS.lateGraceMinutes
  };
}

export async function loadDashboardSnapshot(): Promise<DashboardSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const [
    senseiRes,
    statusRes,
    studentsRes,
    groupsRes,
    schedulesRes,
    availabilityRes,
    logsRes,
    reportsRes,
    studentRecordsRes,
    qaRes,
    auditRes,
    profilesRes,
    settingsRes,
    levelRes,
    classRes,
    enrollmentRes
  ] = await Promise.all([
    supabase.from('sensei').select('*'),
    supabase.from('sensei_status').select('*'),
    supabase.from('students').select('*'),
    supabase.from('groups').select('*'),
    supabase.from('schedules').select('*').order('date', { ascending: true }),
    supabase.from('sensei_availability').select('*'),
    supabase.from('session_logs').select('*'),
    supabase.from('session_reports').select('*'),
    supabase.from('session_student_records').select('*'),
    supabase.from('teaching_qa_scores').select('*'),
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('profiles').select('*'),
    supabase.from('app_settings').select('key, value'),
    supabase.from('level_completions').select('*').order('completed_at', { ascending: false }),
    supabase.from('class_masters').select('*').order('updated_at', { ascending: false }),
    supabase.from('enrollments').select('*').order('updated_at', { ascending: false })
  ]);

  const firstError = [
    senseiRes,
    statusRes,
    studentsRes,
    groupsRes,
    schedulesRes,
    availabilityRes,
    logsRes,
    reportsRes,
    studentRecordsRes,
    qaRes,
    auditRes,
    profilesRes
  ].find((result) => result.error);

  if (firstError?.error) {
    throw new Error(firstError.error.message);
  }

  const statusBySensei = new Map(
    ((statusRes.data || []) as Record<string, unknown>[]).map((row) => [String(row.sensei_id), row])
  );
  const sensei = ((senseiRes.data || []) as Record<string, unknown>[]).map((row) =>
    mapSenseiWithStatus(mapSensei(row), statusBySensei.get(String(row.id)))
  );

  const students = ((studentsRes.data || []) as Record<string, unknown>[]).map((row) => {
    const mapped = mapStudent(row);
    const senseiName = String(row.sensei_name || '');
    const match = sensei.find((item) => item.name.toLowerCase() === senseiName.toLowerCase());
    return { ...mapped, senseiId: match?.id };
  });

  const leavePeriods = ((statusRes.data || []) as Record<string, unknown>[])
    .map((row) => mapLeaveFromStatus(row))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const reports = ((reportsRes.data || []) as Record<string, unknown>[]).map((row) => {
    const related = ((studentRecordsRes.data || []) as Record<string, unknown>[]).filter(
      (item) => String(item.session_report_id) === String(row.id)
    );
    return mapSessionReport(row, related);
  });

  const users: UserAccount[] = ((profilesRes.data || []) as Record<string, unknown>[]).map((row) => {
    const email = String(row.email || '').toLowerCase();
    const linked = sensei.find((item) => item.email.toLowerCase() === email);
    return {
      ...mapProfile(row, linked?.id),
      name: linked?.name || String(row.email || '').split('@')[0]
    };
  });

  const settings = settingsRes.error
    ? DEFAULT_SETTINGS
    : parseSettings((settingsRes.data || []) as Record<string, unknown>[]);

  const levelCompletions = levelRes.error
    ? []
    : ((levelRes.data || []) as Record<string, unknown>[]).map(mapLevelCompletion);

  const classMasters = classRes.error
    ? []
    : ((classRes.data || []) as Record<string, unknown>[]).map(mapClassMaster);

  const enrollments = enrollmentRes.error
    ? []
    : ((enrollmentRes.data || []) as Record<string, unknown>[]).map(mapEnrollment);

  return {
    users,
    sensei,
    students,
    groups: ((groupsRes.data || []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      name: String(row.name || ''),
      studentIds: Array.isArray(row.student_ids) ? row.student_ids.map(String) : [],
      level: ''
    })),
    classMasters,
    availability: ((availabilityRes.data || []) as Record<string, unknown>[]).map(mapAvailability),
    schedules: ((schedulesRes.data || []) as Record<string, unknown>[]).map(mapSchedule),
    sessionLogs: ((logsRes.data || []) as Record<string, unknown>[]).map(mapSessionLog),
    sessionReports: reports,
    qaScores: ((qaRes.data || []) as Record<string, unknown>[]).map(mapQaScore),
    leavePeriods,
    auditLogs: ((auditRes.data || []) as Record<string, unknown>[]).map(mapAudit),
    levelCompletions,
    enrollments,
    settings
  };
}

export async function ensureProfile(userId: string, email: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const existing = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (existing.data) return existing.data;

  const payload = {
    id: userId,
    email,
    role: 'Sensei',
    status: 'Pending'
  };
  const inserted = await supabase.from('profiles').insert(payload).select('*').single();
  if (inserted.error) throw new Error(inserted.error.message);
  return inserted.data;
}

export async function writeAudit(input: {
  actorId?: string;
  actorEmail?: string;
  action: string;
  entity: string;
  recordId: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
}) {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from('audit_logs').insert({
    actor_id: input.actorId || null,
    actor_email: input.actorEmail || null,
    action: input.action,
    collection_name: input.entity,
    record_id: input.recordId,
    payload: {
      old: input.oldValue,
      new: input.newValue,
      reason: input.reason
    }
  });
}

export async function upsertScheduleRemote(session: ClassSession) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('schedules').upsert(scheduleToRow(session));
  if (error) throw new Error(error.message);
}

export async function upsertAvailabilityRemote(slot: AvailabilitySlot) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('sensei_availability').upsert(availabilityToRow(slot));
  if (error) throw new Error(error.message);
}

export async function upsertSessionLogRemote(log: SessionLog) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('session_logs').upsert({
    id: log.id,
    schedule_id: log.scheduleId,
    sensei_id: log.senseiId,
    clock_in_at: log.clockInAt,
    clock_out_at: log.clockOutAt,
    late_join: log.lateJoin,
    overridden: log.overridden
  });
  if (error) throw new Error(error.message);
}

export async function upsertSessionReportRemote(report: SessionReport) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from('session_reports').upsert({
    id: report.id,
    schedule_id: report.scheduleId,
    submitted_by: report.submittedBy,
    submitted_at: report.submittedAt,
    material_covered: report.materialCovered,
    material_url: report.materialUrl || null,
    level_progress: report.levelProgress,
    session_notes: report.sessionNotes || null,
    recording_url: report.recordingUrl || null,
    recording_status: report.recordingStatus,
    qa_review_status: report.qaReviewStatus,
    qa_reviewer_id: report.qaReviewerId || null,
    qa_reviewed_at: report.qaReviewedAt || null,
    qa_review_notes: report.qaReviewNotes || null
  });
  if (error) throw new Error(error.message);

  await supabase.from('session_student_records').delete().eq('session_report_id', report.id);
  if (report.students.length) {
    const { error: studentError } = await supabase.from('session_student_records').insert(
      report.students.map((item) => ({
        session_report_id: report.id,
        student_id: item.studentId,
        attendance: item.attendance,
        performance_score: item.performanceScore,
        performance_note: item.performanceNote || null
      }))
    );
    if (studentError) throw new Error(studentError.message);
  }
}

export async function upsertQaRemote(score: TeachingQaScore) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('teaching_qa_scores').upsert({
    id: score.id,
    sensei_id: score.senseiId,
    month: score.month,
    score: score.score,
    notes: score.notes || null,
    created_by: score.createdBy,
    created_at: score.createdAt,
    updated_at: score.updatedAt || new Date().toISOString()
  });
  if (error) throw new Error(error.message);
}

export async function upsertSenseiStatusRemote(input: {
  senseiId: string;
  primaryStatus: 'ACTIVE' | 'INACTIVE';
  joinDate?: string;
  updatedBy?: string;
}) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('sensei_status').upsert({
    sensei_id: input.senseiId,
    primary_status: input.primaryStatus,
    join_date: input.joinDate || null,
    updated_at: new Date().toISOString(),
    updated_by: input.updatedBy || null
  });
  if (error) throw new Error(error.message);
}

export async function upsertSenseiTimezoneRemote(senseiId: string, timezone: SenseiTimezone) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('sensei').update({ timezone }).eq('id', senseiId);
  if (error) throw new Error(error.message);
}

export async function upsertAppSettingsRemote(settings: AppSettings, updatedBy?: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('app_settings').upsert({
    key: 'late_grace_minutes',
    value: settings.lateGraceMinutes,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy || null
  });
  if (error) throw new Error(error.message);
}

export async function upsertLevelCompletionRemote(completion: LevelCompletion) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('level_completions').upsert({
    id: completion.id,
    student_id: completion.studentId,
    level: completion.level,
    next_level: completion.nextLevel,
    completed_at: completion.completedAt,
    completed_by: completion.completedBy,
    notes: completion.notes || null
  });
  if (error) throw new Error(error.message);
}

export async function upsertStudentRemote(student: Student) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('students')
    .update({
      level_sekarang: student.currentLevel,
      level_awal: student.startingLevel,
      special_note: student.academicNotes || null,
      is_active: student.isActive
    })
    .eq('id', student.id);
  if (error) throw new Error(error.message);
}

export async function upsertClassMasterRemote(teachingClass: ClassMaster) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('class_masters').upsert(classMasterToRow(teachingClass));
  if (error) throw new Error(error.message);
}

export async function upsertEnrollmentRemote(enrollment: Enrollment) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('enrollments').upsert(enrollmentToRow(enrollment));
  if (error) throw new Error(error.message);
}
