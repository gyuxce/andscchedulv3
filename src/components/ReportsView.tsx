import { useMemo, useState } from 'react';
import {
  buildEomSessionRows,
  downloadEomExcel,
  eomRowsToCsv,
  summarizeEomBySensei
} from '../lib/eomReport';
import { useDashboardStore, usePermissions, useScopedData } from '../store/useDashboardStore';
import type { ClassStatus } from '../types';
import { Button } from './ui/Button';
import { PageIntro } from './ui/PageIntro';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function ReportsView() {
  const permissions = usePermissions();
  const currentUser = useDashboardStore((state) => state.currentUser);
  const allSensei = useDashboardStore((state) => state.sensei);
  const allStudents = useDashboardStore((state) => state.students);
  const allClassMasters = useDashboardStore((state) => state.classMasters);
  const allSchedules = useDashboardStore((state) => state.schedules);
  const allLogs = useDashboardStore((state) => state.sessionLogs);
  const allReports = useDashboardStore((state) => state.sessionReports);
  const { sensei, schedules, sessionLogs, sessionReports, classMasters, linkedSenseiId } = useScopedData();

  const [month, setMonth] = useState(currentMonth());
  const [senseiFilter, setSenseiFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<ClassStatus | 'all'>('all');
  const [showRecap, setShowRecap] = useState(true);

  const effectiveSenseiId =
    permissions.canViewAllSchedules
      ? senseiFilter
      : linkedSenseiId || currentUser?.senseiId || 'none';

  const rows = useMemo(
    () =>
      buildEomSessionRows({
        month,
        senseiId: effectiveSenseiId === 'none' ? 'none' : effectiveSenseiId,
        status: statusFilter,
        schedules: permissions.canViewAllSchedules ? allSchedules : schedules,
        sessionLogs: permissions.canViewAllSchedules ? allLogs : sessionLogs,
        sessionReports: permissions.canViewAllSchedules ? allReports : sessionReports,
        classMasters: permissions.canViewAllSchedules ? allClassMasters : classMasters,
        sensei: permissions.canViewAllSchedules ? allSensei : sensei,
        students: allStudents
      }),
    [
      month,
      effectiveSenseiId,
      statusFilter,
      permissions.canViewAllSchedules,
      allSchedules,
      schedules,
      allLogs,
      sessionLogs,
      allReports,
      sessionReports,
      allClassMasters,
      classMasters,
      allSensei,
      sensei,
      allStudents
    ]
  );

  const summaries = useMemo(() => summarizeEomBySensei(rows), [rows]);

  const onDownload = () => {
    if (!permissions.canExportEomReport) return;
    const csv = eomRowsToCsv(rows, summaries);
    downloadEomExcel(`eom-sensei-${month}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Mutu"
        title="Laporan EOM"
        actions={
          <>
            <Button tone={showRecap ? 'primary' : undefined} onClick={() => setShowRecap(true)}>
              View Recap
            </Button>
            {permissions.canExportEomReport ? (
              <Button tone="primary" onClick={onDownload} disabled={rows.length === 0}>
                Download Excel
              </Button>
            ) : (
              <p className="self-center text-xs text-ink-soft">Export Excel hanya untuk Super Admin / Ops.</p>
            )}
          </>
        }
      >
        Rekap mengajar bulanan untuk verifikasi EOM. Tanpa perhitungan gaji/honor.
      </PageIntro>

      <div className="ui-card grid gap-3 p-4 md:grid-cols-3">
        <label>
          <span className="ui-label">Bulan</span>
          <input className="ui-input" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>
        {permissions.canViewAllSchedules ? (
          <label>
            <span className="ui-label">Sensei</span>
            <select
              className="ui-select"
              value={senseiFilter}
              onChange={(event) => setSenseiFilter(event.target.value)}
            >
              <option value="all">Semua Sensei</option>
              {allSensei.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div>
            <span className="ui-label">Sensei</span>
            <p className="mt-2 text-sm font-semibold">{sensei[0]?.name || 'Rekap sendiri'}</p>
          </div>
        )}
        <label>
          <span className="ui-label">Status sesi</span>
          <select
            className="ui-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ClassStatus | 'all')}
          >
            <option value="all">Semua</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      {showRecap ? (
        <>
          <div className="ui-card overflow-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="bg-paper text-xs uppercase text-ink-soft">
                <tr>
                  <th className="px-3 py-2">Sensei</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Level / Type</th>
                  <th className="px-3 py-2">Students</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Schedule</th>
                  <th className="px-3 py-2">Clock</th>
                  <th className="px-3 py-2">Durasi</th>
                  <th className="px-3 py-2">X/X</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Late / Swap / Cancel</th>
                  <th className="px-3 py-2">Kind</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-6 text-center text-ink-soft">
                      Tidak ada sesi di filter ini.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={`${row.senseiId}-${row.date}-${row.startTime}-${index}`} className="border-t border-line">
                      <td className="px-3 py-2 font-semibold">{row.senseiName}</td>
                      <td className="px-3 py-2">{row.className}</td>
                      <td className="px-3 py-2">
                        {row.level}
                        <div className="text-xs text-ink-soft">{row.classType}</div>
                      </td>
                      <td className="px-3 py-2">{row.students || '—'}</td>
                      <td className="px-3 py-2">{row.date}</td>
                      <td className="px-3 py-2">
                        {row.startTime}–{row.endTime}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div>In {row.clockIn || '—'}</div>
                        <div>Out {row.clockOut || '—'}</div>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div>Plan {row.scheduledMinutes}m</div>
                        <div>Actual {row.actualMinutes == null ? '—' : `${row.actualMinutes}m`}</div>
                      </td>
                      <td className="px-3 py-2">{row.sessionLabel}</td>
                      <td className="px-3 py-2">{row.status}</td>
                      <td className="px-3 py-2 text-xs">
                        {row.lateJoin === 'Yes' ? `Late ${row.lateMinutes || '?'}m` : 'On time'}
                        {row.swap ? <div>{row.swap}</div> : null}
                        {row.cancellation ? <div>{row.cancellation}</div> : null}
                      </td>
                      <td className="px-3 py-2">{row.sessionKind}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="ui-card overflow-auto">
            <p className="border-b border-line px-4 py-3 text-sm font-bold">Summary per Sensei</p>
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="bg-paper text-xs uppercase text-ink-soft">
                <tr>
                  <th className="px-3 py-2">Sensei</th>
                  <th className="px-3 py-2">Completed</th>
                  <th className="px-3 py-2">Scheduled hours</th>
                  <th className="px-3 py-2">Actual hours</th>
                  <th className="px-3 py-2">Late joins</th>
                  <th className="px-3 py-2">Sensei swaps</th>
                  <th className="px-3 py-2">Sensei cancels</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((item) => (
                  <tr key={item.senseiId} className="border-t border-line">
                    <td className="px-3 py-2 font-semibold">{item.senseiName}</td>
                    <td className="px-3 py-2">{item.completedSessions}</td>
                    <td className="px-3 py-2">{item.scheduledHours.toFixed(2)}</td>
                    <td className="px-3 py-2">{item.actualHours.toFixed(2)}</td>
                    <td className="px-3 py-2">{item.lateJoins}</td>
                    <td className="px-3 py-2">{item.senseiInitiatedSwaps}</td>
                    <td className="px-3 py-2">{item.senseiRelatedCancellations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
