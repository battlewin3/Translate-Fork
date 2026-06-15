import { useState, type ReactNode } from 'react';

interface LayoutProps {
  sidebar: ReactNode;
  mainArea: ReactNode;
}

export default function Layout({ sidebar, mainArea }: LayoutProps) {
  const [mobileTab, setMobileTab] = useState<'config' | 'preview'>('config');

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-[var(--color-surface)]">
      {/* Desktop: sidebar + main side-by-side */}
      <div className="hidden lg:flex flex-row w-full h-full">
        {sidebar}
        {mainArea}
      </div>

      {/* Mobile: tabbed */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-hidden">
          <div className={mobileTab === 'config' ? 'h-full overflow-y-auto scroll-thin' : 'hidden'}>
            {sidebar}
          </div>
          <div className={mobileTab === 'preview' ? 'h-full' : 'hidden'}>
            {mainArea}
          </div>
        </div>
        {/* Bottom tab bar */}
        <nav className="flex items-center border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)] shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('config')}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              mobileTab === 'config'
                ? 'text-[var(--color-brand)] border-t-2 border-[var(--color-brand)] -mt-px'
                : 'text-[var(--color-text-tertiary)]'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>配置</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              mobileTab === 'preview'
                ? 'text-[var(--color-brand)] border-t-2 border-[var(--color-brand)] -mt-px'
                : 'text-[var(--color-text-tertiary)]'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M5 2h4l3 3v8a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 2v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <span>预览</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
