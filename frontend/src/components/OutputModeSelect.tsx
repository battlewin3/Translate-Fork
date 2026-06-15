import { T } from '../i18n/zh';
import type { OutputMode } from '../hooks/useTranslate';

interface OutputModeSelectProps {
  value: OutputMode;
  onChange: (mode: OutputMode) => void;
}

const modes: { value: OutputMode; label: string; isNew?: boolean }[] = [
  { value: 'mono', label: T.outputModeMono },
  { value: 'dual', label: T.outputModeDual },
  { value: 'side', label: T.outputModeSide, isNew: true },
];

export default function OutputModeSelect({ value, onChange }: OutputModeSelectProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {T.outputMode}
      </label>
      <div className="space-y-1.5">
        {modes.map((mode) => (
          <label
            key={mode.value}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
              value === mode.value
                ? 'border-brand bg-brand-light/50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="outputMode"
              value={mode.value}
              checked={value === mode.value}
              onChange={() => onChange(mode.value)}
              className="accent-brand w-4 h-4"
            />
            <span className="text-sm text-slate-700 flex-1">{mode.label}</span>
            {mode.isNew && (
              <span className="text-[10px] font-medium bg-success/10 text-success px-1.5 py-0.5 rounded-full">
                {T.newFeature}
              </span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
