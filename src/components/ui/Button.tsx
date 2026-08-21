import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Tone = 'primary' | 'secondary' | 'ghost' | 'danger';

const tones: Record<Tone, string> = {
  primary: 'bg-maple text-white hover:bg-maple-dark shadow-none',
  secondary: 'bg-surface text-ink border border-line hover:bg-elevated',
  ghost: 'bg-transparent text-ink-soft hover:bg-elevated hover:text-ink',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400'
};

export function Button({
  tone = 'secondary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; children: ReactNode }) {
  return (
    <button
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
