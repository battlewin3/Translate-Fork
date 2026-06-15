**English** | [简体中文](docs/README_zh-CN.md)

---

# PDFMathTranslate (Fork)

Scientific PDF document translation preserving layouts — with a modern React frontend and FastAPI backend.

This fork focuses on a **standalone API + SPA architecture**, replacing the upstream Gradio GUI with a custom React UI powered by Vite, while preserving the core PDF translation engine.

## Quick Start

### Prerequisites

Python 3.12+ and Node.js 18+ required.

### One-Click Launch (Windows)

Double-click **`启动.bat`** — it checks your environment, installs frontend dependencies if needed, starts both servers, opens the browser, and creates a `PDFMathTranslate.lnk` shortcut with a custom icon for future use.

### Manual

```bash
# Install Python dependencies
pip install -e .

# Terminal 1: Backend API
python -m uvicorn pdf2zh.api:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend dev server
cd frontend && npm install && npm run dev
```

Open http://localhost:5173 in your browser.

## Differences from Upstream

| Area | Upstream (Byaidu/PDFMathTranslate) | This Fork |
|------|-----------------------------------|-----------|
| **Frontend** | Gradio (`pdf2zh -i`) | React + Vite SPA |
| **API** | Gradio endpoints | FastAPI + SSE progress |
| **Translation** | Shared engine | Shared engine (identical) |
| **Modes** | `fast` (legacy) + `precise` (v2) | Same, selectable in UI |
| **Output** | mono / dual PDFs | mono / dual / side-by-side |
| **History** | N/A | Client-side job history |
| **Lazy imports** | All deps required at import | Optional: only needed service deps |

## Project Structure

```
启动.bat            One-click launcher (Windows, self-bootstrapping shortcut)
assets/             Static assets (icons, etc.)
frontend/           React 19 + Vite + TypeScript (SPA)
pdf2zh/             Translation engine + FastAPI server
  api.py            REST + SSE endpoints
  translator.py     Multi-service translation (Google, OpenAI, DeepL, etc.)
  high_level.py     PDF → translated PDF pipeline
  vendor/           Bundled dependencies (babeldoc)
```

## Services

- Google Translate (default, no key required)
- OpenAI / Azure OpenAI
- DeepL / DeepLX
- Ollama / Xinference / Dify / AnythingLLM (local)
- And 10+ more (see service selector in UI)

## Development

```bash
# One-click (Windows)
启动.bat

# Frontend only (hot reload)
cd frontend && npm run dev

# Backend only
python -m uvicorn pdf2zh.api:app --host 0.0.0.0 --port 8000 --reload

# CLI translation
pdf2zh document.pdf
```

## Credits

This project is a fork of [Byaidu/PDFMathTranslate](https://github.com/Byaidu/PDFMathTranslate), which has been accepted at EMNLP 2025.

```
@inproceedings{ouyang-etal-2025-pdfmathtranslate,
    title = "PDFMathTranslate: Scientific Document Translation Preserving Layouts",
    author = "Ouyang, Rongxin and Chu, Chang and Xin, Zhikuang and Ma, Xiangyao",
    booktitle = "Proceedings of EMNLP 2025: System Demonstrations",
    year = "2025",
    publisher = "Association for Computational Linguistics",
}
```

## License

AGPL-3.0 — same as upstream.
