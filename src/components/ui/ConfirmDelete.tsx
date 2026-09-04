import { useState } from 'react';
import { Button } from './Button';

/**
 * Two-step delete: a quiet trigger that arms an explicit red confirm.
 * Nothing is deleted on the first click.
 */
export function ConfirmDelete({
  label = 'Hapus',
  confirmLabel = 'Ya, hapus permanen',
  message = 'Tindakan ini tidak bisa dibatalkan.',
  disabled = false,
  onConfirm
}: {
  label?: string;
  confirmLabel?: string;
  message?: string;
  disabled?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setArmed(true)}
        className="text-xs font-semibold text-danger hover:underline disabled:opacity-40"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2">
      <span className="text-xs text-ink">{message}</span>
      <Button className="h-8" onClick={() => setArmed(false)}>
        Batal
      </Button>
      <Button
        tone="danger"
        className="h-8"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
            setArmed(false);
          }
        }}
      >
        {busy ? 'Menghapus…' : confirmLabel}
      </Button>
    </div>
  );
}
