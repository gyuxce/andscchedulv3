import { Menu, Search } from 'lucide-react';
import { TAB_LABELS } from '../../constants';
import { useDashboardStore } from '../../store/useDashboardStore';
import { ThemeToggle } from './ThemeToggle';

export function TopBar({
  onOpenMenu,
  onOpenSearch
}: {
  onOpenMenu: () => void;
  onOpenSearch: () => void;
}) {
  const tab = useDashboardStore((state) => state.activeTab);
  const user = useDashboardStore((state) => state.currentUser);

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between gap-3 border-b border-line bg-surface/90 px-3 backdrop-blur sm:h-14 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenMenu}
          className="ui-icon-btn lg:hidden"
          aria-label="Buka menu"
        >
          <Menu size={16} />
        </button>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-ink sm:text-base">{TAB_LABELS[tab]}</h2>
          <p className="hidden text-[11px] text-ink-soft sm:block">{user?.role}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden h-8 items-center gap-2 rounded-lg border border-line bg-elevated/60 px-2.5 text-xs text-ink-soft hover:bg-elevated sm:inline-flex"
        >
          <Search size={14} />
          <span>Cari</span>
          <span className="ui-kbd">⌘K</span>
        </button>
        <button type="button" onClick={onOpenSearch} className="ui-icon-btn sm:hidden" aria-label="Cari">
          <Search size={15} />
        </button>
        <ThemeToggle />
        <div className="hidden h-8 max-w-[160px] items-center truncate rounded-lg border border-line bg-elevated/50 px-2 text-xs font-medium text-ink sm:flex">
          {user?.name}
        </div>
      </div>
    </header>
  );
}
