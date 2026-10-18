import React, { useEffect } from 'react';

export interface ToastData {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastNoticeProps {
  toast: ToastData | null;
  onClose: () => void;
}

export const ToastNotice: React.FC<ToastNoticeProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isWarning = toast.type === 'warning' || toast.type === 'error';

  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-50 flex max-w-md items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          isWarning
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            : 'bg-accent/15 text-accent'
        }`}
      >
        {isWarning ? '⚠️' : '✓'}
      </div>

      <div className="flex flex-col min-w-0 flex-1">
        <p className="text-xs font-medium text-on-primary leading-tight">
          {toast.message}
        </p>
      </div>

      {toast.actionLabel && toast.onAction && (
        <button
          type="button"
          onClick={() => {
            toast.onAction?.();
          }}
          className="shrink-0 rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-on-accent hover:opacity-90 transition cursor-pointer"
        >
          {toast.actionLabel}
        </button>
      )}

      <button
        type="button"
        onClick={onClose}
        aria-label="Close notification"
        className="shrink-0 text-on-surface hover:text-on-primary text-xs p-1 cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
};
