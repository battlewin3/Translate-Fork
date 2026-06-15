import { T } from '../i18n/zh';
import { ThemeToggle } from './ThemeToggle';

interface PanelHeaderProps {
  onHistoryClick: () => void;
  hasHistory: boolean;
}

export default function PanelHeader({ onHistoryClick, hasHistory }: PanelHeaderProps) {
  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-md bg-[var(--color-brand)] flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 16 16"><path d="M3 11V5l5-3 5 3v6l-5 3-5-3Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 2v6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><path d="M3 5l5 3 5-3" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/></svg>
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold truncate">{T.appTitle}</h1>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {hasHistory && (
          <button type="button" onClick={onHistoryClick}
            className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors"
            title={T.historyTitle} aria-label={T.historyTitle}>
            <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
