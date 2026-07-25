"""Font manager for PDF export – provides Unicode-capable font registration.

Resolution order
----------------
1. Project-bundled DejaVuSans (``backend/app/services/fonts/``)
2. fpdf2-package bundled DejaVuSans (if available in a future fpdf2 release)
3. System-installed Noto Sans (Linux ``/usr/share/fonts/``, macOS ``~/Library/Fonts/``)
4. Fallback: fpdf2 built-in Helvetica (Latin-1 only — Unicode chars are stripped)

Each :meth:`generate_pdf` call instantiates a fresh ``FPDF`` subclass and
calls :func:`register_fonts` on it.  Font registration is **per-instance**
in fpdf2, so there is no global cache — each call does discovery +
registration independently.  The filesystem probes are negligible
(microseconds) compared to PDF rendering time (seconds).

Emoji handling
--------------
Emoji code-points are stripped from text with a warning because *no* practical
PDF font (including DejaVu Sans / Noto Sans) can render colour emoji glyphs.
All other Unicode characters (•, —, “ ”, ‘ ’, Arabic, Urdu, Devanagari, etc.)
are preserved when a Unicode TTF font is active.

Usage
-----
.. code-block:: python

    from app.services.font_manager import register_fonts, sanitize_text

    family = register_fonts(pdf)
    pdf.set_font(family, "B", 13)
    safe = sanitize_text(user_input)
    pdf.multi_cell(0, 5.5, safe)
"""

from __future__ import annotations

import logging
import os
import re
from pathlib import Path
from typing import Optional

from fpdf import FPDF

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────
#  Paths
# ──────────────────────────────────────────────────────────────────────
_BUNDLED_FONTS_DIR = Path(__file__).resolve().parent / "fonts"

# ──────────────────────────────────────────────────────────────────────
#  Emoji code-point ranges
#  Characters in these Unicode blocks cannot be rendered by any practical
#  PDF TTF font (they are colour pictographs / variation selectors).
# ──────────────────────────────────────────────────────────────────────
_EMOJI_RE = re.compile(
    "["
    "\U0001F600-\U0001F64F"    # Emoticons
    "\U0001F300-\U0001F5FF"    # Misc Symbols and Pictographs
    "\U0001F680-\U0001F6FF"    # Transport and Map Symbols
    "\U0001F1E0-\U0001F1FF"    # Regional Indicator Symbols (flags)
    "\U00002702-\U000027B0"    # Dingbats
    "\U000024C2-\U0001F251"    # Enclosed CJK / Enclosed Alphanumerics
    "\U0001F900-\U0001F9FF"    # Supplemental Symbols and Pictographs
    "\U0001FA00-\U0001FA6F"    # Chess Symbols
    "\U0001FA70-\U0001FAFF"    # Symbols Extended-A
    "\U00002600-\U000026FF"    # Miscellaneous Symbols
    "\U0000FE00-\U0000FE0F"    # Variation Selectors
    "\U0000200D"               # Zero Width Joiner
    "\U0000200C"               # Zero Width Non-Joiner
    "]",
    flags=re.UNICODE,
)

# ──────────────────────────────────────────────────────────────────────
#  Font definitions
# ──────────────────────────────────────────────────────────────────────

#: DejaVuSans TTF variants we need for a complete PDF font set.
#: fpdf2 style codes: ``""`` = regular, ``"B"`` = bold, ``"I"`` = italic,
#: ``"BI"`` = bold-italic (falls back to bold since no true BI variant).
_FONT_VARIANTS: dict[str, str] = {
    "":   "DejaVuSans.ttf",
    "B":  "DejaVuSans-Bold.ttf",
    "I":  "DejaVuSans-Oblique.ttf",
    "BI": "DejaVuSans-Bold.ttf",
}

#: Family name under which DejaVu fonts are registered in fpdf2.
_FONT_FAMILY_NAME = "DejaVu"


# ══════════════════════════════════════════════════════════════════════
#  Public API
# ══════════════════════════════════════════════════════════════════════


def register_fonts(pdf: FPDF) -> str:
    """Register the best available Unicode font into *pdf*.

    Returns the font family name to use for all text rendering.
    This function **always** returns a valid family — it falls back
    to the built-in ``Helvetica`` when no TTF font is found (Latin-1
    coverage only; emoji are stripped automatically by
    :func:`sanitize_text`).

    .. note::
       Font registration is performed **every time** this function is
       called because fpdf2 stores font data per-instance.  The filesystem
       probes here are very cheap (~µs).
    """
    # ── 1. Project-bundled DejaVuSans ───────────────────────────────
    if _BUNDLED_FONTS_DIR.is_dir():
        result = _register_dejavu_from(pdf, _BUNDLED_FONTS_DIR)
        if result is not None:
            logger.info("PDF font: %s (bundled)", result)
            return result

    # ── 2. fpdf2-package bundled fonts ──────────────────────────────
    fpdf2_dir = _locate_fpdf2_font_dir()
    if fpdf2_dir is not None:
        result = _register_dejavu_from(pdf, fpdf2_dir)
        if result is not None:
            logger.info("PDF font: %s (fpdf2 bundled)", result)
            return result

    # ── 3. System Noto Sans ─────────────────────────────────────────
    noto_dir = _find_system_noto_dir()
    if noto_dir is not None:
        result = _register_noto_from(pdf, noto_dir)
        if result is not None:
            logger.info("PDF font: %s (system)", result)
            return result

    # ── 4. Fallback: Helvetica (Latin-1 only) ───────────────────────
    logger.warning(
        "No Unicode TTF font found for PDF export. "
        "Falling back to Helvetica (Latin-1 only). "
        "Run `python backend/scripts/setup_fonts.py` to download DejaVuSans fonts."
    )
    return "Helvetica"


def sanitize_text(text: str) -> str:
    """Remove emoji characters that would crash PDF generation.

    Preserves all Unicode characters supported by typical TTF fonts
    (•, —, “ ”, ' ', Arabic, Urdu, Devanagari, Cyrillic, etc.) and
    **only** strips emoji pictographs / variation selectors that no
    practical PDF font can render.

    Returns the cleaned text.  Logs a warning if emoji were stripped.
    """
    if not text:
        return text
    cleaned, count = _EMOJI_RE.subn("", text)
    if count:
        logger.info("sanitize_text: stripped %d emoji char(s)", count)
    return cleaned


# ══════════════════════════════════════════════════════════════════════
#  Internal helpers
# ══════════════════════════════════════════════════════════════════════


def _locate_fpdf2_font_dir() -> Optional[Path]:
    """Return the path to fpdf2's bundled ``fonts/`` directory, or ``None``."""
    try:
        import fpdf as _fpdf_mod

        base = Path(os.path.dirname(os.path.abspath(_fpdf_mod.__file__)))

        # fpdf2 may place fonts at fpdf/fonts/ or in a parent data dir
        for candidate in [base / "fonts", base.parent / "fonts"]:
            if candidate.is_dir():
                return candidate
    except Exception as exc:
        logger.debug("fpdf2 font dir probe failed: %s", exc)
    return None


def _register_dejavu_from(pdf: FPDF, font_dir: Path) -> Optional[str]:
    """Register DejaVuSans TTF fonts from *font_dir* into *pdf*.

    Returns the family name on success, ``None`` if the required
    files are missing or registration fails.
    """
    required = [
        font_dir / "DejaVuSans.ttf",
        font_dir / "DejaVuSans-Bold.ttf",
    ]
    if not all(p.is_file() for p in required):
        logger.debug("DejaVuSans.ttf not found in %s", font_dir)
        return None

    for style, filename in _FONT_VARIANTS.items():
        path = str(font_dir / filename)
        try:
            pdf.add_font(_FONT_FAMILY_NAME, style, path, uni=True)
        except Exception as exc:
            logger.warning(
                "Failed to register DejaVu style %r from %s: %s",
                style,
                path,
                exc,
            )
            return None

    return _FONT_FAMILY_NAME


def _find_system_noto_dir() -> Optional[Path]:
    """Return the first directory containing NotoSans*.ttf files."""
    candidates = [
        "/usr/share/fonts/truetype/noto",  # Linux (Debian/Ubuntu)
        "/usr/share/fonts/noto",           # Linux (Fedora)
        "/usr/local/share/fonts/noto",     # macOS (Homebrew)
        str(Path.home() / "Library/Fonts"),  # macOS user fonts
        "C:\\Windows\\Fonts",              # Windows (rare to have Noto here)
    ]
    for candidate in candidates:
        p = Path(candidate)
        if p.is_dir() and list(p.glob("NotoSans*.ttf")):
            return p
    return None


def _register_noto_from(pdf: FPDF, font_dir: Path) -> Optional[str]:
    """Register Noto Sans fonts from *font_dir* into *pdf*.

    Returns the family name on success, ``None`` on failure.
    """
    files = list(font_dir.glob("NotoSans*.ttf"))
    if not files:
        return None

    noto_name = "NotoSans"

    # Heuristic: find Regular, Bold, Italic variants
    def _find(kw: str) -> Optional[str]:
        for f in files:
            if kw in f.stem.replace("-", ""):
                return str(f)
        return None

    try:
        regular = _find("Regular") or str(files[0])
        bold = _find("Bold") or regular
        italic = _find("Italic") or _find("Oblique") or regular

        pdf.add_font(noto_name, "", regular, uni=True)
        pdf.add_font(noto_name, "B", bold, uni=True)
        pdf.add_font(noto_name, "I", italic, uni=True)
        pdf.add_font(noto_name, "BI", bold, uni=True)  # no true BI variant
    except Exception as exc:
        logger.warning("Failed to register Noto from %s: %s", font_dir, exc)
        return None

    return noto_name
