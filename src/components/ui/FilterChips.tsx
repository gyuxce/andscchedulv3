export function FilterChips<T extends string>({
  value,
  onChange,
  options
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ id: T; label: string; count?: number }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold transition ${
              active
                ? 'bg-maple text-white shadow-[0_8px_18px_rgba(124,77,255,0.22)]'
                : 'border border-line bg-surface text-ink-soft hover:bg-elevated hover:text-ink'
            }`}
          >
            {option.label}
            {option.count != null ? <span className="ml-1 opacity-75">{option.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
