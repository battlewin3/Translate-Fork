import { useState, useEffect, useCallback } from 'react';
import type { SetupStatus } from '../api/client';
import { fetchSetupStatus } from '../api/client';

interface UseSetupStatusResult {
  status: SetupStatus | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Fetch the backend configuration status on mount.
 * Returns which services are configured, the last-used service,
 * and per-env-key status (is_set, is_sensitive, value).
 *
 * Used by App.tsx to initialize service selection and pre-fill
 * non-sensitive env fields from persisted backend config.
 */
export function useSetupStatus(): UseSetupStatusResult {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSetupStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载配置状态失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { status, loading, error, retry: load };
}
