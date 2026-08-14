import { formatDateTime } from '../lib/dates';
import { useDashboardStore } from '../store/useDashboardStore';
import { Badge } from './ui/Badge';

export function AuditView() {
  const logs = useDashboardStore((state) => state.auditLogs);
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Koreksi sensitif wajib punya jejak: nilai lama, nilai baru, pelaku, waktu, dan alasan. Soft-delete/archive dipakai, bukan hapus permanen.
      </p>
      <div className="ui-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper/80 text-left text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Pelaku</th>
              <th className="px-4 py-3">Aksi</th>
              <th className="px-4 py-3">Alasan</th>
              <th className="px-4 py-3">Perubahan</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-[#efe4d2] align-top">
                <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                <td className="px-4 py-3">{log.actorName}</td>
                <td className="px-4 py-3">
                  <Badge>{log.action}</Badge>
                  <div className="mt-1 text-xs text-ink-soft">{log.entity} · {log.recordId}</div>
                </td>
                <td className="px-4 py-3">{log.reason || '—'}</td>
                <td className="px-4 py-3 text-xs">
                  <pre className="whitespace-pre-wrap break-all text-[11px] text-ink-soft">
                    {JSON.stringify({ old: log.oldValue, new: log.newValue }, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
