import { useState } from 'react';
import { formatDateTime } from '../lib/dates';
import { displayName } from '../lib/display';
import { useDashboardStore, usePermissions, useScopedData } from '../store/useDashboardStore';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

export function QaView() {
  const permissions = usePermissions();
  const allSensei = useDashboardStore((state) => state.sensei);
  const allUsers = useDashboardStore((state) => state.users);
  const upsertQaScore = useDashboardStore((state) => state.upsertQaScore);
  const reviewRecording = useDashboardStore((state) => state.reviewRecording);
  const { qaScores, sessionReports, schedules, sensei } = useScopedData();
  const month = new Date().toISOString().slice(0, 7);
  const [scoreForm, setScoreForm] = useState({ senseiId: sensei[0]?.id ?? allSensei[0]?.id ?? '', score: 85, notes: '' });
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const recordings = sessionReports
    .map((report) => ({
      report,
      session: schedules.find((item) => item.id === report.scheduleId)
    }))
    .filter((item) => item.session);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Teaching Performance diinput manual oleh Kyouiku (0–100). Rekaman hanya disimpan sebagai referensi URL, bukan platform video. Skor komposit disiplin belum dihitung di V3.
      </p>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="ui-card p-4">
          <h3 className="font-extrabold">Skor Teaching Performance</h3>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs uppercase text-ink-soft">
              <tr>
                <th className="py-2">Sensei</th>
                <th>Bulan</th>
                <th>Skor</th>
              </tr>
            </thead>
            <tbody>
              {qaScores.map((item) => (
                <tr key={item.id} className="border-t border-[#efe4d2]">
                  <td className="py-2">{displayName(allSensei, item.senseiId)}</td>
                  <td>{item.month}</td>
                  <td className="font-bold">{item.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {permissions.canEditQa ? (
            <div className="mt-4 space-y-2 rounded-2xl bg-paper p-3">
              <select className="ui-select" value={scoreForm.senseiId} onChange={(event) => setScoreForm({ ...scoreForm, senseiId: event.target.value })}>
                {(permissions.canViewAllSensei ? allSensei : sensei).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <input className="ui-input" type="number" min={0} max={100} value={scoreForm.score} onChange={(event) => setScoreForm({ ...scoreForm, score: Number(event.target.value) })} />
              <input className="ui-input" placeholder="Catatan QA" value={scoreForm.notes} onChange={(event) => setScoreForm({ ...scoreForm, notes: event.target.value })} />
              <Button tone="primary" onClick={() => upsertQaScore(scoreForm.senseiId, month, scoreForm.score, scoreForm.notes)}>
                Simpan skor {month}
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-ink-soft">Visibilitas skor sendiri masih TBC; V3 menampilkan metrik milik Sensei yang login sebagai bahan coaching.</p>
          )}
        </div>
        <div className="ui-card p-4">
          <h3 className="font-extrabold">Referensi rekaman</h3>
          <div className="mt-3 space-y-2">
            {recordings.map(({ report, session }) => (
              <div key={report.id} className="rounded-2xl border border-[#efe4d2] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold">{session?.level} · {session?.date}</div>
                  <Badge tone={report.recordingStatus === 'Available' ? 'success' : report.recordingStatus === 'Missing' ? 'danger' : 'muted'}>
                    {report.recordingStatus}
                  </Badge>
                </div>
                <p className="text-xs text-ink-soft">{report.recordingUrl || 'Belum ada URL'}</p>
                <div className="mt-1 flex items-center justify-between">
                  <Badge tone={report.qaReviewStatus === 'Reviewed' ? 'pine' : 'gold'}>{report.qaReviewStatus}</Badge>
                  {permissions.canReviewQa && report.recordingStatus === 'Available' ? (
                    <button className="text-xs font-bold text-maple" onClick={() => { setReviewId(report.id); setReviewNotes(report.qaReviewNotes ?? ''); }}>
                      Review
                    </button>
                  ) : null}
                </div>
                {report.qaReviewedAt ? (
                  <p className="mt-1 text-xs text-ink-soft">
                    {displayName(allUsers, report.qaReviewerId)} · {formatDateTime(report.qaReviewedAt)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
      {reviewId ? (
        <Modal
          title="Review rekaman"
          onClose={() => setReviewId(null)}
          footer={
            <>
              <Button onClick={() => setReviewId(null)}>Batal</Button>
              <Button tone="primary" onClick={() => { reviewRecording(reviewId, reviewNotes); setReviewId(null); }}>
                Tandai reviewed
              </Button>
            </>
          }
        >
          <textarea className="ui-textarea" value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder="Catatan review Kyouiku" />
        </Modal>
      ) : null}
    </div>
  );
}
