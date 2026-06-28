"""
FastAPI backend for PDFMathTranslate.

Provides REST endpoints for the React frontend to:
- List available translation services and languages
- Submit translation jobs
- Stream translation progress via SSE
- Download translated files
"""

import asyncio
import concurrent.futures
import json
import os
import tempfile
import threading
import time
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sse_starlette.sse import EventSourceResponse

from pdf2zh.config import ConfigManager

# --- Lazy-load translator classes via the auto-registering registry ---
# Import the module so all BaseTranslator subclasses self-register.
import pdf2zh.translator  # noqa: F401 — side-effect: populates TranslatorRegistry

from pdf2zh.translator import TranslatorRegistry

from pdf2zh import __version__

app = FastAPI(title="PDFMathTranslate API", version=__version__)


def _ensure_model_loaded():
    """Load the ONNX layout model if not already cached."""
    from pdf2zh.doclayout import ModelInstance, OnnxModel

    if ModelInstance.value is None:
        ModelInstance.value = OnnxModel.load_available()


@app.on_event("startup")
def startup_warmup():
    """Preload the ONNX layout model so the first translation request
    does not pay a 2–5 second cold-start penalty."""
    _ensure_model_loaded()

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Service & Language Registry ---

lang_map = {
    "English": "en",
    "Simplified Chinese": "zh",
    "Traditional Chinese": "zh-TW",
    "Japanese": "ja",
    "Korean": "ko",
    "French": "fr",
    "German": "de",
    "Spanish": "es",
    "Arabic": "ar",
}

# Filter by ENABLED_SERVICES env var
enabled_names = os.environ.get("ENABLED_SERVICES", "").split(",")
enabled_names = [n.strip() for n in enabled_names if n.strip()]
ENABLED_SERVICES = [
    s for s in TranslatorRegistry.list_all()
    if not enabled_names or s.name in enabled_names
]


# ── Shared Helpers ──────────────────────────────────────────────────────────


from pdf2zh._sanitize import sanitize_error as _sanitize_error


def _validate_file_content(content: bytes, filename: str) -> str | None:
    """Check file magic bytes. Returns error message or None if valid."""
    if len(content) == 0:
        return f"Empty file: {filename}"
    if len(content) < 4:
        return f"File too small to be valid: {filename}"
    if not (content.startswith(_PDF_SIGNATURE) or content.startswith(_ZIP_SIGNATURE)):
        return f"Unsupported file type: {filename} (expected PDF or DOCX)"
    return None


def _parse_page_range(page_range: str, custom_pages: str) -> list[int]:
    """Parse page selection form params into a list of 0-indexed page numbers.

    Returns an empty list for "All" (meaning: translate all pages).
    """
    page_map = {
        "All": [],
        "First Page": [0],
        "First 5 Pages": [0, 1, 2, 3, 4],
    }
    if page_range == "Others" and custom_pages:
        selected = []
        for p in custom_pages.split(","):
            p = p.strip()
            if not p:
                continue
            try:
                if "-" in p:
                    start, end = p.split("-")
                    selected.extend(range(int(start) - 1, int(end)))
                else:
                    selected.append(int(p) - 1)
            except (ValueError, OverflowError):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid page range: '{p}'. Use numbers like '1,3,5-10'.",
                )
        return selected
    return page_map.get(page_range, [])


def _create_translation_runner(
    job_id: str,
    file_path: str,
    lang_in: str,
    lang_out: str,
    service: str,
    output_mode: str,
    threads: int,
    vfont: str,
    envs: dict,
    prompt: str,
    skip_subset_fonts: bool,
    ignore_cache: bool,
    selected_pages: list[int] | None,
    upload_dir: str,
    _push_sse,
):
    """Return a callable that runs translation in a background thread.

    The returned function writes status updates to the global `jobs` dict
    and pushes SSE progress events via `_push_sse`.
    """
    from pdf2zh.high_level import translate
    from pdf2zh.doclayout import ModelInstance

    def run():
        try:
            with jobs_lock:
                jobs[job_id]["status"] = "running"
                jobs[job_id]["desc"] = "正在翻译..."

            _ensure_model_loaded()

            def progress_cb(t):
                pct = t.n / t.total if t.total else 0
                desc = getattr(t, "desc", "") or "正在翻译..."
                snap = {
                    "progress": pct,
                    "desc": desc,
                    "status": "running",
                    "error": None,
                    "phase": getattr(t, "phase", ""),
                    "phase_page": getattr(t, "page", 0),
                    "phase_total": getattr(t, "total_pages", 0),
                }
                with jobs_lock:
                    jobs[job_id].update(snap)
                _push_sse(snap)

            result_files = translate(
                files=[str(file_path)],
                output=str(upload_dir),
                pages=selected_pages if selected_pages else None,
                lang_in=lang_in,
                lang_out=lang_out,
                service=service,
                thread=threads,
                vfont=vfont,
                callback=progress_cb,
                cancellation_event=jobs[job_id]["cancel_event"],
                model=ModelInstance.value,
                envs=envs,
                prompt=prompt if prompt else None,
                skip_subset_fonts=skip_subset_fonts,
                ignore_cache=ignore_cache,
                output_mode=output_mode,
            )

            with jobs_lock:
                jobs[job_id]["phase"] = "finalizing"
                jobs[job_id]["desc"] = "正在生成最终文件..."

            files_output = {}
            for item in result_files:
                mono_path = item[0]
                dual_path = item[1]
                side_path = item[2] if len(item) > 2 else None
                files_output["mono"] = mono_path
                files_output["dual"] = dual_path
                if side_path:
                    files_output["side"] = side_path

            with jobs_lock:
                jobs[job_id].update({
                    "status": "completed",
                    "progress": 1.0,
                    "desc": "翻译完成！",
                    "files": files_output,
                    "_completed_at": time.time(),
                })
            _push_sse({"progress": 1.0, "desc": "翻译完成！", "status": "completed", "error": None, "phase": "finalizing", "phase_page": 0, "phase_total": 0})

        except asyncio.CancelledError:
            with jobs_lock:
                jobs[job_id].update({"status": "cancelled", "desc": "翻译已取消", "_completed_at": time.time()})
            _push_sse({"progress": 0, "desc": "翻译已取消", "status": "cancelled", "error": None, "phase": "", "phase_page": 0, "phase_total": 0})
        except Exception as e:
            safe_msg = _sanitize_error(e)
            with jobs_lock:
                jobs[job_id].update({"status": "failed", "error": safe_msg, "_completed_at": time.time()})
            _push_sse({"progress": 0, "desc": safe_msg, "status": "failed", "error": safe_msg, "phase": "", "phase_page": 0, "phase_total": 0})

    return run


# --- Job Management ---

jobs: dict[str, dict] = {}
jobs_lock = threading.Lock()
# Batch translation: maps batch_id → list of job_ids
batches: dict[str, dict] = {}
MAX_BATCH_FILES = 20
MAX_UPLOAD_SIZE = 200 * 1024 * 1024  # 200MB
MAX_JOBS = 20  # concurrent job limit across all endpoints
# PDF magic bytes: starts with %PDF-
_PDF_SIGNATURE = b"%PDF-"
# DOCX/XLSX magic bytes: PK zip
_ZIP_SIGNATURE = b"PK\x03\x04"
_translation_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)
_loop_ref: asyncio.AbstractEventLoop | None = None


@app.on_event("startup")
def _cache_event_loop() -> None:
    """Store the event loop reference so background threads can signal SSE."""
    global _loop_ref
    _loop_ref = asyncio.get_running_loop()


@app.on_event("startup")
async def _cleanup_old_uploads() -> None:
    """Start background task to periodically evict stale jobs and files."""
    import asyncio as _asyncio

    async def _periodic_cleanup():
        while True:
            await _asyncio.sleep(600)  # every 10 minutes
            cutoff = time.time() - 3600
            upload_dir = Path("pdf2zh_files")
            if upload_dir.is_dir():
                for child in upload_dir.iterdir():
                    try:
                        if child.stat().st_mtime < cutoff:
                            child.unlink(missing_ok=True)
                    except OSError:
                        pass
            # Evict completed/failed/cancelled jobs older than 1 hour
            with jobs_lock:
                stale = [jid for jid, j in jobs.items()
                         if j.get("status") in ("completed", "failed", "cancelled")
                         and j.get("_completed_at", float("inf")) < cutoff]
                for jid in stale:
                    del jobs[jid]
                # Also clean up batches with all jobs gone
                empty_batches = [bid for bid, b in batches.items()
                                if not any(jid in jobs for jid in b.get("job_ids", []))]
                for bid in empty_batches:
                    del batches[bid]

    _asyncio.create_task(_periodic_cleanup())


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": __version__}


def _is_sensitive_key(key: str) -> bool:
    """Check whether an env var key contains sensitive patterns (API keys, tokens, secrets)."""
    ku = key.upper()
    return ("API_KEY" in ku or "TOKEN" in ku or "SECRET" in ku or
            "PASSWORD" in ku or ku.endswith("_KEY"))


def _build_services_detail() -> list:
    """Build per-service detail including env key status for the frontend.

    For each service, returns its envs with:
    - is_set: whether a value exists in persisted config
    - is_sensitive: whether the key is an API key / token / secret
    - value: non-sensitive persisted value (None for sensitive keys)
    - is_configured: whether this service has any entry in config.json
    """
    configured_names = ConfigManager.get_configured_service_names()
    services_detail = []
    for svc in ENABLED_SERVICES:
        saved_envs = ConfigManager.get_translator_by_name(svc.name) or {}
        envs_detail = []
        for k, default_val in svc.envs.items():
            is_sensitive = _is_sensitive_key(k)
            has_value = k in saved_envs and bool(saved_envs[k])
            envs_detail.append({
                "key": k,
                "default": default_val,
                "is_set": has_value,
                "is_sensitive": is_sensitive,
                # Only expose non-sensitive configured values to the frontend
                "value": saved_envs.get(k) if (has_value and not is_sensitive) else None,
            })
        services_detail.append({
            "name": svc.name,
            "envs": envs_detail,
            "custom_prompt": svc.CustomPrompt if hasattr(svc, "CustomPrompt") else False,
            "is_configured": configured_names is not None and svc.name in configured_names,
        })
    return services_detail


@app.get("/api/setup-status")
async def api_setup_status():
    """
    First endpoint every API consumer should call. Returns the current
    configuration status and actionable next steps.

    Mirrors the MCP get_setup_status tool for REST API consumers.
    Use this to determine whether setup is required before translating.

    Includes per-service env status so the frontend can:
    - Show which services are already configured
    - Pre-fill non-sensitive fields (model, base URL)
    - Display "configured" badges for API keys without exposing values
    """
    # Respect ENABLED_SERVICES filter (same as /api/services)
    free = [s.name for s in ENABLED_SERVICES if len(s.envs) == 0]
    paid = [s.name for s in ENABLED_SERVICES if len(s.envs) > 0]
    services_detail = _build_services_detail()

    if ConfigManager.is_configured():
        names = ConfigManager.get_configured_service_names()
        last = ConfigManager.get_last_used_service()
        # Defensive: fetch names in case config is cleared between calls
        default_svc = last or (names[0] if names else "unknown")
        return {
            "configured": True,
            "configured_services": names,
            "last_used": last,
            "free_services": free,
            "paid_services": paid,
            "services": services_detail,
            "next_steps": (
                f"Ready to translate. POST to /api/translate with a PDF file "
                f"to begin. Default service: {default_svc}. "
                f"Use /api/test-service to verify connectivity."
            ),
            "api_docs_url": "/docs",
        }
    else:
        # Guard against empty translator list (edge case: broken import)
        if not free and not paid:
            return {
                "configured": False,
                "configured_services": [],
                "last_used": None,
                "free_services": [],
                "paid_services": [],
                "services": services_detail,
                "next_steps": (
                    "No translation services available. Check that the translation "
                    "engine is properly installed and dependencies are loaded."
                ),
                "api_docs_url": "/docs",
            }
        return {
            "configured": False,
            "configured_services": [],
            "last_used": None,
            "free_services": free,
            "paid_services": paid,
            "services": services_detail,
            "next_steps": (
                f"No translation service configured. "
                f"Free services (no API key): {', '.join(free) or 'none'}. "
                f"Paid services: {', '.join(paid)}. "
                f"Set env vars for your chosen service (e.g. DEEPSEEK_API_KEY=sk-...) "
                f"and call /api/test-service to verify."
            ),
            "api_docs_url": "/docs",
        }


@app.get("/api/services")
async def list_services():
    """Return available translation services and their required env vars.

    Merges persisted config values from config.json:
    - For non-sensitive envs (model, URL): uses persisted value as default
    - For sensitive envs (API keys, tokens): adds is_configured flag
    - Adds per-service is_configured flag
    """
    configured_names = ConfigManager.get_configured_service_names()
    result = []
    for svc in ENABLED_SERVICES:
        saved_envs = ConfigManager.get_translator_by_name(svc.name) or {}
        result.append({
            "name": svc.name,
            "envs": [
                {
                    "key": k,
                    # SECURITY: For API keys, NEVER expose the persisted value as default.
                    # Only non-sensitive fields (model, URL) use the persisted value.
                    "default": (
                        v  # class-level default (typically empty for API keys)
                        if ("API_KEY" in k.upper())
                        else (saved_envs.get(k) or v)  # persisted value for non-sensitive fields
                    ),
                    "is_api_key": "API_KEY" in k.upper(),
                    "is_configured": bool(saved_envs.get(k)),  # whether value exists in config
                }
                for k, v in svc.envs.items()
            ],
            "custom_prompt": svc.CustomPrompt if hasattr(svc, "CustomPrompt") else False,
            "is_configured": configured_names is not None and svc.name in configured_names,
        })
    return {"services": result}


@app.get("/api/languages")
async def list_languages():
    """Return available source/target languages."""
    return {
        "languages": [
            {"name": name, "code": code}
            for name, code in lang_map.items()
        ]
    }


@app.post("/api/translate")
async def start_translation(
    file: UploadFile = File(...),
    service: str = Form("Google"),
    lang_from: str = Form("English"),
    lang_to: str = Form("Simplified Chinese"),
    page_range: str = Form("All"),
    custom_pages: str = Form(""),
    output_mode: str = Form("side"),
    threads: int = Form(4),
    skip_subset_fonts: bool = Form(True),
    ignore_cache: bool = Form(False),
    vfont: str = Form(""),
    prompt: str = Form(""),
    mode: str = Form("fast"),
    # Dynamic env vars passed as JSON string
    envs_json: str = Form("{}"),
):
    """Start a translation job. Returns job_id for polling."""

    job_id = str(uuid.uuid4())
    envs = json.loads(envs_json) if envs_json else {}

    # Save uploaded file (sanitize filename to prevent path traversal)
    upload_dir = Path("pdf2zh_files").resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_name = os.path.basename(file.filename) or "uploaded.pdf"
    file_path = (upload_dir / f"{job_id}_{safe_name}").resolve()
    if not file_path.is_relative_to(upload_dir):
        raise HTTPException(status_code=400, detail="Invalid filename")
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {len(content)} bytes. Maximum is {MAX_UPLOAD_SIZE} bytes.",
        )

    # Validate file type by magic bytes
    type_error = _validate_file_content(content, safe_name)
    if type_error:
        raise HTTPException(status_code=415, detail=type_error)

    with open(file_path, "wb") as f:
        f.write(content)

    # Parse page selection
    selected_pages = _parse_page_range(page_range, custom_pages)

    # Enforce concurrent job limit AND insert atomically to prevent TOCTOU race
    original_name = os.path.splitext(safe_name)[0]
    sse_queue: asyncio.Queue = asyncio.Queue()
    with jobs_lock:
        active = sum(1 for j in jobs.values() if j.get("status") in ("queued", "running"))
        if active >= MAX_JOBS:
            raise HTTPException(status_code=429, detail=f"Too many active jobs ({active}). Try again later.")
        jobs[job_id] = {
            "status": "queued",
            "progress": 0.0,
            "desc": "排队中...",
            "files": None,
            "error": None,
            "cancel_event": threading.Event(),
            "original_name": original_name,
            "sse_queue": sse_queue,
        }

    def _push_sse(data: dict) -> None:
        """Thread-safe helper: push a progress snapshot to the SSE queue."""
        loop = _loop_ref
        if loop is not None:
            loop.call_soon_threadsafe(sse_queue.put_nowait, data)

    # Start translation in background thread via thread-pool executor
    lang_in = lang_map.get(lang_from, "en")
    lang_out = lang_map.get(lang_to, "zh")

    run_translation = _create_translation_runner(
        job_id=job_id,
        file_path=str(file_path),
        lang_in=lang_in,
        lang_out=lang_out,
        service=service,
        output_mode=output_mode,
        threads=threads,
        vfont=vfont,
        envs=envs,
        prompt=prompt,
        skip_subset_fonts=skip_subset_fonts,
        ignore_cache=ignore_cache,
        selected_pages=selected_pages if selected_pages else None,
        upload_dir=str(upload_dir),
        _push_sse=_push_sse,
    )
    _translation_executor.submit(run_translation)

    # Record last used service (best-effort)
    try:
        ConfigManager.set_last_used_service(service)
    except Exception:
        pass

    return {"job_id": job_id, "status": "queued"}


@app.get("/api/translate/{job_id}")
async def get_job_status(job_id: str):
    """Get translation job status and results."""
    with jobs_lock:
        job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "job_id": job_id,
        "status": job["status"],
        "progress": job["progress"],
        "desc": job["desc"],
        "files": job.get("files"),
        "error": job.get("error"),
    }


@app.get("/api/translate/{job_id}/progress")
async def job_progress(job_id: str):
    """SSE endpoint for real-time translation progress (event-driven, no polling)."""
    async def event_generator():
        with jobs_lock:
            job = jobs.get(job_id)
            sse_queue = job.get("sse_queue") if job else None

        if sse_queue is None:
            yield {"event": "error", "data": json.dumps({"error": "Job not found"})}
            return

        # Send initial state immediately
        with jobs_lock:
            job = jobs.get(job_id)
        if job:
            yield {
                "event": "progress",
                "data": json.dumps({
                    "progress": job["progress"],
                    "desc": job["desc"],
                    "status": job["status"],
                    "error": job.get("error"),
                    "phase": job.get("phase", ""),
                    "phase_page": job.get("phase_page", 0),
                    "phase_total": job.get("phase_total", 0),
                })
            }

            # If already terminal, stop
            if job["status"] in ("completed", "failed", "cancelled"):
                return

        # Wait for push events from the background thread
        while True:
            try:
                # Block for up to 30 s; send a keepalive comment to avoid proxy timeouts
                snapshot = await asyncio.wait_for(sse_queue.get(), timeout=30)
            except asyncio.TimeoutError:
                yield {"comment": ""}
                continue

            yield {
                "event": "progress",
                "data": json.dumps(snapshot),
            }

            if snapshot.get("status") in ("completed", "failed", "cancelled"):
                break

    return EventSourceResponse(event_generator())


@app.get("/api/download/{job_id}/{file_type}")
async def download_file(job_id: str, file_type: str):
    """Download a translated file (mono/dual/side)."""
    if file_type not in ("mono", "dual", "side"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    with jobs_lock:
        job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job not completed")

    files = job.get("files", {})
    file_path = files.get(file_type)
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    original_name = job.get("original_name", "translated")
    download_filename = f"{original_name}-{file_type}.pdf"
    return FileResponse(
        path=file_path,
        filename=download_filename,
        media_type="application/pdf",
    )


@app.post("/api/test-service")
async def test_service(
    service: str = Form(...),
    envs_json: str = Form("{}"),
):
    """Test connectivity for a translation service with the given env vars."""
    import time

    envs = json.loads(envs_json) if envs_json else {}
    translator_cls = TranslatorRegistry.get(service)
    if translator_cls is None:
        raise HTTPException(status_code=404, detail=f"Service not found: {service}")

    try:
        # Pass None as model so the translator falls back to envs (e.g. OPENAI_MODEL, DEEPSEEK_MODEL)
        instance = translator_cls("en", "zh", None, envs=envs)
        start = time.time()
        result = instance.do_translate("Hello")
        elapsed = round((time.time() - start) * 1000)
        return {
            "status": "ok",
            "service": service,
            "result": result,
            "elapsed_ms": elapsed,
        }
    except Exception as e:
        return {
            "status": "error",
            "service": service,
            "error": _sanitize_error(e),
        }


@app.post("/api/cancel/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a running translation job."""
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        # Set event and update status atomically to avoid TOCTOU race
        # where the background thread finishes between set() and status update
        if job["status"] in ("queued", "running"):
            job["cancel_event"].set()
            job["status"] = "cancelled"
            job["desc"] = "翻译已取消"

    return {"status": "cancelled"}


# ── Batch Translation Endpoints ────────────────────────────────────────────


@app.post("/api/translate-batch")
async def start_batch_translation(
    files: List[UploadFile] = File(...),
    service: str = Form("Google"),
    lang_from: str = Form("English"),
    lang_to: str = Form("Simplified Chinese"),
    page_range: str = Form("All"),
    custom_pages: str = Form(""),
    output_mode: str = Form("side"),
    threads: int = Form(4),
    skip_subset_fonts: bool = Form(True),
    ignore_cache: bool = Form(False),
    vfont: str = Form(""),
    prompt: str = Form(""),
    mode: str = Form("fast"),
    envs_json: str = Form("{}"),
):
    """Start a batch translation job for multiple files (max 20)."""
    if len(files) > MAX_BATCH_FILES:
        raise HTTPException(
            status_code=413,
            detail=f"Too many files: {len(files)}. Maximum is {MAX_BATCH_FILES}.",
        )

    batch_id = str(uuid.uuid4())
    envs = json.loads(envs_json) if envs_json else {}
    upload_dir = Path("pdf2zh_files").resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Parse page selection once (shared across all files in batch)
    selected_pages = _parse_page_range(page_range, custom_pages)

    # Record last used service in config (best-effort, non-blocking)
    try:
        ConfigManager.set_last_used_service(service)
    except Exception:
        pass

    batch_jobs = []
    for f in files:
        job_id = str(uuid.uuid4())
        safe_name = os.path.basename(f.filename) or "uploaded.pdf"
        file_path = (upload_dir / f"{job_id}_{safe_name}").resolve()
        if not file_path.is_relative_to(upload_dir):
            raise HTTPException(status_code=400, detail=f"Invalid filename: {safe_name}")

        content = await f.read()
        if len(content) > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File '{safe_name}' too large: {len(content)} bytes. Maximum is {MAX_UPLOAD_SIZE} bytes.",
            )

        # Validate file type by magic bytes
        type_error = _validate_file_content(content, safe_name)
        if type_error:
            raise HTTPException(status_code=415, detail=type_error)

        with open(file_path, "wb") as fh:
            fh.write(content)

        original_name = os.path.splitext(safe_name)[0]
        sse_queue: asyncio.Queue = asyncio.Queue()

        with jobs_lock:
            jobs[job_id] = {
                "status": "queued",
                "progress": 0.0,
                "desc": "排队中...",
                "files": None,
                "error": None,
                "cancel_event": threading.Event(),
                "original_name": original_name,
                "sse_queue": sse_queue,
                "batch_id": batch_id,
            }

        batch_jobs.append({
            "job_id": job_id,
            "filename": original_name,
            "status": "queued",
        })

        # Launch translation for this file
        lang_in = lang_map.get(lang_from, "en")
        lang_out = lang_map.get(lang_to, "zh")

        def _push_sse_job(jid: str):
            def push(data: dict):
                loop = _loop_ref
                if loop is None:
                    return
                with jobs_lock:
                    job = jobs.get(jid)
                    sse_q = job.get("sse_queue") if job else None
                if sse_q is not None:
                    loop.call_soon_threadsafe(sse_q.put_nowait, data)
            return push

        run = _create_translation_runner(
            job_id=job_id,
            file_path=str(file_path),
            lang_in=lang_in,
            lang_out=lang_out,
            service=service,
            output_mode=output_mode,
            threads=threads,
            vfont=vfont,
            envs=envs,
            prompt=prompt,
            skip_subset_fonts=skip_subset_fonts,
            ignore_cache=ignore_cache,
            selected_pages=selected_pages if selected_pages else None,
            upload_dir=str(upload_dir),
            _push_sse=_push_sse_job(job_id),
        )
        _translation_executor.submit(run)

    # Register batch
    with jobs_lock:
        batches[batch_id] = {
            "job_ids": [j["job_id"] for j in batch_jobs],
            "jobs": batch_jobs,
        }

    return {"batch_id": batch_id, "jobs": batch_jobs}


@app.get("/api/translate-batch/{batch_id}")
async def get_batch_status(batch_id: str):
    """Get aggregated status for a batch translation."""
    with jobs_lock:
        batch = batches.get(batch_id)
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")

        job_list = []
        completed = 0
        total = len(batch["job_ids"])

        for jid in batch["job_ids"]:
            job = jobs.get(jid, {})
            job_list.append({
                "job_id": jid,
                "filename": job.get("original_name", "unknown"),
                "status": job.get("status", "unknown"),
                "progress": job.get("progress", 0),
                "error": job.get("error"),
                "result_files": job.get("files"),
            })
            if job.get("status") == "completed":
                completed += 1

    overall = completed / total if total > 0 else 0
    return {
        "batch_id": batch_id,
        "overall_progress": overall,
        "completed": completed,
        "total": total,
        "jobs": job_list,
    }


@app.get("/api/translate-batch/{batch_id}/download")
async def download_batch(
    batch_id: str,
    file_type: str = "side",
    background_tasks: BackgroundTasks = None,
):
    """Download all batch result files as a zip archive."""
    import zipfile

    if file_type not in ("mono", "dual", "side"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    with jobs_lock:
        batch = batches.get(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Write zip to a temporary file instead of in-memory BytesIO
    # to avoid OOM with many large side-by-side PDFs (~10MB each).
    tmp = tempfile.NamedTemporaryFile(suffix=".zip", delete=False)
    added = 0
    try:
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zf:
            for jid in batch["job_ids"]:
                with jobs_lock:
                    job = jobs.get(jid, {})
                if job.get("status") != "completed":
                    continue
                files = job.get("files", {})
                pdf_path = files.get(file_type)
                if not pdf_path or not os.path.exists(pdf_path):
                    continue
                original_name = job.get("original_name", "translated")
                arcname = f"{original_name}-{file_type}.pdf"
                # Deduplicate archive names
                counter = 1
                while arcname in {zi.filename for zi in zf.filelist}:
                    arcname = f"{original_name}-{file_type}({counter}).pdf"
                    counter += 1
                zf.write(pdf_path, arcname)
                added += 1
    except Exception:
        tmp.close()
        os.unlink(tmp.name)
        raise

    if added == 0:
        tmp.close()
        os.unlink(tmp.name)
        raise HTTPException(status_code=404, detail="No completed files found for download")

    if background_tasks:
        background_tasks.add_task(lambda: os.unlink(tmp.name) if os.path.exists(tmp.name) else None)

    return FileResponse(
        path=tmp.name,
        media_type="application/zip",
        filename=f"translated_batch_{batch_id[:8]}.zip",
    )
