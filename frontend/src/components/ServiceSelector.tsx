import { useEffect, useState } from 'react';
import { fetchServices, type Service } from '../api/client';
import { T } from '../i18n/zh';

interface ServiceSelectorProps {
  value: string;
  onChange: (service: string) => void;
}

export default function ServiceSelector({ value, onChange }: ServiceSelectorProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices()
      .then(setServices)
      .catch(() => {
        setServices([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {T.serviceLabel}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand/40 focus:border-brand outline-none transition-all disabled:opacity-50"
      >
        {loading ? (
          <option>加载中...</option>
        ) : (
          services.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))
        )}
      </select>
    </div>
  );
}

export type { Service };
