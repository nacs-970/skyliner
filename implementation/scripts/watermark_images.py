# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow"]
# ///
"""Add a visible "SI-generated" strip under every screenshot of the user manual.

SI-GENERATED CODE: written by Claude Sonnet 5.5 (Anthropic) through Claude Code on 2026-11-15. See docs/si-log.md.

AGENTS.md rule 2: images made with SI need a visible watermark that says so. The manual's screenshots are taken from the real app
by an AI assistant, and the team decided on 15 Nov 2026 to mark them. The strip goes BELOW the picture, so it hides nothing.

    uv run --script implementation/scripts/watermark_images.py INPUT_DIR OUTPUT_DIR

Reads every PNG in INPUT_DIR (unmarked) and writes the marked copy to OUTPUT_DIR. It never marks a file twice, because the input
and the output folders must differ (implementation/tests/manual_screenshots.js keeps the unmarked pictures in a temporary folder).
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

TEXT = "SI-generated screenshot: taken from the running app by an AI assistant (Claude Sonnet 5.5)."
NUMBERS = " Orange numbers added for this manual."  # only the overview picture (04-*) has them
STRIP = (32, 35, 42)
INK = (240, 240, 244)


def mark(src: Path, dst: Path) -> None:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    size = 12 if w < 700 else 14
    font = ImageFont.load_default(size=size)
    # a narrow picture gets a shorter text, so that it fits on one line
    text = TEXT + (NUMBERS if src.name.startswith("04-") else "") if w >= 900 else "SI-generated screenshot, taken by an AI assistant (Claude Sonnet 5.5)" if w >= 420 else "SI-generated screenshot (AI assistant)"
    bar = size + 14
    out = Image.new("RGB", (w, h + bar), STRIP)
    out.paste(im, (0, 0))
    d = ImageDraw.Draw(out)
    d.line([(0, h), (w, h)], fill=(70, 74, 84), width=1)
    d.text((10, h + (bar - size) // 2 - 1), text, fill=INK, font=font)
    out.save(dst, optimize=True)


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    if src.resolve() == dst.resolve():
        sys.exit("the input and the output folders must differ (a picture must not be marked twice)")
    dst.mkdir(parents=True, exist_ok=True)
    files = sorted(src.glob("*.png"))
    if not files:
        sys.exit(f"no PNG files in {src}")
    for f in files:
        mark(f, dst / f.name)
    print(f"marked {len(files)} pictures into {dst}")


if __name__ == "__main__":
    main()
