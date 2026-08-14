import type { AvailabilitySlot, ClassSession, WorkloadMetrics } from '../types';
import { WEEKLY_HOUR_TARGET } from '../constants';
import { hoursBetween, toDateKey, weekdayOf, weekDays } from './dates';

export function availabilityHoursForWeek(
  slots: AvailabilitySlot[],
  senseiId: string,
  weekAnchor: Date | string
) {
  const days = weekDays(weekAnchor);
  let hours = 0;

  for (const day of days) {
    const dateKey = toDateKey(day);
    const weekday = weekdayOf(dateKey);
    for (const slot of slots) {
      if (!slot.isActive || slot.senseiId !== senseiId) continue;
      const matches =
        (slot.pattern === 'specific_date' && slot.date === dateKey) ||
        (slot.pattern === 'weekly' && slot.weekday === weekday);
      if (matches) hours += hoursBetween(slot.startTime, slot.endTime);
    }
  }

  return hours;
}

export function assignedHoursForWeek(
  schedules: ClassSession[],
  senseiId: string,
  weekAnchor: Date | string
) {
  const validDates = new Set(weekDays(weekAnchor).map(toDateKey));
  return schedules
    .filter(
      (session) =>
        session.senseiId === senseiId &&
        session.status !== 'cancelled' &&
        validDates.has(session.date)
    )
    .reduce((sum, session) => sum + hoursBetween(session.startTime, session.endTime), 0);
}

export function getWorkloadMetrics(
  senseiId: string,
  slots: AvailabilitySlot[],
  schedules: ClassSession[],
  weekAnchor: Date | string,
  targetHours = WEEKLY_HOUR_TARGET
): WorkloadMetrics {
  const availableHours = availabilityHoursForWeek(slots, senseiId, weekAnchor);
  const assignedHours = assignedHoursForWeek(schedules, senseiId, weekAnchor);
  const remainingHours = availableHours - assignedHours;
  const utilization = availableHours > 0 ? assignedHours / availableHours : null;

  return {
    senseiId,
    availableHours,
    assignedHours,
    remainingHours,
    utilization,
    targetHours,
    targetGap: targetHours - assignedHours,
    targetProgress: Math.min(assignedHours / targetHours, 1)
  };
}

export function formatHours(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} jam` : `${rounded.toFixed(1)} jam`;
}

export function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—';
  return `${Math.round(value * 100)}%`;
}
