import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { useTranslateDispatch } from '../hooks/useTranslateDispatch';
import { T } from '../i18n/zh';

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_EXTS = ['.pdf', '.doc', '.docx'];

function validateFile(file: File): string | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTS.includes(ext)) return T.invalidFileType;
  if (file.size > MAX_FILE_SIZE) return T.fileTooLarge;
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type DropState = 'empty' | 'dragover' | 'selected' | 'invalid';

export default function FileDropZone() {
  const dispatch = useTranslateDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropState, setDropState] = useState<DropState>('empty');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorTimer, setErrorTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const showError = (msg: string) => {
    setError(msg);
    setDropState('invalid');
    if (errorTimer) clearTimeout(errorTimer);
    const t = setTimeout(() => { setError(null); setDropState(selectedFile ? 'selected' : 'empty'); }, 4000);
    setErrorTimer(t);
  };

  const handleFile = (file: File) => {
    const ve = validateFile(file);
    if (ve) { showError(ve); return; }
    setSelectedFile(file);
    setDropState('selected');
    setError(null);
    dispatch({ type: 'SET_INPUT_FILE', file });
  };

  const borderColor = error
    ? 'border-[var(--color-error)]'
    : dropState === 'dragover'
      ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'
      : dropState === 'selected'
        ? 'border-[var(--color-success)] bg-[var(--color-success-light)]'
        : 'border-[var(--color-border)] hover:border-[var(--color-border-focus)]';

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-[var(--color-text-secondary)]">{T.uploadFile}</label>
      <div
        role="button" tabIndex={0} aria-label={T.dropOrClick}
        className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-150 ${borderColor}`}
        onDrop={(e: DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); setDropState('empty'); }}
        onDragOver={(e: DragEvent) => { e.preventDefault(); setDropState('dragover'); }}
        onDragLeave={() => setDropState(selectedFile ? 'selected' : 'empty')}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      >
        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        {dropState === 'selected' && selectedFile ? (
          <div className="flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-brand-light)] flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 16 16"><path d="M3 2h6l4 4v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="var(--color-brand)" strokeWidth="1.5"/><path d="M9 2v4h4" stroke="var(--color-brand)" strokeWidth="1.5" strokeLinejoin="round"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{formatSize(selectedFile.size)}</p>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setDropState('empty'); setError(null); dispatch({ type: 'SET_INPUT_FILE', file: null }); }}
              className="p-1 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-light)] transition-colors" aria-label="清除文件">
              <svg width="14" height="14" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[var(--color-border)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 16 16"><path d="M8 2v8M5 6l3-3 3 3M2 12v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">{dropState === 'dragover' ? T.dropHere : T.dropOrClick}</p>
            <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">PDF / DOCX</p>
          </>
        )}
      </div>
      {error && <p className="text-xs text-[var(--color-error)]" role="alert">{error}</p>}
    </div>
  );
}
