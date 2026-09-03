import { addDays, format, getDay, parseISO } from 'date-fns';

/** Generate up to `count` dates starting from startDate that fall on selected weekdays (0=Sun..6=Sat). */
export function generateRecurringDates(
  startDate: string,
  weekdays: number[],
  count: number
): string[] {
  if (!startDate || weekdays.length === 0 || count <= 0) return [];
  const uniqueDays = [...new Set(weekdays)].sort((a, b) => a - b);
  const dates: string[] = [];
  let cursor = parseISO(`${startDate}T00:00:00`);
  // include startDate if it matches
  let guard = 0;
  while (dates.length < count && guard < count * 14 + 60) {
    if (uniqueDays.includes(getDay(cursor))) {
      dates.push(format(cursor, 'yyyy-MM-dd'));
    }
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return dates;
}

export function addMinutesToTime(startTime: string, minutes: number) {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + minutes;
  // Sessions never roll past midnight here; clamp to 23:59 instead of wrapping
  // with `% 24`, which would produce endTime < startTime and break overlap and
  // duration math downstream.
  const clamped = Math.min(Math.max(total, 0), 23 * 60 + 59);
  const endH = Math.floor(clamped / 60);
  const endM = clamped % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export function suggestPlannedEndDate(startDate: string, weekdays: number[], requiredMeetings: number) {
  const dates = generateRecurringDates(startDate, weekdays, requiredMeetings);
  return dates[dates.length - 1] ?? startDate;
}
