import { useTranslateState } from '../hooks/useTranslateState';
import { useT } from '../i18n/useT';
import { getDownloadUrl } from '../api/client';
import type { OutputMode } from '../reducers/translateReducer';

export default function DownloadPanel() {
  const T = useT();
  const state = useTranslateState();

  const modeLabels: Record<OutputMode, { key: string; label: string }[]> = {
    mono: [{ key: 'mono', label: T.downloadMono }],
    dual: [
      { key: 'mono', label: T.downloadMono },
      { key: 'dual', label: T.downloadDual },
    ],
    side: [
      { key: 'mono', label: T.downloadMono },
      { key: 'dual', label: T.downloadDual },
      { key: 'side', label: T.downloadSide },
    ],
  };

  if (state.status !== 'completed' || !state.jobId) return null;

  const downloads = modeLabels[state.outputMode] || modeLabels.mono;

  return (
    <div className="space-y-2 animate-[slideDown_200ms_ease-out]">
      <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">{T.downloadResults}</h4>
      <div className="space-y-1.5">
        {downloads.map(({ key, label }) => {
          const filename = state.resultFiles[key];
          if (!filename) return null;
          return (
            <a
              key={key}
              href={getDownloadUrl(state.jobId!, key)}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-light)] transition-all group"
              download
            >
              <span className="text-sm text-[var(--color-text-secondary)] truncate flex-1 mr-2 group-hover:text-[var(--color-brand)] transition-colors">
                {label}
              </span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
                className="text-[var(--color-text-tertiary)] group-hover:text-[var(--color-brand)] transition-colors shrink-0">
                <path d="M4 12v1a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1m-4-5v7m0 0l-2-2m2 2l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          );
        })}
      </div>
      <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
