import { AlertTriangle, CheckCircle2, Clock, Video, Users, Gauge } from 'lucide-react';
import { buildActionItems } from '../lib/actionCenter';
import { displayName } from '../lib/display';
import { getWorkloadMetrics, formatPercent } from '../lib/workload';
import { useDashboardStore, usePermissions, useScopedData } from '../store/useDashboardStore';
import { Badge } from './ui/Badge';
import { StatCard } from './ui/StatCard';
import { WeekNav } from './ui/WeekNav';

const KIND_ICON = {
  missing_report: Clock,
  missing_recording: Video,
  late_join: AlertTriangle,
  schedule_conflict: AlertTriangle,
  unassigned_sensei: Users,
  hours_below_target: Gauge,
  low_availability: Clock
};

const KIND_LABEL = {
  missing_report: 'Laporan hilang',
  missing_recording: 'Rekaman hilang',
  late_join: 'Terlambat',
  schedule_conflict: 'Konflik jadwal',
  unassigned_sensei: 'UNASSIGNED',
  hours_below_target: 'Di bawah 16 jam',
  low_availability: 'Ketersediaan rendah'
};

export function OverviewView() {
  const permissions = usePermissions();
  const leavePeriods = useDashboardStore((state) => state.leavePeriods);
  const weekAnchor = useDashboardStore((state) => state.weekAnchor);
  const setWeekAnchor = useDashboardStore((state) => state.setWeekAnchor);
  const setTab = useDashboardStore((state) => state.setTab);
  const { sensei, schedules, availability, sessionLogs, sessionReports } = useScopedData();
  const allSensei = useDashboardStore((state) => state.sensei);

  const items = buildActionItems({
    sensei: permissions.canViewAllSensei ? allSensei : sensei,
    schedules,
    availability,
    logs: sessionLogs,
    reports: sessionReports,
    leavePeriods,
    weekAnchor
  });

  const high = items.filter((item) => item.severity === 'high').length;
  const missingReports = items.filter((item) => item.kind === 'missing_report').length;
  const conflicts = items.filter((item) => item.kind === 'schedule_conflict').length;
  const activeSensei = (permissions.canViewAllSensei ? allSensei : sensei).filter((item) => item.primaryStatus === 'ACTIVE');
  const avgUtil =
    activeSensei.reduce((sum, item) => {
      const util = getWorkloadMetrics(item.id, availability, schedules, weekAnchor).utilization;
      return sum + (util ?? 0);
    }, 0) / Math.max(activeSensei.length, 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-ink-soft">
          Action Center menampilkan pengecualian yang butuh tindakan: laporan, rekaman, keterlambatan, konflik, Sensei UNASSIGNED, dan gap jam mingguan.
        </p>
        <WeekNav weekAnchor={weekAnchor} onChange={setWeekAnchor} />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Perlu tindakan" value={items.length} hint={`${high} prioritas tinggi`} icon={<AlertTriangle size={18} />} />
        <StatCard label="Laporan belum masuk" value={missingReports} icon={<Clock size={18} />} />
        <StatCard label="Konflik jadwal" value={conflicts} icon={<AlertTriangle size={18} />} />
        <StatCard label="Utilisasi rata-rata" value={formatPercent(avgUtil)} hint="Jam terisi ÷ jam tersedia" icon={<Gauge size={18} />} />
      </div>
      <div className="ui-card overflow-hidden">
        <div className="border-b border-[#efe4d2] px-5 py-3 font-bold">Antrian operasional</div>
        <div className="divide-y divide-[#efe4d2]">
          {items.length === 0 ? (
            <div className="flex items-center gap-2 p-6 text-sm text-pine">
              <CheckCircle2 size={18} /> Tidak ada pengecualian pada lingkup ini.
            </div>
          ) : (
            items.map((item) => {
              const Icon = KIND_ICON[item.kind];
              return (
                <div key={item.id} className="flex items-start justify-between gap-4 px-5 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl bg-paper p-2 text-maple">
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-ink">{item.title}</span>
                        <Badge tone={item.severity === 'high' ? 'danger' : item.severity === 'medium' ? 'gold' : 'muted'}>
                          {KIND_LABEL[item.kind]}
                        </Badge>
                      </div>
                      <p className="text-sm text-ink-soft">{item.detail}</p>
                      {item.senseiId ? (
                        <p className="mt-1 text-xs text-ink-soft">Sensei: {displayName(allSensei, item.senseiId)}</p>
                      ) : null}
                    </div>
                  </div>
                  <button
                    className="text-xs font-bold text-maple"
                    onClick={() =>
                      setTab(
                        item.kind === 'missing_report' || item.kind === 'late_join'
                          ? 'teaching'
                          : item.kind === 'missing_recording'
                            ? 'qa'
                            : item.kind === 'schedule_conflict'
                              ? 'schedule'
                              : 'sensei'
                      )
                    }
                  >
                    Buka
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
