# /// script
# requires-python = ">=3.10"
# dependencies = ["markdown"]
# ///
"""Build the PDFs of the project documents: docs/user-manual.pdf (from docs/user-manual.md and the screenshots in docs/manual/img/)
and docs/how-it-works.pdf (from docs/how-it-works.md, with its own drawn diagrams).

SI-GENERATED CODE: written by Claude Sonnet 5.5 (Anthropic) through Claude Code on 2026-11-15. See docs/si-log.md.

    uv run --script implementation/scripts/build_manual.py            # builds both
    uv run --script implementation/scripts/build_manual.py how-it-works   # builds one: user-manual or how-it-works

The Markdown file is the source; the PDF is generated from it, so rebuild after every edit. Python-Markdown turns the text into
HTML and headless Chrome (google-chrome or chromium on the PATH) prints it to A4 pages.

Layout, so that it reads like a manual and not like one long scroll: a cover page; a contents page with page numbers; each Part
and each numbered section (1.1, 1.2, ...) starts on a new page; a heading is never left alone at the bottom of a page; a figure stays
with its caption. The page numbers in the contents come from a first print: the script reads the text of every page with
`pdftotext` (poppler) and prints a second time with the numbers filled in. Without `pdftotext` the contents list has no page numbers.
"""
from __future__ import annotations

import html
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import markdown

DOCS = Path(__file__).resolve().parents[2] / "docs"
NAMES = ("user-manual", "how-it-works")  # each has a Markdown source and a PDF of the same name in docs/

CSS = """
@page { size: A4; margin: 17mm 16mm 19mm 16mm; @bottom-center { content: counter(page) " / " counter(pages); font: 8pt sans-serif; color: #666; } }
@page :first { margin: 0; @bottom-center { content: none; } }
* { box-sizing: border-box; }
body { margin: 0; font: 10.5pt/1.55 -apple-system, "Segoe UI", "Helvetica Neue", Arial, "Noto Sans", sans-serif; color: #1b1b1f; }

/* cover */
.cover { height: 296mm; overflow: hidden; padding: 38mm 24mm 24mm 24mm; background: #101218; color: #f3f3f6; break-after: page; }
.cover h1 { font-size: 46pt; line-height: 1.05; margin: 0 0 8pt; letter-spacing: -.03em; color: #fff; border: 0; }
.cover p { color: #c9ccd6; }
.cover p strong { color: #fff; }
.cover > p:nth-of-type(1) { font-size: 17pt; color: #8db4ff; margin: 0 0 24pt; }
.cover > p:nth-of-type(2) { font-size: 15pt; font-style: italic; color: #fff; margin: 0 0 22pt; }
.cover ul { padding-left: 18pt; }
.cover li { margin: 5pt 0; color: #c9ccd6; }
.cover a { color: #8db4ff; }
.cover code { background: rgba(255,255,255,.12); color: #e9ecf5; }
.cover p > em:only-child { display: inline; font-size: inherit; color: inherit; margin: 0; }

/* contents */
.toc { break-after: page; }
.toc h1 { font-size: 24pt; border: 0; margin: 0 0 14pt; }
.toc ol { list-style: none; padding: 0; margin: 0; }
.toc li { display: flex; align-items: baseline; gap: 6pt; margin: 4pt 0; }
.toc li .dots { flex: 1; border-bottom: 1px dotted #9a9aa4; transform: translateY(-3pt); }
body.large { font-size: 12pt; line-height: 1.65; }
body.large table { font-size: 10.8pt; break-inside: avoid; }
body.large .fig svg { width: 84%; margin: 0 auto; }
body.large p { margin: 5pt 0; }
body.large h3 { font-size: 13.5pt; }
body.large code { font-size: 10pt; }
.fig { break-inside: avoid; margin: 10pt 0 2pt; }
.fig svg { width: 100%; height: auto; display: block; border: 1px solid #d0d0d6; border-radius: 6px; background: #fff; }
.toc li.part { margin-top: 14pt; font-weight: 700; font-size: 11.5pt; }
.toc li.sec { padding-left: 16pt; }
.toc a { color: #1b1b1f; text-decoration: none; }

/* body: every Part and every numbered section starts on a new page */
h1 { font-size: 24pt; margin: 0 0 8pt; letter-spacing: -.02em; break-before: page; break-after: avoid; padding-bottom: 6pt; border-bottom: 3px solid #3b82f6; }
h2 { font-size: 16pt; margin: 0 0 8pt; padding-bottom: 4pt; border-bottom: 1.5px solid #3b82f6; break-before: page; break-after: avoid; }
h1 + h2 { break-before: auto; margin-top: 14pt; }
h3 { font-size: 12pt; margin: 16pt 0 4pt; break-after: avoid; }
h4 { break-after: avoid; }
p, li { margin: 4pt 0; orphans: 3; widows: 3; }
hr { display: none; }
table { border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 9.5pt; }
th, td { border: 1px solid #c9c9d0; padding: 3.5pt 7pt; vertical-align: top; text-align: left; }
th { background: #eef2fb; }
tr { break-inside: avoid; }
code { font: 8.8pt/1.4 "DejaVu Sans Mono", Menlo, Consolas, monospace; background: #f1f1f4; padding: 0 3pt; border-radius: 3px; }
pre { background: #f6f6f8; border: 1px solid #dcdce2; border-radius: 4px; padding: 6pt 8pt; overflow: hidden; break-inside: avoid; }
pre code { background: none; padding: 0; font-size: 7.6pt; white-space: pre-wrap; word-break: break-all; }
img { display: block; max-width: 86%; max-height: 100mm; margin: 8pt auto 2pt; border: 1px solid #d0d0d6; border-radius: 4px; }
p:has(> img) { break-after: avoid; break-inside: avoid; margin-bottom: 0; }
p > em:only-child { display: block; text-align: center; font-size: 8.8pt; color: #55555d; margin-bottom: 10pt; break-before: avoid; }
a { color: #1d4ed8; text-decoration: none; }
blockquote { margin: 6pt 0; padding: 2pt 10pt; border-left: 3px solid #3b82f6; background: #f4f7fe; }
"""


def chrome() -> str:
    for name in ("google-chrome", "chromium", "chromium-browser", "chrome"):
        p = shutil.which(name)
        if p:
            return p
    sys.exit("Chrome or Chromium is needed to print the PDF (google-chrome, chromium) and was not found on the PATH")


def build_html(cover_md: str, body_md: str, pages: dict[str, int] | None, title: str, large: bool = False) -> tuple[str, list[tuple[int, str, str]]]:
    md = markdown.Markdown(extensions=["tables", "fenced_code", "sane_lists", "toc"])
    cover = md.convert(cover_md)
    md.reset()
    body = md.convert(body_md)
    heads: list[tuple[int, str, str]] = []  # (level, text, id) of the Parts and the numbered sections
    for tok in md.toc_tokens:
        heads.append((1, tok["name"], tok["id"]))
        heads += [(2, c["name"], c["id"]) for c in tok.get("children", [])]
    rows = []
    for level, text, hid in heads:
        pg = f'<span class="pg">{pages[text]}</span>' if pages and text in pages else ""
        rows.append(f'<li class="{"part" if level == 1 else "sec"}"><a href="#{hid}">{html.escape(html.unescape(text))}</a><span class="dots"></span>{pg}</li>')
    toc = f'<section class="toc"><h1 style="break-before:auto">Contents</h1><ol>{"".join(rows)}</ol></section>'
    page = (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{html.escape(title)}</title>'
            f'<base href="{DOCS.as_uri()}/"><style>{CSS}</style></head><body class="{'large' if large else ''}"><section class="cover">{cover}</section>{toc}{body}</body></html>')
    return page, heads


def print_pdf(page: str, out: Path) -> None:
    with tempfile.TemporaryDirectory() as td:
        f = Path(td) / "manual.html"
        f.write_text(page, encoding="utf-8")
        cmd = [chrome(), "--headless=new", "--disable-gpu", "--no-sandbox", "--no-pdf-header-footer", f"--print-to-pdf={out}", f.as_uri()]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if not out.exists() or out.stat().st_size < 10_000:
        sys.exit(f"the PDF was not written: {r.stderr.strip()[:300]}")


def page_numbers(pdf: Path, heads: list[tuple[int, str, str]]) -> dict[str, int] | None:
    """The page on which each heading is printed (first page after the contents that holds its text)."""
    if not shutil.which("pdftotext"):
        return None
    txt = subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, text=True, timeout=120).stdout
    pages = txt.split("\f")
    norm = lambda s: re.sub(r"\s+", " ", s).strip()  # noqa: E731
    out: dict[str, int] = {}
    toc_page = next((i for i, pg in enumerate(pages, start=1) if norm(pg).startswith("Contents")), 2)  # the contents page itself is skipped
    for _, text, _ in heads:
        want = norm(html.unescape(text))
        for i, pg in enumerate(pages, start=1):
            if i <= toc_page:
                continue
            if want in norm(pg):
                out[text] = i
                break
    return out


def build(name: str) -> None:
    src, out = DOCS / f"{name}.md", DOCS / f"{name}.pdf"
    if not src.exists():
        sys.exit(f"{src} not found")
    text = src.read_text(encoding="utf-8")
    cut = re.search(r"^# Part 1\.", text, re.M).start()
    cover_md, body_md = text[:cut].rstrip().rstrip("-").rstrip(), text[cut:]
    title = re.match(r"# (.+)", text).group(1)
    large = name == "how-it-works"  # the plain-language booklet is set in a larger type
    page, heads = build_html(cover_md, body_md, None, title, large)
    print_pdf(page, out)
    nums = page_numbers(out, heads)
    if nums:
        page, _ = build_html(cover_md, body_md, nums, title, large)
        print_pdf(page, out)
    missing = [t for _, t, _ in heads if nums is not None and t not in nums]
    if missing:
        print("warning: heading not found in the PDF text:", ", ".join(missing))
    print(f"wrote {out} ({out.stat().st_size / 1024:.0f} KB)")


def main() -> None:
    names = sys.argv[1:] or list(NAMES)
    bad = [n for n in names if n not in NAMES]
    if bad:
        sys.exit(f"unknown document {bad[0]!r}; choose from: {', '.join(NAMES)}")
    for n in names:
        build(n)


if __name__ == "__main__":
    main()
