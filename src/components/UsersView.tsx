import { useState } from 'react';
import { ROLE_COPY } from '../constants';
import { useDashboardStore } from '../store/useDashboardStore';
import type { AppRole, UserStatus } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { PageIntro } from './ui/PageIntro';

export function UsersView() {
  const users = useDashboardStore((state) => state.users);
  const sensei = useDashboardStore((state) => state.sensei);
  const createUserLogin = useDashboardStore((state) => state.createUserLogin);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password2: '',
    role: 'Sensei' as AppRole,
    status: 'Approved' as UserStatus,
    senseiId: ''
  });

  const save = async () => {
    if (!form.email.trim() || !form.password) return;
    if (form.password !== form.password2) return;
    if (form.password.length < 6) return;
    setSaving(true);
    const ok = await createUserLogin({
      email: form.email,
      password: form.password,
      role: form.role,
      status: form.status,
      name: form.name || form.email.split('@')[0],
      senseiId: form.senseiId || undefined
    });
    setSaving(false);
    if (ok) {
      setOpen(false);
      setForm({
        name: '',
        email: '',
        password: '',
        password2: '',
        role: 'Sensei',
        status: 'Approved',
        senseiId: ''
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Pengguna"
        title="Akun login"
        actions={
          <Button tone="primary" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
            Buat akun
          </Button>
        }
      >
        Super Admin bisa membuat akun login (email + password) langsung dari sini. Portal siswa ditunda ke V4.
      </PageIntro>
      <div className="ui-card overflow-hidden">
        <div className="ui-table-wrap">
          <table className="w-full text-sm">
            <thead className="bg-paper/80 text-left text-xs uppercase text-ink-soft">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Peran</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sensei terkait</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="font-bold">{user.name}</div>
                    <div className="text-xs text-ink-soft">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={user.status === 'Approved' ? 'success' : user.status === 'Pending' ? 'gold' : 'danger'}
                    >
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{sensei.find((item) => item.id === user.senseiId)?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {open ? (
        <Modal
          title="Pengguna baru + akun login"
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button onClick={() => setOpen(false)}>Batal</Button>
              <Button
                tone="primary"
                disabled={
                  saving ||
                  !form.email.trim() ||
                  form.password.length < 6 ||
                  form.password !== form.password2
                }
                onClick={() => void save()}
              >
                {saving ? 'Membuat…' : 'Buat akun login'}
              </Button>
            </>
          }
        >
          <input
            className="ui-input"
            placeholder="Nama"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <input
            className="ui-input"
            placeholder="Email login"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <input
            className="ui-input"
            placeholder="Password (min. 6)"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          <input
            className="ui-input"
            placeholder="Ulangi password"
            type="password"
            autoComplete="new-password"
            value={form.password2}
            onChange={(event) => setForm({ ...form, password2: event.target.value })}
          />
          {form.password && form.password !== form.password2 ? (
            <p className="text-xs font-semibold text-rose-700">Password tidak sama.</p>
          ) : null}
          <select
            className="ui-select"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as AppRole })}
          >
            {Object.keys(ROLE_COPY).map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
          <select
            className="ui-select"
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value as UserStatus })}
          >
            <option>Approved</option>
            <option>Pending</option>
            <option>Suspended</option>
          </select>
          <select
            className="ui-select"
            value={form.senseiId}
            onChange={(event) => setForm({ ...form, senseiId: event.target.value })}
          >
            <option value="">Tidak terkait Sensei</option>
            {sensei.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.email}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-soft">
            Untuk role Sensei, pilih Sensei terkait yang emailnya sama agar jadwal/workload tertaut.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
