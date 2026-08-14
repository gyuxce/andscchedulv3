import type { ClassSession, SessionReport } from '../types';

export function isMakeupSession(session: ClassSession) {
  return Boolean(session.makeupOfSessionId);
}

export function findMakeupsOf(originalId: string, schedules: ClassSession[]) {
  return schedules.filter((session) => session.makeupOfSessionId === originalId);
}

export function hasActiveOrCompletedMakeup(originalId: string, schedules: ClassSession[]) {
  return findMakeupsOf(originalId, schedules).some((session) => session.status !== 'cancelled');
}

/** Original cancelled sessions that already have a makeup should not count academically. */
export function isSupersededByMakeup(session: ClassSession, schedules: ClassSession[]) {
  if (session.status !== 'cancelled') return false;
  return hasActiveOrCompletedMakeup(session.id, schedules);
}

/**
 * Academic history rows: keep makeup reports; drop reports on cancelled originals
 * that already have a linked makeup (avoids double-counting progress/attendance).
 */
export function filterAcademicReportRows<T extends { session: ClassSession; report: SessionReport }>(
  rows: T[],
  schedules: ClassSession[]
): T[] {
  return rows.filter((row) => !isSupersededByMakeup(row.session, schedules));
}

export function makeupLabel(session: ClassSession, schedules: ClassSession[]) {
  if (!session.makeupOfSessionId) return null;
  const original = schedules.find((item) => item.id === session.makeupOfSessionId);
  if (!original) return `Makeup dari sesi ${session.makeupOfSessionId.slice(0, 8)}…`;
  return `Makeup dari ${original.date} ${original.startTime}`;
}
