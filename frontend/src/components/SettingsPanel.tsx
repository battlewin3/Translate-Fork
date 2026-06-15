import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslateState } from '../hooks/useTranslateState';
import { useTranslateDispatch } from '../hooks/useTranslateDispatch';
import { useTranslation } from '../hooks/useTranslation';
import { clearPreferences } from '../utils/preferences';
import InputSection from './InputSection';
import ServiceSelector from './ServiceSelector';
import EnvKeyInputs from './EnvKeyInputs';
import LanguagePicker from './LanguagePicker';
import OutputModeSelect from './OutputModeSelect';
import PageRange from './PageRange';
import AdvancedOptions from './AdvancedOptions';
import TranslateButton from './TranslateButton';
import { ErrorBanner } from './ErrorBanner';
import { CancelConfirmDialog } from './CancelConfirmDialog';
import Footer from './Footer';
import { T } from '../i18n/zh';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const state = useTranslateState();
  const dispatch = useTranslateDispatch();
  const { start, cancel, confirmCancel, dismissCancel, retry, cancelRequested } = useTranslation();
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setClosing(true);
  }, []);

  const handleAnimationEnd = useCallback(() => {
    if (closing) {
      setClosing(false);
      onClose();
    }
  }, [closing, onClose]);

  // ESC key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Focus panel on open
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus();
    }
  }, [open]);

  if (!open && !closing) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 ${
          closing ? 'animate-backdrop-out' : 'animate-backdrop-in'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="设置"
        tabIndex={-1}
        className={`fixed top-0 right-0 h-full z-50 bg-[var(--color-surface-elevated)] flex flex-col outline-none
          w-full max-w-[calc(100vw-32px)] sm:max-w-[360px]
          ${closing ? 'animate-panel-out' : 'animate-panel-in'}`}
        onAnimationEnd={handleAnimationEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] shrink-0">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">设置</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors"
            aria-label="关闭设置"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4 space-y-5">
          <InputSection />

          <div className="space-y-4">
            <ServiceSelector variant="full" />
            <EnvKeyInputs />
          </div>

          <LanguagePicker variant="full" />
          <OutputModeSelect />
          <PageRange />
          <AdvancedOptions />

          <ErrorBanner
            error={state.error}
            onDismiss={() => dispatch({ type: 'DISMISS_ERROR' })}
            onRetry={state.status === 'failed' ? retry : undefined}
          />

          <TranslateButton onTranslate={start} onCancel={cancel} />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--color-border)] space-y-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'RESET_FORM' });
              clearPreferences();
            }}
            className="w-full text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] transition-colors py-1"
          >
            重置为默认设置
          </button>
          <Footer />
        </div>

        <CancelConfirmDialog open={cancelRequested} onConfirm={confirmCancel} onDismiss={dismissCancel} />
      </div>
    </>
  );
}
