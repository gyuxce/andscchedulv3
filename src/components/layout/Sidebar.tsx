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

  const NavBody = ({ compact }: { compact: boolean }) => (
    <>
      <div className={`border-b border-white/10 ${compact ? 'px-2 py-3' : 'px-4 py-4'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className={compact ? 'w-full text-center' : ''}>
            <p className="text-[10px] tracking-[0.28em] text-[var(--sidebar-muted)]">秋の空</p>
            {compact ? (
              <h1 className="mt-1 text-sm font-semibold">ANS</h1>
            ) : (
              <>
                <h1 className="mt-1 text-base font-semibold">ANS Dashboard</h1>
                <p className="mt-0.5 text-xs text-[var(--sidebar-muted)]">Operasional & akademik</p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {groups.map((group) => (
          <div key={group.label}>
            {compact ? null : (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--sidebar-muted)]">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
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
                    className={`flex h-9 w-full items-center rounded-lg text-sm font-medium transition ${
                      compact ? 'justify-center px-0' : 'gap-2.5 px-2.5'
                    } ${
                      active
                        ? 'bg-white/12 text-white'
                        : 'text-white/65 hover:bg-white/8 hover:text-white'
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
      <div className={`mt-auto space-y-2 border-t border-white/10 ${compact ? 'p-2' : 'p-3'}`}>
        {compact ? null : (
          <div>
            <div className="truncate text-sm font-semibold">{currentUser.name}</div>
            <div className="text-xs text-[var(--sidebar-muted)]">{currentUser.role}</div>
          </div>
        )}
        <button
          type="button"
          title="Keluar"
          onClick={() => {
            void logout();
            onClose();
          }}
          className={`flex h-9 w-full items-center rounded-lg text-xs text-white/70 hover:bg-white/8 ${
            compact ? 'justify-center' : 'gap-2 px-2'
          }`}
        >
          <LogOut size={14} />
          {compact ? null : 'Keluar'}
        </button>
        <button
          type="button"
          className="hidden h-8 w-full items-center justify-center rounded-lg text-white/50 hover:bg-white/8 hover:text-white lg:flex"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={compact ? 'Perlebar sidebar' : 'Ciutkan sidebar'}
        >
          <ChevronsLeft size={16} className={compact ? 'rotate-180' : ''} />
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside
        className={`sticky top-0 hidden h-dvh min-h-dvh shrink-0 flex-col self-stretch bg-[var(--sidebar)] text-[var(--sidebar-text)] lg:flex ${
          collapsed ? 'w-[64px]' : 'w-[232px]'
        }`}
      >
        <NavBody compact={collapsed} />
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
          className={`absolute inset-y-0 left-0 flex w-[min(86vw,280px)] max-w-full flex-col bg-[var(--sidebar)] text-[var(--sidebar-text)] shadow-2xl transition-transform duration-200 ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <NavBody compact={false} />
        </aside>
      </div>
    </>
  );
}
