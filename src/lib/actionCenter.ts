import type {
  ActionItem,
  AvailabilitySlot,
  ClassMaster,
  ClassSession,
  LeavePeriod,
  Sensei,
  SessionLog,
  SessionReport
} from '../types';
import { WEEKLY_HOUR_TARGET } from '../constants';
import { getClassHealth } from './classProgress';
import { toDateKey } from './dates';
import { getOperationalLabels } from './labels';
import { findConflicts } from './schedule';
import { getSessionWorkflow } from './session';
import { getWorkloadMetrics } from './workload';

export function buildActionItems(input: {
  sensei: Sensei[];
  schedules: ClassSession[];
  availability: AvailabilitySlot[];
  logs: SessionLog[];
  reports: SessionReport[];
  leavePeriods: LeavePeriod[];
  classMasters?: ClassMaster[];
  weekAnchor: Date | string;
  now?: Date;
}): ActionItem[] {
  const items: ActionItem[] = [];
  const now = input.now ?? new Date();
  const todayKey = toDateKey(now);

  for (const session of input.schedules) {
    if (session.status === 'cancelled') continue;
    const log = input.logs.find((item) => item.scheduleId === session.id);
    const report = input.reports.find((item) => item.scheduleId === session.id);
    const workflow = getSessionWorkflow(session, log, report);
    const ended = `${session.date}T${session.endTime}:00` < now.toISOString().slice(0, 19) || session.date < todayKey;

    if (!report && (workflow === 'report_pending' || ended)) {
      items.push({
        id: `missing_report:${session.id}`,
        kind: 'missing_report',
        severity: 'high',
        title: 'Laporan sesi belum masuk',
        detail: `${session.level} · ${session.date} ${session.startTime}`,
        senseiId: session.senseiId,
        scheduleId: session.id,
        classId: session.classId ?? undefined
      });
    }

    if (report && report.recordingStatus === 'Missing') {
      items.push({
        id: `missing_recording:${session.id}`,
        kind: 'missing_recording',
        severity: 'medium',
        title: 'Referensi rekaman belum ada',
        detail: `${session.level} · perlu ditindaklanjuti sebelum QA`,
        senseiId: session.senseiId,
        scheduleId: session.id,
        classId: session.classId ?? undefined
      });
    }

    if (log?.lateJoin) {
      items.push({
        id: `late_join:${session.id}`,
        kind: 'late_join',
        severity: 'medium',
        title: 'Clock-in terlambat',
        detail: `${session.date} ${session.startTime} · bandingkan dengan jam mulai kelas`,
        senseiId: session.senseiId,
        scheduleId: session.id,
        classId: session.classId ?? undefined
      });
    }
  }

  for (const pair of findConflicts(input.schedules)) {
    items.push({
      id: `conflict:${pair.a.id}:${pair.b.id}`,
      kind: 'schedule_conflict',
      severity: 'high',
      title: 'Konflik jadwal Sensei',
      detail: `${pair.a.date} ${pair.a.startTime}–${pair.a.endTime} bentrok dengan ${pair.b.startTime}–${pair.b.endTime}`,
      senseiId: pair.a.senseiId,
      scheduleId: pair.a.id
    });
  }

  for (const teachingClass of input.classMasters ?? []) {
    const health = getClassHealth(teachingClass, input.schedules, input.reports, now);
    if (health.status === 'overdue') {
      items.push({
        id: `overdue:${teachingClass.id}`,
        kind: 'overdue_class',
        severity: 'high',
        title: `${teachingClass.displayName} overdue`,
        detail: health.detail,
        senseiId: teachingClass.senseiId,
        classId: teachingClass.id
      });
    } else if (health.status === 'ending_soon') {
      items.push({
        id: `ending_soon:${teachingClass.id}`,
        kind: 'ending_soon',
        severity: 'medium',
        title: `${teachingClass.displayName} ending soon`,
        detail: health.detail,
        senseiId: teachingClass.senseiId,
        classId: teachingClass.id
      });
    }
  }

  for (const sensei of input.sensei) {
    const labels = getOperationalLabels(sensei, input.schedules, input.leavePeriods, now);
    if (labels.includes('UNASSIGNED')) {
      items.push({
        id: `unassigned:${sensei.id}`,
        kind: 'unassigned_sensei',
        severity: 'medium',
        title: `${sensei.name} belum punya kelas aktif`,
        detail: 'Tinjau alokasi kelas untuk Sensei ACTIVE yang UNASSIGNED',
        senseiId: sensei.id
      });
    }

    const workload = getWorkloadMetrics(sensei.id, input.availability, input.schedules, input.weekAnchor);
    if (sensei.primaryStatus === 'ACTIVE' && !labels.includes('CUTI')) {
      if (workload.assignedHours < WEEKLY_HOUR_TARGET) {
        items.push({
          id: `hours:${sensei.id}`,
          kind: 'hours_below_target',
          severity: workload.assignedHours === 0 ? 'high' : 'low',
          title: `${sensei.name} di bawah target 16 jam`,
          detail: `${workload.assignedHours}/${WEEKLY_HOUR_TARGET} jam terisi · sisa kapasitas ${Math.max(workload.remainingHours, 0)} jam`,
          senseiId: sensei.id
        });
      }
      if (workload.availableHours > 0 && workload.availableHours < WEEKLY_HOUR_TARGET) {
        items.push({
          id: `low_avail:${sensei.id}`,
          kind: 'low_availability',
          severity: 'low',
          title: `${sensei.name} membuka ketersediaan terbatas`,
          detail: `${workload.availableHours} jam tersedia minggu ini`,
          senseiId: sensei.id
        });
      }
    }
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
