import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CLASS_LEVELS, CLASS_TYPES } from '../constants';
import { hoursBetween, toDateKey, weekDays } from '../lib/dates';
import { displayName, TYPE_TONE } from '../lib/display';
import { findMakeupsOf, hasActiveOrCompletedMakeup, isMakeupSession, makeupLabel } from '../lib/makeup';
import { findConflicts } from '../lib/schedule';
import { useDashboardStore, usePermissions, useScopedData } from '../store/useDashboardStore';
import type { CancellationInitiator, ClassSession, ClassType, SwapInitiator } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { WeekNav } from './ui/WeekNav';

const emptyForm = {
  senseiId: '',
  studentIds: [] as string[],
  type: 'Private' as ClassType,
  level: 'Guntai 1',
  date: toDateKey(new Date()),
  startTime: '09:00',
  endTime: '10:30',
  reason: '',
  makeupOfSessionId: null as string | null
};

export function ScheduleView() {
  const permissions = usePermissions();
  const weekAnchor = useDashboardStore((state) => state.weekAnchor);
  const setWeekAnchor = useDashboardStore((state) => state.setWeekAnchor);
  const allSensei = useDashboardStore((state) => state.sensei);
  const allStudents = useDashboardStore((state) => state.students);
  const createClass = useDashboardStore((state) => state.createClass);
  const updateClass = useDashboardStore((state) => state.updateClass);
  const cancelClass = useDashboardStore((state) => state.cancelClass);
  const swapSensei = useDashboardStore((state) => state.swapSensei);
  const { schedules, sensei, students } = useScopedData();
  const days = weekDays(weekAnchor);
  const hours = ['07:00', '09:00', '11:00', '13:00', '15:00', '17:00', '19:00'];
  const [editing, setEditing] = useState<ClassSession | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [cancelReason, setCancelReason] = useState('');
  const [initiator, setInitiator] = useState<CancellationInitiator>('Admin');
  const [replacementSecured, setReplacementSecured] = useState(false);
  const [swapTo, setSwapTo] = useState('');
  const [swapInitiator, setSwapInitiator] = useState<SwapInitiator>('Admin');

  const conflicts = useMemo(() => findConflicts(schedules), [schedules]);
  const conflictIds = new Set(conflicts.flatMap((pair) => [pair.a.id, pair.b.id]));

  const openCreate = () => {
    setForm({ ...emptyForm, senseiId: sensei[0]?.id ?? '' });
    setCreating(true);
    setEditing(null);
  };

  const openMakeup = (session: ClassSession) => {
    setForm({
      senseiId: session.senseiId,
      studentIds: session.studentIds,
      type: session.type,
      level: session.level,
      date: toDateKey(new Date()),
      startTime: session.startTime,
      endTime: session.endTime,
      reason: `Makeup untuk kelas ${session.date}`,
      makeupOfSessionId: session.id
    });
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (session: ClassSession) => {
    setEditing(session);
    setCreating(false);
    setForm({
      senseiId: session.senseiId,
      studentIds: session.studentIds,
      type: session.type,
      level: session.level,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      reason: '',
      makeupOfSessionId: session.makeupOfSessionId ?? null
    });
    setCancelReason('');
    setSwapTo('');
    setReplacementSecured(Boolean(session.replacementSecured));
  };

  const save = () => {
    const payload = {
      senseiId: form.senseiId,
      studentIds: form.studentIds,
      type: form.type,
      level: form.level,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      makeupOfSessionId: creating ? form.makeupOfSessionId : undefined
    };
    const ok = creating
      ? createClass(payload, form.reason)
      : editing
        ? updateClass(editing.id, payload, form.reason || 'Koreksi jadwal resmi')
        : false;
    if (ok) {
      setCreating(false);
      setEditing(null);
    }
  };

  const linkedMakeups = editing ? findMakeupsOf(editing.id, schedules) : [];
  const alreadyHasMakeup = editing ? hasActiveOrCompletedMakeup(editing.id, schedules) : false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">
            Objek terpisah dari ketersediaan Sensei. Makeup tertaut ke sesi asli agar absensi/progress tidak dihitung dobel.
          </p>
          {conflicts.length > 0 ? (
            <p className="mt-1 text-sm font-semibold text-rose-700">{conflicts.length} konflik perlu diselesaikan.</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WeekNav weekAnchor={weekAnchor} onChange={setWeekAnchor} />
          {permissions.canEditOfficialSchedule ? (
            <Button tone="primary" onClick={openCreate}>
              Tambah kelas
            </Button>
          ) : null}
        </div>
      </div>
      <div className="ui-card overflow-auto">
        <div className="grid min-w-[980px] grid-cols-8 border-b border-[#efe4d2] bg-paper/70 text-xs font-bold uppercase tracking-wide text-ink-soft">
          <div className="px-3 py-3">Jam</div>
          {days.map((day) => (
            <div key={day.toISOString()} className="px-3 py-3">
              {format(day, 'EEE d')}
            </div>
          ))}
        </div>
        {hours.map((hour, index) => {
          const next = hours[index + 1] ?? '21:00';
          return (
            <div key={hour} className="grid min-w-[980px] grid-cols-8 border-b border-[#efe4d2]">
              <div className="px-3 py-3 text-xs font-semibold text-ink-soft">{hour}</div>
              {days.map((day) => {
                const date = toDateKey(day);
                const items = schedules.filter(
                  (session) => session.date === date && session.startTime >= hour && session.startTime < next
                );
                return (
                  <div key={date + hour} className="min-h-24 space-y-2 border-l border-[#efe4d2] p-2">
                    {items.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => openEdit(session)}
                        className={`w-full rounded-xl border p-2 text-left ${
                          session.status === 'cancelled'
                            ? 'border-rose-200 bg-rose-50 opacity-70'
                            : conflictIds.has(session.id)
                              ? 'border-rose-400 bg-rose-50'
                              : isMakeupSession(session)
                                ? 'border-sky-300 bg-sky-50'
                                : 'border-[#e2d6c4] bg-white'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge tone={TYPE_TONE[session.type]}>{session.type}</Badge>
                          {isMakeupSession(session) ? <Badge tone="sky">Makeup</Badge> : null}
                          {conflictIds.has(session.id) ? <Badge tone="danger">Konflik</Badge> : null}
                        </div>
                        <div className="mt-1 text-xs font-bold text-ink">{session.level}</div>
                        <div className="text-[11px] text-ink-soft">
                          {session.startTime}–{session.endTime} · {displayName(allSensei, session.senseiId)}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {(creating || editing) && (
        <Modal
          wide
          title={
            creating
              ? form.makeupOfSessionId
                ? 'Jadwalkan makeup class'
                : 'Kelas resmi baru'
              : 'Detail kelas resmi'
          }
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          footer={
            permissions.canEditOfficialSchedule ? (
              <>
                <Button onClick={() => { setCreating(false); setEditing(null); }}>Tutup</Button>
                <Button tone="primary" onClick={save}>
                  Simpan
                </Button>
              </>
            ) : (
              <Button onClick={() => { setCreating(false); setEditing(null); }}>Tutup</Button>
            )
          }
        >
          {form.makeupOfSessionId && creating ? (
            <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900">
              Makeup tertaut ke sesi asli. Progress/absensi memakai sesi makeup, bukan sesi batal.
            </p>
          ) : null}
          {editing && isMakeupSession(editing) ? (
            <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900">
              {makeupLabel(editing, schedules)}
            </p>
          ) : null}
          {editing && editing.status === 'cancelled' && linkedMakeups.length > 0 ? (
            <p className="rounded-xl bg-paper px-3 py-2 text-sm text-ink-soft">
              Makeup: {linkedMakeups.map((item) => `${item.date} ${item.startTime}`).join(', ')}
            </p>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <span className="ui-label">Sensei</span>
              <select className="ui-select" value={form.senseiId} onChange={(event) => setForm({ ...form, senseiId: event.target.value })} disabled={!permissions.canEditOfficialSchedule}>
                {allSensei.filter((item) => item.primaryStatus === 'ACTIVE').map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="ui-label">Tipe kelas</span>
              <select className="ui-select" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ClassType })} disabled={!permissions.canEditOfficialSchedule}>
                {CLASS_TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label>
              <span className="ui-label">Level</span>
              <select className="ui-select" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })} disabled={!permissions.canEditOfficialSchedule}>
                {CLASS_LEVELS.map((level) => <option key={level}>{level}</option>)}
              </select>
            </label>
            <label>
              <span className="ui-label">Tanggal</span>
              <input className="ui-input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} disabled={!permissions.canEditOfficialSchedule} />
            </label>
            <label>
              <span className="ui-label">Mulai</span>
              <input className="ui-input" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} disabled={!permissions.canEditOfficialSchedule} />
            </label>
            <label>
              <span className="ui-label">Selesai</span>
              <input className="ui-input" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} disabled={!permissions.canEditOfficialSchedule} />
            </label>
          </div>
          <label>
            <span className="ui-label">Siswa</span>
            <select
              multiple
              className="ui-select h-28"
              value={form.studentIds}
              disabled={!permissions.canEditOfficialSchedule}
              onChange={(event) =>
                setForm({
                  ...form,
                  studentIds: Array.from(event.target.selectedOptions).map((option) => option.value)
                })
              }
            >
              {(permissions.canViewAllSchedules ? allStudents : students).map((student) => (
                <option key={student.id} value={student.id}>{student.name}</option>
              ))}
            </select>
          </label>
          {permissions.canEditOfficialSchedule ? (
            <label>
              <span className="ui-label">Alasan perubahan (audit)</span>
              <input className="ui-input" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Wajib untuk edit/swap/cancel" />
            </label>
          ) : null}
          <p className="text-xs text-ink-soft">Durasi {hoursBetween(form.startTime, form.endTime)} jam. Ketersediaan Sensei hanya referensi kapasitas, bukan sumber kebenaran jadwal.</p>
          {editing && permissions.canEditOfficialSchedule && editing.status === 'cancelled' && !alreadyHasMakeup ? (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3">
              <p className="ui-label">Makeup class</p>
              <p className="mb-2 text-xs text-ink-soft">Buat sesi pengganti yang tertaut ke kelas batal ini.</p>
              <Button tone="primary" onClick={() => openMakeup(editing)}>Jadwalkan makeup</Button>
            </div>
          ) : null}
          {editing && permissions.canAssignSensei && editing.status !== 'cancelled' ? (
            <div className="grid gap-3 rounded-2xl border border-[#efe4d2] p-3 md:grid-cols-2">
              <div>
                <p className="ui-label">Tukar Sensei</p>
                <select className="ui-select" value={swapTo} onChange={(event) => setSwapTo(event.target.value)}>
                  <option value="">Pilih pengganti</option>
                  {allSensei.filter((item) => item.id !== editing.senseiId && item.primaryStatus === 'ACTIVE').map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                <select className="ui-select mt-2" value={swapInitiator} onChange={(event) => setSwapInitiator(event.target.value as SwapInitiator)}>
                  <option>Admin</option>
                  <option>Sensei</option>
                  <option>Student</option>
                </select>
                <Button
                  className="mt-2"
                  tone="primary"
                  disabled={!swapTo || !form.reason}
                  onClick={() => {
                    if (swapSensei(editing.id, swapTo, swapInitiator, form.reason)) {
                      setEditing(null);
                    }
                  }}
                >
                  Simpan swap
                </Button>
              </div>
              <div>
                <p className="ui-label">Batalkan kelas</p>
                <input className="ui-input" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Alasan pembatalan" />
                <select className="ui-select mt-2" value={initiator} onChange={(event) => setInitiator(event.target.value as CancellationInitiator)}>
                  <option>Admin</option>
                  <option>Sensei</option>
                  <option>Student</option>
                  <option>Ops</option>
                </select>
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={replacementSecured} onChange={(event) => setReplacementSecured(event.target.checked)} />
                  Pengganti berhasil diamankan
                </label>
                <Button
                  className="mt-2"
                  tone="danger"
                  disabled={!cancelReason}
                  onClick={() => {
                    cancelClass(editing.id, { reason: cancelReason, initiator, replacementSecured });
                    setEditing(null);
                  }}
                >
                  Batalkan kelas
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}
