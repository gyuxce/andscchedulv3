import { addDays, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { weekRangeLabel, weekStart } from '../../lib/dates';
import { Button } from './Button';

export function WeekNav({
  weekAnchor,
  onChange
}: {
  weekAnchor: string;
  onChange: (date: string) => void;
}) {
  const start = weekStart(weekAnchor);
  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => onChange(format(addDays(start, -7), 'yyyy-MM-dd'))}
        aria-label="Minggu sebelumnya"
      >
        <ChevronLeft size={16} />
      </Button>
      <div className="min-w-40 text-center text-sm font-bold text-ink">{weekRangeLabel(weekAnchor)}</div>
      <Button
        onClick={() => onChange(format(addDays(start, 7), 'yyyy-MM-dd'))}
        aria-label="Minggu berikutnya"
      >
        <ChevronRight size={16} />
      </Button>
      <Button onClick={() => onChange(format(new Date(), 'yyyy-MM-dd'))}>Minggu ini</Button>
    </div>
  );
}
