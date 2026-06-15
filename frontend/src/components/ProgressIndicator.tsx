import { T } from '../i18n/zh';

interface ProgressIndicatorProps {
  progress: number;
  desc: string;
  status: 'idle' | 'translating' | 'complete' | 'cancelled' | 'failed';
}

const statusLabels: Record<string, string> = {
  translating: T.translating,
  complete: T.complete,
  cancelled: T.cancelled,
  failed: T.failed,
};

const statusColors: Record<string, string> = {
  translating: 'from-brand to-blue-400',
  complete: 'from-success to-emerald-400',
  failed: 'from-error to-red-400',
  cancelled: 'from-slate-400 to-slate-500',
};

export default function ProgressIndicator({ progress, desc, status }: ProgressIndicatorProps) {
  if (status === 'idle') return null;

  const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${
          status === 'failed' ? 'text-error' :
          status === 'complete' ? 'text-success' :
          status === 'cancelled' ? 'text-slate-500' :
          'text-brand'
        }`}>
          {statusLabels[status] || status}
        </span>
        <span className="text-slate-500 tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${statusColors[status] || 'from-brand to-blue-400'} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {desc && (
        <p className="text-xs text-slate-500 truncate">{desc}</p>
      )}
    </div>
  );
}
