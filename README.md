**English** | [简体中文](docs/README_zh-CN.md)

---

# PDFMathTranslate (Fork)

Scientific PDF document translation preserving layouts — with a modern React frontend, FastAPI REST API, MCP server for AI agents, and CLI.

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

### CLI Translation

```bash
# First-time setup (interactive service configuration wizard)
pdf2zh --setup

# Translate a document
pdf2zh document.pdf

# With specific service + languages
pdf2zh document.pdf -s deepseek -li en -lo zh

# Batch directory translation
pdf2zh --dir ./pdfs/ -s openai:gpt-4o-mini
```

`pdf2zh --setup` persists your API keys to `~/.config/PDFMathTranslate/config.json` (0600 permissions). You only need to configure once.

## Features

### Web UI (React SPA)

- **Modern UI**: React 19 + TypeScript 6 + Vite 8 + Tailwind 4
- **i18n**: Full Chinese / English localization
- **Batch translation**: Multi-file upload with progress tracking and ZIP download
- **Service configuration**: Select from 25 translation services, enter API keys, test connectivity — all in-browser
- **SSE progress**: Real-time translation progress via Server-Sent Events
- **Output modes**: Mono (translation only), Dual (alternating pages), Side-by-side (left original + right translation)
- **Job history**: Client-side history of past translations
- **Dark mode**: System-aware theme toggle

### REST API (FastAPI)

Base URL: `http://127.0.0.1:8000` — Interactive docs at `/docs`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/setup-status` | Check service configuration state |
| `GET` | `/api/services` | List all 25 translation services |
| `GET` | `/api/languages` | List supported languages |
| `POST` | `/api/translate` | Start single-file translation |
| `POST` | `/api/translate-batch` | Start batch translation (max 20 files) |
| `GET` | `/api/translate/{job_id}` | Poll job status |
| `GET` | `/api/translate/{job_id}/progress` | SSE real-time progress stream |
| `GET` | `/api/download/{job_id}/{type}` | Download result (mono/dual/side) |
| `POST` | `/api/cancel/{job_id}` | Cancel a running job |
| `POST` | `/api/test-service` | Test translation service connectivity |
| `GET` | `/api/translate-batch/{batch_id}` | Batch status |
| `GET` | `/api/translate-batch/{batch_id}/download` | Download all results as ZIP |

### MCP Server for AI Agents

This project provides an MCP (Model Context Protocol) server so AI agents (Claude Desktop, Hermes, Copilot, etc.) can translate PDFs directly:

```bash
# STDIO mode (Claude Desktop)
python -m pdf2zh.mcp_server

# SSE mode (HTTP transport)
pdf2zh --mcp --sse --port 3001
```

MCP tools: `get_setup_status`, `list_services`, `configure_service`, `test_service`, `translate_pdf`, `translate_batch`

**Agent guides**: [`CLAUDE.md`](CLAUDE.md) (comprehensive) and [`AGENTS.md`](AGENTS.md) (Hermes-optimized). Both instruct AI agents to always check setup status first and guide users through service selection — never silently using defaults.

## Differences from Upstream

| Area | Upstream (Byaidu/PDFMathTranslate) | This Fork |
|------|-----------------------------------|-----------|
| **Frontend** | Gradio (`pdf2zh -i`) | React + Vite SPA |
| **API** | Gradio endpoints | FastAPI + SSE progress |
| **MCP** | N/A | MCP server for AI agents |
| **Setup** | Env vars | CLI wizard (`--setup`) + UI config |
| **Translation** | Shared engine | Shared engine (identical) |
| **Modes** | `fast` (legacy) + `precise` (v2) | Same, selectable in UI |
| **Output** | mono / dual PDFs | mono / dual / side-by-side |
| **Batch** | Directory only (CLI) | API batch + UI multi-file |
| **History** | N/A | Client-side job history |
| **Lazy imports** | All deps required at import | Optional: only needed service deps |

## Project Structure

```
启动.bat            One-click launcher (Windows, self-bootstrapping shortcut)
CLAUDE.md            Comprehensive AI agent guide
AGENTS.md            Hermes-optimized agent quick-start
assets/              Static assets (icons, etc.)
frontend/            React 19 + Vite + TypeScript (SPA)
pdf2zh/              Translation engine + FastAPI server + MCP server
  api.py             REST + SSE endpoints
  mcp_server.py      MCP tools for AI agents
  pdf2zh.py          CLI entry point (--setup, --mcp, translation)
  translator.py      25 translation services (Google, OpenAI, DeepL, etc.)
  high_level.py      PDF → translated PDF pipeline
  config.py          Persistent config manager (0600 perms)
  kernel/            Hot-pluggable kernel abstraction (fast/precise)
  vendor/            Bundled dependencies (babeldoc v0.6.3)
```

## Translation Services

| Type | Services |
|------|----------|
| **Free** (no API key) | Google, Bing, Argos |
| **Paid LLM** (best quality) | OpenAI, DeepSeek, Gemini, Grok, Groq, DeepL, Zhipu, ModelScope, SiliconCloud, MiniMax, 302.AI, Qwen MT, OpenAI-Liked |
| **Local** (self-hosted) | Ollama, Xinference, AnythingLLM, Dify |
| **Enterprise** | Azure OpenAI, Azure Translator, Tencent TMT |

See [CLAUDE.md](CLAUDE.md) for full service details with env var requirements.

## Development

```bash
# One-click (Windows)
启动.bat

# Frontend only (hot reload)
cd frontend && npm run dev

# Backend only
python -m uvicorn pdf2zh.api:app --host 0.0.0.0 --port 8000 --reload

# MCP server (STDIO)
python -m pdf2zh.mcp_server

# MCP server (SSE)
pdf2zh --mcp --sse --port 3001

# CLI translation
pdf2zh document.pdf

# Tests
python -m pytest test/ -v
cd frontend && npm test -- --run
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
