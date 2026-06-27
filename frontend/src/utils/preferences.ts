import type { TranslateState } from '../reducers/translateReducer';

const PREFS_KEY = 'pdfmathtranslate_preferences';

export interface StorablePreferences {
  service: string;
  langFrom: string;
  langTo: string;
  outputMode: string;
  pageRange: string;
  customPages: string;
  threads: number;
  skipSubsetFonts: boolean;
  ignoreCache: boolean;
  vfont: string;
  customPrompt: string;
  translateMode: string;
  fileInputType: string;
  url: string;
}

/** Whitelist of known preference keys — anything else in stored data is ignored.
 *  NOTE: 'envs' is deliberately excluded — API keys must never be stored in
 *  plaintext localStorage (accessible to browser extensions and XSS). */
const VALID_KEYS: Set<string> = new Set([
  'service', 'langFrom', 'langTo', 'outputMode', 'pageRange',
  'customPages', 'threads', 'skipSubsetFonts', 'ignoreCache',
  'vfont', 'customPrompt', 'translateMode',
  'fileInputType', 'url',
]);

export function loadPreferences(): Partial<StorablePreferences> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (VALID_KEYS.has(key)) {
        filtered[key] = value;
      }
    }
    return filtered as Partial<StorablePreferences>;
  } catch {
    return {};
  }
}

export function savePreferences(state: TranslateState): void {
  try {
    const data: StorablePreferences = {
      service: state.service,
      langFrom: state.langFrom,
      langTo: state.langTo,
      outputMode: state.outputMode,
      pageRange: state.pageRange,
      customPages: state.customPages,
      threads: state.threads,
      skipSubsetFonts: state.skipSubsetFonts,
      ignoreCache: state.ignoreCache,
      vfont: state.vfont,
      customPrompt: state.customPrompt,
      translateMode: state.translateMode,
      fileInputType: state.fileInputType,
      url: state.url,
    };
    localStorage.setItem(PREFS_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable - silently ignore
  }
}

export function clearPreferences(): void {
  try {
    localStorage.removeItem(PREFS_KEY);
  } catch {
    // ignore
  }
}
