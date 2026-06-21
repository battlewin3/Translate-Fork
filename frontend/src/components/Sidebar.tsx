import { useState } from 'react';
import { useTranslateState } from '../hooks/useTranslateState';
import { useTranslateDispatch } from '../hooks/useTranslateDispatch';
import { useTranslation } from '../hooks/useTranslation';
import { useJobHistory } from '../hooks/useJobHistory';
import { clearPreferences } from '../utils/preferences';
import ServiceSelector from './ServiceSelector';
import EnvKeyInputs from './EnvKeyInputs';
import LanguagePicker from './LanguagePicker';
import OutputModeSelect from './OutputModeSelect';
import PageRange from './PageRange';
import AdvancedOptions from './AdvancedOptions';
import TranslateButton from './TranslateButton';
import ProgressIndicator from './ProgressIndicator';
import DownloadPanel from './DownloadPanel';
import CollapsibleSection from './CollapsibleSection';
import { ErrorBanner } from './ErrorBanner';
import { CancelConfirmDialog } from './CancelConfirmDialog';
import { ThemeToggle } from './ThemeToggle';
import Footer from './Footer';
import { testService } from '../api/client';
import { useT } from '../i18n/useT';

interface SidebarProps {
  onHistoryOpen: () => void;
  hasHistory: boolean;
}

export default function Sidebar({ onHistoryOpen, hasHistory }: SidebarProps) {
  const T = useT();
  const state = useTranslateState();
  const dispatch = useTranslateDispatch();
  const { start, cancel, confirmCancel, dismissCancel, retry, cancelRequested } = useTranslation();
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const hasFile = !!(state.file || state.url);
  const isTranslating = state.status === 'uploading' || state.status === 'translating' || state.status === 'validating';
  const isComplete = state.status === 'completed';

  const fileLabel = state.file
    ? state.file.name
    : state.url
      ? (state.url.split('/').pop() || '在线文档')
      : null;

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <aside className="w-full lg:w-[320px] shrink-0 flex flex-col bg-[var(--color-surface-elevated)] border-r border-[var(--color-border)] lg:h-full overflow-y-auto scroll-thin">
      {/* Header */}
      <header className="animate-fade-in flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] shrink-0">
        <h1
          className="text-xl font-semibold truncate leading-tight"
          style={{ fontFamily: "'Dancing Script', cursive" }}
        >
          {T.appTitle}
        </h1>
        <div className="flex items-center gap-0.5 shrink-0">
          {hasHistory && (
            <button type="button" onClick={onHistoryOpen}
              className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors"
              title={T.historyTitle} aria-label={T.historyTitle}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 px-4 py-3 space-y-4">
        {/* File status indicator — only shown after upload */}
        {hasFile && (
          <div className="animate-slide-up flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[var(--color-brand-light)] border border-[var(--color-brand)]/20">
            <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0 text-[var(--color-brand)]">
              <path d="M5 2h4l3 3v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 2v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--color-brand)] truncate">{fileLabel}</p>
              {state.file && (
                <p className="text-[10px] text-[var(--color-text-tertiary)]">{formatSize(state.file.size)}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (state.file) dispatch({ type: 'SET_INPUT_FILE', file: null });
                else dispatch({ type: 'SET_INPUT_URL', url: '' });
              }}
              className="p-1 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-light)] transition-colors shrink-0"
              aria-label="清除文件"
            >
              <svg width="12" height="12" viewBox="0 0 16 16">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* Editing options — only shown after file uploaded or during translation */}
        {hasFile && (
          <div className="animate-fade-in space-y-4">
            {/* Language pair */}
            <LanguagePicker variant="full" />

            {/* Output mode */}
            <OutputModeSelect />

            {/* Error */}
            <ErrorBanner
              error={state.error}
              onDismiss={() => dispatch({ type: 'DISMISS_ERROR' })}
              onRetry={state.status === 'failed' ? retry : undefined}
            />

            {/* Translate / Cancel */}
            <TranslateButton onTranslate={start} onCancel={cancel} />

            {/* Progress (only when active) */}
            {isTranslating && <ProgressIndicator />}

            {/* Download (only when complete) */}
            {isComplete && <DownloadPanel />}
          </div>
        )}

        {/* Empty state hint (no file) */}
        {!hasFile && (
          <div className="animate-fade-in text-center py-8">
            <svg width="32" height="32" viewBox="0 0 16 16" className="mx-auto text-[var(--color-text-tertiary)] mb-3">
              <path d="M8 2v8M5 6l3-3 3 3M2 12v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-xs text-[var(--color-text-tertiary)]">{T.noFileHint}</p>
            <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1">{T.noFileHintSub}</p>
          </div>
        )}


        {/* === Translation Service (collapsible) === */}
        <CollapsibleSection title="翻译服务设置">
          <ServiceSelector variant="full" />
          <EnvKeyInputs />
          <button
            type="button"
            disabled={testing}
            onClick={async () => {
              setTesting(true);
              setTestResult(null);
              try {
                const res = await testService(state.service, state.envs);
                if (res.status === 'ok') {
                  setTestResult({ ok: true, text: `连接成功 · ${res.result} · ${res.elapsed_ms}ms` });
                } else {
                  setTestResult({ ok: false, text: `连接失败: ${res.error}` });
                }
              } catch (err) {
                setTestResult({ ok: false, text: `请求失败: ${err instanceof Error ? err.message : '未知错误'}` });
              } finally {
                setTesting(false);
              }
            }}
            className={`w-full text-xs rounded-md py-1.5 transition-colors ${
              testing
                ? 'bg-[var(--color-border)] text-[var(--color-text-tertiary)] cursor-wait'
                : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]'
            }`}
          >
            {testing ? '测试中...' : '测试服务连接'}
          </button>
          {testResult && (
            <p className={`text-xs ${testResult.ok ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
              {testResult.text}
            </p>
          )}
        </CollapsibleSection>


        {/* === Advanced Options (collapsible) === */}
        <CollapsibleSection title={T.advancedOptions}>
          <PageRange />
          <AdvancedOptions />

          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'RESET_FORM' });
              clearPreferences();
            }}
            className="w-full text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] transition-colors py-1"
          >
            {T.resetToDefault}
          </button>
        </CollapsibleSection>
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 shrink-0">
        <Footer />
      </div>

      {/* Cancel dialog */}
      <CancelConfirmDialog
        open={cancelRequested}
        onConfirm={confirmCancel}
        onDismiss={dismissCancel}
      />
    </aside>
  );
}
