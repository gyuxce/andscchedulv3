import { useState } from 'react';
import { toast } from 'sonner';
import { DAYS_OF_WEEK } from '../constants';
import { hoursBetween } from '../lib/dates';
import { displayName } from '../lib/display';
import { isUuid } from '../lib/senseiLink';
import { getWorkloadMetrics, formatHours } from '../lib/workload';
import { useDashboardStore, usePermissions, useScopedData } from '../store/useDashboardStore';
import type { AvailabilityPattern } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { WeekNav } from './ui/WeekNav';

export function AvailabilityView() {
  const permissions = usePermissions();
  const currentUser = useDashboardStore((state) => state.currentUser);
  const allSensei = useDashboardStore((state) => state.sensei);
  const weekAnchor = useDashboardStore((state) => state.weekAnchor);
  const setWeekAnchor = useDashboardStore((state) => state.setWeekAnchor);
  const upsertAvailability = useDashboardStore((state) => state.upsertAvailability);
  const removeAvailability = useDashboardStore((state) => state.removeAvailability);
  const { availability, schedules, sensei, linkedSenseiId } = useScopedData();
  const [open, setOpen] = useState(false);
  const ownSenseiId = linkedSenseiId ?? currentUser?.senseiId ?? '';
  const [form, setForm] = useState({
    senseiId: ownSenseiId,
    pattern: 'weekly' as AvailabilityPattern,
    weekday: 1,
    date: weekAnchor,
    startTime: '09:00',
    endTime: '12:00',
    remarks: ''
  });

  const canEdit = (senseiId: string) =>
    permissions.canOverrideAvailability ||
    (permissions.canMarkOwnAvailability && Boolean(ownSenseiId) && ownSenseiId === senseiId);

  const openModal = () => {
    if (!permissions.canOverrideAvailability && !isUuid(ownSenseiId)) {
      toast.error(
        'Akun Sensei belum tertaut. Di tabel sensei, samakan kolom email dengan email login Auth.'
      );
      return;
    }
    setForm((current) => ({
      ...current,
      senseiId: permissions.canOverrideAvailability
        ? current.senseiId || allSensei[0]?.id || ''
        : ownSenseiId
    }));
    setOpen(true);
  };

  const visibleSensei = permissions.canViewAllSensei ? allSensei : sensei;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-ink-soft">
          Ketersediaan adalah slot yang dibuka Sensei, bukan kelas resmi. Admin memakai ini sebagai informasi kapasitas sebelum assign.
        </p>
        <div className="flex items-center gap-2">
          <WeekNav weekAnchor={weekAnchor} onChange={setWeekAnchor} />
          {(permissions.canMarkOwnAvailability || permissions.canOverrideAvailability) && (
            <Button tone="primary" onClick={openModal}>
              Tambah ketersediaan
            </Button>
          )}
        </div>
      </div>

      {!permissions.canViewAllSensei && !isUuid(ownSenseiId) ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          Akun Sensei belum tertaut ke master data. Email login: <b>{currentUser?.email}</b>.
          Samakan dengan kolom <b>email</b> di tabel <b>sensei</b>, atau minta Admin set{' '}
          <b>profiles.sensei_id</b>, lalu login ulang.
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {visibleSensei.length === 0 ? (
          <div className="ui-card p-4 text-sm text-ink-soft">Tidak ada Sensei pada lingkup akun ini.</div>
        ) : (
          visibleSensei.map((item) => {
            const slots = availability.filter((slot) => slot.senseiId === item.id && slot.isActive);
            const workload = getWorkloadMetrics(item.id, availability, schedules, weekAnchor);
            return (
              <div key={item.id} className="ui-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-ink">{item.name}</h3>
                    <p className="text-xs text-ink-soft">
                      Tersedia {formatHours(workload.availableHours)} · Terisi {formatHours(workload.assignedHours)} ·
                      Sisa {formatHours(workload.remainingHours)}
                    </p>
                  </div>
                  <Badge tone="sky">Bukan jadwal resmi</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {slots.length === 0 ? (
                    <p className="text-sm text-ink-soft">Belum ada slot aktif.</p>
                  ) : (
                    slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2"
                      >
                        <div>
                          <div className="text-sm font-bold">
                            {slot.pattern === 'weekly'
                              ? DAYS_OF_WEEK.find((day) => day.value === slot.weekday)?.label
                              : slot.date}{' '}
                            · {slot.startTime}–{slot.endTime}
                          </div>
                          <div className="text-xs text-ink-soft">
                            {hoursBetween(slot.startTime, slot.endTime)} jam{' '}
                            {slot.remarks ? `· ${slot.remarks}` : ''}
                          </div>
                        </div>
                        {canEdit(item.id) ? (
                          <button
                            className="text-xs font-bold text-rose-700"
                            onClick={() => removeAvailability(slot.id)}
                          >
                            Nonaktifkan
                          </button>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {open ? (
        <Modal
          title="Buka ketersediaan"
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button onClick={() => setOpen(false)}>Batal</Button>
              <Button
                tone="primary"
                onClick={() => {
                  const targetId = permissions.canOverrideAvailability ? form.senseiId : ownSenseiId;
                  if (!isUuid(targetId)) {
                    toast.error('Sensei belum tertaut / belum dipilih.');
                    return;
                  }
                  upsertAvailability({
                    senseiId: targetId,
                    pattern: form.pattern,
                    weekday: form.pattern === 'weekly' ? form.weekday : null,
                    date: form.pattern === 'specific_date' ? form.date : null,
                    startTime: form.startTime,
                    endTime: form.endTime,
                    remarks: form.remarks,
                    isActive: true
                  });
                  setOpen(false);
                }}
              >
                Simpan
              </Button>
            </>
          }
        >
          {permissions.canOverrideAvailability ? (
            <label>
              <span className="ui-label">Sensei</span>
              <select
                className="ui-select"
                value={form.senseiId}
                onChange={(event) => setForm({ ...form, senseiId: event.target.value })}
              >
                {allSensei.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm">Untuk {displayName(allSensei, ownSenseiId)}</p>
          )}
          <label>
            <span className="ui-label">Pola</span>
            <select
              className="ui-select"
              value={form.pattern}
              onChange={(event) => setForm({ ...form, pattern: event.target.value as AvailabilityPattern })}
            >
              <option value="weekly">Mingguan berulang</option>
              <option value="specific_date">Tanggal spesifik</option>
            </select>
          </label>
          {form.pattern === 'weekly' ? (
            <label>
              <span className="ui-label">Hari</span>
              <select
                className="ui-select"
                value={form.weekday}
                onChange={(event) => setForm({ ...form, weekday: Number(event.target.value) })}
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              <span className="ui-label">Tanggal</span>
              <input
                className="ui-input"
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
              />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="ui-label">Mulai</span>
              <input
                className="ui-input"
                type="time"
                value={form.startTime}
                onChange={(event) => setForm({ ...form, startTime: event.target.value })}
              />
            </label>
            <label>
              <span className="ui-label">Selesai</span>
              <input
                className="ui-input"
                type="time"
                value={form.endTime}
                onChange={(event) => setForm({ ...form, endTime: event.target.value })}
              />
            </label>
          </div>
          <label>
            <span className="ui-label">Catatan (opsional)</span>
            <input
              className="ui-input"
              value={form.remarks}
              onChange={(event) => setForm({ ...form, remarks: event.target.value })}
            />
          </label>
        </Modal>
      ) : null}
    </div>
  );
}
