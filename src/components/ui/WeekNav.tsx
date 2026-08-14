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
    <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
      <div className="flex items-center gap-2">
        <Button
          onClick={() => onChange(format(addDays(start, -7), 'yyyy-MM-dd'))}
          aria-label="Minggu sebelumnya"
        >
          <ChevronLeft size={16} />
        </Button>
        <div className="min-w-0 flex-1 text-center text-xs font-bold text-ink sm:min-w-40 sm:text-sm">
          {weekRangeLabel(weekAnchor)}
        </div>
        <Button
          onClick={() => onChange(format(addDays(start, 7), 'yyyy-MM-dd'))}
          aria-label="Minggu berikutnya"
        >
          <ChevronRight size={16} />
        </Button>
      </div>
      <Button onClick={() => onChange(format(new Date(), 'yyyy-MM-dd'))}>Minggu ini</Button>
    </div>
  );
}
