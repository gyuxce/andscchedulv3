import { initials } from '../../lib/display';

const sizes = {
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-12 w-12 text-sm'
};

export function Avatar({
  name,
  size = 'md',
  className = ''
}: {
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] font-bold text-maple ${sizes[size]} ${className}`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
