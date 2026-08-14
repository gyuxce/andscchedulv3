import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ROLE_COPY } from '../constants';
import { isSupabaseConfigured } from '../lib/supabase';
import { useDashboardStore } from '../store/useDashboardStore';
import { Button } from './ui/Button';

export function LoginView() {
  const configured = isSupabaseConfigured();
  const allUsers = useDashboardStore((state) => state.users);
  const login = useDashboardStore((state) => state.login);
  const signInWithEmail = useDashboardStore((state) => state.signInWithEmail);
  const dataSource = useDashboardStore((state) => state.dataSource);
  const users = allUsers.filter((user) => user.status === 'Approved');
  const [selected, setSelected] = useState(users[0]?.id ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'supabase' | 'demo'>(configured ? 'supabase' : 'demo');

  useEffect(() => {
    if (!selected && users[0]?.id) setSelected(users[0].id);
  }, [selected, users]);

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
                Staging Supabase untuk operasional kelas, Sensei, dan QA — terpisah dari produksi V2.
              </p>
            </div>
            <p className="text-xs text-white/50">
              Mode sekarang: {configured ? `Supabase (${dataSource})` : 'Demo lokal (belum ada .env.local)'}
            </p>
          </div>
        </div>
        <div className="p-8">
          {configured ? (
            <div className="mb-4 flex gap-2">
              <Button tone={mode === 'supabase' ? 'primary' : 'secondary'} onClick={() => setMode('supabase')}>
                Login Supabase
              </Button>
              <Button tone={mode === 'demo' ? 'primary' : 'secondary'} onClick={() => setMode('demo')}>
                Demo lokal
              </Button>
            </div>
          ) : null}

          {mode === 'supabase' && configured ? (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-maple">Supabase Auth</p>
              <h2 className="mt-2 text-2xl font-extrabold text-ink">Masuk dengan email</h2>
              <p className="mt-2 text-sm text-ink-soft">
                Buat user di Supabase Authentication, lalu pastikan baris `profiles` statusnya Approved.
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
                  <input className="ui-input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                </label>
                <label>
                  <span className="ui-label">Password</span>
                  <input className="ui-input" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
                </label>
                <Button tone="primary" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" size={16} /> : null}
                  Masuk
                </Button>
              </form>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-maple">Masuk demo</p>
              <h2 className="mt-2 text-2xl font-extrabold text-ink">Pilih peran operasional</h2>
              <p className="mt-2 text-sm text-ink-soft">
                Tanpa Supabase, data tetap di browser. Setelah `.env.local` diisi, pakai Login Supabase.
              </p>
              <div className="mt-6 space-y-3">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelected(user.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected === user.id ? 'border-maple bg-orange-50' : 'border-[#e2d6c4] bg-white hover:bg-paper'
                    }`}
                  >
                    <div className="font-bold text-ink">{user.name}</div>
                    <div className="text-xs text-ink-soft">{ROLE_COPY[user.role].subtitle}</div>
                    <div className="mt-1 text-xs font-semibold text-maple">{user.role} · {user.email}</div>
                  </button>
                ))}
              </div>
              <Button tone="primary" className="mt-6 w-full" onClick={() => login(selected)}>
                Masuk ke dashboard
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
