import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  hint,
  icon
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="ui-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{label}</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{value}</p>
          {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
        </div>
        {icon ? <div className="rounded-2xl bg-paper p-2 text-maple">{icon}</div> : null}
      </div>
    </div>
  );
}
