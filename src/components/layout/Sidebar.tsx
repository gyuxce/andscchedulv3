import { useEffect, useState } from 'react';
import {
  Activity,
  BookOpen,
  CalendarDays,
  ChevronsLeft,
  ClipboardList,
  Clock3,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Scale,
  Settings,
  Shield,
  Users,
  Video,
  X
} from 'lucide-react';
import { NAV_BY_ROLE, TAB_LABELS } from '../../constants';
import { useDashboardStore } from '../../store/useDashboardStore';
import type { TabId } from '../../types';

const ICONS: Record<TabId, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  classes: BookOpen,
  schedule: CalendarDays,
  availability: Clock3,
  teaching: ClipboardList,
  sensei: Users,
  students: GraduationCap,
  qa: Video,
  disciplinary: Scale,
  reports: FileSpreadsheet,
  audit: Shield,
  users: Activity,
  settings: Settings
};

const NAV_GROUPS: Array<{ label: string; ids: TabId[] }> = [
  { label: 'Operasi', ids: ['overview', 'classes', 'schedule', 'availability', 'teaching'] },
  { label: 'Orang', ids: ['sensei', 'students'] },
  { label: 'Mutu', ids: ['qa', 'disciplinary', 'reports'] },
  { label: 'Sistem', ids: ['audit', 'users', 'settings'] }
];

const COLLAPSE_KEY = 'ans-sidebar-collapsed';

export function Sidebar({
  mobileOpen,
  onClose
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const currentUser = useDashboardStore((state) => state.currentUser);
  const activeTab = useDashboardStore((state) => state.activeTab);
  const setTab = useDashboardStore((state) => state.setTab);
  const logout = useDashboardStore((state) => state.logout);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen, onClose]);

  if (!currentUser) return null;
  const tabs = NAV_BY_ROLE[currentUser.role];
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    ids: group.ids.filter((id) => tabs.includes(id))
  })).filter((group) => group.ids.length);

  const renderNavBody = (compact: boolean) => (
    <>
      <div
        className={`flex items-center gap-2 border-b border-line ${
          compact ? 'justify-center px-2 py-3' : 'px-4 py-3.5'
        }`}
      >
        <div className={compact ? 'text-center' : 'min-w-0 flex-1'}>
          {compact ? (
            <span className="text-sm font-bold tracking-tight">ANS</span>
          ) : (
            <>
              <div className="text-[15px] font-bold leading-tight tracking-tight">ANS Dashboard</div>
              <div className="text-[11px] text-ink-soft">Operasional &amp; akademik</div>
            </>
          )}
        </div>
        {!compact ? (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="ui-icon-btn hidden h-7 w-7 lg:inline-flex"
            aria-label="Ciutkan sidebar"
          >
            <ChevronsLeft size={15} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-ink-soft hover:bg-surface-2 lg:hidden"
          aria-label="Tutup menu"
        >
          <X size={18} />
        </button>
      </div>
      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label}>
            {compact ? null : (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.ids.map((tab) => {
                const Icon = ICONS[tab];
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    title={TAB_LABELS[tab]}
                    onClick={() => {
                      setTab(tab);
                      onClose();
                    }}
                    className={`flex h-9 w-full items-center rounded-lg text-sm transition-colors ${
                      compact ? 'justify-center px-0' : 'gap-2.5 px-3'
                    } ${
                      active
                        ? 'bg-accent-soft font-semibold text-accent'
                        : 'font-medium text-ink-soft hover:bg-surface-2 hover:text-ink'
                    }`}
                  >
                    <Icon size={16} />
                    {compact ? null : TAB_LABELS[tab]}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className={`mt-auto border-t border-line ${compact ? 'p-2' : 'p-3'}`}>
        {compact ? (
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              title="Keluar"
              onClick={() => {
                void logout();
                onClose();
              }}
              className="ui-icon-btn"
            >
              <LogOut size={15} />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="ui-icon-btn"
              aria-label="Perlebar sidebar"
            >
              <ChevronsLeft size={15} className="rotate-180" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-[11px] font-bold text-ink-soft">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-ink">{currentUser.name}</div>
              <div className="truncate text-[11px] text-ink-soft">{currentUser.role}</div>
            </div>
            <button
              type="button"
              title="Keluar"
              onClick={() => {
                void logout();
                onClose();
              }}
              className="ui-icon-btn h-8 w-8"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <aside
        className={`sticky top-0 hidden h-dvh min-h-dvh shrink-0 flex-col self-stretch border-r border-line bg-[var(--sidebar)] text-[var(--sidebar-text)] lg:flex ${
          collapsed ? 'w-[64px]' : 'w-[232px]'
        }`}
      >
        {renderNavBody(collapsed)}
      </aside>

      <div
        className={`fixed inset-0 z-40 lg:hidden ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-[var(--overlay)] transition-opacity ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
          aria-label="Tutup overlay menu"
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[min(86vw,300px)] max-w-full flex-col bg-[var(--sidebar)] text-[var(--sidebar-text)] shadow-2xl transition-transform duration-200 ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {renderNavBody(false)}
        </aside>
      </div>
    </>
  );
}
