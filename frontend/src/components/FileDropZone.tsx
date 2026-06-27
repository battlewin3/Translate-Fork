import { useEffect, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { useTranslateDispatch } from '../hooks/useTranslateDispatch';
import { useT } from '../i18n/useT';

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_FILES = 20;
const ALLOWED_EXTS = ['.pdf', '.doc', '.docx'];

function validateFile(file: File): string | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTS.includes(ext)) return 'invalidFileType';
  if (file.size > MAX_FILE_SIZE) return 'fileTooLarge';
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type DropState = 'empty' | 'dragover' | 'selected' | 'invalid';

export default function FileDropZone() {
  const T = useT();
  const dispatch = useTranslateDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropState, setDropState] = useState<DropState>('empty');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
  }, []);

  const showError = (msg: string) => {
    setError(msg);
    setDropState('invalid');
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => { setError(null); setDropState(selectedFiles.length ? 'selected' : 'empty'); }, 4000);
  };

  const handleFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;

    // Validate each file
    for (const f of arr) {
      const ve = validateFile(f);
      if (ve) { showError(ve === 'invalidFileType' ? T.invalidFileType : T.fileTooLarge); return; }
    }

    // Enforce max files
    const total = selectedFiles.length + arr.length;
    if (total > MAX_FILES) {
      showError(`最多支持 ${MAX_FILES} 个文件`);
      return;
    }

    const newFiles = [...selectedFiles, ...arr];
    setSelectedFiles(newFiles);
    setDropState('selected');
    setError(null);

    if (newFiles.length === 1) {
      // Single file — existing behavior
      dispatch({ type: 'SET_INPUT_FILE', file: newFiles[0] });
    } else {
      // Multiple files — batch mode
      dispatch({ type: 'ADD_BATCH_FILES', files: newFiles });
    }
  };

  const removeFile = (index: number) => {
    const next = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(next);
    if (next.length === 0) {
      setDropState('empty');
      dispatch({ type: 'CLEAR_BATCH' });
      dispatch({ type: 'SET_INPUT_FILE', file: null });
    } else if (next.length === 1) {
      dispatch({ type: 'CLEAR_BATCH' });
      dispatch({ type: 'SET_INPUT_FILE', file: next[0] });
    } else {
      dispatch({ type: 'REMOVE_BATCH_FILE', index });
    }
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setDropState('empty');
    setError(null);
    dispatch({ type: 'CLEAR_BATCH' });
    dispatch({ type: 'SET_INPUT_FILE', file: null });
  };

  const borderColor = error
    ? 'border-[var(--color-error)]'
    : dropState === 'dragover'
      ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'
      : dropState === 'selected'
        ? 'border-[var(--color-success)] bg-[var(--color-success-light)]'
        : 'border-[var(--color-border)] hover:border-[var(--color-border-focus)]';

  const isMulti = selectedFiles.length > 1;

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-[var(--color-text-secondary)]">{T.uploadFile}</label>
      <div
        role="button" tabIndex={0} aria-label={T.dropOrClick}
        className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-150 ${borderColor}`}
        onDrop={(e: DragEvent) => { e.preventDefault(); handleFiles(e.dataTransfer.files); setDropState('empty'); }}
        onDragOver={(e: DragEvent) => { e.preventDefault(); setDropState('dragover'); }}
        onDragLeave={() => setDropState(selectedFiles.length ? 'selected' : 'empty')}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      >
        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" multiple
          onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files; if (f) handleFiles(f); e.target.value = ''; }} />
        {dropState === 'selected' && selectedFiles.length > 0 ? (
          <div className="space-y-2 text-left">
            {isMulti ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    已选择 {selectedFiles.length} 个文件
                  </span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); clearAll(); }}
                    className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] transition-colors">
                    全部清除
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {selectedFiles.map((f, i) => (
                    <div key={`${f.name}-${i}`} className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-[var(--color-surface)]">
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-[var(--color-text-tertiary)] shrink-0">{formatSize(f.size)}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                        className="p-0.5 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-error)]" aria-label="移除文件">
                        <svg width="12" height="12" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--color-text-tertiary)] text-center">拖放更多文件或点击添加</p>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-brand-light)] flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 16 16"><path d="M3 2h6l4 4v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="var(--color-brand)" strokeWidth="1.5"/><path d="M9 2v4h4" stroke="var(--color-brand)" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFiles[0].name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{formatSize(selectedFiles[0].size)}</p>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); clearAll(); }}
                  className="p-1 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-light)] transition-colors" aria-label="清除文件">
                  <svg width="14" height="14" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[var(--color-border)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 16 16"><path d="M8 2v8M5 6l3-3 3 3M2 12v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">{dropState === 'dragover' ? T.dropHere : T.dropOrClick}</p>
            <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">PDF / DOCX — 支持拖放多个文件进行批量翻译</p>
          </>)}
      </div>
      {error && <p className="text-xs text-[var(--color-error)]" role="alert">{error}</p>}
    </div>
  );
}
