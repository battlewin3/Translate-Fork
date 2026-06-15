import { T } from '../i18n/zh';

interface MobileTabBarProps {
  activeTab: 'config' | 'preview';
  onTabChange: (tab: 'config' | 'preview') => void;
}

export function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 h-12 bg-[var(--color-surface-elevated)] border-t border-[var(--color-border)] z-40 flex"
      role="tablist"
      aria-label="页面切换"
    >
      <button
        role="tab"
        aria-selected={activeTab === 'config'}
        className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors
          ${activeTab === 'config'
            ? 'text-[var(--color-brand)] border-t-2 border-[var(--color-brand)]'
            : 'text-[var(--color-text-secondary)] border-t-2 border-transparent'
          }`}
        onClick={() => onTabChange('config')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 3h12M2 8h12M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="5" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="8" r="1.5" fill="currentColor"/>
          <circle cx="5" cy="13" r="1.5" fill="currentColor"/>
        </svg>
        {T.tabConfig}
      </button>
      <button
        role="tab"
        aria-selected={activeTab === 'preview'}
        className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors
          ${activeTab === 'preview'
            ? 'text-[var(--color-brand)] border-t-2 border-[var(--color-brand)]'
            : 'text-[var(--color-text-secondary)] border-t-2 border-transparent'
          }`}
        onClick={() => onTabChange('preview')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1" y="2" width="14" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        {T.tabPreview}
      </button>
    </nav>
  );
}
