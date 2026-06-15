export type OutputMode = 'mono' | 'dual' | 'side';
export type FileInputType = 'file' | 'url';
export type TranslateMode = 'fast' | 'precise';
export type PageRangePreset = 'all' | 'first' | 'first5' | 'custom';
export type JobStatus = 'idle' | 'validating' | 'uploading' | 'translating' | 'completed' | 'cancelled' | 'failed';

export interface JobHistoryEntry {
  jobId: string;
  timestamp: number;
  fileName: string;
  service: string;
  langFrom: string;
  langTo: string;
  outputMode: OutputMode;
  status: 'completed' | 'cancelled' | 'failed';
  files?: Record<string, string>;
  error?: string;
}

export interface TranslateState {
  file: File | null;
  url: string;
  fileInputType: FileInputType;
  service: string;
  langFrom: string;
  langTo: string;
  outputMode: OutputMode;
  pageRange: PageRangePreset;
  customPages: string;
  threads: number;
  skipSubsetFonts: boolean;
  ignoreCache: boolean;
  vfont: string;
  customPrompt: string;
  translateMode: TranslateMode;
  envs: Record<string, string>;
  cancelRequested: boolean;
  jobId: string | null;
  status: JobStatus;
  progress: number;
  progressDesc: string;
  error: string | null;
  resultFiles: Record<string, string>;
  elapsedSeconds: number;
}

export type TranslateAction =
  | { type: 'SET_INPUT_FILE'; file: File | null }
  | { type: 'SET_INPUT_URL'; url: string }
  | { type: 'SET_INPUT_TYPE'; inputType: FileInputType }
  | { type: 'SET_SERVICE'; service: string }
  | { type: 'SET_LANG_FROM'; lang: string }
  | { type: 'SET_LANG_TO'; lang: string }
  | { type: 'SWAP_LANGUAGES' }
  | { type: 'SET_OUTPUT_MODE'; mode: OutputMode }
  | { type: 'SET_PAGE_RANGE'; range: PageRangePreset; customPages?: string }
  | { type: 'SET_CUSTOM_PAGES'; pages: string }
  | { type: 'SET_THREADS'; threads: number }
  | { type: 'SET_SKIP_FONT_SUBSET'; skip: boolean }
  | { type: 'SET_IGNORE_CACHE'; ignore: boolean }
  | { type: 'SET_VFONT'; vfont: string }
  | { type: 'SET_CUSTOM_PROMPT'; prompt: string }
  | { type: 'SET_TRANSLATE_MODE'; mode: TranslateMode }
  | { type: 'SET_ENV'; key: string; value: string }
  | { type: 'TRANSLATE_START' }
  | { type: 'TRANSLATE_UPLOADING'; progress: number }
  | { type: 'TRANSLATE_PROGRESS'; progress: number; desc: string; elapsedSeconds?: number; jobId?: string }
  | { type: 'TRANSLATE_COMPLETE'; jobId: string; files: Record<string, string> }
  | { type: 'TRANSLATE_FAILED'; error: string }
  | { type: 'TRANSLATE_CANCELLED' }
  | { type: 'TICK_ELAPSED'; seconds: number }
  | { type: 'REQUEST_CANCEL' }
  | { type: 'DISMISS_CANCEL' }
  | { type: 'LOAD_PREFERENCES'; preferences: Record<string, unknown> }
  | { type: 'DISMISS_ERROR' }
  | { type: 'RESET_FORM' };

export const initialState: TranslateState = {
  file: null,
  url: '',
  fileInputType: 'file',
  service: 'google',
  langFrom: 'en',
  langTo: 'zh',
  outputMode: 'mono',
  pageRange: 'all',
  customPages: '',
  threads: 4,
  skipSubsetFonts: false,
  ignoreCache: false,
  vfont: '',
  customPrompt: '',
  translateMode: 'fast',
  envs: {},
  cancelRequested: false,
  jobId: null,
  status: 'idle',
  progress: 0,
  progressDesc: '',
  error: null,
  resultFiles: {},
  elapsedSeconds: 0,
};

export function translateReducer(state: TranslateState, action: TranslateAction): TranslateState {
  switch (action.type) {
    case 'SET_INPUT_FILE':
      return { ...state, file: action.file, url: '', error: null };
    case 'SET_INPUT_URL':
      return { ...state, url: action.url, file: null, error: null };
    case 'SET_INPUT_TYPE':
      return { ...state, fileInputType: action.inputType, file: null, url: '', error: null };
    case 'SET_SERVICE':
      return { ...state, service: action.service };
    case 'SET_LANG_FROM':
      return { ...state, langFrom: action.lang };
    case 'SET_LANG_TO':
      return { ...state, langTo: action.lang };
    case 'SWAP_LANGUAGES':
      return { ...state, langFrom: state.langTo, langTo: state.langFrom };
    case 'SET_OUTPUT_MODE':
      return { ...state, outputMode: action.mode };
    case 'SET_PAGE_RANGE':
      return { ...state, pageRange: action.range, customPages: action.customPages ?? state.customPages };
    case 'SET_CUSTOM_PAGES':
      return { ...state, customPages: action.pages };
    case 'SET_THREADS':
      return { ...state, threads: action.threads };
    case 'SET_SKIP_FONT_SUBSET':
      return { ...state, skipSubsetFonts: action.skip };
    case 'SET_IGNORE_CACHE':
      return { ...state, ignoreCache: action.ignore };
    case 'SET_VFONT':
      return { ...state, vfont: action.vfont };
    case 'SET_CUSTOM_PROMPT':
      return { ...state, customPrompt: action.prompt };
    case 'SET_TRANSLATE_MODE':
      return { ...state, translateMode: action.mode };
    case 'SET_ENV':
      return { ...state, envs: { ...state.envs, [action.key]: action.value } };
    case 'TRANSLATE_START':
      return { ...state, status: 'validating', progress: 0, progressDesc: '', error: null, elapsedSeconds: 0, cancelRequested: false };
    case 'TRANSLATE_UPLOADING':
      return { ...state, status: 'uploading', progress: action.progress, progressDesc: '上传中...' };
    case 'TRANSLATE_PROGRESS':
      return {
        ...state,
        status: 'translating',
        progress: action.progress,
        progressDesc: action.desc,
        jobId: action.jobId ?? state.jobId,
        elapsedSeconds: action.elapsedSeconds ?? state.elapsedSeconds,
      };
    case 'TRANSLATE_COMPLETE':
      return {
        ...state,
        status: 'completed',
        progress: 1,
        progressDesc: '翻译完成！',
        jobId: action.jobId,
        resultFiles: action.files,
        error: null,
        cancelRequested: false,
      };
    case 'TRANSLATE_FAILED':
      return { ...state, status: 'failed', error: action.error, progressDesc: '', cancelRequested: false };
    case 'TRANSLATE_CANCELLED':
      return { ...state, status: 'cancelled', progress: 0, progressDesc: '翻译已取消', cancelRequested: false };
    case 'TICK_ELAPSED':
      return { ...state, elapsedSeconds: action.seconds };
    case 'REQUEST_CANCEL':
      return { ...state, cancelRequested: true };
    case 'DISMISS_CANCEL':
      return { ...state, cancelRequested: false };
    case 'LOAD_PREFERENCES':
      return {
        ...state,
        ...action.preferences,
      };
    case 'DISMISS_ERROR':
      return { ...state, error: null };
    case 'RESET_FORM':
      return { ...initialState, resultFiles: state.resultFiles };
    default:
      return state;
  }
}
