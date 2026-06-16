import { useTranslateState } from '../hooks/useTranslateState';
import { useTranslateDispatch } from '../hooks/useTranslateDispatch';
import { useT } from '../i18n/useT';
import type { PageRangePreset } from '../reducers/translateReducer';

export default function PageRange() {
  const T = useT();
  const state = useTranslateState();

  const presets: { value: PageRangePreset; label: string }[] = [
    { value: 'all', label: T.pageAll },
    { value: 'first', label: T.pageFirst },
    { value: 'first5', label: T.pageFirst5 },
    { value: 'custom', label: T.pageCustom },
  ];
  const dispatch = useTranslateDispatch();

  return (
    <div className="space-y-2">
      <div className="block text-xs font-medium text-[var(--color-text-secondary)]">{T.pageRange}</div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button key={p.value} type="button"
            onClick={() => dispatch({ type: 'SET_PAGE_RANGE', range: p.value })}
            className={`px-3 py-1 text-xs rounded-md border transition-all active:scale-[0.98] ${
              state.pageRange === p.value
                ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)]'
                : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-focus)]'
            }`}>
            {p.label}
          </button>
        ))}
      </div>
      {state.pageRange === 'custom' && (
        <div>
          <input type="text"
            value={state.customPages}
            onChange={(e) => dispatch({ type: 'SET_CUSTOM_PAGES', pages: e.target.value })}
            placeholder={T.customPageHint}
            className="w-full h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-sm focus:outline-none focus:ring-0 focus:border-[var(--color-border-focus)] transition-colors" />
          <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">{T.customPageHint}</p>
        </div>
      )}
    </div>
  );
}
