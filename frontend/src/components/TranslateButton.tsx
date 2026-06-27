import { useT } from '../i18n/useT';
import { useTranslateState } from '../hooks/useTranslateState';

interface TranslateButtonProps {
  onTranslate: () => void;
  onCancel: () => void;
  compact?: boolean;
}

export default function TranslateButton({ onTranslate, onCancel, compact }: TranslateButtonProps) {
  const T = useT();
  const state = useTranslateState();
  const isActive = state.status === 'uploading' || state.status === 'translating' || state.status === 'validating';
  const isDisabled = (!state.file && !state.url);

  if (isActive) {
    return (
      <button
        type="button"
        onClick={onCancel}
        className={`bg-[var(--color-error)] text-white font-semibold hover:opacity-90 hover:-translate-y-px active:translate-y-px active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm ${
          compact ? 'rounded-md h-8 px-3 text-xs' : 'w-full rounded-lg h-11 text-sm'
        }`}
        aria-label={T.cancel}
      >
        <svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        {compact ? T.cancel : (state.batchMode ? `取消 (${state.batchJobs.length})` : T.cancel)}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onTranslate}
      disabled={isDisabled && !state.batchMode}
      className={`bg-[var(--color-brand)] text-white font-semibold hover:opacity-90 hover:-translate-y-px hover:shadow-md active:translate-y-px active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-sm ${
        compact ? 'rounded-md h-8 px-4 text-xs min-w-[72px]' : 'w-full rounded-lg h-11 text-sm'
      }`}
      aria-label={T.translate}
    >
      {compact ? T.translate : (state.batchMode ? `批量翻译 (${state.batchJobs.length} 个文件)` : T.translate)}
    </button>
  );
}
