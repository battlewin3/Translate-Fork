import { useTranslateState } from '../hooks/useTranslateState';
import { useTranslateDispatch } from '../hooks/useTranslateDispatch';
import { useTranslation } from '../hooks/useTranslation';
import LanguagePicker from './LanguagePicker';
import ServiceSelector from './ServiceSelector';
import TranslateButton from './TranslateButton';
import { ThemeToggle } from './ThemeToggle';
import { T } from '../i18n/zh';

interface TopToolbarProps {
  onSettingsOpen: () => void;
  onHistoryOpen: () => void;
  hasHistory: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TopToolbar({ onSettingsOpen, onHistoryOpen, hasHistory }: TopToolbarProps) {
  const state = useTranslateState();
  const dispatch = useTranslateDispatch();
  const { start, cancel } = useTranslation();

  const hasInput = !!(state.file || state.url);
  const fileLabel = state.file
    ? `${state.file.name} (${formatSize(state.file.size)})`
    : state.url
      ? state.url.split('/').pop() || '在线文档'
      : null;

  return (
    <header className="h-[var(--toolbar-height)] flex items-center gap-2 px-3 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] shrink-0 select-none">
      {/* Brand - always visible */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-md bg-[var(--color-brand)] flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M3 11V5l5-3 5 3v6l-5 3-5-3Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M8 2v6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M3 5l5 3 5-3" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-sm font-semibold text-[var(--color-text-primary)] hidden sm:inline">
          {T.appTitle}
        </span>
      </div>

      {/* File indicator */}
      <div className={`hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md text-xs min-w-0 border border-transparent ${
        hasInput ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'
      }`}>
        {hasInput ? (
          <>
            <svg width="12" height="12" viewBox="0 0 16 16" className="shrink-0 text-[var(--color-brand)]">
              <path d="M5 2h4l3 3v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 2v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <span className="truncate max-w-[200px]">{fileLabel}</span>
            {hasInput && (
              <button
                type="button"
                onClick={() => {
                  if (state.file) dispatch({ type: 'SET_INPUT_FILE', file: null });
                  else dispatch({ type: 'SET_INPUT_URL', url: '' });
                }}
                className="p-0.5 rounded hover:bg-[var(--color-border)] text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] transition-colors shrink-0"
                aria-label="清除文件"
              >
                <svg width="10" height="10" viewBox="0 0 16 16">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 16 16" className="shrink-0">
              <path d="M8 2v8M5 6l3-3 3 3M2 12v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="truncate">拖放 PDF 文件</span>
          </>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Language pair - compact */}
      <div className="hidden sm:flex items-center">
        <LanguagePicker variant="compact" />
      </div>

      {/* Service - compact */}
      <div className="hidden md:block w-[100px]">
        <ServiceSelector variant="compact" />
      </div>

      {/* Spacer */}
      <div className="hidden sm:block w-2 shrink-0" />

      {/* Translate button */}
      <TranslateButton onTranslate={start} onCancel={cancel} compact />

      {/* Divider */}
      <div className="toolbar-divider hidden sm:block" />

      {/* Action icons */}
      <div className="flex items-center gap-0.5">
        {/* History */}
        {hasHistory && (
          <button type="button" onClick={onHistoryOpen} className="toolbar-btn" title={T.historyTitle} aria-label={T.historyTitle}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Theme */}
        <ThemeToggle />

        {/* Settings gear */}
        <button type="button" onClick={onSettingsOpen} className="toolbar-btn" title="设置" aria-label="设置">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
