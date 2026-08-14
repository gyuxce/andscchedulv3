import { Menu } from 'lucide-react';
import { TAB_LABELS } from '../../constants';
import { useDashboardStore } from '../../store/useDashboardStore';

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const tab = useDashboardStore((state) => state.activeTab);
  const user = useDashboardStore((state) => state.currentUser);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[#e2d6c4] bg-[#fffdf8]/95 px-3 backdrop-blur sm:h-16 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenMenu}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e2d6c4] bg-white text-ink lg:hidden"
          aria-label="Buka menu"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0">
          <h2 className="truncate text-base font-extrabold text-ink sm:text-lg">{TAB_LABELS[tab]}</h2>
          <p className="hidden text-xs text-ink-soft sm:block">Lingkup sesuai RBAC {user?.role}</p>
          <p className="truncate text-[11px] text-ink-soft sm:hidden">{user?.role}</p>
        </div>
      </div>
    </header>
  );
}
