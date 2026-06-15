import { useMemo, useEffect, useRef } from 'react';
import { useTranslate } from './hooks/useTranslate';
import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import PDFPreview from './components/PDFPreview';

export default function App() {
  const { state, set, updateEnv } = useTranslate();
  const blobUrlRef = useRef<string | null>(null);

  const previewUrl = useMemo(() => {
    // Revoke previous blob URL to prevent memory leak
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (state.file) {
      const url = URL.createObjectURL(state.file);
      blobUrlRef.current = url;
      return url;
    }
    if (state.fileInputType === 'url' && state.url) {
      return state.url;
    }
    return null;
  }, [state.file, state.fileInputType, state.url]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  return (
    <Layout
      sidebar={<Sidebar state={state} set={set} updateEnv={updateEnv} />}
      preview={
        <div className="flex-1 p-4">
          <div className="h-full rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <PDFPreview fileUrl={previewUrl} jobId={state.jobId} />
          </div>
        </div>
      }
    />
  );
}
