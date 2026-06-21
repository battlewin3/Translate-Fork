import { useState, useCallback } from 'react';
import { useTranslateDispatch } from '../hooks/useTranslateDispatch';
import { useT } from '../i18n/useT';

export default function URLInput() {
  const T = useT();
  const dispatch = useTranslateDispatch();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  const validate = useCallback((url: string) => {
    if (!url) { setError(null); setIsValid(false); return; }
    try {
      const p = new URL(url);
      if (p.protocol !== 'http:' && p.protocol !== 'https:') {
        setError(T.urlInvalid); setIsValid(false); return;
      }
      setError(null); setIsValid(true);
    } catch { setError(T.urlInvalid); setIsValid(false); }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    dispatch({ type: 'SET_INPUT_URL', url: v });
  };

  return (
    <div className="space-y-1">
      <label htmlFor="url-input" className="block text-xs font-medium text-[var(--color-text-secondary)]">
        {T.orInputURL}
      </label>
      <div className="relative">
        <input
          id="url-input" type="url" value={value} onChange={handleChange}
          onBlur={() => validate(value)}
          placeholder={T.urlPlaceholder}
          className={`w-full h-9 px-3 pr-8 rounded-lg border text-sm bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-0 focus:border-[var(--color-border-focus)] transition-colors ${
            error ? 'border-[var(--color-error)]' : isValid ? 'border-[var(--color-success)]' : 'border-[var(--color-border)]'
          }`}
        />
        {value && (
          <button type="button" onClick={() => { setValue(''); setError(null); setIsValid(false); dispatch({ type: 'SET_INPUT_URL', url: '' }); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]" aria-label={T.clearFile}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>
      {error && <p className="text-xs text-[var(--color-error)]" role="alert">{error}</p>}
    </div>
  );
}
