import { useState, useEffect, useCallback } from 'react';
import type { Service } from '../api/client';
import { fetchServices } from '../api/client';

const CACHE_KEY = 'pdfmathtranslate_services';

interface UseServiceListResult {
  services: Service[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useServiceList(): UseServiceListResult {
  const [services, setServices] = useState<Service[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchServices();
      setServices(data);
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载服务列表失败');
      // Keep cached data if available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { services, loading, error, retry: load };
}
