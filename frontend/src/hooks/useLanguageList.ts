import { useState, useEffect, useCallback } from 'react';
import type { Language } from '../api/client';
import { fetchLanguages } from '../api/client';

const CACHE_KEY = 'pdfmathtranslate_languages';
const FALLBACK_LANGUAGES: Language[] = [
  { name: 'English', code: 'en' },
  { name: 'Simplified Chinese', code: 'zh' },
  { name: 'Traditional Chinese', code: 'zh-TW' },
  { name: 'Japanese', code: 'ja' },
  { name: 'Korean', code: 'ko' },
  { name: 'French', code: 'fr' },
  { name: 'German', code: 'de' },
  { name: 'Spanish', code: 'es' },
  { name: 'Arabic', code: 'ar' },
];

interface UseLanguageListResult {
  languages: Language[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useLanguageList(): UseLanguageListResult {
  const [languages, setLanguages] = useState<Language[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : FALLBACK_LANGUAGES;
    } catch {
      return FALLBACK_LANGUAGES;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLanguages();
      setLanguages(data);
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载语言列表失败');
      // Use fallback or cached
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { languages, loading, error, retry: load };
}
