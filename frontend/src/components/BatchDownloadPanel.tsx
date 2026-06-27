import { useTranslateState } from '../hooks/useTranslateState';
import { useT } from '../i18n/useT';
import { getBatchDownloadUrl, getDownloadUrl } from '../api/client';

export default function BatchDownloadPanel() {
  const T = useT();
  const state = useTranslateState();

  if (!state.batchMode || !state.batchId) return null;
  if (state.status !== 'completed') return null;

  const completed = state.batchJobs.filter(j => j.status === 'completed' && j.resultFiles);
  if (completed.length === 0) return null;

  return (
    <div className="space-y-2 animate-[slideDown_200ms_ease-out]">
      <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">{T.downloadResults}</h4>

      {/* Primary: Download all side PDFs as zip */}
      <a
        href={getBatchDownloadUrl(state.batchId, 'side')}
        className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--color-brand)] bg-[var(--color-brand-light)] hover:bg-[var(--color-brand)] hover:text-white transition-all group"
        download
      >
        <span className="text-sm font-medium truncate flex-1 mr-2 group-hover:text-white transition-colors">
          下载全部对照版 (ZIP)
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
          className="text-[var(--color-brand)] group-hover:text-white transition-colors shrink-0">
          <path d="M4 12v1a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1m-4-5v7m0 0l-2-2m2 2l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </a>

      {/* Secondary: per-file download links */}
      <details className="text-xs">
        <summary className="cursor-pointer text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
          单独下载 ({completed.length} 个文件)
        </summary>
        <div className="mt-2 space-y-1">
          {completed.map(job => (
            <div key={job.jobId} className="flex items-center gap-2 text-[11px]">
              <span className="truncate flex-1 text-[var(--color-text-secondary)]">{job.filename}</span>
              {job.resultFiles?.side && (
                <a href={getDownloadUrl(job.jobId, 'side')} className="text-[var(--color-brand)] hover:underline shrink-0" download>对照</a>
              )}
              {job.resultFiles?.dual && (
                <a href={getDownloadUrl(job.jobId, 'dual')} className="text-[var(--color-brand)] hover:underline shrink-0" download>双栏</a>
              )}
              {job.resultFiles?.mono && (
                <a href={getDownloadUrl(job.jobId, 'mono')} className="text-[var(--color-brand)] hover:underline shrink-0" download>单语</a>
              )}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
