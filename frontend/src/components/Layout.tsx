import type { ReactNode } from 'react';

interface LayoutProps {
  sidebar: ReactNode;
  preview: ReactNode;
}

export default function Layout({ sidebar, preview }: LayoutProps) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      {sidebar}
      <main className="flex-1 min-h-screen hidden lg:flex flex-col bg-slate-50">
        {preview}
      </main>
    </div>
  );
}
