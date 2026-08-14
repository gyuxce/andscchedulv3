import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export const WEEK_STARTS_ON = 1 as const;

export function toDateKey(date: Date | string) {
  if (typeof date === 'string') return date.slice(0, 10);
  return format(date, 'yyyy-MM-dd');
}

export function parseDate(date: string) {
  return parseISO(`${date}T00:00:00`);
}

export function weekStart(date: Date | string) {
  return startOfWeek(typeof date === 'string' ? parseDate(date) : date, { weekStartsOn: WEEK_STARTS_ON });
}

export function weekDays(anchor: Date | string) {
  const start = weekStart(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function weekRangeLabel(anchor: Date | string) {
  const days = weekDays(anchor);
  return `${format(days[0], 'd MMM', { locale: localeId })} – ${format(days[6], 'd MMM yyyy', { locale: localeId })}`;
}

export function minutesBetween(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

export function hoursBetween(startTime: string, endTime: string) {
  return minutesBetween(startTime, endTime) / 60;
}

export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && bStart < aEnd;
}

export function weekdayOf(date: string) {
  return parseDate(date).getDay();
}

export function formatDay(date: Date | string, pattern = 'EEE, d MMM') {
  const value = typeof date === 'string' ? parseDate(date) : date;
  return format(value, pattern, { locale: localeId });
}

export function formatDateTime(iso: string) {
  return format(new Date(iso), 'd MMM yyyy HH:mm', { locale: localeId });
}

export function combineDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

export function isToday(date: string) {
  return date === toDateKey(new Date());
}
