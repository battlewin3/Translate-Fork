import { T } from '../i18n/zh';

interface TranslateButtonProps {
  status: 'idle' | 'translating' | 'complete' | 'cancelled' | 'failed';
  disabled: boolean;
  onTranslate: () => void;
  onCancel: () => void;
}

export default function TranslateButton({
  status,
  disabled,
  onTranslate,
  onCancel,
}: TranslateButtonProps) {
  const isActive = status === 'translating';

  if (isActive) {
    return (
      <button
        type="button"
        onClick={onCancel}
        className="w-full bg-error text-white rounded-lg px-6 py-3 font-semibold hover:bg-red-700 hover:shadow-md active:scale-[0.98] transition-all duration-150 text-sm"
      >
        <span className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          {T.cancel}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onTranslate}
      disabled={disabled}
      className="w-full bg-brand text-white rounded-lg px-6 py-3 font-semibold hover:bg-brand-deep hover:shadow-md active:scale-[0.98] transition-all duration-150 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100"
    >
      {T.translate}
    </button>
  );
}
