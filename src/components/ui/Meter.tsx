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
  const ratio =
    max > 0 && value != null && Number.isFinite(value) ? Math.min(Math.max(value / max, 0), 1) : 0;
  const fill = {
    maple: 'bg-accent',
    gold: 'bg-warn',
    danger: 'bg-danger',
    pine: 'bg-ok'
  }[tone];

  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-line ${className}`}>
      <div
        className={`h-full rounded-full transition-[width] duration-300 ease-out ${fill}`}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
