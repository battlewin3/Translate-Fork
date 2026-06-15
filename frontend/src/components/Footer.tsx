import { T } from '../i18n/zh';

export default function Footer() {
  return (
    <footer className="pt-3 border-t border-[var(--color-border)]">
      <details className="text-[11px] text-[var(--color-text-tertiary)] group">
        <summary className="cursor-pointer hover:text-[var(--color-text-secondary)] transition-colors">
          {T.techDetails}
        </summary>
        <div className="mt-2 space-y-1 pl-1">
          <p>前端: React + TypeScript + Vite + Tailwind CSS 4</p>
          <p>后端: FastAPI (Python) - 端口 8000</p>
          <p>引擎: pdf2zh - PDF 数学公式翻译</p>
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
