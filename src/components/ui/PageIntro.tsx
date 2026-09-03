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
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">{kicker}</p>
        ) : null}
        <h3 className={`text-[1.6rem] font-semibold tracking-tight text-ink ${kicker ? 'mt-1.5' : ''}`}>
          {title}
        </h3>
        {children ? <div className="mt-2 text-sm leading-6 text-ink-soft">{children}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
