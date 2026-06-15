import { useEffect, useState } from 'react';
import { fetchLanguages, type Language } from '../api/client';
import { T } from '../i18n/zh';

interface LanguagePickerProps {
  langFrom: string;
  langTo: string;
  onLangFromChange: (lang: string) => void;
  onLangToChange: (lang: string) => void;
}

export default function LanguagePicker({
  langFrom,
  langTo,
  onLangFromChange,
  onLangToChange,
}: LanguagePickerProps) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLanguages()
      .then(setLanguages)
      .catch(() => setLanguages([]))
      .finally(() => setLoading(false));
  }, []);

  const selectClass =
    'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand/40 focus:border-brand outline-none transition-all disabled:opacity-50';

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {T.langFromLabel}
        </label>
        <select
          value={langFrom}
          onChange={(e) => onLangFromChange(e.target.value)}
          disabled={loading}
          className={selectClass}
        >
          {loading ? (
            <option>加载中...</option>
          ) : (
            languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))
          )}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {T.langToLabel}
        </label>
        <select
          value={langTo}
          onChange={(e) => onLangToChange(e.target.value)}
          disabled={loading}
          className={selectClass}
        >
          {loading ? (
            <option>加载中...</option>
          ) : (
            languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
}
