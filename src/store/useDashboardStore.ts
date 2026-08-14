import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { createSeedData } from '../data/seed';
import { getPermissions } from '../lib/rbac';
import { wouldConflict } from '../lib/schedule';
import { isLateJoin } from '../lib/session';
import { isUuid, resolveSenseiId } from '../lib/senseiLink';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { mapProfile } from '../lib/mappers';
import {
  ensureProfile,
  loadDashboardSnapshot,
  upsertAvailabilityRemote,
  upsertQaRemote,
  upsertScheduleRemote,
  upsertSenseiStatusRemote,
  upsertSessionLogRemote,
  upsertSessionReportRemote,
  writeAudit
} from '../services/supabaseData';
import type {
  AppRole,
  AttendanceStatus,
  AvailabilitySlot,
  CancellationInitiator,
  ClassSession,
  DashboardSnapshot,
  Permissions,
  RecordingStatus,
  SessionReport,
  StudentSessionRecord,
  SwapInitiator,
  TabId,
  TeachingQaScore,
  UserAccount
} from '../types';

function createId() {
  return crypto.randomUUID();
}

function cloneSeed() {
  return structuredClone(createSeedData());
}

async function safeRemote(task: () => Promise<void>, label: string) {
  if (!isSupabaseConfigured()) return;
  try {
    await task();
  } catch (error) {
    console.error(error);
    toast.error(`${label}: ${error instanceof Error ? error.message : 'gagal sync Supabase'}`);
  }
}

interface ClassInput {
  senseiId: string;
  studentIds: string[];
  groupId?: string | null;
  type: ClassSession['type'];
  level: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface DashboardStore extends DashboardSnapshot {
  currentUser: UserAccount | null;
  activeTab: TabId;
  weekAnchor: string;
  dataSource: 'demo' | 'supabase';
  isBootstrapping: boolean;
  login: (userId: string) => void;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  resetDemo: () => void;
  hydrateFromSupabase: () => Promise<void>;
  bootstrapAuth: () => Promise<void>;
  setTab: (tab: TabId) => void;
  setWeekAnchor: (date: string) => void;
  upsertAvailability: (slot: Omit<AvailabilitySlot, 'id'> & { id?: string }) => void;
  removeAvailability: (id: string) => void;
  createClass: (input: ClassInput, reason?: string) => boolean;
  updateClass: (id: string, input: Partial<ClassInput>, reason: string) => boolean;
  cancelClass: (
    id: string,
    payload: { reason: string; initiator: CancellationInitiator; replacementSecured: boolean }
  ) => void;
  swapSensei: (id: string, newSenseiId: string, initiator: SwapInitiator, reason: string) => boolean;
  clockIn: (scheduleId: string, at?: string) => void;
  clockOut: (scheduleId: string, at?: string) => void;
  overrideClock: (scheduleId: string, clockInAt: string, clockOutAt: string | null, reason: string) => void;
  submitSessionReport: (
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
  overrideAttendance: (
    reportId: string,
    studentId: string,
    attendance: AttendanceStatus,
    reason: string
  ) => void;
  overridePerformance: (
    reportId: string,
    studentId: string,
    score: number,
    reason: string
  ) => void;
  reviewRecording: (reportId: string, notes: string) => void;
  upsertQaScore: (senseiId: string, month: string, score: number, notes: string) => void;
  overrideSenseiStatus: (senseiId: string, status: 'ACTIVE' | 'INACTIVE', reason: string) => void;
  upsertUser: (user: Omit<UserAccount, 'id'> & { id?: string }) => void;
}

function actor(state: DashboardStore) {
  return {
    actorId: state.currentUser?.id ?? 'system',
    actorName: state.currentUser?.name ?? 'System'
  };
}

function pushAudit(
  state: DashboardStore,
  entry: {
    action: string;
    entity: string;
    recordId: string;
    oldValue?: unknown;
    newValue?: unknown;
    reason?: string;
  }
) {
  const who = actor(state);
  state.auditLogs = [
    {
      id: createId(),
      ...who,
      ...entry,
      createdAt: new Date().toISOString()
    },
    ...state.auditLogs
  ];
  void safeRemote(
    () =>
      writeAudit({
        actorId: who.actorId,
        actorEmail: state.currentUser?.email,
        action: entry.action,
        entity: entry.entity,
        recordId: entry.recordId,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        reason: entry.reason
      }),
    'Audit log'
  );
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      ...cloneSeed(),
      currentUser: null,
      activeTab: 'overview',
      weekAnchor: new Date().toISOString().slice(0, 10),
      dataSource: isSupabaseConfigured() ? 'supabase' : 'demo',
      isBootstrapping: Boolean(isSupabaseConfigured()),
      login: (userId) => {
        const user = get().users.find((item) => item.id === userId && item.status === 'Approved');
        if (!user) {
          toast.error('Akun tidak ditemukan atau belum disetujui');
          return;
        }
        set({ currentUser: user, activeTab: 'overview' });
      },
      signInWithEmail: async (email, password) => {
        const supabase = getSupabase();
        if (!supabase) {
          toast.error('Supabase belum dikonfigurasi di .env.local');
          return false;
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) {
          toast.error(error?.message || 'Login gagal');
          return false;
        }
        const profile = await ensureProfile(data.user.id, data.user.email || email);
        await get().hydrateFromSupabase();
        const linkedSenseiId = resolveSenseiId(get().sensei, {
          email: data.user.email || email
        });
        const linkedSensei = get().sensei.find((item) => item.id === linkedSenseiId);
        const account: UserAccount = {
          ...mapProfile(profile, linkedSenseiId),
          name: linkedSensei?.name || (data.user.email || email).split('@')[0]
        };
        if (account.role === 'Sensei' && !linkedSenseiId) {
          toast.error('Akun Sensei belum tertaut. Samakan email Auth dengan email di tabel sensei.');
        }
        if (account.status !== 'Approved') {
          await supabase.auth.signOut();
          set({ currentUser: null });
          toast.error('Akun masih Pending. Minta Super Admin approve dulu.');
          return false;
        }
        set({ currentUser: account, activeTab: 'overview', dataSource: 'supabase' });
        toast.success(`Masuk sebagai ${account.role}`);
        return true;
      },
      logout: async () => {
        const supabase = getSupabase();
        if (supabase) await supabase.auth.signOut();
        set({ currentUser: null });
      },
      resetDemo: () => {
        if (get().dataSource === 'supabase') {
          toast.message('Mode Supabase aktif. Reset demo hanya untuk mode lokal.');
          return;
        }
        const seed = cloneSeed();
        set({
          ...seed,
          currentUser: get().currentUser
            ? seed.users.find((user) => user.id === get().currentUser?.id) ?? null
            : null,
          activeTab: 'overview',
          weekAnchor: new Date().toISOString().slice(0, 10),
          dataSource: 'demo'
        });
        toast.success('Data demo dikembalikan ke kondisi awal');
      },
      hydrateFromSupabase: async () => {
        if (!isSupabaseConfigured()) {
          set({ dataSource: 'demo', isBootstrapping: false });
          return;
        }
        set({ isBootstrapping: true });
        try {
          const snapshot = await loadDashboardSnapshot();
          if (!snapshot) {
            set({ dataSource: 'demo', isBootstrapping: false });
            return;
          }
          set({
            ...snapshot,
            dataSource: 'supabase',
            isBootstrapping: false
          });
        } catch (error) {
          console.error(error);
          toast.error(error instanceof Error ? error.message : 'Gagal memuat data Supabase');
          set({ isBootstrapping: false });
        }
      },
      bootstrapAuth: async () => {
        const supabase = getSupabase();
        if (!supabase) {
          set({ dataSource: 'demo', isBootstrapping: false });
          return;
        }
        set({ isBootstrapping: true, dataSource: 'supabase' });
        const { data } = await supabase.auth.getSession();
        await get().hydrateFromSupabase();
        if (!data.session?.user) {
          set({ currentUser: null, isBootstrapping: false });
          return;
        }
        try {
          const profile = await ensureProfile(data.session.user.id, data.session.user.email || '');
          const linkedSenseiId = resolveSenseiId(get().sensei, {
            email: data.session.user.email || ''
          });
          const linkedSensei = get().sensei.find((item) => item.id === linkedSenseiId);
          const account: UserAccount = {
            ...mapProfile(profile, linkedSenseiId),
            name: linkedSensei?.name || (data.session.user.email || '').split('@')[0]
          };
          set({
            currentUser: account.status === 'Approved' ? account : null,
            isBootstrapping: false
          });
          if (account.status === 'Approved' && account.role === 'Sensei' && !linkedSenseiId) {
            toast.error('Akun Sensei belum tertaut. Samakan email Auth dengan email di tabel sensei.');
          }
        } catch (error) {
          console.error(error);
          set({ currentUser: null, isBootstrapping: false });
        }
      },
      setTab: (tab) => set({ activeTab: tab }),
      setWeekAnchor: (date) => set({ weekAnchor: date }),
      upsertAvailability: (slot) => {
        const state = get();
        const resolvedSenseiId =
          resolveSenseiId(state.sensei, {
            senseiId: slot.senseiId,
            email: state.currentUser?.email
          }) || slot.senseiId;

        if (!isUuid(resolvedSenseiId)) {
          toast.error(
            'Sensei belum tertaut ke master data. Samakan email login dengan kolom email di tabel sensei.'
          );
          return;
        }

        const id = slot.id && isUuid(slot.id) ? slot.id : createId();
        const next = {
          ...slot,
          id,
          senseiId: resolvedSenseiId,
          date: slot.pattern === 'specific_date' ? slot.date || null : null,
          weekday: slot.pattern === 'weekly' ? slot.weekday ?? null : null
        };
        set((current) => {
          const exists = current.availability.some((item) => item.id === id);
          const currentUser =
            current.currentUser && !current.currentUser.senseiId
              ? { ...current.currentUser, senseiId: resolvedSenseiId }
              : current.currentUser;
          return {
            currentUser,
            availability: exists
              ? current.availability.map((item) => (item.id === id ? next : item))
              : [next, ...current.availability]
          };
        });
        void safeRemote(() => upsertAvailabilityRemote(next), 'Simpan ketersediaan');
        toast.success('Ketersediaan Sensei disimpan. Jadwal resmi tidak berubah.');
      },
      removeAvailability: (id) => {
        let nextSlot: AvailabilitySlot | undefined;
        set((state) => {
          nextSlot = state.availability.find((item) => item.id === id);
          return {
            availability: state.availability.map((item) =>
              item.id === id ? { ...item, isActive: false } : item
            )
          };
        });
        if (nextSlot) {
          void safeRemote(
            () => upsertAvailabilityRemote({ ...nextSlot!, isActive: false }),
            'Nonaktifkan ketersediaan'
          );
        }
        toast.success('Slot ketersediaan dinonaktifkan');
      },
      createClass: (input, reason) => {
        const state = get();
        const session: ClassSession = {
          id: createId(),
          ...input,
          status: 'active',
          updatedAt: new Date().toISOString(),
          updatedBy: state.currentUser?.name
        };
        if (wouldConflict(state.schedules, session)) {
          toast.error('Bentrok dengan kelas Sensei yang sama. Selesaikan konflik dulu.');
          return false;
        }
        set((current) => {
          pushAudit(current, {
            action: 'create_class',
            entity: 'schedules',
            recordId: session.id,
            newValue: session,
            reason
          });
          current.schedules = [session, ...current.schedules];
          return { schedules: current.schedules, auditLogs: current.auditLogs };
        });
        void safeRemote(() => upsertScheduleRemote(session), 'Simpan kelas');
        toast.success('Kelas resmi ditambahkan');
        return true;
      },
      updateClass: (id, input, reason) => {
        const state = get();
        const existing = state.schedules.find((item) => item.id === id);
        if (!existing) return false;
        const next = {
          ...existing,
          ...input,
          updatedAt: new Date().toISOString(),
          updatedBy: state.currentUser?.name
        };
        if (wouldConflict(state.schedules, next)) {
          toast.error('Perubahan menyebabkan konflik jadwal');
          return false;
        }
        set((current) => {
          pushAudit(current, {
            action: 'edit_class',
            entity: 'schedules',
            recordId: id,
            oldValue: existing,
            newValue: next,
            reason
          });
          return {
            schedules: current.schedules.map((item) => (item.id === id ? next : item)),
            auditLogs: current.auditLogs
          };
        });
        void safeRemote(() => upsertScheduleRemote(next), 'Update kelas');
        toast.success('Jadwal resmi diperbarui');
        return true;
      },
      cancelClass: (id, payload) => {
        let nextSession: ClassSession | undefined;
        set((state) => {
          const existing = state.schedules.find((item) => item.id === id);
          if (!existing) return state;
          nextSession = {
            ...existing,
            status: 'cancelled',
            cancellationReason: payload.reason,
            cancellationInitiator: payload.initiator,
            replacementSecured: payload.replacementSecured,
            originalSenseiId: existing.originalSenseiId ?? existing.senseiId,
            updatedAt: new Date().toISOString(),
            updatedBy: state.currentUser?.name
          };
          pushAudit(state, {
            action: 'cancel_class',
            entity: 'schedules',
            recordId: id,
            oldValue: existing,
            newValue: nextSession,
            reason: payload.reason
          });
          return {
            schedules: state.schedules.map((item) => (item.id === id ? nextSession! : item)),
            auditLogs: state.auditLogs
          };
        });
        if (nextSession) void safeRemote(() => upsertScheduleRemote(nextSession!), 'Batalkan kelas');
        toast.success('Kelas dibatalkan dan tercatat di audit log');
      },
      swapSensei: (id, newSenseiId, initiator, reason) => {
        const state = get();
        const existing = state.schedules.find((item) => item.id === id);
        if (!existing) return false;
        const next: ClassSession = {
          ...existing,
          originalSenseiId: existing.originalSenseiId ?? existing.senseiId,
          senseiId: newSenseiId,
          swapInitiator: initiator,
          swapReason: reason,
          updatedAt: new Date().toISOString(),
          updatedBy: state.currentUser?.name
        };
        if (wouldConflict(state.schedules, next)) {
          toast.error('Sensei pengganti sudah punya kelas di jam ini');
          return false;
        }
        set((current) => {
          pushAudit(current, {
            action: 'swap_sensei',
            entity: 'schedules',
            recordId: id,
            oldValue: { senseiId: existing.senseiId },
            newValue: { senseiId: newSenseiId, swapInitiator: initiator },
            reason
          });
          return {
            schedules: current.schedules.map((item) => (item.id === id ? next : item)),
            auditLogs: current.auditLogs
          };
        });
        void safeRemote(() => upsertScheduleRemote(next), 'Swap Sensei');
        toast.success('Sensei diganti. Atribusi initiator tersimpan.');
        return true;
      },
      clockIn: (scheduleId, at) => {
        const state = get();
        const session = state.schedules.find((item) => item.id === scheduleId);
        if (!session) return;
        const clockInAt = at ?? new Date().toISOString();
        const lateJoin = isLateJoin(session, clockInAt, state.settings.lateGraceMinutes);
        let savedLog = null as ReturnType<typeof get>['sessionLogs'][number] | null;
        set((current) => {
          const existing = current.sessionLogs.find((item) => item.scheduleId === scheduleId);
          const log = {
            id: existing?.id ?? createId(),
            scheduleId,
            senseiId: session.senseiId,
            clockInAt,
            clockOutAt: existing?.clockOutAt ?? null,
            lateJoin,
            overridden: false
          };
          savedLog = log;
          return {
            sessionLogs: existing
              ? current.sessionLogs.map((item) => (item.scheduleId === scheduleId ? log : item))
              : [log, ...current.sessionLogs]
          };
        });
        if (savedLog) void safeRemote(() => upsertSessionLogRemote(savedLog!), 'Clock-in');
        toast.success(lateJoin ? 'Clock-in tercatat (terlambat)' : 'Clock-in tercatat');
      },
      clockOut: (scheduleId, at) => {
        let savedLog = null as ReturnType<typeof get>['sessionLogs'][number] | null;
        set((state) => {
          const nextLogs = state.sessionLogs.map((item) =>
            item.scheduleId === scheduleId
              ? { ...item, clockOutAt: at ?? new Date().toISOString() }
              : item
          );
          savedLog = nextLogs.find((item) => item.scheduleId === scheduleId) || null;
          return { sessionLogs: nextLogs };
        });
        if (savedLog) void safeRemote(() => upsertSessionLogRemote(savedLog!), 'Clock-out');
        toast.success('Clock-out tercatat. Lanjut isi laporan sesi.');
      },
      overrideClock: (scheduleId, clockInAt, clockOutAt, reason) => {
        const state = get();
        const session = state.schedules.find((item) => item.id === scheduleId);
        if (!session) return;
        let savedLog = null as ReturnType<typeof get>['sessionLogs'][number] | null;
        set((current) => {
          const existing = current.sessionLogs.find((item) => item.scheduleId === scheduleId);
          const log = {
            id: existing?.id ?? createId(),
            scheduleId,
            senseiId: session.senseiId,
            clockInAt,
            clockOutAt,
            lateJoin: isLateJoin(session, clockInAt, current.settings.lateGraceMinutes),
            overridden: true
          };
          savedLog = log;
          pushAudit(current, {
            action: 'override_clock',
            entity: 'session_logs',
            recordId: log.id,
            oldValue: existing,
            newValue: log,
            reason
          });
          return {
            sessionLogs: existing
              ? current.sessionLogs.map((item) => (item.scheduleId === scheduleId ? log : item))
              : [log, ...current.sessionLogs],
            auditLogs: current.auditLogs
          };
        });
        if (savedLog) void safeRemote(() => upsertSessionLogRemote(savedLog!), 'Override clock');
        toast.success('Clock-in/out di-override dengan audit');
      },
      submitSessionReport: (scheduleId, payload) => {
        const state = get();
        let savedReport: SessionReport | null = null;
        let completedSession: ClassSession | undefined;
        set((current) => {
          const existing = current.sessionReports.find((item) => item.scheduleId === scheduleId);
          const report: SessionReport = {
            id: existing?.id ?? createId(),
            scheduleId,
            submittedBy: state.currentUser?.id ?? 'unknown',
            submittedAt: new Date().toISOString(),
            qaReviewStatus: existing?.qaReviewStatus ?? 'Not Reviewed',
            qaReviewerId: existing?.qaReviewerId,
            qaReviewedAt: existing?.qaReviewedAt,
            qaReviewNotes: existing?.qaReviewNotes,
            ...payload
          };
          savedReport = report;
          const schedules = current.schedules.map((item) => {
            if (item.id === scheduleId && item.status === 'active') {
              completedSession = { ...item, status: 'completed' as const };
              return completedSession;
            }
            return item;
          });
          return {
            sessionReports: existing
              ? current.sessionReports.map((item) => (item.scheduleId === scheduleId ? report : item))
              : [report, ...current.sessionReports],
            schedules
          };
        });
        if (savedReport) {
          void safeRemote(async () => {
            await upsertSessionReportRemote(savedReport!);
            if (completedSession) await upsertScheduleRemote(completedSession);
          }, 'Simpan laporan');
        }
        toast.success('Laporan sesi tersimpan per siswa');
      },
      overrideAttendance: (reportId, studentId, attendance, reason) => {
        let nextReport: SessionReport | null = null;
        set((state) => {
          const report = state.sessionReports.find((item) => item.id === reportId);
          if (!report) return state;
          const old = report.students.find((item) => item.studentId === studentId);
          nextReport = {
            ...report,
            students: report.students.map((item) =>
              item.studentId === studentId ? { ...item, attendance } : item
            )
          };
          pushAudit(state, {
            action: 'override_attendance',
            entity: 'session_reports',
            recordId: reportId,
            oldValue: old?.attendance,
            newValue: attendance,
            reason
          });
          return {
            sessionReports: state.sessionReports.map((item) => (item.id === reportId ? nextReport! : item)),
            auditLogs: state.auditLogs
          };
        });
        if (nextReport) void safeRemote(() => upsertSessionReportRemote(nextReport!), 'Koreksi absensi');
        toast.success('Koreksi absensi tercatat');
      },
      overridePerformance: (reportId, studentId, score, reason) => {
        let nextReport: SessionReport | null = null;
        set((state) => {
          const report = state.sessionReports.find((item) => item.id === reportId);
          if (!report) return state;
          const old = report.students.find((item) => item.studentId === studentId);
          nextReport = {
            ...report,
            students: report.students.map((item) =>
              item.studentId === studentId ? { ...item, performanceScore: score } : item
            )
          };
          pushAudit(state, {
            action: 'override_performance',
            entity: 'session_reports',
            recordId: reportId,
            oldValue: old?.performanceScore,
            newValue: score,
            reason
          });
          return {
            sessionReports: state.sessionReports.map((item) => (item.id === reportId ? nextReport! : item)),
            auditLogs: state.auditLogs
          };
        });
        if (nextReport) void safeRemote(() => upsertSessionReportRemote(nextReport!), 'Koreksi nilai');
        toast.success('Koreksi nilai performa tercatat');
      },
      reviewRecording: (reportId, notes) => {
        let nextReport: SessionReport | null = null;
        set((state) => {
          nextReport =
            state.sessionReports.find((item) => item.id === reportId)
              ? {
                  ...state.sessionReports.find((item) => item.id === reportId)!,
                  qaReviewStatus: 'Reviewed' as const,
                  qaReviewerId: state.currentUser?.id,
                  qaReviewedAt: new Date().toISOString(),
                  qaReviewNotes: notes
                }
              : null;
          return {
            sessionReports: state.sessionReports.map((item) =>
              item.id === reportId && nextReport ? nextReport : item
            )
          };
        });
        if (nextReport) void safeRemote(() => upsertSessionReportRemote(nextReport!), 'Review rekaman');
        toast.success('Review rekaman disimpan');
      },
      upsertQaScore: (senseiId, month, score, notes) => {
        let saved: TeachingQaScore | null = null;
        set((state) => {
          const existing = state.qaScores.find((item) => item.senseiId === senseiId && item.month === month);
          const next: TeachingQaScore = {
            id: existing?.id ?? createId(),
            senseiId,
            month,
            score,
            notes,
            createdBy: state.currentUser?.id ?? 'unknown',
            createdAt: existing?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          saved = next;
          if (existing && existing.score !== score) {
            pushAudit(state, {
              action: 'override_qa_score',
              entity: 'teaching_qa',
              recordId: next.id,
              oldValue: existing.score,
              newValue: score,
              reason: notes || 'Koreksi skor Teaching Performance'
            });
          }
          return {
            qaScores: existing
              ? state.qaScores.map((item) => (item.id === existing.id ? next : item))
              : [next, ...state.qaScores],
            auditLogs: state.auditLogs
          };
        });
        if (saved) void safeRemote(() => upsertQaRemote(saved!), 'Simpan QA');
        toast.success('Skor Teaching Performance disimpan');
      },
      overrideSenseiStatus: (senseiId, status, reason) => {
        const existing = get().sensei.find((item) => item.id === senseiId);
        set((state) => {
          if (!existing) return state;
          pushAudit(state, {
            action: 'override_sensei_status',
            entity: 'sensei',
            recordId: senseiId,
            oldValue: existing.primaryStatus,
            newValue: status,
            reason
          });
          return {
            sensei: state.sensei.map((item) =>
              item.id === senseiId ? { ...item, primaryStatus: status } : item
            ),
            auditLogs: state.auditLogs
          };
        });
        void safeRemote(
          () =>
            upsertSenseiStatusRemote({
              senseiId,
              primaryStatus: status,
              joinDate: existing?.joinDate,
              updatedBy: get().currentUser?.email
            }),
          'Update status Sensei'
        );
        toast.success('Status Sensei diubah');
      },
      upsertUser: (user) => {
        set((state) => {
          const id = user.id ?? createId();
          const next = { ...user, id };
          const exists = state.users.some((item) => item.id === id);
          return {
            users: exists
              ? state.users.map((item) => (item.id === id ? next : item))
              : [...state.users, next]
          };
        });
        toast.success('Pengguna disimpan');
      }
    }),
    {
      name: 'ans-dashboard-v3',
      partialize: (state) =>
        state.dataSource === 'supabase'
          ? {
              activeTab: state.activeTab,
              weekAnchor: state.weekAnchor,
              dataSource: state.dataSource
            }
          : {
              users: state.users,
              sensei: state.sensei,
              students: state.students,
              groups: state.groups,
              availability: state.availability,
              schedules: state.schedules,
              sessionLogs: state.sessionLogs,
              sessionReports: state.sessionReports,
              qaScores: state.qaScores,
              leavePeriods: state.leavePeriods,
              auditLogs: state.auditLogs,
              settings: state.settings,
              currentUser: state.currentUser,
              activeTab: state.activeTab,
              weekAnchor: state.weekAnchor,
              dataSource: state.dataSource
            }
    }
  )
);

export function usePermissions(): Permissions {
  const role = useDashboardStore((state) => state.currentUser?.role ?? 'Sensei');
  return getPermissions(role as AppRole);
}

export function useScopedData() {
  const currentUser = useDashboardStore((state) => state.currentUser);
  const sensei = useDashboardStore((state) => state.sensei);
  const students = useDashboardStore((state) => state.students);
  const schedules = useDashboardStore((state) => state.schedules);
  const availability = useDashboardStore((state) => state.availability);
  const sessionLogs = useDashboardStore((state) => state.sessionLogs);
  const sessionReports = useDashboardStore((state) => state.sessionReports);
  const qaScores = useDashboardStore((state) => state.qaScores);
  const permissions = getPermissions(currentUser?.role ?? 'Sensei');
  const linkedSenseiId = resolveSenseiId(sensei, {
    senseiId: currentUser?.senseiId,
    email: currentUser?.email
  });

  if (permissions.canViewAllSchedules) {
    return { sensei, students, schedules, availability, sessionLogs, sessionReports, qaScores, linkedSenseiId };
  }

  const senseiId = linkedSenseiId;
  return {
    sensei: sensei.filter((item) => item.id === senseiId),
    students: students.filter((item) => item.senseiId === senseiId),
    schedules: schedules.filter((item) => item.senseiId === senseiId),
    availability: availability.filter((item) => item.senseiId === senseiId),
    sessionLogs: sessionLogs.filter((item) => item.senseiId === senseiId),
    sessionReports: sessionReports.filter((item) =>
      schedules.some((session) => session.id === item.scheduleId && session.senseiId === senseiId)
    ),
    qaScores: qaScores.filter((item) => item.senseiId === senseiId),
    linkedSenseiId
  };
}
