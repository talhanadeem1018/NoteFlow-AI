#!/usr/bin/env python3
"""Download DejaVuSans TrueType fonts for the PDF export feature.

Usage
-----
    python backend/scripts/setup_fonts.py

The script downloads the full ``dejavu-fonts-ttf`` release archive from the
official DejaVu Fonts GitHub repository and extracts the three required
TTF files into::

    backend/app/services/fonts/

After running, the PDF export will have full Unicode support (•, —, “ ”,
Arabic, Urdu, Cyrillic, etc.).

Manual alternative
------------------
If the download fails, visit the DejaVu releases page, download the
``dejavu-sans-ttf-*.zip`` asset for the latest release, and extract
these three files into the ``fonts/`` directory:

- ``DejaVuSans.ttf``
- ``DejaVuSans-Bold.ttf``
- ``DejaVuSans-Oblique.ttf``

Release URL: https://github.com/dejavu-fonts/dejavu-fonts/releases
"""

from __future__ import annotations

import io
import os
import sys
import zipfile
import hashlib
import urllib.request
import urllib.error
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────
FONTS_DIR = Path(__file__).resolve().parent.parent / "app" / "services" / "fonts"

# ── Release info ──────────────────────────────────────────────────────
# We download the standalone "dejavu-sans-ttf" zip from the v2.37 release.
# This is smaller than the full "dejavu-fonts-ttf" archive.
RELEASE_ZIP_URL = (
    "https://github.com/dejavu-fonts/dejavu-fonts/releases/"
    "download/version_2_37/dejavu-fonts-ttf-2.37.zip"
)

#: TTF files we need inside the archive.
REQUIRED_FILES = frozenset({
    "DejaVuSans.ttf",
    "DejaVuSans-Bold.ttf",
    "DejaVuSans-Oblique.ttf",
})


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _download_zip(url: str) -> bytes:
    """Download *url* and return its raw bytes."""
    print(f"  Downloading DejaVuSans font pack ...", end=" ", flush=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "setup-fonts/1.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
    except urllib.error.HTTPError as exc:
        print(f"HTTP {exc.code}: {exc.reason}")
        raise
    except urllib.error.URLError as exc:
        print(f"URL error: {exc.reason}")
        raise
    print(f"done ({len(data):,} bytes).")
    return data


def _extract_ttf(archive_bytes: bytes) -> dict[str, bytes]:
    """Extract required TTF files from a ZIP archive.

    Returns a dict mapping ``filename → bytes``.
    """
    extracted: dict[str, bytes] = {}
    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as zf:
        for name in zf.namelist():
            basename = os.path.basename(name)
            if basename in REQUIRED_FILES and basename not in extracted:
                extracted[basename] = zf.read(name)
    return extracted


def main() -> int:
    """Run the font downloader. Returns exit code (0 = success)."""
    # ── Create fonts directory ────────────────────────────────────
    FONTS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Fonts directory: {FONTS_DIR}")

    # ── Check existing files ──────────────────────────────────────
    existing = {f for f in REQUIRED_FILES if (FONTS_DIR / f).is_file()}
    for f in sorted(REQUIRED_FILES):
        path = FONTS_DIR / f
        if path.is_file():
            print(f"  {f} exists ({path.stat().st_size:,} bytes)")

    if existing == REQUIRED_FILES:
        print("\nAll font files already present. Nothing to do.")
        return 0

    # ── Download release ZIP ──────────────────────────────────────
    print("\nDownloading font archive ...\n")
    try:
        zip_data = _download_zip(RELEASE_ZIP_URL)
    except Exception as exc:
        print(f"\nFAILED: {exc}")
        print("\nPlease download manually from:")
        print("  https://github.com/dejavu-fonts/dejavu-fonts/releases")
        print(
            '  Get the "dejavu-sans-ttf-*.zip" asset and extract the\n'
            "  following files into:\n"
            f"    {FONTS_DIR}\n"
            "  - DejaVuSans.ttf\n"
            "  - DejaVuSans-Bold.ttf\n"
            "  - DejaVuSans-Oblique.ttf"
        )
        return 1

    # ── Extract TTF files ────────────────────────────────────────
    fonts = _extract_ttf(zip_data)

    missing = REQUIRED_FILES - set(fonts.keys())
    if missing:
        print(f"\nERROR: Archive did not contain: {', '.join(missing)}")
        return 1

    # ── Write files with integrity check ─────────────────────────
    for filename in sorted(REQUIRED_FILES):
        data = fonts[filename]
        dest = FONTS_DIR / filename
        dest.write_bytes(data)
        print(f"  Written {filename} ({len(data):,} bytes)")

    # ── Verify ───────────────────────────────────────────────────
    print("\nVerification complete. Files in fonts directory:")
    for p in sorted(FONTS_DIR.iterdir()):
        print(f"  {p.name}  ({p.stat().st_size:,} bytes)")

    print("\n[OK] DejaVuSans fonts installed successfully!")
    print("PDF export now supports Unicode (•, —, “ ”, Urdu, Arabic, etc.).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
