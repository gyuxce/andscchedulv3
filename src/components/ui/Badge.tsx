import type { ReactNode } from 'react';

const tones = {
  maple: 'bg-orange-50 text-maple border-orange-200',
  pine: 'bg-emerald-50 text-pine border-emerald-200',
  sky: 'bg-sky-50 text-sky border-sky-200',
  gold: 'bg-amber-50 text-[#8a6d12] border-amber-200',
  muted: 'bg-slate-100 text-slate-600 border-slate-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200'
};

export function Badge({
  children,
  tone = 'muted'
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span className={`inline-flex h-6 items-center rounded-full border px-2 text-[11px] font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}
