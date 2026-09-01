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
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-3">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-[var(--overlay)] backdrop-blur-[2px]"
        aria-label="Tutup"
        onClick={onClose}
      />
      <div
        className={`relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-line bg-surface shadow-[var(--shadow-lift)] sm:my-auto sm:max-h-[85vh] sm:rounded-[28px] ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h3 className="pr-2 text-base font-semibold text-ink sm:text-lg">{title}</h3>
          <button type="button" onClick={onClose} className="ui-icon-btn" aria-label="Tutup dialog">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">{children}</div>
        {footer ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line bg-elevated/70 p-3 sm:p-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
