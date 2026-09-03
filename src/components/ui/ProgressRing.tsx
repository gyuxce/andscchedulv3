export function ProgressRing({
  value,
  max,
  label,
  hint
}: {
  value: number;
  max: number;
  label?: string;
  hint?: string;
}) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const dash = circ * ratio;

  return (
    <div className="relative grid h-28 w-28 place-items-center">
      <svg viewBox="0 0 88 88" className="h-28 w-28 -rotate-90">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-lg font-bold leading-none text-ink">{label ?? `${value}/${max || 0}`}</div>
        {hint ? (
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{hint}</div>
        ) : null}
      </div>
    </div>
  );
}
