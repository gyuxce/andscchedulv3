export function Meter({
  value,
  max = 1,
  tone = 'maple',
  className = ''
}: {
  value: number | null | undefined;
  max?: number;
  tone?: 'maple' | 'gold' | 'danger' | 'pine';
  className?: string;
}) {
  const ratio = max > 0 && value != null && Number.isFinite(value) ? Math.min(Math.max(value / max, 0), 1) : 0;
  const fill = {
    maple: 'bg-maple',
    gold: 'bg-amber-400',
    danger: 'bg-rose-500',
    pine: 'bg-emerald-500'
  }[tone];

  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-line ${className}`}>
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}
