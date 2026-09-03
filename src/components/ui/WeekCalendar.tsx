import { useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { ClassSession } from '../../types';
import { isToday, timeToMinutes, toDateKey } from '../../lib/dates';
import { displayName, senseiRail, TYPE_TILE } from '../../lib/display';
import { isMakeupSession } from '../../lib/makeup';
import { useNow } from '../../lib/useNow';

const PX_PER_HOUR = 54;

/** Fit the visible window to the sessions actually on screen, so empty early
 *  hours don't waste vertical space. Falls back to a sane daytime range. */
function calBounds(sessions: ClassSession[]) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const session of sessions) {
    min = Math.min(min, timeToMinutes(session.startTime));
    max = Math.max(max, timeToMinutes(session.endTime));
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 8 * 60;
    max = 20 * 60;
  }
  const start = Math.max(6, Math.floor(min / 60)) * 60;
  const end = Math.max(start + 120, Math.min(22, Math.ceil(max / 60)) * 60);
  return { start, end };
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
  onSelect,
  focus
}: {
  days: Date[];
  sessions: ClassSession[];
  sensei: Array<{ id: string; name: string }>;
  conflictIds: Set<string>;
  onSelect: (session: ClassSession) => void;
  /** Bump `tick` to scroll a session into view and pulse it (e.g. from the conflict chip). */
  focus?: { id: string; tick: number } | null;
}) {
  const now = useNow(60_000);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!focus) return;
    const el = cellRefs.current.get(focus.id);
    if (!el) return;
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    el.classList.remove('cal-pulse');
    void el.offsetWidth;
    el.classList.add('cal-pulse');
    const timer = window.setTimeout(() => el.classList.remove('cal-pulse'), 1600);
    return () => window.clearTimeout(timer);
  }, [focus]);
  const { start: CAL_START, end: CAL_END } = useMemo(() => calBounds(sessions), [sessions]);
  const HEIGHT = ((CAL_END - CAL_START) / 60) * PX_PER_HOUR;
  const HOURS = useMemo(
    () => Array.from({ length: Math.round((CAL_END - CAL_START) / 60) + 1 }, (_, i) => CAL_START / 60 + i),
    [CAL_START, CAL_END]
  );
  const topFor = (time: string) =>
    ((Math.max(timeToMinutes(time), CAL_START) - CAL_START) / 60) * PX_PER_HOUR;
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
                today ? 'border-b-2 border-b-accent bg-accent-soft' : 'bg-surface'
              }`}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                {format(day, 'EEE', { locale: localeId })}
              </div>
              <div className={`text-sm font-bold ${today ? 'text-accent' : 'text-ink'}`}>{format(day, 'd')}</div>
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
          // Cap the columns so a heavily overbooked day (often migrated data) stays
          // readable — beyond the cap, blocks stack instead of shrinking to slivers.
          const cols = Math.min(count, 6);
          return (
            <div
              key={date}
              className={`relative border-l border-line ${today ? 'bg-surface-2' : ''}`}
              style={{ height: HEIGHT }}
            >
              {count > cols ? (
                <span className="absolute right-1 top-1 z-30 rounded bg-danger-soft px-1 py-0.5 text-[9px] font-bold text-danger">
                  {count} paralel
                </span>
              ) : null}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-line/80"
                  style={{ top: ((hour * 60 - CAL_START) / 60) * PX_PER_HOUR }}
                />
              ))}
              {today && showNow ? (
                <div className="absolute inset-x-0 z-20" style={{ top: nowTop }}>
                  <div className="absolute -left-1 h-2 w-2 -translate-y-1/2 rounded-full bg-danger" />
                  <div className="h-px bg-danger" />
                </div>
              ) : null}
              {daySessions.map((session) => {
                const index = lane.get(session.id) ?? 0;
                const col = index % cols;
                const width = 100 / cols;
                const conflict = conflictIds.has(session.id);
                const makeup = isMakeupSession(session);
                return (
                  <button
                    key={session.id}
                    type="button"
                    title={`${session.level} · ${session.startTime}–${session.endTime} · ${displayName(sensei, session.senseiId)}`}
                    ref={(el) => {
                      if (el) cellRefs.current.set(session.id, el);
                      else cellRefs.current.delete(session.id);
                    }}
                    onClick={() => onSelect(session)}
                    className={`absolute overflow-hidden rounded-lg border text-left transition-colors hover:border-line-strong ${
                      session.status === 'cancelled'
                        ? 'border-line bg-surface-2 opacity-60'
                        : conflict
                          ? 'border-danger bg-danger-soft ring-1 ring-danger/40'
                          : makeup
                            ? 'border-dashed border-info/60 bg-info-soft'
                            : session.isExtra
                              ? 'border-warn/50 bg-warn-soft'
                              : TYPE_TILE[session.type]
                    }`}
                    style={{
                      top: topFor(session.startTime),
                      height: Math.max(heightFor(session.startTime, session.endTime), 44),
                      left: `calc(${col * width}% + 4px)`,
                      width: `calc(${width}% - 8px)`,
                      zIndex: 10 + Math.min(index, 8)
                    }}
                  >
                    <span className={`absolute inset-y-0 left-0 w-1 ${senseiRail(session.senseiId)}`} />
                    <span className="block p-1.5 pl-2.5">
                      <span className="block truncate text-[11px] font-bold leading-tight text-ink">{session.level}</span>
                      <span className="block truncate text-[10px] text-ink-soft">
                        {session.startTime}–{session.endTime}
                      </span>
                      <span className="block truncate text-[10px] text-ink-soft">
                        {displayName(sensei, session.senseiId)}
                      </span>
                      {conflict ? <span className="text-[9px] font-bold uppercase text-danger">Konflik</span> : null}
                      {makeup ? <span className="text-[9px] font-bold uppercase text-info">Makeup</span> : null}
                      {session.isExtra ? <span className="text-[9px] font-bold uppercase text-warn">Extra</span> : null}
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
