import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslateState } from '../hooks/useTranslateState';
import { useTranslateDispatch } from '../hooks/useTranslateDispatch';
import { useServiceList } from '../hooks/useServiceList';
import { useT } from '../i18n/useT';

interface ServiceSelectorProps {
  variant?: 'full' | 'compact';
}

export default function ServiceSelector({ variant = 'full' }: ServiceSelectorProps) {
  const T = useT();
  const state = useTranslateState();
  const dispatch = useTranslateDispatch();
  const { services, loading, error: svcError, retry } = useServiceList();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = services.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  const isCompact = variant === 'compact';

  const selectService = useCallback((name: string) => {
    dispatch({ type: 'SET_SERVICE', service: name });
    setOpen(false);
    setSearch('');
  }, [dispatch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) return;

    const max = filtered.length - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((i) => (i >= max ? 0 : i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((i) => (i <= 0 ? max : i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setHighlightIndex(max >= 0 ? 0 : -1);
        break;
      case 'End':
        e.preventDefault();
        setHighlightIndex(max);
        break;
      case 'Enter':
        e.preventDefault();
        setHighlightIndex((i) => {
          if (i >= 0 && i < filtered.length) {
            selectService(filtered[i].name);
          }
          return i;
        });
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setSearch('');
        break;
    }
  }, [open, filtered, selectService]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[highlightIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  if (loading && services.length === 0) {
    return (
      <div className={isCompact ? '' : 'space-y-1'}>
        {!isCompact && <div className="block text-xs font-medium text-[var(--color-text-secondary)]">{T.serviceLabel}</div>}
        <div className={`rounded-lg bg-[var(--color-border)] animate-pulse ${isCompact ? 'h-8 w-24' : 'h-9'}`} />
      </div>
    );
  }

  if (svcError && services.length === 0) {
    return (
      <div className={isCompact ? '' : 'space-y-1'}>
        {!isCompact && <div className="block text-xs font-medium text-[var(--color-text-secondary)]">{T.serviceLabel}</div>}
        <div className="flex items-center gap-2 text-xs text-[var(--color-error)]">
          <span>{T.serviceError}</span>
          <button type="button" onClick={retry} className="underline">{T.serviceRetry}</button>
        </div>
      </div>
    );
  }

  const activeDescendant = highlightIndex >= 0 && filtered[highlightIndex]
    ? `svc-option-${filtered[highlightIndex].name.replace(/\s+/g, '-')}`
    : undefined;

  return (
    <div className={isCompact ? 'relative' : 'space-y-1'} ref={containerRef} onKeyDown={handleKeyDown}>
      {!isCompact && <label id="svc-label" className="block text-xs font-medium text-[var(--color-text-secondary)]">{T.serviceLabel}</label>}
      <div className="relative">
        <button type="button" aria-labelledby={isCompact ? undefined : 'svc-label'} aria-expanded={open} aria-haspopup="listbox"
          onClick={() => setOpen(!open)}
          className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-left flex items-center justify-between hover:border-[var(--color-border-focus)] transition-colors ${
            isCompact ? 'h-8 px-2 text-xs' : 'w-full h-9 px-3 text-sm'
          }`}>
          <span className="truncate">{state.service}</span>
          <svg width="10" height="10" viewBox="0 0 16 16" className={`transition-transform shrink-0 ml-1 ${open ? 'rotate-180' : ''}`}>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface-overlay)] border border-[var(--color-border)] rounded-lg shadow-lg z-30 max-h-56 flex flex-col animate-[dropdownIn_150ms_ease-out] min-w-[160px]">
            <div className="p-2 border-b border-[var(--color-border)]">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={T.serviceSearch}
                className="w-full h-8 px-2 rounded text-sm bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none" autoFocus />
            </div>
            <ul ref={listRef} role="listbox" aria-activedescendant={activeDescendant} className="overflow-y-auto py-1 scroll-thin">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-xs text-[var(--color-text-tertiary)]">无匹配服务</li>
              ) : filtered.map((svc, idx) => {
                const optId = `svc-option-${svc.name.replace(/\s+/g, '-')}`;
                const isSelected = svc.name === state.service;
                const isHighlighted = idx === highlightIndex;
                return (
                <li key={svc.name} id={optId} role="option" aria-selected={isSelected}
                  onClick={() => selectService(svc.name)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors ${
                    isSelected ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)] font-medium'
                    : isHighlighted ? 'bg-[var(--color-border)]'
                    : 'hover:bg-[var(--color-border)]'
                  }`}>
                  {isSelected && <svg width="12" height="12" viewBox="0 0 16 16"><path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  <span className={isSelected ? '' : 'ml-5'}>{svc.name}</span>
                </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      <style>{`@keyframes dropdownIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
