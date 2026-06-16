import { useEffect, useRef } from 'react';
import { useT } from '../i18n/useT';
import type { JobHistoryEntry } from '../reducers/translateReducer';
import { getDownloadUrl } from '../api/client';

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  history: JobHistoryEntry[];
  onClear: () => void;
  onRetry: (entry: JobHistoryEntry) => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `今天 ${time}`;
  const date = d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  return `${date} ${time}`;
}

function statusDot(status: JobHistoryEntry['status']): string {
  if (status === 'completed') return 'bg-[var(--color-success)]';
  if (status === 'failed') return 'bg-[var(--color-error)]';
  return 'bg-[var(--color-text-tertiary)]';
}

function statusLabel(status: JobHistoryEntry['status']): string {
  if (status === 'completed') return '完成';
  if (status === 'failed') return '失败';
  return '已取消';
}

export function HistoryDrawer({ open, onClose, history, onClear, onRetry }: HistoryDrawerProps) {
  const T = useT();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const drawer = drawerRef.current;
      if (!drawer) return;

      const focusable = drawer.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Focus the drawer so keyboard events are trapped
    drawerRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-[fadeIn_200ms]"
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={T.historyTitle}
        className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-[var(--color-surface-elevated)] border-l border-[var(--color-border)] z-50 flex flex-col animate-[slideInRight_250ms_var(--ease-out-expo)] outline-none"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold">{T.historyTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)] text-center py-8">
              {T.historyEmpty}
            </p>
          ) : (
            history.map((entry) => (
              <div
                key={entry.jobId}
                className="p-3 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-border-focus)] transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot(entry.status)}`} />
                  <span className="text-xs font-medium text-[var(--color-text-secondary)] truncate">
                    {entry.fileName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-tertiary)] mb-2">
                  <span>{entry.service}</span>
                  <span>{entry.langFrom} → {entry.langTo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--color-text-tertiary)]">
                    {formatTime(entry.timestamp)}
                    {' '}
                    <span className="text-[var(--color-text-secondary)]">{statusLabel(entry.status)}</span>
                  </span>
                  <div className="flex gap-1">
                    {entry.status === 'completed' && entry.files && (
                      <>
                        {Object.entries(entry.files).map(([type, path]) => (
                          <a
                            key={type}
                            href={getDownloadUrl(entry.jobId, type)}
                            className="px-2 py-0.5 text-[11px] font-medium rounded bg-[var(--color-brand-light)] text-[var(--color-brand)] hover:bg-[var(--color-brand)] hover:text-white transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {type === 'mono' ? '单' : type === 'dual' ? '双' : '对'}
                          </a>
                        ))}
                      </>
                    )}
                    {entry.status === 'failed' && (
                      <button
                        type="button"
                        onClick={() => onRetry(entry)}
                        className="px-2 py-0.5 text-[11px] font-medium rounded bg-[var(--color-brand-light)] text-[var(--color-brand)] hover:bg-[var(--color-brand)] hover:text-white transition-colors"
                      >
                        {T.historyRetry}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {history.length > 0 && (
          <div className="p-3 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClear}
              className="w-full py-2 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] transition-colors"
            >
              {T.historyClear}
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}
