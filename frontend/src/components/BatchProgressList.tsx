import React from 'react';
import { useTranslateState } from '../hooks/useTranslateState';
import type { BatchJob } from '../reducers/translateReducer';

const statusBadge: Record<string, { label: string; color: string }> = {
  queued: { label: '排队中', color: 'bg-gray-200 text-gray-600' },
  running: { label: '翻译中', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700' },
  failed: { label: '失败', color: 'bg-red-100 text-red-700' },
  cancelled: { label: '已取消', color: 'bg-yellow-100 text-yellow-700' },
};

const JobRow = React.memo(function JobRow({ job }: { job: BatchJob }) {
  const badge = statusBadge[job.status] || statusBadge.queued;
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <span className="text-sm truncate flex-1 min-w-0" title={job.filename}>
        {job.filename}
      </span>
      <div className="w-20 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden shrink-0">
        <div
          className="h-full rounded-full bg-[var(--color-brand)] transition-all duration-300"
          style={{ width: `${Math.round(job.progress * 100)}%` }}
        />
      </div>
      <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium shrink-0 ${badge.color}`}>
        {badge.label}
      </span>
      {job.error && (
        <span className="text-[11px] text-[var(--color-error)] shrink-0 max-w-[120px] truncate" title={job.error}>
          {job.error}
        </span>
      )}
    </div>
  );
});

export default function BatchProgressList() {
  const state = useTranslateState();

  if (!state.batchMode || state.batchJobs.length === 0) return null;

  const completed = state.batchJobs.filter(j => j.status === 'completed').length;
  const total = state.batchJobs.length;
  const overallPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-2 animate-[slideDown_200ms_ease-out]">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
          批量进度 ({completed}/{total})
        </h4>
        <span className="text-xs text-[var(--color-text-secondary)]">{overallPct}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--color-brand)] transition-all duration-500"
          style={{ width: `${overallPct}%` }}
        />
      </div>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {state.batchJobs.map((job) => (
          <JobRow key={job.jobId} job={job} />
        ))}
      </div>
    </div>
  );
}
