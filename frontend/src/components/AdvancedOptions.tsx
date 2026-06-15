import { useState } from 'react';
import { T } from '../i18n/zh';
import type { TranslateMode } from '../hooks/useTranslate';

interface AdvancedOptionsProps {
  threads: number;
  skipSubsetFonts: boolean;
  ignoreCache: boolean;
  vfont: string;
  customPrompt: string;
  translateMode: TranslateMode;
  showCustomPrompt: boolean;
  onThreadsChange: (v: number) => void;
  onSkipSubsetFontsChange: (v: boolean) => void;
  onIgnoreCacheChange: (v: boolean) => void;
  onVfontChange: (v: string) => void;
  onCustomPromptChange: (v: string) => void;
  onTranslateModeChange: (v: TranslateMode) => void;
}

export default function AdvancedOptions({
  threads,
  skipSubsetFonts,
  ignoreCache,
  vfont,
  customPrompt,
  translateMode,
  showCustomPrompt,
  onThreadsChange,
  onSkipSubsetFontsChange,
  onIgnoreCacheChange,
  onVfontChange,
  onCustomPromptChange,
  onTranslateModeChange,
}: AdvancedOptionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span>{T.advancedOptions}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {/* 线程数 */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {T.threads}
            </label>
            <input
              type="number"
              min={1}
              max={16}
              value={threads}
              onChange={(e) => onThreadsChange(Math.max(1, Math.min(16, parseInt(e.target.value) || 1)))}
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand/40 focus:border-brand outline-none transition-all bg-white"
            />
          </div>

          {/* 翻译模式 */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              {T.translateMode}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onTranslateModeChange('fast')}
                className={`flex-1 px-3 py-1.5 text-xs rounded-md border transition-all ${
                  translateMode === 'fast'
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-brand/50'
                }`}
              >
                {T.modeFast}
              </button>
              <button
                type="button"
                onClick={() => onTranslateModeChange('precise')}
                className={`flex-1 px-3 py-1.5 text-xs rounded-md border transition-all ${
                  translateMode === 'precise'
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-brand/50'
                }`}
              >
                {T.modePrecise}
              </button>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={skipSubsetFonts}
                onChange={(e) => onSkipSubsetFontsChange(e.target.checked)}
                className="accent-brand w-4 h-4 rounded"
              />
              <span className="text-xs text-slate-600">{T.skipFontSubset}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ignoreCache}
                onChange={(e) => onIgnoreCacheChange(e.target.checked)}
                className="accent-brand w-4 h-4 rounded"
              />
              <span className="text-xs text-slate-600">{T.ignoreCache}</span>
            </label>
          </div>

          {/* 自定义公式字体正则 */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {T.vfontLabel}
            </label>
            <input
              type="text"
              value={vfont}
              onChange={(e) => onVfontChange(e.target.value)}
              placeholder={T.vfontHint}
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand/40 focus:border-brand outline-none transition-all bg-white"
            />
          </div>

          {/* 自定义 LLM 提示词 */}
          {showCustomPrompt && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {T.customPrompt}
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => onCustomPromptChange(e.target.value)}
                rows={3}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand/40 focus:border-brand outline-none transition-all bg-white resize-y"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
