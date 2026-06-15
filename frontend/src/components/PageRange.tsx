import { T } from '../i18n/zh';
import type { PageRangePreset } from '../hooks/useTranslate';

interface PageRangeProps {
  pageRange: PageRangePreset;
  customPages: string;
  onPageRangeChange: (range: PageRangePreset) => void;
  onCustomPagesChange: (pages: string) => void;
}

const presets: { value: PageRangePreset; label: string }[] = [
  { value: 'all', label: T.pageAll },
  { value: 'first', label: T.pageFirst },
  { value: 'first5', label: T.pageFirst5 },
  { value: 'custom', label: T.pageCustom },
];

export default function PageRange({
  pageRange,
  customPages,
  onPageRangeChange,
  onCustomPagesChange,
}: PageRangeProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {T.pageRange}
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {presets.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onPageRangeChange(p.value)}
            className={`px-3 py-1 text-xs rounded-md border transition-all ${
              pageRange === p.value
                ? 'bg-brand text-white border-brand'
                : 'bg-white text-slate-600 border-slate-300 hover:border-brand/50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {pageRange === 'custom' && (
        <input
          type="text"
          value={customPages}
          onChange={(e) => onCustomPagesChange(e.target.value)}
          placeholder={T.customPageHint}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand/40 focus:border-brand outline-none transition-all bg-white"
        />
      )}
    </div>
  );
}
