import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  hint,
  icon,
  onClick
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">{label}</p>
        <p className="mt-2 text-[28px] font-bold leading-none tracking-tight text-ink">{value}</p>
        {hint ? <p className="mt-2 text-xs text-ink-soft">{hint}</p> : null}
      </div>
      {icon ? (
        <div className="rounded-2xl bg-surface p-2.5 text-maple shadow-sm">{icon}</div>
      ) : null}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="ui-card w-full p-5 text-left transition duration-150 hover:-translate-y-0.5 hover:border-maple/35 hover:shadow-[var(--shadow-lift)]"
      >
        {body}
      </button>
    );
  }

  return <div className="ui-card p-5">{body}</div>;
}
