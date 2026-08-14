import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { useDashboardStore } from '../store/useDashboardStore';
import { Button } from './ui/Button';

export function LoginView() {
  const configured = isSupabaseConfigured();
  const signInWithEmail = useDashboardStore((state) => state.signInWithEmail);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-[#e2d6c4] bg-[#fffdf8] shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative hidden bg-ink p-10 text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(196,92,38,0.35),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(201,162,39,0.2),transparent_35%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <p className="text-sm tracking-[0.3em] text-white/60">秋の空 × ILUSA</p>
              <h1 className="mt-6 text-4xl font-extrabold leading-tight">ANS Dashboard V3</h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/75">
                Operasional kelas, Sensei, dan QA. Login wajib lewat Supabase Auth (staging terpisah dari V2).
              </p>
            </div>
            <p className="text-xs text-white/50">Mode demo lokal sudah dinonaktifkan.</p>
          </div>
        </div>
        <div className="p-8">
          {!configured ? (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-maple">Konfigurasi diperlukan</p>
              <h2 className="mt-2 text-2xl font-extrabold text-ink">Supabase belum terhubung</h2>
              <p className="mt-2 text-sm text-ink-soft">
                Salin <code className="rounded bg-paper px-1">.env.example</code> ke{' '}
                <code className="rounded bg-paper px-1">.env.local</code>, isi{' '}
                <code className="rounded bg-paper px-1">VITE_SUPABASE_URL</code> dan{' '}
                <code className="rounded bg-paper px-1">VITE_SUPABASE_ANON_KEY</code>, lalu restart app.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-maple">Supabase Auth</p>
              <h2 className="mt-2 text-2xl font-extrabold text-ink">Masuk dengan email</h2>
              <p className="mt-2 text-sm text-ink-soft">
                User harus ada di Authentication dan `profiles.status = Approved`.
              </p>
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
