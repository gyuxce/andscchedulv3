import { addMonths, isWithinInterval, parseISO } from 'date-fns';
import type { ClassSession, LeavePeriod, Sensei, SenseiOperationalLabel, SenseiPrimaryStatus } from '../types';

export function isNewSensei(sensei: Sensei, today = new Date()) {
  if (sensei.primaryStatus !== 'ACTIVE') return false;
  const join = parseISO(`${sensei.joinDate}T00:00:00`);
  const expires = addMonths(join, 1);
  return today >= join && today < expires;
}

export function isOnCuti(senseiId: string, leavePeriods: LeavePeriod[], today = new Date()) {
  return leavePeriods.some((leave) => {
    if (leave.senseiId !== senseiId || leave.status !== 'approved') return false;
    return isWithinInterval(today, {
      start: parseISO(`${leave.startDate}T00:00:00`),
      end: parseISO(`${leave.endDate}T23:59:59`)
    });
  });
}

export function hasActiveClasses(senseiId: string, schedules: ClassSession[]) {
  return schedules.some((session) => session.senseiId === senseiId && session.status === 'active');
}

export function getOperationalLabels(
  sensei: Sensei,
  schedules: ClassSession[],
  leavePeriods: LeavePeriod[],
  today = new Date()
): SenseiOperationalLabel[] {
  if (sensei.primaryStatus !== 'ACTIVE') return [];
  const labels: SenseiOperationalLabel[] = [];
  if (isNewSensei(sensei, today)) labels.push('NEW');
  if (!hasActiveClasses(sensei.id, schedules)) labels.push('UNASSIGNED');
  if (isOnCuti(sensei.id, leavePeriods, today)) labels.push('CUTI');
  return labels;
}

export function statusTone(status: SenseiPrimaryStatus) {
  return status === 'ACTIVE' ? 'success' : 'muted';
}
