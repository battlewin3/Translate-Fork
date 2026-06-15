import { T } from '../i18n/zh';

interface PDFPreviewProps {
  fileUrl: string | null;
}

export default function PDFPreview({ fileUrl }: PDFPreviewProps) {
  if (!fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-tertiary)] gap-3 px-4">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <p className="text-sm font-medium">{T.preview}</p>
        <p className="text-xs">{T.previewEmpty}</p>
      </div>
    );
  }

  return (
    <iframe
      src={fileUrl}
      className="w-full h-full border-0 bg-white"
      title={T.preview}
    />
  );
}
