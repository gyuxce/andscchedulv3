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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#122033]/40 p-3 sm:items-center">
      <div
        className={`my-auto w-full overflow-hidden rounded-2xl border border-[#e2d6c4] bg-[#fffdf8] shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-xl'}`}
      >
        <div className="flex items-center justify-between border-b border-[#efe4d2] px-5 py-4">
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-paper">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-[#efe4d2] bg-white/70 p-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
