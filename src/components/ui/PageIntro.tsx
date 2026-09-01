import type { ReactNode } from 'react';

export function PageIntro({
  kicker,
  title,
  children,
  actions
}: {
  kicker?: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        {kicker ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-maple">{kicker}</p>
        ) : null}
        <h3 className={`text-3xl font-bold tracking-tight text-ink ${kicker ? 'mt-2' : ''}`}>{title}</h3>
        {children ? <div className="mt-2 text-sm leading-6 text-ink-soft">{children}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
