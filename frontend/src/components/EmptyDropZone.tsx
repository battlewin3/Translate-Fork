import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { useT } from '../i18n/useT';
import { useTranslateDispatch } from '../hooks/useTranslateDispatch';

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

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function EmptyDropZone() {
  const T = useT();
  const dispatch = useTranslateDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragover, setDragover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };

  const handleFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;

    for (const f of arr) {
      const ve = validateFile(f);
      if (ve) { showError(ve === 'invalidFileType' ? T.invalidFileType : T.fileTooLarge); return; }
    }

    const total = selectedFiles.length + arr.length;
    if (total > MAX_FILES) {
      showError(`最多支持 ${MAX_FILES} 个文件`);
      return;
    }

    const newFiles = [...selectedFiles, ...arr];
    setSelectedFiles(newFiles);
    setError(null);

    if (newFiles.length === 1) {
      dispatch({ type: 'SET_INPUT_FILE', file: newFiles[0] });
    } else {
      dispatch({ type: 'ADD_BATCH_FILES', files: newFiles });
    }
  };

  const removeFile = (index: number) => {
    const next = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(next);
    if (next.length === 0) {
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
    setError(null);
    dispatch({ type: 'CLEAR_BATCH' });
    dispatch({ type: 'SET_INPUT_FILE', file: null });
  };

  const handleUrlSubmit = () => {
    const trimmed = urlValue.trim();
    if (!trimmed) {
      setUrlError('请输入链接地址');
      return;
    }
    if (!isValidUrl(trimmed)) {
      setUrlError(T.urlInvalid);
      return;
    }
    setUrlError(null);
    dispatch({ type: 'SET_INPUT_TYPE', inputType: 'url' });
    dispatch({ type: 'SET_INPUT_URL', url: trimmed });
  };

  const isMulti = selectedFiles.length > 1;
  const hasFiles = selectedFiles.length > 0;

  const dropZoneStyles = error
    ? 'border-[var(--color-error)] bg-[var(--color-error-light)]'
    : dragover
      ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'
      : hasFiles
        ? 'border-[var(--color-success)] bg-[var(--color-success-light)]'
        : 'border-[var(--color-border)] hover:border-[var(--color-border-focus)] hover:bg-[var(--color-surface)]';

  return (
    <div className="flex-1 flex items-center justify-center min-h-0 p-8">
      <div className="flex flex-col items-center gap-4 max-w-md w-full">
        {/* Drop Zone */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => { if (!showUrlInput && !hasFiles) inputRef.current?.click(); }}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !showUrlInput && !hasFiles) inputRef.current?.click(); }}
          onDragOver={(e: DragEvent) => { e.preventDefault(); setDragover(true); }}
          onDragLeave={() => setDragover(false)}
          onDrop={(e: DragEvent) => { e.preventDefault(); setDragover(false); const f = e.dataTransfer.files; if (f?.length) handleFiles(f); }}
          className={`w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-150 ${dropZoneStyles}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            multiple
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const f = e.target.files;
              if (f?.length) handleFiles(f);
              e.target.value = '';
            }}
          />

          {hasFiles ? (
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
                      <div key={`${f.name}-${i}`} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-[var(--color-surface)]">
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
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-light)] flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 16 16"><path d="M3 2h6l4 4v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="var(--color-brand)" strokeWidth="1.5"/><path d="M9 2v4h4" stroke="var(--color-brand)" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFiles[0].name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{formatSize(selectedFiles[0].size)}</p>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); clearAll(); }}
                    className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-light)] transition-colors" aria-label="清除文件">
                    <svg width="14" height="14" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[var(--color-brand-light)] flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 256 256" fill="none">
                  <path d="M88 144L128 184L168 144" stroke="var(--color-brand)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M128 104V184" stroke="var(--color-brand)" strokeWidth="10" strokeLinecap="round"/>
                  <rect x="40" y="40" width="176" height="176" rx="16" stroke="var(--color-brand)" strokeWidth="10"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                {dragover ? T.dropHere : T.dropOrClick}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                PDF / DOCX · 最大 100 MB · 支持拖放多个文件进行批量翻译
              </p>
            </>
          )}
        </div>

        {error && (
          <p className="text-sm text-[var(--color-error)]" role="alert">{error}</p>
        )}

        {/* URL input */}
        {showUrlInput ? (
          <div className="w-full space-y-2">
            <div className="flex gap-2">
              <input
                type="url"
                value={urlValue}
                onChange={(e) => { setUrlValue(e.target.value); setUrlError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleUrlSubmit(); }}
                placeholder={T.urlPlaceholder}
                autoFocus
                className="flex-1 h-9 px-3 rounded-lg border text-sm bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-0 focus:border-[var(--color-border-focus)] border-[var(--color-border)]"
              />
              <button
                type="button"
                onClick={handleUrlSubmit}
                className="px-4 h-9 text-sm font-medium rounded-lg bg-[var(--color-brand)] text-white hover:opacity-90 transition-opacity"
              >
                {T.confirm}
              </button>
            </div>
            {urlError && (
              <p className="text-xs text-[var(--color-error)]">{urlError}</p>
            )}
            <button
              type="button"
              onClick={() => { setShowUrlInput(false); setUrlValue(''); setUrlError(null); }}
              className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              {T.backToFile}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowUrlInput(true)}
            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-brand)] transition-colors"
          >
            {T.orInputURL}
          </button>
        )}
      </div>
    </div>
  );
}
