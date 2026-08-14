import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({
  title,
  children,
  footer,
  onClose,
  wide
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#122033]/45 p-0 sm:items-center sm:p-3">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Tutup" onClick={onClose} />
      <div
        className={`relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-[#e2d6c4] bg-[#fffdf8] shadow-2xl sm:my-auto sm:max-h-[85vh] sm:rounded-2xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#efe4d2] px-4 py-3 sm:px-5 sm:py-4">
          <h3 className="pr-2 text-base font-bold text-ink sm:text-lg">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink-soft hover:bg-paper"
            aria-label="Tutup dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">{children}</div>
        {footer ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#efe4d2] bg-white/70 p-3 sm:p-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
