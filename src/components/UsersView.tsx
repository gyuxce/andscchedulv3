import { useState } from 'react';
import { ROLE_COPY } from '../constants';
import { useDashboardStore } from '../store/useDashboardStore';
import type { AppRole, UserStatus } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

export function UsersView() {
  const users = useDashboardStore((state) => state.users);
  const sensei = useDashboardStore((state) => state.sensei);
  const upsertUser = useDashboardStore((state) => state.upsertUser);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'Sensei' as AppRole,
    status: 'Pending' as UserStatus,
    senseiId: ''
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-soft">Hanya Super Admin yang mengelola pengguna dan izin. Portal siswa ditunda ke V4.</p>
        <Button tone="primary" onClick={() => setOpen(true)}>Tambah pengguna</Button>
      </div>
      <div className="ui-card overflow-hidden">
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
              <tr key={user.id} className="border-t border-[#efe4d2]">
                <td className="px-4 py-3">
                  <div className="font-bold">{user.name}</div>
                  <div className="text-xs text-ink-soft">{user.email}</div>
                </td>
                <td className="px-4 py-3">{user.role}</td>
                <td className="px-4 py-3">
                  <Badge tone={user.status === 'Approved' ? 'success' : user.status === 'Pending' ? 'gold' : 'danger'}>{user.status}</Badge>
                </td>
                <td className="px-4 py-3">{sensei.find((item) => item.id === user.senseiId)?.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open ? (
        <Modal
          title="Pengguna baru"
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button onClick={() => setOpen(false)}>Batal</Button>
              <Button
                tone="primary"
                onClick={() => {
                  upsertUser({
                    name: form.name,
                    email: form.email,
                    role: form.role,
                    status: form.status,
                    senseiId: form.senseiId || undefined
                  });
                  setOpen(false);
                }}
              >
                Simpan
              </Button>
            </>
          }
        >
          <input className="ui-input" placeholder="Nama" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input className="ui-input" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <select className="ui-select" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as AppRole })}>
            {Object.keys(ROLE_COPY).map((role) => <option key={role}>{role}</option>)}
          </select>
          <select className="ui-select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as UserStatus })}>
            <option>Approved</option>
            <option>Pending</option>
            <option>Suspended</option>
          </select>
          <select className="ui-select" value={form.senseiId} onChange={(event) => setForm({ ...form, senseiId: event.target.value })}>
            <option value="">Tidak terkait Sensei</option>
            {sensei.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Modal>
      ) : null}
    </div>
  );
}
