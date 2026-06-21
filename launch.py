#!/usr/bin/env python3
"""
PDFMathTranslate — Unified Launcher
====================================
Cross-platform, encoding-safe replacement for 启动.bat.

Usage:
    python launch.py              # dev mode (Vite HMR)
    python launch.py --build      # production mode (build then preview)
    python launch.py --no-browser # don't open browser
    python launch.py --help

Requirements: Python >= 3.11, Node.js >= 18, npm
"""

from __future__ import annotations

import argparse
import atexit
import os
import signal
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

# ── constants ────────────────────────────────────────────────────────────────

PROJECT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = PROJECT_DIR / "frontend"

BACKEND_HOST = "127.0.0.1"
DEFAULT_BACKEND_PORT = 8000
FRONTEND_PORT = 5173

HEALTH_URL = f"http://{BACKEND_HOST}:{DEFAULT_BACKEND_PORT}/api/health"
FRONTEND_URL = f"http://localhost:{FRONTEND_PORT}"

HEALTH_POLL_INTERVAL = 0.5   # seconds between health checks
HEALTH_TIMEOUT = 30           # max seconds to wait for backend
NPM_INSTALL_TIMEOUT = 120     # max seconds for npm install

_processes: list[subprocess.Popen] = []
_shutting_down = False


# ── helpers ──────────────────────────────────────────────────────────────────

def _bold(text: str) -> str:
    """Wrap text in ANSI bold if the terminal supports it."""
    if os.name == "nt":
        # Windows ≥10 supports VT sequences natively since conhost v2
        return f"\033[1m{text}\033[0m"
    return f"\033[1m{text}\033[0m"


def _green(text: str) -> str:
    return f"\033[32m{text}\033[0m"


def _red(text: str) -> str:
    return f"\033[31m{text}\033[0m"


def _yellow(text: str) -> str:
    return f"\033[33m{text}\033[0m"


def _section(title: str) -> None:
    print(f"\n{_bold('─' * 42)}")
    print(f"  {_bold(title)}")
    print(f"{_bold('─' * 42)}")


def _pause() -> None:
    """Prompt the user to press Enter, handling redirected stdin gracefully."""
    try:
        input("\nPress Enter to exit …")
    except (EOFError, KeyboardInterrupt):
        pass


def _ok(label: str) -> None:
    print(f"  {_green('[OK]')}    {label}")


def _fail(label: str) -> None:
    print(f"  {_red('[FAIL]')}  {label}")


def _info(label: str) -> None:
    print(f"  {_yellow('[...]')}  {label}")


def _banner() -> None:
    print(_bold("\n  PDFMathTranslate — Scientific PDF Translation\n"))


# ── environment checks ───────────────────────────────────────────────────────

def _resolve_cmd(name: str) -> str:
    """On Windows, try ``name.cmd`` if ``name`` alone isn't found."""
    if os.name == "nt":
        import shutil
        if shutil.which(name) is None:
            alt = f"{name}.cmd"
            if shutil.which(alt):
                return alt
    return name


def _check_command(cmd: list[str], label: str, version_arg: str = "--version",
                   min_version: tuple | None = None) -> bool:
    """Check whether *cmd* runs and optionally meets a minimum version."""
    cmd[0] = _resolve_cmd(cmd[0])
    # On Windows, npm/node are .cmd wrappers that need shell resolution.
    # Use shell=True so cmd.exe can find them even if they lack .exe extension.
    use_shell = os.name == "nt"
    try:
        result = subprocess.run(
            [*cmd, version_arg],
            capture_output=True, text=True, timeout=10,
            shell=use_shell,
        )
        stdout = (result.stdout or "") + (result.stderr or "")
        version_str = stdout.strip().splitlines()[0] if stdout.strip() else "(ok)"
        if min_version is not None:
            import re
            digits = re.findall(r"(\d+)\.(\d+)", version_str)
            if digits:
                major, minor = int(digits[0][0]), int(digits[0][1])
                if (major, minor) < min_version:
                    _fail(f"{label} {version_str} < {min_version[0]}.{min_version[1]}")
                    return False
        _ok(f"{label} — {version_str}")
        return True
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        _fail(f"{label} not found")
        return False


def _check_env() -> bool:
    """Verify Python and Node.js are available."""
    _section("Environment")

    ok = True

    # Python (already running, but verify version)
    py_ver = sys.version_info[:2]
    if py_ver < (3, 11):
        _fail(f"Python {py_ver[0]}.{py_ver[1]} — need >= 3.11")
        ok = False
    else:
        _ok(f"Python {sys.version.split()[0]}")

    # Node
    if not _check_command(["node"], "Node.js", min_version=(18, 0)):
        ok = False

    # npm
    if not _check_command(["npm"], "npm"):
        ok = False

    return ok


# ── frontend dependencies ────────────────────────────────────────────────────

def _install_frontend_deps() -> bool:
    """Run ``npm install`` inside frontend/ if node_modules is missing."""
    node_modules = FRONTEND_DIR / "node_modules"
    if node_modules.is_dir():
        _ok("Frontend dependencies already installed")
        return True

    _section("Install frontend dependencies")
    _info("Running npm install (this may take a minute) …")

    try:
        proc = subprocess.Popen(
            ["npm", "install"],
            cwd=str(FRONTEND_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            shell=(os.name == "nt"),
        )
        _processes.append(proc)

        # Stream output so the user sees progress
        start = time.monotonic()
        for line in proc.stdout:
            print(f"       {line.rstrip()}")
            if time.monotonic() - start > NPM_INSTALL_TIMEOUT:
                proc.kill()
                _fail("npm install timed out")
                return False

        proc.wait()
        _processes.remove(proc)

        if proc.returncode == 0:
            _ok("Frontend dependencies installed")
            return True
        else:
            _fail(f"npm install exited with code {proc.returncode}")
            return False
    except Exception as e:
        _fail(f"npm install failed: {e}")
        return False


# ── process management ───────────────────────────────────────────────────────

def _cleanup() -> None:
    """Kill all child processes on exit."""
    global _shutting_down
    if _shutting_down:
        return
    _shutting_down = True

    if not _processes:
        return
    print(f"\n{_yellow('Shutting down …')}")
    for proc in reversed(_processes):
        try:
            if proc.poll() is None:
                proc.terminate()
        except OSError:
            pass
    # Give processes a moment to shut down gracefully
    time.sleep(0.5)
    for proc in _processes:
        try:
            if proc.poll() is None:
                proc.kill()
        except OSError:
            pass
    _processes.clear()
    print(_green("All processes stopped."))


def _signal_handler(signum: int, frame: object) -> None:
    """Forward Ctrl+C to cleanup."""
    _cleanup()
    sys.exit(0)


atexit.register(_cleanup)
signal.signal(signal.SIGINT, _signal_handler)
if os.name == "nt":
    signal.signal(signal.SIGBREAK, _signal_handler)  # type: ignore[attr-defined]


# ── backend ──────────────────────────────────────────────────────────────────

def _start_backend(port: int = DEFAULT_BACKEND_PORT) -> subprocess.Popen:
    """Launch uvicorn in a subprocess."""
    _info(f"Starting backend on http://{BACKEND_HOST}:{port}")

    # On Windows, CREATE_NEW_PROCESS_GROUP lets us send Ctrl+C cleanly
    creationflags = 0
    if os.name == "nt":
        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]

    proc = subprocess.Popen(
        [
            sys.executable, "-m", "uvicorn",
            "pdf2zh.api:app",
            "--host", BACKEND_HOST,
            "--port", str(port),
        ],
        cwd=str(PROJECT_DIR),
        creationflags=creationflags,
        # Let stdout/stderr through so the user sees uvicorn logs
    )
    _processes.append(proc)
    return proc


def _wait_for_backend(health_url: str = HEALTH_URL, timeout: int = HEALTH_TIMEOUT) -> bool:
    """Poll the health endpoint until it responds or *timeout* seconds pass."""
    _info("Waiting for backend to be ready …")
    deadline = time.monotonic() + timeout
    last_status = ""

    while time.monotonic() < deadline:
        try:
            resp = urllib.request.urlopen(health_url, timeout=2)
            data = resp.read().decode()
            _ok(f"Backend is ready — {data}")
            return True
        except (OSError, ConnectionRefusedError, urllib.request.URLError):
            time.sleep(HEALTH_POLL_INTERVAL)
            # Print a dot every 2 seconds so the user knows we're waiting
            elapsed_rounded = int(time.monotonic() - (deadline - timeout))
            status = "." * (elapsed_rounded // 2 % 4 + 1)
            if status != last_status:
                print(f"\r       {status:<6}", end="", flush=True)
                last_status = status

    _fail(f"Backend did not respond within {timeout}s")
    return False


# ── frontend ─────────────────────────────────────────────────────────────────

def _start_frontend_dev() -> subprocess.Popen:
    """Launch the Vite dev server."""
    _info(f"Starting frontend on http://localhost:{FRONTEND_PORT}")

    proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=str(FRONTEND_DIR),
        shell=(os.name == "nt"),
    )
    _processes.append(proc)
    return proc


def _start_frontend_build() -> None:
    """Build the frontend for production then start the preview server."""
    _section("Build frontend")
    _info("Running npm run build …")

    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=str(FRONTEND_DIR),
        capture_output=False,
        shell=(os.name == "nt"),
    )
    if result.returncode != 0:
        _fail("Frontend build failed")
        sys.exit(1)

    _ok("Frontend built")
    _info(f"Starting preview server on http://localhost:{FRONTEND_PORT}")

    proc = subprocess.Popen(
        ["npm", "run", "preview", "--", "--port", str(FRONTEND_PORT)],
        cwd=str(FRONTEND_DIR),
        shell=(os.name == "nt"),
    )
    _processes.append(proc)


# ── browser ──────────────────────────────────────────────────────────────────

def _open_browser(url: str = FRONTEND_URL) -> None:
    """Open the frontend URL in the default browser."""
    _info(f"Opening {url}")
    try:
        webbrowser.open(url)
    except Exception:
        # Non-critical; the user can open manually
        _info(f"Could not open browser — visit {url} manually")


# ── main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="PDFMathTranslate Unified Launcher",
    )
    parser.add_argument(
        "--build", action="store_true",
        help="Build frontend for production (uses vite preview instead of dev server)",
    )
    parser.add_argument(
        "--no-browser", action="store_true",
        help="Do not open browser automatically",
    )
    parser.add_argument(
        "--port", type=int, default=DEFAULT_BACKEND_PORT,
        help=f"Backend port (default: {DEFAULT_BACKEND_PORT})",
    )
    args = parser.parse_args()

    backend_port: int = args.port
    health_url = f"http://{BACKEND_HOST}:{backend_port}/api/health"

    _banner()

    # 1. Environment checks
    if not _check_env():
        print(f"\n{_red('Environment check failed. Fix the issues above and try again.')}")
        _pause()
        sys.exit(1)

    # 2. Install frontend dependencies
    if not _install_frontend_deps():
        print(f"\n{_red('Dependency installation failed.')}")
        _pause()
        sys.exit(1)

    # 3. Start backend
    _section("Start services")
    _start_backend(port=backend_port)

    # 4. Wait for backend
    if not _wait_for_backend(health_url=health_url):
        _cleanup()
        _pause()
        sys.exit(1)

    # 5. Start frontend
    if args.build:
        _start_frontend_build()
    else:
        _start_frontend_dev()

    # 6. Open browser (after a short pause to let Vite start)
    if not args.no_browser:
        time.sleep(1.5)
        _open_browser()

    # 7. Ready — wait for user to Ctrl+C
    print(f"""
{_bold('=' * 42)}
  Backend API  {_green(f'http://{BACKEND_HOST}:{backend_port}/docs')}
  Frontend UI  {_green(FRONTEND_URL)}
{_bold('=' * 42)}

Press Ctrl+C to stop all services.
""")

    try:
        while any(p.poll() is None for p in _processes):
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    finally:
        _cleanup()


if __name__ == "__main__":
    main()
