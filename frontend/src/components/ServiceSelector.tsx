import { useState, useRef, useEffect } from 'react';
import { useTranslateState } from '../hooks/useTranslateState';
import { useTranslateDispatch } from '../hooks/useTranslateDispatch';
import { useServiceList } from '../hooks/useServiceList';
import { T } from '../i18n/zh';

interface ServiceSelectorProps {
  variant?: 'full' | 'compact';
}

export default function ServiceSelector({ variant = 'full' }: ServiceSelectorProps) {
  const state = useTranslateState();
  const dispatch = useTranslateDispatch();
  const { services, loading, error: svcError, retry } = useServiceList();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = services.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  const isCompact = variant === 'compact';

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

  return (
    <div className={isCompact ? 'relative' : 'space-y-1'} ref={containerRef}>
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
            <ul role="listbox" className="overflow-y-auto py-1 scroll-thin">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-xs text-[var(--color-text-tertiary)]">无匹配服务</li>
              ) : filtered.map((svc) => (
                <li key={svc.name} role="option" aria-selected={svc.name === state.service}
                  onClick={() => { dispatch({ type: 'SET_SERVICE', service: svc.name }); setOpen(false); setSearch(''); }}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors ${
                    svc.name === state.service ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)] font-medium' : 'hover:bg-[var(--color-border)]'
                  }`}>
                  {svc.name === state.service && <svg width="12" height="12" viewBox="0 0 16 16"><path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  <span className={svc.name === state.service ? '' : 'ml-5'}>{svc.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <style>{`@keyframes dropdownIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
