import { useState, useCallback } from 'react';

export type OutputMode = 'mono' | 'dual' | 'side';
export type FileInputType = 'file' | 'url';
export type TranslateMode = 'fast' | 'precise';
export type PageRangePreset = 'all' | 'first' | 'first5' | 'custom';

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
  jobId: string | null;
  status: 'idle' | 'translating' | 'completed' | 'cancelled' | 'failed';
  progress: number;
  progressDesc: string;
  error: string | null;
  resultFiles: Record<string, string>;
}

const initialState: TranslateState = {
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
  jobId: null,
  status: 'idle',
  progress: 0,
  progressDesc: '',
  error: null,
  resultFiles: {},
};

export function useTranslate() {
  const [state, setState] = useState<TranslateState>(initialState);

  const set = useCallback(<K extends keyof TranslateState>(key: K, value: TranslateState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const setEnvs = useCallback((envs: Record<string, string>) => {
    setState((prev) => ({ ...prev, envs }));
  }, []);

  const updateEnv = useCallback((key: string, value: string) => {
    setState((prev) => ({
      ...prev,
      envs: { ...prev.envs, [key]: value },
    }));
  }, []);

  return { state, set, reset, setEnvs, updateEnv };
}
