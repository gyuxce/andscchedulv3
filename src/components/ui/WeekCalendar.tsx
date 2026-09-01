import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { ClassSession } from '../../types';
import { isToday, timeToMinutes, toDateKey } from '../../lib/dates';
import { displayName, TYPE_RAIL, TYPE_TILE } from '../../lib/display';
import { isMakeupSession } from '../../lib/makeup';
import { useNow } from '../../lib/useNow';

const CAL_START = 7 * 60;
const CAL_END = 21 * 60;
const PX_PER_HOUR = 52;
const HEIGHT = ((CAL_END - CAL_START) / 60) * PX_PER_HOUR;
const HOURS = Array.from({ length: 15 }, (_, index) => 7 + index);

function topFor(time: string) {
  return ((Math.max(timeToMinutes(time), CAL_START) - CAL_START) / 60) * PX_PER_HOUR;
}

function heightFor(start: string, end: string) {
  const minutes = Math.max(timeToMinutes(end) - timeToMinutes(start), 30);
  return (minutes / 60) * PX_PER_HOUR;
}

function lanesFor(sessions: ClassSession[]) {
  const sorted = [...sessions].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const laneEnd: string[] = [];
  const lane = new Map<string, number>();
  for (const session of sorted) {
    let index = laneEnd.findIndex((end) => end <= session.startTime);
    if (index < 0) {
      index = laneEnd.length;
      laneEnd.push(session.endTime);
    } else {
      laneEnd[index] = session.endTime;
    }
    lane.set(session.id, index);
  }
  return { lane, count: Math.max(laneEnd.length, 1) };
}

export function WeekCalendar({
  days,
  sessions,
  sensei,
  conflictIds,
  onSelect
}: {
  days: Date[];
  sessions: ClassSession[];
  sensei: Array<{ id: string; name: string }>;
  conflictIds: Set<string>;
  onSelect: (session: ClassSession) => void;
}) {
  const now = useNow(60_000);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNow = nowMinutes >= CAL_START && nowMinutes <= CAL_END;
  const nowTop = ((nowMinutes - CAL_START) / 60) * PX_PER_HOUR;

  return (
    <div className="ui-card overflow-auto">
      <div className="grid min-w-[920px]" style={{ gridTemplateColumns: '56px repeat(7, minmax(0, 1fr))' }}>
        <div className="sticky top-0 z-10 border-b border-line bg-surface px-2 py-3 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
          Jam
        </div>
        {days.map((day) => {
          const today = isToday(toDateKey(day));
          return (
            <div
              key={day.toISOString()}
              className={`sticky top-0 z-10 border-b border-l border-line px-2 py-3 text-center ${
                today ? 'bg-[var(--accent-soft)]' : 'bg-surface'
              }`}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                {format(day, 'EEE', { locale: localeId })}
              </div>
              <div className={`text-sm font-bold ${today ? 'text-maple' : 'text-ink'}`}>{format(day, 'd')}</div>
            </div>
          );
        })}

        <div className="relative border-r border-line" style={{ height: HEIGHT }}>
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute right-2 -translate-y-1 text-[10px] font-semibold text-ink-soft"
              style={{ top: ((hour * 60 - CAL_START) / 60) * PX_PER_HOUR }}
            >
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {days.map((day) => {
          const date = toDateKey(day);
          const today = isToday(date);
          const daySessions = sessions.filter((session) => session.date === date);
          const { lane, count } = lanesFor(daySessions);
          return (
            <div
              key={date}
              className={`relative border-l border-line ${today ? 'bg-[var(--accent-soft)]/35' : ''}`}
              style={{ height: HEIGHT }}
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-line/80"
                  style={{ top: ((hour * 60 - CAL_START) / 60) * PX_PER_HOUR }}
                />
              ))}
              {today && showNow ? (
                <div className="absolute inset-x-0 z-20" style={{ top: nowTop }}>
                  <div className="absolute -left-1 h-2 w-2 -translate-y-1/2 rounded-full bg-rose-500" />
                  <div className="h-px bg-rose-500" />
                </div>
              ) : null}
              {daySessions.map((session) => {
                const index = lane.get(session.id) ?? 0;
                const width = 100 / count;
                const conflict = conflictIds.has(session.id);
                const makeup = isMakeupSession(session);
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => onSelect(session)}
                    className={`absolute z-10 overflow-hidden rounded-xl border text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] ${
                      session.status === 'cancelled'
                        ? 'border-rose-200 bg-rose-50/80 opacity-60 dark:border-rose-500/30 dark:bg-rose-500/10'
                        : conflict
                          ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-300 dark:border-rose-400/60 dark:bg-rose-500/15'
                          : makeup
                            ? 'border-dashed border-sky-400 bg-sky-50 dark:bg-sky-500/10'
                            : session.isExtra
                              ? 'border-amber-300 bg-amber-50 dark:bg-amber-500/10'
                              : TYPE_TILE[session.type]
                    }`}
                    style={{
                      top: topFor(session.startTime),
                      height: Math.max(heightFor(session.startTime, session.endTime), 44),
                      left: `calc(${index * width}% + 4px)`,
                      width: `calc(${width}% - 8px)`
                    }}
                  >
                    <span className={`absolute inset-y-0 left-0 w-1 ${TYPE_RAIL[session.type]}`} />
                    <span className="block p-1.5 pl-2.5">
                      <span className="block truncate text-[11px] font-bold leading-tight text-ink">{session.level}</span>
                      <span className="block truncate text-[10px] text-ink-soft">
                        {session.startTime}–{session.endTime}
                      </span>
                      <span className="block truncate text-[10px] text-ink-soft">
                        {displayName(sensei, session.senseiId)}
                      </span>
                      {conflict ? <span className="text-[9px] font-bold uppercase text-rose-700">Konflik</span> : null}
                      {makeup ? <span className="text-[9px] font-bold uppercase text-sky-700">Makeup</span> : null}
                      {session.isExtra ? <span className="text-[9px] font-bold uppercase text-amber-800">Extra</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
