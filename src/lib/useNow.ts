import { useEffect, useState } from 'react';

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export function formatCountdown(target: Date, now: Date) {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return null;
  const totalMinutes = Math.round(diff / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `mulai dalam ${minutes}m`;
  return `mulai dalam ${hours}j ${minutes}m`;
}
