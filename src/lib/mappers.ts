import type {
  AppRole,
  AttendanceStatus,
  AvailabilitySlot,
  AuditLog,
  ClassSession,
  ClassType,
  LeavePeriod,
  RecordingStatus,
  Sensei,
  SenseiPrimaryStatus,
  SessionLog,
  SessionReport,
  Student,
  TeachingQaScore,
  UserAccount,
  UserStatus
} from '../types';

export function mapRole(role?: string | null): AppRole {
  const value = String(role || '').toLowerCase();
  if (value.includes('super')) return 'Super Admin';
  if (value.includes('kyouiku') || value.includes('kyoiku') || value.includes('staff')) return 'Kyouiku';
  return 'Sensei';
}

export function mapSensei(row: Record<string, unknown>): Sensei {
  const levels = String(row.level_mengajar || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    id: String(row.id),
    name: String(row.name || ''),
    email: String(row.email || ''),
    phone: String(row.no_wa || ''),
    levels,
    primaryStatus: 'ACTIVE',
    joinDate: new Date().toISOString().slice(0, 10),
    timezone: 'Asia/Jakarta',
    notes: row.note ? String(row.note) : undefined
  };
}

export function mapSenseiWithStatus(
  sensei: Sensei,
  statusRow?: Record<string, unknown> | null
): Sensei {
  if (!statusRow) return sensei;
  return {
    ...sensei,
    primaryStatus: (statusRow.primary_status as SenseiPrimaryStatus) || sensei.primaryStatus,
    joinDate: statusRow.join_date ? String(statusRow.join_date) : sensei.joinDate,
    notes: sensei.notes
  };
}

export function mapStudent(row: Record<string, unknown>): Student {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    email: row.email ? String(row.email) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    type: (row.type as ClassType) || 'Private',
    currentLevel: String(row.level_sekarang || row.level || ''),
    startingLevel: String(row.level_awal || row.level || ''),
    senseiId: undefined,
    isActive: row.is_active !== false,
    academicNotes: row.special_note ? String(row.special_note) : undefined
  };
}

export function mapSchedule(row: Record<string, unknown>): ClassSession {
  const studentIds = Array.isArray(row.student_ids)
    ? (row.student_ids as unknown[]).map(String)
    : row.student_id
      ? [String(row.student_id)]
      : [];
  return {
    id: String(row.id),
    senseiId: String(row.sensei_id || ''),
    studentIds,
    groupId: row.group_id ? String(row.group_id) : null,
    type: (row.type as ClassType) || 'Private',
    level: String(row.level || ''),
    date: String(row.date || '').slice(0, 10),
    startTime: String(row.start_time || '').slice(0, 5),
    endTime: String(row.end_time || '').slice(0, 5),
    status: (row.status as ClassSession['status']) || 'active',
    makeupOfSessionId: row.makeup_of_session_id ? String(row.makeup_of_session_id) : null,
    cancellationReason: row.cancellation_reason ? String(row.cancellation_reason) : null,
    cancellationInitiator: (row.cancellation_initiator as ClassSession['cancellationInitiator']) || null,
    replacementSecured:
      typeof row.replacement_secured === 'boolean' ? row.replacement_secured : null,
    originalSenseiId: row.original_sensei_id ? String(row.original_sensei_id) : null,
    swapInitiator: (row.swap_initiator as ClassSession['swapInitiator']) || null,
    swapReason: row.swap_reason ? String(row.swap_reason) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    updatedBy: row.updated_by ? String(row.updated_by) : undefined
  };
}

export function mapAvailability(row: Record<string, unknown>): AvailabilitySlot {
  return {
    id: String(row.id),
    senseiId: String(row.sensei_id),
    pattern: row.pattern === 'weekly' ? 'weekly' : 'specific_date',
    date: row.availability_date ? String(row.availability_date) : null,
    weekday: row.weekday == null ? null : Number(row.weekday),
    startTime: String(row.start_time || '').slice(0, 5),
    endTime: String(row.end_time || '').slice(0, 5),
    remarks: row.remarks ? String(row.remarks) : undefined,
    isActive: row.is_active !== false
  };
}

export function mapSessionLog(row: Record<string, unknown>): SessionLog {
  return {
    id: String(row.id),
    scheduleId: String(row.schedule_id),
    senseiId: String(row.sensei_id),
    clockInAt: row.clock_in_at ? String(row.clock_in_at) : null,
    clockOutAt: row.clock_out_at ? String(row.clock_out_at) : null,
    lateJoin: Boolean(row.late_join),
    overridden: Boolean(row.overridden)
  };
}

export function mapSessionReport(
  row: Record<string, unknown>,
  students: Array<Record<string, unknown>>
): SessionReport {
  return {
    id: String(row.id),
    scheduleId: String(row.schedule_id),
    submittedBy: String(row.submitted_by || ''),
    submittedAt: String(row.submitted_at || new Date().toISOString()),
    students: students.map((item) => ({
      studentId: String(item.student_id),
      attendance: (item.attendance as AttendanceStatus) || 'Present',
      performanceScore:
        item.performance_score == null ? null : Number(item.performance_score),
      performanceNote: item.performance_note ? String(item.performance_note) : undefined
    })),
    materialCovered: String(row.material_covered || ''),
    levelProgress: String(row.level_progress || ''),
    sessionNotes: row.session_notes ? String(row.session_notes) : undefined,
    recordingUrl: row.recording_url ? String(row.recording_url) : undefined,
    recordingStatus: (row.recording_status as RecordingStatus) || 'Missing',
    qaReviewStatus: row.qa_review_status === 'Reviewed' ? 'Reviewed' : 'Not Reviewed',
    qaReviewerId: row.qa_reviewer_id ? String(row.qa_reviewer_id) : null,
    qaReviewedAt: row.qa_reviewed_at ? String(row.qa_reviewed_at) : null,
    qaReviewNotes: row.qa_review_notes ? String(row.qa_review_notes) : undefined
  };
}

export function mapQaScore(row: Record<string, unknown>): TeachingQaScore {
  return {
    id: String(row.id),
    senseiId: String(row.sensei_id),
    month: String(row.month),
    score: Number(row.score),
    notes: row.notes ? String(row.notes) : undefined,
    createdBy: String(row.created_by || ''),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined
  };
}

export function mapAudit(row: Record<string, unknown>): AuditLog {
  const payload = (row.payload || {}) as Record<string, unknown>;
  return {
    id: String(row.id),
    actorId: String(row.actor_id || ''),
    actorName: String(row.actor_email || row.actor_id || 'Unknown'),
    action: String(row.action || ''),
    entity: String(row.collection_name || ''),
    recordId: String(row.record_id || ''),
    oldValue: payload.old,
    newValue: payload.new,
    reason: payload.reason ? String(payload.reason) : undefined,
    createdAt: String(row.created_at || new Date().toISOString())
  };
}

export function mapProfile(row: Record<string, unknown>, senseiId?: string): UserAccount {
  return {
    id: String(row.id),
    name: String(row.email || '').split('@')[0],
    email: String(row.email || ''),
    role: mapRole(String(row.role)),
    status: (row.status as UserStatus) || 'Pending',
    senseiId
  };
}

export function mapLeaveFromStatus(row: Record<string, unknown>): LeavePeriod | null {
  if (!row.leave_start || !row.leave_end) return null;
  return {
    id: `leave-${row.sensei_id}`,
    senseiId: String(row.sensei_id),
    startDate: String(row.leave_start),
    endDate: String(row.leave_end),
    reason: 'Cuti',
    status: 'approved'
  };
}

export function scheduleToRow(session: ClassSession) {
  return {
    id: session.id,
    sensei_id: session.senseiId || null,
    student_id: session.studentIds[0] || null,
    student_ids: session.studentIds,
    group_id: session.groupId || null,
    type: session.type,
    level: session.level,
    date: session.date,
    start_time: session.startTime,
    end_time: session.endTime,
    status: session.status,
    makeup_of_session_id: session.makeupOfSessionId || null,
    cancellation_reason: session.cancellationReason || null,
    cancellation_initiator: session.cancellationInitiator || null,
    replacement_secured: session.replacementSecured,
    original_sensei_id: session.originalSenseiId || null,
    swap_initiator: session.swapInitiator || null,
    swap_reason: session.swapReason || null,
    updated_at: session.updatedAt || new Date().toISOString(),
    updated_by: session.updatedBy || null
  };
}

export function availabilityToRow(slot: AvailabilitySlot) {
  return {
    id: slot.id,
    sensei_id: slot.senseiId,
    pattern: slot.pattern,
    availability_date: slot.date || null,
    weekday: slot.weekday,
    start_time: slot.startTime,
    end_time: slot.endTime,
    remarks: slot.remarks || null,
    is_active: slot.isActive,
    updated_at: new Date().toISOString()
  };
}
