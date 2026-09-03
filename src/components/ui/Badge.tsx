import type { ReactNode } from 'react';

const tones = {
  maple: 'bg-accent-soft text-accent',
  pine: 'bg-ok-soft text-ok',
  sky: 'bg-info-soft text-info',
  gold: 'bg-warn-soft text-warn',
  muted: 'bg-surface-2 text-ink-soft',
  danger: 'bg-danger-soft text-danger',
  success: 'bg-ok-soft text-ok'
};

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: keyof typeof tones }) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full border border-current/20 px-2.5 text-[11px] font-semibold tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
