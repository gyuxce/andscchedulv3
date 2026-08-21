import type { ReactNode } from 'react';

const tones = {
  maple:
    'bg-orange-50 text-maple border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/25',
  pine: 'bg-emerald-50 text-pine border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25',
  sky: 'bg-sky-50 text-sky border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/25',
  gold: 'bg-amber-50 text-[#8a6d12] border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/25',
  muted: 'bg-elevated text-ink-soft border-line',
  danger: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/25',
  success:
    'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25'
};

export function Badge({
  children,
  tone = 'muted'
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={`inline-flex h-5 items-center rounded-md border px-1.5 text-[10px] font-semibold tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
