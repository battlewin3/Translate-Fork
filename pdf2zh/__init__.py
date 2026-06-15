import logging
import sys
from pathlib import Path

# Vendor directory: bundled packages that don't need separate pip install
_vendor_path = Path(__file__).parent / "vendor"
if _vendor_path.is_dir() and str(_vendor_path) not in sys.path:
    sys.path.insert(0, str(_vendor_path))

log = logging.getLogger(__name__)

__version__ = "1.9.11"
__author__ = "Byaidu"
__all__ = ["translate", "translate_stream"]


def __getattr__(name):
    if name in {"translate", "translate_stream"}:
        from pdf2zh.high_level import translate, translate_stream

        return {"translate": translate, "translate_stream": translate_stream}[name]
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
