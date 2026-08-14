import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { LoginView } from './components/LoginView';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { OverviewView } from './components/OverviewView';
import { ScheduleView } from './components/ScheduleView';
import { ClassesView } from './components/ClassesView';
import { AvailabilityView } from './components/AvailabilityView';
import { TeachingView } from './components/TeachingView';
import { SenseiView } from './components/SenseiView';
import { StudentsView } from './components/StudentsView';
import { QaView } from './components/QaView';
import { DisciplinaryView } from './components/DisciplinaryView';
import { AuditView } from './components/AuditView';
import { UsersView } from './components/UsersView';
import { SettingsView } from './components/SettingsView';
import { NAV_BY_ROLE } from './constants';
import { useDashboardStore } from './store/useDashboardStore';

export default function App() {
  const currentUser = useDashboardStore((state) => state.currentUser);
  const activeTab = useDashboardStore((state) => state.activeTab);
  const isBootstrapping = useDashboardStore((state) => state.isBootstrapping);
  const bootstrapAuth = useDashboardStore((state) => state.bootstrapAuth);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    void bootstrapAuth();
  }, [bootstrapAuth]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [activeTab, currentUser?.id]);

  if (isBootstrapping) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 text-sm font-semibold text-ink-soft">
        Memuat dashboard…
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginView />
        <Toaster richColors position="top-center" />
      </>
    );
  }

  const allowed = NAV_BY_ROLE[currentUser.role];
  const tab = allowed.includes(activeTab) ? activeTab : allowed[0];

  return (
    <div className="flex min-h-dvh">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <TopBar onOpenMenu={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-5 lg:p-6">
          {tab === 'overview' && <OverviewView />}
          {tab === 'classes' && <ClassesView />}
          {tab === 'schedule' && <ScheduleView />}
          {tab === 'availability' && <AvailabilityView />}
          {tab === 'teaching' && <TeachingView />}
          {tab === 'sensei' && <SenseiView />}
          {tab === 'students' && <StudentsView />}
          {tab === 'qa' && <QaView />}
          {tab === 'disciplinary' && <DisciplinaryView />}
          {tab === 'audit' && <AuditView />}
          {tab === 'users' && <UsersView />}
          {tab === 'settings' && <SettingsView />}
        </main>
      </div>
      <Toaster richColors position="top-center" />
    </div>
  );
}
