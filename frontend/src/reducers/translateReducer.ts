export type OutputMode = 'mono' | 'dual' | 'side';
export type FileInputType = 'file' | 'url';
export type TranslateMode = 'fast' | 'precise';
export type PageRangePreset = 'all' | 'first' | 'first5' | 'custom';
export type JobStatus = 'idle' | 'validating' | 'uploading' | 'translating' | 'completed' | 'cancelled' | 'failed';
export type BatchJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BatchJob {
  jobId: string;
  filename: string;
  status: BatchJobStatus;
  progress: number;
  error?: string;
  resultFiles?: Record<string, string>;
}

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
  phase: string;
  phasePage: number;
  phaseTotalPages: number;
  error: string | null;
  resultFiles: Record<string, string>;
  elapsedSeconds: number;
  batchMode: boolean;
  batchJobs: BatchJob[];
  batchId: string | null;
  batchOverallProgress: number;
  batchFiles: File[];
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
  | { type: 'TRANSLATE_PROGRESS'; progress: number; desc: string; elapsedSeconds?: number; jobId?: string; phase?: string; phasePage?: number; phaseTotal?: number }
  | { type: 'TRANSLATE_COMPLETE'; jobId: string; files: Record<string, string> }
  | { type: 'TRANSLATE_FAILED'; error: string }
  | { type: 'TRANSLATE_CANCELLED' }
  | { type: 'TICK_ELAPSED'; seconds: number }
  | { type: 'REQUEST_CANCEL' }
  | { type: 'DISMISS_CANCEL' }
  | { type: 'LOAD_PREFERENCES'; preferences: Record<string, unknown> }
  | { type: 'DISMISS_ERROR' }
  | { type: 'RESET_FORM' }
  | { type: 'ADD_BATCH_FILES'; files: File[] }
  | { type: 'REMOVE_BATCH_FILE'; index: number }
  | { type: 'BATCH_TRANSLATE_START'; batchId: string; serverJobs: { job_id: string; filename: string; status: string }[] }
  | { type: 'BATCH_JOB_PROGRESS'; jobId: string; progress: number; desc: string; phase?: string; phasePage?: number; phaseTotal?: number }
  | { type: 'BATCH_JOB_COMPLETE'; jobId: string; files: Record<string, string> }
  | { type: 'BATCH_JOB_FAILED'; jobId: string; error: string }
  | { type: 'BATCH_ALL_COMPLETE' }
  | { type: 'CLEAR_BATCH' };

export const initialState: TranslateState = {
  file: null,
  url: '',
  fileInputType: 'file',
  service: 'google',
  langFrom: 'en',
  langTo: 'zh',
  outputMode: 'side',
  pageRange: 'all',
  customPages: '',
  threads: 4,
  skipSubsetFonts: true,
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
  phase: '',
  phasePage: 0,
  phaseTotalPages: 0,
  error: null,
  resultFiles: {},
  elapsedSeconds: 0,
  batchMode: false,
  batchJobs: [],
  batchId: null,
  batchOverallProgress: 0,
  batchFiles: [],
};

export function translateReducer(state: TranslateState, action: TranslateAction): TranslateState {
  switch (action.type) {
    case 'SET_INPUT_FILE':
      // Changing the input file invalidates any prior translation results
      return {
        ...state, file: action.file, url: '', error: null,
        status: 'idle' as JobStatus, jobId: null, resultFiles: {} as Record<string, string>,
        progress: 0, progressDesc: '', phase: '', phasePage: 0, phaseTotalPages: 0,
        elapsedSeconds: 0, cancelRequested: false,
        batchMode: false, batchJobs: [], batchId: null, batchOverallProgress: 0, batchFiles: [],
      };
    case 'SET_INPUT_URL':
      return {
        ...state, url: action.url, file: null, error: null,
        status: 'idle' as JobStatus, jobId: null, resultFiles: {} as Record<string, string>,
        progress: 0, progressDesc: '', phase: '', phasePage: 0, phaseTotalPages: 0,
        elapsedSeconds: 0, cancelRequested: false,
        batchMode: false, batchJobs: [], batchId: null, batchOverallProgress: 0, batchFiles: [],
      };
    case 'SET_INPUT_TYPE':
      return {
        ...state, fileInputType: action.inputType, file: null, url: '', error: null,
        status: 'idle' as JobStatus, jobId: null, resultFiles: {} as Record<string, string>,
        progress: 0, progressDesc: '', phase: '', phasePage: 0, phaseTotalPages: 0,
        elapsedSeconds: 0, cancelRequested: false,
        batchMode: false, batchJobs: [], batchId: null, batchOverallProgress: 0, batchFiles: [],
      };
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
      return { ...state, status: 'validating', progress: 0, progressDesc: '', phase: '', phasePage: 0, phaseTotalPages: 0, error: null, elapsedSeconds: 0, cancelRequested: false };
    case 'TRANSLATE_UPLOADING':
      return { ...state, status: 'uploading', progress: action.progress, progressDesc: '' };
    case 'TRANSLATE_PROGRESS':
      return {
        ...state,
        status: 'translating',
        progress: action.progress,
        progressDesc: action.desc,
        phase: action.phase ?? state.phase,
        phasePage: action.phasePage ?? state.phasePage,
        phaseTotalPages: action.phaseTotal ?? state.phaseTotalPages,
        jobId: action.jobId ?? state.jobId,
        elapsedSeconds: action.elapsedSeconds ?? state.elapsedSeconds,
      };
    case 'TRANSLATE_COMPLETE':
      return {
        ...state,
        status: 'completed',
        progress: 1,
        progressDesc: '',
        jobId: action.jobId,
        resultFiles: action.files,
        error: null,
        cancelRequested: false,
      };
    case 'TRANSLATE_FAILED':
      return { ...state, status: 'failed', error: action.error, progressDesc: '', cancelRequested: false };
    case 'TRANSLATE_CANCELLED':
      return { ...state, status: 'cancelled', progress: 0, progressDesc: '', cancelRequested: false };
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
      return { ...initialState };

    // ── Batch actions ──────────────────────────────────────────

    case 'ADD_BATCH_FILES': {
      if (action.files.length > 20) return state;
      const newJobs: BatchJob[] = action.files.map((f, i) => ({
        jobId: `pending_${i}_${Date.now()}`,
        filename: f.name,
        status: 'queued' as BatchJobStatus,
        progress: 0,
      }));
      return {
        ...state,
        file: null, url: '', error: null,
        batchMode: true,
        batchJobs: newJobs,
        batchFiles: action.files,
        batchId: null,
        batchOverallProgress: 0,
      };
    }

    case 'REMOVE_BATCH_FILE': {
      const filteredJobs = state.batchJobs.filter((_, i) => i !== action.index);
      const filteredFiles = state.batchFiles.filter((_, i) => i !== action.index);
      if (filteredJobs.length === 0) {
        return {
          ...state, batchMode: false, batchJobs: [], batchFiles: [],
          batchId: null, batchOverallProgress: 0,
        };
      }
      return { ...state, batchJobs: filteredJobs, batchFiles: filteredFiles };
    }

    case 'BATCH_TRANSLATE_START': {
      // Map server-assigned job IDs back to batch jobs by matching on filename
      const mappedJobs: BatchJob[] = action.serverJobs.map(sj => {
        const existing = state.batchJobs.find(bj => bj.filename === sj.filename);
        return {
          jobId: sj.job_id,
          filename: sj.filename,
          status: 'queued' as BatchJobStatus,
          progress: 0,
        };
      });
      return {
        ...state,
        batchId: action.batchId,
        batchOverallProgress: 0,
        status: 'uploading',
        error: null,
        batchJobs: mappedJobs,
      };
    }

    case 'BATCH_JOB_PROGRESS':
      return {
        ...state,
        status: 'translating',
        batchJobs: state.batchJobs.map(j =>
          j.jobId === action.jobId
            ? { ...j, status: 'running' as BatchJobStatus, progress: action.progress }
            : j
        ),
      };

    case 'BATCH_JOB_COMPLETE': {
      const updatedJobs = state.batchJobs.map(j =>
        j.jobId === action.jobId
          ? { ...j, status: 'completed' as BatchJobStatus, progress: 1, resultFiles: action.files }
          : j
      );
      const done = updatedJobs.filter(j => j.status === 'completed').length;
      return {
        ...state,
        batchJobs: updatedJobs,
        batchOverallProgress: updatedJobs.length > 0 ? done / updatedJobs.length : 0,
      };
    }

    case 'BATCH_JOB_FAILED':
      return {
        ...state,
        batchJobs: state.batchJobs.map(j =>
          j.jobId === action.jobId
            ? { ...j, status: 'failed' as BatchJobStatus, error: action.error }
            : j
        ),
      };

    case 'BATCH_ALL_COMPLETE':
      return {
        ...state,
        status: 'completed',
        batchOverallProgress: 1,
      };

    case 'CLEAR_BATCH':
      return {
        ...state,
        batchMode: false,
        batchJobs: [],
        batchId: null,
        batchOverallProgress: 0,
        error: null,
      };

    default:
      return state;
  }
}
