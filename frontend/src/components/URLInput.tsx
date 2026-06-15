import { T } from '../i18n/zh';

interface URLInputProps {
  url: string;
  onUrlChange: (url: string) => void;
}

export default function URLInput({ url, onUrlChange }: URLInputProps) {
  return (
    <div>
      <input
        type="url"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder={T.urlPlaceholder}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand/40 focus:border-brand outline-none transition-all bg-white"
      />
    </div>
  );
}
