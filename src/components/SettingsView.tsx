import { useEffect, useState } from 'react';
import { useDashboardStore, usePermissions } from '../store/useDashboardStore';
import { Button } from './ui/Button';

export function SettingsView() {
  const permissions = usePermissions();
  const settings = useDashboardStore((state) => state.settings);
  const updateSettings = useDashboardStore((state) => state.updateSettings);
  const [grace, setGrace] = useState(String(settings.lateGraceMinutes));

  useEffect(() => {
    setGrace(String(settings.lateGraceMinutes));
  }, [settings.lateGraceMinutes]);

  if (!permissions.canManageUsers && permissions.role !== 'Super Admin') {
    return <p className="text-sm text-ink-soft">Hanya Super Admin yang dapat mengubah pengaturan.</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-ink">Pengaturan operasional</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Grace late-join dihitung dari jam mulai kelas di timezone Sensei pengajar (WIB / WITA / WIT),
          bukan dari zona browser atau paksa WIB.
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-[#efe4d2] bg-paper p-4">
        <div>
          <p className="ui-label">Grace late-join (menit)</p>
          <p className="mt-1 text-xs text-ink-soft">
            Clock-in lebih dari N menit setelah jam mulai kelas (zona Sensei) ditandai terlambat.
            Isi 0 untuk tanpa toleransi.
          </p>
        </div>
        <input
          className="ui-input max-w-[140px]"
          type="number"
          min={0}
          max={120}
          step={1}
          value={grace}
          onChange={(event) => setGrace(event.target.value)}
        />
        <div>
          <Button
            onClick={() => {
              const parsed = Number(grace);
              if (!Number.isFinite(parsed) || parsed < 0) return;
              updateSettings({ lateGraceMinutes: Math.floor(parsed) });
            }}
          >
            Simpan grace
          </Button>
        </div>
        <p className="text-xs text-ink-soft">Nilai aktif sekarang: {settings.lateGraceMinutes} menit</p>
      </section>
    </div>
  );
}
