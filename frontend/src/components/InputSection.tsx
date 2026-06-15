import { useTranslateState } from '../hooks/useTranslateState';
import { useTranslateDispatch } from '../hooks/useTranslateDispatch';
import { T } from '../i18n/zh';
import FileDropZone from './FileDropZone';
import URLInput from './URLInput';

const inputTypes = [
  { value: 'file' as const, label: T.fileTypeFile },
  { value: 'url' as const, label: T.fileTypeLink },
];

export default function InputSection() {
  const state = useTranslateState();
  const dispatch = useTranslateDispatch();

  return (
    <div className="space-y-3">
      <div className="flex rounded-lg bg-[var(--color-border)] p-0.5" role="radiogroup" aria-label="输入方式">
        {inputTypes.map((t) => (
          <button key={t.value} type="button" role="radio"
            aria-checked={state.fileInputType === t.value}
            onClick={() => dispatch({ type: 'SET_INPUT_TYPE', inputType: t.value })}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              state.fileInputType === t.value
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      {state.fileInputType === 'file' ? <FileDropZone /> : <URLInput />}
    </div>
  );
}
