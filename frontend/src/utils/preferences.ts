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
  envs: Record<string, string>;
  fileInputType: string;
  url: string;
}

export function loadPreferences(): Partial<StorablePreferences> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
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
      envs: state.envs,
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
