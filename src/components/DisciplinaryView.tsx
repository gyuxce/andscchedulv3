import { getDisciplinaryMetrics, monthKey } from '../lib/disciplinary';
import { useDashboardStore, usePermissions } from '../store/useDashboardStore';
import { Badge } from './ui/Badge';
import { PageIntro } from './ui/PageIntro';
import { StatCard } from './ui/StatCard';

export function DisciplinaryView() {
  const permissions = usePermissions();
  const currentUser = useDashboardStore((state) => state.currentUser);
  const sensei = useDashboardStore((state) => state.sensei);
  const schedules = useDashboardStore((state) => state.schedules);
  const logs = useDashboardStore((state) => state.sessionLogs);
  const month = monthKey(new Date());
  const visible = permissions.canViewAllSensei ? sensei.filter((item) => item.primaryStatus === 'ACTIVE') : sensei.filter((item) => item.id === currentUser?.senseiId);

  return (
    <div className="space-y-6">
      <PageIntro kicker="Mutu" title="Disiplin">
        Metrik disiplin ditampilkan terpisah, belum digabung ke skor QA. Swap yang diminta siswa/admin tidak dihitung ke
        Sensei. Pembatalan tanpa pengganti hanya dihitung jika initiator Sensei.
      </PageIntro>
      <div className="grid gap-3">
        {visible.map((item) => {
          const metrics = getDisciplinaryMetrics(item.id, month, schedules, logs);
          return (
            <div key={item.id} className="ui-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-extrabold">{item.name}</h3>
                <Badge tone="muted">{month}</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <StatCard label="Swap inisiatif Sensei" value={metrics.senseiInitiatedSwaps} hint="Student/admin-requested tidak masuk" />
                <StatCard label="Cancel tanpa pengganti" value={metrics.cancelledNoReplacement} hint="Initiator Sensei + replacementSecured = false" />
                <StatCard label="Late join" value={metrics.lateJoins} hint="Grace period masih TBC Kyouiku (default 0 menit)" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
