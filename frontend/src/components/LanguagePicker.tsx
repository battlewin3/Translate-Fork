import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslateState } from '../hooks/useTranslateState';
import { useTranslateDispatch } from '../hooks/useTranslateDispatch';
import { useLanguageList } from '../hooks/useLanguageList';
import { useT } from '../i18n/useT';

function ComboboxSelect({
  labelId, value, options, onChange, placeholder, loading, compact,
}: {
  labelId: string; value: string; options: { name: string; code: string }[];
  onChange: (code: string) => void; placeholder: string; loading: boolean;
  compact?: boolean;
}) {
  const T = useT();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) || o.code.toLowerCase().includes(search.toLowerCase())
  );
  const selected = options.find((o) => o.code === value);

  const selectOption = useCallback((code: string) => {
    onChange(code);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) return;
    const max = filtered.length - 1;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setHighlightIndex((i) => (i >= max ? 0 : i + 1)); break;
      case 'ArrowUp': e.preventDefault(); setHighlightIndex((i) => (i <= 0 ? max : i - 1)); break;
      case 'Home': e.preventDefault(); setHighlightIndex(max >= 0 ? 0 : -1); break;
      case 'End': e.preventDefault(); setHighlightIndex(max); break;
      case 'Enter':
        e.preventDefault();
        setHighlightIndex((i) => {
          if (i >= 0 && i < filtered.length) selectOption(filtered[i].code);
          return i;
        });
        break;
      case 'Escape': e.preventDefault(); setOpen(false); setSearch(''); break;
    }
  }, [open, filtered, selectOption]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[highlightIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  if (loading) return <div className={`rounded-lg bg-[var(--color-border)] animate-pulse ${compact ? 'h-8' : 'h-9'}`} />;

  const activeDescendant = highlightIndex >= 0 && filtered[highlightIndex]
    ? `lang-opt-${filtered[highlightIndex].code}`
    : undefined;

  return (
    <div className="relative" ref={containerRef} onKeyDown={handleKeyDown}>
      <button type="button" aria-labelledby={labelId} aria-expanded={open} aria-haspopup="listbox"
        onClick={() => setOpen(!open)}
        className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-left flex items-center justify-between hover:border-[var(--color-border-focus)] transition-colors w-full ${
          compact ? 'h-8 px-2 text-xs' : 'h-9 px-3 text-sm'
        }`}>
        <span className={selected ? 'text-[var(--color-text-primary)] truncate' : 'text-[var(--color-text-tertiary)] truncate'}>
          {selected ? selected.name : placeholder}
        </span>
        <svg width="10" height="10" viewBox="0 0 16 16" className={`transition-transform shrink-0 ml-1 ${open ? 'rotate-180' : ''}`}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface-overlay)] border border-[var(--color-border)] rounded-lg shadow-lg z-30 max-h-48 flex flex-col animate-[dropdownIn_150ms_ease-out] min-w-[160px]">
          <div className="p-2 border-b border-[var(--color-border)]">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={T.langSearch}
              className={`w-full px-2 rounded bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none ${compact ? 'h-7 text-xs' : 'h-8 text-sm'}`} autoFocus />
          </div>
          <ul ref={listRef} role="listbox" aria-activedescendant={activeDescendant} className="overflow-y-auto py-1 scroll-thin">
            {filtered.map((l, idx) => {
              const isSelected = l.code === value;
              const isHighlighted = idx === highlightIndex;
              return (
              <li key={l.code} id={`lang-opt-${l.code}`} role="option" aria-selected={isSelected}
                onClick={() => selectOption(l.code)}
                onMouseEnter={() => setHighlightIndex(idx)}
                className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors ${
                  compact ? 'text-xs' : 'text-sm'
                } ${
                  isSelected ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)] font-medium'
                  : isHighlighted ? 'bg-[var(--color-border)]'
                  : 'hover:bg-[var(--color-border)]'
                }`}>
                {isSelected && <svg width="12" height="12" viewBox="0 0 16 16"><path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                <span className={isSelected ? '' : 'ml-5'}>{l.name}</span>
                <span className="text-[var(--color-text-tertiary)] ml-auto">{l.code}</span>
              </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

interface LanguagePickerProps {
  variant?: 'full' | 'compact';
}

export default function LanguagePicker({ variant = 'full' }: LanguagePickerProps) {
  const T = useT();
  const state = useTranslateState();
  const dispatch = useTranslateDispatch();
  const { languages, loading, error, retry } = useLanguageList();

  if (error && languages.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--color-error)]">
        <span>{T.langError}</span>
        <button type="button" onClick={retry} className="underline">{T.serviceRetry}</button>
      </div>
    );
  }

  const isCompact = variant === 'compact';

  return (
    <div className={`flex items-center gap-1 ${isCompact ? '' : 'grid grid-cols-[1fr_auto_1fr] gap-2 items-end'}`}>
      <div className={isCompact ? 'flex-1 min-w-0' : 'space-y-1'}>
        {!isCompact && <label id="lang-from-label" className="block text-xs font-medium text-[var(--color-text-secondary)]">{T.langFromLabel}</label>}
        <ComboboxSelect labelId={isCompact ? 'lang-from-compact' : 'lang-from-label'} value={state.langFrom} options={languages}
          onChange={(code) => dispatch({ type: 'SET_LANG_FROM', lang: code })} placeholder={T.langSearch} loading={loading}
          compact={isCompact} />
      </div>
      <button type="button"
        onClick={() => dispatch({ type: 'SWAP_LANGUAGES' })}
        className={`rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-brand)] hover:bg-[var(--color-brand-light)] transition-colors flex-shrink-0 ${
          isCompact ? 'p-1 w-7 h-7 flex items-center justify-center' : 'p-1.5 mb-0.5'
        }`}
        title={T.langSwap} aria-label={T.langSwap}>
        <svg width="14" height="14" viewBox="0 0 16 16"><path d="M4 6h8M4 6l2-2M4 6l2 2M12 10H4M12 10l-2 2M12 10l-2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <div className={isCompact ? 'flex-1 min-w-0' : 'space-y-1'}>
        {!isCompact && <label id="lang-to-label" className="block text-xs font-medium text-[var(--color-text-secondary)]">{T.langToLabel}</label>}
        <ComboboxSelect labelId={isCompact ? 'lang-to-compact' : 'lang-to-label'} value={state.langTo} options={languages}
          onChange={(code) => dispatch({ type: 'SET_LANG_TO', lang: code })} placeholder={T.langSearch} loading={loading}
          compact={isCompact} />
      </div>
    </div>
  );
}
