/**
 * Regression tests for translateReducer state reset behavior.
 *
 * Bug: SET_INPUT_FILE / SET_INPUT_URL / SET_INPUT_TYPE only cleared
 * {file, url, error} but left status:'completed', jobId, and resultFiles
 * intact, causing the old download panel to persist after importing
 * a new file.
 */
import { describe, it, expect } from 'vitest';
import {
  translateReducer,
  initialState,
  type TranslateState,
} from './translateReducer';

/** A "completed translation" state — what the reducer looks like
 *  right after a successful translation finishes. */
function completedState(overrides?: Partial<TranslateState>): TranslateState {
  return {
    ...initialState,
    file: new File(['fake'], 'test.pdf', { type: 'application/pdf' }),
    url: '',
    status: 'completed',
    progress: 1,
    jobId: 'job-abc-123',
    resultFiles: {
      mono: 'test_mono.pdf',
      dual: 'test_dual.pdf',
    },
    elapsedSeconds: 42,
    phase: 'translate',
    phasePage: 5,
    phaseTotalPages: 5,
    cancelRequested: true,
    ...overrides,
  };
}

// ─── SET_INPUT_FILE ─────────────────────────────────────────────────

describe('SET_INPUT_FILE', () => {
  it('resets translation result state when a new file is selected', () => {
    const state = completedState();
    const newFile = new File(['new'], 'new.pdf', { type: 'application/pdf' });
    const next = translateReducer(state, { type: 'SET_INPUT_FILE', file: newFile });

    // Translation-state fields are cleared
    expect(next.status).toBe('idle');
    expect(next.jobId).toBeNull();
    expect(next.resultFiles).toEqual({});
    expect(next.progress).toBe(0);
    expect(next.progressDesc).toBe('');
    expect(next.elapsedSeconds).toBe(0);
    expect(next.cancelRequested).toBe(false);
    expect(next.phase).toBe('');
    expect(next.phasePage).toBe(0);
    expect(next.phaseTotalPages).toBe(0);
    expect(next.error).toBeNull();

    // The new file is set and URL is cleared
    expect(next.file).toBe(newFile);
    expect(next.url).toBe('');
  });

  it('preserves user preferences after file change', () => {
    const state = {
      ...completedState(),
      service: 'deepseek',
      langFrom: 'zh',
      langTo: 'en',
      outputMode: 'dual' as const,
      threads: 8,
      translateMode: 'precise' as const,
    };
    const next = translateReducer(state, {
      type: 'SET_INPUT_FILE',
      file: new File(['x'], 'x.pdf'),
    });

    // Preferences survive
    expect(next.service).toBe('deepseek');
    expect(next.langFrom).toBe('zh');
    expect(next.langTo).toBe('en');
    expect(next.outputMode).toBe('dual');
    expect(next.threads).toBe(8);
    expect(next.translateMode).toBe('precise');
  });
});

// ─── SET_INPUT_URL ──────────────────────────────────────────────────

describe('SET_INPUT_URL', () => {
  it('resets translation result state when a new URL is entered', () => {
    const state = completedState();
    const next = translateReducer(state, {
      type: 'SET_INPUT_URL',
      url: 'https://example.com/doc.pdf',
    });

    expect(next.status).toBe('idle');
    expect(next.jobId).toBeNull();
    expect(next.resultFiles).toEqual({});
    expect(next.progress).toBe(0);
    expect(next.elapsedSeconds).toBe(0);
    expect(next.file).toBeNull();
    expect(next.url).toBe('https://example.com/doc.pdf');
  });
});

// ─── SET_INPUT_TYPE ─────────────────────────────────────────────────

describe('SET_INPUT_TYPE', () => {
  it('resets both file and URL and clears translation state', () => {
    const state = completedState({
      url: 'https://example.com/doc.pdf',
    });
    const next = translateReducer(state, {
      type: 'SET_INPUT_TYPE',
      inputType: 'url',
    });

    expect(next.file).toBeNull();
    expect(next.url).toBe('');
    expect(next.fileInputType).toBe('url');
    expect(next.status).toBe('idle');
    expect(next.jobId).toBeNull();
    expect(next.resultFiles).toEqual({});
  });
});

// ─── RESET_FORM ─────────────────────────────────────────────────────

describe('RESET_FORM', () => {
  it('fully resets to initial state (not preserving old resultFiles)', () => {
    const state = completedState({
      service: 'bing',
      langFrom: 'ja',
      outputMode: 'side' as const,
    });
    const next = translateReducer(state, { type: 'RESET_FORM' });

    // Everything is back to defaults
    expect(next).toEqual(initialState);
    // Explicitly verify resultFiles are gone (the old bug)
    expect(next.resultFiles).toEqual({});
    expect(next.jobId).toBeNull();
    expect(next.status).toBe('idle');
    // Service/options are reset too
    expect(next.service).toBe('google');
  });
});

// ─── Non-regression: actions that should NOT reset state ─────────────

describe('Non-destructive actions', () => {
  it('SET_SERVICE does not reset translation results', () => {
    const state = completedState();
    const next = translateReducer(state, { type: 'SET_SERVICE', service: 'ollama' });

    expect(next.service).toBe('ollama');
    // Translation state is preserved
    expect(next.status).toBe('completed');
    expect(next.jobId).toBe('job-abc-123');
    expect(next.resultFiles.mono).toBe('test_mono.pdf');
  });

  it('SET_LANG_FROM does not reset translation results', () => {
    const state = completedState();
    const next = translateReducer(state, { type: 'SET_LANG_FROM', lang: 'fr' });

    expect(next.langFrom).toBe('fr');
    expect(next.status).toBe('completed');
  });

  it('SWAP_LANGUAGES does not reset translation results', () => {
    const state = completedState({ langFrom: 'en', langTo: 'zh' });
    const next = translateReducer(state, { type: 'SWAP_LANGUAGES' });

    expect(next.langFrom).toBe('zh');
    expect(next.langTo).toBe('en');
    expect(next.status).toBe('completed');
  });
});

// ─── Batch actions ──────────────────────────────────────────────────

describe('ADD_BATCH_FILES', () => {
  it('sets batchMode and creates batchJobs from files', () => {
    const files = [
      new File(['a'], 'a.pdf', { type: 'application/pdf' }),
      new File(['b'], 'b.pdf', { type: 'application/pdf' }),
    ];
    const next = translateReducer(initialState, { type: 'ADD_BATCH_FILES', files });

    expect(next.batchMode).toBe(true);
    expect(next.batchJobs).toHaveLength(2);
    expect(next.batchJobs[0].filename).toBe('a.pdf');
    expect(next.batchJobs[0].status).toBe('queued');
    expect(next.batchFiles).toHaveLength(2);
    expect(next.file).toBeNull();
  });

  it('rejects more than 20 files', () => {
    const files = Array.from({ length: 21 }, (_, i) =>
      new File(['x'], `f${i}.pdf`, { type: 'application/pdf' })
    );
    const next = translateReducer(initialState, { type: 'ADD_BATCH_FILES', files });
    expect(next.batchMode).toBe(false);
  });
});

describe('BATCH_JOB_PROGRESS', () => {
  it('updates progress for the matching job', () => {
    const files = [
      new File(['a'], 'a.pdf', { type: 'application/pdf' }),
      new File(['b'], 'b.pdf', { type: 'application/pdf' }),
    ];
    let state = translateReducer(initialState, { type: 'ADD_BATCH_FILES', files });
    const jobId = state.batchJobs[0].jobId;

    state = translateReducer(state, { type: 'BATCH_JOB_PROGRESS', jobId, progress: 0.5, desc: '' });
    expect(state.batchJobs[0].progress).toBe(0.5);
    expect(state.batchJobs[0].status).toBe('running');
    expect(state.batchJobs[1].progress).toBe(0);
  });
});

describe('BATCH_JOB_COMPLETE', () => {
  it('marks the job complete and updates overall progress', () => {
    const files = [
      new File(['a'], 'a.pdf', { type: 'application/pdf' }),
      new File(['b'], 'b.pdf', { type: 'application/pdf' }),
    ];
    let state = translateReducer(initialState, { type: 'ADD_BATCH_FILES', files });
    const jobId = state.batchJobs[0].jobId;

    state = translateReducer(state, {
      type: 'BATCH_JOB_COMPLETE',
      jobId,
      files: { side: '/tmp/a-side.pdf' },
    });
    expect(state.batchJobs[0].status).toBe('completed');
    expect(state.batchJobs[0].progress).toBe(1);
    expect(state.batchJobs[0].resultFiles?.side).toBe('/tmp/a-side.pdf');
    expect(state.batchOverallProgress).toBe(0.5);
  });
});

describe('BATCH_JOB_FAILED', () => {
  it('marks the job as failed with error message', () => {
    const files = [new File(['a'], 'a.pdf', { type: 'application/pdf' })];
    let state = translateReducer(initialState, { type: 'ADD_BATCH_FILES', files });
    const jobId = state.batchJobs[0].jobId;

    state = translateReducer(state, { type: 'BATCH_JOB_FAILED', jobId, error: 'Network error' });
    expect(state.batchJobs[0].status).toBe('failed');
    expect(state.batchJobs[0].error).toBe('Network error');
  });
});

describe('CLEAR_BATCH', () => {
  it('resets all batch state', () => {
    const files = [new File(['a'], 'a.pdf', { type: 'application/pdf' })];
    let state = translateReducer(initialState, { type: 'ADD_BATCH_FILES', files });
    state = translateReducer(state, { type: 'CLEAR_BATCH' });

    expect(state.batchMode).toBe(false);
    expect(state.batchJobs).toEqual([]);
    expect(state.batchId).toBeNull();
    expect(state.batchOverallProgress).toBe(0);
  });
});

describe('Single-file actions clear batch', () => {
  it('SET_INPUT_FILE clears batch state', () => {
    const files = [new File(['a'], 'a.pdf', { type: 'application/pdf' })];
    let state = translateReducer(initialState, { type: 'ADD_BATCH_FILES', files });
    state = translateReducer(state, { type: 'SET_INPUT_FILE', file: new File(['solo'], 'solo.pdf') });

    expect(state.batchMode).toBe(false);
    expect(state.batchJobs).toEqual([]);
    expect(state.file?.name).toBe('solo.pdf');
  });
});

describe('REMOVE_BATCH_FILE', () => {
  it('removes a file and exits batch mode when last file removed', () => {
    const files = [new File(['a'], 'a.pdf', { type: 'application/pdf' })];
    let state = translateReducer(initialState, { type: 'ADD_BATCH_FILES', files });
    state = translateReducer(state, { type: 'REMOVE_BATCH_FILE', index: 0 });

    expect(state.batchMode).toBe(false);
    expect(state.batchJobs).toEqual([]);
  });
});

describe('BATCH_TRANSLATE_START', () => {
  it('maps server job IDs to batch jobs by filename', () => {
    const files = [
      new File(['a'], 'a.pdf', { type: 'application/pdf' }),
      new File(['b'], 'b.pdf', { type: 'application/pdf' }),
    ];
    let state = translateReducer(initialState, { type: 'ADD_BATCH_FILES', files });
    expect(state.batchJobs[0].jobId).toMatch(/^pending_/);

    state = translateReducer(state, {
      type: 'BATCH_TRANSLATE_START',
      batchId: 'batch-abc',
      serverJobs: [
        { job_id: 'job-real-1', filename: 'a.pdf', status: 'queued' },
        { job_id: 'job-real-2', filename: 'b.pdf', status: 'queued' },
      ],
    });

    expect(state.batchId).toBe('batch-abc');
    expect(state.batchJobs[0].jobId).toBe('job-real-1');
    expect(state.batchJobs[1].jobId).toBe('job-real-2');
    expect(state.batchJobs[0].filename).toBe('a.pdf');
  });

  it('preserves status queued after mapping', () => {
    const files = [new File(['a'], 'a.pdf', { type: 'application/pdf' })];
    let state = translateReducer(initialState, { type: 'ADD_BATCH_FILES', files });

    state = translateReducer(state, {
      type: 'BATCH_TRANSLATE_START',
      batchId: 'batch-xyz',
      serverJobs: [{ job_id: 'real-1', filename: 'a.pdf', status: 'queued' }],
    });

    expect(state.batchJobs[0].status).toBe('queued');
    expect(state.batchJobs[0].progress).toBe(0);
    expect(state.status).toBe('uploading');
  });
});

describe('BATCH_ALL_COMPLETE', () => {
  it('sets status to completed and overallProgress to 1', () => {
    const files = [new File(['a'], 'a.pdf', { type: 'application/pdf' })];
    let state = translateReducer(initialState, { type: 'ADD_BATCH_FILES', files });
    state = translateReducer(state, { type: 'BATCH_ALL_COMPLETE' });

    expect(state.status).toBe('completed');
    expect(state.batchOverallProgress).toBe(1);
  });
});
