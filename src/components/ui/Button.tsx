import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Tone = 'primary' | 'secondary' | 'ghost' | 'danger';

const tones: Record<Tone, string> = {
  primary: 'bg-maple text-white hover:bg-maple-dark',
  secondary: 'bg-white text-ink border border-[#e2d6c4] hover:bg-paper',
  ghost: 'bg-transparent text-ink-soft hover:bg-white/60',
  danger: 'bg-rose-600 text-white hover:bg-rose-700'
};

export function Button({
  tone = 'secondary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; children: ReactNode }) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
