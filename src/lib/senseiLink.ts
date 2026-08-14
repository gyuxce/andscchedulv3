import type { Sensei } from '../types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value?: string | null) {
  return Boolean(value && UUID_RE.test(value));
}

export function resolveSenseiId(
  senseiList: Sensei[],
  options: { senseiId?: string | null; email?: string | null }
) {
  if (isUuid(options.senseiId)) {
    const byId = senseiList.find((item) => item.id === options.senseiId);
    if (byId) return byId.id;
  }

  const email = (options.email || '').toLowerCase().trim();
  if (!email) return undefined;

  const byEmail = senseiList.find((item) => (item.email || '').toLowerCase().trim() === email);
  return byEmail?.id;
}
