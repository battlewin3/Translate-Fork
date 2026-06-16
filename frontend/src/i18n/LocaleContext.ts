import { createContext } from 'react';
import { T as ZH } from './zh';
import type { Translations } from './zh';

export type Locale = 'zh' | 'en';

export interface LocaleContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: 'zh' as Locale,
  t: ZH as Translations,
  setLocale: () => {},
});
