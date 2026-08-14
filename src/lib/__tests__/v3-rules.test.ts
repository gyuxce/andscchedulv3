import { describe, expect, it } from 'vitest';
import { getPermissions } from '../rbac';
import { getOperationalLabels } from '../labels';
import { getWorkloadMetrics } from '../workload';
import { findConflicts } from '../schedule';
import { getDisciplinaryMetrics } from '../disciplinary';
import { getSessionWorkflow, isLateJoin } from '../session';
import { buildActionItems } from '../actionCenter';
import type { ClassSession, Sensei } from '../../types';

const yuki: Sensei = {
  id: 's1',
  name: 'Yuki',
  email: 'yuki@test.com',
  phone: '',
  levels: ['N5'],
  primaryStatus: 'ACTIVE',
  joinDate: '2026-07-20',
  timezone: 'Asia/Jakarta'
};

const classOf = (partial: Partial<ClassSession> & Pick<ClassSession, 'id' | 'date' | 'startTime' | 'endTime'>): ClassSession => ({
  senseiId: 's1',
  studentIds: ['st1'],
  type: 'Private',
  level: 'N5',
  status: 'active',
  ...partial
});

describe('RBAC', () => {
  it('keeps official schedule edits to Super Admin only', () => {
    expect(getPermissions('Super Admin').canEditOfficialSchedule).toBe(true);
    expect(getPermissions('Kyouiku').canEditOfficialSchedule).toBe(false);
    expect(getPermissions('Sensei').canEditOfficialSchedule).toBe(false);
    expect(getPermissions('Sensei').canViewAllSchedules).toBe(false);
    expect(getPermissions('Kyouiku').canEditQa).toBe(true);
    expect(getPermissions('Super Admin').canManageUsers).toBe(true);
  });
});

describe('Sensei labels', () => {
  it('can combine ACTIVE + NEW + UNASSIGNED', () => {
    const labels = getOperationalLabels(yuki, [], [], new Date('2026-08-14'));
    expect(labels).toContain('NEW');
    expect(labels).toContain('UNASSIGNED');
  });

  it('adds CUTI from approved leave', () => {
    const labels = getOperationalLabels(
      yuki,
      [classOf({ id: 'c1', date: '2026-08-14', startTime: '09:00', endTime: '10:00' })],
      [{ id: 'l1', senseiId: 's1', startDate: '2026-08-10', endDate: '2026-08-20', reason: 'cuti', status: 'approved' }],
      new Date('2026-08-14')
    );
    expect(labels).toContain('CUTI');
    expect(labels).not.toContain('UNASSIGNED');
  });
});

describe('workload', () => {
  it('calculates available, assigned, remaining, utilization, and 16h gap', () => {
    const metrics = getWorkloadMetrics(
      's1',
      [
        {
          id: 'a1',
          senseiId: 's1',
          pattern: 'weekly',
          weekday: 5,
          startTime: '08:00',
          endTime: '12:00',
          isActive: true
        },
        {
          id: 'a2',
          senseiId: 's1',
          pattern: 'weekly',
          weekday: 1,
          startTime: '09:00',
          endTime: '17:00',
          isActive: true
        }
      ],
      [classOf({ id: 'c1', date: '2026-08-14', startTime: '09:00', endTime: '11:00' })],
      '2026-08-14'
    );
    expect(metrics.availableHours).toBe(12);
    expect(metrics.assignedHours).toBe(2);
    expect(metrics.remainingHours).toBe(10);
    expect(metrics.utilization).toBeCloseTo(2 / 12);
    expect(metrics.targetGap).toBe(14);
  });
});

describe('schedule conflicts', () => {
  it('detects overlapping classes for the same Sensei', () => {
    const conflicts = findConflicts([
      classOf({ id: 'c1', date: '2026-08-14', startTime: '13:00', endTime: '14:30' }),
      classOf({ id: 'c2', date: '2026-08-14', startTime: '14:00', endTime: '15:30' })
    ]);
    expect(conflicts).toHaveLength(1);
  });
});

describe('session workflow and late join', () => {
  it('follows clock-in → clock-out → report', () => {
    const session = classOf({ id: 'c1', date: '2026-08-14', startTime: '09:00', endTime: '10:00' });
    expect(getSessionWorkflow(session)).toBe('ready');
    expect(getSessionWorkflow(session, { id: 'l', scheduleId: 'c1', senseiId: 's1', clockInAt: 'x', lateJoin: false, overridden: false })).toBe('in_progress');
  });

  it('marks late join after scheduled start when grace is 0', () => {
    const session = classOf({ id: 'c1', date: '2026-08-14', startTime: '09:00', endTime: '10:00' });
    expect(isLateJoin(session, '2026-08-14T09:00:01', 0)).toBe(true);
    expect(isLateJoin(session, '2026-08-14T09:00:00', 0)).toBe(false);
  });
});

describe('disciplinary attribution', () => {
  it('does not count admin/student swaps against Sensei', () => {
    const metrics = getDisciplinaryMetrics(
      's1',
      '2026-08',
      [
        classOf({
          id: 'c1',
          date: '2026-08-12',
          startTime: '09:00',
          endTime: '10:00',
          originalSenseiId: 's1',
          swapInitiator: 'Admin'
        }),
        classOf({
          id: 'c2',
          date: '2026-08-12',
          startTime: '11:00',
          endTime: '12:00',
          originalSenseiId: 's1',
          swapInitiator: 'Sensei'
        }),
        classOf({
          id: 'c3',
          date: '2026-08-11',
          startTime: '09:00',
          endTime: '10:00',
          status: 'cancelled',
          originalSenseiId: 's1',
          cancellationInitiator: 'Sensei',
          replacementSecured: false
        })
      ],
      []
    );
    expect(metrics.senseiInitiatedSwaps).toBe(1);
    expect(metrics.cancelledNoReplacement).toBe(1);
  });
});

describe('action center', () => {
  it('surfaces missing reports, conflicts, and unassigned Sensei', () => {
    const items = buildActionItems({
      sensei: [yuki],
      schedules: [
        classOf({ id: 'past', date: '2026-08-12', startTime: '09:00', endTime: '10:00' }),
        classOf({ id: 'a', date: '2026-08-14', startTime: '13:00', endTime: '14:30' }),
        classOf({ id: 'b', date: '2026-08-14', startTime: '14:00', endTime: '15:30' })
      ],
      availability: [],
      logs: [],
      reports: [],
      leavePeriods: [],
      weekAnchor: '2026-08-14',
      now: new Date('2026-08-14T18:00:00')
    });
    expect(items.some((item) => item.kind === 'missing_report')).toBe(true);
    expect(items.some((item) => item.kind === 'schedule_conflict')).toBe(true);
    expect(items.some((item) => item.kind === 'unassigned_sensei')).toBe(false);
  });
});
