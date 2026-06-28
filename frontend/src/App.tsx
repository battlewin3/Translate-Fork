import { useEffect, useReducer, useRef, useState, lazy, Suspense } from 'react';
import { TranslateStateContext } from './context/TranslateStateContext';
import { TranslateDispatchContext } from './context/TranslateDispatchContext';
import { translateReducer, initialState } from './reducers/translateReducer';
import { loadPreferences, savePreferences } from './utils/preferences';
import { useJobHistory } from './hooks/useJobHistory';
import { useSetupStatus } from './hooks/useSetupStatus';
import { LocaleProvider } from './i18n/context';
import Sidebar from './components/Sidebar';
import Layout from './components/Layout';
import PreviewArea from './components/PreviewArea';

// Lazy-loaded non-critical components
const HistoryDrawer = lazy(() => import('./components/HistoryDrawer').then(m => ({ default: m.HistoryDrawer })));
const ToastContainer = lazy(() => import('./components/ToastContainer').then(m => ({ default: m.ToastContainer })));

export default function App() {
  const [state, dispatch] = useReducer(translateReducer, initialState);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const { history, clearHistory } = useJobHistory();
  const { status: setupStatus } = useSetupStatus();

  // Blob URL lifecycle — create on file change, cleanup on change or unmount
  useEffect(() => {
    if (state.file) {
      const url = URL.createObjectURL(state.file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (state.fileInputType === 'url' && state.url) {
      setPreviewUrl(state.url);
      return;
    }
    setPreviewUrl(null);
  }, [state.file, state.fileInputType, state.url]);

  // Load persisted preferences on mount, then mark ready.
  // Falls back to backend config (config.json) for service selection
  // and non-sensitive env values when localStorage has no preference.
  useEffect(() => {
    const prefs = loadPreferences();
    const updates: Record<string, unknown> = {};

    // If localStorage has no service preference, use backend's last_used
    if (!prefs.service && setupStatus?.last_used) {
      updates.service = setupStatus.last_used;
    }

    if (Object.keys(prefs).length > 0 || Object.keys(updates).length > 0) {
      dispatch({ type: 'LOAD_PREFERENCES', preferences: { ...prefs, ...updates } });
    }

    // Pre-fill non-sensitive envs (model, base URL) from backend config
    if (setupStatus?.services) {
      const effectiveService = (updates.service || prefs.service || 'google') as string;
      const serviceDetail = setupStatus.services.find(s => s.name === effectiveService);
      if (serviceDetail) {
        for (const env of serviceDetail.envs) {
          if (!env.is_sensitive && env.value) {
            dispatch({ type: 'SET_ENV', key: env.key, value: env.value });
          }
        }
      }
    }

    // setReady triggers a re-render — save effect will only fire
    // after LOAD_PREFERENCES has been processed, preventing
    // initialState from overwriting persisted data.
    setReady(true);
  }, [setupStatus]);

  // Save preferences when settings change (only after ready).
  // Track the storable subset via a serialized fingerprint to avoid
  // a fragile 18-field dependency array that drifts from StorablePreferences.
  const prevFingerprint = useRef<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const fingerprint = JSON.stringify({
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
    });
    if (fingerprint === prevFingerprint.current) return;
    prevFingerprint.current = fingerprint;
    savePreferences(state);
  }, [ready, state]);

  return (
    <LocaleProvider>
    <TranslateStateContext.Provider value={state}>
      <TranslateDispatchContext.Provider value={dispatch}>
        <Layout
          sidebar={
            <Sidebar
              onHistoryOpen={() => setHistoryOpen(true)}
              hasHistory={history.length > 0}
            />
          }
          mainArea={<PreviewArea previewUrl={previewUrl} />}
        />
        <Suspense fallback={null}>
          {historyOpen && (
            <HistoryDrawer
              open={historyOpen}
              onClose={() => setHistoryOpen(false)}
              history={history}
              onClear={clearHistory}
              onRetry={(entry) => {
                dispatch({ type: 'SET_SERVICE', service: entry.service });
                dispatch({ type: 'SET_LANG_FROM', lang: entry.langFrom });
                dispatch({ type: 'SET_LANG_TO', lang: entry.langTo });
                dispatch({ type: 'SET_OUTPUT_MODE', mode: entry.outputMode });
                setHistoryOpen(false);
              }}
            />
          )}
        </Suspense>
        <Suspense fallback={null}>
          <ToastContainer />
        </Suspense>
      </TranslateDispatchContext.Provider>
    </TranslateStateContext.Provider>
    </LocaleProvider>
  );
}
