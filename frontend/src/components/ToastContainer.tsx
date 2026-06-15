import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Toast, type ToastData } from './Toast';

let addToastGlobal: ((message: string, type?: 'success' | 'error' | 'info') => void) | null = null;

export function toast(message: string, type?: 'success' | 'error' | 'info') {
  addToastGlobal?.(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((message: string, type?: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
  }, []);

  addToastGlobal = addToast;

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>,
    document.body
  );
}
