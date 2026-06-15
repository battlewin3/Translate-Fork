import { useState, useEffect, useCallback } from 'react';
import type { JobHistoryEntry } from '../reducers/translateReducer';

const HISTORY_KEY = 'pdfmathtranslate_history';
const MAX_HISTORY = 20;

function loadHistory(): JobHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: JobHistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {
    // localStorage full - silently fail
  }
}

export function useJobHistory() {
  const [history, setHistory] = useState<JobHistoryEntry[]>(loadHistory);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === HISTORY_KEY) {
        setHistory(loadHistory());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addEntry = useCallback((entry: JobHistoryEntry) => {
    setHistory((prev) => {
      const next = [entry, ...prev.filter((h) => h.jobId !== entry.jobId)];
      saveHistory(next);
      return next.slice(0, MAX_HISTORY);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  return { history, addEntry, clearHistory };
}
