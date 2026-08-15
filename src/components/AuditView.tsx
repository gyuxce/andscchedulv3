import { formatDateTime } from '../lib/dates';
import { displayName } from '../lib/display';
import { useDashboardStore } from '../store/useDashboardStore';
import { Badge } from './ui/Badge';

const ACTION_LABELS: Record<string, string> = {
  create_class: 'Membuat kelas resmi',
  create_makeup_class: 'Membuat makeup class',
  create_class_master: 'Membuat Class Master',
  update_class_master: 'Mengubah Class Master',
  generate_class_schedule: 'Generate jadwal berulang',
  complete_level: 'Menandai level selesai',
  update_sensei_timezone: 'Mengubah timezone Sensei',
  update_app_settings: 'Mengubah pengaturan',
  edit_class: 'Mengubah kelas resmi',
  cancel_class: 'Membatalkan kelas',
  swap_sensei: 'Menukar Sensei',
  override_clock: 'Override clock-in/out',
  override_attendance: 'Koreksi absensi',
  override_performance: 'Koreksi nilai performa',
  override_qa_score: 'Koreksi skor QA',
  override_sensei_status: 'Mengubah status Sensei',
  create_sensei: 'Tambah Sensei',
  update_sensei: 'Ubah Sensei',
  set_sensei_leave: 'Set CUTI Sensei',
  clear_sensei_leave: 'Hapus CUTI Sensei',
  create_student: 'Tambah siswa',
  update_student: 'Ubah siswa',
  create_enrollment: 'Tambah enrollment',
  update_enrollment: 'Ubah enrollment'
};

const ENTITY_LABELS: Record<string, string> = {
  schedules: 'Jadwal resmi',
  session_logs: 'Clock sesi',
  session_reports: 'Laporan sesi',
  teaching_qa: 'Teaching Performance',
  sensei: 'Master Sensei',
  sensei_status: 'Status Sensei',
  sensei_availability: 'Ketersediaan',
  students: 'Master siswa',
  enrollments: 'Enrollment'
};

const FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  senseiId: 'Sensei',
  studentIds: 'Siswa',
  groupId: 'Grup',
  type: 'Tipe kelas',
  level: 'Level',
  date: 'Tanggal',
  startTime: 'Mulai',
  endTime: 'Selesai',
  status: 'Status',
  cancellationReason: 'Alasan batal',
  cancellationInitiator: 'Initiator batal',
  replacementSecured: 'Pengganti diamankan',
  originalSenseiId: 'Sensei asli',
  swapInitiator: 'Initiator swap',
  swapReason: 'Alasan swap',
  clockInAt: 'Clock-in',
  clockOutAt: 'Clock-out',
  lateJoin: 'Terlambat',
  overridden: 'Di-override',
  attendance: 'Absensi',
  performanceScore: 'Nilai',
  score: 'Skor QA',
  primaryStatus: 'Status utama',
  updatedAt: 'Diperbarui',
  updatedBy: 'Diperbarui oleh'
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  Present: 'Hadir',
  Late: 'Terlambat',
  Excused: 'Izin',
  Absent: 'Alpa',
  Partial: 'Parsial',
  ACTIVE: 'Aktif',
  INACTIVE: 'Tidak aktif'
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] || action.replaceAll('_', ' ');
}

function entityLabel(entity: string) {
  return ENTITY_LABELS[entity] || entity;
}

function formatValue(
  value: unknown,
  lookups: {
    sensei: Array<{ id: string; name: string }>;
    students: Array<{ id: string; name: string }>;
  },
  field?: string
): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  if (Array.isArray(value)) {
    if (field === 'studentIds') {
      return value.length
        ? value.map((id) => displayName(lookups.students, String(id))).join(', ')
        : '—';
    }
    return value.length ? value.map(String).join(', ') : '—';
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const preferred = ['level', 'type', 'date', 'startTime', 'endTime', 'status', 'senseiId', 'score', 'attendance'];
    const parts = preferred
      .filter((key) => record[key] != null && record[key] !== '')
      .map((key) => `${FIELD_LABELS[key] || key}: ${formatValue(record[key], lookups, key)}`);
    if (parts.length) return parts.join(' · ');
    return Object.entries(record)
      .filter(([key]) => !['id', 'updatedAt', 'updatedBy', 'studentIds'].includes(key))
      .slice(0, 6)
      .map(([key, val]) => `${FIELD_LABELS[key] || key}: ${formatValue(val, lookups, key)}`)
      .join(' · ');
  }

  const text = String(value);
  if (field === 'senseiId' || field === 'originalSenseiId') {
    return displayName(lookups.sensei, text);
  }
  if (STATUS_LABELS[text]) return STATUS_LABELS[text];
  return text;
}

function summarizeChange(
  oldValue: unknown,
  newValue: unknown,
  lookups: {
    sensei: Array<{ id: string; name: string }>;
    students: Array<{ id: string; name: string }>;
  }
): string[] {
  if (oldValue == null && newValue != null && typeof newValue === 'object' && !Array.isArray(newValue)) {
    return [`Data baru: ${formatValue(newValue, lookups)}`];
  }

  if (
    oldValue != null &&
    newValue != null &&
    typeof oldValue === 'object' &&
    typeof newValue === 'object' &&
    !Array.isArray(oldValue) &&
    !Array.isArray(newValue)
  ) {
    const before = oldValue as Record<string, unknown>;
    const after = newValue as Record<string, unknown>;
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter(
      (key) => !['id', 'updatedAt', 'updatedBy'].includes(key)
    );
    const lines = keys
      .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
      .map(
        (key) =>
          `${FIELD_LABELS[key] || key}: ${formatValue(before[key], lookups, key)} → ${formatValue(after[key], lookups, key)}`
      );
    return lines.length ? lines : ['Tidak ada detail field yang berubah'];
  }

  if (oldValue != null || newValue != null) {
    return [`${formatValue(oldValue, lookups)} → ${formatValue(newValue, lookups)}`];
  }

  return ['—'];
}

export function AuditView() {
  const logs = useDashboardStore((state) => state.auditLogs);
  const sensei = useDashboardStore((state) => state.sensei);
  const students = useDashboardStore((state) => state.students);
  const lookups = { sensei, students };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Koreksi sensitif wajib punya jejak: nilai lama, nilai baru, pelaku, waktu, dan alasan. Soft-delete/archive
        dipakai, bukan hapus permanen.
      </p>
      <div className="ui-card overflow-hidden">
        <div className="ui-table-wrap">
        <table className="w-full text-sm">
          <thead className="bg-paper/80 text-left text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Pelaku</th>
              <th className="px-4 py-3">Aktivitas</th>
              <th className="px-4 py-3">Alasan</th>
              <th className="px-4 py-3">Ringkasan perubahan</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-ink-soft" colSpan={5}>
                  Belum ada jejak audit.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-t border-[#efe4d2] align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3">{log.actorName}</td>
                  <td className="px-4 py-3">
                    <Badge tone="sky">{actionLabel(log.action)}</Badge>
                    <div className="mt-1 text-xs text-ink-soft">{entityLabel(log.entity)}</div>
                  </td>
                  <td className="px-4 py-3">{log.reason || '—'}</td>
                  <td className="px-4 py-3">
                    <ul className="space-y-1 text-xs leading-relaxed text-ink-soft">
                      {summarizeChange(log.oldValue, log.newValue, lookups).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
