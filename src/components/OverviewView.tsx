import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  Users,
  Video
} from 'lucide-react';
import { buildActionItems } from '../lib/actionCenter';
import { getClassHealth } from '../lib/classProgress';
import { toDateKey, weekDays } from '../lib/dates';
import { displayName, TYPE_RAIL } from '../lib/display';
import { getSessionWorkflow, workflowLabel } from '../lib/session';
import { deriveEnrollmentDisplayStatus, isCurrentEnrollmentStatus } from '../lib/enrollment';
import { getOperationalLabels } from '../lib/labels';
import { getWorkloadMetrics, formatPercent } from '../lib/workload';
import { useDashboardStore, usePermissions, useScopedData } from '../store/useDashboardStore';
import type { ActionItem, TabId } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { PageIntro } from './ui/PageIntro';
import { WeekNav } from './ui/WeekNav';

const PAGE_SIZE = 20;

const KIND_ICON = {
  missing_report: Clock,
  missing_recording: Video,
  late_join: AlertTriangle,
  schedule_conflict: AlertTriangle,
  unassigned_sensei: Users,
  hours_below_target: Gauge,
  low_availability: Clock,
  ending_soon: Clock,
  overdue_class: AlertTriangle
};

const KIND_LABEL = {
  missing_report: 'Laporan hilang',
  missing_recording: 'Rekaman hilang',
  late_join: 'Terlambat',
  schedule_conflict: 'Konflik jadwal',
  unassigned_sensei: 'UNASSIGNED',
  hours_below_target: 'Di bawah 16 jam',
  low_availability: 'Ketersediaan rendah',
  ending_soon: 'Ending soon',
  overdue_class: 'Overdue'
};

type KindFilter = 'all' | ActionItem['kind'];

export function OverviewView() {
  const permissions = usePermissions();
  const leavePeriods = useDashboardStore((state) => state.leavePeriods);
  const enrollments = useDashboardStore((state) => state.enrollments);
  const allStudents = useDashboardStore((state) => state.students);
  const weekAnchor = useDashboardStore((state) => state.weekAnchor);
  const setWeekAnchor = useDashboardStore((state) => state.setWeekAnchor);
  const setTab = useDashboardStore((state) => state.setTab);
  const clockIn = useDashboardStore((state) => state.clockIn);
  const { sensei, students, schedules, availability, sessionLogs, sessionReports, classMasters, linkedSenseiId } =
    useScopedData();
  const allSensei = useDashboardStore((state) => state.sensei);
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [page, setPage] = useState(0);

  const scopedSensei = permissions.canViewAllSensei ? allSensei : sensei;
  const scopedStudents = permissions.canViewAllSchedules ? allStudents : students;

  const items = buildActionItems({
    sensei: scopedSensei,
    schedules,
    availability,
    logs: sessionLogs,
    reports: sessionReports,
    leavePeriods,
    classMasters,
    enrollments,
    students: allStudents,
    weekAnchor
  });

  const filtered = useMemo(
    () => (kindFilter === 'all' ? items : items.filter((item) => item.kind === kindFilter)),
    [items, kindFilter]
  );

  useEffect(() => {
    setPage(0);
  }, [kindFilter, weekAnchor, items.length]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const today = toDateKey(new Date());
  const weekKeys = useMemo(() => new Set(weekDays(weekAnchor).map((day) => toDateKey(day))), [weekAnchor]);

  const snapshot = useMemo(() => {
    const activeSensei = scopedSensei.filter((item) => item.primaryStatus === 'ACTIVE');
    const unassigned = activeSensei.filter((item) =>
      getOperationalLabels(item, schedules, leavePeriods, new Date(), classMasters).includes('UNASSIGNED')
    ).length;
    const activeStudents = scopedStudents.filter((item) => item.isActive).length;
    const schedulesToday = schedules.filter(
      (item) => item.date === today && item.status !== 'cancelled'
    ).length;
    const schedulesWeek = schedules.filter(
      (item) => weekKeys.has(item.date) && item.status !== 'cancelled'
    ).length;
    const activeClasses = classMasters.filter(
      (item) => item.status === 'active' || item.status === 'ready'
    ).length;
    const endingSoonEnrollments = enrollments.filter((enrollment) => {
      if (!isCurrentEnrollmentStatus(enrollment.status)) return false;
      if (!permissions.canViewAllSchedules) {
        const student = scopedStudents.find((item) => item.id === enrollment.studentId);
        if (!student) return false;
      }
      return (
        deriveEnrollmentDisplayStatus(enrollment, schedules, sessionReports) === 'ending_soon' ||
        enrollment.status === 'ending_soon'
      );
    }).length;
    const endingSoonClasses = classMasters.filter(
      (item) => getClassHealth(item, schedules, sessionReports).status === 'ending_soon'
    ).length;
    const endingSoon = endingSoonEnrollments + endingSoonClasses;
    const missingReports = items.filter((item) => item.kind === 'missing_report').length;
    const avgUtil =
      activeSensei.reduce((sum, item) => {
        const util = getWorkloadMetrics(item.id, availability, schedules, weekAnchor).utilization;
        return sum + (util ?? 0);
      }, 0) / Math.max(activeSensei.length, 1);

    return {
      activeSensei: activeSensei.length,
      unassigned,
      activeStudents,
      schedulesToday,
      schedulesWeek,
      activeClasses,
      endingSoon,
      missingReports,
      avgUtil
    };
  }, [
    scopedSensei,
    scopedStudents,
    schedules,
    leavePeriods,
    classMasters,
    today,
    weekKeys,
    enrollments,
    permissions.canViewAllSchedules,
    sessionReports,
    items,
    availability,
    weekAnchor
  ]);

  const go = (tab: TabId) => setTab(tab);

  const todayBoard = useMemo(
    () =>
      schedules
        .filter((session) => session.date === today && session.status !== 'cancelled')
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map((session) => {
          const log = sessionLogs.find((item) => item.scheduleId === session.id);
          const report = sessionReports.find((item) => item.scheduleId === session.id);
          return {
            session,
            log,
            state: getSessionWorkflow(session, log, report)
          };
        }),
    [schedules, sessionLogs, sessionReports, today]
  );

  return (
    <div className="space-y-8">
      <PageIntro
        kicker="Action Center"
        title="Ringkasan operasional"
        actions={<WeekNav weekAnchor={weekAnchor} onChange={setWeekAnchor} />}
      >
        Data di atas, antrian tindakan di bawah. Alert sesi memakai lingkup 14 hari terakhir sampai akhir minggu yang
        dipilih.
      </PageIntro>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
        <div className="ui-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-maple">Hari ini</p>
              <h4 className="text-lg font-bold text-ink">{snapshot.schedulesToday} sesi</h4>
            </div>
            <Button className="h-8" onClick={() => go('teaching')}>
              Buka teaching
            </Button>
          </div>
          <div className="divide-y divide-line">
            {todayBoard.length === 0 ? (
              <p className="px-5 py-8 text-sm text-ink-soft">Tidak ada sesi resmi hari ini.</p>
            ) : (
              todayBoard.slice(0, 6).map(({ session, state }) => {
                const own = Boolean(linkedSenseiId && linkedSenseiId === session.senseiId);
                return (
                  <div key={session.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`h-10 w-1.5 shrink-0 rounded-full ${TYPE_RAIL[session.type]}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-ink">{session.level}</div>
                      <div className="truncate text-xs text-ink-soft">
                        {session.startTime}–{session.endTime} · {displayName(allSensei, session.senseiId)}
                      </div>
                    </div>
                    <Badge tone={state === 'in_progress' ? 'sky' : state === 'report_pending' ? 'gold' : 'muted'}>
                      {workflowLabel(state)}
                    </Badge>
                    {own && permissions.canClockOwn && state === 'ready' ? (
                      <Button tone="primary" className="h-8" onClick={() => clockIn(session.id)}>
                        Clock in
                      </Button>
                    ) : (
                      <button className="text-xs font-bold text-maple" onClick={() => go('teaching')}>
                        Buka
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                label: 'Sensei',
                value: snapshot.activeSensei,
                hint: snapshot.unassigned ? `${snapshot.unassigned} UNASSIGNED` : 'Aktif',
                tab: 'sensei' as TabId,
                alert: snapshot.unassigned > 0
              },
              { label: 'Siswa', value: snapshot.activeStudents, hint: 'Aktif', tab: 'students' as TabId },
              { label: 'Minggu ini', value: snapshot.schedulesWeek, hint: 'Sesi', tab: 'schedule' as TabId },
              { label: 'Class Master', value: snapshot.activeClasses, hint: 'Ready/active', tab: 'classes' as TabId },
              { label: 'Ending soon', value: snapshot.endingSoon, hint: 'Perlu follow-up', tab: 'students' as TabId, alert: snapshot.endingSoon > 0 },
              {
                label: 'Laporan hilang',
                value: snapshot.missingReports,
                hint: 'Antrian',
                onClick: () => {
                  setKindFilter('missing_report');
                  setPage(0);
                },
                alert: snapshot.missingReports > 0
              },
              { label: 'Utilisasi', value: formatPercent(snapshot.avgUtil), hint: 'Rata-rata', tab: 'availability' as TabId },
              { label: 'Hari ini', value: snapshot.schedulesToday, hint: today, tab: 'teaching' as TabId }
            ].map((metric) => (
              <button
                key={metric.label}
                type="button"
                onClick={() => ('onClick' in metric && metric.onClick ? metric.onClick() : go(metric.tab!))}
                className={`rounded-2xl border border-line bg-surface px-3 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] ${
                  metric.alert ? 'border-rose-200' : ''
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{metric.label}</p>
                <p className="mt-1 text-xl font-bold tracking-tight text-ink">{metric.value}</p>
                <p className={`text-[11px] ${metric.alert ? 'font-semibold text-rose-700' : 'text-ink-soft'}`}>
                  {metric.hint}
                </p>
              </button>
            ))}
          </div>

          <div className="ui-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-bold">Antrian operasional</div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="ui-select min-w-[180px]"
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value as KindFilter)}
            >
              <option value="all">Semua jenis</option>
              {Object.entries(KIND_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <span className="text-xs text-ink-soft">
              {filtered.length === 0
                ? '0 item'
                : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length)} dari ${filtered.length}`}
            </span>
          </div>
        </div>
        <div className="divide-y divide-line">
          {filtered.length === 0 ? (
            <div className="flex items-center gap-2 p-6 text-sm text-pine">
              <CheckCircle2 size={18} /> Tidak ada pengecualian pada lingkup ini.
            </div>
          ) : (
            pageItems.map((item) => {
              const Icon = KIND_ICON[item.kind];
              return (
                <div key={item.id} className="flex items-start justify-between gap-4 px-5 py-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-1 h-10 w-1.5 shrink-0 rounded-full ${
                        item.severity === 'high' ? 'bg-rose-500' : item.severity === 'medium' ? 'bg-amber-400' : 'bg-line'
                      }`}
                    />
                    <div className="mt-0.5 rounded-2xl bg-surface p-2 text-maple">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
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
                    className="shrink-0 text-xs font-bold text-maple"
                    onClick={() =>
                      setTab(
                        item.kind === 'missing_report' || item.kind === 'late_join'
                          ? 'teaching'
                          : item.kind === 'missing_recording'
                            ? 'qa'
                            : item.kind === 'schedule_conflict'
                              ? 'schedule'
                              : item.kind === 'ending_soon'
                                ? 'students'
                                : item.kind === 'overdue_class'
                                  ? 'classes'
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
        {filtered.length > PAGE_SIZE ? (
          <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3">
            <Button disabled={page <= 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>
              Sebelumnya
            </Button>
            <span className="text-xs text-ink-soft">
              Halaman {page + 1} / {pageCount}
            </span>
            <Button
              disabled={page >= pageCount - 1}
              onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
            >
              Berikutnya
            </Button>
          </div>
        ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
