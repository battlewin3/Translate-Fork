import { useT } from '../i18n/useT';

export default function Footer() {
  const T = useT();
  return (
    <footer className="pt-3 border-t border-[var(--color-border)]">
      <details className="text-[11px] text-[var(--color-text-tertiary)] group">
        <summary className="cursor-pointer hover:text-[var(--color-text-secondary)] transition-colors">
          {T.techDetails}
        </summary>
        <div className="mt-2 space-y-1 pl-1">
          <p>Frontend: React + TypeScript + Vite + Tailwind CSS 4</p>
          <p>Backend: FastAPI (Python) — port 8000</p>
          <p>Engine: pdf2zh — PDF Math Translation</p>
          <a
            href="https://github.com/PDFMathTranslate/PDFMathTranslate"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-brand)] hover:underline transition-colors inline-block mt-1"
          >
            GitHub
          </a>
        </div>
      </details>
    </footer>
  );
}
