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
import threading
import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
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


# --- Job Management ---

jobs: dict[str, dict] = {}
jobs_lock = threading.Lock()
_translation_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)
_loop_ref: asyncio.AbstractEventLoop | None = None


@app.on_event("startup")
def _cache_event_loop() -> None:
    """Store the event loop reference so background threads can signal SSE."""
    global _loop_ref
    _loop_ref = asyncio.get_running_loop()


@app.on_event("startup")
def _cleanup_old_uploads() -> None:
    """Remove uploaded/translated files older than 1 hour."""
    cutoff = time.time() - 3600
    upload_dir = Path("pdf2zh_files")
    if upload_dir.is_dir():
        for child in upload_dir.iterdir():
            try:
                if child.stat().st_mtime < cutoff:
                    child.unlink(missing_ok=True)
            except OSError:
                pass


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": __version__}


@app.get("/api/services")
async def list_services():
    """Return available translation services and their required env vars."""
    result = []
    for svc in ENABLED_SERVICES:
        result.append({
            "name": svc.name,
            "envs": [
                {"key": k, "default": v, "is_api_key": "API_KEY" in k.upper()}
                for k, v in svc.envs.items()
            ],
            "custom_prompt": svc.CustomPrompt if hasattr(svc, "CustomPrompt") else False,
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
    output_mode: str = Form("mono_dual"),
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
    with open(file_path, "wb") as f:
        f.write(content)

    # Parse page selection
    page_map_dict = {
        "All": [],
        "First Page": [0],
        "First 5 Pages": [0, 1, 2, 3, 4],
    }
    if page_range == "Others" and custom_pages:
        selected_pages = []
        for p in custom_pages.split(","):
            p = p.strip()
            if "-" in p:
                start, end = p.split("-")
                selected_pages.extend(range(int(start) - 1, int(end)))
            elif p:
                selected_pages.append(int(p) - 1)
    else:
        selected_pages = page_map_dict.get(page_range, [])

    # Store job
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
        }

    def _push_sse(data: dict) -> None:
        """Thread-safe helper: push a progress snapshot to the SSE queue."""
        loop = _loop_ref
        if loop is not None:
            loop.call_soon_threadsafe(sse_queue.put_nowait, data)

    # Start translation in background thread via thread-pool executor
    def run_translation():
        try:
            with jobs_lock:
                jobs[job_id]["status"] = "running"
                jobs[job_id]["desc"] = "正在翻译..."

            from pdf2zh.high_level import translate
            from pdf2zh.doclayout import ModelInstance

            _ensure_model_loaded()

            lang_in = lang_map.get(lang_from, "en")
            lang_out = lang_map.get(lang_to, "zh")

            def progress_cb(t):
                pct = t.n / t.total if t.total else 0
                desc = getattr(t, "desc", "") or "正在翻译..."
                snapshot = {
                    "progress": pct,
                    "desc": desc,
                    "status": "running",
                    "error": None,
                    "phase": getattr(t, "phase", ""),
                    "phase_page": getattr(t, "page", 0),
                    "phase_total": getattr(t, "total_pages", 0),
                }
                with jobs_lock:
                    jobs[job_id].update(snapshot)
                _push_sse(snapshot)

            output = str(upload_dir)

            result_files = translate(
                files=[str(file_path)],
                output=output,
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

            # result_files is list of (mono, dual, side) tuples
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
                })
            _push_sse({"progress": 1.0, "desc": "翻译完成！", "status": "completed", "error": None, "phase": "finalizing", "phase_page": 0, "phase_total": 0})

        except asyncio.CancelledError:
            with jobs_lock:
                jobs[job_id].update({"status": "cancelled", "desc": "翻译已取消"})
            _push_sse({"progress": 0, "desc": "翻译已取消", "status": "cancelled", "error": None, "phase": "", "phase_page": 0, "phase_total": 0})
        except Exception as e:
            with jobs_lock:
                jobs[job_id].update({"status": "failed", "error": str(e)})
            _push_sse({"progress": 0, "desc": str(e), "status": "failed", "error": str(e), "phase": "", "phase_page": 0, "phase_total": 0})

    _translation_executor.submit(run_translation)

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
            "error": str(e),
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
