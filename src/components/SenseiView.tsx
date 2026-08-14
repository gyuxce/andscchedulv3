import { useState } from 'react';
import { getOperationalLabels } from '../lib/labels';
import { formatHours, formatPercent, getWorkloadMetrics } from '../lib/workload';
import { useDashboardStore, usePermissions } from '../store/useDashboardStore';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { WeekNav } from './ui/WeekNav';

const LABEL_TONE = {
  NEW: 'gold',
  UNASSIGNED: 'danger',
  CUTI: 'sky'
} as const;

export function SenseiView() {
  const permissions = usePermissions();
  const sensei = useDashboardStore((state) => state.sensei);
  const schedules = useDashboardStore((state) => state.schedules);
  const availability = useDashboardStore((state) => state.availability);
  const leavePeriods = useDashboardStore((state) => state.leavePeriods);
  const weekAnchor = useDashboardStore((state) => state.weekAnchor);
  const setWeekAnchor = useDashboardStore((state) => state.setWeekAnchor);
  const overrideSenseiStatus = useDashboardStore((state) => state.overrideSenseiStatus);
  const currentUser = useDashboardStore((state) => state.currentUser);
  const visible = permissions.canViewAllSensei ? sensei : sensei.filter((item) => item.id === currentUser?.senseiId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const selected = visible.find((item) => item.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-ink-soft">
          Status utama ACTIVE/INACTIVE terpisah dari label operasional NEW, UNASSIGNED, dan CUTI. Satu Sensei bisa ACTIVE + NEW, atau ACTIVE + UNASSIGNED.
        </p>
        <WeekNav weekAnchor={weekAnchor} onChange={setWeekAnchor} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((item) => {
          const labels = getOperationalLabels(item, schedules, leavePeriods);
          const workload = getWorkloadMetrics(item.id, availability, schedules, weekAnchor);
          return (
            <button key={item.id} className="ui-card p-4 text-left" onClick={() => { setSelectedId(item.id); setReason(''); }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold text-ink">{item.name}</h3>
                  <p className="text-xs text-ink-soft">{item.email} · join {item.joinDate}</p>
                </div>
                <Badge tone={item.primaryStatus === 'ACTIVE' ? 'success' : 'muted'}>{item.primaryStatus}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {labels.length === 0 ? <Badge>Tanpa label</Badge> : labels.map((label) => (
                  <Badge key={label} tone={LABEL_TONE[label]}>{label}</Badge>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>Tersedia<br /><b>{formatHours(workload.availableHours)}</b></div>
                <div>Terisi<br /><b>{formatHours(workload.assignedHours)}</b></div>
                <div>Sisa kapasitas<br /><b>{formatHours(workload.remainingHours)}</b></div>
                <div>Utilisasi<br /><b>{formatPercent(workload.utilization)}</b></div>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-ink-soft">
                  <span>Target 16 jam</span>
                  <span>{workload.assignedHours}/{workload.targetHours} · gap {workload.targetGap}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-paper-2">
                  <div className="h-full bg-maple" style={{ width: `${Math.min(workload.targetProgress * 100, 100)}%` }} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {selected ? (
        <Modal
          title={selected.name}
          onClose={() => setSelectedId(null)}
          footer={<Button onClick={() => setSelectedId(null)}>Tutup</Button>}
        >
          <p className="text-sm text-ink-soft">Level: {selected.levels.join(', ')}</p>
          {selected.notes ? <p className="text-sm">{selected.notes}</p> : null}
          {permissions.canManageUsers || permissions.role === 'Super Admin' ? (
            <div className="space-y-2 rounded-2xl border border-[#efe4d2] p-3">
              <p className="ui-label">Override status utama</p>
              <input className="ui-input" placeholder="Alasan" value={reason} onChange={(event) => setReason(event.target.value)} />
              <div className="flex gap-2">
                <Button disabled={!reason} onClick={() => overrideSenseiStatus(selected.id, 'ACTIVE', reason)}>Set ACTIVE</Button>
                <Button tone="danger" disabled={!reason} onClick={() => overrideSenseiStatus(selected.id, 'INACTIVE', reason)}>Set INACTIVE</Button>
              </div>
            </div>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}
