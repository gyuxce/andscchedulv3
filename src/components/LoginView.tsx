import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { useDashboardStore } from '../store/useDashboardStore';
import { ThemeToggle } from './layout/ThemeToggle';
import { Button } from './ui/Button';

export function LoginView() {
  const configured = isSupabaseConfigured();
  const signInWithEmail = useDashboardStore((state) => state.signInWithEmail);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="relative flex min-h-dvh items-center justify-center p-3 sm:p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative bg-[var(--sidebar)] p-6 text-[var(--sidebar-text)] sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(196,92,38,0.32),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(201,162,39,0.16),transparent_35%)]" />
          <div className="relative flex h-full flex-col justify-between gap-6">
            <div>
              <p className="text-xs tracking-[0.3em] text-white/55">秋の空 × ILUSA</p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight sm:mt-6 sm:text-4xl">ANS Dashboard</h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/70 sm:mt-4">
                Operasional kelas, Sensei, dan QA untuk Aki No Sora × ILUSA.
              </p>
            </div>
            <p className="hidden text-xs text-white/45 lg:block">Masuk dengan akun resmi yang sudah diaktifkan.</p>
          </div>
        </div>
        <div className="p-5 sm:p-8">
          {!configured ? (
            <>
              <p className="text-xs font-semibold tracking-wide text-maple">Konfigurasi diperlukan</p>
              <h2 className="mt-2 text-xl font-semibold text-ink sm:text-2xl">Layanan belum terhubung</h2>
              <p className="mt-2 text-sm text-ink-soft">
                Hubungi admin operasional untuk memastikan environment aplikasi sudah dikonfigurasi.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold tracking-wide text-maple">Masuk</p>
              <h2 className="mt-2 text-xl font-semibold text-ink sm:text-2xl">Masuk dengan email</h2>
              <p className="mt-2 text-sm text-ink-soft">Gunakan email dan password akun yang sudah disetujui admin.</p>
              <form
                className="mt-6 space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setLoading(true);
                  await signInWithEmail(email, password);
                  setLoading(false);
                }}
              >
                <label>
                  <span className="ui-label">Email</span>
                  <input
                    className="ui-input"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <label>
                  <span className="ui-label">Password</span>
                  <input
                    className="ui-input"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
                <Button tone="primary" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" size={16} /> : null}
                  Masuk
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
