import { useMemo, useState } from 'react';
import { ATTENDANCE_OPTIONS } from '../constants';
import { formatDateTime } from '../lib/dates';
import { ATTENDANCE_TONE, displayName, TYPE_TONE, WORKFLOW_TONE } from '../lib/display';
import { getSessionWorkflow, workflowLabel } from '../lib/session';
import { useDashboardStore, usePermissions, useScopedData } from '../store/useDashboardStore';
import type {
  AttendanceStatus,
  ClassSession,
  RecordingStatus,
  SessionLog,
  SessionReport,
  SessionWorkflowState,
  Student,
  StudentSessionRecord
} from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

export function TeachingView() {
  const permissions = usePermissions();
  const allStudents = useDashboardStore((state) => state.students);
  const allSensei = useDashboardStore((state) => state.sensei);
  const clockIn = useDashboardStore((state) => state.clockIn);
  const clockOut = useDashboardStore((state) => state.clockOut);
  const overrideClock = useDashboardStore((state) => state.overrideClock);
  const submitSessionReport = useDashboardStore((state) => state.submitSessionReport);
  const overrideAttendance = useDashboardStore((state) => state.overrideAttendance);
  const overridePerformance = useDashboardStore((state) => state.overridePerformance);
  const { schedules, sessionLogs, sessionReports, linkedSenseiId } = useScopedData();
  const [selected, setSelected] = useState<ClassSession | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [clockInAt, setClockInAt] = useState('');
  const [clockOutAt, setClockOutAt] = useState('');

  const rows = useMemo(
    () =>
      [...schedules]
        .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
        .map((session) => {
          const log = sessionLogs.find((item) => item.scheduleId === session.id);
          const report = sessionReports.find((item) => item.scheduleId === session.id);
          return {
            session,
            log,
            report,
            state: getSessionWorkflow(session, log, report)
          };
        }),
    [schedules, sessionLogs, sessionReports]
  );

  const selectedLog = selected ? sessionLogs.find((item) => item.scheduleId === selected.id) : undefined;
  const selectedReport = selected ? sessionReports.find((item) => item.scheduleId === selected.id) : undefined;
  const selectedState = selected ? getSessionWorkflow(selected, selectedLog, selectedReport) : 'ready';
  const canClock = Boolean(selected && permissions.canClockOwn && linkedSenseiId && linkedSenseiId === selected.senseiId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Alur Sensei: Jadwal → Clock In → Mengajar → Clock Out → Laporan Sesi. Absensi dan performa diisi per siswa, termasuk kelas Group/Semi-Private.
      </p>
      <div className="ui-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper/80 text-left text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Kelas</th>
              <th className="px-4 py-3">Sensei</th>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Clock</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ session, log, state }) => (
              <tr key={session.id} className="border-t border-[#efe4d2] hover:bg-white/70">
                <td className="px-4 py-3">
                  <button className="text-left" onClick={() => {
                    setSelected(session);
                    setClockInAt(log?.clockInAt?.slice(0, 16) ?? '');
                    setClockOutAt(log?.clockOutAt?.slice(0, 16) ?? '');
                    setOverrideReason('');
                  }}>
                    <div className="flex items-center gap-2">
                      <Badge tone={TYPE_TONE[session.type]}>{session.type}</Badge>
                      <span className="font-bold">{session.level}</span>
                    </div>
                    <div className="text-xs text-ink-soft">
                      {session.studentIds.map((id) => displayName(allStudents, id)).join(', ') || 'Tanpa siswa'}
                    </div>
                  </button>
                </td>
                <td className="px-4 py-3">{displayName(allSensei, session.senseiId)}</td>
                <td className="px-4 py-3">{session.date} · {session.startTime}–{session.endTime}</td>
                <td className="px-4 py-3"><Badge tone={WORKFLOW_TONE[state]}>{workflowLabel(state)}</Badge></td>
                <td className="px-4 py-3 text-xs">
                  {log?.clockInAt ? formatDateTime(log.clockInAt) : '—'}
                  {log?.lateJoin ? <div className="font-bold text-rose-700">Terlambat</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected ? (
        <SessionDrawer
          session={selected}
          state={selectedState}
          canOperate={canClock}
          canOverride={permissions.canOverrideClock || permissions.canOverrideAcademic}
          onClose={() => setSelected(null)}
          onClockIn={() => clockIn(selected.id)}
          onClockOut={() => clockOut(selected.id)}
          clockInAt={clockInAt}
          clockOutAt={clockOutAt}
          setClockInAt={setClockInAt}
          setClockOutAt={setClockOutAt}
          overrideReason={overrideReason}
          setOverrideReason={setOverrideReason}
          onOverrideClock={() => {
            if (!clockInAt || !overrideReason) return;
            overrideClock(selected.id, new Date(clockInAt).toISOString(), clockOutAt ? new Date(clockOutAt).toISOString() : null, overrideReason);
          }}
          report={selectedReport}
          log={selectedLog}
          students={allStudents}
          onSubmit={submitSessionReport}
          onOverrideAttendance={overrideAttendance}
          onOverridePerformance={overridePerformance}
          canInput={Boolean(permissions.canInputAttendance && linkedSenseiId && linkedSenseiId === selected.senseiId) || permissions.canOverrideAcademic}
        />
      ) : null}
    </div>
  );
}

function SessionDrawer(props: {
  session: ClassSession;
  state: SessionWorkflowState;
  canOperate: boolean;
  canOverride: boolean;
  onClose: () => void;
  onClockIn: () => void;
  onClockOut: () => void;
  clockInAt: string;
  clockOutAt: string;
  setClockInAt: (value: string) => void;
  setClockOutAt: (value: string) => void;
  overrideReason: string;
  setOverrideReason: (value: string) => void;
  onOverrideClock: () => void;
  report?: SessionReport;
  log?: SessionLog;
  students: Student[];
  onSubmit: (
    scheduleId: string,
    payload: {
      students: StudentSessionRecord[];
      materialCovered: string;
      levelProgress: string;
      sessionNotes?: string;
      recordingUrl?: string;
      recordingStatus: RecordingStatus;
    }
  ) => void;
  onOverrideAttendance: (reportId: string, studentId: string, attendance: AttendanceStatus, reason: string) => void;
  onOverridePerformance: (reportId: string, studentId: string, score: number, reason: string) => void;
  canInput: boolean;
}) {
  const [records, setRecords] = useState<StudentSessionRecord[]>(
    props.report?.students ??
      props.session.studentIds.map((studentId) => ({
        studentId,
        attendance: 'Present' as AttendanceStatus,
        performanceScore: 80,
        performanceNote: ''
      }))
  );
  const [materialCovered, setMaterialCovered] = useState(props.report?.materialCovered ?? '');
  const [levelProgress, setLevelProgress] = useState(props.report?.levelProgress ?? '');
  const [sessionNotes, setSessionNotes] = useState(props.report?.sessionNotes ?? '');
  const [recordingUrl, setRecordingUrl] = useState(props.report?.recordingUrl ?? '');
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>(props.report?.recordingStatus ?? 'Missing');
  const [academicReason, setAcademicReason] = useState('');

  return (
    <Modal
      wide
      title={`${props.session.level} · ${props.session.date} ${props.session.startTime}`}
      onClose={props.onClose}
      footer={<Button onClick={props.onClose}>Tutup</Button>}
    >
      <div className="flex flex-wrap gap-2">
        <Badge tone={WORKFLOW_TONE[props.state]}>{workflowLabel(props.state)}</Badge>
        {props.log?.lateJoin ? <Badge tone="danger">Late join</Badge> : null}
        {props.log?.overridden ? <Badge tone="gold">Clock override</Badge> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {props.canOperate && props.state === 'ready' ? <Button tone="primary" onClick={props.onClockIn}>Clock in</Button> : null}
        {props.canOperate && props.state === 'in_progress' ? <Button tone="primary" onClick={props.onClockOut}>Clock out</Button> : null}
      </div>
      {props.canOverride ? (
        <div className="grid gap-2 rounded-2xl border border-[#efe4d2] p-3 md:grid-cols-3">
          <input className="ui-input" type="datetime-local" value={props.clockInAt} onChange={(event) => props.setClockInAt(event.target.value)} />
          <input className="ui-input" type="datetime-local" value={props.clockOutAt} onChange={(event) => props.setClockOutAt(event.target.value)} />
          <input className="ui-input" placeholder="Alasan override" value={props.overrideReason} onChange={(event) => props.setOverrideReason(event.target.value)} />
          <Button className="md:col-span-3" onClick={props.onOverrideClock} disabled={!props.overrideReason}>Override clock-in/out</Button>
        </div>
      ) : null}

      <h4 className="font-bold">Laporan sesi</h4>
      {records.map((record, index) => (
        <div key={record.studentId} className="grid gap-2 rounded-2xl border border-[#efe4d2] p-3 md:grid-cols-4">
          <div className="font-semibold">{displayName(props.students, record.studentId)}</div>
          <select
            className="ui-select"
            value={record.attendance}
            disabled={!props.canInput}
            onChange={(event) => {
              const attendance = event.target.value as AttendanceStatus;
              const next = records.map((item, itemIndex) => (itemIndex === index ? { ...item, attendance } : item));
              setRecords(next);
            }}
          >
            {ATTENDANCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input
            className="ui-input"
            type="number"
            min={0}
            max={100}
            value={record.performanceScore ?? ''}
            disabled={!props.canInput}
            onChange={(event) => {
              const performanceScore = Number(event.target.value);
              setRecords(records.map((item, itemIndex) => (itemIndex === index ? { ...item, performanceScore } : item)));
            }}
          />
          <input
            className="ui-input"
            placeholder="Catatan performa"
            value={record.performanceNote ?? ''}
            disabled={!props.canInput}
            onChange={(event) => {
              const performanceNote = event.target.value;
              setRecords(records.map((item, itemIndex) => (itemIndex === index ? { ...item, performanceNote } : item)));
            }}
          />
          {record.attendance ? <Badge tone={ATTENDANCE_TONE[record.attendance]}>{record.attendance}</Badge> : null}
        </div>
      ))}
      <label>
        <span className="ui-label">Materi / topik</span>
        <input className="ui-input" value={materialCovered} disabled={!props.canInput} onChange={(event) => setMaterialCovered(event.target.value)} />
      </label>
      <label>
        <span className="ui-label">Progres level</span>
        <input className="ui-input" value={levelProgress} disabled={!props.canInput} onChange={(event) => setLevelProgress(event.target.value)} />
      </label>
      <label>
        <span className="ui-label">Catatan sesi</span>
        <textarea className="ui-textarea" value={sessionNotes} disabled={!props.canInput} onChange={(event) => setSessionNotes(event.target.value)} />
      </label>
      <div className="grid gap-2 md:grid-cols-2">
        <label>
          <span className="ui-label">Link rekaman</span>
          <input className="ui-input" value={recordingUrl} disabled={!props.canInput} onChange={(event) => setRecordingUrl(event.target.value)} />
        </label>
        <label>
          <span className="ui-label">Status rekaman</span>
          <select className="ui-select" value={recordingStatus} disabled={!props.canInput} onChange={(event) => setRecordingStatus(event.target.value as RecordingStatus)}>
            <option>Available</option>
            <option>Missing</option>
            <option>Not Required</option>
          </select>
        </label>
      </div>
      {props.canInput ? (
        <Button
          tone="primary"
          disabled={!materialCovered || props.state === 'ready' || props.state === 'in_progress' || props.state === 'cancelled'}
          onClick={() =>
            props.onSubmit(props.session.id, {
              students: records,
              materialCovered,
              levelProgress,
              sessionNotes,
              recordingUrl,
              recordingStatus
            })
          }
        >
          Simpan laporan sesi
        </Button>
      ) : null}
      {props.canOverride && props.report ? (
        <div className="rounded-2xl border border-[#efe4d2] p-3">
          <p className="ui-label">Koreksi akademik (audit)</p>
          <input className="ui-input" placeholder="Alasan koreksi" value={academicReason} onChange={(event) => setAcademicReason(event.target.value)} />
          <div className="mt-2 flex flex-wrap gap-2">
            {records.map((record) => (
              <Button
                key={`att-${record.studentId}`}
                disabled={!academicReason}
                onClick={() => props.onOverrideAttendance(props.report!.id, record.studentId, record.attendance, academicReason)}
              >
                Koreksi absensi {displayName(props.students, record.studentId)}
              </Button>
            ))}
            {records.map((record) => (
              <Button
                key={`score-${record.studentId}`}
                disabled={!academicReason || record.performanceScore == null}
                onClick={() => props.onOverridePerformance(props.report!.id, record.studentId, record.performanceScore ?? 0, academicReason)}
              >
                Koreksi nilai {displayName(props.students, record.studentId)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {props.state === 'ready' || props.state === 'in_progress' ? (
        <p className="text-xs text-ink-soft">Laporan hanya bisa dikirim setelah clock-out.</p>
      ) : null}
    </Modal>
  );
}
