import type { SessionStripCell } from '../../lib/classProgress';
import { formatDay } from '../../lib/dates';

const CELL: Record<SessionStripCell['state'], string> = {
  completed: 'bg-maple text-white border-maple shadow-[0_6px_14px_rgba(124,77,255,0.22)]',
  next: 'border-2 border-maple bg-[var(--accent-soft)] text-maple',
  due: 'border border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
  scheduled: 'border border-line bg-surface text-ink-soft',
  empty: 'border border-dashed border-line bg-transparent text-ink-soft/45'
};

const LABEL: Record<SessionStripCell['state'], string> = {
  completed: 'Selesai',
  next: 'Berikutnya',
  due: 'Terlewat',
  scheduled: 'Terjadwal',
  empty: 'Belum digenerate'
};

export function SessionStrip({ cells }: { cells: SessionStripCell[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {cells.map((cell) => (
        <span
          key={cell.index}
          title={`${LABEL[cell.state]}${cell.date ? ` · ${formatDay(cell.date, 'd MMM')}` : ''}`}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold ${CELL[cell.state]}`}
        >
          {cell.index}
        </span>
      ))}
    </div>
  );
}

export function SessionStripLegend() {
  const items: Array<{ state: SessionStripCell['state']; label: string }> = [
    { state: 'completed', label: 'Selesai' },
    { state: 'next', label: 'Berikutnya' },
    { state: 'scheduled', label: 'Terjadwal' },
    { state: 'due', label: 'Terlewat' },
    { state: 'empty', label: 'Kosong' }
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-soft">
      {items.map((item) => (
        <span key={item.state} className="inline-flex items-center gap-1.5">
          <span className={`h-3.5 w-3.5 rounded ${CELL[item.state]}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
