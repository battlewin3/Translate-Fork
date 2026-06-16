import { useTranslateState } from '../hooks/useTranslateState';
import { useT } from '../i18n/useT';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function barColor(status: string): string {
  switch (status) {
    case 'completed': return 'bg-[var(--color-success)]';
    case 'failed': return 'bg-[var(--color-error)]';
    case 'cancelled': return 'bg-[var(--color-text-tertiary)]';
    default: return 'bg-[var(--color-brand)]';
  }
}

function textColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-[var(--color-success)]';
    case 'failed': return 'text-[var(--color-error)]';
    case 'cancelled': return 'text-[var(--color-text-tertiary)]';
    default: return 'text-[var(--color-brand)]';
  }
}

export default function ProgressIndicator() {
  const T = useT();
  const state = useTranslateState();

  function statusLabel(status: string): string {
    switch (status) {
      case 'uploading': return T.uploading;
      case 'validating': return T.starting;
      case 'translating': return T.translating;
      case 'completed': return T.complete;
      case 'cancelled': return T.cancelled;
      case 'failed': return T.failed;
      default: return '';
    }
  }
  const { status, progress, progressDesc, phase, phasePage, phaseTotalPages, elapsedSeconds } = state;

  if (status === 'idle') return null;

  const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
  const eta = pct > 0 && pct < 100 && elapsedSeconds > 0
    ? Math.round((elapsedSeconds / pct) * (100 - pct))
    : null;

  const phaseText = phase === 'layout' ? T.phaseLayout : phase === 'finalizing' ? T.phaseFinalizing : '';

  return (
    <div className="animate-slide-up space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${textColor(status)}`}>
          {statusLabel(status)}
        </span>
        <span className="text-[var(--color-text-secondary)] tabular-nums">{pct}%</span>
      </div>
      <div
        className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={T.progress}
      >
        <div
          className={`h-full ${barColor(status)} rounded-full transition-[width] duration-300 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)]">
        <span className="truncate mr-2">{progressDesc || statusLabel(status)}</span>
        <div className="flex items-center gap-3 shrink-0 tabular-nums">
          {elapsedSeconds > 0 && (
            <span title={T.elapsedTime}>{formatTime(elapsedSeconds)}</span>
          )}
          {eta !== null && (
            <span title={T.estimatedTime}>~{formatTime(eta)}</span>
          )}
        </div>
      </div>
      {phaseText && phaseTotalPages > 0 && (
        <div className="text-[11px] text-[var(--color-text-tertiary)]">
          {phaseText}{phasePage > 0 && ` · ${phasePage}/${phaseTotalPages}`}
        </div>
      )}
    </div>
  );
}
