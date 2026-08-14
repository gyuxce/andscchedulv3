import { addDays, format, startOfWeek, subDays, subMonths } from 'date-fns';
import type { DashboardSnapshot } from '../types';
import { WEEKLY_HOUR_TARGET } from '../constants';

function dateOffset(days: number, from = new Date()) {
  return format(addDays(from, days), 'yyyy-MM-dd');
}

export function createSeedData(now = new Date()): DashboardSnapshot {
  const today = format(now, 'yyyy-MM-dd');
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  const week = (offset: number) => format(addDays(monday, offset), 'yyyy-MM-dd');
  const lastMonth = format(subMonths(now, 1), 'yyyy-MM');
  const thisMonth = format(now, 'yyyy-MM');

  return {
    settings: {
      lateGraceMinutes: 0,
      minAttendancePercent: null,
      weeklyHourTarget: WEEKLY_HOUR_TARGET
    },
    users: [
      {
        id: 'user-admin',
        name: 'Sakura Ops',
        email: 'ops@akinosora.co',
        role: 'Super Admin',
        status: 'Approved'
      },
      {
        id: 'user-kyouiku',
        name: 'Mei Kyouiku',
        email: 'kyouiku@akinosora.co',
        role: 'Kyouiku',
        status: 'Approved'
      },
      {
        id: 'user-yuki',
        name: 'Yuki Tanaka',
        email: 'yuki.tanaka@akinosora.co',
        role: 'Sensei',
        status: 'Approved',
        senseiId: 'sensei-yuki'
      },
      {
        id: 'user-kenji',
        name: 'Kenji Sato',
        email: 'kenji.sato@akinosora.co',
        role: 'Sensei',
        status: 'Approved',
        senseiId: 'sensei-kenji'
      }
    ],
    sensei: [
      {
        id: 'sensei-yuki',
        name: 'Yuki Tanaka',
        email: 'yuki.tanaka@akinosora.co',
        phone: '0812-1000-1001',
        levels: ['Guntai 1', 'Guntai 2', 'N5'],
        primaryStatus: 'ACTIVE',
        joinDate: format(subDays(now, 18), 'yyyy-MM-dd'),
        timezone: 'Asia/Jakarta',
        notes: 'Sensei baru, onboarding Q3'
      },
      {
        id: 'sensei-kenji',
        name: 'Kenji Sato',
        email: 'kenji.sato@akinosora.co',
        phone: '0812-1000-1002',
        levels: ['Guntai 3', 'N4', 'Custom Kaiwa'],
        primaryStatus: 'ACTIVE',
        joinDate: '2023-04-12',
        timezone: 'Asia/Jakarta'
      },
      {
        id: 'sensei-aiko',
        name: 'Aiko Nakamura',
        email: 'aiko.nakamura@akinosora.co',
        phone: '0812-1000-1003',
        levels: ['N5', 'Pra Guntai'],
        primaryStatus: 'ACTIVE',
        joinDate: '2022-11-01',
        timezone: 'Asia/Jakarta'
      },
      {
        id: 'sensei-rina',
        name: 'Rina Wijaya',
        email: 'rina.wijaya@akinosora.co',
        phone: '0812-1000-1004',
        levels: ['Kids Private', 'Level 1 Kids'],
        primaryStatus: 'ACTIVE',
        joinDate: '2024-09-01',
        timezone: 'Asia/Jakarta'
      },
      {
        id: 'sensei-hiroshi',
        name: 'Hiroshi Yamamoto',
        email: 'hiroshi.yamamoto@akinosora.co',
        phone: '0812-1000-1005',
        levels: ['N3'],
        primaryStatus: 'INACTIVE',
        joinDate: '2021-02-10',
        timezone: 'Asia/Jakarta',
        notes: 'Kontrak berakhir, data historis dipertahankan'
      }
    ],
    students: [
      {
        id: 'stu-andi',
        name: 'Andi Pratama',
        email: 'andi@example.com',
        type: 'Private',
        currentLevel: 'Guntai 2',
        startingLevel: 'Guntai 1',
        senseiId: 'sensei-yuki',
        isActive: true
      },
      {
        id: 'stu-sari',
        name: 'Sari Dewi',
        email: 'sari@example.com',
        type: 'Private',
        currentLevel: 'Guntai 1',
        startingLevel: 'Pra Guntai',
        senseiId: 'sensei-yuki',
        isActive: true
      },
      {
        id: 'stu-bima',
        name: 'Bima Nugraha',
        type: 'Semi-Private',
        currentLevel: 'N5',
        startingLevel: 'N5',
        senseiId: 'sensei-kenji',
        isActive: true
      },
      {
        id: 'stu-lina',
        name: 'Lina Kusuma',
        type: 'Semi-Private',
        currentLevel: 'N5',
        startingLevel: 'N5',
        senseiId: 'sensei-kenji',
        isActive: true
      },
      {
        id: 'stu-reza',
        name: 'Reza Mahendra',
        type: 'Group',
        currentLevel: 'Custom Kaiwa',
        startingLevel: 'Custom Kaiwa',
        senseiId: 'sensei-kenji',
        isActive: true
      },
      {
        id: 'stu-nina',
        name: 'Nina Putri',
        type: 'Group',
        currentLevel: 'Custom Kaiwa',
        startingLevel: 'Custom Kaiwa',
        senseiId: 'sensei-kenji',
        isActive: true
      },
      {
        id: 'stu-faro',
        name: 'Faro Aditya',
        type: 'Group',
        currentLevel: 'Custom Kaiwa',
        startingLevel: 'Custom Kaiwa',
        senseiId: 'sensei-kenji',
        isActive: true
      },
      {
        id: 'stu-mio',
        name: 'Mio Hartono',
        type: 'Kids Private',
        currentLevel: 'Level 1 Kids',
        startingLevel: 'Level 1 Kids',
        senseiId: 'sensei-aiko',
        isActive: true
      }
    ],
    groups: [
      {
        id: 'group-kaiwa',
        name: 'Kaiwa Senja',
        studentIds: ['stu-reza', 'stu-nina', 'stu-faro'],
        level: 'Custom Kaiwa'
      },
      {
        id: 'group-n5',
        name: 'N5 Semi',
        studentIds: ['stu-bima', 'stu-lina'],
        level: 'N5'
      }
    ],
    availability: [
      {
        id: 'av-yuki-1',
        senseiId: 'sensei-yuki',
        pattern: 'weekly',
        weekday: 1,
        startTime: '09:00',
        endTime: '13:00',
        remarks: 'Pagi reserved ANS',
        isActive: true
      },
      {
        id: 'av-yuki-2',
        senseiId: 'sensei-yuki',
        pattern: 'weekly',
        weekday: 3,
        startTime: '09:00',
        endTime: '13:00',
        isActive: true
      },
      {
        id: 'av-yuki-3',
        senseiId: 'sensei-yuki',
        pattern: 'weekly',
        weekday: 5,
        startTime: '08:00',
        endTime: '12:00',
        isActive: true
      },
      {
        id: 'av-yuki-4',
        senseiId: 'sensei-yuki',
        pattern: 'specific_date',
        date: today,
        startTime: '14:00',
        endTime: '16:00',
        remarks: 'Tambahan sore hari ini',
        isActive: true
      },
      {
        id: 'av-kenji-1',
        senseiId: 'sensei-kenji',
        pattern: 'weekly',
        weekday: 1,
        startTime: '13:00',
        endTime: '18:00',
        isActive: true
      },
      {
        id: 'av-kenji-2',
        senseiId: 'sensei-kenji',
        pattern: 'weekly',
        weekday: 2,
        startTime: '13:00',
        endTime: '18:00',
        isActive: true
      },
      {
        id: 'av-kenji-3',
        senseiId: 'sensei-kenji',
        pattern: 'weekly',
        weekday: 4,
        startTime: '09:00',
        endTime: '17:00',
        isActive: true
      },
      {
        id: 'av-kenji-4',
        senseiId: 'sensei-kenji',
        pattern: 'weekly',
        weekday: 5,
        startTime: '13:00',
        endTime: '17:00',
        isActive: true
      },
      {
        id: 'av-aiko-1',
        senseiId: 'sensei-aiko',
        pattern: 'weekly',
        weekday: 2,
        startTime: '09:00',
        endTime: '12:00',
        remarks: 'Cuti aktif, ketersediaan tetap tercatat',
        isActive: true
      },
      {
        id: 'av-rina-1',
        senseiId: 'sensei-rina',
        pattern: 'weekly',
        weekday: 6,
        startTime: '09:00',
        endTime: '11:00',
        remarks: 'Hanya Sabtu, masih menunggu alokasi',
        isActive: true
      }
    ],
    leavePeriods: [
      {
        id: 'leave-aiko',
        senseiId: 'sensei-aiko',
        startDate: dateOffset(-3, now),
        endDate: dateOffset(4, now),
        reason: 'Cuti keluarga',
        status: 'approved'
      }
    ],
    schedules: [
      {
        id: 'class-yuki-mon',
        senseiId: 'sensei-yuki',
        studentIds: ['stu-andi'],
        type: 'Private',
        level: 'Guntai 2',
        date: week(0),
        startTime: '09:00',
        endTime: '10:30',
        status: 'completed'
      },
      {
        id: 'class-yuki-wed',
        senseiId: 'sensei-yuki',
        studentIds: ['stu-sari'],
        type: 'Private',
        level: 'Guntai 1',
        date: week(2),
        startTime: '10:00',
        endTime: '11:30',
        status: 'completed'
      },
      {
        id: 'class-yuki-today-am',
        senseiId: 'sensei-yuki',
        studentIds: ['stu-andi'],
        type: 'Private',
        level: 'Guntai 2',
        date: today,
        startTime: '09:00',
        endTime: '10:30',
        status: 'active'
      },
      {
        id: 'class-yuki-today-pm',
        senseiId: 'sensei-yuki',
        studentIds: ['stu-sari'],
        type: 'Private',
        level: 'Guntai 1',
        date: today,
        startTime: '14:00',
        endTime: '15:30',
        status: 'active'
      },
      {
        id: 'class-kenji-mon',
        senseiId: 'sensei-kenji',
        studentIds: ['stu-bima', 'stu-lina'],
        groupId: 'group-n5',
        type: 'Semi-Private',
        level: 'N5',
        date: week(0),
        startTime: '13:00',
        endTime: '14:30',
        status: 'completed'
      },
      {
        id: 'class-kenji-tue',
        senseiId: 'sensei-kenji',
        studentIds: ['stu-reza', 'stu-nina', 'stu-faro'],
        groupId: 'group-kaiwa',
        type: 'Group',
        level: 'Custom Kaiwa',
        date: week(1),
        startTime: '16:00',
        endTime: '17:30',
        status: 'completed'
      },
      {
        id: 'class-kenji-thu',
        senseiId: 'sensei-kenji',
        studentIds: ['stu-bima', 'stu-lina'],
        groupId: 'group-n5',
        type: 'Semi-Private',
        level: 'N5',
        date: week(3),
        startTime: '10:00',
        endTime: '11:30',
        status: 'active'
      },
      {
        id: 'class-kenji-conflict-a',
        senseiId: 'sensei-kenji',
        studentIds: ['stu-reza'],
        type: 'Private',
        level: 'Custom Kaiwa',
        date: week(4),
        startTime: '13:00',
        endTime: '14:30',
        status: 'active'
      },
      {
        id: 'class-kenji-conflict-b',
        senseiId: 'sensei-kenji',
        studentIds: ['stu-nina'],
        type: 'Private',
        level: 'Custom Kaiwa',
        date: week(4),
        startTime: '14:00',
        endTime: '15:30',
        status: 'active'
      },
      {
        id: 'class-kenji-sat-future',
        senseiId: 'sensei-kenji',
        studentIds: ['stu-reza', 'stu-nina', 'stu-faro'],
        groupId: 'group-kaiwa',
        type: 'Group',
        level: 'Custom Kaiwa',
        date: week(5),
        startTime: '09:00',
        endTime: '10:30',
        status: 'active'
      },
      {
        id: 'class-cancelled-noreplace',
        senseiId: 'sensei-kenji',
        studentIds: ['stu-bima'],
        type: 'Private',
        level: 'N5',
        date: week(1),
        startTime: '09:00',
        endTime: '10:00',
        status: 'cancelled',
        originalSenseiId: 'sensei-kenji',
        cancellationInitiator: 'Sensei',
        cancellationReason: 'Sensei tidak tersedia, pengganti tidak ditemukan',
        replacementSecured: false
      },
      {
        id: 'class-swapped',
        senseiId: 'sensei-yuki',
        studentIds: ['stu-mio'],
        type: 'Kids Private',
        level: 'Level 1 Kids',
        date: week(2),
        startTime: '15:00',
        endTime: '16:00',
        status: 'completed',
        originalSenseiId: 'sensei-aiko',
        swapInitiator: 'Sensei',
        swapReason: 'Aiko cuti, Yuki menggantikan'
      }
    ],
    sessionLogs: [
      {
        id: 'log-yuki-mon',
        scheduleId: 'class-yuki-mon',
        senseiId: 'sensei-yuki',
        clockInAt: `${week(0)}T09:00:00`,
        clockOutAt: `${week(0)}T10:28:00`,
        lateJoin: false,
        overridden: false
      },
      {
        id: 'log-yuki-wed',
        scheduleId: 'class-yuki-wed',
        senseiId: 'sensei-yuki',
        clockInAt: `${week(2)}T10:12:00`,
        clockOutAt: `${week(2)}T11:30:00`,
        lateJoin: true,
        overridden: false
      },
      {
        id: 'log-kenji-mon',
        scheduleId: 'class-kenji-mon',
        senseiId: 'sensei-kenji',
        clockInAt: `${week(0)}T13:00:00`,
        clockOutAt: `${week(0)}T14:32:00`,
        lateJoin: false,
        overridden: false
      },
      {
        id: 'log-kenji-tue',
        scheduleId: 'class-kenji-tue',
        senseiId: 'sensei-kenji',
        clockInAt: `${week(1)}T16:00:00`,
        clockOutAt: `${week(1)}T17:30:00`,
        lateJoin: false,
        overridden: false
      },
      {
        id: 'log-swapped',
        scheduleId: 'class-swapped',
        senseiId: 'sensei-yuki',
        clockInAt: `${week(2)}T15:00:00`,
        clockOutAt: `${week(2)}T16:00:00`,
        lateJoin: false,
        overridden: false
      }
    ],
    sessionReports: [
      {
        id: 'rep-yuki-mon',
        scheduleId: 'class-yuki-mon',
        submittedBy: 'user-yuki',
        submittedAt: `${week(0)}T10:40:00`,
        students: [
          { studentId: 'stu-andi', attendance: 'Present', performanceScore: 86, performanceNote: 'Partikel は/が lebih stabil' }
        ],
        materialCovered: 'Minna 12 — bentuk て',
        levelProgress: 'Guntai 2 · unit 12/18',
        sessionNotes: 'Siap kuis mini minggu depan',
        recordingUrl: 'https://drive.google.com/demo/yuki-mon',
        recordingStatus: 'Available',
        qaReviewStatus: 'Reviewed',
        qaReviewerId: 'user-kyouiku',
        qaReviewedAt: `${week(1)}T09:00:00`,
        qaReviewNotes: 'Penjelasan bentuk て jelas, pacing baik'
      },
      {
        id: 'rep-kenji-mon',
        scheduleId: 'class-kenji-mon',
        submittedBy: 'user-kenji',
        submittedAt: `${week(0)}T14:45:00`,
        students: [
          { studentId: 'stu-bima', attendance: 'Present', performanceScore: 78 },
          { studentId: 'stu-lina', attendance: 'Late', performanceScore: 74, performanceNote: 'Masuk 8 menit terlambat' }
        ],
        materialCovered: 'Bunpo N5 — たい form',
        levelProgress: 'N5 · unit 8/20',
        recordingStatus: 'Missing',
        qaReviewStatus: 'Not Reviewed'
      },
      {
        id: 'rep-kenji-tue',
        scheduleId: 'class-kenji-tue',
        submittedBy: 'user-kenji',
        submittedAt: `${week(1)}T17:45:00`,
        students: [
          { studentId: 'stu-reza', attendance: 'Present', performanceScore: 81 },
          { studentId: 'stu-nina', attendance: 'Present', performanceScore: 88 },
          { studentId: 'stu-faro', attendance: 'Partial', performanceScore: 70, performanceNote: 'Hanya 40 menit karena koneksi' }
        ],
        materialCovered: 'Kaiwa: merencanakan perjalanan',
        levelProgress: 'Custom Kaiwa · topik 4',
        recordingUrl: 'https://zoom.us/rec/demo-kaiwa',
        recordingStatus: 'Available',
        qaReviewStatus: 'Not Reviewed'
      },
      {
        id: 'rep-swapped',
        scheduleId: 'class-swapped',
        submittedBy: 'user-yuki',
        submittedAt: `${week(2)}T16:10:00`,
        students: [{ studentId: 'stu-mio', attendance: 'Present', performanceScore: 90 }],
        materialCovered: 'Hiragana review + lagu',
        levelProgress: 'Level 1 Kids · unit 3',
        recordingStatus: 'Not Required',
        qaReviewStatus: 'Not Reviewed'
      }
    ],
    qaScores: [
      {
        id: 'qa-yuki-prev',
        senseiId: 'sensei-yuki',
        month: lastMonth,
        score: 82,
        notes: 'Onboarding bagus, masih perlu penguatan classroom language',
        createdBy: 'user-kyouiku',
        createdAt: `${lastMonth}-28T10:00:00`
      },
      {
        id: 'qa-kenji-prev',
        senseiId: 'sensei-kenji',
        month: lastMonth,
        score: 91,
        notes: 'Konsisten di group class',
        createdBy: 'user-kyouiku',
        createdAt: `${lastMonth}-28T10:05:00`
      },
      {
        id: 'qa-kenji-now',
        senseiId: 'sensei-kenji',
        month: thisMonth,
        score: 88,
        notes: 'Perlu rapikan kelengkapan rekaman',
        createdBy: 'user-kyouiku',
        createdAt: `${today}T08:00:00`
      }
    ],
    auditLogs: [
      {
        id: 'audit-swap',
        actorId: 'user-admin',
        actorName: 'Sakura Ops',
        action: 'swap_sensei',
        entity: 'schedules',
        recordId: 'class-swapped',
        oldValue: { senseiId: 'sensei-aiko' },
        newValue: { senseiId: 'sensei-yuki', swapInitiator: 'Sensei' },
        reason: 'Aiko cuti, Yuki menggantikan kelas kids',
        createdAt: `${week(2)}T08:30:00`
      },
      {
        id: 'audit-cancel',
        actorId: 'user-admin',
        actorName: 'Sakura Ops',
        action: 'cancel_class',
        entity: 'schedules',
        recordId: 'class-cancelled-noreplace',
        oldValue: { status: 'active' },
        newValue: { status: 'cancelled', cancellationInitiator: 'Sensei', replacementSecured: false },
        reason: 'Sensei tidak tersedia, pengganti tidak ditemukan',
        createdAt: `${week(1)}T07:50:00`
      }
    ]
  };
}
