import type { ClassMaster, ClassSession, SessionReport } from '../types';

/** Non-cancelled calendar sessions for a class, oldest first. */
export function classCalendarSessions(classId: string, schedules: ClassSession[]) {
  return schedules
    .filter((session) => session.classId === classId && session.status !== 'cancelled')
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
}

export function isSessionCompleted(
  session: ClassSession,
  reports: SessionReport[]
) {
  if (session.status === 'cancelled') return false;
  if (session.status === 'completed') return true;
  return reports.some((report) => report.scheduleId === session.id);
}

export function getClassProgress(
  teachingClass: ClassMaster,
  schedules: ClassSession[],
  reports: SessionReport[]
) {
  const calendar = classCalendarSessions(teachingClass.id, schedules);
  const completedSessions = calendar.filter((session) => isSessionCompleted(session, reports));
  const completed = completedSessions.length;
  const required = teachingClass.requiredMeetings;
  const remaining = Math.max(required - completed, 0);
  return {
    required,
    completed,
    remaining,
    calendarCount: calendar.length,
    completedSessions,
    calendar
  };
}

/** Session X of required Y — X is 1-based index among non-cancelled calendar sessions. */
export function getSessionOrdinal(
  session: ClassSession,
  schedules: ClassSession[],
  teachingClass?: ClassMaster | null
) {
  if (!session.classId || !teachingClass) return null;
  const calendar = classCalendarSessions(session.classId, schedules);
  const index = calendar.findIndex((item) => item.id === session.id);
  if (index < 0) return null;
  return {
    index: index + 1,
    required: teachingClass.requiredMeetings,
    label: `Sesi ${index + 1} dari ${teachingClass.requiredMeetings}`
  };
}

export type ClassHealthStatus =
  | 'on_track'
  | 'ending_soon'
  | 'delayed'
  | 'overdue'
  | 'completed'
  | 'inactive';

export function getClassHealth(
  teachingClass: ClassMaster,
  schedules: ClassSession[],
  reports: SessionReport[],
  now = new Date()
): { status: ClassHealthStatus; detail: string } {
  if (teachingClass.status === 'cancelled' || teachingClass.status === 'draft') {
    return { status: 'inactive', detail: `Status kelas: ${teachingClass.status}` };
  }
  const progress = getClassProgress(teachingClass, schedules, reports);
  if (teachingClass.status === 'completed' || progress.completed >= progress.required) {
    return { status: 'completed', detail: `${progress.completed}/${progress.required} sesi selesai` };
  }

  const today = now.toISOString().slice(0, 10);
  const plannedEnd = teachingClass.plannedEndDate;

  if (plannedEnd && plannedEnd < today && progress.remaining > 0) {
    return {
      status: 'overdue',
      detail: `Target ${plannedEnd} lewat · sisa ${progress.remaining} sesi`
    };
  }

  if (progress.remaining <= 2 || (plannedEnd && daysUntil(plannedEnd, today) <= 7)) {
    return {
      status: 'ending_soon',
      detail: `Sisa ${progress.remaining} sesi` + (plannedEnd ? ` · rencana selesai ${plannedEnd}` : '')
    };
  }

  if (plannedEnd && daysUntil(plannedEnd, today) <= 14 && progress.completed < progress.required / 2) {
    return {
      status: 'delayed',
      detail: `Progres ${progress.completed}/${progress.required} · rencana ${plannedEnd}`
    };
  }

  return {
    status: 'on_track',
    detail: `${progress.completed}/${progress.required} sesi selesai`
  };
}

function daysUntil(date: string, today: string) {
  const a = new Date(`${today}T00:00:00`).getTime();
  const b = new Date(`${date}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}
