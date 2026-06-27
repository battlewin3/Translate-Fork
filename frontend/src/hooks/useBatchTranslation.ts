import { useCallback, useEffect, useRef } from 'react';
import { useTranslateState } from './useTranslateState';
import { useTranslateDispatch } from './useTranslateDispatch';
import { useJobHistory } from './useJobHistory';
import {
  startBatchTranslation,
  getBatchStatus,
  cancelJob,
} from '../api/client';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ERRORS = 5;

export function useBatchTranslation() {
  const state = useTranslateState();
  const dispatch = useTranslateDispatch();
  const { addEntry } = useJobHistory();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollErrorCount = useRef(0);
  const recordedRef = useRef<Set<string>>(new Set()); // dedup addEntry calls across poll ticks
  const stateRef = useRef(state);
  stateRef.current = state;

  // Cleanup polling on unmount
  useEffect(() => () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback((batchId: string) => {
    stopPolling();
    pollErrorCount.current = 0;
    recordedRef.current.clear();
    pollRef.current = setInterval(async () => {
      try {
        const status = await getBatchStatus(batchId);
        pollErrorCount.current = 0; // reset on success

        for (const job of status.jobs) {
          if (job.status === 'completed' && !recordedRef.current.has(job.job_id)) {
            recordedRef.current.add(job.job_id);
            dispatch({
              type: 'BATCH_JOB_COMPLETE',
              jobId: job.job_id,
              files: job.result_files || {},
            });
            addEntry({
              jobId: job.job_id,
              timestamp: Date.now(),
              fileName: job.filename,
              service: stateRef.current.service,
              langFrom: stateRef.current.langFrom,
              langTo: stateRef.current.langTo,
              outputMode: stateRef.current.outputMode,
              status: 'completed',
              files: job.result_files,
            });
          } else if (job.status === 'failed' && !recordedRef.current.has(job.job_id)) {
            recordedRef.current.add(job.job_id);
            dispatch({
              type: 'BATCH_JOB_FAILED',
              jobId: job.job_id,
              error: job.error || '未知错误',
            });
            addEntry({
              jobId: job.job_id,
              timestamp: Date.now(),
              fileName: job.filename,
              service: stateRef.current.service,
              langFrom: stateRef.current.langFrom,
              langTo: stateRef.current.langTo,
              outputMode: stateRef.current.outputMode,
              status: 'failed',
              error: job.error,
            });
          } else if (job.status === 'running') {
            dispatch({
              type: 'BATCH_JOB_PROGRESS',
              jobId: job.job_id,
              progress: job.progress,
              desc: '',
            });
          }
        }

        // Check if all jobs are terminal
        const terminal = status.jobs.every(
          j => ['completed', 'failed', 'cancelled'].includes(j.status)
        );
        if (terminal) {
          dispatch({ type: 'BATCH_ALL_COMPLETE' });
          stopPolling();
        }
      } catch {
        pollErrorCount.current += 1;
        if (pollErrorCount.current >= MAX_POLL_ERRORS) {
          dispatch({
            type: 'TRANSLATE_FAILED',
            error: '批量翻译状态检查失败，请刷新页面重试',
          });
          stopPolling();
        }
      }
    }, POLL_INTERVAL_MS);
  }, [dispatch, stopPolling, addEntry]); // stable — no state dependencies

  const start = useCallback(async () => {
    const s = stateRef.current;
    const files = s.batchFiles;
    if (files.length === 0) return;

    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    formData.append('service', s.service);
    formData.append('lang_from', s.langFrom);
    formData.append('lang_to', s.langTo);
    formData.append('output_mode', s.outputMode);
    formData.append('threads', String(s.threads));
    formData.append('skip_subset_fonts', String(s.skipSubsetFonts));
    formData.append('ignore_cache', String(s.ignoreCache));
    formData.append('vfont', s.vfont);
    formData.append('prompt', s.customPrompt);
    formData.append('mode', s.translateMode);

    if (s.pageRange === 'custom') {
      formData.append('page_range', 'Others');
      formData.append('custom_pages', s.customPages);
    } else {
      const label = s.pageRange === 'all' ? 'All' : s.pageRange === 'first' ? 'First Page' : 'First 5 Pages';
      formData.append('page_range', label);
    }

    if (Object.keys(s.envs).length > 0) {
      formData.append('envs_json', JSON.stringify(s.envs));
    }

    dispatch({ type: 'TRANSLATE_START' });

    try {
      const result = await startBatchTranslation(formData, () => {
        // upload progress
      });
      dispatch({
        type: 'BATCH_TRANSLATE_START',
        batchId: result.batch_id,
        serverJobs: result.jobs,
      });

      startPolling(result.batch_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '批量翻译启动失败';
      dispatch({ type: 'TRANSLATE_FAILED', error: msg });
    }
  }, [dispatch, startPolling]); // stable — no state dependency

  const cancelAll = useCallback(async () => {
    stopPolling();
    // Cancel each running job (fire-and-forget)
    for (const job of state.batchJobs) {
      if (job.status === 'queued' || job.status === 'running') {
        try {
          await cancelJob(job.jobId);
        } catch { /* ignore */ }
      }
    }
    dispatch({ type: 'CLEAR_BATCH' });
  }, [state.batchJobs, dispatch, stopPolling]);

  return { start, cancelAll };
}
