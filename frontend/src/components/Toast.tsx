import { useEffect } from 'react';

export interface ToastData {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bg =
    toast.type === 'error'
      ? 'bg-[var(--color-error-light)] border-[var(--color-error)]'
      : toast.type === 'success'
        ? 'bg-[var(--color-success-light)] border-[var(--color-success)]'
        : 'bg-[var(--color-surface-overlay)] border-[var(--color-border)]';

  const text =
    toast.type === 'error'
      ? 'text-[var(--color-error)]'
      : toast.type === 'success'
        ? 'text-[var(--color-success)]'
        : 'text-[var(--color-text-primary)]';

  return (
    <div
      role="status"
      className={`${bg} ${text} px-4 py-2 rounded-lg border text-sm shadow-lg
        animate-[slideUp_200ms_var(--ease-out-expo)] pointer-events-auto`}
    >
      {toast.message}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
