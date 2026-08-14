import type { ClassSession, DisciplinaryMetrics, SessionLog } from '../types';

export function monthKey(date: Date | string) {
  const value = typeof date === 'string' ? date : date.toISOString();
  return value.slice(0, 7);
}

export function getDisciplinaryMetrics(
  senseiId: string,
  month: string,
  schedules: ClassSession[],
  logs: SessionLog[]
): DisciplinaryMetrics {
  const inMonth = (date: string) => date.startsWith(month);

  const senseiInitiatedSwaps = schedules.filter((session) => {
    if (session.swapInitiator !== 'Sensei' || !inMonth(session.date)) return false;
    const attributableId = session.originalSenseiId ?? session.senseiId;
    return attributableId === senseiId;
  }).length;

  const cancelledNoReplacement = schedules.filter(
    (session) =>
      session.originalSenseiId === senseiId &&
      session.status === 'cancelled' &&
      session.cancellationInitiator === 'Sensei' &&
      session.replacementSecured === false &&
      inMonth(session.date)
  ).length;

  const lateJoins = logs.filter((log) => {
    if (log.senseiId !== senseiId || !log.lateJoin) return false;
    const session = schedules.find((item) => item.id === log.scheduleId);
    return session ? inMonth(session.date) : false;
  }).length;

  return {
    senseiId,
    month,
    senseiInitiatedSwaps,
    cancelledNoReplacement,
    lateJoins
  };
}
