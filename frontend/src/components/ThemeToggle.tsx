import { useState, useEffect } from 'react';
import { useT } from '../i18n/useT';

type Theme = 'system' | 'light' | 'dark';

const THEME_KEY = 'pdfmathtranslate_theme';

function getStoredTheme(): Theme {
  try {
    return (localStorage.getItem(THEME_KEY) as Theme) || 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (theme === 'light') {
    root.classList.add('light');
  } else if (theme === 'dark') {
    root.classList.add('dark');
  }
  // 'system' removes both classes, letting media query take over
}

export function ThemeToggle() {
  const T = useT();
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const cycle = () => {
    setTheme((t) => {
      if (t === 'system') return 'dark';
      if (t === 'dark') return 'light';
      return 'system';
    });
  };

  const label =
    theme === 'dark' ? T.themeDark : theme === 'light' ? T.themeLight : T.themeSystem;

  return (
    <button
      type="button"
      onClick={cycle}
      className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
      title={label}
      aria-label={label}
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 3a5 5 0 1 0 5 5 4.5 4.5 0 0 1-5-5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : theme === 'light' ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 1v1M8 14v1M1 8h1M14 8h1M2.5 2.5l.7.7M12.8 12.8l.7.7M2.5 13.5l.7-.7M12.8 3.2l.7-.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 1v1M8 14v1M1 8h1M14 8h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
