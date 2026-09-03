import type { AttendanceStatus, ClassType, SessionWorkflowState } from '../types';

// Class type is identified by its label, not by colour — colour is reserved for
// state (semantic) so the UI reads as one system instead of a palette per screen.
export const TYPE_TONE: Record<ClassType, 'gold' | 'pine' | 'maple' | 'sky' | 'muted'> = {
  Private: 'muted',
  'Semi-Private': 'muted',
  Group: 'muted',
  'Kids Private': 'muted',
  'Kids Semi Private': 'muted'
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
  Private: 'bg-line-strong',
  'Semi-Private': 'bg-line-strong',
  Group: 'bg-line-strong',
  'Kids Private': 'bg-line-strong',
  'Kids Semi Private': 'bg-line-strong'
};

export const TYPE_TILE: Record<ClassType, string> = {
  Private: 'bg-surface border-line',
  'Semi-Private': 'bg-surface border-line',
  Group: 'bg-surface border-line',
  'Kids Private': 'bg-surface border-line',
  'Kids Semi Private': 'bg-surface border-line'
};

const CAL_RAILS = [
  'bg-[var(--cal-1)]',
  'bg-[var(--cal-2)]',
  'bg-[var(--cal-3)]',
  'bg-[var(--cal-4)]',
  'bg-[var(--cal-5)]',
  'bg-[var(--cal-6)]'
];

/** Deterministic low-chroma rail colour per Sensei, so a Sensei's sessions read
 *  as one visual thread across the week without flooding blocks with colour. */
export function senseiRail(senseiId?: string | null): string {
  if (!senseiId) return 'bg-line-strong';
  let hash = 0;
  for (let i = 0; i < senseiId.length; i += 1) {
    hash = (hash * 31 + senseiId.charCodeAt(i)) >>> 0;
  }
  return CAL_RAILS[hash % CAL_RAILS.length];
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
