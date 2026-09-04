import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import type { SenseiTimezone } from '../types';

export const DEFAULT_SENSEI_TIMEZONE: SenseiTimezone = 'Asia/Jakarta';

export type TimezoneAbbreviation = 'WIB' | 'WITA' | 'WIT' | 'JST';

export const SENSEI_TIMEZONE_OPTIONS: Array<{
  value: SenseiTimezone;
  label: string;
  abbreviation: TimezoneAbbreviation;
}> = [
  { value: 'Asia/Jakarta', label: 'Waktu Indonesia Barat', abbreviation: 'WIB' },
  { value: 'Asia/Makassar', label: 'Waktu Indonesia Tengah', abbreviation: 'WITA' },
  { value: 'Asia/Jayapura', label: 'Waktu Indonesia Timur', abbreviation: 'WIT' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time', abbreviation: 'JST' }
];

export function normalizeTimezone(timezone?: string | null): SenseiTimezone {
  if (timezone === 'Asia/Makassar' || timezone === 'WITA') return 'Asia/Makassar';
  if (timezone === 'Asia/Jayapura' || timezone === 'WIT') return 'Asia/Jayapura';
  if (timezone === 'Asia/Tokyo' || timezone === 'JST') return 'Asia/Tokyo';
  if (timezone === 'Asia/Jakarta' || timezone === 'WIB') return 'Asia/Jakarta';
  return DEFAULT_SENSEI_TIMEZONE;
}

export function timezoneAbbreviation(timezone?: string | null): TimezoneAbbreviation {
  const normalized = normalizeTimezone(timezone);
  return SENSEI_TIMEZONE_OPTIONS.find((item) => item.value === normalized)?.abbreviation ?? 'WIB';
}

export function timezoneLabel(timezone?: string | null) {
  const normalized = normalizeTimezone(timezone);
  const option = SENSEI_TIMEZONE_OPTIONS.find((item) => item.value === normalized);
  return option ? `${option.abbreviation} · ${option.label}` : 'WIB';
}

/** Interpret local class date+time in the Sensei's zone as an absolute UTC instant. */
export function classStartUtc(date: string, startTime: string, timezone?: string | null) {
  const zone = normalizeTimezone(timezone);
  return fromZonedTime(`${date}T${startTime}:00`, zone);
}

export function formatInSenseiZone(
  iso: string | null | undefined,
  timezone?: string | null,
  pattern = 'd MMM yyyy HH:mm'
) {
  if (!iso) return '—';
  return `${formatInTimeZone(iso, normalizeTimezone(timezone), pattern)} ${timezoneAbbreviation(timezone)}`;
}
