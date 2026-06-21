import { useT } from '../i18n/useT';

interface ErrorBannerProps {
  error: string | null;
  onDismiss: () => void;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorBanner({ error, onDismiss, onRetry, retryLabel }: ErrorBannerProps) {
  const T = useT();
  if (!error) return null;

  return (
    <div
      role="alert"
      className="mx-5 p-3 bg-[var(--color-error-light)] border border-[var(--color-error)]/20 rounded-lg text-sm text-[var(--color-error)] animate-[slideDown_200ms_var(--ease-out-expo)]"
    >
      <div className="flex items-start gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 5v3M8 11h0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <p className="flex-1 leading-relaxed">{error}</p>
        <div className="flex items-center gap-1 shrink-0">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-2 py-1 text-xs font-medium rounded bg-[var(--color-error)] text-white hover:opacity-90 transition-opacity"
            >
              {retryLabel || T.errorRetry}
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-[var(--color-error)] hover:opacity-70 transition-opacity"
            aria-label={T.errorDismiss}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
