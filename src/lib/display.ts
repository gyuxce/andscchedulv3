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

export const TYPE_RAIL: Record<ClassType, string> = {
  Private: 'bg-amber-400',
  'Semi-Private': 'bg-emerald-500',
  Group: 'bg-maple',
  'Kids Private': 'bg-sky-400',
  'Kids Semi Private': 'bg-sky-400'
};

export const TYPE_TILE: Record<ClassType, string> = {
  Private: 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30',
  'Semi-Private': 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30',
  Group: 'bg-[var(--accent-soft)] border-violet-200 dark:border-violet-500/30',
  'Kids Private': 'bg-sky-50 border-sky-200 dark:bg-sky-500/10 dark:border-sky-500/30',
  'Kids Semi Private': 'bg-sky-50 border-sky-200 dark:bg-sky-500/10 dark:border-sky-500/30'
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
