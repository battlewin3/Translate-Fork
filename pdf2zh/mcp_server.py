"""
MCP (Model Context Protocol) server for PDFMathTranslate.

Provides tools for AI agents (Claude, Hermes, etc.) to:
- List available translation services and their configuration requirements
- Configure API keys for translation services (first-time setup wizard)
- Test service connectivity before use
- Translate PDF/Word documents with any configured service
- Batch translate multiple documents concurrently
"""

from mcp.server import Server
from mcp.server.fastmcp import FastMCP, Context
from mcp.server.sse import SseServerTransport
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.routing import Mount, Route
from pathlib import Path

import contextlib
import concurrent.futures
import io
import json
import os
import tempfile
import time

from pdf2zh import translate_stream
from pdf2zh.config import ConfigManager
from pdf2zh.converter_docx import convert_to_pdf, is_convertible
from pdf2zh.doclayout import ModelInstance
from pdf2zh.translator import TranslatorRegistry


def _ensure_translators_loaded():
    """Ensure all translator classes are registered.

    Importing the module triggers __init_subclass__ on all BaseTranslator
    subclasses, which self-register into TranslatorRegistry.
    """
    import pdf2zh.translator  # noqa: F401 — side-effect: populates registry


def _services_for_agent() -> list[dict]:
    """Build a list of translator metadata suitable for agent consumption."""
    _ensure_translators_loaded()
    result = []
    for svc in TranslatorRegistry.list_all():
        envs_meta = {}
        for k, v in svc.envs.items():
            envs_meta[k] = {
                "default": v,
                "required": v is None and ("API_KEY" in k.upper() or "TOKEN" in k.upper()),
                "is_secret": "API_KEY" in k.upper() or "TOKEN" in k.upper() or "SECRET" in k.upper(),
            }
        is_free = len(svc.envs) == 0
        result.append({
            "name": svc.name,
            "free": is_free,
            "envs": envs_meta,
            "custom_prompt": bool(getattr(svc, "CustomPrompt", False)),
        })
    return result


def _get_service_envs(service_name: str) -> dict:
    """Get the envs dict for a translator class by name."""
    _ensure_translators_loaded()
    translator_cls = TranslatorRegistry.get(service_name)
    if translator_cls is None:
        return {}
    return dict(translator_cls.envs)


def _run_translate_sync(
    file_path: str,
    lang_in: str,
    lang_out: str,
    service: str,
    output_mode: str,
    thread: int,
) -> tuple[bytes, bytes, bytes | None, str]:
    """Run translation synchronously in a thread.

    Returns (mono_bytes, dual_bytes, side_bytes, error_message_or_empty).
    """
    try:
        with open(file_path, "rb") as f:
            file_bytes = f.read()
        with contextlib.redirect_stdout(io.StringIO()):
            mono, dual, side = translate_stream(
                file_bytes,
                lang_in=lang_in,
                lang_out=lang_out,
                service=service,
                model=ModelInstance.value,
                thread=thread,
                output_mode=output_mode,
            )
        return mono, dual, side, ""
    except Exception as e:
        return b"", b"", None, str(e)


# ── Helpers ─────────────────────────────────────────────────────────────────

# Default allowed workspace for MCP tool file access.
# Override with environment variable PDF2ZH_WORKSPACE to restrict paths.
_MCP_ALLOWED_ROOTS = [
    Path(os.environ.get("PDF2ZH_WORKSPACE", Path.home() / "Documents")).resolve(),
    Path.home().resolve(),
]


def _validate_file_path(file: str) -> str | None:
    """Validate that a file path is within an allowed workspace directory.

    Returns an error message string if invalid, or None if the path is safe.
    """
    try:
        resolved = Path(file).resolve()
    except (OSError, RuntimeError):
        return f"Invalid file path: {file}"

    for root in _MCP_ALLOWED_ROOTS:
        try:
            resolved.relative_to(root)
            return None  # path is within an allowed root
        except ValueError:
            continue

    return f"File path outside allowed workspace: {file}"


def _find_env_key(envs: dict, *categories: str) -> str | None:
    """Find the first env key matching one of the given categories.

    Categories:
      "api_key" — keys containing API_KEY, TOKEN, or ending with _KEY
      "url"     — keys containing BASE_URL, ENDPOINT, or HOST
      "model"   — keys containing MODEL
    """
    for category in categories:
        for k in envs:
            ku = k.upper()
            if category == "api_key":
                if "API_KEY" in ku or "TOKEN" in ku or ku.endswith("_KEY"):
                    return k
            elif category == "url":
                if "BASE_URL" in ku or "ENDPOINT" in ku or "HOST" in ku:
                    return k
            elif category == "model":
                if "MODEL" in ku:
                    return k
    return None


# ── MCP App Factory ─────────────────────────────────────────────────────────


def create_mcp_app() -> FastMCP:
    mcp = FastMCP("pdf2zh")

    # ── Tool: list_services ──────────────────────────────────────────────

    @mcp.tool()
    async def list_services(ctx: Context) -> str:
        """
        List all available translation services with their configuration
        requirements.

        Returns a JSON array where each entry has:
        - name: service identifier (e.g. "google", "deepseek", "openai")
        - free: true if no API key is needed
        - envs: dict of {KEY: {default, required, is_secret}}
        - custom_prompt: true if the service supports custom translation prompts

        Use this to discover which services are available before calling
        configure_service or translate_pdf.
        """
        _ensure_translators_loaded()
        services = _services_for_agent()
        return json.dumps(services, indent=2, ensure_ascii=False)

    # ── Tool: test_service ───────────────────────────────────────────────

    @mcp.tool()
    async def test_service(
        service: str,
        api_key: str = "",
        model: str = "",
        base_url: str = "",
        ctx: Context = None,
    ) -> str:
        """
        Test connectivity for a translation service.

        Args:
            service: Service name (e.g. "deepseek", "openai", "google")
            api_key: API key for the service (optional for free services)
            model: Model name override (optional, uses service default if empty)
            base_url: Custom base URL for OpenAI-compatible services (optional)

        Returns JSON: {ok: bool, latency_ms: int, sample: "..."} or
        {ok: false, error: "..."}
        """
        _ensure_translators_loaded()
        translator_cls = TranslatorRegistry.get(service)
        if translator_cls is None:
            return json.dumps({"ok": False, "error": f"Unknown service: {service}. Use list_services to see available services."})

        # Build envs from arguments
        envs = {}
        svc_envs = translator_cls.envs
        if api_key:
            key_field = _find_env_key(svc_envs, "api_key")
            if key_field:
                envs[key_field] = api_key
            elif svc_envs:
                # No standard key field — pass as first env
                envs[list(svc_envs.keys())[0]] = api_key
        if model:
            key_field = _find_env_key(svc_envs, "model")
            if key_field:
                envs[key_field] = model
        if base_url:
            key_field = _find_env_key(svc_envs, "url")
            if key_field:
                envs[key_field] = base_url

        try:
            instance = translator_cls("en", "zh", None, envs=envs)
            start = time.time()
            result = instance.do_translate("Hello")
            elapsed = round((time.time() - start) * 1000)
            return json.dumps({
                "ok": True,
                "latency_ms": elapsed,
                "sample": result,
            }, ensure_ascii=False)
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False)

    # ── Tool: configure_service ──────────────────────────────────────────

    @mcp.tool()
    async def configure_service(
        service: str = "",
        api_key: str = "",
        model: str = "",
        base_url: str = "",
        ctx: Context = None,
    ) -> str:
        """
        First-time setup wizard for configuring a translation service.
        Persists API keys and settings to the local config file so they
        don't need to be re-entered for every translation.

        If called with service="" (empty), returns the current configuration
        status and prompts the user to choose a service.

        If called with service="..." and api_key="...", validates the
        credentials by making a test translation, then persists the config.

        Args:
            service: Service name from list_services (e.g. "deepseek", "openai")
            api_key: API key for the service
            model: Model name (optional; uses service default if empty)
            base_url: Custom base URL for OpenAI-compatible services (optional)

        Returns:
            JSON with {configured: bool, service: str, message: str, ...}
        """
        _ensure_translators_loaded()

        if not service:
            # Show current status and guide user
            if ConfigManager.is_configured():
                names = ConfigManager.get_configured_service_names()
                last = ConfigManager.get_last_used_service()
                return json.dumps({
                    "configured": True,
                    "services": names,
                    "last_used": last,
                    "message": (
                        f"Already configured: {', '.join(names)}. "
                        f"Default service: {last or names[0]}. "
                        f"To change or add a service, call configure_service "
                        f"with service=<name> and api_key=<key>."
                    ),
                }, ensure_ascii=False)
            else:
                # First time — list options
                services = _services_for_agent()
                free = [s["name"] for s in services if s["free"]]
                paid = [s["name"] for s in services if not s["free"]]
                return json.dumps({
                    "configured": False,
                    "free_services": free,
                    "paid_services": paid,
                    "message": (
                        "No translation service configured yet. "
                        "Free services (no API key needed): " + ", ".join(free) + ". "
                        "Paid services (API key required): " + ", ".join(paid) + ". "
                        "Call configure_service with service=<name> and api_key=<key> "
                        "to set up a service. Example: configure_service(service='deepseek', api_key='sk-...')"
                    ),
                }, ensure_ascii=False)

        # Validate and configure a specific service
        translator_cls = TranslatorRegistry.get(service)
        if translator_cls is None:
            return json.dumps({
                "configured": False,
                "error": f"Unknown service: {service}. Use list_services to see available options.",
            }, ensure_ascii=False)

        # Build envs dict matching this service's expected keys
        svc_envs = translator_cls.envs
        envs = {}

        # Map api_key → the service's API key field
        if api_key:
            key_field = _find_env_key(svc_envs, "api_key")
            if key_field:
                envs[key_field] = api_key

        # Map model → the service's model field
        if model:
            key_field = _find_env_key(svc_envs, "model")
            if key_field:
                envs[key_field] = model

        # Map base_url → the service's URL field
        if base_url:
            key_field = _find_env_key(svc_envs, "url")
            if key_field:
                envs[key_field] = base_url

        # Fill in defaults for remaining envs
        for k, v in svc_envs.items():
            if k not in envs and v is not None:
                envs[k] = v

        # Validate with a test translation
        try:
            instance = translator_cls("en", "zh", None, envs=envs)
            start = time.time()
            result = instance.do_translate("Hello")
            elapsed = round((time.time() - start) * 1000)
        except Exception as e:
            return json.dumps({
                "configured": False,
                "service": service,
                "error": f"Connection test failed: {e}. Please check your API key and try again.",
            }, ensure_ascii=False)

        # Persist configuration
        ConfigManager.set_translator_by_name(service, envs)
        ConfigManager.set_last_used_service(service)

        return json.dumps({
            "configured": True,
            "service": service,
            "latency_ms": elapsed,
            "sample": result,
            "message": (
                f"Service '{service}' configured successfully! "
                f"Test translation took {elapsed}ms. "
                # Don't expose config file path to MCP caller (security: prevents path disclosure)
                f"You can now use translate_pdf with this service."
            ),
        }, ensure_ascii=False)

    # ── Tool: translate_pdf (enhanced) ────────────────────────────────────

    @mcp.tool()
    async def translate_pdf(
        file: str,
        lang_in: str = "",
        lang_out: str = "",
        service: str = "",
        output_mode: str = "side",
        thread: int = 4,
        ctx: Context = None,
    ) -> str:
        """
        Translate a PDF or Word document.

        If service is not specified, uses the last configured service.
        If no service has been configured, returns an error asking the
        user to run configure_service first.

        Args:
            file: Absolute path to the input PDF/DOC/DOCX file
            lang_in: Source language code (e.g. "en", "zh", "auto")
            lang_out: Target language code (e.g. "zh", "en", "ja")
            service: Translation service name (default: last configured)
            output_mode: "side" (default), "dual", or "mono"
            thread: Number of parallel threads for layout parsing (default 4)

        Returns:
            Text summary with paths to generated PDF files.
        """
        _ensure_translators_loaded()

        # Resolve service
        if not service:
            service = ConfigManager.get_last_used_service()
            if not service:
                return json.dumps({
                    "error": "No translation service configured.",
                    "action": "Call list_services to see available services, then configure_service to set one up.",
                }, ensure_ascii=False)

        # Validate service exists
        translator_cls = TranslatorRegistry.get(service)
        if translator_cls is None:
            return json.dumps({
                "error": f"Unknown service: {service}",
                "action": "Use list_services to see available services.",
            }, ensure_ascii=False)

        # Load envs from config
        envs = ConfigManager.get_translator_by_name(service) or {}

        # Handle doc/docx conversion
        _converted_pdf = None
        if is_convertible(file):
            _converted_pdf = convert_to_pdf(file)
            original_name = os.path.splitext(os.path.basename(file))[0]
            file = _converted_pdf
        else:
            original_name = None

        # Validate file path is within allowed workspace
        path_error = _validate_file_path(file)
        if path_error:
            return json.dumps({"error": path_error}, ensure_ascii=False)

        # Read file
        try:
            with open(file, "rb") as f:
                file_bytes = f.read()
        except FileNotFoundError:
            return json.dumps({"error": f"File not found: {file}"}, ensure_ascii=False)

        await ctx.log(level="info", message=f"Translating {file} with {service} (lang_in={lang_in}, lang_out={lang_out}, output={output_mode})")

        # Run translation (synchronous in background)
        loop = None  # not needed for sync translation
        mono_bytes, dual_bytes, side_bytes, error = _run_translate_sync(
            file, lang_in, lang_out, service, output_mode, thread,
        )

        if error:
            await ctx.log(level="error", message=f"Translation failed: {error}")
            return json.dumps({"error": f"Translation failed: {error}"}, ensure_ascii=False)

        # Record last used service
        try:
            ConfigManager.set_last_used_service(service)
        except Exception:
            pass

        # Write output files to a dedicated directory, not alongside the input file
        output_dir = Path(os.environ.get("PDF2ZH_OUTPUT_DIR", tempfile.mkdtemp(prefix="pdf2zh_output_")))
        output_dir.mkdir(parents=True, exist_ok=True)
        filename = original_name or os.path.splitext(os.path.basename(file))[0]

        written_files = []
        mono_path = output_dir / f"{filename}-mono.pdf"
        with open(mono_path, "wb") as f:
            f.write(mono_bytes)
        written_files.append(str(mono_path.absolute()))

        dual_path = output_dir / f"{filename}-dual.pdf"
        with open(dual_path, "wb") as f:
            f.write(dual_bytes)
        written_files.append(str(dual_path.absolute()))

        if side_bytes:
            side_path = output_dir / f"{filename}-side.pdf"
            with open(side_path, "wb") as f:
                f.write(side_bytes)
            written_files.append(str(side_path.absolute()))

        # Cleanup temp converted file
        if _converted_pdf:
            try:
                os.unlink(_converted_pdf)
            except OSError:
                pass

        await ctx.log(level="info", message=f"Translation complete. Files: {', '.join(written_files)}")

        return json.dumps({
            "ok": True,
            "service": service,
            "files": written_files,
            "output_mode": output_mode,
        }, ensure_ascii=False)

    # ── Tool: translate_batch ─────────────────────────────────────────────

    @mcp.tool()
    async def translate_batch(
        files: str,
        lang_in: str = "",
        lang_out: str = "",
        service: str = "",
        output_mode: str = "side",
        thread: int = 4,
        ctx: Context = None,
    ) -> str:
        """
        Translate multiple PDF/Word documents concurrently.

        Args:
            files: JSON array of absolute file paths, e.g.
                   '["/path/to/a.pdf", "/path/to/b.pdf"]'
            lang_in: Source language code
            lang_out: Target language code
            service: Translation service name (default: last configured)
            output_mode: "side" (default), "dual", or "mono"
            thread: Number of parallel threads per file (default 4)

        Returns:
            JSON with per-file translation results and paths.
        """
        _ensure_translators_loaded()

        # Parse file list
        try:
            file_list = json.loads(files)
        except json.JSONDecodeError:
            return json.dumps({"error": "files must be a JSON array of file paths"}, ensure_ascii=False)

        if not isinstance(file_list, list) or len(file_list) == 0:
            return json.dumps({"error": "files must be a non-empty JSON array"}, ensure_ascii=False)

        if len(file_list) > 20:
            return json.dumps({"error": f"Maximum 20 files, got {len(file_list)}"}, ensure_ascii=False)

        # Resolve service
        if not service:
            service = ConfigManager.get_last_used_service()
            if not service:
                return json.dumps({
                    "error": "No translation service configured.",
                    "action": "Call configure_service first.",
                }, ensure_ascii=False)

        await ctx.log(level="info", message=f"Batch translating {len(file_list)} files with {service}")

        results = []
        output_dir = Path(os.environ.get("PDF2ZH_OUTPUT_DIR", tempfile.mkdtemp(prefix="pdf2zh_batch_")))
        output_dir.mkdir(parents=True, exist_ok=True)

        # Use ThreadPoolExecutor for concurrent translation (max 4 at a time)
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = {}
            for fp in file_list:
                # Validate path is within allowed workspace
                path_error = _validate_file_path(fp)
                if path_error:
                    results.append({"file": fp, "ok": False, "error": path_error})
                    continue
                if not os.path.exists(fp):
                    results.append({"file": fp, "ok": False, "error": "File not found"})
                else:
                    fut = executor.submit(_run_translate_sync, fp, lang_in, lang_out, service, output_mode, thread)
                    futures[fut] = fp

            for fut in concurrent.futures.as_completed(futures):
                fp = futures[fut]
                mono_bytes, dual_bytes, side_bytes, error = fut.result()
                if error:
                    results.append({"file": fp, "ok": False, "error": error})
                else:
                    filename = os.path.splitext(os.path.basename(fp))[0]
                    written = []
                    for suffix, data in [("-mono.pdf", mono_bytes), ("-dual.pdf", dual_bytes)]:
                        p = output_dir / f"{filename}{suffix}"
                        with open(p, "wb") as f:
                            f.write(data)
                        written.append(str(p.absolute()))
                    if side_bytes:
                        p = output_dir / f"{filename}-side.pdf"
                        with open(p, "wb") as f:
                            f.write(side_bytes)
                        written.append(str(p.absolute()))
                    results.append({"file": fp, "ok": True, "files": written})

        await ctx.log(level="info", message=f"Batch complete: {sum(1 for r in results if r['ok'])}/{len(results)} succeeded")

        return json.dumps({
            "total": len(file_list),
            "succeeded": sum(1 for r in results if r.get("ok")),
            "results": results,
        }, ensure_ascii=False)

    return mcp


def create_starlette_app(mcp_server: Server, *, debug: bool = False) -> Starlette:
    sse = SseServerTransport("/messages/")

    async def handle_sse(request: Request) -> None:
        async with sse.connect_sse(request.scope, request.receive, request._send) as (
            read_stream,
            write_stream,
        ):
            await mcp_server.run(
                read_stream, write_stream, mcp_server.create_initialization_options()
            )

    return Starlette(
        debug=debug,
        routes=[
            Route("/sse", endpoint=handle_sse),
            Mount("/messages/", app=sse.handle_post_message),
        ],
    )


if __name__ == "__main__":
    import argparse

    mcp = create_mcp_app()
    mcp_server_obj = mcp._mcp_server
    parser = argparse.ArgumentParser(description="Run MCP SSE-based PDF2ZH server")

    parser.add_argument(
        "--sse",
        default=False,
        action="store_true",
        help="Run the server with SSE transport or STDIO",
    )
    parser.add_argument(
        "--host", type=str, default="127.0.0.1", required=False, help="Host to bind"
    )
    parser.add_argument(
        "--port", type=int, default=3001, required=False, help="Port to bind"
    )

    args = parser.parse_args()
    if args.sse and args.host and args.port:
        import uvicorn

        starlette_app = create_starlette_app(mcp_server_obj, debug=True)
        uvicorn.run(starlette_app, host=args.host, port=args.port)
    else:
        mcp.run()
