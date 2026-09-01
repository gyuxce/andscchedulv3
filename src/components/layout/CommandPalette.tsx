import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, GraduationCap, LayoutDashboard, Search, Users } from 'lucide-react';
import { NAV_BY_ROLE, TAB_LABELS } from '../../constants';
import { displayName } from '../../lib/display';
import { toDateKey } from '../../lib/dates';
import { useDashboardStore, useScopedData } from '../../store/useDashboardStore';
import type { TabId } from '../../types';

const ICONS: Partial<Record<TabId, typeof LayoutDashboard>> = {
  overview: LayoutDashboard,
  schedule: CalendarDays,
  sensei: Users,
  students: GraduationCap
};

type Hit = {
  id: string;
  label: string;
  hint: string;
  tab: TabId;
};

export function CommandPalette({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const currentUser = useDashboardStore((state) => state.currentUser);
  const setTab = useDashboardStore((state) => state.setTab);
  const allSensei = useDashboardStore((state) => state.sensei);
  const allStudents = useDashboardStore((state) => state.students);
  const { schedules, sensei, students } = useScopedData();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const tabs = currentUser ? NAV_BY_ROLE[currentUser.role] : [];
  const senseiList = sensei.length ? sensei : allSensei;
  const studentList = students.length ? students : allStudents;
  const today = toDateKey(new Date());

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: Hit[] = [];

    for (const tab of tabs) {
      const label = TAB_LABELS[tab];
      if (!q || label.toLowerCase().includes(q) || tab.includes(q)) {
        items.push({ id: `tab-${tab}`, label, hint: 'Menu', tab });
      }
    }

    for (const item of senseiList.slice(0, 40)) {
      const hay = `${item.name} ${item.email}`.toLowerCase();
      if (!q || hay.includes(q)) {
        items.push({
          id: `sensei-${item.id}`,
          label: item.name,
          hint: item.email || 'Sensei',
          tab: tabs.includes('sensei') ? 'sensei' : 'schedule'
        });
      }
    }

    for (const item of studentList.slice(0, 40)) {
      const hay = `${item.name} ${item.email || ''} ${item.currentLevel || ''}`.toLowerCase();
      if (!q || hay.includes(q)) {
        items.push({
          id: `student-${item.id}`,
          label: item.name,
          hint: item.currentLevel || 'Siswa',
          tab: 'students'
        });
      }
    }

    for (const session of schedules.filter((row) => row.date === today).slice(0, 20)) {
      const label = `${session.level} · ${session.startTime}`;
      const hay = `${label} ${displayName(allSensei, session.senseiId)}`.toLowerCase();
      if (!q || hay.includes(q)) {
        items.push({
          id: `session-${session.id}`,
          label,
          hint: `${displayName(allSensei, session.senseiId)} · hari ini`,
          tab: 'teaching'
        });
      }
    }

    return items.slice(0, 24);
  }, [query, tabs, senseiList, studentList, schedules, today, allSensei]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive((value) => Math.min(hits.length - 1, value + 1));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive((value) => Math.max(0, value - 1));
      }
      if (event.key === 'Enter' && hits[active]) {
        event.preventDefault();
        setTab(hits[active].tab);
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, hits, active, onClose, setTab]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <button type="button" className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-[28px] border border-line bg-surface shadow-[var(--shadow-lift)]">
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search size={16} className="text-ink-soft" />
          <input
            ref={inputRef}
            className="h-12 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
            placeholder="Cari menu, Sensei, siswa, atau sesi hari ini…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="ui-kbd">esc</span>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-1">
          {hits.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-ink-soft">Tidak ada hasil.</li>
          ) : (
            hits.map((hit, index) => {
              const Icon = ICONS[hit.tab] || LayoutDashboard;
              return (
                <li key={hit.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${
                      index === active ? 'bg-elevated' : 'hover:bg-elevated/70'
                    }`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => {
                      setTab(hit.tab);
                      onClose();
                    }}
                  >
                    <Icon size={15} className="text-ink-soft" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{hit.label}</span>
                    <span className="truncate text-xs text-ink-soft">{hit.hint}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
