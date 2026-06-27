import { useTranslateState } from '../hooks/useTranslateState';
import PDFPreview from './PDFPreview';
import EmptyDropZone from './EmptyDropZone';
import ProgressIndicator from './ProgressIndicator';
import DownloadPanel from './DownloadPanel';
import BatchProgressList from './BatchProgressList';
import BatchDownloadPanel from './BatchDownloadPanel';

interface PreviewAreaProps {
  previewUrl: string | null;
}

export default function PreviewArea({ previewUrl }: PreviewAreaProps) {
  const state = useTranslateState();
  const hasInput = !!(state.file || state.url || (state.batchMode && state.batchFiles.length > 0));
  const isTranslating = state.status === 'uploading' || state.status === 'translating' || state.status === 'validating';
  const isComplete = state.status === 'completed';

  return (
    <main id="main-content" className="flex-1 min-h-0 bg-[var(--color-surface)] flex flex-col">
      {/* Empty state: centered drop zone — show whenever there's no input */}
      {!hasInput && (
        <div className="animate-fade-in flex-1 flex">
          <EmptyDropZone />
        </div>
      )}

      {/* Has file: show preview */}
      {hasInput && (
        <div className="flex-1 p-4 min-h-0 flex flex-col animate-scale-in">
          <div className="flex-1 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] overflow-hidden relative">
            <PDFPreview fileUrl={previewUrl} />

            {/* Translating overlay */}
            {isTranslating && (
              <div className="absolute inset-0 bg-[var(--color-surface)]/80 flex items-center justify-center p-8 animate-fade-in">
                <div className="w-full max-w-sm">
                  {state.batchMode ? <BatchProgressList /> : <ProgressIndicator />}
                </div>
              </div>
            )}

            {/* Complete overlay */}
            {isComplete && (
              <div className="absolute inset-0 bg-[var(--color-surface)]/80 flex items-center justify-center p-8 animate-fade-in">
                <div className="w-full max-w-sm">
                  {state.batchMode ? <BatchDownloadPanel /> : <DownloadPanel />}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
