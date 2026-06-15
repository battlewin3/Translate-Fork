import { useEffect, useReducer, useRef, useState } from 'react';
import { TranslateStateContext } from './context/TranslateStateContext';
import { TranslateDispatchContext } from './context/TranslateDispatchContext';
import { translateReducer, initialState } from './reducers/translateReducer';
import { loadPreferences, savePreferences } from './utils/preferences';
import { useJobHistory } from './hooks/useJobHistory';
import { ToastContainer } from './components/ToastContainer';
import Sidebar from './components/Sidebar';
import { HistoryDrawer } from './components/HistoryDrawer';
import Layout from './components/Layout';
import PreviewArea from './components/PreviewArea';

export default function App() {
  const [state, dispatch] = useReducer(translateReducer, initialState);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const { history, clearHistory } = useJobHistory();

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

  // Load persisted preferences on mount, then mark ready
  useEffect(() => {
    const prefs = loadPreferences();
    if (Object.keys(prefs).length > 0) {
      dispatch({ type: 'LOAD_PREFERENCES', preferences: prefs });
    }
    // setReady triggers a re-render — save effect will only fire
    // after LOAD_PREFERENCES has been processed, preventing
    // initialState from overwriting persisted data.
    setReady(true);
  }, []);

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
        <ToastContainer />
      </TranslateDispatchContext.Provider>
    </TranslateStateContext.Provider>
  );
}
