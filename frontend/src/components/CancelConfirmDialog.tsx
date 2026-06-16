import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n/useT';

interface CancelConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function CancelConfirmDialog({ open, onConfirm, onDismiss }: CancelConfirmDialogProps) {
  const T = useT();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Sync open state with native dialog showModal/close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Escape key → dismiss
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onKey = (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'Escape') {
        ke.preventDefault();
        onDismiss();
      }
    };
    dialog.addEventListener('keydown', onKey);
    return () => dialog.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  // Handle native dialog cancel event (Escape) as fallback
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onCancel = (e: Event) => {
      e.preventDefault();
      onDismiss();
    };
    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, [onDismiss]);

  const dialogElement = (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/50 rounded-xl p-0 border-0 shadow-xl bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] max-w-sm w-[calc(100%-2rem)] animate-dialog-in"
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onDismiss();
        }
      }}
    >
      <div className="p-5">
        <h2 className="text-base font-semibold mb-2">{T.cancelTitle}</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-5 leading-relaxed">
          {T.cancelBody}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors"
          >
            {T.cancelContinue}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--color-error)] text-white hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            {T.cancelConfirm}
          </button>
        </div>
      </div>
    </dialog>
  );

  return createPortal(dialogElement, document.body);
}
