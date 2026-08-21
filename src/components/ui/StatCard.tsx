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
        <p className="text-[11px] font-semibold tracking-wide text-ink-soft">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</p>
        {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
      </div>
      {icon ? <div className="rounded-lg bg-elevated p-2 text-maple">{icon}</div> : null}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="ui-card w-full p-4 text-left transition hover:border-maple/40 hover:bg-elevated/60"
      >
        {body}
      </button>
    );
  }

  return <div className="ui-card p-4">{body}</div>;
}
