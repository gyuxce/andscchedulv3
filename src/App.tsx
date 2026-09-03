import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { LoginView } from './components/LoginView';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { CommandPalette } from './components/layout/CommandPalette';
import { ThemeProvider } from './components/layout/ThemeProvider';
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
import { ReportsView } from './components/ReportsView';
import { NAV_BY_ROLE } from './constants';
import { useDashboardStore } from './store/useDashboardStore';
import { useTheme } from './lib/theme';

function AppShell() {
  const currentUser = useDashboardStore((state) => state.currentUser);
  const activeTab = useDashboardStore((state) => state.activeTab);
  const isBootstrapping = useDashboardStore((state) => state.isBootstrapping);
  const bootstrapAuth = useDashboardStore((state) => state.bootstrapAuth);
  const { theme } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    void bootstrapAuth();
  }, [bootstrapAuth]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [activeTab, currentUser?.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (isBootstrapping) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 text-sm font-medium text-ink-soft">
        Memuat dashboard…
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginView />
        <Toaster richColors position="top-center" theme={theme} />
      </>
    );
  }

  const allowed = NAV_BY_ROLE[currentUser.role];
  const tab = allowed.includes(activeTab) ? activeTab : allowed[0];

  return (
    <div className="flex min-h-dvh bg-canvas">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <TopBar onOpenMenu={() => setMobileNavOpen(true)} onOpenSearch={() => setPaletteOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[image:var(--hero-gradient)] p-4 sm:p-8">
          <div className="mx-auto w-full max-w-7xl">
            {tab === 'overview' && <OverviewView />}
            {tab === 'classes' && <ClassesView />}
            {tab === 'schedule' && <ScheduleView />}
            {tab === 'availability' && <AvailabilityView />}
            {tab === 'teaching' && <TeachingView />}
            {tab === 'sensei' && <SenseiView />}
            {tab === 'students' && <StudentsView />}
            {tab === 'qa' && <QaView />}
            {tab === 'disciplinary' && <DisciplinaryView />}
            {tab === 'reports' && <ReportsView />}
            {tab === 'audit' && <AuditView />}
            {tab === 'users' && <UsersView />}
            {tab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Toaster richColors position="top-center" theme={theme} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
