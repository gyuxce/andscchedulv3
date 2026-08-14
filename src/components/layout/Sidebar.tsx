import { useEffect } from 'react';
import {
  Activity,
  BookOpen,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Users,
  Video,
  GraduationCap,
  Clock3,
  Scale,
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
  audit: Shield,
  users: Activity,
  settings: Settings
};

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

  const NavBody = () => (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.28em] text-white/50">秋の空</p>
            <h1 className="mt-1 text-lg font-extrabold">ANS Dashboard V3</h1>
            <p className="mt-1 text-xs text-white/55">Operasional & akademik</p>
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
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {tabs.map((tab) => {
          const Icon = ICONS[tab];
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setTab(tab);
                onClose();
              }}
              className={`flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-semibold ${
                active ? 'bg-white/12 text-white' : 'text-white/65 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {TAB_LABELS[tab]}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto space-y-2 border-t border-white/10 p-4">
        <div>
          <div className="text-sm font-bold">{currentUser.name}</div>
          <div className="text-xs text-white/55">{currentUser.role}</div>
        </div>
        <button
          type="button"
          onClick={() => {
            void logout();
            onClose();
          }}
          className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs text-white/70 hover:bg-white/8"
        >
          <LogOut size={14} /> Keluar
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh min-h-dvh w-[270px] shrink-0 flex-col self-stretch bg-ink text-white lg:flex">
        <NavBody />
      </aside>

      <div
        className={`fixed inset-0 z-40 lg:hidden ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-[#122033]/50 transition-opacity ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
          aria-label="Tutup overlay menu"
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[min(86vw,300px)] max-w-full flex-col bg-ink text-white shadow-2xl transition-transform duration-200 ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <NavBody />
        </aside>
      </div>
    </>
  );
}
