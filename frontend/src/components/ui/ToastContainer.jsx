'use client';

import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

/**
 * Floating bottom-right toast stack rendered under src/components/ui
 * so Tailwind reliably scans all utility classes.
 */
export default function ToastContainer({ toasts = [], onRemove }) {
  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60] flex flex-col gap-2.5 pointer-events-none max-w-sm w-[calc(100vw-2rem)]"
      role="region"
      aria-label="Thông báo hệ thống"
    >
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl shadow-2xl border transition-all duration-200 ${
              isSuccess
                ? 'bg-emerald-800 text-white border-emerald-700'
                : isError
                ? 'bg-rose-800 text-white border-rose-700'
                : 'bg-neutral-900 text-white border-neutral-800'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-200 shrink-0" />}
              {!isSuccess && !isError && <Info className="w-5 h-5 text-blue-300 shrink-0" />}
              <p className="text-sm font-medium leading-snug text-pretty">{t.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onRemove?.(t.id)}
              className="w-7 h-7 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
