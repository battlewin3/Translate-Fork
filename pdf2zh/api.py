"""
FastAPI backend for PDFMathTranslate.

Provides REST endpoints for the React frontend to:
- List available translation services and languages
- Submit translation jobs
- Stream translation progress via SSE
- Download translated files
"""

import asyncio
import json
import os
import threading
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sse_starlette.sse import EventSourceResponse

from pdf2zh.config import ConfigManager

# --- Lazy-load translator classes to avoid hard dependency on all services ---

_SERVICE_CLASS_NAMES = [
    "GoogleTranslator", "BingTranslator", "DeepLTranslator", "DeepLXTranslator",
    "AzureTranslator", "AzureOpenAITranslator", "OpenAITranslator",
    "OllamaTranslator", "GeminiTranslator", "GrokTranslator", "GroqTranslator",
    "DeepseekTranslator", "ZhipuTranslator", "ModelScopeTranslator",
    "SiliconTranslator", "MiniMaxTranslator", "XinferenceTranslator",
    "TencentTranslator", "AnythingLLMTranslator", "DifyTranslator",
    "QwenMtTranslator", "ArgosTranslator",
]

SERVICE_REGISTRY = []

for _name in _SERVICE_CLASS_NAMES:
    try:
        _cls = getattr(__import__("pdf2zh.translator", fromlist=[_name]), _name)
        SERVICE_REGISTRY.append(_cls)
    except ImportError:
        pass  # Skip translators whose dependencies are not installed

app = FastAPI(title="PDFMathTranslate API", version="1.9.11")


def _ensure_model_loaded():
    """Load the ONNX layout model if not already cached."""
    from pdf2zh.doclayout import ModelInstance, OnnxModel

    if ModelInstance.value is None:
        ModelInstance.value = OnnxModel.load_available()


@app.on_event("startup")
async def startup_warmup():
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
    s for s in SERVICE_REGISTRY
    if not enabled_names or s.name in enabled_names
]


# --- Job Management ---

jobs: dict[str, dict] = {}
jobs_lock = threading.Lock()


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.9.11"}


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

    # Save uploaded file
    upload_dir = Path("pdf2zh_files")
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / f"{job_id}_{file.filename}"
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
    with jobs_lock:
        jobs[job_id] = {
            "status": "queued",
            "progress": 0.0,
            "desc": "排队中...",
            "files": None,
            "error": None,
            "cancel_event": threading.Event(),
        }

    # Start translation in background thread
    import threading as th

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
                with jobs_lock:
                    jobs[job_id]["progress"] = pct
                    jobs[job_id]["desc"] = desc
                    jobs[job_id]["phase"] = getattr(t, "phase", "")
                    jobs[job_id]["phase_page"] = getattr(t, "page", 0)
                    jobs[job_id]["phase_total"] = getattr(t, "total_pages", 0)

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
                jobs[job_id]["status"] = "completed"
                jobs[job_id]["progress"] = 1.0
                jobs[job_id]["desc"] = "翻译完成！"
                jobs[job_id]["files"] = files_output

        except asyncio.CancelledError:
            with jobs_lock:
                jobs[job_id]["status"] = "cancelled"
                jobs[job_id]["desc"] = "翻译已取消"
        except Exception as e:
            with jobs_lock:
                jobs[job_id]["status"] = "failed"
                jobs[job_id]["error"] = str(e)

    th.Thread(target=run_translation, daemon=True).start()

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
    """SSE endpoint for real-time translation progress."""
    async def event_generator():
        import time
        last_hash = None
        while True:
            with jobs_lock:
                job = jobs.get(job_id)
            if not job:
                break

            # Only yield when job state actually changed
            snapshot = (
                job["progress"],
                job["desc"],
                job["status"],
                job.get("error"),
                job.get("phase", ""),
                job.get("phase_page", 0),
                job.get("phase_total", 0),
            )
            current_hash = hash(snapshot)
            if current_hash != last_hash:
                last_hash = current_hash
                yield {
                    "event": "progress",
                    "data": json.dumps({
                        "progress": snapshot[0],
                        "desc": snapshot[1],
                        "status": snapshot[2],
                        "error": snapshot[3],
                        "phase": snapshot[4],
                        "phase_page": snapshot[5],
                        "phase_total": snapshot[6],
                    })
                }

            if job["status"] in ("completed", "failed", "cancelled"):
                break

            await asyncio.sleep(0.5)

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

    filename = os.path.basename(file_path)
    return FileResponse(
        path=file_path,
        filename=filename,
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
    translator_cls = None
    for cls in ENABLED_SERVICES:
        if cls.name == service:
            translator_cls = cls
            break

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
