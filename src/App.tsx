import { Toaster } from 'sonner';
import { LoginView } from './components/LoginView';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { OverviewView } from './components/OverviewView';
import { ScheduleView } from './components/ScheduleView';
import { AvailabilityView } from './components/AvailabilityView';
import { TeachingView } from './components/TeachingView';
import { SenseiView } from './components/SenseiView';
import { StudentsView } from './components/StudentsView';
import { QaView } from './components/QaView';
import { DisciplinaryView } from './components/DisciplinaryView';
import { AuditView } from './components/AuditView';
import { UsersView } from './components/UsersView';
import { NAV_BY_ROLE } from './constants';
import { useDashboardStore } from './store/useDashboardStore';

export default function App() {
  const currentUser = useDashboardStore((state) => state.currentUser);
  const activeTab = useDashboardStore((state) => state.activeTab);

  if (!currentUser) {
    return (
      <>
        <LoginView />
        <Toaster richColors position="top-right" />
      </>
    );
  }

  const allowed = NAV_BY_ROLE[currentUser.role];
  const tab = allowed.includes(activeTab) ? activeTab : allowed[0];

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          {tab === 'overview' && <OverviewView />}
          {tab === 'schedule' && <ScheduleView />}
          {tab === 'availability' && <AvailabilityView />}
          {tab === 'teaching' && <TeachingView />}
          {tab === 'sensei' && <SenseiView />}
          {tab === 'students' && <StudentsView />}
          {tab === 'qa' && <QaView />}
          {tab === 'disciplinary' && <DisciplinaryView />}
          {tab === 'audit' && <AuditView />}
          {tab === 'users' && <UsersView />}
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
