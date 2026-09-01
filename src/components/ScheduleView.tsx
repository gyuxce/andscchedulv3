import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CLASS_LEVELS, CLASS_TYPES, DAYS_OF_WEEK } from '../constants';
import { hoursBetween, toDateKey, weekDays } from '../lib/dates';
import { displayName, TYPE_TONE } from '../lib/display';
import { findMakeupsOf, hasActiveOrCompletedMakeup, isMakeupSession, makeupLabel } from '../lib/makeup';
import { addMinutesToTime } from '../lib/recurring';
import { findConflicts } from '../lib/schedule';
import {
  buildRecurringPreview,
  formatPreviewDate,
  previewConflicts
} from '../lib/schedulePreview';
import { useDashboardStore, usePermissions, useScopedData } from '../store/useDashboardStore';
import type { CancellationInitiator, ClassSession, ClassType, SwapInitiator } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { DetailFields } from './ui/DetailFields';
import { Modal } from './ui/Modal';
import { PageIntro } from './ui/PageIntro';
import { StudentPicker } from './ui/StudentPicker';
import { WeekNav } from './ui/WeekNav';

const emptySessionForm = {
  senseiId: '',
  studentIds: [] as string[],
  type: 'Private' as ClassType,
  level: 'Guntai 1',
  date: toDateKey(new Date()),
  startTime: '09:00',
  endTime: '10:30',
  reason: '',
  makeupOfSessionId: null as string | null,
  classId: null as string | null,
  isExtra: false
};

const emptyRecurringForm = {
  displayName: '',
  senseiId: '',
  studentIds: [] as string[],
  type: 'Private' as ClassType,
  level: 'Pra Guntai',
  startDate: toDateKey(new Date()),
  weekdays: [1] as number[],
  startTime: '19:00',
  durationMinutes: 90,
  requiredMeetings: 10,
  acknowledgeConflicts: false
};

export function ScheduleView() {
  const permissions = usePermissions();
  const weekAnchor = useDashboardStore((state) => state.weekAnchor);
  const setWeekAnchor = useDashboardStore((state) => state.setWeekAnchor);
  const allSensei = useDashboardStore((state) => state.sensei);
  const allStudents = useDashboardStore((state) => state.students);
  const classMasters = useDashboardStore((state) => state.classMasters);
  const createClass = useDashboardStore((state) => state.createClass);
  const createRecurringOfficialClass = useDashboardStore((state) => state.createRecurringOfficialClass);
  const createExtraSession = useDashboardStore((state) => state.createExtraSession);
  const updateClass = useDashboardStore((state) => state.updateClass);
  const cancelClass = useDashboardStore((state) => state.cancelClass);
  const swapSensei = useDashboardStore((state) => state.swapSensei);
  const { schedules, sensei, students } = useScopedData();
  const days = weekDays(weekAnchor);
  const hours = ['07:00', '09:00', '11:00', '13:00', '15:00', '17:00', '19:00'];
  const [editing, setEditing] = useState<ClassSession | null>(null);
  const [creatingRecurring, setCreatingRecurring] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [recurringForm, setRecurringForm] = useState(emptyRecurringForm);
  const [cancelReason, setCancelReason] = useState('');
  const [initiator, setInitiator] = useState<CancellationInitiator>('Admin');
  const [replacementSecured, setReplacementSecured] = useState(false);
  const [swapTo, setSwapTo] = useState('');
  const [swapInitiator, setSwapInitiator] = useState<SwapInitiator>('Admin');
  const [detailMode, setDetailMode] = useState<'view' | 'edit'>('view');

  const conflicts = useMemo(() => findConflicts(schedules), [schedules]);
  const conflictIds = new Set(conflicts.flatMap((pair) => [pair.a.id, pair.b.id]));

  const studentOptions = permissions.canViewAllSchedules ? allStudents : students;

  const preview = useMemo(
    () =>
      buildRecurringPreview({
        startDate: recurringForm.startDate,
        weekdays: recurringForm.weekdays,
        startTime: recurringForm.startTime,
        durationMinutes: recurringForm.durationMinutes,
        requiredMeetings: recurringForm.requiredMeetings
      }),
    [recurringForm]
  );

  const previewConflictList = useMemo(() => {
    if (!recurringForm.senseiId || recurringForm.studentIds.length === 0 || !preview.length) return [];
    return previewConflicts(
      schedules,
      preview,
      recurringForm.senseiId,
      recurringForm.studentIds,
      recurringForm.type,
      recurringForm.level
    );
  }, [schedules, preview, recurringForm]);

  const openRecurring = () => {
    setRecurringForm({
      ...emptyRecurringForm,
      senseiId: sensei[0]?.id ?? allSensei.find((item) => item.primaryStatus === 'ACTIVE')?.id ?? ''
    });
    setCreatingRecurring(true);
    setCreatingSession(false);
    setEditing(null);
  };

  const openMakeup = (session: ClassSession) => {
    setSessionForm({
      senseiId: session.senseiId,
      studentIds: session.studentIds,
      type: session.type,
      level: session.level,
      date: toDateKey(new Date()),
      startTime: session.startTime,
      endTime: session.endTime,
      reason: `Makeup untuk kelas ${session.date}`,
      makeupOfSessionId: session.id,
      classId: session.classId ?? null,
      isExtra: false
    });
    setCreatingSession(true);
    setCreatingRecurring(false);
    setEditing(null);
  };

  const openExtra = (session: ClassSession) => {
    if (!session.classId) {
      return;
    }
    setSessionForm({
      senseiId: session.senseiId,
      studentIds: session.studentIds,
      type: session.type,
      level: session.level,
      date: toDateKey(new Date()),
      startTime: session.startTime,
      endTime: session.endTime,
      reason: 'Extra meeting di luar rencana',
      makeupOfSessionId: null,
      classId: session.classId,
      isExtra: true
    });
    setCreatingSession(true);
    setCreatingRecurring(false);
    setEditing(null);
  };

  const openEdit = (session: ClassSession) => {
    setEditing(session);
    setCreatingRecurring(false);
    setCreatingSession(false);
    setDetailMode('view');
    setSessionForm({
      senseiId: session.senseiId,
      studentIds: session.studentIds,
      type: session.type,
      level: session.level,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      reason: '',
      makeupOfSessionId: session.makeupOfSessionId ?? null,
      classId: session.classId ?? null,
      isExtra: Boolean(session.isExtra)
    });
    setCancelReason('');
    setSwapTo('');
    setReplacementSecured(Boolean(session.replacementSecured));
  };

  const saveSession = () => {
    const payload = {
      senseiId: sessionForm.senseiId,
      studentIds: sessionForm.studentIds,
      type: sessionForm.type,
      level: sessionForm.level,
      date: sessionForm.date,
      startTime: sessionForm.startTime,
      endTime: sessionForm.endTime,
      makeupOfSessionId: creatingSession ? sessionForm.makeupOfSessionId : undefined,
      classId: sessionForm.classId,
      isExtra: sessionForm.isExtra
    };
    let ok = false;
    if (creatingSession && sessionForm.isExtra && sessionForm.classId) {
      ok = createExtraSession({ ...payload, classId: sessionForm.classId }, sessionForm.reason);
    } else if (creatingSession) {
      ok = createClass(payload, sessionForm.reason);
    } else if (editing) {
      ok = updateClass(editing.id, payload, sessionForm.reason || 'Koreksi jadwal resmi');
    }
    if (ok) {
      setCreatingSession(false);
      setEditing(null);
      setDetailMode('view');
    }
  };

  const saveRecurring = () => {
    const ok = createRecurringOfficialClass({
      ...recurringForm,
      acknowledgeConflicts: recurringForm.acknowledgeConflicts
    });
    if (ok) setCreatingRecurring(false);
  };

  const linkedMakeups = editing ? findMakeupsOf(editing.id, schedules) : [];
  const alreadyHasMakeup = editing ? hasActiveOrCompletedMakeup(editing.id, schedules) : false;
  const editingClass = editing?.classId
    ? classMasters.find((item) => item.id === editing.classId)
    : undefined;

  const setDurationFromStart = (startTime: string, endTime: string) => {
    setSessionForm((prev) => ({ ...prev, startTime, endTime }));
  };

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Jadwal Resmi"
        title="Kalender kelas"
        actions={
          <>
            <WeekNav weekAnchor={weekAnchor} onChange={setWeekAnchor} />
            {permissions.canEditOfficialSchedule ? (
              <Button tone="primary" className="w-full sm:w-auto" onClick={openRecurring}>
                Kelas resmi baru
              </Button>
            ) : null}
          </>
        }
      >
        Kelas resmi = 1 Class Master + N sesi berulang. Makeup tertaut ke sesi batal; Extra meeting terpisah dari rencana.
        {conflicts.length > 0 ? (
          <p className="mt-1 font-semibold text-rose-700">{conflicts.length} konflik perlu diselesaikan.</p>
        ) : null}
      </PageIntro>
      <p className="text-xs text-ink-soft lg:hidden">Geser ke samping untuk melihat jadwal mingguan.</p>
      <div className="ui-card overflow-auto">
        <div className="grid min-w-[720px] grid-cols-8 border-b border-line bg-paper/70 text-xs font-bold uppercase tracking-wide text-ink-soft sm:min-w-[980px]">
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
            <div key={hour} className="grid min-w-[720px] grid-cols-8 border-b border-line sm:min-w-[980px]">
              <div className="px-3 py-3 text-xs font-semibold text-ink-soft">{hour}</div>
              {days.map((day) => {
                const date = toDateKey(day);
                const items = schedules.filter(
                  (session) => session.date === date && session.startTime >= hour && session.startTime < next
                );
                return (
                  <div key={date + hour} className="min-h-24 space-y-2 border-l border-line p-2">
                    {items.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => openEdit(session)}
                        className={`w-full rounded-lg border p-2 text-left transition hover:border-maple/40 ${
                          session.status === 'cancelled'
                            ? 'border-rose-200 bg-rose-50 opacity-70 dark:border-rose-500/30 dark:bg-rose-500/10'
                            : conflictIds.has(session.id)
                              ? 'border-rose-400 bg-rose-50 dark:border-rose-400/50 dark:bg-rose-500/15'
                              : session.isExtra
                                ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
                                : isMakeupSession(session)
                                  ? 'border-sky-300 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10'
                                  : 'border-line bg-surface'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge tone={TYPE_TONE[session.type]}>{session.type}</Badge>
                          {session.isExtra ? <Badge tone="gold">Extra</Badge> : null}
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

      {creatingRecurring && (
        <Modal
          wide
          title="Kelas resmi baru"
          onClose={() => setCreatingRecurring(false)}
          footer={
            permissions.canEditOfficialSchedule ? (
              <>
                <Button onClick={() => setCreatingRecurring(false)}>Tutup</Button>
                <Button tone="primary" onClick={saveRecurring}>
                  Save Class & Schedule
                </Button>
              </>
            ) : (
              <Button onClick={() => setCreatingRecurring(false)}>Tutup</Button>
            )
          }
        >
          <div className="space-y-4">
            <section className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Informasi kelas</p>
              <label>
                <span className="ui-label">Nama kelas</span>
                <input
                  className="ui-input"
                  value={recurringForm.displayName}
                  placeholder="Private Nathan Pra Guntai"
                  onChange={(event) => setRecurringForm({ ...recurringForm, displayName: event.target.value })}
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className="ui-label">Sensei</span>
                  <select
                    className="ui-select"
                    value={recurringForm.senseiId}
                    onChange={(event) => setRecurringForm({ ...recurringForm, senseiId: event.target.value })}
                  >
                    {allSensei
                      .filter((item) => item.primaryStatus === 'ACTIVE')
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  <span className="ui-label">Tipe kelas</span>
                  <select
                    className="ui-select"
                    value={recurringForm.type}
                    onChange={(event) =>
                      setRecurringForm({ ...recurringForm, type: event.target.value as ClassType })
                    }
                  >
                    {CLASS_TYPES.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="ui-label">Level</span>
                  <select
                    className="ui-select"
                    value={recurringForm.level}
                    onChange={(event) => setRecurringForm({ ...recurringForm, level: event.target.value })}
                  >
                    {CLASS_LEVELS.map((level) => (
                      <option key={level}>{level}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div>
                <span className="ui-label">Siswa</span>
                <StudentPicker
                  students={studentOptions}
                  value={recurringForm.studentIds}
                  onChange={(studentIds) => setRecurringForm({ ...recurringForm, studentIds })}
                />
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Jadwal berulang</p>
              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className="ui-label">Start date</span>
                  <input
                    className="ui-input"
                    type="date"
                    value={recurringForm.startDate}
                    onChange={(event) => setRecurringForm({ ...recurringForm, startDate: event.target.value })}
                  />
                </label>
                <label>
                  <span className="ui-label">Start time</span>
                  <input
                    className="ui-input"
                    type="time"
                    value={recurringForm.startTime}
                    onChange={(event) => setRecurringForm({ ...recurringForm, startTime: event.target.value })}
                  />
                </label>
                <label>
                  <span className="ui-label">Duration (menit)</span>
                  <input
                    className="ui-input"
                    type="number"
                    min={30}
                    step={15}
                    value={recurringForm.durationMinutes}
                    onChange={(event) =>
                      setRecurringForm({
                        ...recurringForm,
                        durationMinutes: Number(event.target.value) || 90
                      })
                    }
                  />
                </label>
                <label>
                  <span className="ui-label">End time (otomatis)</span>
                  <input
                    className="ui-input"
                    type="time"
                    readOnly
                    value={addMinutesToTime(recurringForm.startTime, recurringForm.durationMinutes)}
                  />
                </label>
                <label>
                  <span className="ui-label">Total required meetings</span>
                  <input
                    className="ui-input"
                    type="number"
                    min={1}
                    value={recurringForm.requiredMeetings}
                    onChange={(event) =>
                      setRecurringForm({
                        ...recurringForm,
                        requiredMeetings: Math.max(1, Number(event.target.value) || 1)
                      })
                    }
                  />
                </label>
              </div>
              <div>
                <span className="ui-label">Recurring days</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const checked = recurringForm.weekdays.includes(day.value);
                    return (
                      <label key={day.value} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setRecurringForm({
                              ...recurringForm,
                              weekdays: checked
                                ? recurringForm.weekdays.filter((value) => value !== day.value)
                                : [...recurringForm.weekdays, day.value]
                            })
                          }
                        />
                        {day.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Preview schedule</p>
              {preview.length === 0 ? (
                <p className="text-sm text-ink-soft">Isi start date, hari, dan jumlah pertemuan untuk melihat preview.</p>
              ) : (
                <div className="max-h-56 overflow-auto rounded-xl border border-line">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-paper text-xs uppercase text-ink-soft">
                      <tr>
                        <th className="px-3 py-2">Session</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row) => (
                        <tr key={row.label} className="border-t border-line">
                          <td className="px-3 py-1.5 font-semibold">{row.label}</td>
                          <td className="px-3 py-1.5">{formatPreviewDate(row.date)}</td>
                          <td className="px-3 py-1.5">
                            {row.startTime}–{row.endTime}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {previewConflictList.length > 0 ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                  <p className="font-semibold">
                    {previewConflictList.length} konflik dengan jadwal resmi Sensei yang sama.
                  </p>
                  <ul className="mt-1 list-disc pl-4 text-xs">
                    {previewConflictList.slice(0, 5).map((item) => (
                      <li key={`${item.date}-${item.startTime}-${item.withDate}`}>
                        {item.date} {item.startTime} bentrok dengan {item.withDate} {item.withStart}
                      </li>
                    ))}
                  </ul>
                  <label className="mt-2 flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={recurringForm.acknowledgeConflicts}
                      onChange={(event) =>
                        setRecurringForm({ ...recurringForm, acknowledgeConflicts: event.target.checked })
                      }
                    />
                    Saya paham konfliknya dan tetap simpan (tidak menimpa sesi lama)
                  </label>
                </div>
              ) : null}
            </section>
          </div>
        </Modal>
      )}

      {(creatingSession || editing) && (
        <Modal
          wide
          title={
            creatingSession
              ? sessionForm.isExtra
                ? 'Tambah extra meeting'
                : sessionForm.makeupOfSessionId
                  ? 'Jadwalkan makeup class'
                  : 'Sesi resmi'
              : 'Detail sesi resmi'
          }
          onClose={() => {
            setCreatingSession(false);
            setEditing(null);
            setDetailMode('view');
          }}
          footer={
            <>
              <Button
                onClick={() => {
                  setCreatingSession(false);
                  setEditing(null);
                  setDetailMode('view');
                }}
              >
                Tutup
              </Button>
              {editing && detailMode === 'view' && permissions.canEditOfficialSchedule ? (
                <Button tone="primary" onClick={() => setDetailMode('edit')}>
                  Ubah
                </Button>
              ) : null}
              {(creatingSession || (editing && detailMode === 'edit')) &&
              permissions.canEditOfficialSchedule ? (
                <>
                  {editing && detailMode === 'edit' ? (
                    <Button
                      onClick={() => {
                        openEdit(editing);
                      }}
                    >
                      Batal ubah
                    </Button>
                  ) : null}
                  <Button tone="primary" onClick={saveSession}>
                    Simpan
                  </Button>
                </>
              ) : null}
            </>
          }
        >
          {sessionForm.makeupOfSessionId && creatingSession ? (
            <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-500/10 dark:text-sky-100">
              Makeup tertaut ke sesi asli. Progress/absensi memakai sesi makeup, bukan sesi batal. Required meetings tidak naik.
            </p>
          ) : null}
          {sessionForm.isExtra && creatingSession ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
              Extra meeting di luar rencana. Tidak dihitung ke required X/X kecuali Admin mengubah total secara eksplisit.
            </p>
          ) : null}
          {editing && isMakeupSession(editing) ? (
            <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-500/10 dark:text-sky-100">
              {makeupLabel(editing, schedules)}
            </p>
          ) : null}
          {editing?.isExtra ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">Sesi Extra — di luar required meetings.</p>
          ) : null}
          {editingClass ? (
            <p className="text-xs text-ink-soft">
              Class: {editingClass.displayName} · Original end {editingClass.plannedEndDate || '—'} · Projected{' '}
              {editingClass.projectedEndDate || '—'}
            </p>
          ) : null}
          {editing && editing.status === 'cancelled' && linkedMakeups.length > 0 ? (
            <p className="rounded-xl bg-paper px-3 py-2 text-sm text-ink-soft">
              Makeup: {linkedMakeups.map((item) => `${item.date} ${item.startTime}`).join(', ')}
            </p>
          ) : null}

          {editing && detailMode === 'view' ? (
            <>
              <DetailFields
                items={[
                  { label: 'Status', value: editing.status },
                  { label: 'Sensei', value: displayName(allSensei, sessionForm.senseiId) },
                  { label: 'Tipe kelas', value: sessionForm.type },
                  { label: 'Level', value: sessionForm.level },
                  { label: 'Tanggal', value: sessionForm.date },
                  {
                    label: 'Waktu',
                    value: `${sessionForm.startTime} – ${sessionForm.endTime} (${hoursBetween(sessionForm.startTime, sessionForm.endTime)} jam)`
                  },
                  {
                    label: 'Siswa',
                    value:
                      sessionForm.studentIds
                        .map((id) => displayName(studentOptions, id))
                        .filter(Boolean)
                        .join(', ') || '—',
                    full: true
                  }
                ]}
              />
              {permissions.canEditOfficialSchedule && editing.classId ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <p className="ui-label">Extra meeting</p>
                  <p className="mb-2 text-xs text-ink-soft">
                    Tambah sesi di luar required meetings tanpa mengubah total rencana.
                  </p>
                  <Button tone="primary" onClick={() => openExtra(editing)}>
                    + Add Extra Meeting
                  </Button>
                </div>
              ) : null}
              {permissions.canEditOfficialSchedule &&
              editing.status === 'cancelled' &&
              !alreadyHasMakeup ? (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-500/30 dark:bg-sky-500/10">
                  <p className="ui-label">Replacement / Makeup</p>
                  <p className="mb-2 text-xs text-ink-soft">Buat sesi pengganti tertaut ke kelas batal ini.</p>
                  <Button tone="primary" onClick={() => openMakeup(editing)}>
                    Jadwalkan makeup
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className="ui-label">Sensei</span>
                  <select
                    className="ui-select"
                    value={sessionForm.senseiId}
                    onChange={(event) => setSessionForm({ ...sessionForm, senseiId: event.target.value })}
                  >
                    {allSensei
                      .filter((item) => item.primaryStatus === 'ACTIVE')
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  <span className="ui-label">Tipe kelas</span>
                  <select
                    className="ui-select"
                    value={sessionForm.type}
                    onChange={(event) => setSessionForm({ ...sessionForm, type: event.target.value as ClassType })}
                  >
                    {CLASS_TYPES.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="ui-label">Level</span>
                  <select
                    className="ui-select"
                    value={sessionForm.level}
                    onChange={(event) => setSessionForm({ ...sessionForm, level: event.target.value })}
                  >
                    {CLASS_LEVELS.map((level) => (
                      <option key={level}>{level}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="ui-label">Tanggal</span>
                  <input
                    className="ui-input"
                    type="date"
                    value={sessionForm.date}
                    onChange={(event) => setSessionForm({ ...sessionForm, date: event.target.value })}
                  />
                </label>
                <label>
                  <span className="ui-label">Mulai</span>
                  <input
                    className="ui-input"
                    type="time"
                    value={sessionForm.startTime}
                    onChange={(event) => {
                      const startTime = event.target.value;
                      const duration = hoursBetween(sessionForm.startTime, sessionForm.endTime) * 60 || 90;
                      setDurationFromStart(startTime, addMinutesToTime(startTime, duration));
                    }}
                  />
                </label>
                <label>
                  <span className="ui-label">Selesai</span>
                  <input
                    className="ui-input"
                    type="time"
                    value={sessionForm.endTime}
                    onChange={(event) => setSessionForm({ ...sessionForm, endTime: event.target.value })}
                  />
                </label>
              </div>
              <div>
                <span className="ui-label">Siswa</span>
                <StudentPicker
                  students={studentOptions}
                  value={sessionForm.studentIds}
                  onChange={(studentIds) => setSessionForm({ ...sessionForm, studentIds })}
                />
              </div>
              <label>
                <span className="ui-label">Alasan perubahan (audit)</span>
                <input
                  className="ui-input"
                  value={sessionForm.reason}
                  onChange={(event) => setSessionForm({ ...sessionForm, reason: event.target.value })}
                  placeholder="Wajib untuk edit/swap/cancel"
                />
              </label>
              <p className="text-xs text-ink-soft">
                Durasi {hoursBetween(sessionForm.startTime, sessionForm.endTime)} jam. Ketersediaan Sensei hanya
                referensi kapasitas.
              </p>
              {editing && permissions.canAssignSensei && editing.status !== 'cancelled' ? (
                <div className="grid gap-3 rounded-2xl border border-line p-3 md:grid-cols-2">
                  <div>
                    <p className="ui-label">Tukar Sensei</p>
                    <select className="ui-select" value={swapTo} onChange={(event) => setSwapTo(event.target.value)}>
                      <option value="">Pilih pengganti</option>
                      {allSensei
                        .filter((item) => item.id !== editing.senseiId && item.primaryStatus === 'ACTIVE')
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                    </select>
                    <select
                      className="ui-select mt-2"
                      value={swapInitiator}
                      onChange={(event) => setSwapInitiator(event.target.value as SwapInitiator)}
                    >
                      <option>Admin</option>
                      <option>Sensei</option>
                      <option>Student</option>
                    </select>
                    <Button
                      className="mt-2"
                      tone="primary"
                      disabled={!swapTo || !sessionForm.reason}
                      onClick={() => {
                        if (swapSensei(editing.id, swapTo, swapInitiator, sessionForm.reason)) {
                          setEditing(null);
                          setDetailMode('view');
                        }
                      }}
                    >
                      Simpan swap
                    </Button>
                  </div>
                  <div>
                    <p className="ui-label">Batalkan kelas</p>
                    <input
                      className="ui-input"
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                      placeholder="Alasan pembatalan"
                    />
                    <select
                      className="ui-select mt-2"
                      value={initiator}
                      onChange={(event) => setInitiator(event.target.value as CancellationInitiator)}
                    >
                      <option>Admin</option>
                      <option>Sensei</option>
                      <option>Student</option>
                      <option>Ops</option>
                    </select>
                    <label className="mt-2 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={replacementSecured}
                        onChange={(event) => setReplacementSecured(event.target.checked)}
                      />
                      Pengganti berhasil diamankan
                    </label>
                    <Button
                      className="mt-2"
                      tone="danger"
                      disabled={!cancelReason}
                      onClick={() => {
                        cancelClass(editing.id, { reason: cancelReason, initiator, replacementSecured });
                        setEditing(null);
                        setDetailMode('view');
                      }}
                    >
                      Batalkan kelas
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
