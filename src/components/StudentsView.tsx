import { useMemo, useState } from 'react';
import { ATTENDANCE_TONE, displayName } from '../lib/display';
import { useDashboardStore, usePermissions, useScopedData } from '../store/useDashboardStore';
import { Badge } from './ui/Badge';
import { StatCard } from './ui/StatCard';

export function StudentsView() {
  const permissions = usePermissions();
  const allSensei = useDashboardStore((state) => state.sensei);
  const { students, sessionReports, schedules } = useScopedData();
  const [selectedId, setSelectedId] = useState(students[0]?.id ?? '');
  const selected = students.find((item) => item.id === selectedId) ?? students[0];

  const history = useMemo(() => {
    if (!selected) return [];
    return sessionReports
      .flatMap((report) => {
        const record = report.students.find((item) => item.studentId === selected.id);
        const session = schedules.find((item) => item.id === report.scheduleId);
        if (!record || !session) return [];
        return [{ report, record, session }];
      })
      .sort((a, b) => b.session.date.localeCompare(a.session.date));
  }, [selected, sessionReports, schedules]);

  const attendanceRate = history.length
    ? history.filter((item) => item.record.attendance === 'Present' || item.record.attendance === 'Late').length / history.length
    : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="ui-card overflow-hidden">
        <div className="border-b border-[#efe4d2] px-4 py-3 font-bold">Siswa operasional</div>
        {students.map((student) => (
          <button
            key={student.id}
            onClick={() => setSelectedId(student.id)}
            className={`block w-full border-b border-[#efe4d2] px-4 py-3 text-left ${selectedId === student.id ? 'bg-orange-50' : 'bg-white'}`}
          >
            <div className="font-bold">{student.name}</div>
            <div className="text-xs text-ink-soft">{student.currentLevel} · {student.type}</div>
          </button>
        ))}
      </div>
      {selected ? (
        <div className="space-y-4">
          <div className="ui-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-extrabold">{selected.name}</h3>
                <p className="text-sm text-ink-soft">
                  Perjalanan: {selected.startingLevel} → {selected.currentLevel} · Sensei {displayName(allSensei, selected.senseiId)}
                </p>
              </div>
              <Badge tone={selected.isActive ? 'success' : 'muted'}>{selected.isActive ? 'Aktif belajar' : 'Tidak aktif'}</Badge>
            </div>
            <p className="mt-3 text-xs text-ink-soft">
              Data siswa di V3 hanya untuk operasional belajar. Pembayaran, churn, dan CRM tidak ditampilkan.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard label="Sesi tercatat" value={history.length} />
            <StatCard label="Hadir / terlambat" value={attendanceRate === null ? '—' : `${Math.round(attendanceRate * 100)}%`} hint="Kebijakan Late/Excused/Partial masih TBC Kyouiku" />
            <StatCard label="Level saat ini" value={selected.currentLevel} />
          </div>
          <div className="ui-card overflow-hidden">
            <div className="border-b border-[#efe4d2] px-4 py-3 font-bold">Riwayat sesi</div>
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
                    <td className="px-4 py-2">{session.date}</td>
                    <td className="px-4 py-2"><Badge tone={ATTENDANCE_TONE[record.attendance]}>{record.attendance}</Badge></td>
                    <td className="px-4 py-2">{record.performanceScore ?? '—'}</td>
                    <td className="px-4 py-2">{report.materialCovered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {permissions.canViewOwnQa ? (
              <p className="px-4 py-3 text-xs text-ink-soft">Sensei hanya melihat siswa di kelasnya sendiri.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
