import { T } from '../i18n/zh';
import { getDownloadUrl } from '../api/client';
import type { OutputMode } from '../hooks/useTranslate';

interface DownloadPanelProps {
  jobId: string;
  files: Record<string, string>;
  outputMode: OutputMode;
  status: string;
}

const modeLabels: Record<OutputMode, { key: string; label: string }[]> = {
  mono: [{ key: 'mono', label: T.downloadMono }],
  dual: [
    { key: 'mono', label: T.downloadMono },
    { key: 'dual', label: T.downloadDual },
  ],
  side: [
    { key: 'mono', label: T.downloadMono },
    { key: 'dual', label: T.downloadDual },
    { key: 'side', label: T.downloadSide },
  ],
};

export default function DownloadPanel({ jobId, files, outputMode, status }: DownloadPanelProps) {
  if (status !== 'complete') return null;

  const downloads = modeLabels[outputMode] || modeLabels.mono;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-slate-700">{T.downloadResults}</h4>
      <div className="space-y-1.5">
        {downloads.map(({ key, label }) => {
          const filename = files[key];
          if (!filename) return null;
          return (
            <a
              key={key}
              href={getDownloadUrl(jobId, key)}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-white hover:border-brand/40 hover:bg-brand-light/20 transition-all group"
              download
            >
              <span className="text-xs text-slate-600 truncate flex-1 mr-2">{label}</span>
              <svg
                className="w-4 h-4 text-slate-400 group-hover:text-brand transition-colors shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </a>
          );
        })}
      </div>
    </div>
  );
}
