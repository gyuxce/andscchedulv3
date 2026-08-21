import type { ReactNode } from 'react';

export function DetailFields({
  items
}: {
  items: Array<{ label: string; value: ReactNode; full?: boolean }>;
}) {
  return (
    <dl className="grid gap-2 md:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-lg border border-line bg-elevated/50 px-3 py-2.5 ${item.full ? 'md:col-span-2' : ''}`}
        >
          <dt className="text-[11px] font-semibold tracking-wide text-ink-soft">{item.label}</dt>
          <dd className="mt-1 text-sm font-semibold text-ink">{item.value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
