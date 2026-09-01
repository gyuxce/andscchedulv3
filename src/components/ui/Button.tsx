import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Tone = 'primary' | 'secondary' | 'ghost' | 'danger';

const tones: Record<Tone, string> = {
  primary:
    'bg-maple text-white shadow-[0_8px_20px_rgba(124,77,255,0.22)] hover:-translate-y-px hover:bg-maple-dark hover:shadow-[0_12px_24px_rgba(124,77,255,0.28)]',
  secondary: 'bg-[var(--solid)] text-[var(--on-solid)] hover:-translate-y-px hover:opacity-90',
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
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
