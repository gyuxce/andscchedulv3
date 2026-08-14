import { useMemo, useState } from 'react';
import { CLASS_LEVELS } from '../constants';
import { ATTENDANCE_TONE, displayName } from '../lib/display';
import { filterAcademicReportRows, isMakeupSession, makeupLabel } from '../lib/makeup';
import { useDashboardStore, usePermissions, useScopedData } from '../store/useDashboardStore';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { StatCard } from './ui/StatCard';

export function StudentsView() {
  const permissions = usePermissions();
  const allSensei = useDashboardStore((state) => state.sensei);
  const levelCompletions = useDashboardStore((state) => state.levelCompletions);
  const enrollments = useDashboardStore((state) => state.enrollments);
  const completeLevel = useDashboardStore((state) => state.completeLevel);
  const { students, sessionReports, schedules } = useScopedData();
  const [selectedId, setSelectedId] = useState(students[0]?.id ?? '');
  const selected = students.find((item) => item.id === selectedId) ?? students[0];
  const [nextLevel, setNextLevel] = useState('');
  const [notes, setNotes] = useState('');

  const history = useMemo(() => {
    if (!selected) return [];
    const rows = sessionReports
      .flatMap((report) => {
        const record = report.students.find((item) => item.studentId === selected.id);
        const session = schedules.find((item) => item.id === report.scheduleId);
        if (!record || !session) return [];
        return [{ report, record, session }];
      })
      .sort((a, b) => b.session.date.localeCompare(a.session.date));
    return filterAcademicReportRows(rows, schedules);
  }, [selected, sessionReports, schedules]);

  const attendanceRate = history.length
    ? history.filter((item) => item.record.attendance === 'Present' || item.record.attendance === 'Late').length /
      history.length
    : null;

  const studentCompletions = selected
    ? levelCompletions.filter((item) => item.studentId === selected.id)
    : [];
  const currentLevelCompleted = selected
    ? studentCompletions.some((item) => item.level === selected.currentLevel)
    : false;

  const studentEnrollments = useMemo(() => {
    if (!selected) return [];
    return enrollments
      .filter((item) => item.studentId === selected.id)
      .sort((a, b) => {
        const aKey = a.startDate || a.updatedAt || '';
        const bKey = b.startDate || b.updatedAt || '';
        return bKey.localeCompare(aKey);
      });
  }, [enrollments, selected]);

  const activeEnrollment = studentEnrollments.find((item) => item.status === 'active');
  const learningHistory = studentEnrollments.filter((item) => item.status !== 'active');

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="ui-card max-h-64 overflow-hidden lg:max-h-none">
        <div className="border-b border-[#efe4d2] px-4 py-3 font-bold">Siswa operasional</div>
        <div className="max-h-52 overflow-y-auto lg:max-h-[calc(100dvh-10rem)]">
        {students.map((student) => (
          <button
            key={student.id}
            onClick={() => {
              setSelectedId(student.id);
              setNextLevel('');
              setNotes('');
            }}
            className={`block w-full border-b border-[#efe4d2] px-4 py-3 text-left ${selectedId === student.id ? 'bg-orange-50' : 'bg-white'}`}
          >
            <div className="font-bold">{student.name}</div>
            <div className="text-xs text-ink-soft">{student.currentLevel} · {student.type}</div>
          </button>
        ))}
        </div>
      </div>
      {selected ? (
        <div className="space-y-4">
          <div className="ui-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-extrabold sm:text-2xl">{selected.name}</h3>
                <p className="text-sm text-ink-soft">
                  Perjalanan: {selected.startingLevel} → {selected.currentLevel} · Sensei{' '}
                  {displayName(allSensei, selected.senseiId)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentLevelCompleted ? <Badge tone="success">Level completed</Badge> : null}
                <Badge tone={selected.isActive ? 'success' : 'muted'}>
                  {selected.isActive ? 'Aktif belajar' : 'Tidak aktif'}
                </Badge>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-soft">
              Enrollment disimpan per level (history tidak di-overwrite). Makeup tidak dihitung dobel di riwayat sesi.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard label="Sesi tercatat" value={history.length} hint="Sesi batal yang sudah punya makeup tidak dihitung" />
            <StatCard
              label="Hadir / terlambat"
              value={attendanceRate === null ? '—' : `${Math.round(attendanceRate * 100)}%`}
              hint="Kebijakan Late/Excused/Partial masih TBC Kyouiku"
            />
            <StatCard label="Level saat ini" value={activeEnrollment?.level || selected.currentLevel} />
          </div>

          <div className="ui-card p-4">
            <p className="font-bold text-ink">Current Learning</p>
            {activeEnrollment ? (
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="success">{activeEnrollment.status}</Badge>
                  <span className="font-semibold">{activeEnrollment.level}</span>
                  {activeEnrollment.classType ? <span className="text-ink-soft">· {activeEnrollment.classType}</span> : null}
                </div>
                <p className="text-xs text-ink-soft">
                  Mulai {activeEnrollment.startDate || '—'}
                  {activeEnrollment.senseiId ? ` · Sensei ${displayName(allSensei, activeEnrollment.senseiId)}` : ''}
                </p>
                {activeEnrollment.notes ? <p className="text-xs text-ink-soft">{activeEnrollment.notes}</p> : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">
                Belum ada enrollment aktif. Buat Class Master atau complete level dengan naik level untuk membuka journey baru.
              </p>
            )}
          </div>

          {learningHistory.length > 0 ? (
            <div className="ui-card overflow-hidden">
              <div className="border-b border-[#efe4d2] px-4 py-3 font-bold">Learning History</div>
              <ul className="divide-y divide-[#efe4d2] text-sm">
                {learningHistory.map((item) => (
                  <li key={item.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={item.status === 'completed' ? 'success' : 'muted'}>{item.status}</Badge>
                      <span className="font-semibold">{item.level}</span>
                      {item.classType ? <span className="text-ink-soft">· {item.classType}</span> : null}
                    </div>
                    <div className="text-xs text-ink-soft">
                      {item.startDate || '—'} → {item.endDate || '—'}
                      {item.notes ? ` · ${item.notes}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {permissions.canOverrideAcademic ? (
            <div className="ui-card space-y-3 p-4">
              <div>
                <p className="font-bold text-ink">Tandai level selesai</p>
                <p className="text-xs text-ink-soft">
                  Menutup enrollment level saat ini dan (opsional) membuka enrollment level baru — history tetap tersimpan.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <div>
                  <p className="ui-label">Level yang diselesaikan</p>
                  <input className="ui-input" value={selected.currentLevel} disabled />
                </div>
                <label>
                  <span className="ui-label">Naik ke level (opsional)</span>
                  <select
                    className="ui-select"
                    value={nextLevel}
                    onChange={(event) => setNextLevel(event.target.value)}
                  >
                    <option value="">Tetap di level ini</option>
                    {CLASS_LEVELS.filter((level) => level !== selected.currentLevel).map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <Button
                    tone="primary"
                    className="w-full md:w-auto"
                    disabled={currentLevelCompleted}
                    onClick={() => {
                      const ok = completeLevel({
                        studentId: selected.id,
                        level: selected.currentLevel,
                        nextLevel: nextLevel || null,
                        notes: notes || undefined
                      });
                      if (ok) {
                        setNotes('');
                        setNextLevel('');
                      }
                    }}
                  >
                    Complete level
                  </Button>
                </div>
              </div>
              <input
                className="ui-input"
                placeholder="Catatan akademik (opsional)"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          ) : null}

          {studentCompletions.length > 0 ? (
            <div className="ui-card overflow-hidden">
              <div className="border-b border-[#efe4d2] px-4 py-3 font-bold">Riwayat level completed</div>
              <ul className="divide-y divide-[#efe4d2] text-sm">
                {studentCompletions.map((item) => (
                  <li key={item.id} className="px-4 py-3">
                    <div className="font-semibold">
                      {item.level}
                      {item.nextLevel ? ` → ${item.nextLevel}` : ''}
                    </div>
                    <div className="text-xs text-ink-soft">
                      {item.completedAt.slice(0, 10)}
                      {item.notes ? ` · ${item.notes}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="ui-card overflow-hidden">
            <div className="border-b border-[#efe4d2] px-4 py-3 font-bold">Riwayat sesi</div>
            <div className="ui-table-wrap">
            <table className="w-full text-sm">
              <thead className="bg-paper/70 text-left text-xs uppercase text-ink-soft">
                <tr>
                  <th className="px-4 py-2">Tanggal</th>
                  <th className="px-4 py-2">Absensi</th>
                  <th className="px-4 py-2">Nilai</th>
                  <th className="px-4 py-2">Materi</th>
                </tr>
              </thead>
              <tbody>
                {history.map(({ report, record, session }) => (
                  <tr key={report.id} className="border-t border-[#efe4d2]">
                    <td className="px-4 py-2">
                      <div>{session.date}</div>
                      {isMakeupSession(session) ? (
                        <div className="text-[11px] text-sky-700">{makeupLabel(session, schedules)}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={ATTENDANCE_TONE[record.attendance]}>{record.attendance}</Badge>
                    </td>
                    <td className="px-4 py-2">{record.performanceScore ?? '—'}</td>
                    <td className="px-4 py-2">{report.materialCovered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {permissions.canViewOwnQa ? (
              <p className="px-4 py-3 text-xs text-ink-soft">Sensei hanya melihat siswa di kelasnya sendiri.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
