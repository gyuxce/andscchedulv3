import type { ClassSession, SessionLog } from '../types';
import { minutesBetween } from './dates';

export function scheduledDurationMinutes(session: ClassSession) {
  return minutesBetween(session.startTime, session.endTime);
}

export function actualDurationMinutes(log?: SessionLog | null) {
  if (!log?.clockInAt || !log?.clockOutAt) return null;
  const start = new Date(log.clockInAt).getTime();
  const end = new Date(log.clockOutAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / 60000);
}

export function durationVarianceMinutes(session: ClassSession, log?: SessionLog | null) {
  const actual = actualDurationMinutes(log);
  if (actual == null) return null;
  return actual - scheduledDurationMinutes(session);
}

export function formatDurationMinutes(minutes: number | null | undefined) {
  if (minutes == null || !Number.isFinite(minutes)) return '—';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const core = h > 0 ? `${h}j ${m}m` : `${m}m`;
  if (minutes < 0) return `−${core}`;
  return core;
}
