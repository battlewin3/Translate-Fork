import { useTranslateState } from '../hooks/useTranslateState';
import { useTranslateDispatch } from '../hooks/useTranslateDispatch';
import { useT } from '../i18n/useT';
import type { OutputMode } from '../reducers/translateReducer';

export default function OutputModeSelect() {
  const T = useT();
  const state = useTranslateState();
  const dispatch = useTranslateDispatch();

  const modes: { value: OutputMode; label: string; desc: string; isNew?: boolean }[] = [
    { value: 'mono', label: T.outputModeMono, desc: T.outputModeMonoDesc },
    { value: 'dual', label: T.outputModeDual, desc: T.outputModeDualDesc },
    { value: 'side', label: T.outputModeSide, desc: T.outputModeSideDesc, isNew: true },
  ];

  return (
    <div className="space-y-2">
      <div className="block text-xs font-medium text-[var(--color-text-secondary)]">{T.outputMode}</div>
      <div className="space-y-2">
        {modes.map((mode) => {
          const selected = state.outputMode === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => dispatch({ type: 'SET_OUTPUT_MODE', mode: mode.value })}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-150 flex items-start gap-3 ${
                selected
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-border-focus)]'
              }`}
            >
              {/* Icon representation */}
              <div className="w-8 h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center shrink-0 mt-0.5">
                {mode.value === 'mono' ? (
                  <svg width="16" height="16" viewBox="0 0 16 16"><rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>
                ) : mode.value === 'dual' ? (
                  <svg width="16" height="16" viewBox="0 0 16 16"><rect x="3" y="1" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="3" y="9" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="2" width="6.5" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="8.5" y="2" width="6.5" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${selected ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-primary)]'}`}>
                    {mode.label}
                  </span>
                  {mode.isNew && (
                    <span className="text-[10px] font-medium bg-[var(--color-success-light)] text-[var(--color-success)] px-1.5 py-0.5 rounded-full">{T.newFeature}</span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">{mode.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
