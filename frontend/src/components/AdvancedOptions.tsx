import { useTranslateState } from '../hooks/useTranslateState';
import { useTranslateDispatch } from '../hooks/useTranslateDispatch';
import { useServiceList } from '../hooks/useServiceList';
import { useT } from '../i18n/useT';
import type { TranslateMode } from '../reducers/translateReducer';

export default function AdvancedOptions() {
  const T = useT();
  const state = useTranslateState();
  const dispatch = useTranslateDispatch();
  const { services } = useServiceList();

  const service = services.find((s) => s.name === state.service);
  const showCustomPrompt = service?.custom_prompt ?? false;

  return (
    <div className="space-y-3">
      {/* Threads */}
      <div className="space-y-1">
        <label htmlFor="threads-input" className="block text-xs font-medium text-[var(--color-text-secondary)]">{T.threads}</label>
        <input id="threads-input" type="number" min={1} max={16}
          value={state.threads}
          onChange={(e) => dispatch({ type: 'SET_THREADS', threads: Math.max(1, Math.min(16, parseInt(e.target.value) || 1)) })}
          className="w-full h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:ring-0 focus:border-[var(--color-border-focus)] transition-colors"
        />
        <p className="text-[11px] text-[var(--color-text-tertiary)] leading-relaxed">{T.threadsHint}</p>
      </div>

      {/* Translate mode */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-[var(--color-text-secondary)]">{T.translateMode}</div>
        <div className="flex gap-2">
          {(['fast', 'precise'] as TranslateMode[]).map((mode) => (
            <button key={mode} type="button"
              onClick={() => dispatch({ type: 'SET_TRANSLATE_MODE', mode })}
              className={`flex-1 px-3 py-1.5 text-xs rounded-md border transition-all active:scale-[0.98] ${
                state.translateMode === mode
                  ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)]'
                  : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-focus)]'
              }`}>
              {mode === 'fast' ? T.modeFast : T.modePrecise}
            </button>
          ))}
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-2">
        <div className="space-y-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={state.skipSubsetFonts}
              onChange={(e) => dispatch({ type: 'SET_SKIP_FONT_SUBSET', skip: e.target.checked })}
              className="accent-[var(--color-brand)] w-4 h-4 rounded" />
            <span className="text-xs text-[var(--color-text-secondary)]">{T.skipFontSubset}</span>
          </label>
          <p className="text-[11px] text-[var(--color-text-tertiary)] leading-relaxed ml-6">{T.skipFontSubsetHint}</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={state.ignoreCache}
            onChange={(e) => dispatch({ type: 'SET_IGNORE_CACHE', ignore: e.target.checked })}
            className="accent-[var(--color-brand)] w-4 h-4 rounded" />
          <span className="text-xs text-[var(--color-text-secondary)]">{T.ignoreCache}</span>
        </label>
      </div>

      {/* Vfont */}
      <div className="space-y-1">
        <label htmlFor="vfont-input" className="block text-xs font-medium text-[var(--color-text-secondary)]">{T.vfontLabel}</label>
        <input id="vfont-input" type="text" value={state.vfont}
          onChange={(e) => dispatch({ type: 'SET_VFONT', vfont: e.target.value })}
          placeholder={T.vfontHint}
          className="w-full h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:ring-0 focus:border-[var(--color-border-focus)] transition-colors" />
      </div>

      {/* Custom Prompt */}
      {showCustomPrompt && (
        <div className="space-y-1">
          <label htmlFor="prompt-input" className="block text-xs font-medium text-[var(--color-text-secondary)]">{T.customPrompt}</label>
          <textarea id="prompt-input" value={state.customPrompt}
            onChange={(e) => dispatch({ type: 'SET_CUSTOM_PROMPT', prompt: e.target.value })}
            rows={3}
            className="w-full px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:ring-0 focus:border-[var(--color-border-focus)] transition-colors resize-y" />
        </div>
      )}
    </div>
  );
}
