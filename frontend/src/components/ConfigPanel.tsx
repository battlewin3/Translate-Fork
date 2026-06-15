import { useState } from 'react';
import { useTranslateState } from '../hooks/useTranslateState';
import { useTranslateDispatch } from '../hooks/useTranslateDispatch';
import { useTranslation } from '../hooks/useTranslation';
import { useJobHistory } from '../hooks/useJobHistory';
import PanelHeader from './PanelHeader';
import InputSection from './InputSection';
import ServiceSelector from './ServiceSelector';
import EnvKeyInputs from './EnvKeyInputs';
import LanguagePicker from './LanguagePicker';
import OutputModeSelect from './OutputModeSelect';
import PageRange from './PageRange';
import AdvancedOptions from './AdvancedOptions';
import TranslateButton from './TranslateButton';
import ProgressIndicator from './ProgressIndicator';
import DownloadPanel from './DownloadPanel';
import { ErrorBanner } from './ErrorBanner';
import { CancelConfirmDialog } from './CancelConfirmDialog';
import { HistoryDrawer } from './HistoryDrawer';
import Footer from './Footer';

export default function ConfigPanel() {
  const state = useTranslateState();
  const dispatch = useTranslateDispatch();
  const { start, cancel, confirmCancel, dismissCancel, retry, cancelRequested } = useTranslation();
  const { history, clearHistory } = useJobHistory();
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <aside className="w-full lg:w-[420px] shrink-0 flex flex-col bg-[var(--color-surface-elevated)] border-r border-[var(--color-border)] lg:h-screen overflow-y-auto scroll-thin">
      <PanelHeader onHistoryClick={() => setHistoryOpen(true)} hasHistory={history.length > 0} />

      <div className="flex-1 px-5 py-4 space-y-5">
        <InputSection />
        <div className="space-y-4">
          <ServiceSelector />
          <EnvKeyInputs />
        </div>
        <LanguagePicker />
        <OutputModeSelect />
        <PageRange />
        <AdvancedOptions />
        <ErrorBanner error={state.error} onDismiss={() => dispatch({ type: 'DISMISS_ERROR' })}
          onRetry={state.status === 'failed' ? retry : undefined} />
        <TranslateButton onTranslate={start} onCancel={cancel} />
        <ProgressIndicator />
        <DownloadPanel />
      </div>

      <div className="px-5 pb-3">
        <Footer />
      </div>

      <CancelConfirmDialog open={cancelRequested} onConfirm={confirmCancel} onDismiss={dismissCancel} />
      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)}
        history={history} onClear={clearHistory}
        onRetry={(entry) => {
          dispatch({ type: 'SET_SERVICE', service: entry.service });
          dispatch({ type: 'SET_LANG_FROM', lang: entry.langFrom });
          dispatch({ type: 'SET_LANG_TO', lang: entry.langTo });
          dispatch({ type: 'SET_OUTPUT_MODE', mode: entry.outputMode });
          setHistoryOpen(false);
        }} />
    </aside>
  );
}
