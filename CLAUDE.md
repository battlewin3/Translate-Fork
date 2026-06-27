# PDFMathTranslate — AI Agent Guide

Scientific PDF translation engine that preserves layouts (math, tables, figures) — with a modern FastAPI REST API, MCP server for AI agents, and React frontend.

**TL;DR:** This project translates PDF/DOCX files between 9 languages using 25 translation services. AI agents access it via **MCP tools** (Claude Desktop), **REST API** (programmatic), or **CLI** (`pdf2zh --setup` + `pdf2zh file.pdf`).

## 🚨 MANDATORY: First-Use Service Configuration

**You MUST guide the user through service selection and persistent API key configuration on first use. NEVER silently use the default translation service (Google Translate) without explicit user confirmation.**

### Required Protocol (Every Agent Must Follow)

1. **ALWAYS** call `get_setup_status()` (MCP) or `GET /api/setup-status` (REST) first — never assume a service is configured
2. **If unconfigured** (`configured: false`):
   - Present the user with service options: free (google, bing) vs paid (deepseek, openai, gemini, ...)
   - Explain the quality trade-offs (paid LLM services produce better translations for scientific content)
   - **MCP users**: call `configure_service(service="...", api_key="...")` to validate and persist
   - **REST users**: guide them to set env vars (`DEEPSEEK_API_KEY=sk-...`) or run `pdf2zh --setup`
   - **CLI users**: guide them to run `pdf2zh --setup` for an interactive configuration wizard
3. **If already configured** (`configured: true`):
   - Tell the user which services are available (`configured_services`)
   - Confirm which service they want to use
   - Only then call `translate_pdf()`

**Rationale:** The default service (Google Translate) is free and works out-of-the-box, but produces lower quality translations for technical/scientific content. Users should make an informed choice. Their API keys persist to `~/.config/PDFMathTranslate/config.json` (0600 permissions) — this is a one-time setup.

> **First command every time:** `get_setup_status` (MCP) or `GET /api/setup-status` (REST) — always check setup state first.

---

## Quick Reference

| Access Mode | First-Time Setup | Daily Use | Best For |
|-------------|-----------------|-----------|----------|
| **CLI** | `pdf2zh --setup` (interactive wizard) | `pdf2zh file.pdf` | Command-line users |
| **MCP Tools** | `configure_service(service="...", api_key="...")` | `translate_pdf(file="...")` | Claude Desktop, AI agents |
| **REST API** | Set env vars or `GET /api/setup-status` | `POST /api/translate` | Programmatic, CI/CD |
| **Web UI** | `http://localhost:5173` | Interactive in-browser | Humans |

---

## First-Time Setup (Critical Path)

### Decision Tree

```
What do you want to do?
│
├── First contact with this project?
│   └── CLI: pdf2zh --setup  (interactive wizard)
│       MCP: get_setup_status() then configure_service()
│       REST: GET /api/setup-status
│       │
│       ├── configured: true → Ready! Jump to translation.
│       │
│       └── configured: false → You need to set up a service:
│           │
│           ├── CLI: pdf2zh --setup → interactive wizard
│           │
│           ├── Want free (no API key)?
│           │   ├── MCP: configure_service(service="google")
│           │   ├── CLI: pdf2zh --setup → select google
│           │   └── REST: No env vars needed for google/bing
│           │
│           └── Want a paid service (better quality)?
│               ├── MCP: configure_service(service="deepseek", api_key="sk-...")
│               ├── CLI: pdf2zh --setup → select deepseek → enter key
│               └── REST: Set env var (e.g. DEEPSEEK_API_KEY=sk-...)
│
├── Translate one document?
│   ├── CLI: pdf2zh document.pdf
│   ├── MCP: translate_pdf(file="/path/to/doc.pdf")
│   └── REST: POST /api/translate (multipart form with file)
│
└── Translate many documents?
    ├── CLI: pdf2zh --dir ./pdfs/
    ├── MCP: translate_batch(files='["/a.pdf","/b.pdf"]')
    └── REST: POST /api/translate-batch (multipart form with files[])
```

### Setup Flow (MCP)

```
Step 1: list_services()                    → Discover what's available
Step 2: get_setup_status()                 → Check if already configured
Step 3: configure_service(service="...", api_key="...")  → One-time setup (persisted to disk)
Step 4: test_service(service="...")        → Optional: verify connectivity
Step 5: translate_pdf(file="/path/to/doc") → Translate!
```

### Setup Flow (REST API)

```
Step 1: GET /api/setup-status              → Check if configured
Step 2: Set env vars for your service      → DEEPSEEK_API_KEY=sk-... etc.
Step 3: POST /api/test-service             → Optional: verify connectivity
Step 4: POST /api/translate                → Translate!
```

**Persistence:** MCP `configure_service` and CLI `pdf2zh --setup` write to `~/.config/PDFMathTranslate/config.json`. REST API reads env vars. All paths persist across sessions — you only configure once.

### Setup Flow (CLI)

```
Step 1: pdf2zh --setup                        → Interactive service selection wizard
         - Lists all free + paid services
         - Prompts for API key / model / URL
         - Tests connection with "Hello" → translation
         - Persists to ~/.config/PDFMathTranslate/config.json
Step 2: pdf2zh document.pdf                   → Translate (uses last configured service)
Step 3: pdf2zh document.pdf -s deepseek       → Translate with specific service
```

---

## MCP Tools Reference

Available when the MCP server is running: `python -m pdf2zh.mcp_server` (STDIO) or `pdf2zh --mcp --sse --port 3001` (SSE).

### Tool: `get_setup_status`

**First tool to call.** Returns configuration status and actionable next steps.

```
Parameters: none

Returns JSON:
{
  "configured": true/false,
  "configured_services": ["deepseek", "openai"],
  "last_used": "deepseek",
  "free_services": ["google", "bing"],
  "paid_services": ["deepseek", "openai", "gemini", ...],
  "next_steps": "Ready to translate. Use translate_pdf(...)..."
}
```

**When `configured: false`**, the `next_steps` field tells you exactly what to do — including service names and example syntax.

### Tool: `list_services`

List all 25 available translation services with their configuration requirements.

```
Parameters: none

Returns JSON array:
[
  {
    "name": "google",
    "free": true,
    "envs": {},
    "custom_prompt": false
  },
  {
    "name": "deepseek",
    "free": false,
    "envs": {
      "DEEPSEEK_API_KEY": {"default": null, "required": true, "is_secret": true},
      "DEEPSEEK_MODEL": {"default": "deepseek-chat", "required": false, "is_secret": false}
    },
    "custom_prompt": true
  },
  ...
]
```

### Tool: `configure_service`

One-time setup wizard. Validates credentials with a test translation, then persists to disk.

```
Parameters:
  service  (str) — Service name from list_services (required, or "" for status)
  api_key  (str) — API key for the service (optional for free services)
  model    (str) — Model name override (optional; uses service default)
  base_url (str) — Custom base URL for OpenAI-compatible services (optional)

When called with service="" (empty): Shows current config status + guidance.
When called with service="name" + api_key="..." : Validates, persists, confirms.

Returns JSON (status mode):
  {
    "configured": true/false,
    "services": [...],  // or free_services/paid_services if unconfigured
    "message": "guidance"
  }

Returns JSON (configure mode):
  {
    "configured": true,
    "service": "deepseek",
    "latency_ms": 342,
    "sample": "你好",
    "message": "Service 'deepseek' configured successfully! ..."
  }
```

### Tool: `test_service`

Test connectivity without persisting configuration.

```
Parameters:
  service  (str) — Service name
  api_key  (str) — API key (optional for free services)
  model    (str) — Model override (optional)
  base_url (str) — Custom base URL (optional)

Returns JSON:
  {"ok": true, "latency_ms": 342, "sample": "你好"}
  {"ok": false, "error": "Connection test failed: ..."}
```

### Tool: `translate_pdf`

Translate a single PDF/DOCX document.

```
Parameters:
  file        (str) — Absolute file path to input PDF/DOC/DOCX (required)
  lang_in     (str) — Source language code: "en", "zh", "ja", etc. (default "")
  lang_out    (str) — Target language code (default "")
  service     (str) — Service name (default: last configured service)
  output_mode (str) — "side" (default, left original + right translation),
                      "dual" (alternating pages), "mono" (translation only)
  thread      (int) — Parallel threads for layout parsing (default 4)

File path must be within the allowed workspace:
  - PDF2ZH_WORKSPACE env var (if set)
  - ~/Documents/ (default)

Returns JSON (success):
  {
    "ok": true,
    "service": "deepseek",
    "files": ["/tmp/pdf2zh_output_xxx/doc-mono.pdf", "/tmp/pdf2zh_output_xxx/doc-dual.pdf", "/tmp/pdf2zh_output_xxx/doc-side.pdf"],
    "output_mode": "side"
  }

Returns JSON (error — no service configured):
  {
    "error": "No translation service configured.",
    "action": "Call list_services to see available services, then configure_service to set one up."
  }
```

### Tool: `translate_batch`

Translate multiple files concurrently (max 20 files, 4 at a time).

```
Parameters:
  files       (str) — JSON array of absolute file paths:
                      '["/path/to/a.pdf", "/path/to/b.pdf"]'
  lang_in     (str) — Source language code
  lang_out    (str) — Target language code
  service     (str) — Service name (default: last configured)
  output_mode (str) — "side" (default), "dual", "mono"
  thread      (int) — Parallel threads per file (default 4)

Returns JSON:
  {
    "total": 3,
    "succeeded": 2,
    "results": [
      {"file": "/a.pdf", "ok": true, "files": ["..."]},
      {"file": "/b.pdf", "ok": true, "files": ["..."]},
      {"file": "/c.pdf", "ok": false, "error": "File not found"}
    ]
  }
```

---

## REST API Reference

Base URL: `http://127.0.0.1:8000` (default). Interactive docs at `http://127.0.0.1:8000/docs`.

### Setup & Discovery

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/setup-status` | **First call** — returns config status + next steps guide |
| `GET` | `/api/health` | Health check: `{"status":"ok","version":"1.9.11"}` |
| `GET` | `/api/services` | List all translation services + required env vars |
| `GET` | `/api/languages` | List 9 supported languages: `[{"name":"English","code":"en"}, ...]` |

**`GET /api/setup-status` response (unconfigured):**
```json
{
  "configured": false,
  "configured_services": [],
  "last_used_service": null,
  "free_services": ["google", "bing"],
  "paid_services": ["deepseek", "openai", "gemini", "deepl", ...],
  "next_steps": "No translation service configured. Free services (no API key): google, bing. Paid services: deepseek, openai, ...",
  "api_docs_url": "/docs"
}
```

**`GET /api/setup-status` response (configured):**
```json
{
  "configured": true,
  "configured_services": ["deepseek", "openai"],
  "last_used_service": "deepseek",
  "free_services": ["google", "bing"],
  "paid_services": ["deepseek", "openai", ...],
  "next_steps": "Ready to translate. POST to /api/translate with a PDF file...",
  "api_docs_url": "/docs"
}
```

### Translation

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/translate` | Start single-file translation (multipart form) |
| `GET` | `/api/translate/{job_id}` | Poll job status |
| `GET` | `/api/translate/{job_id}/progress` | SSE stream of real-time progress |
| `GET` | `/api/download/{job_id}/{file_type}` | Download result (`mono`, `dual`, or `side`) |
| `POST` | `/api/cancel/{job_id}` | Cancel a running job |

**`POST /api/translate` form fields:**
```
file           → PDF/DOC/DOCX file (required)
service        → "google" (default)
lang_from      → "English" (default)
lang_to        → "Simplified Chinese" (default)
output_mode    → "side" | "dual" | "mono"
threads        → "4" (default)
page_range     → "All" | "First Page" | "First 5 Pages" | "Others"
custom_pages   → "1,3,5-10" (when page_range=Others)
vfont          → formula font regex
prompt         → custom translation prompt
mode           → "fast" | "precise"
skip_subset_fonts → "false"
ignore_cache   → "false"
envs_json      → '{"KEY":"value"}' for service-specific env vars
```

**Response:** `{"job_id": "abc123-def456"}` → Poll `/api/translate/abc123-def456` for status.

### Batch Translation

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/translate-batch` | Start batch translation (max 20 files) |
| `GET` | `/api/translate-batch/{batch_id}` | Aggregated batch status |
| `GET` | `/api/translate-batch/{batch_id}/download?file_type=side` | Download all as ZIP |

**`POST /api/translate-batch` form fields:** Same as single translate, but `files` accepts multiple file uploads.

**Batch status response:**
```json
{
  "batch_id": "batch-xyz",
  "overall_progress": 0.67,
  "completed": 2,
  "total": 3,
  "jobs": [
    {"job_id": "j1", "filename": "doc1.pdf", "status": "completed", "progress": 1.0, "result_files": {...}},
    {"job_id": "j2", "filename": "doc2.pdf", "status": "running", "progress": 0.5},
    {"job_id": "j3", "filename": "doc3.pdf", "status": "queued", "progress": 0}
  ]
}
```

### Diagnostics

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/test-service` | Test connectivity for a service |

---

## Translation Pipelines (Reusable Patterns)

### Pattern 1: Quick Single-File Translation (MCP)

```
1. get_setup_status()
   → If configured:false → configure_service(service="google")
2. translate_pdf(file="/path/to/doc.pdf", output_mode="side")
3. Read output files from the returned paths
```

### Pattern 2: Service Discovery → Configure → Translate (MCP)

```
1. list_services() → review available services
2. configure_service(service="deepseek", api_key="sk-...")
   → validates credentials with test translation
   → persists to ~/.config/PDFMathTranslate/config.json
3. translate_pdf(file="/path/to/doc.pdf", lang_in="en", lang_out="zh")
   → service defaults to last configured
```

### Pattern 3: Robust Translation with Error Recovery (MCP)

```
1. get_setup_status()
2. If configured:false → configure_service(service="google")
3. Try: translate_pdf(file="/path/to/doc.pdf")
   Catch error "Unknown service":
     → list_services() to verify service name
     → configure_service() again
   Catch error "No translation service configured":
     → configure_service(service="...")
4. Verify: check that returned files exist on disk
```

### Pattern 4: Batch Translation (REST API)

```
1. GET /api/setup-status → check readiness
2. POST /api/translate-batch (files=doc1.pdf, doc2.pdf, doc3.pdf, service=deepseek)
3. Poll: GET /api/translate-batch/{batch_id} every 2 seconds
4. When all jobs terminal (completed|failed|cancelled):
   GET /api/translate-batch/{batch_id}/download?file_type=side → ZIP
```

### Pattern 5: SSE Progress Monitoring (REST API)

```
1. POST /api/translate → {"job_id": "abc123"}
2. GET /api/translate/abc123/progress (EventSource/SSE)
   → stream: event=progress, data={"progress":0.42,"desc":"Translating page 3/10"}
   → final: event=complete, data={"status":"completed","files":{...}}
```

### Pattern 6: Full Document Processing Pipeline (MCP + Filesystem)

```
1. Use filesystem MCP to locate documents:
   → Search ~/Documents/ for *.pdf
2. get_setup_status() → ensure service is configured
3. For each document:
   translate_pdf(file="/path/to/doc.pdf", lang_in="en", lang_out="zh", output_mode="side")
4. Collect output paths and report to user
```

---

## Available Translation Services

### Free Services (No API Key Required)

| Service | ID | Quality | Notes |
|---------|----|---------|-------|
| Google Translate | `google` | Good | Default, no setup needed |
| Bing Translate | `bing` | Good | No setup needed |
| Argos Translate | `argos` | Fair | Offline, local only |

### Paid Services (API Key Required — LLM-based, Highest Quality)

| Service | ID | Primary Env Vars | Base URL Pattern |
|---------|----|------------------|------------------|
| OpenAI | `openai` | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` | `https://api.openai.com/v1` |
| Azure OpenAI | `azure-openai` | `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_BASE_URL`, `AZURE_OPENAI_MODEL` | Custom endpoint |
| DeepSeek | `deepseek` | `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` | OpenAI-compatible |
| Gemini | `gemini` | `GEMINI_API_KEY`, `GEMINI_MODEL` | OpenAI-compatible |
| Grok | `grok` | `GROK_API_KEY`, `GROK_MODEL`, `GROK_BASE_URL` | `https://api.x.ai/v1` |
| Groq | `groq` | `GROQ_API_KEY`, `GROQ_MODEL` | OpenAI-compatible |
| DeepL | `deepl` | `DEEPL_AUTH_KEY` | Native API |
| DeepLX | `deeplx` | `DEEPLX_ENDPOINT`, `DEEPLX_ACCESS_TOKEN` | `https://api.deepl.com/translate` |
| Zhipu | `zhipu` | `ZHIPU_API_KEY`, `ZHIPU_MODEL` | OpenAI-compatible |
| ModelScope | `modelscope` | `MODELSCOPE_API_KEY`, `MODELSCOPE_MODEL` | OpenAI-compatible |
| SiliconCloud | `silicon` | `SILICON_API_KEY`, `SILICON_MODEL` | OpenAI-compatible |
| MiniMax | `minimax` | `MINIMAX_API_KEY`, `MINIMAX_MODEL` | OpenAI-compatible |
| 302.AI | `302ai` | `X302AI_API_KEY`, `X302AI_MODEL` | OpenAI-compatible |
| Qwen MT | `qwen-mt` | `ALI_API_KEY`, `ALI_MODEL`, `ALI_DOMAINS` | Aliyun API |
| OpenAI-Liked | `openailiked` | `OPENAILIKED_API_KEY`, `OPENAILIKED_BASE_URL`, `OPENAILIKED_MODEL` | Any OpenAI-compatible endpoint |

### Local Services (Self-Hosted)

| Service | ID | Primary Env Vars |
|---------|----|------------------|
| Ollama | `ollama` | `OLLAMA_HOST`, `OLLAMA_MODEL` |
| Xinference | `xinference` | `XINFERENCE_HOST`, `XINFERENCE_MODEL` |
| AnythingLLM | `anythingllm` | `AnythingLLM_URL`, `AnythingLLM_APIKEY` |
| Dify | `dify` | `DIFY_API_URL`, `DIFY_API_KEY` |

### Enterprise Services

| Service | ID | Primary Env Vars |
|---------|----|------------------|
| Azure Translator | `azure` | `AZURE_ENDPOINT`, `AZURE_API_KEY` |
| Tencent TMT | `tencent` | `TENCENTCLOUD_SECRET_ID`, `TENCENTCLOUD_SECRET_KEY` |

**Service selection guidance:**
- **Best free quality:** Google Translate (`google`) — no setup needed
- **Best paid quality:** DeepSeek (`deepseek`) — cost-effective, high accuracy
- **Privacy (local):** Ollama (`ollama`) or Argos (`argos`) — runs entirely on your machine
- **Custom endpoint:** `openailiked` — works with any OpenAI-compatible API

---

## Supported Languages

| Language | Code | Notes |
|----------|------|-------|
| English | `en` | |
| Simplified Chinese | `zh` | |
| Traditional Chinese | `zh-TW` | |
| Japanese | `ja` | |
| Korean | `ko` | |
| French | `fr` | |
| German | `de` | |
| Spanish | `es` | |
| Arabic | `ar` | |

---

## Output Modes

| Mode | ID | Description | Best For |
|------|----|-------------|----------|
| Side-by-side | `side` | Original (left) + Translation (right) on each page | Comparison, review |
| Dual page | `dual` | Alternating original and translated pages | Reading, printing |
| Monolingual | `mono` | Translation only, original layout preserved | Distribution, reading |

**Default:** `side` (side-by-side comparison).

---

## CLI Setup Wizard

The CLI provides an interactive configuration wizard for first-time users:

```bash
pdf2zh --setup
```

### Wizard Walkthrough

```
==========================================================
  PDFMathTranslate — Service Configuration Wizard
==========================================================

Available translation services:

  [ Free — no API key required ]
    • google
    • bing
    • argos

  [ Paid — API key required, higher quality ]
    • deepseek           (DEEPSEEK_API_KEY, DEEPSEEK_MODEL)
    • openai             (OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_MODEL)
    • gemini             (GEMINI_API_KEY, GEMINI_MODEL)
    • ... (21 more)

Service name (or 'q' to quit): deepseek

Selected: deepseek

Enter credentials (press Enter to use default, skip optional fields):

  DEEPSEEK_API_KEY [default: ********]: sk-abc123
  DEEPSEEK_MODEL [default: deepseek-chat] (optional):

Testing connection...
  ✓ Success! Translated 'Hello' → '你好' (342ms)

==========================================================
  ✓ Service 'deepseek' configured successfully!
  Configuration saved to:
    ~/.config/PDFMathTranslate/config.json

  You can now translate documents:
    pdf2zh document.pdf -s deepseek
    pdf2zh document.pdf                  (uses last configured service)
==========================================================
```

### After Setup — Daily Use

```bash
# Use last configured service (whatever you set up with --setup)
pdf2zh document.pdf

# Use a specific service
pdf2zh document.pdf -s openai

# With model override
pdf2zh document.pdf -s openai:gpt-4o-mini

# Translate entire directory
pdf2zh --dir ./papers/ -s deepseek

# Specify languages
pdf2zh document.pdf -li en -lo ja -s google
```

**When guiding a CLI user: ALWAYS direct them to `pdf2zh --setup` first.** Never tell them to run `pdf2zh file.pdf` without first checking or establishing their service configuration.

---

## Configuration

### Config File

Location: `~/.config/PDFMathTranslate/config.json`

Created automatically when you call `configure_service` via MCP, or manually:

```json
{
  "translators": [
    {
      "name": "deepseek",
      "envs": {
        "DEEPSEEK_API_KEY": "sk-abc123",
        "DEEPSEEK_MODEL": "deepseek-chat"
      }
    },
    {
      "name": "openai",
      "envs": {
        "OPENAI_BASE_URL": "https://api.openai.com/v1",
        "OPENAI_API_KEY": "sk-xyz789",
        "OPENAI_MODEL": "gpt-4o-mini"
      }
    }
  ],
  "last_used_service": "deepseek",
  "PDF2ZH_LANG_FROM": "English",
  "PDF2ZH_LANG_TO": "Simplified Chinese"
}
```

### Precedence (highest to lowest)

1. CLI/API `envs_json` parameter (inline per-translation overrides)
2. Environment variables (`DEEPSEEK_API_KEY`, etc.)
3. Config file (`~/.config/PDFMathTranslate/config.json`)
4. Service hardcoded defaults

**Security:** Fields containing `API_KEY`, `TOKEN`, `SECRET`, `PASSWORD`, `ACCESS_KEY` sourced from environment variables are read at runtime but **never implicitly persisted** to the config file. When using `configure_service()` MCP tool, API keys ARE stored in the config file for session persistence; the file is protected with `0600` permissions (owner read/write only).

**Config file permissions:** Created as `0600` (owner read/write only).

### Limiting Available Services

Set `ENABLED_SERVICES` in the config file or env var to restrict visible services:
```json
{"ENABLED_SERVICES": ["DeepSeek", "OpenAI", "Google"]}
```

---

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `PDF2ZH_WORKSPACE` | Restrict MCP file access to this directory | `~/Documents/` |
| `PDF2ZH_OUTPUT_DIR` | Output directory for translated PDFs | system temp dir |
| `ENABLED_SERVICES` | Comma-separated list of allowed services | all available |

---

## Server Startup

### MCP Server (for AI Agents)

```bash
# STDIO mode (Claude Desktop / direct MCP)
python -m pdf2zh.mcp_server
# or
pdf2zh --mcp

# SSE mode (HTTP transport, for remote MCP)
pdf2zh --mcp --sse --host 0.0.0.0 --port 3001
```

**Claude Desktop config** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/Documents"]
    },
    "translate_pdf": {
      "command": "uv",
      "args": ["run", "pdf2zh", "--mcp"]
    }
  }
}
```

### REST API Server (for Programmatic Access)

```bash
# Development
python -m uvicorn pdf2zh.api:app --host 127.0.0.1 --port 8000 --reload

# One-click launcher (Windows: backend + frontend)
python launch.py
```

### CLI (Direct Translation)

```bash
# Quick translation (Google, English → Chinese)
pdf2zh document.pdf

# With service + language specification
pdf2zh document.pdf -s deepseek -li en -lo ja -o ./output/

# Batch directory translation
pdf2zh --dir ./pdfs/ -s openai:gpt-4o-mini
```

---

## Troubleshooting

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| `"No translation service configured"` | First use, no service set up | Call `configure_service(service="google")` for free, or with API key for paid |
| `"Unknown service: X"` | Typo in service name | Call `list_services()` to see exact service IDs |
| `"Connection test failed"` | Invalid API key or network issue | Verify key, check network, try `test_service()` |
| `"File path outside allowed workspace"` | MCP: file not in `~/Documents/` or `PDF2ZH_WORKSPACE` | Move file to allowed directory or set `PDF2ZH_WORKSPACE` env var |
| `"Unsupported file type"` | Non-PDF/DOCX file | Convert to PDF first; only `.pdf`, `.doc`, `.docx` supported |
| Translation quality poor | Using free service for complex document | Switch to paid LLM service (deepseek, openai, gemini) |
| Slow first translation | ONNX layout model cold start | Normal — 2-5s warmup; subsequent translations are fast |
| MCP `ModuleNotFoundError: mcp` | MCP library not installed | `pip install pdf2zh[mcp]` |

---

## Project Structure (Relevant Files)

```
CLAUDE.md             ← You are here
pdf2zh/
  api.py              ← FastAPI REST endpoints + setup-status
  mcp_server.py       ← MCP tools (get_setup_status, configure_service, translate_pdf, etc.)
  config.py           ← ConfigManager: config.json persistence, service lookup
  translator.py       ← 25 translation service implementations
  high_level.py       ← Core translation pipeline (PDF → translated PDF)
  pdf2zh.py           ← CLI entry point
frontend/             ← React SPA (web UI)
test/                 ← Test suite
docs/ADVANCED.md      ← Upstream advanced usage (CLI, services, MCP setup)
```

---

## Version

This guide covers PDFMathTranslate v1.9.11 (fork). Last updated: 2026-06-27.

The source code is authoritative over this guide — when in doubt, read the source.
