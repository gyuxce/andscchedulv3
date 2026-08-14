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
  Scale
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

export function Sidebar() {
  const currentUser = useDashboardStore((state) => state.currentUser);
  const activeTab = useDashboardStore((state) => state.activeTab);
  const setTab = useDashboardStore((state) => state.setTab);
  const logout = useDashboardStore((state) => state.logout);
  if (!currentUser) return null;
  const tabs = NAV_BY_ROLE[currentUser.role];

  return (
    <aside className="sticky top-0 flex h-dvh min-h-dvh w-[270px] shrink-0 flex-col self-stretch bg-ink text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-[10px] tracking-[0.28em] text-white/50">秋の空</p>
        <h1 className="mt-1 text-lg font-extrabold">ANS Dashboard V3</h1>
        <p className="mt-1 text-xs text-white/55">Operasional & akademik</p>
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {tabs.map((tab) => {
          const Icon = ICONS[tab];
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setTab(tab)}
              className={`flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-semibold ${
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
          onClick={() => {
            void logout();
          }}
          className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs text-white/70 hover:bg-white/8"
        >
          <LogOut size={14} /> Keluar
        </button>
      </div>
    </aside>
  );
}
