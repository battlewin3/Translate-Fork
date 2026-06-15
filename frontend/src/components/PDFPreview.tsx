import { T } from '../i18n/zh';

interface PDFPreviewProps {
  fileUrl: string | null;
  jobId: string | null;
}

export default function PDFPreview({ fileUrl, jobId }: PDFPreviewProps) {
  if (!fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">{T.preview}</p>
        <p className="text-xs text-slate-300">选择文件后自动预览</p>
      </div>
    );
  }

  return (
    <iframe
      src={fileUrl}
      className="w-full h-full rounded-xl border border-slate-200 bg-white"
      title="PDF 预览"
    />
  );
}
