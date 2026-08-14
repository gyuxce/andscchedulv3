import type { AppRole, AttendanceStatus, ClassType, TabId } from './types';

export const WEEKLY_HOUR_TARGET = 16;

export const CLASS_TYPES: ClassType[] = [
  'Private',
  'Semi-Private',
  'Group',
  'Kids Private',
  'Kids Semi Private'
];

export const CLASS_LEVELS = [
  'Intensif Pra Guntai',
  'Intensif N5',
  'Intensif N4',
  'Pra Guntai',
  'Guntai 1',
  'Guntai 2',
  'Guntai 3',
  'Guntai 4',
  'N5',
  'N4',
  'N3',
  'Custom Kaiwa',
  'Level 1 Kids',
  'Level 2 Kids'
];

export const DAYS_OF_WEEK = [
  { label: 'Senin', value: 1 },
  { label: 'Selasa', value: 2 },
  { label: 'Rabu', value: 3 },
  { label: 'Kamis', value: 4 },
  { label: 'Jumat', value: 5 },
  { label: 'Sabtu', value: 6 },
  { label: 'Minggu', value: 0 }
];

export const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'Present', label: 'Hadir' },
  { value: 'Late', label: 'Terlambat' },
  { value: 'Excused', label: 'Izin' },
  { value: 'Absent', label: 'Alpa' },
  { value: 'Partial', label: 'Parsial' }
];

export const TIME_SLOTS = Array.from({ length: 15 }, (_, index) => {
  const hour = index + 7;
  return `${String(hour).padStart(2, '0')}:00`;
});

export const ROLE_COPY: Record<AppRole, { title: string; subtitle: string }> = {
  'Super Admin': {
    title: 'Super Admin / Ops',
    subtitle: 'Kendali penuh jadwal resmi, override, dan pengguna'
  },
  Kyouiku: {
    title: 'Kyouiku / Head Sensei',
    subtitle: 'QA mengajar, rekaman, dan pengawasan akademik'
  },
  Sensei: {
    title: 'Sensei',
    subtitle: 'Ketersediaan, sesi mengajar, dan laporan kelas sendiri'
  }
};

export const NAV_BY_ROLE: Record<AppRole, TabId[]> = {
  'Super Admin': [
    'overview',
    'schedule',
    'availability',
    'teaching',
    'sensei',
    'students',
    'qa',
    'disciplinary',
    'audit',
    'users',
    'settings'
  ],
  Kyouiku: [
    'overview',
    'schedule',
    'availability',
    'teaching',
    'sensei',
    'students',
    'qa',
    'disciplinary',
    'audit'
  ],
  Sensei: ['overview', 'schedule', 'availability', 'teaching', 'students', 'qa', 'disciplinary']
};

export const TAB_LABELS: Record<TabId, string> = {
  overview: 'Action Center',
  schedule: 'Jadwal Resmi',
  availability: 'Ketersediaan',
  teaching: 'Sesi Mengajar',
  sensei: 'Sensei',
  students: 'Akademik Siswa',
  qa: 'QA & Rekaman',
  disciplinary: 'Disiplin',
  audit: 'Audit Log',
  users: 'Pengguna',
  settings: 'Pengaturan'
};
