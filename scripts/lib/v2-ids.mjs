import { createHash } from 'node:crypto';

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Deterministic UUID so CSV remap and live copy land on the same id. */
export function toUuid(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.toLowerCase() === 'null') return '';
  if (UUID_RE.test(raw)) return raw.toLowerCase();
  const hash = createHash('sha1').update(`ans-v2-id:${raw}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function isUuid(value) {
  return UUID_RE.test(String(value ?? '').trim());
}
