import { TAB_LABELS } from '../../constants';
import { useDashboardStore } from '../../store/useDashboardStore';

export function TopBar() {
  const tab = useDashboardStore((state) => state.activeTab);
  const user = useDashboardStore((state) => state.currentUser);
  const dataSource = useDashboardStore((state) => state.dataSource);
  return (
    <header className="flex h-16 items-center justify-between border-b border-[#e2d6c4] bg-[#fffdf8]/85 px-6 backdrop-blur">
      <div>
        <h2 className="text-lg font-extrabold text-ink">{TAB_LABELS[tab]}</h2>
        <p className="text-xs text-ink-soft">Lingkup sesuai RBAC {user?.role}</p>
      </div>
      <div className="rounded-full border border-[#e2d6c4] bg-white px-3 py-1 text-xs font-bold text-ink-soft">
        {dataSource === 'supabase' ? 'Supabase staging' : 'Demo lokal'} · V2 produksi tidak disentuh
      </div>
    </header>
  );
}
