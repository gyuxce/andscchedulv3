import type { AttendanceStatus, ClassType, SessionWorkflowState } from '../types';

export const TYPE_TONE: Record<ClassType, 'gold' | 'pine' | 'maple' | 'sky' | 'muted'> = {
  Private: 'gold',
  'Semi-Private': 'pine',
  Group: 'maple',
  'Kids Private': 'sky',
  'Kids Semi Private': 'sky'
};

export const WORKFLOW_TONE: Record<SessionWorkflowState, 'muted' | 'sky' | 'gold' | 'success' | 'danger'> = {
  ready: 'muted',
  in_progress: 'sky',
  report_pending: 'gold',
  completed: 'success',
  cancelled: 'danger'
};

export const ATTENDANCE_TONE: Record<AttendanceStatus, 'success' | 'gold' | 'sky' | 'danger' | 'muted'> = {
  Present: 'success',
  Late: 'gold',
  Excused: 'sky',
  Absent: 'danger',
  Partial: 'muted'
};

export function displayName(list: Array<{ id: string; name: string }>, id?: string | null) {
  return list.find((item) => item.id === id)?.name ?? '—';
}
