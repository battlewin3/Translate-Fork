import { useRef, useState, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { T } from '../i18n/zh';

interface FileUploadProps {
  file: File | null;
  onFileSelect: (file: File) => void;
}

export default function FileUpload({ file, onFileSelect }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    (f: File) => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (!ext || !['pdf', 'doc', 'docx'].includes(ext)) {
        return;
      }
      onFileSelect(f);
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors select-none ${
          isDragOver
            ? 'border-brand bg-brand-light/70'
            : 'border-brand/50 bg-brand-light/30 hover:bg-brand-light/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleChange}
          className="hidden"
        />
        {file ? (
          <div className="space-y-1">
            <div className="text-sm font-semibold text-brand truncate">{file.name}</div>
            <div className="text-xs text-slate-500">{formatSize(file.size)}</div>
            <div className="text-xs text-slate-400">点击更换文件</div>
          </div>
        ) : isDragOver ? (
          <p className="text-brand font-medium text-sm">{T.dropHere}</p>
        ) : (
          <div className="space-y-2">
            <div className="mx-auto w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">{T.dropOrClick}</p>
            <p className="text-xs text-slate-400">PDF / DOCX</p>
          </div>
        )}
      </div>
    </div>
  );
}
