# AGENTS.md — PDFMathTranslate (Hermes + Multi-Agent Compatible)

Scientific PDF translation with layout preservation. This file is optimized for Hermes agents and other AI coding assistants. See `CLAUDE.md` for the comprehensive guide.

## First Contact: Always Start Here

The project has a **stable initialization protocol**. Regardless of which agent or MCP client you're using, always call `get_setup_status` first:

```
MCP: get_setup_status()
REST: GET http://127.0.0.1:8000/api/setup-status
```

This returns whether a translation service is already configured and exactly what to do next. **Do not guess the setup state — always call this first.**

## Hermes Agent Quick Start

### Hermes Desktop / Agent MCP Configuration

Add to your MCP configuration (e.g., `hermes_config.json` or `mcp.json`):

```json
{
  "mcpServers": {
    "pdfmathtranslate": {
      "command": "uv",
      "args": ["run", "pdf2zh", "--mcp"]
    }
  }
}
```

For SSE transport (remote/networked Hermes agents):
```json
{
  "mcpServers": {
    "pdfmathtranslate": {
      "url": "http://127.0.0.1:3001/sse"
    }
  }
}
```

### Hermes Agent Invocation Pattern

When a user asks you to translate a PDF, follow this exact sequence:

```
1. get_setup_status()
   ├── configured == true  → go to step 2
   └── configured == false → tell user:
       "I need to set up a translation service first. Options:
        - Free (no API key): google, bing
        - Paid (API key required): deepseek, openai, gemini, ...
        Which would you like to use?"

       Then: configure_service(service="<chosen>", api_key="<provided>")
       After: → go to step 2

2. translate_pdf(file="/path/to/doc.pdf", lang_in="en", lang_out="zh")
   → Returns output file paths
   → Report paths to user
```

### Hermes Tool Calling Examples

All MCP tools return JSON strings. Parse the JSON to read status:

```
# Check setup
get_setup_status()
→ '{"configured":false,"next_steps":"No translation service configured...",...}'

# List available services
list_services()
→ '[{"name":"google","free":true,...},{"name":"deepseek","free":false,...},...]'

# Configure a service (one-time — persists to disk)
configure_service(service="deepseek", api_key="sk-abc123")
→ '{"configured":true,"service":"deepseek","latency_ms":342,"sample":"你好"}'

# Test connectivity (does not persist)
test_service(service="deepseek", api_key="sk-abc123")
→ '{"ok":true,"latency_ms":342,"sample":"你好"}'

# Translate a document
translate_pdf(file="/home/user/Documents/paper.pdf", lang_in="en", lang_out="zh")
→ '{"ok":true,"service":"deepseek","files":["/tmp/pdf2zh_output_xxx/paper-side.pdf",...]}'

# Batch translate
translate_batch(files='["/path/to/a.pdf","/path/to/b.pdf"]')
→ '{"total":2,"succeeded":2,"results":[{"file":"/a.pdf","ok":true,"files":[...]},...]}'
```

## REST API Quick Start (Programmatic / Non-MCP Agents)

```
Base URL: http://127.0.0.1:8000
API Docs: http://127.0.0.1:8000/docs

1. GET  /api/setup-status        → check setup state
2. POST /api/test-service        → verify service connectivity (optional)
3. POST /api/translate           → translate a single file (multipart form)
4. GET  /api/translate/{job_id}  → poll status
5. GET  /api/download/{job_id}/side → download result
6. POST /api/translate-batch     → batch translate (max 20 files)
7. GET  /api/translate-batch/{id}/download?file_type=side → download all as ZIP
```

## Translation Pipeline (Hermes Agent Workflow)

```
USER: "Translate paper.pdf to Chinese"

AGENT:
  # Phase 1: Discovery
  get_setup_status()
  → {"configured": true, "last_used": "deepseek", ...}

  # Phase 2: Translate
  translate_pdf(file="paper.pdf", lang_in="en", lang_out="zh")
  → {"ok": true, "files": ["/tmp/pdf2zh_output_xxx/paper-mono.pdf",
                             "/tmp/pdf2zh_output_xxx/paper-dual.pdf",
                             "/tmp/pdf2zh_output_xxx/paper-side.pdf"]}

  # Phase 3: Report
  → "Done! 3 output files created:
     - Side-by-side (original + translation): /tmp/.../paper-side.pdf
     - Dual page (alternating): /tmp/.../paper-dual.pdf
     - Monolingual (translation only): /tmp/.../paper-mono.pdf"
```

## Error Recovery (Hermes-Specific)

```
Error: "No translation service configured"
  → Call get_setup_status() to list options
  → Ask user which service they want
  → Call configure_service(service=...)
  → Retry translate_pdf()

Error: "File path outside allowed workspace"
  → File must be in ~/Documents/ or PDF2ZH_WORKSPACE
  → Move file or set PDF2ZH_WORKSPACE env var
  → Retry

Error: "Unknown service: X"
  → Call list_services() to get exact service IDs
  → Use the exact ID string

Error: "Connection test failed"
  → Verify API key
  → Check network connectivity
  → Try test_service() to diagnose
```

## Available Services (Quick Lookup)

| Priority | Service | ID | Needs Key? |
|----------|---------|----|------------|
| Try first (free) | Google | `google` | No |
| Try first (free) | Bing | `bing` | No |
| Best quality | DeepSeek | `deepseek` | Yes |
| Best quality | OpenAI | `openai` | Yes |
| Best quality | Gemini | `gemini` | Yes |
| Privacy (local) | Ollama | `ollama` | No (local) |
| Custom endpoint | OpenAI-Liked | `openailiked` | Yes |

Full list (25 services): see `CLAUDE.md` or call `list_services()`.

## Output Modes

| Mode | ID | What You Get |
|------|----|-------------|
| Side-by-side | `side` | Left=original, Right=translation (default) |
| Dual page | `dual` | Alternating pages |
| Monolingual | `mono` | Translation only |

## Key Environment Variables

```
PDF2ZH_WORKSPACE    → Restrict file access to this directory (default: ~/Documents/)
PDF2ZH_OUTPUT_DIR   → Where to write translated PDFs (default: system temp)
ENABLED_SERVICES    → Limit available services (comma-separated)
```

## Important: Config Persistence

`configure_service()` writes to `~/.config/PDFMathTranslate/config.json`. This persists across sessions. A user only needs to configure once. Subsequent `translate_pdf()` calls automatically use the last configured service.

Sensitive keys (API_KEY, TOKEN, SECRET, PASSWORD, ACCESS_KEY) sourced from environment variables are never implicitly persisted to the config file. When using `configure_service()`, keys ARE stored in `~/.config/PDFMathTranslate/config.json` for session persistence; the file has `0600` permissions (owner read/write only).

## Reference

- Full guide: `CLAUDE.md` (comprehensive reference with all 25 services, REST endpoints, troubleshooting)
- Upstream docs: `docs/ADVANCED.md`
- API docs: `http://127.0.0.1:8000/docs` (when server is running)
- REST API source: `pdf2zh/api.py`
- MCP server source: `pdf2zh/mcp_server.py`
- Config manager: `pdf2zh/config.py`
