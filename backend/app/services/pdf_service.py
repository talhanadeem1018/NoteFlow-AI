"""Unicode-safe PDF export helpers using ReportLab.

The service prefers Noto Sans when available, then falls back to a bundled
DejaVu Sans font placed under the project-level fonts/ directory. It also
sanitizes emoji-like characters so PDF generation does not crash when a selected
font cannot render them.
"""

from __future__ import annotations

import io
import logging
import os
import sys
import unicodedata
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from app.models.note import Note

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parents[2]
PROJECT_FONT_DIR = BACKEND_ROOT / "fonts"

_FONT_REGISTRATION: tuple[str, str] | None = None


def _ensure_font_directory() -> Path:
    """Create the project fonts directory if it does not already exist."""
    PROJECT_FONT_DIR.mkdir(parents=True, exist_ok=True)
    readme_path = PROJECT_FONT_DIR / "README.md"
    if not readme_path.exists():
        readme_path.write_text(
            "# PDF Fonts\n\n"
            "Place your preferred Unicode font files here.\n"
            "Supported names include:\n"
            "- NotoSans-Regular.ttf / NotoSans-Bold.ttf\n"
            "- DejaVuSans.ttf / DejaVuSans-Bold.ttf\n"
            "If one of those files is present, the PDF exporter will use it automatically.\n",
            encoding="utf-8",
        )
    return PROJECT_FONT_DIR


def _register_unicode_font() -> tuple[str, str]:
    """Register the best available Unicode font and return family names."""
    global _FONT_REGISTRATION
    if _FONT_REGISTRATION is not None:
        return _FONT_REGISTRATION

    _ensure_font_directory()

    regular_candidates = [
        PROJECT_FONT_DIR / "NotoSans-Regular.ttf",
        PROJECT_FONT_DIR / "NotoSans.ttf",
        PROJECT_FONT_DIR / "DejaVuSans.ttf",
        Path(r"C:\Windows\Fonts\NotoSans-Regular.ttf"),
        Path(r"C:\Windows\Fonts\Noto Sans Regular.ttf"),
        Path(r"C:\Windows\Fonts\DejaVuSans.ttf"),
        Path("/Library/Fonts/Noto Sans.ttf"),
        Path("/Library/Fonts/NotoSans-Regular.ttf"),
        Path("/Library/Fonts/DejaVu Sans.ttf"),
        Path("/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"),
        Path("/usr/share/fonts/truetype/noto/NotoSans.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ]
    bold_candidates = [
        PROJECT_FONT_DIR / "NotoSans-Bold.ttf",
        PROJECT_FONT_DIR / "DejaVuSans-Bold.ttf",
        Path(r"C:\Windows\Fonts\NotoSans-Bold.ttf"),
        Path(r"C:\Windows\Fonts\DejaVu Sans Bold.ttf"),
        Path("/Library/Fonts/Noto Sans Bold.ttf"),
        Path("/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ]

    regular_path = next((path for path in regular_candidates if path.exists()), None)
    bold_path = next((path for path in bold_candidates if path.exists()), None)

    if regular_path is None:
        logger.warning("No Unicode font file was found; falling back to ReportLab default fonts")
        _FONT_REGISTRATION = ("Helvetica", "Helvetica-Bold")
        return _FONT_REGISTRATION

    family_name = "NotoSans" if "NotoSans" in regular_path.name else "DejaVuSans"
    bold_family_name = f"{family_name}-Bold"

    try:
        pdfmetrics.registerFont(TTFont(family_name, str(regular_path)))
        if bold_path and bold_path.exists():
            pdfmetrics.registerFont(TTFont(bold_family_name, str(bold_path)))
        else:
            pdfmetrics.registerFont(TTFont(bold_family_name, str(regular_path)))
    except Exception as exc:  # pragma: no cover - defensive logging path
        logger.exception("Failed to register PDF font %s: %s", regular_path, exc)
        _FONT_REGISTRATION = ("Helvetica", "Helvetica-Bold")
        return _FONT_REGISTRATION

    _FONT_REGISTRATION = (family_name, bold_family_name)
    logger.info("Registered Unicode font %s for PDF export", regular_path)
    return _FONT_REGISTRATION


def _sanitize_text(text: str, font_name: str) -> str:
    """Preserve printable Unicode characters while dropping emoji-like glyphs."""
    if not text:
        return ""

    sanitized_parts: list[str] = []
    for char in text:
        code_point = ord(char)
        category = unicodedata.category(char)
        if char in {"\u200d", "\ufe0f"}:
            continue
        if category in {"Cs", "Co", "Cn"}:
            continue
        if 0x1F300 <= code_point <= 0x1FAFF:
            continue
        if 0x2600 <= code_point <= 0x27BF:
            continue
        sanitized_parts.append(char)

    return "".join(sanitized_parts)


def _build_styles(font_family: str, font_bold: str) -> dict[str, ParagraphStyle]:
    stylesheet = getSampleStyleSheet()
    base = stylesheet["BodyText"]
    return {
        "title": ParagraphStyle(
            "NoteTitle",
            parent=base,
            fontName=font_family,
            fontSize=20,
            leading=24,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#1F1F1F"),
            spaceAfter=10,
        ),
        "meta": ParagraphStyle(
            "NoteMeta",
            parent=base,
            fontName=font_family,
            fontSize=9,
            leading=11,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#7A7A7A"),
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "NoteBody",
            parent=base,
            fontName=font_family,
            fontSize=10,
            leading=13,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#333333"),
            spaceAfter=6,
        ),
        "heading": ParagraphStyle(
            "NoteHeading",
            parent=base,
            fontName=font_bold,
            fontSize=13,
            leading=15,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#222222"),
            spaceBefore=10,
            spaceAfter=6,
            borderWidth=0,
        ),
        "bullet": ParagraphStyle(
            "NoteBullet",
            parent=base,
            fontName=font_family,
            fontSize=10,
            leading=13,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#333333"),
            leftIndent=14,
            spaceAfter=3,
        ),
    }


def _paragraphs_from_text(text: str, style: ParagraphStyle) -> list[Paragraph]:
    """Wrap a string into ReportLab paragraphs, preserving line breaks."""
    if not text:
        return []
    return [Paragraph(_sanitize_text(part, style.fontName), style) for part in text.splitlines() if part.strip()]


def _build_flowables(note: Note, font_family: str, font_bold: str) -> list[object]:
    styles = _build_styles(font_family, font_bold)
    flowables: list[object] = []

    flowables.append(Paragraph(_sanitize_text(note.title or "Untitled Notes", font_family), styles["title"]))
    flowables.append(Spacer(1, 0.1 * inch))

    generated_on = f"Generated on {note.created_at.strftime('%B %d, %Y') if getattr(note, 'created_at', None) else 'Unknown date'}"
    flowables.append(Paragraph(_sanitize_text(generated_on, font_family), styles["meta"]))

    if note.model_used:
        flowables.append(Paragraph(_sanitize_text(f"Model: {note.model_used}", font_family), styles["meta"]))
    if note.processing_time and note.processing_time > 0:
        flowables.append(Paragraph(_sanitize_text(f"Processing time: {note.processing_time:.1f}s", font_family), styles["meta"]))

    flowables.append(Spacer(1, 0.15 * inch))

    if note.executive_summary and note.executive_summary.strip():
        flowables.append(Paragraph(_sanitize_text("Executive Summary", font_bold), styles["heading"]))
        flowables.extend(_paragraphs_from_text(note.executive_summary, styles["body"]))

    if note.key_concepts:
        flowables.append(Paragraph(_sanitize_text("Key Concepts", font_bold), styles["heading"]))
        for item in note.key_concepts:
            flowables.append(Paragraph(_sanitize_text(f"• {item}", font_family), styles["bullet"]))

    if note.detailed_notes and note.detailed_notes.strip():
        flowables.append(Paragraph(_sanitize_text("Detailed Notes", font_bold), styles["heading"]))
        flowables.extend(_paragraphs_from_text(note.detailed_notes, styles["body"]))

    if note.bullet_points:
        flowables.append(Paragraph(_sanitize_text("Key Takeaways", font_bold), styles["heading"]))
        for item in note.bullet_points:
            flowables.append(Paragraph(_sanitize_text(f"• {item}", font_family), styles["bullet"]))

    if note.keywords:
        flowables.append(Paragraph(_sanitize_text("Keywords", font_bold), styles["heading"]))
        flowables.append(Paragraph(_sanitize_text("  ".join(note.keywords), font_family), styles["body"]))

    if note.action_items:
        flowables.append(Paragraph(_sanitize_text("Action Items", font_bold), styles["heading"]))
        for item in note.action_items:
            flowables.append(Paragraph(_sanitize_text(f"• {item}", font_family), styles["bullet"]))

    if note.conclusion and note.conclusion.strip():
        flowables.append(Paragraph(_sanitize_text("Conclusion", font_bold), styles["heading"]))
        flowables.extend(_paragraphs_from_text(note.conclusion, styles["body"]))

    return flowables


def generate_pdf(note: Note) -> io.BytesIO:
    """Generate a Unicode-safe PDF from a note object."""
    font_family, font_bold = _register_unicode_font()
    buffer = io.BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    try:
        document.build(_build_flowables(note, font_family, font_bold))
    except Exception as exc:  # pragma: no cover - defensive logging path
        logger.exception("PDF generation failed for note %s: %s", getattr(note, "id", None), exc)
        raise

    buffer.seek(0)
    return buffer
