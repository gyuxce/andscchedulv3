import type { ClassSession } from '../types';
import { timesOverlap } from './dates';

export function findConflicts(schedules: ClassSession[], candidate?: ClassSession) {
  const active = schedules.filter((session) => session.status !== 'cancelled');
  const conflicts: Array<{ a: ClassSession; b: ClassSession }> = [];

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i];
      const b = active[j];
      if (a.senseiId !== b.senseiId || a.date !== b.date) continue;
      if (timesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
        conflicts.push({ a, b });
      }
    }
  }

  if (candidate && candidate.status !== 'cancelled') {
    for (const session of active) {
      if (session.id === candidate.id) continue;
      if (session.senseiId !== candidate.senseiId || session.date !== candidate.date) continue;
      if (timesOverlap(session.startTime, session.endTime, candidate.startTime, candidate.endTime)) {
        conflicts.push({ a: session, b: candidate });
      }
    }
  }

  return conflicts;
}

export function wouldConflict(schedules: ClassSession[], candidate: ClassSession) {
  return findConflicts(schedules, candidate).some(
    (pair) => pair.a.id === candidate.id || pair.b.id === candidate.id
  );
}
