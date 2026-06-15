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

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function EmptyDropZone() {
  const dispatch = useTranslateDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragover, setDragover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    const ve = validateFile(file);
    if (ve) {
      setError(ve);
      setTimeout(() => setError(null), 4000);
      return;
    }
    setError(null);
    dispatch({ type: 'SET_INPUT_FILE', file });
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

  return (
    <div className="flex-1 flex items-center justify-center min-h-0 p-8">
      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        {/* Drop Zone — icon inside the dashed box */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => { if (!showUrlInput) inputRef.current?.click(); }}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !showUrlInput) inputRef.current?.click(); }}
          onDragOver={(e: DragEvent) => { e.preventDefault(); setDragover(true); }}
          onDragLeave={() => setDragover(false)}
          onDrop={(e: DragEvent) => { e.preventDefault(); setDragover(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          className={`w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150 ${
            error
              ? 'border-[var(--color-error)] bg-[var(--color-error-light)]'
              : dragover
                ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'
                : 'border-[var(--color-border)] hover:border-[var(--color-border-focus)] hover:bg-[var(--color-surface)]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />

          {/* Icon inside dashed box */}
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
            PDF / DOCX · 最大 100 MB
          </p>
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
                确认
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
              返回文件上传
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
