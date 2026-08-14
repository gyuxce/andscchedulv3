import { useState } from 'react';
import { DAYS_OF_WEEK } from '../constants';
import { hoursBetween } from '../lib/dates';
import { displayName } from '../lib/display';
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
  const { availability, schedules, sensei } = useScopedData();
  const [open, setOpen] = useState(false);
  const defaultSensei = currentUser?.senseiId ?? sensei[0]?.id ?? allSensei[0]?.id ?? '';
  const [form, setForm] = useState({
    senseiId: defaultSensei,
    pattern: 'weekly' as AvailabilityPattern,
    weekday: 1,
    date: weekAnchor,
    startTime: '09:00',
    endTime: '12:00',
    remarks: ''
  });

  const canEdit = (senseiId: string) =>
    permissions.canOverrideAvailability || (permissions.canMarkOwnAvailability && currentUser?.senseiId === senseiId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-ink-soft">
          Ketersediaan adalah slot yang dibuka Sensei, bukan kelas resmi. Admin memakai ini sebagai informasi kapasitas sebelum assign.
        </p>
        <div className="flex items-center gap-2">
          <WeekNav weekAnchor={weekAnchor} onChange={setWeekAnchor} />
          {(permissions.canMarkOwnAvailability || permissions.canOverrideAvailability) && (
            <Button tone="primary" onClick={() => setOpen(true)}>Tambah ketersediaan</Button>
          )}
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {(permissions.canViewAllSensei ? allSensei : sensei).map((item) => {
          const slots = availability.filter((slot) => slot.senseiId === item.id && slot.isActive);
          const workload = getWorkloadMetrics(item.id, availability, schedules, weekAnchor);
          return (
            <div key={item.id} className="ui-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-ink">{item.name}</h3>
                  <p className="text-xs text-ink-soft">
                    Tersedia {formatHours(workload.availableHours)} · Terisi {formatHours(workload.assignedHours)} · Sisa {formatHours(workload.remainingHours)}
                  </p>
                </div>
                <Badge tone="sky">Bukan jadwal resmi</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {slots.length === 0 ? (
                  <p className="text-sm text-ink-soft">Belum ada slot aktif.</p>
                ) : (
                  slots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between rounded-xl border border-[#efe4d2] bg-white px-3 py-2">
                      <div>
                        <div className="text-sm font-bold">
                          {slot.pattern === 'weekly'
                            ? DAYS_OF_WEEK.find((day) => day.value === slot.weekday)?.label
                            : slot.date}{' '}
                          · {slot.startTime}–{slot.endTime}
                        </div>
                        <div className="text-xs text-ink-soft">
                          {hoursBetween(slot.startTime, slot.endTime)} jam {slot.remarks ? `· ${slot.remarks}` : ''}
                        </div>
                      </div>
                      {canEdit(item.id) ? (
                        <button className="text-xs font-bold text-rose-700" onClick={() => removeAvailability(slot.id)}>
                          Nonaktifkan
                        </button>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
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
                  upsertAvailability({
                    senseiId: form.senseiId,
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
              <select className="ui-select" value={form.senseiId} onChange={(event) => setForm({ ...form, senseiId: event.target.value })}>
                {allSensei.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          ) : (
            <p className="text-sm">Untuk {displayName(allSensei, form.senseiId)}</p>
          )}
          <label>
            <span className="ui-label">Pola</span>
            <select className="ui-select" value={form.pattern} onChange={(event) => setForm({ ...form, pattern: event.target.value as AvailabilityPattern })}>
              <option value="weekly">Mingguan berulang</option>
              <option value="specific_date">Tanggal spesifik</option>
            </select>
          </label>
          {form.pattern === 'weekly' ? (
            <label>
              <span className="ui-label">Hari</span>
              <select className="ui-select" value={form.weekday} onChange={(event) => setForm({ ...form, weekday: Number(event.target.value) })}>
                {DAYS_OF_WEEK.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
              </select>
            </label>
          ) : (
            <label>
              <span className="ui-label">Tanggal</span>
              <input className="ui-input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="ui-label">Mulai</span>
              <input className="ui-input" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
            </label>
            <label>
              <span className="ui-label">Selesai</span>
              <input className="ui-input" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
            </label>
          </div>
          <label>
            <span className="ui-label">Catatan (opsional)</span>
            <input className="ui-input" value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} />
          </label>
        </Modal>
      ) : null}
    </div>
  );
}
