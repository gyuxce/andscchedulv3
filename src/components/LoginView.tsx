import { useState } from 'react';
import { ROLE_COPY } from '../constants';
import { useDashboardStore } from '../store/useDashboardStore';
import { Button } from './ui/Button';

export function LoginView() {
  const users = useDashboardStore((state) => state.users.filter((user) => user.status === 'Approved'));
  const login = useDashboardStore((state) => state.login);
  const [selected, setSelected] = useState(users[0]?.id ?? '');

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
                Sistem operasional dan akademik Aki No Sora: jadwal resmi, ketersediaan Sensei, eksekusi sesi, QA Kyouiku, dan Action Center.
              </p>
            </div>
            <p className="text-xs text-white/50">CRM, pembayaran, dan portal siswa tidak termasuk di V3.</p>
          </div>
        </div>
        <div className="p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-maple">Masuk demo</p>
          <h2 className="mt-2 text-2xl font-extrabold text-ink">Pilih peran operasional</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Data demo terpisah dari produksi V2. Semua aksi menulis audit log lokal.
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
        </div>
      </div>
    </div>
  );
}
