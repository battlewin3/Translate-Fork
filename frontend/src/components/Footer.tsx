import { T } from '../i18n/zh';

export default function Footer() {
  return (
    <footer className="mt-auto pt-4">
      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer hover:text-slate-500 transition-colors">
          {T.techDetails}
        </summary>
        <div className="mt-2 space-y-1 pl-1">
          <p>
            前端: React 19 + TypeScript + Vite + Tailwind CSS 4
          </p>
          <p>
            后端: FastAPI (Python) - 端口 8000
          </p>
          <p>
            基于 pdf2zh 引擎进行 PDF 数学公式翻译
          </p>
          <p>
            <a
              href="https://github.com/PDFMathTranslate/PDFMathTranslate"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand/70 hover:text-brand transition-colors"
            >
              GitHub
            </a>
          </p>
        </div>
      </details>
    </footer>
  );
}
