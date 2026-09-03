import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Tone = 'primary' | 'secondary' | 'ghost' | 'danger';

const tones: Record<Tone, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-surface-2',
  ghost: 'bg-transparent text-ink-soft hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-white hover:opacity-90'
};

export function Button({
  tone = 'secondary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; children: ReactNode }) {
  return (
    <button
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-field)] px-3.5 text-sm font-medium transition-colors duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
