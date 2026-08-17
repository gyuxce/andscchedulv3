import type { ReactNode } from 'react';

export function DetailFields({
  items
}: {
  items: Array<{ label: string; value: ReactNode; full?: boolean }>;
}) {
  return (
    <dl className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-xl border border-[#efe4d2] bg-white/70 px-3 py-2.5 ${item.full ? 'md:col-span-2' : ''}`}
        >
          <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{item.label}</dt>
          <dd className="mt-1 text-sm font-semibold text-ink">{item.value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
