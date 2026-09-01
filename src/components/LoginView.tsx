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
    <div className="relative flex min-h-dvh items-center justify-center p-4 sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[image:var(--hero-gradient)]" />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-line bg-surface shadow-[var(--shadow-lift)] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative bg-[#0d0d12] p-8 text-white sm:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(124,77,255,0.42),transparent_42%),radial-gradient(circle_at_86%_82%,rgba(155,135,255,0.22),transparent_36%)]" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div>
              <span className="inline-flex h-6 items-center gap-1 rounded-full bg-white/10 py-0.5 pl-2.5 pr-0.5 text-[11px] font-semibold text-white">
                Baru
                <span className="inline-flex h-5 items-center rounded-full bg-white px-2 text-[#0d0d12]">V3</span>
              </span>
              <p className="mt-6 text-xs tracking-[0.3em] text-white/55">秋の空 × ILUSA</p>
              <h1 className="mt-4 max-w-sm text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
                ANS Dashboard
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-7 text-white/70">
                Operasional kelas, Sensei, dan QA untuk Aki No Sora × ILUSA — ringkas, terang, dan siap dipakai setiap hari.
              </p>
            </div>
            <p className="hidden text-xs text-white/45 lg:block">Masuk dengan akun resmi yang sudah diaktifkan.</p>
          </div>
        </div>
        <div className="bg-surface p-6 sm:p-10">
          {!configured ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-maple">Konfigurasi diperlukan</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Layanan belum terhubung</h2>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                Hubungi admin operasional untuk memastikan environment aplikasi sudah dikonfigurasi.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-maple">Masuk</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Masuk dengan email</h2>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                Gunakan email dan password akun yang sudah disetujui admin.
              </p>
              <form
                className="mt-8 space-y-4"
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
                <Button tone="primary" className="mt-2 h-11 w-full" disabled={loading}>
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
