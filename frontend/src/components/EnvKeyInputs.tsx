import { useState, useRef, useEffect } from 'react';
import { useTranslateState } from '../hooks/useTranslateState';
import { useTranslateDispatch } from '../hooks/useTranslateDispatch';
import { useServiceList } from '../hooks/useServiceList';
import { useSetupStatus } from '../hooks/useSetupStatus';
import { getModelSuggestions } from '../utils/modelList';
import { useT } from '../i18n/useT';

function isApiKey(key: string, isApiKeyFlag: boolean): boolean {
  if (isApiKeyFlag) return true;
  const upper = key.toUpperCase();
  return upper.includes('API_KEY') || upper.includes('APIKEY') || upper.endsWith('_KEY');
}

function isModelKey(key: string): boolean {
  return key.toUpperCase().endsWith('_MODEL');
}

function ModelField({
  envKey, value, defaultValue, serviceName, onChange,
}: {
  envKey: string; value: string; defaultValue: string; serviceName: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestions = getModelSuggestions(serviceName);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const displayValue = value || defaultValue;

  return (
    <div className="space-y-1" ref={containerRef}>
      <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
        {envKey}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={defaultValue || `输入 ${envKey}`}
          className="w-full h-9 px-3 rounded-lg border text-sm bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-0 focus:border-[var(--color-border-focus)] transition-colors border-[var(--color-border)]"
        />
        {suggestions.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-brand)] transition-colors"
            title="选择模型"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        {open && suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface-overlay)] border border-[var(--color-border)] rounded-lg shadow-lg z-30 max-h-40 overflow-y-auto py-1 animate-[dropdownIn_150ms_ease-out]">
            {suggestions.map((m) => (
              <li
                key={m}
                onClick={() => { onChange(m); setOpen(false); }}
                className={`px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                  displayValue === m
                    ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)] font-medium'
                    : 'hover:bg-[var(--color-border)]'
                }`}
              >
                {m}
              </li>
            ))}
          </ul>
        )}
      </div>
      {defaultValue && (
        <p className="text-[11px] text-[var(--color-text-tertiary)]">默认: {defaultValue}</p>
      )}
    </div>
  );
}

export default function EnvKeyInputs() {
  const T = useT();
  const state = useTranslateState();
  const dispatch = useTranslateDispatch();
  const { services } = useServiceList();
  const { status: setupStatus } = useSetupStatus();
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [usingDefaults, setUsingDefaults] = useState<Record<string, boolean>>({});

  const service = services.find((s) => s.name === state.service);
  const envs = service?.envs || [];

  // Lookup backend config status for the currently selected service
  const serviceSetup = setupStatus?.services?.find((s) => s.name === state.service);
  const getBackendEnvStatus = (key: string): { isSet: boolean; isSensitive: boolean } => {
    if (!serviceSetup) return { isSet: false, isSensitive: false };
    const env = serviceSetup.envs.find((e) => e.key === key);
    return { isSet: env?.is_set ?? false, isSensitive: env?.is_sensitive ?? false };
  };

  if (envs.length === 0) return null;

  const apiKeyEnvs = envs.filter((e) => isApiKey(e.key, e.is_api_key));
  const modelEnvs = envs.filter((e) => !isApiKey(e.key, e.is_api_key) && isModelKey(e.key));
  const otherEnvs = envs.filter((e) => !isApiKey(e.key, e.is_api_key) && !isModelKey(e.key));

  return (
    <div className="space-y-3">
      {/* API Keys — password fields with show/hide */}
      {apiKeyEnvs.map((env) => {
        const isVisible = visibleKeys[env.key] || false;
        const isUsingDefault = usingDefaults[env.key] || false;
        const currentValue = state.envs[env.key] ?? '';
        const backendStatus = getBackendEnvStatus(env.key);
        // Show "configured" badge when backend has a value but UI has no input yet
        const showConfiguredBadge = backendStatus.isSet && !currentValue && !isUsingDefault;

        return (
          <div key={env.key} className="space-y-1">
            <label htmlFor={`env-${env.key}`} className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
              <span>{env.key}</span>
              {showConfiguredBadge && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-px text-[11px] rounded-full bg-[var(--color-success-light)] text-[var(--color-success)]">
                  <svg width="10" height="10" viewBox="0 0 16 16"><path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                  {T.envKeyConfiguredLabel || '已配置'}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                id={`env-${env.key}`}
                type={isVisible ? 'text' : 'password'}
                value={isUsingDefault ? env.default : currentValue}
                onChange={(e) => dispatch({ type: 'SET_ENV', key: env.key, value: e.target.value })}
                disabled={isUsingDefault}
                placeholder={showConfiguredBadge ? (T.envKeyConfiguredPlaceholder || '已配置 (重新输入以覆盖)') : (isUsingDefault ? env.default : `输入 ${env.key}`)}
                className={`w-full h-9 px-3 pr-16 rounded-lg border text-sm bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-0 focus:border-[var(--color-border-focus)] transition-colors ${
                  isUsingDefault ? 'opacity-50' : ''
                } ${showConfiguredBadge ? 'border-[var(--color-success)]' : 'border-[var(--color-border)]'}`}
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                {env.default && (
                  <button type="button"
                    onClick={() => {
                      const next = !usingDefaults[env.key];
                      dispatch({ type: 'SET_ENV', key: env.key, value: next ? env.default : '' });
                      setUsingDefaults((prev) => ({ ...prev, [env.key]: next }));
                    }}
                    className={`px-1.5 py-0.5 text-[11px] rounded transition-colors ${
                      isUsingDefault ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                    }`}>
                    {T.envKeyDefaultLabel}
                  </button>
                )}
                <button type="button"
                  onClick={() => setVisibleKeys((prev) => ({ ...prev, [env.key]: !prev[env.key] }))}
                  className="p-1 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                  title={isVisible ? T.envKeyHideLabel : T.envKeyShowLabel}>
                  {isVisible ? (
                    <svg width="14" height="14" viewBox="0 0 16 16"><path d="M8 3C4.5 3 1.5 8 1.5 8s3 5 6.5 5 6.5-5 6.5-5-3-5-6.5-5Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 16 16"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/></svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Model envs — text input with dropdown suggestions */}
      {modelEnvs.map((env) => (
        <ModelField
          key={env.key}
          envKey={env.key}
          value={state.envs[env.key] ?? ''}
          defaultValue={env.default}
          serviceName={state.service}
          onChange={(v) => dispatch({ type: 'SET_ENV', key: env.key, value: v })}
        />
      ))}

      {/* Other settings (host, endpoint, etc.) — plain text inputs */}
      {otherEnvs.map((env) => {
        const currentValue = state.envs[env.key] ?? '';

        return (
          <div key={env.key} className="space-y-1">
            <label htmlFor={`env-${env.key}`} className="block text-xs font-medium text-[var(--color-text-secondary)]">
              {env.key}
            </label>
            <input
              id={`env-${env.key}`}
              type="text"
              value={currentValue}
              onChange={(e) => dispatch({ type: 'SET_ENV', key: env.key, value: e.target.value })}
              placeholder={env.default || `输入 ${env.key}`}
              className="w-full h-9 px-3 rounded-lg border text-sm bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-0 focus:border-[var(--color-border-focus)] transition-colors border-[var(--color-border)]"
            />
            {env.default && (
              <p className="text-[11px] text-[var(--color-text-tertiary)]">默认: {env.default}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
