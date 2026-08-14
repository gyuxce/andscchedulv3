import type { ClassSession, SessionLog, SessionReport, SessionWorkflowState } from '../types';
import { classStartUtc } from './timezone';

export function getSessionWorkflow(
  session: ClassSession,
  log?: SessionLog,
  report?: SessionReport
): SessionWorkflowState {
  if (session.status === 'cancelled') return 'cancelled';
  if (report) return 'completed';
  if (log?.clockOutAt) return 'report_pending';
  if (log?.clockInAt) return 'in_progress';
  return 'ready';
}

export function workflowLabel(state: SessionWorkflowState) {
  return {
    ready: 'Belum mulai',
    in_progress: 'Sedang berjalan',
    report_pending: 'Laporan belum diisi',
    completed: 'Selesai',
    cancelled: 'Dibatalkan'
  }[state];
}

/**
 * Late-join compares clock-in (absolute) against class start interpreted
 * in the teaching Sensei's timezone, then applies grace minutes.
 */
export function isLateJoin(
  session: ClassSession,
  clockInAt: string,
  graceMinutes: number,
  senseiTimezone?: string | null
) {
  const scheduled = classStartUtc(session.date, session.startTime, senseiTimezone);
  const actual = new Date(clockInAt);
  const diff = (actual.getTime() - scheduled.getTime()) / 60000;
  return diff > graceMinutes;
}

export function expectedStudentCount(session: ClassSession) {
  return Math.max(1, session.studentIds.length);
}
