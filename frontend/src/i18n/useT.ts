import { useContext } from 'react';
import type { Translations } from './zh';
import { LocaleContext } from './context';
import type { LocaleContextValue } from './context';

/** Hook to access the current locale and translations. */
export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

/** Reactive hook — returns the current locale's translation object. */
export function useT(): Translations {
  return useLocale().t;
}
