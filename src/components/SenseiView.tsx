import { useMemo, useState } from 'react';
import { CLASS_LEVELS } from '../constants';
import { getOperationalLabels, senseiDisplayName } from '../lib/labels';
import { timezoneAbbreviation, timezoneLabel, SENSEI_TIMEZONE_OPTIONS } from '../lib/timezone';
import { formatHours, formatPercent, getWorkloadMetrics } from '../lib/workload';
import { useDashboardStore, usePermissions } from '../store/useDashboardStore';
import type { Sensei, SenseiPrimaryStatus, SenseiTimezone } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { WeekNav } from './ui/WeekNav';

const LABEL_TONE = {
  NEW: 'gold',
  UNASSIGNED: 'danger',
  CUTI: 'sky'
} as const;

const emptyForm = (): Omit<Sensei, 'id'> => ({
  name: '',
  displayName: '',
  email: '',
  phone: '',
  levels: [],
  primaryStatus: 'ACTIVE',
  joinDate: new Date().toISOString().slice(0, 10),
  timezone: 'Asia/Jakarta',
  notes: ''
});

export function SenseiView() {
  const permissions = usePermissions();
  const sensei = useDashboardStore((state) => state.sensei);
  const schedules = useDashboardStore((state) => state.schedules);
  const classMasters = useDashboardStore((state) => state.classMasters);
  const availability = useDashboardStore((state) => state.availability);
  const leavePeriods = useDashboardStore((state) => state.leavePeriods);
  const weekAnchor = useDashboardStore((state) => state.weekAnchor);
  const setWeekAnchor = useDashboardStore((state) => state.setWeekAnchor);
  const overrideSenseiStatus = useDashboardStore((state) => state.overrideSenseiStatus);
  const updateSenseiTimezone = useDashboardStore((state) => state.updateSenseiTimezone);
  const upsertSensei = useDashboardStore((state) => state.upsertSensei);
  const setSenseiLeave = useDashboardStore((state) => state.setSenseiLeave);
  const currentUser = useDashboardStore((state) => state.currentUser);
  const visible = permissions.canViewAllSensei ? sensei : sensei.filter((item) => item.id === currentUser?.senseiId);
  const canEditOps = permissions.canManageUsers;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [reason, setReason] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const selected = visible.find((item) => item.id === selectedId);
  const selectedLeave = useMemo(
    () =>
      leavePeriods.find(
        (item) => item.senseiId === selectedId && item.status === 'approved'
      ),
    [leavePeriods, selectedId]
  );

  const openCreate = () => {
    setCreating(true);
    setSelectedId(null);
    setForm(emptyForm());
    setReason('');
  };

  const openEdit = (item: Sensei) => {
    setCreating(false);
    setSelectedId(item.id);
    setReason('');
    setForm({
      name: item.name,
      displayName: item.displayName || '',
      email: item.email,
      phone: item.phone,
      levels: item.levels,
      primaryStatus: item.primaryStatus,
      joinDate: item.joinDate,
      timezone: item.timezone,
      notes: item.notes || ''
    });
    const leave = leavePeriods.find((row) => row.senseiId === item.id && row.status === 'approved');
    setLeaveStart(leave?.startDate || '');
    setLeaveEnd(leave?.endDate || '');
  };

  const saveSensei = () => {
    const id = upsertSensei({
      ...form,
      id: creating ? undefined : selectedId || undefined,
      displayName: form.displayName || undefined,
      notes: form.notes || undefined
    });
    if (id) {
      setCreating(false);
      setSelectedId(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-2xl text-sm text-ink-soft">
          Master data Sensei. Label NEW / UNASSIGNED / CUTI dihitung otomatis. INACTIVE tetap tersimpan di history.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <WeekNav weekAnchor={weekAnchor} onChange={setWeekAnchor} />
          {canEditOps ? (
            <Button tone="primary" className="w-full sm:w-auto" onClick={openCreate}>
              + Tambah Sensei
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((item) => {
          const labels = getOperationalLabels(item, schedules, leavePeriods, new Date(), classMasters);
          const workload = getWorkloadMetrics(item.id, availability, schedules, weekAnchor);
          return (
            <button key={item.id} className="ui-card p-4 text-left" onClick={() => openEdit(item)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold text-ink">{senseiDisplayName(item)}</h3>
                  <p className="text-xs text-ink-soft">
                    {item.name !== senseiDisplayName(item) ? `${item.name} · ` : ''}
                    {item.email} · {timezoneAbbreviation(item.timezone)} · join {item.joinDate}
                  </p>
                </div>
                <Badge tone={item.primaryStatus === 'ACTIVE' ? 'success' : 'muted'}>{item.primaryStatus}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {labels.length === 0 ? (
                  <Badge>Tanpa label</Badge>
                ) : (
                  labels.map((label) => (
                    <Badge key={label} tone={LABEL_TONE[label]}>
                      {label}
                    </Badge>
                  ))
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  Tersedia
                  <br />
                  <b>{formatHours(workload.availableHours)}</b>
                </div>
                <div>
                  Terisi
                  <br />
                  <b>{formatHours(workload.assignedHours)}</b>
                </div>
                <div>
                  Sisa kapasitas
                  <br />
                  <b>{formatHours(workload.remainingHours)}</b>
                </div>
                <div>
                  Utilisasi
                  <br />
                  <b>{formatPercent(workload.utilization)}</b>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {creating || selected ? (
        <Modal
          wide
          title={creating ? 'Tambah Sensei' : senseiDisplayName(selected!)}
          onClose={() => {
            setCreating(false);
            setSelectedId(null);
          }}
          footer={
            <>
              <Button
                onClick={() => {
                  setCreating(false);
                  setSelectedId(null);
                }}
              >
                Tutup
              </Button>
              {canEditOps ? (
                <Button tone="primary" onClick={saveSensei}>
                  Simpan
                </Button>
              ) : null}
            </>
          }
        >
          {canEditOps ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className="ui-label">Nama lengkap</span>
                <input className="ui-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label>
                <span className="ui-label">Display name</span>
                <input
                  className="ui-input"
                  value={form.displayName || ''}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                />
              </label>
              <label>
                <span className="ui-label">Email / login</span>
                <input
                  className="ui-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label>
                <span className="ui-label">WhatsApp / kontak</span>
                <input className="ui-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label>
                <span className="ui-label">Join date</span>
                <input
                  className="ui-input"
                  type="date"
                  value={form.joinDate}
                  onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                />
              </label>
              <label>
                <span className="ui-label">Timezone</span>
                <select
                  className="ui-select"
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value as SenseiTimezone })}
                >
                  {SENSEI_TIMEZONE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.abbreviation} · {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="ui-label">Primary status</span>
                <select
                  className="ui-select"
                  value={form.primaryStatus}
                  onChange={(e) => setForm({ ...form, primaryStatus: e.target.value as SenseiPrimaryStatus })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
              <label className="md:col-span-2">
                <span className="ui-label">Level mengajar (pisahkan koma)</span>
                <input
                  className="ui-input"
                  value={form.levels.join(', ')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      levels: e.target.value
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean)
                    })
                  }
                  placeholder={CLASS_LEVELS.slice(0, 4).join(', ')}
                />
              </label>
              <label className="md:col-span-2">
                <span className="ui-label">Catatan internal</span>
                <textarea
                  className="ui-textarea"
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-1 text-sm text-ink-soft">
              <p>Level: {selected?.levels.join(', ') || '—'}</p>
              <p>Timezone: {selected ? timezoneLabel(selected.timezone) : '—'}</p>
              {selected?.notes ? <p>{selected.notes}</p> : null}
            </div>
          )}

          {!creating && selected && canEditOps ? (
            <div className="space-y-3">
              <div className="space-y-2 rounded-2xl border border-[#efe4d2] p-3">
                <p className="ui-label">Periode CUTI</p>
                {selectedLeave ? (
                  <p className="text-xs text-ink-soft">
                    Aktif: {selectedLeave.startDate} → {selectedLeave.endDate}
                  </p>
                ) : null}
                <div className="grid gap-2 md:grid-cols-2">
                  <input className="ui-input" type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} />
                  <input className="ui-input" type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} />
                </div>
                <input
                  className="ui-input"
                  placeholder="Alasan cuti / audit"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!leaveStart || !leaveEnd || !reason}
                    onClick={() => setSenseiLeave(selected.id, { startDate: leaveStart, endDate: leaveEnd }, reason)}
                  >
                    Simpan CUTI
                  </Button>
                  <Button
                    disabled={!reason}
                    onClick={() => {
                      setSenseiLeave(selected.id, null, reason);
                      setLeaveStart('');
                      setLeaveEnd('');
                    }}
                  >
                    Hapus CUTI
                  </Button>
                </div>
              </div>
              <div className="space-y-2 rounded-2xl border border-[#efe4d2] p-3">
                <p className="ui-label">Override status utama (dengan alasan)</p>
                <input className="ui-input" placeholder="Alasan" value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!reason}
                    onClick={() => {
                      overrideSenseiStatus(selected.id, 'ACTIVE', reason);
                      setForm({ ...form, primaryStatus: 'ACTIVE' });
                    }}
                  >
                    Set ACTIVE
                  </Button>
                  <Button
                    tone="danger"
                    disabled={!reason}
                    onClick={() => {
                      overrideSenseiStatus(selected.id, 'INACTIVE', reason);
                      setForm({ ...form, primaryStatus: 'INACTIVE' });
                    }}
                  >
                    Set INACTIVE
                  </Button>
                  <Button
                    disabled={form.timezone === selected.timezone}
                    onClick={() => updateSenseiTimezone(selected.id, form.timezone)}
                  >
                    Sync timezone
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}
