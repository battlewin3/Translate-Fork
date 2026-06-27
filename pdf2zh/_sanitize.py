"""Shared error-message sanitizer with secret redaction.

Used by both the REST API (``pdf2zh.api``) and MCP server
(``pdf2zh.mcp_server``) to ensure exception messages from translation
services never leak API keys, tokens, or internal paths to clients.
"""

from __future__ import annotations

import re

# ── Secret / PII patterns ────────────────────────────────────────────────────
# Each pattern is tested against exception messages from all 25 translation
# services.  Order matters: longer / more-specific patterns match first so
# that ``sk-ant-...`` keys are redacted before the generic ``sk-...`` rule.

_SECRET_PATTERNS: list[re.Pattern[str]] = [
    # Anthropic keys (before the generic OpenAI-style rule)
    re.compile(r"sk-ant-[A-Za-z0-9_-]{20,}", re.IGNORECASE),
    # OpenAI / DeepSeek / LLM keys
    re.compile(r"sk-[A-Za-z0-9_-]{20,}", re.IGNORECASE),
    # AWS-style access keys
    re.compile(r"AKIA[0-9A-Z]{16}"),
    # JWT tokens (three base64url segments separated by dots)
    re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
    # API keys embedded in URL query strings: key=value pairs
    re.compile(
        r"(api_key|apikey|key|token|secret|auth|password|api-key)=[^&\s\"']{8,}",
        re.IGNORECASE,
    ),
    # Absolute filesystem paths that reveal user directories
    re.compile(r"(?:/[Hh]ome/|/[Uu]sers/|[A-Z]:\\[Uu]sers\\)[^\s,\"']+"),
]

_REDACT = "[REDACTED]"

# Maximum length before truncation (characters)
_MAX_LENGTH = 500


def sanitize_error(e: BaseException, max_length: int = _MAX_LENGTH) -> str:
    """Redact secrets and truncate an exception message for client return.

    Parameters
    ----------
    e : BaseException
        The exception whose string representation should be sanitised.
    max_length : int
        Maximum allowed message length before truncation (default 500).

    Returns
    -------
    str
        A safe-to-share error message.
    """
    msg = str(e)

    # Redact secrets first (order matters — see pattern list above)
    for pat in _SECRET_PATTERNS:
        msg = pat.sub(_REDACT, msg)

    # Truncate long messages
    if len(msg) > max_length:
        msg = msg[:max_length] + "..."

    return msg
