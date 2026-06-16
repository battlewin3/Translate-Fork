import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { T as ZH } from './zh';
import type { Translations } from './zh';
import { EN } from './en';
import { type Locale, LocaleContext, type LocaleContextValue } from './LocaleContext';

export type { Locale } from './LocaleContext';
export type { LocaleContextValue } from './LocaleContext';
export { LocaleContext } from './LocaleContext';

const translations: Record<Locale, Translations> = { zh: ZH, en: EN };

const LOCALE_KEY = 'pdfmathtranslate_locale';

function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
  } catch { /* ignore */ }
  return 'zh';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try { localStorage.setItem(LOCALE_KEY, next); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  }, [locale]);

  const value: LocaleContextValue = {
    locale,
    t: translations[locale],
    setLocale,
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}
