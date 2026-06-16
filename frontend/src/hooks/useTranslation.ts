import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslateState } from './useTranslateState';
import { useTranslateDispatch } from './useTranslateDispatch';
import { useSSE } from './useSSE';
import { useJobHistory } from './useJobHistory';
import { useServiceList } from './useServiceList';
import {
  startTranslationWithProgress,
  cancelJob as apiCancelJob,
  getJobStatus as apiGetJobStatus,
  getProgressUrl,
} from '../api/client';
import type { JobHistoryEntry } from '../reducers/translateReducer';
import type { ServiceEnv } from '../api/client';

const SSE_RETRY_MAX = 3;
const SSE_RETRY_BASE_MS = 1000;

function isApiKeyEnv(env: ServiceEnv): boolean {
  if (env.is_api_key) return true;
  const key = env.key.toUpperCase();
  return key.includes('API_KEY') || key.includes('APIKEY') || key.endsWith('_KEY');
}

export function useTranslation() {
  const state = useTranslateState();
  const dispatch = useTranslateDispatch();
  const { addEntry } = useJobHistory();
  const { services } = useServiceList();

  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // SSE URL derived from state
  const sseUrl = state.jobId && (state.status === 'uploading' || state.status === 'translating')
    ? getProgressUrl(state.jobId)
    : null;

  const sseRetryCount = useRef(0);

  const handleSSEMessage = useCallback(
    (data: { progress: number; desc: string; status: string; error?: string; phase?: string; phase_page?: number; phase_total?: number }) => {
      dispatch({
        type: 'TRANSLATE_PROGRESS',
        progress: data.progress,
        desc: data.desc,
        phase: data.phase,
        phasePage: data.phase_page,
        phaseTotal: data.phase_total,
      });
      if (data.status === 'completed') {
        // Fetch full job status to get result files (sseUrl guarantee: jobId exists)
        apiGetJobStatus(state.jobId!)
          .then((job) => {
            dispatch({
              type: 'TRANSLATE_COMPLETE',
              jobId: state.jobId!,
              files: job.files || {},
            });
            // Add to history
            addEntry({
              jobId: state.jobId!,
              timestamp: Date.now(),
              fileName: state.file?.name || state.url || 'unknown',
              service: state.service,
              langFrom: state.langFrom,
              langTo: state.langTo,
              outputMode: state.outputMode,
              status: 'completed',
              files: job.files || {},
            });
            stopElapsed();
          })
          .catch(() => {
            // Fallback: mark complete anyway
            dispatch({
              type: 'TRANSLATE_COMPLETE',
              jobId: state.jobId!,
              files: {},
            });
            stopElapsed();
          });
      } else if (data.status === 'cancelled') {
        dispatch({ type: 'TRANSLATE_CANCELLED' });
        stopElapsed();
      } else if (data.status === 'failed') {
        // Use the error from SSE data, fall back to fetching full job status
        const errorMsg = data.error || data.desc || '翻译失败';
        dispatch({ type: 'TRANSLATE_FAILED', error: errorMsg });
        stopElapsed();
      }
    },
    [dispatch, state.jobId, state.file, state.url, state.service, state.langFrom, state.langTo, state.outputMode, addEntry]
  );

  const handleSSEError = useCallback(
    (error: string) => {
      if (sseRetryCount.current < SSE_RETRY_MAX) {
        sseRetryCount.current += 1;
        // Auto-retry with backoff handled by SSE hook reconnecting
      } else {
        // Fall back to polling
        pollJobStatus();
      }
    },
    [state.jobId]
  );

  const handleSSEComplete = useCallback(() => {
    stopElapsed();
  }, []);

  const { stop: stopSSE } = useSSE({
    url: sseUrl,
    onMessage: handleSSEMessage,
    onError: handleSSEError,
    onComplete: handleSSEComplete,
  });

  // Elapsed time tracking — uses ref to avoid stale closure over state.elapsedSeconds
  const elapsedCountRef = useRef(0);

  const startElapsed = useCallback(() => {
    stopElapsed();
    elapsedCountRef.current = 0;
    elapsedRef.current = setInterval(() => {
      elapsedCountRef.current += 1;
      dispatch({
        type: 'TICK_ELAPSED',
        seconds: elapsedCountRef.current,
      });
    }, 1000);
  }, [dispatch]);

  function stopElapsed() {
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
    elapsedCountRef.current = 0;
  }

  useEffect(() => {
    return () => stopElapsed();
  }, []);

  // Fallback polling when SSE fails
  const pollJobStatus = useCallback(async () => {
    if (!state.jobId) return;
    try {
      const job = await apiGetJobStatus(state.jobId);
      if (job.status === 'completed') {
        dispatch({
          type: 'TRANSLATE_COMPLETE',
          jobId: state.jobId,
          files: job.files || {},
        });
        addEntry({
          jobId: state.jobId,
          timestamp: Date.now(),
          fileName: state.file?.name || state.url || 'unknown',
          service: state.service,
          langFrom: state.langFrom,
          langTo: state.langTo,
          outputMode: state.outputMode,
          status: 'completed',
          files: job.files || {},
        });
        stopElapsed();
      } else if (job.status === 'failed') {
        dispatch({ type: 'TRANSLATE_FAILED', error: job.error || '翻译失败' });
        stopElapsed();
      } else if (job.status === 'cancelled') {
        dispatch({ type: 'TRANSLATE_CANCELLED' });
        stopElapsed();
      } else {
        dispatch({ type: 'TRANSLATE_PROGRESS', progress: job.progress, desc: job.desc });
        setTimeout(pollJobStatus, 2000);
      }
    } catch (err) {
      dispatch({ type: 'TRANSLATE_FAILED', error: err instanceof Error ? err.message : '连接失败' });
      stopElapsed();
    }
  }, [state.jobId, dispatch, addEntry, state.file, state.url, state.service, state.langFrom, state.langTo, state.outputMode]);

  // Start translation
  const start = useCallback(async () => {
    if (!state.file && !state.url) {
      dispatch({ type: 'TRANSLATE_FAILED', error: '请先选择文件或输入链接' });
      return;
    }

    // Validate required API keys for the selected service
    const currentService = services.find((s) => s.name === state.service);
    if (currentService) {
      const apiKeyEnvs = currentService.envs.filter(isApiKeyEnv);
      for (const env of apiKeyEnvs) {
        const hasDefault = env.default && env.default.length > 0;
        const hasUserValue = state.envs[env.key] && state.envs[env.key].length > 0;
        if (!hasDefault && !hasUserValue) {
          dispatch({
            type: 'TRANSLATE_FAILED',
            error: `请先在高级设置中配置 ${currentService.name} 的 ${env.key}`,
          });
          return;
        }
      }
    }

    dispatch({ type: 'TRANSLATE_START' });
    sseRetryCount.current = 0;

    try {
      const formData = new FormData();
      if (state.file) {
        formData.append('file', state.file);
      } else if (state.url) {
        // For URL-based: backend expects a file; we can pass URL in the form
        formData.append('url', state.url);
      }

      formData.append('service', state.service);
      formData.append('lang_from', state.langFrom);
      formData.append('lang_to', state.langTo);
      formData.append('output_mode', state.outputMode);
      formData.append('threads', String(state.threads));
      formData.append('skip_subset_fonts', String(state.skipSubsetFonts));
      formData.append('ignore_cache', String(state.ignoreCache));
      formData.append('vfont', state.vfont);
      formData.append('prompt', state.customPrompt);
      formData.append('mode', state.translateMode);

      if (state.pageRange === 'custom') {
        formData.append('page_range', 'Others');
        formData.append('custom_pages', state.customPages);
      } else {
        formData.append('page_range', state.pageRange === 'all' ? 'All' : state.pageRange === 'first' ? 'First Page' : 'First 5 Pages');
      }

      if (Object.keys(state.envs).length > 0) {
        formData.append('envs_json', JSON.stringify(state.envs));
      }

      dispatch({ type: 'TRANSLATE_UPLOADING', progress: 0 });

      const result = await startTranslationWithProgress(formData, (uploadPct) => {
        dispatch({ type: 'TRANSLATE_UPLOADING', progress: uploadPct });
      });
      const jobId = result.job_id;

      dispatch({ type: 'TRANSLATE_PROGRESS', progress: 0, desc: '正在启动翻译...', elapsedSeconds: 0, jobId });
      startElapsed();

    } catch (err) {
      const message = err instanceof Error ? err.message : '启动翻译失败';
      dispatch({ type: 'TRANSLATE_FAILED', error: message });
    }
  }, [state, dispatch, startElapsed, services]);

  // Cancel translation
  const cancel = useCallback(async () => {
    dispatch({ type: 'REQUEST_CANCEL' });
  }, [dispatch]);

  const confirmCancel = useCallback(async () => {
    // 1. Close dialog immediately
    dispatch({ type: 'DISMISS_CANCEL' });

    // 2. Stop SSE and timer synchronously — don't wait for backend
    stopSSE();
    stopElapsed();

    // 3. Transition to cancelled state immediately
    dispatch({ type: 'TRANSLATE_CANCELLED' });
    if (state.jobId) {
      addEntry({
        jobId: state.jobId,
        timestamp: Date.now(),
        fileName: state.file?.name || state.url || 'unknown',
        service: state.service,
        langFrom: state.langFrom,
        langTo: state.langTo,
        outputMode: state.outputMode,
        status: 'cancelled',
      });
    }

    // 4. Notify backend (fire-and-forget — don't block local state)
    if (state.jobId) {
      try {
        await apiCancelJob(state.jobId);
      } catch {
        // Backend cancel may fail; local state is already cleaned up
      }
    }
  }, [state.jobId, state.file, state.url, state.service, state.langFrom, state.langTo, state.outputMode, dispatch, stopSSE, stopElapsed, addEntry]);

  const dismissCancel = useCallback(() => {
    dispatch({ type: 'DISMISS_CANCEL' });
  }, [dispatch]);

  // Retry failed translation
  const retry = useCallback(() => {
    dispatch({ type: 'DISMISS_ERROR' });
    // Small delay to let UI update
    setTimeout(() => start(), 100);
  }, [dispatch, start]);

  return {
    start,
    cancel,
    confirmCancel,
    dismissCancel,
    retry,
    cancelRequested: state.cancelRequested,
  };
}
