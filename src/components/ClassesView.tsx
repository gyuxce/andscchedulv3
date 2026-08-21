import { useMemo, useState } from 'react';
import { CLASS_LEVELS, CLASS_MASTER_STATUSES, CLASS_TYPES, DAYS_OF_WEEK } from '../constants';
import { getClassHealth, getClassProgress } from '../lib/classProgress';
import { displayName, TYPE_TONE } from '../lib/display';
import { generateRecurringDates } from '../lib/recurring';
import { useDashboardStore, usePermissions, useScopedData } from '../store/useDashboardStore';
import type { ClassMaster, ClassMasterStatus, ClassType } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { DetailFields } from './ui/DetailFields';
import { Modal } from './ui/Modal';

const emptyForm = {
  displayName: '',
  code: '',
  type: 'Private' as ClassType,
  level: 'Guntai 1',
  senseiId: '',
  studentIds: [] as string[],
  requiredMeetings: 10,
  sessionDurationMinutes: 90,
  startDate: new Date().toISOString().slice(0, 10),
  plannedEndDate: '',
  meetLink: '',
  classroomLink: '',
  chatLink: '',
  materialLink: '',
  teachingNotes: '',
  status: 'draft' as ClassMasterStatus
};

export function ClassesView() {
  const permissions = usePermissions();
  const allSensei = useDashboardStore((state) => state.sensei);
  const allStudents = useDashboardStore((state) => state.students);
  const schedules = useDashboardStore((state) => state.schedules);
  const sessionReports = useDashboardStore((state) => state.sessionReports);
  const upsertClassMaster = useDashboardStore((state) => state.upsertClassMaster);
  const generateClassSchedule = useDashboardStore((state) => state.generateClassSchedule);
  const { classMasters } = useScopedData();
  const [editing, setEditing] = useState<ClassMaster | null>(null);
  const [creating, setCreating] = useState(false);
  const [detailMode, setDetailMode] = useState<'view' | 'edit'>('view');
  const [form, setForm] = useState(emptyForm);
  const [weekdays, setWeekdays] = useState<number[]>([1, 5]);
  const [genStartTime, setGenStartTime] = useState('19:00');

  const openCreate = () => {
    setForm({
      ...emptyForm,
      senseiId: allSensei.find((item) => item.primaryStatus === 'ACTIVE')?.id ?? ''
    });
    setCreating(true);
    setEditing(null);
    setDetailMode('edit');
  };

  const openDetail = (item: ClassMaster) => {
    setEditing(item);
    setCreating(false);
    setDetailMode('view');
    setForm({
      displayName: item.displayName,
      code: item.code ?? '',
      type: item.type,
      level: item.level,
      senseiId: item.senseiId,
      studentIds: item.studentIds,
      requiredMeetings: item.requiredMeetings,
      sessionDurationMinutes: item.sessionDurationMinutes,
      startDate: item.startDate ?? new Date().toISOString().slice(0, 10),
      plannedEndDate: item.plannedEndDate ?? '',
      meetLink: item.meetLink ?? '',
      classroomLink: item.classroomLink ?? '',
      chatLink: item.chatLink ?? '',
      materialLink: item.materialLink ?? '',
      teachingNotes: item.teachingNotes ?? '',
      status: item.status
    });
  };

  const previewDates = useMemo(
    () => generateRecurringDates(form.startDate, weekdays, form.requiredMeetings).slice(0, 8),
    [form.startDate, weekdays, form.requiredMeetings]
  );

  const save = () => {
    const id = upsertClassMaster({
      id: editing?.id,
      displayName: form.displayName,
      code: form.code || null,
      type: form.type,
      level: form.level,
      senseiId: form.senseiId,
      studentIds: form.studentIds,
      requiredMeetings: form.requiredMeetings,
      sessionDurationMinutes: form.sessionDurationMinutes,
      startDate: form.startDate || null,
      plannedEndDate: form.plannedEndDate || null,
      meetLink: form.meetLink || null,
      classroomLink: form.classroomLink || null,
      chatLink: form.chatLink || null,
      materialLink: form.materialLink || null,
      teachingNotes: form.teachingNotes || null,
      status: form.status
    });
    if (id) {
      setCreating(false);
      setEditing(null);
      setDetailMode('view');
    }
  };

  const canEdit = permissions.canEditOfficialSchedule;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-ink-soft">
          Class Master adalah wadah kelas (level, siswa, required meetings, resources). Generate jadwal berulang
          membuat sesi kalender; progress memakai Session X of X.
        </p>
        {canEdit ? (
          <Button tone="primary" className="w-full sm:w-auto" onClick={openCreate}>
            Tambah Class Master
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {classMasters.map((item) => {
          const progress = getClassProgress(item, schedules, sessionReports);
          const health = getClassHealth(item, schedules, sessionReports);
          return (
            <button key={item.id} className="ui-card p-4 text-left transition hover:border-maple/35 hover:bg-elevated/40" onClick={() => openDetail(item)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-extrabold text-ink">{item.displayName}</h3>
                  <p className="text-xs text-ink-soft">
                    {item.code ? `${item.code} · ` : ''}
                    {displayName(allSensei, item.senseiId)} · {item.studentIds.length} siswa
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  <Badge tone={TYPE_TONE[item.type]}>{item.type}</Badge>
                  <Badge>{item.status}</Badge>
                </div>
              </div>
              <p className="mt-2 text-sm font-semibold">{item.level}</p>
              <p className="mt-1 text-sm text-ink-soft">
                Sesi {progress.completed}/{progress.required}
                {progress.calendarCount ? ` · kalender ${progress.calendarCount}` : ''}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                Original end {item.plannedEndDate || '—'} · Projected {item.projectedEndDate || '—'}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                Health: {health.status.replace('_', ' ')} — {health.detail}
              </p>
            </button>
          );
        })}
        {classMasters.length === 0 ? (
          <p className="text-sm text-ink-soft">Belum ada Class Master. Super Admin bisa menambah lalu generate jadwal.</p>
        ) : null}
      </div>

      {(creating || editing) && (
        <Modal
          wide
          title={creating ? 'Class Master baru' : editing?.displayName || 'Class Master'}
          onClose={() => {
            setCreating(false);
            setEditing(null);
            setDetailMode('view');
          }}
          footer={
            <>
              <Button
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                  setDetailMode('view');
                }}
              >
                Tutup
              </Button>
              {editing && detailMode === 'view' && canEdit ? (
                <Button tone="primary" onClick={() => setDetailMode('edit')}>
                  Ubah
                </Button>
              ) : null}
              {(creating || detailMode === 'edit') && canEdit ? (
                <>
                  {editing && detailMode === 'edit' ? (
                    <Button onClick={() => openDetail(editing)}>Batal ubah</Button>
                  ) : null}
                  <Button tone="primary" onClick={save}>
                    Simpan
                  </Button>
                </>
              ) : null}
            </>
          }
        >
          {editing && detailMode === 'view' ? (
            <DetailFields
              items={[
                { label: 'Nama tampilan', value: form.displayName },
                { label: 'Kode kelas', value: form.code || '—' },
                { label: 'Tipe', value: form.type },
                { label: 'Level', value: form.level },
                { label: 'Sensei', value: displayName(allSensei, form.senseiId) },
                {
                  label: 'Status',
                  value: CLASS_MASTER_STATUSES.find((item) => item.value === form.status)?.label || form.status
                },
                { label: 'Required meetings', value: String(form.requiredMeetings) },
                { label: 'Durasi sesi', value: `${form.sessionDurationMinutes} menit` },
                { label: 'Start date', value: form.startDate || '—' },
                { label: 'Planned end', value: form.plannedEndDate || '—' },
                {
                  label: 'Siswa',
                  value:
                    form.studentIds.map((id) => displayName(allStudents, id)).join(', ') || '—',
                  full: true
                },
                { label: 'Google Meet', value: form.meetLink || '—', full: true },
                { label: 'Classroom', value: form.classroomLink || '—', full: true },
                { label: 'Chat', value: form.chatLink || '—', full: true },
                { label: 'Material', value: form.materialLink || '—', full: true },
                { label: 'Catatan mengajar', value: form.teachingNotes || '—', full: true }
              ]}
            />
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className="ui-label">Nama tampilan</span>
                  <input className="ui-input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
                </label>
                <label>
                  <span className="ui-label">Kode kelas</span>
                  <input className="ui-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                </label>
                <label>
                  <span className="ui-label">Tipe</span>
                  <select className="ui-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ClassType })}>
                    {CLASS_TYPES.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="ui-label">Level</span>
                  <select className="ui-select" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                    {CLASS_LEVELS.map((level) => (
                      <option key={level}>{level}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="ui-label">Sensei</span>
                  <select className="ui-select" value={form.senseiId} onChange={(e) => setForm({ ...form, senseiId: e.target.value })}>
                    {allSensei.filter((item) => item.primaryStatus === 'ACTIVE').map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="ui-label">Status operasional</span>
                  <select className="ui-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClassMasterStatus })}>
                    {CLASS_MASTER_STATUSES.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="ui-label">Required meetings</span>
                  <input className="ui-input" type="number" min={1} value={form.requiredMeetings} onChange={(e) => setForm({ ...form, requiredMeetings: Number(e.target.value) })} />
                </label>
                <label>
                  <span className="ui-label">Durasi sesi (menit)</span>
                  <input className="ui-input" type="number" min={30} step={15} value={form.sessionDurationMinutes} onChange={(e) => setForm({ ...form, sessionDurationMinutes: Number(e.target.value) })} />
                </label>
                <label>
                  <span className="ui-label">Start date</span>
                  <input className="ui-input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </label>
                <label>
                  <span className="ui-label">Planned end date</span>
                  <input className="ui-input" type="date" value={form.plannedEndDate} onChange={(e) => setForm({ ...form, plannedEndDate: e.target.value })} />
                </label>
              </div>

              <label>
                <span className="ui-label">Siswa</span>
                <select
                  multiple
                  className="ui-select h-28"
                  value={form.studentIds}
                  onChange={(e) => setForm({ ...form, studentIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}
                >
                  {allStudents.map((student) => (
                    <option key={student.id} value={student.id}>{student.name}</option>
                  ))}
                </select>
                {form.type === 'Semi-Private' ? (
                  <p className="mt-1 text-xs text-ink-soft">Semi-Private: sistem mengharapkan 2–4 siswa.</p>
                ) : null}
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className="ui-label">Google Meet / room</span>
                  <input className="ui-input" value={form.meetLink} onChange={(e) => setForm({ ...form, meetLink: e.target.value })} />
                </label>
                <label>
                  <span className="ui-label">Google Classroom</span>
                  <input className="ui-input" value={form.classroomLink} onChange={(e) => setForm({ ...form, classroomLink: e.target.value })} />
                </label>
                <label>
                  <span className="ui-label">Chat link</span>
                  <input className="ui-input" value={form.chatLink} onChange={(e) => setForm({ ...form, chatLink: e.target.value })} />
                </label>
                <label>
                  <span className="ui-label">Material link</span>
                  <input className="ui-input" value={form.materialLink} onChange={(e) => setForm({ ...form, materialLink: e.target.value })} />
                </label>
              </div>
              <label>
                <span className="ui-label">Catatan mengajar</span>
                <textarea className="ui-input min-h-20" value={form.teachingNotes} onChange={(e) => setForm({ ...form, teachingNotes: e.target.value })} />
              </label>

              {editing ? (
                <div className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-500/30 dark:bg-sky-500/10">
                  <p className="font-bold text-ink">Generate jadwal berulang</p>
                  <p className="text-xs text-ink-soft">
                    Membuat {form.requiredMeetings} sesi kalender dari start date + hari dipilih. Cancel/makeup tidak mengubah target required meetings.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const active = weekdays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${active ? 'bg-maple text-white' : 'bg-surface text-ink border border-line'}`}
                          onClick={() =>
                            setWeekdays((current) =>
                              current.includes(day.value) ? current.filter((v) => v !== day.value) : [...current, day.value]
                            )
                          }
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  <label className="block max-w-[160px]">
                    <span className="ui-label">Jam mulai</span>
                    <input className="ui-input" type="time" value={genStartTime} onChange={(e) => setGenStartTime(e.target.value)} />
                  </label>
                  {previewDates.length ? (
                    <p className="text-xs text-ink-soft">
                      Preview: {previewDates.join(', ')}
                      {form.requiredMeetings > previewDates.length ? '…' : ''}
                    </p>
                  ) : null}
                  <Button
                    tone="primary"
                    onClick={() => {
                      const savedId =
                        upsertClassMaster({
                          id: editing.id,
                          displayName: form.displayName,
                          code: form.code || null,
                          type: form.type,
                          level: form.level,
                          senseiId: form.senseiId,
                          studentIds: form.studentIds,
                          requiredMeetings: form.requiredMeetings,
                          sessionDurationMinutes: form.sessionDurationMinutes,
                          startDate: form.startDate || null,
                          plannedEndDate: form.plannedEndDate || null,
                          meetLink: form.meetLink || null,
                          classroomLink: form.classroomLink || null,
                          chatLink: form.chatLink || null,
                          materialLink: form.materialLink || null,
                          teachingNotes: form.teachingNotes || null,
                          status: form.status
                        }) || editing.id;
                      generateClassSchedule({
                        classId: savedId,
                        startDate: form.startDate,
                        weekdays,
                        startTime: genStartTime
                      });
                    }}
                  >
                    Generate {form.requiredMeetings} sesi
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
