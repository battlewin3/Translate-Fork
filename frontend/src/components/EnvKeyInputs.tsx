import { useEffect, useState, useMemo } from 'react';
import { fetchServices, type ServiceEnv } from '../api/client';

interface EnvKeyInputsProps {
  service: string;
  envs: Record<string, string>;
  onEnvChange: (key: string, value: string) => void;
}

export default function EnvKeyInputs({ service, envs, onEnvChange }: EnvKeyInputsProps) {
  const [serviceEnvs, setServiceEnvs] = useState<ServiceEnv[]>([]);

  useEffect(() => {
    fetchServices()
      .then((services) => {
        const svc = services.find((s) => s.name === service);
        setServiceEnvs(svc?.envs || []);
      })
      .catch(() => setServiceEnvs([]));
  }, [service]);

  const visibleEnvs = useMemo(
    () => serviceEnvs.filter((e) => e.is_api_key || e.key.includes('api_key') || e.key.includes('key')),
    [serviceEnvs],
  );

  if (visibleEnvs.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleEnvs.map((env) => (
        <div key={env.key}>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            {env.key}
            {env.default && (
              <span className="text-slate-400 font-normal ml-1">
                (默认: ***)
              </span>
            )}
          </label>
          <input
            type="password"
            value={envs[env.key] || ''}
            onChange={(e) => onEnvChange(env.key, e.target.value)}
            placeholder={env.default ? '***' : `输入 ${env.key}`}
            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand/40 focus:border-brand outline-none transition-all bg-white"
          />
        </div>
      ))}
    </div>
  );
}
