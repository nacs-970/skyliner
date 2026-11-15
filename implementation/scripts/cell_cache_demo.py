# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "astropy"]
# ///
"""Demo: lossy, cell-based delta cache for SPHEREx cutouts.

SI-GENERATED CODE: written by Claude Sonnet 5.5 (Anthropic) through Claude Code
on 2026-11-14, from the team's design idea (check every image cell by cell,
store only cells that changed, as a delta against the cell's last stored value).
See docs/si-log.md.

Idea
----
Cutouts of one sky patch are put on one common pixel grid and cut into square
cells. The first frame is stored in full (every cell is "updated" against an
empty reference). For each later frame, a cell is compared with the value last
stored for that cell. If the difference is consistent with measurement noise,
the cell is NOT stored (the old value is reused). Otherwise the difference is
quantized to a fraction of the noise and stored. Everything is entropy-coded
with LZMA (standard library). The store is an append-only log, so new frames
can be added later without rewriting old ones.

Loss, stated plainly
--------------------
- Updated cells: error is at most half a quantization step (default q=0.5
  noise sigma, so at most 0.25 sigma).
- Skipped cells: the stored value differs from the frame by a noise-sized amount
  (that frame's independent noise is dropped), unless it looks like a real change.
- A per-frame constant background level is stored separately and removed first.
- FLAGS, ZODI and the PSF table are NOT kept. Do not use this store for science
  measurements; it is for display and quick-look blinking.
- Frames at the same time differ in wavelength band, so many cells legitimately
  change from frame to frame. The savings on real data are reported, not assumed.

Usage (run from anywhere; data goes to implementation/data/cache/cell_demo/)
    uv run --script cell_cache_demo.py fetch --n 24
    uv run --script cell_cache_demo.py demo
    uv run --script cell_cache_demo.py view    # writes viewer.html (original vs stored vs difference)
    uv run --script cell_cache_demo.py fetch --detector D6 --full    # every image of a detector, all windows (--full also for demo, view, export)
    uv run --script cell_cache_demo.py export --detector D6 --full   # sky.data.js for implementation/web/drafts/v1-studio-real.html

Any position (default WISE 0855; folders are keyed by position, size and collection, and reused within 30 arcsec):
    uv run --script cell_cache_demo.py resolve "Barnard's star"      # SIMBAD (only the name is sent), proper motion applied
    uv run --script cell_cache_demo.py probe --target "Barnard's star"   # images per collection and detector, no cutouts
    uv run --script cell_cache_demo.py fetch --target "Barnard's star" --detector D6 --full    # or --ra DEG --dec DEG --name LABEL
    uv run --script cell_cache_demo.py update --target "Barnard's star"   # fetch only new or reprocessed images, then re-export
    uv run --script cell_cache_demo.py collections                    # image collections the service offers now
"""

from __future__ import annotations

import argparse
import io
import json
import lzma
import struct
import sys
import threading
import time
import urllib.request
import warnings
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1] / "data" / "cache" / "cell_demo"
UA = "sphereX-cache-demo/0.1"  # generic client name, no personal info

# --- config: one place for service names (collection names change per release) ---
SIA_URL = "https://irsa.ipac.caltech.edu/SIA"
TAP_URL = "https://irsa.ipac.caltech.edu/TAP/sync"
SIMBAD_TAP = "https://simbad.harvard.edu/simbad/sim-tap/sync"  # Harvard mirror of SIMBAD (the Strasbourg server answered HTTP 404 on 14 Nov)
COLLECTION = "spherex_dr1"
IMAGE_COLLECTION = r"spherex_(dr|qr)\d+"  # level 2 image collections; cube, deep and cal collections are other products
KNOWN = {"wise 0855": {"name": "WISE 0855", "ra": 133.795129, "dec": -7.245147, "note": "position listed by NASA in the challenge text"}}
REUSE_ARCSEC = 30.0  # a cached sky patch is reused when the requested position is this close to its centre
CUTOUT_DEG = 0.2  # cutout size in degrees (about 117 pixels of 6.15 arcsec)
MAX_PARALLEL = 3  # be polite to IRSA
RESOLVE_RADIUS = 0.05  # degrees: search circle used by `resolve` to find the observing epoch (larger circles time out at IRSA)
IBE_BASE = "https://irsa.ipac.caltech.edu/ibe/data/spherex/"  # where the SIA2 access_url points
S3_BASE = "https://nasa-irsa-spherex.s3.amazonaws.com/"  # the same files in the public bucket (allows HTTP range requests)
VIA = "s3"  # how a region of a frame is fetched: "s3" (range reads, the cutout service as fallback) or "cutout" (IRSA cutout service only)

CELL = 12  # cell edge in pixels
MARGIN = 4  # pixels cropped from the first frame to form the common grid
Q = 0.5  # quantization step, in units of the frame's median noise sigma
T_CHI = 1.3  # update a cell if rms(diff / expected diff sigma) exceeds this
MIN_COVER = 0.8  # drop a frame if less than this fraction of the grid has data (edge cutouts)
T_MAX = 5.0  # ... or if any pixel differs by more than this many sigma


# ---------------------------------------------------------------- target ---
# One folder per sky patch, named by the rounded centre, the cutout size and the collection (never by the free-text
# name), so the same patch is found again from any spelling of the request:
#   cell_demo/ra133.7951_dec-7.2451_s0.2_spherex_dr1/<D>_full/raw/<obs_id>_<D>.npz   (raw cutouts, one file per image)
#   cell_demo/<patch>/target.json     centre, size, collection, name   (the manifest of the patch)
#   cell_demo/<patch>/<D>_full/store.cellcache + store.params.json     (the lossy store and the settings it was built with)
TARGET = dict(KNOWN["wise 0855"])  # the requested position: where the marker goes
CENTER = {"ra": TARGET["ra"], "dec": TARGET["dec"]}  # centre of the cached patch: cutouts and grid are centred here
SIZE_DEG = CUTOUT_DEG
CACHE = ROOT
RAW = ROOT / "D1" / "raw"  # set per detector by use_detector()
STORE = ROOT / "D1" / "store.cellcache"
VIEWER = ROOT / "D1" / "viewer.html"


def patch_key(ra: float, dec: float, size: float, collection: str) -> str:
    return f"ra{ra:.4f}_dec{dec:+.4f}_s{size:g}_{collection}".replace("+", "")


def sep_arcsec(ra1, dec1, ra2, dec2) -> float:
    d = np.radians
    c = np.sin(d(dec1)) * np.sin(d(dec2)) + np.cos(d(dec1)) * np.cos(d(dec2)) * np.cos(d(ra1 - ra2))
    return float(np.degrees(np.arccos(np.clip(c, -1, 1))) * 3600)


def find_patch(ra: float, dec: float, size: float, collection: str):
    """A cached patch of the same collection and size whose centre is within REUSE_ARCSEC of the position."""
    best = None
    for f in ROOT.glob("*/target.json"):
        m = json.loads(f.read_text())
        if m["collection"] != collection or abs(m["size_deg"] - size) > 1e-9:
            continue
        s = sep_arcsec(ra, dec, m["ra"], m["dec"])
        if s <= REUSE_ARCSEC and (best is None or s < best[0]):
            best = (s, f.parent, m)
    return best


def use_target(name: str, ra: float, dec: float, size: float = CUTOUT_DEG, collection: str = COLLECTION, note: str = "") -> None:
    """Choose the patch for a request: reuse a cached one within REUSE_ARCSEC, else start a new one."""
    global TARGET, CENTER, SIZE_DEG, CACHE, COLLECTION
    COLLECTION, SIZE_DEG = collection, size
    TARGET = {"name": name, "ra": ra, "dec": dec, "note": note}
    hit = find_patch(ra, dec, size, collection)
    if hit:
        s, CACHE, m = hit
        CENTER = {"ra": m["ra"], "dec": m["dec"]}
        print(f"cache: reusing patch {CACHE.name} ({s:.1f} arcsec from the request, limit {REUSE_ARCSEC:.0f})")
    else:
        CENTER = {"ra": ra, "dec": dec}
        CACHE = ROOT / patch_key(ra, dec, size, collection)
        CACHE.mkdir(parents=True, exist_ok=True)
        (CACHE / "target.json").write_text(json.dumps(
            {"name": name, "ra": ra, "dec": dec, "note": note, "size_deg": size, "collection": collection,
             "created": time.strftime("%Y-%m-%d")}, indent=1) + "\n")
        print(f"cache: new patch {CACHE.name}")


def use_detector(det: str, full: bool = False) -> None:
    """Each detector (wavelength range) gets its own folder: raw cutouts, store and viewer.
    With full=True the folder is <det>_full: every image of the detector, not one window."""
    global RAW, STORE, VIEWER
    d = CACHE / (det + "_full" if full else det)
    RAW, STORE, VIEWER = d / "raw", d / "store.cellcache", d / "viewer.html"


def raw_name(row: dict) -> str:
    """One raw file per image, keyed by obs_id and detector (never by a row index), so new releases cannot clash."""
    return f"{row['obs_id']}_{row['band'].replace('SPHEREx-', '')}.npz"


def version_of(url: str) -> str:
    """Processing version, as it appears in the file URL (for example l2b-v27-2026-197)."""
    import re

    m = re.search(r"/(l2[a-z]*-v[^/]+)/", url)
    return m.group(1) if m else ""


def store_params() -> dict:
    return {"Q": Q, "T_CHI": T_CHI, "T_MAX": T_MAX, "CELL": CELL, "MARGIN": MARGIN, "format": 1}


# ------------------------------------------------------------- name lookup ---
def known_file() -> Path:
    return ROOT / "known_targets.json"


def load_known() -> dict:
    d = {k: dict(v) for k, v in KNOWN.items()}
    if known_file().exists():
        d.update(json.loads(known_file().read_text()))
    return d


def simbad_lookup(name: str) -> dict:
    """Position and proper motion of a name from SIMBAD. Only the name is sent. Coordinates are ICRS at epoch J2000."""
    import csv
    import urllib.parse

    q = ("SELECT main_id, ra, dec, pmra, pmdec, plx_value FROM basic JOIN ident ON oid=oidref "
         f"WHERE id = '{name.replace(chr(39), chr(39) * 2)}'")
    url = SIMBAD_TAP + "?" + urllib.parse.urlencode({"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "csv", "QUERY": q})
    rows = list(csv.DictReader(io.StringIO(http_get(url, tries=3).decode())))
    if not rows:
        sys.exit(f"SIMBAD has no object with the identifier {name!r} (try the main identifier, for example '* eps Ind B' or 'V* R Dra')")
    r = rows[0]
    return {"name": name, "simbad_id": r["main_id"], "ra_j2000": float(r["ra"]), "dec_j2000": float(r["dec"]),
            "pmra_masyr": float(r["pmra"] or 0), "pmdec_masyr": float(r["pmdec"] or 0), "plx_mas": float(r["plx_value"] or 0)}


def epoch_position(k: dict, mjd: float) -> tuple[float, float]:
    """J2000 position moved to the given MJD with the proper motion (parallax and radial motion ignored: far below one pixel)."""
    yrs = (mjd - 51544.5) / 365.25
    dec = k["dec_j2000"] + k["pmdec_masyr"] * yrs / 3.6e6
    ra = k["ra_j2000"] + k["pmra_masyr"] * yrs / 3.6e6 / np.cos(np.radians(k["dec_j2000"]))  # SIMBAD pmra already includes cos(dec)
    return float(ra), float(dec)


def resolve_request(name: str | None, ra: float | None, dec: float | None) -> tuple[str, float, float, str]:
    """A position (and a note on where it comes from) from --target NAME (known list, then the saved SIMBAD lookups) or --ra and --dec."""
    if ra is not None and dec is not None:
        return name or f"RA {ra:.4f} Dec {dec:+.4f}", ra, dec, "the position you entered"
    if not name:
        return TARGET["name"], TARGET["ra"], TARGET["dec"], TARGET["note"]
    k = load_known().get(name.lower())
    if not k:
        sys.exit(f"unknown target {name!r}: run `resolve {name!r}` first (asks SIMBAD, sends only the name), or give --ra and --dec")
    # for a moving target `resolve` already moved it to the observing epoch; entries saved before the note existed get a generic one
    return k["name"], k["ra"], k["dec"], k.get("note") or ("SIMBAD position at the observing epoch" if "simbad_id" in k else "saved position")


# ----------------------------------------------------------------- fetch ---
def http_get(url: str, tries: int = 10) -> bytes:
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=180) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001 - retry any network error
            if i == tries - 1:
                raise
            print(f"  retry after error: {e}", file=sys.stderr)
            time.sleep(min(5 * (i + 1), 30))  # 5, 10, 15, 20, 25, 30 s ... (was 10, 40, 90, 160, 240 s: IRSA answers 503 within a second)
    raise RuntimeError("unreachable")


def sia_rows(ra: float | None = None, dec: float | None = None, radius: float = 0.02, collection: str | None = None) -> list[dict]:
    """One row per image that covers the position (default: the centre of the current patch)."""
    from astropy.io.votable import parse

    ra = CENTER["ra"] if ra is None else ra
    dec = CENTER["dec"] if dec is None else dec
    q = (
        f"{SIA_URL}?POS=CIRCLE+{ra}+{dec}+{radius}"
        f"&COLLECTION={collection or COLLECTION}&MAXREC=1000"
    )
    t = parse(io.BytesIO(http_get(q))).get_first_table().to_table(use_names_over_ids=True)
    rows = [
        {
            "obs_id": str(r["obs_id"]),
            "band": str(r["energy_bandpassname"]),
            "t_min": float(r["t_min"]),
            "url": str(r["access_url"]),
        }
        for r in t
    ]
    if len({(r["obs_id"], r["band"]) for r in rows}) != len(rows):  # the same image twice: keep one
        seen, uniq = set(), []
        for r in rows:
            if (r["obs_id"], r["band"]) not in seen:
                seen.add((r["obs_id"], r["band"]))
                uniq.append(r)
        rows = uniq
    rows.sort(key=lambda r: r["t_min"])
    return rows


def fetch_one(args: tuple[int, dict]) -> str:
    from astropy.io import fits
    from astropy.wcs import WCS

    i, row = args
    out = RAW / raw_name(row)
    if out.exists():
        old = json.loads(str(np.load(out)["meta"]))
        if version_of(old.get("url", "")) == version_of(row["url"]):
            return f"{i:03d} cached"
        print(f"  {out.name}: new processing version {version_of(row['url'])} (had {version_of(old.get('url', ''))}), fetching again")
    url = f"{row['url']}?center={CENTER['ra']},{CENTER['dec']}&size={SIZE_DEG}"
    blob = http_get(url)
    with fits.open(io.BytesIO(blob)) as h:
        img = np.asarray(h["IMAGE"].data, dtype=np.float32)
        var = np.asarray(h["VARIANCE"].data, dtype=np.float32)
        hdr = h["IMAGE"].header.tostring(sep="\n")
        # wavelength at the target pixel, from the WCS-WAVE lookup table (the filter varies across the detector)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            tx, ty = WCS(h["IMAGE"].header).all_world2pix(CENTER["ra"], CENTER["dec"], 0)
            cen, bw = WCS(h["IMAGE"].header, h, key="W", fix=False).pixel_to_world(float(tx), float(ty))
        row = {**row, "wave_um": float(cen.to("um").value), "bw_um": float(bw.to("um").value)}
    RAW.mkdir(parents=True, exist_ok=True)
    np.savez(out, img=img, var=var, hdr=np.array(hdr), meta=np.array(json.dumps({**row, "fits_bytes": len(blob)})))
    return f"{i:03d} {row['band']} {len(blob) / 1e6:.1f} MB downloaded, kept {img.nbytes * 2 / 1e3:.0f} KB"


# -------------------------------------------------- range-read route (S3) ---
# Added 14-15 Nov 2026 with SI assistance (Claude Sonnet 5.5; see docs/si-log.md). The team allowed range reads on 14 Nov.
# The public bucket holds the same uncompressed FITS files as the IRSA file server, so one region of a frame can be read with
# a few HTTP range requests: the headers, then whole rows of IMAGE and VARIANCE (about 1 MB each for 117 rows), then the small
# WCS-WAVE table. No full frame is downloaded. Checked 15 Nov against the cutout service on one frame: IMAGE and VARIANCE
# pixels identical, wavelength identical (see research/challenge-12/README.md).
class NoOverlap(Exception):
    """The position is outside the frame (the cutout service answers HTTP 422 'Arrays do not overlap')."""


def s3_url(access_url: str) -> str:
    if not access_url.startswith(IBE_BASE):
        raise ValueError(f"unexpected file URL {access_url}")
    return S3_BASE + access_url[len(IBE_BASE):]


def range_get(url: str, a: int, b: int, got: list, tries: int = 8) -> tuple[bytes, int]:
    """Bytes a to b (inclusive) of a file, and the file size. got[0] counts the bytes read."""
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Range": f"bytes={a}-{b}"})
            with urllib.request.urlopen(req, timeout=120) as r:
                if r.status != 206:
                    raise RuntimeError(f"HTTP {r.status}, not a range answer")
                data, total = r.read(), int(r.headers["Content-Range"].split("/")[1])
            got[0] += len(data)
            return data, total
        except Exception:  # retry any network error
            if i == tries - 1:
                raise
            time.sleep(min(2 * (i + 1), 20))
    raise RuntimeError("unreachable")


def fits_layout(url: str, got: list) -> tuple[list[dict], int]:
    """Walk the FITS file extension by extension (header blocks only) to find where each data block starts."""
    from astropy.io import fits

    hdus, off, total = [], 0, None
    while total is None or off < total:
        buf = b""
        while True:  # read 8 header blocks at a time until the END card shows up
            chunk, total = range_get(url, off + len(buf), off + len(buf) + 8 * 2880 - 1, got)
            buf += chunk
            end = next((i for i in range(0, len(buf), 80) if buf[i : i + 8] == b"END     "), None)
            if end is not None:
                break
            if not chunk:
                raise RuntimeError("no END card in the header")
        hb = buf[: -(-(end + 80) // 2880) * 2880]
        h = fits.Header.fromstring(hb.decode("latin-1"))
        shape = [h[f"NAXIS{i}"] for i in range(1, h["NAXIS"] + 1)]
        nbytes = (abs(h["BITPIX"]) // 8) * (int(np.prod(shape)) if shape else 0) + h.get("PCOUNT", 0)
        hdus.append({"name": h.get("EXTNAME", "PRIMARY"), "hdr": h, "hdr_bytes": hb, "data_off": off + len(hb), "nbytes": nbytes})
        off += len(hb) + -(-nbytes // 2880) * 2880
    return hdus, total


def fetch_one_s3(args: tuple[int, dict]) -> str:
    from astropy import log
    from astropy.io import fits
    from astropy.wcs import WCS
    from astropy.wcs.utils import proj_plane_pixel_scales

    log.setLevel("WARNING")  # astropy prints a long INFO note about the SIP keywords for every file
    i, row = args
    out = RAW / raw_name(row)
    if out.exists():
        old = json.loads(str(np.load(out)["meta"]))
        if version_of(old.get("url", "")) == version_of(row["url"]):
            return f"{i:03d} cached"
        print(f"  {out.name}: new processing version {version_of(row['url'])} (had {version_of(old.get('url', ''))}), fetching again")
    url, got = s3_url(row["url"]), [0]
    hdus, _ = fits_layout(url, got)
    by = {h["name"]: h for h in hdus}
    ih = by["IMAGE"]["hdr"]
    if ih["BITPIX"] != -32 or "BSCALE" in ih or "BZERO" in ih:
        raise RuntimeError("IMAGE is not plain float32: the range reader does not handle it")
    ny, nx = ih["NAXIS2"], ih["NAXIS1"]
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        wcs = WCS(ih)
    tx, ty = (float(v) for v in wcs.all_world2pix(CENTER["ra"], CENTER["dec"], 0))
    n = round(SIZE_DEG * 3600 / (float(np.mean(proj_plane_pixel_scales(wcs))) * 3600))
    x0, y0 = int(np.ceil(tx - n / 2)), int(np.ceil(ty - n / 2))  # the rounding the cutout service uses (checked on one frame)
    x1, y1 = min(nx, x0 + n), min(ny, y0 + n)
    x0, y0 = max(0, x0), max(0, y0)
    if x1 <= x0 or y1 <= y0:
        raise NoOverlap(f"{row['obs_id']} {row['band']}: the position is outside the frame")
    planes = {}
    for name in ("IMAGE", "VARIANCE"):  # whole rows are contiguous: one request per plane, then crop the columns
        a = by[name]["data_off"] + y0 * nx * 4
        raw, _ = range_get(url, a, a + (y1 - y0) * nx * 4 - 1, got)
        planes[name] = np.frombuffer(raw, ">f4").reshape(y1 - y0, nx)[:, x0:x1].astype(np.float32)
    w = by["WCS-WAVE"]
    wraw, _ = range_get(url, w["data_off"], w["data_off"] + -(-w["nbytes"] // 2880) * 2880 - 1, got)
    mini = fits.open(io.BytesIO(by["PRIMARY"]["hdr_bytes"] + w["hdr_bytes"] + wraw))
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        cen, bw = WCS(ih, mini, key="W", fix=False).pixel_to_world(tx, ty)
    # the header of the cut-out: the same sky mapping, with the pixel origin moved to the crop corner
    ch = ih.copy()
    ch["NAXIS1"], ch["NAXIS2"] = x1 - x0, y1 - y0
    ch["CRPIX1"], ch["CRPIX2"] = ih["CRPIX1"] - x0, ih["CRPIX2"] - y0
    row = {**row, "wave_um": float(cen.to("um").value), "bw_um": float(bw.to("um").value)}
    RAW.mkdir(parents=True, exist_ok=True)
    np.savez(out, img=planes["IMAGE"], var=planes["VARIANCE"], hdr=np.array(ch.tostring(sep="\n")),
             meta=np.array(json.dumps({**row, "fits_bytes": got[0], "via": "s3"})))
    return f"{i:03d} {row['band']} {got[0] / 1e6:.1f} MB read by range requests, kept {planes['IMAGE'].nbytes * 2 / 1e3:.0f} KB"


def fetch_row(args: tuple[int, dict]) -> str:
    """One image: by range reads (default), or by the cutout service. A failed range read falls back to the cutout service."""
    if VIA == "cutout":
        return fetch_one(args)
    try:
        return fetch_one_s3(args)
    except NoOverlap:
        raise
    except Exception as e:  # noqa: BLE001
        print(f"  {raw_name(args[1])}: range read failed ({e}); using the cutout service", file=sys.stderr)
        return fetch_one(args)


def cmd_fetch(n: int, start: int = 0, window: int | None = None, detector: str | None = "D1", full: bool = False) -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    rows = sia_rows()
    print(f"SIA2: {len(rows)} images for {TARGET['name']} in {COLLECTION}")
    if not rows:
        sys.exit(f"no {COLLECTION} images cover this position: nothing to fetch (try another collection; see `collections` and `probe`)")
    if detector:
        rows = [r for r in rows if r["band"] == f"SPHEREx-{detector}"]
        print(f"keeping detector {detector} only: {len(rows)} images")
    # observing windows: split the time-sorted list where the gap exceeds 5 days
    wins, cur = [], [0]
    for i in range(1, len(rows)):
        if rows[i]["t_min"] - rows[i - 1]["t_min"] > 5:
            wins.append(cur)
            cur = []
        cur.append(i)
    wins.append(cur)
    for j, w in enumerate(wins):
        print(f"  window {j}: {len(w)} images, MJD {rows[w[0]]['t_min']:.2f} to {rows[w[-1]]['t_min']:.2f}")
    if full:  # every image of this detector, all windows (gaps of months included)
        w, start, n = list(range(len(rows))), 0, len(rows)
    else:
        w = wins[window] if window is not None else max(wins, key=len)
    pick = np.array(w[start : start + n])
    print(f"picking {len(pick)} consecutive images (no gaps) from the window of {len(w)}, "
          f"MJD {rows[pick[0]]['t_min']:.3f} to {rows[pick[-1]]['t_min']:.3f} ({rows[pick[-1]]['t_min'] - rows[pick[0]]['t_min']:.2f} days)")
    total, done, t0, lock = len(pick), [0], time.time(), threading.Lock()
    progress_file = CACHE / "progress.json"

    def safe(a):  # one failed cutout must not stop the others; re-run fetch to retry the missing ones
        try:
            msg = fetch_row(a)
        except Exception as e:  # noqa: BLE001
            msg = f"{a[0]:03d} FAILED: {e}"
        with lock:  # progress line and progress.json (a page or a server can poll the file)
            done[0] += 1
            el = time.time() - t0
            eta = el / done[0] * (total - done[0])
            print(f"  [{done[0]}/{total}] {msg}  ({el / 60:.1f} min elapsed, about {eta / 60:.1f} min left)", flush=True)
            progress_file.write_text(json.dumps({"detector": detector, "done": done[0], "total": total,
                                                 "state": "done" if done[0] == total else "fetching", "updated": time.strftime("%Y-%m-%dT%H:%M:%S")}))
        return msg

    with ThreadPoolExecutor(2 if full else MAX_PARALLEL) as ex:
        msgs = list(ex.map(safe, [(int(k), rows[int(k)]) for k in pick]))
    bad = [m for m in msgs if "FAILED" in m]
    if bad:
        print(f"{len(bad)} cutouts missing: run the same fetch command again to retry them")


# ------------------------------------------------------------- resample ---
def load_raw():
    from astropy.io import fits
    from astropy.wcs import WCS

    frames = []
    for p in sorted(RAW.glob("*.npz")):
        z = np.load(p)
        hdr = fits.Header.fromstring(str(z["hdr"]), sep="\n")
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            wcs = WCS(hdr)
        frames.append({"img": z["img"], "var": z["var"], "wcs": wcs, "meta": json.loads(str(z["meta"]))})
    frames.sort(key=lambda f: f["meta"]["t_min"])
    return frames


def bilinear(a: np.ndarray, x: np.ndarray, y: np.ndarray) -> np.ndarray:
    h, w = a.shape
    x0 = np.floor(x).astype(int)
    y0 = np.floor(y).astype(int)
    fx = x - x0
    fy = y - y0
    ok = (x0 >= 0) & (y0 >= 0) & (x0 + 1 < w) & (y0 + 1 < h)
    x0c = np.clip(x0, 0, w - 2)
    y0c = np.clip(y0, 0, h - 2)
    v = (
        a[y0c, x0c] * (1 - fx) * (1 - fy)
        + a[y0c, x0c + 1] * fx * (1 - fy)
        + a[y0c + 1, x0c] * (1 - fx) * fy
        + a[y0c + 1, x0c + 1] * fx * fy
    )
    return np.where(ok, v, np.nan)


def to_common_grid(frames, min_cover: float = MIN_COVER):
    """Resample every frame onto the first frame's pixel grid (cropped to whole cells)."""
    from astropy.wcs import WCS

    ref = max(frames, key=lambda f: f["img"].size)  # the earliest of the largest cutouts: one cut short by a detector edge must not size the grid
    h, w = ref["img"].shape
    gh = ((h - 2 * MARGIN) // CELL) * CELL
    gw = ((w - 2 * MARGIN) // CELL) * CELL
    # one sky grid for all frames: centred exactly on the patch centre, orientation and pixel size of the first frame
    gwcs = WCS(naxis=2)
    gwcs.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    gwcs.wcs.crval = [CENTER["ra"], CENTER["dec"]]
    gwcs.wcs.crpix = [(gw + 1) / 2, (gh + 1) / 2]
    gwcs.wcs.cd = ref["wcs"].pixel_scale_matrix
    yy, xx = np.mgrid[0:gh, 0:gw].astype(float)
    ra, dec = gwcs.all_pix2world(xx, yy, 0)
    out, dropped = [], 0
    for f in frames:
        px, py = f["wcs"].all_world2pix(ra, dec, 0)
        img = bilinear(f["img"], px, py)
        var = bilinear(f["var"], px, py)
        bad = ~np.isfinite(img) | ~np.isfinite(var) | (var <= 0)
        if 1 - bad.mean() < min_cover:  # too little of the grid has data: drop this frame
            dropped += 1
            continue
        med = float(np.median(img[~bad]))
        sig = np.sqrt(np.where(bad, np.nan, var))
        sig_med = float(np.nanmedian(sig))
        img = np.where(bad, med, img)
        sig = np.where(bad, sig_med, sig).astype(np.float32)
        out.append({"img": img.astype(np.float32), "sig": sig, "valid": ~bad, "meta": f["meta"]})
    return out, dropped, (gh, gw), gwcs


# ---------------------------------------------------------------- codec ---
def pack_record(meta: dict, payload: bytes) -> bytes:
    head = json.dumps(meta, separators=(",", ":")).encode() + b"\n"
    blob = lzma.compress(head + payload, preset=6)
    return struct.pack("<I", len(blob)) + blob


def read_records(path: Path):
    data = path.read_bytes()
    pos = 0
    while pos < len(data):
        (n,) = struct.unpack_from("<I", data, pos)
        raw = lzma.decompress(data[pos + 4 : pos + 4 + n])
        head, payload = raw.split(b"\n", 1)
        yield json.loads(head), payload
        pos += 4 + n


def cells_view(a: np.ndarray) -> np.ndarray:
    """(H, W) -> (ny, nx, CELL, CELL) view."""
    h, w = a.shape
    return a.reshape(h // CELL, CELL, w // CELL, CELL).swapaxes(1, 2)


class State:
    """The decoder state: last stored value of every pixel (background removed)."""

    def __init__(self, shape):
        self.shape = shape
        self.ref = np.zeros(shape, np.float32)

    def apply(self, meta: dict, payload: bytes) -> np.ndarray:
        ny, nx = self.shape[0] // CELL, self.shape[1] // CELL
        nbits = ny * nx
        nbytes = (nbits + 7) // 8
        upd = np.unpackbits(np.frombuffer(payload[:nbytes], np.uint8))[:nbits].reshape(ny, nx).astype(bool)
        dt = {"i1": np.int8, "i2": np.int16, "i4": np.int32}[meta["dtype"]]
        deltas = np.frombuffer(payload[nbytes:], dt).reshape(-1, CELL, CELL)
        step = np.float32(meta["step"])
        rv = cells_view(self.ref)  # view into self.ref
        rv[upd] = rv[upd] + deltas.astype(np.float32) * step
        meta["_upd"] = upd
        return self.ref + np.float32(meta["offset"])


def encode_frame(state: State, f: dict, first: bool) -> tuple[dict, bytes]:
    img, sig, valid = f["img"], f["sig"], f["valid"]
    offset = float(np.median(img))
    x = img - np.float32(offset)
    if not first:
        x = np.where(valid, x, state.ref)  # no data here (target near a detector edge): keep the old value
    sig_med = float(np.median(sig))
    step = Q * sig_med
    ny, nx = state.shape[0] // CELL, state.shape[1] // CELL
    if first:
        upd = np.ones((ny, nx), bool)
    else:
        d = x - state.ref
        z = d / (sig * np.sqrt(2.0))  # reference noise is similar to this frame's
        zc = cells_view(z)
        chi = np.sqrt((zc**2).mean(axis=(2, 3)))
        zmax = np.abs(zc).max(axis=(2, 3))
        upd = (chi > T_CHI) | (zmax > T_MAX)
    dc = cells_view(x - state.ref)[upd]
    q = np.round(dc / step).astype(np.int32)
    peak = 0 if q.size == 0 else int(np.abs(q).max())  # bright stars need wide ints
    dtype, npdt = ("i1", np.int8) if peak < 128 else ("i2", np.int16) if peak < 32768 else ("i4", np.int32)
    q = q.astype(npdt)
    payload = np.packbits(upd.ravel()).tobytes() + q.tobytes()
    m = {k: f["meta"][k] for k in ("obs_id", "band", "t_min", "wave_um")}
    m.update(offset=offset, step=step, dtype=dtype, n_upd=int(upd.sum()), n_cells=int(upd.size),
             valid_frac=round(float(valid.mean()), 3))
    return m, payload


def encode_append(frames: list[dict], shape) -> None:
    """Append frames to the store (creating it if missing). Idempotent per obs_id."""
    params_file = STORE.with_name("store.params.json")
    if STORE.exists() and (not params_file.exists() or json.loads(params_file.read_text()) != store_params()):
        print("store was built with other settings (or none were recorded): rebuilding it")
        STORE.unlink()
    if not STORE.exists():
        STORE.parent.mkdir(parents=True, exist_ok=True)
        params_file.write_text(json.dumps(store_params()) + "\n")
    state = State(shape)
    seen = set()
    for meta, payload in read_records(STORE) if STORE.exists() else []:
        state.apply(meta, payload)
        seen.add(meta["obs_id"] + meta["band"])
    first = not seen
    with STORE.open("ab") as fh:
        for f in frames:
            key = f["meta"]["obs_id"] + f["meta"]["band"]
            if key in seen:
                continue
            m, payload = encode_frame(state, f, first)
            if first:
                m["grid_shape"] = list(shape)
            rec = pack_record(m, payload)
            state.apply(dict(m), payload)  # closed loop: reference = decoded value
            fh.write(rec)
            first = False


def decode_all(shape):
    state = State(shape)
    out = []
    for meta, payload in read_records(STORE):
        out.append((meta, state.apply(meta, payload)))
    return out


def web_store() -> bytes:
    """The cell store re-packed for the browser: the same records, not LZMA compressed (browsers cannot decompress LZMA natively),
    so the small decoder implementation/web/drafts/cellcache.js can read it synchronously. Bigger than the store, still about ten
    times smaller than the decoded float32 frames."""
    out = []
    for meta, payload in read_records(STORE):
        raw = json.dumps(meta, separators=(",", ":")).encode() + b"\n" + payload
        out.append(struct.pack("<I", len(raw)) + raw)
    return b"".join(out)


# ----------------------------------------------------------------- demo ---
def cmd_demo(min_cover: float = MIN_COVER) -> None:
    frames = load_raw()
    if not frames:
        sys.exit("no raw frames: run `fetch` first")
    grid, dropped, shape, _ = to_common_grid(frames, min_cover)
    n = len(grid)
    print(f"{len(frames)} cutouts fetched, {dropped} dropped (under {100 * min_cover:.0f}% of the grid has data), {n} used; grid {shape[0]}x{shape[1]} px, "
          f"{shape[0] // CELL}x{shape[1] // CELL} cells of {CELL}px")

    # noise check: does VARIANCE match the real scatter of frame-to-frame differences?
    ratios = []
    for a, b in zip(grid[:-1], grid[1:]):
        d = (a["img"] - np.median(a["img"])) - (b["img"] - np.median(b["img"]))
        mad = 1.4826 * np.median(np.abs(d - np.median(d)))
        ratios.append(mad / float(np.median(np.sqrt(a["sig"] ** 2 + b["sig"] ** 2))))
    print(f"noise check: robust diff scatter / sqrt(var_a+var_b): median {np.median(ratios):.2f} "
          "(1.0 means VARIANCE explains the scatter; larger means real structure or underestimated noise)")

    if STORE.exists():
        STORE.unlink()
    k = (2 * n) // 3
    t0 = time.time()
    encode_append(grid[:k], shape)
    size_a = STORE.stat().st_size
    encode_append(grid[k:], shape)  # simulates "new data arrived later"
    enc_s = time.time() - t0
    size = STORE.stat().st_size
    print(f"append test: first {k} frames -> {size_a / 1e3:.0f} KB, then +{n - k} frames -> {size / 1e3:.0f} KB")

    t0 = time.time()
    dec = decode_all(shape)
    dec_s = time.time() - t0

    errs, rows = [], []
    for (meta, rec), g in zip(dec, grid):
        truth = g["img"]
        e = ((rec - truth) / g["sig"])[g["valid"]]  # only where the frame has data
        errs.append(e)
        rows.append((meta, float(np.sqrt((e**2).mean())), float(np.abs(e).max())))
    print(f"\n{'#':>3} {'band':<11} {'wave um':>8} {'cells updated':>14} {'rms err (sigma)':>16} {'max err (sigma)':>16} {'data covered':>13}")
    for i, (m, r, mx) in enumerate(rows):
        print(f"{i:>3} {m['band']:<11} {m['wave_um']:>8.3f} {m['n_upd']:>5}/{m['n_cells']:<8} {r:>16.2f} {mx:>16.2f} {100 * m['valid_frac']:>12.0f}%")

    img_f32 = n * shape[0] * shape[1] * 4
    fits_bytes = sum(f["meta"]["fits_bytes"] for f in frames)
    lossless = len(lzma.compress(np.stack([g["img"] for g in grid]).tobytes(), preset=6))
    upd_total = sum(m["n_upd"] for m, _, _ in rows[1:])
    cells_total = sum(m["n_cells"] for m, _, _ in rows[1:])
    print("\nsizes")
    print(f"  downloaded cutout FITS (all extensions) : {fits_bytes / 1e3:>9.0f} KB")
    print(f"  IMAGE only, float32, raw                : {img_f32 / 1e3:>9.0f} KB")
    print(f"  IMAGE only, float32, LZMA (lossless)    : {lossless / 1e3:>9.0f} KB  ({img_f32 / lossless:.1f}x)")
    print(f"  cell delta store (this demo, lossy)     : {size / 1e3:>9.0f} KB  ({img_f32 / size:.1f}x vs raw float32)")
    print(f"  cells updated after frame 0             : {upd_total}/{cells_total} ({100 * upd_total / max(cells_total, 1):.0f}%)")
    all_e = np.concatenate([e.ravel() for e in errs])
    print(f"  error vs truth, all pixels              : rms {np.sqrt((all_e**2).mean()):.2f} sigma, "
          f"99th pct {np.percentile(np.abs(all_e), 99):.2f} sigma, max {np.abs(all_e).max():.2f} sigma")
    print(f"  encode {enc_s:.2f} s, decode {dec_s:.2f} s for {n} frames")

    print("\nupdated-cell maps (# = stored, . = reused), frames 1..3")
    for i, (meta, payload) in enumerate(read_records(STORE)):
        if 1 <= i <= 3:
            ny, nx = shape[0] // CELL, shape[1] // CELL
            bits = np.unpackbits(np.frombuffer(payload[: (ny * nx + 7) // 8], np.uint8))[: ny * nx].reshape(ny, nx)
            print(f" frame {i} ({meta['band']}):")
            for r in bits:
                print("   " + "".join("#" if b else "." for b in r))


def ensure_store(grid, shape):
    """Decode the store, rebuilding it first if it does not match the frames kept."""
    pf = STORE.with_name("store.params.json")
    current = pf.exists() and json.loads(pf.read_text()) == store_params()  # an old store cannot be decoded with other settings
    dec = decode_all(shape) if STORE.exists() and current else []
    if len(dec) != len(grid) or any(m["obs_id"] + m["band"] != g["meta"]["obs_id"] + g["meta"]["band"] for (m, _), g in zip(dec, grid)):
        print("store does not match the frames kept: rebuilding it")
        STORE.unlink(missing_ok=True)
        encode_append(grid, shape)
        dec = decode_all(shape)
    return dec


def sky_affine(gwcs, shape, flip_x: bool = False):
    """Linear sky mapping of the common grid (for coordinate readouts) and its error at the far corner, in arcsec.
    With flip_x the mapping is for the grid mirrored left to right (pixel x -> width-1-x)."""
    sx, sy = shape[1] - 1, shape[0] - 1
    gx = [sx, 0, sx, 0] if flip_x else [0, sx, 0, sx]
    ra_, dec_ = gwcs.all_pix2world(gx, [0, 0, sy, sy], 0)
    aff = {"ra0": float(ra_[0]), "dec0": float(dec_[0]),
           "dra_dx": float((ra_[1] - ra_[0]) / sx), "dra_dy": float((ra_[2] - ra_[0]) / sy),
           "ddec_dx": float((dec_[1] - dec_[0]) / sx), "ddec_dy": float((dec_[2] - dec_[0]) / sy)}
    pred_ra = aff["ra0"] + aff["dra_dx"] * sx + aff["dra_dy"] * sy
    pred_dec = aff["dec0"] + aff["ddec_dx"] * sx + aff["ddec_dy"] * sy
    err = 3600 * max(abs(pred_ra - ra_[3]) * np.cos(np.radians(dec_[3])), abs(pred_dec - dec_[3]))
    return aff, err


def cmd_export(min_cover: float = MIN_COVER, slim: bool = False) -> None:
    """Write sky.data.js for the web front end (implementation/web/drafts/v1-studio-real.html).

    Real pixels (original) and the same frames decoded from the lossy cell store, both float32 on the common
    grid, plus a no-data bit mask, times, wavelengths and the sky mapping. One file per detector, in the
    cache (cell_demo/). The files of the five NASA test targets, detector D6 only, are committed (see implementation/data/README.md)."""
    import base64

    frames = load_raw()
    if not frames:
        sys.exit("no raw frames: run `fetch` first")
    grid, dropped, shape, gwcs = to_common_grid(frames, min_cover)
    if not grid:
        sys.exit(f"all {len(frames)} cutouts have under {100 * min_cover:.0f}% of the grid covered: nothing to export (try a lower --min-coverage)")
    if shape[0] != shape[1] or min(shape) < 96:
        sys.exit(f"grid is {shape[1]}x{shape[0]} px; the web page needs a square grid of at least 96 px. The grid is sized from the first cutout, which here is cut short by a detector edge, so this cutout set cannot be exported until the grid is sized another way")
    dec = ensure_store(grid, shape)
    # The grid keeps the first frame's orientation, which draws the sky mirror-imaged (RA grows to the right, north up).
    # Mirror it left to right here, so the page shows the usual sky view (east to the left, north near the top).
    aff, _ = sky_affine(gwcs, shape, flip_x=True)
    tx, ty = gwcs.all_world2pix(TARGET["ra"], TARGET["dec"], 0)
    tx = (shape[1] - 1) - float(tx)
    first = sorted(RAW.glob("*.npz"))[0]
    from astropy.io import fits
    hdr = fits.Header.fromstring(str(np.load(first)["hdr"]), sep="\n")
    orig = np.stack([g["img"] for g in grid])[:, :, ::-1].astype("<f4")
    stored = np.stack([r for _, r in dec])[:, :, ::-1].astype("<f4")
    nodata = np.stack([~g["valid"] for g in grid])[:, :, ::-1]
    det = grid[0]["meta"]["band"].replace("SPHEREx-", "")
    waves = [g["meta"]["wave_um"] for g in grid]
    data = {
        "det": det, "w": shape[1], "h": shape[0], "n": len(grid), "unit": str(hdr.get("BUNIT", "")),
        "target": {"name": TARGET["name"], "ra": TARGET["ra"], "dec": TARGET["dec"], "note": TARGET["note"], "x": float(tx), "y": float(ty)},
        "flipped_x": True,
        "sky": aff, "pix_arcsec": 6.15, "min_cover": min_cover, "wave_range_um": [min(waves), max(waves)], "dropped": dropped,
        "frames": [{"obs": g["meta"]["obs_id"], "mjd": g["meta"]["t_min"], "wave": g["meta"]["wave_um"]} for g in grid],
        "orig": base64.b64encode(orig.tobytes()).decode(),
        "cache": base64.b64encode(stored.tobytes()).decode(),
        "nodata": base64.b64encode(np.packbits(nodata.reshape(len(grid), -1), axis=1).tobytes()).decode(),
        "store_kb": round(STORE.stat().st_size / 1e3), "raw_kb": round(orig.nbytes / 1e3),
    }
    if slim:  # the page then decodes the cache frames in the browser from sky.store.js (cellcache.js)
        del data["cache"]
    out = STORE.parent / "sky.data.js"
    out.write_text(
        "/* SPHEREx DR1 cutouts of one sky patch, exported by cell_cache_demo.py (SI-generated code, see docs/si-log.md).\n"
        "   orig = real calibrated pixels on one sky grid; cache = the same frames decoded from the lossy cell store.\n"
        "   Float32 little-endian, base64, frame-major; nodata = bit mask (1 = no data), one row per frame. */\n"
        f"window.SKY = {json.dumps(data, separators=(',', ':'))};\n"
    )
    store_js = STORE.parent / "sky.store.js"
    store_js.write_text(
        "/* The lossy cell store of one detector, re-packed for the browser (decoded by cellcache.js). SI-generated, see docs/si-log.md. */\n"
        f"window.SKYSTORE = {json.dumps({'det': det, 'w': shape[1], 'h': shape[0], 'cell': CELL, 'n': len(grid), 'flipped_x': True, 'b64': base64.b64encode(web_store()).decode()}, separators=(',', ':'))};\n"
    )
    idx = {k: data[k] for k in ("det", "n", "wave_range_um", "frames")}
    (STORE.parent / "sky.index.js").write_text(
        "/* Frame list only (times, wavelengths) of one detector, for the timeline of the web front end. SI-generated, see docs/si-log.md. */\n"
        f"(window.SKYIDX = window.SKYIDX || {{}}).{det} = {json.dumps(idx, separators=(',', ':'))};\n"
    )
    write_registry()
    print(f"wrote {store_js} ({store_js.stat().st_size / 1e3:.0f} KB, the cell store for the browser)")
    print(f"wrote {out} ({out.stat().st_size / 1e6:.1f} MB) and sky.index.js: {det}, {len(grid)} frames, {shape[1]}x{shape[0]} px, unit {data['unit']!r}")


def write_registry() -> None:
    """cell_demo/targets.js: the list of exported sky patches, for the target picker of the web page."""
    items = []
    for f in sorted(ROOT.glob("*/target.json")):
        m = json.loads(f.read_text())
        dets = []
        for d in sorted(f.parent.glob("D?_full")):
            ix = d / "sky.index.js"
            if ix.exists() and (d / "sky.data.js").exists():
                n = int(ix.read_text().split('"n":', 1)[1].split(",", 1)[0])
                dets.append({"det": d.name[:2], "n": n})
        if dets:
            items.append({"key": f.parent.name, "name": m["name"], "ra": m["ra"], "dec": m["dec"],
                          "collection": m["collection"], "size_deg": m["size_deg"], "detectors": dets})
    (ROOT / "targets.js").write_text(
        "/* Exported sky patches (written by cell_cache_demo.py export; SI-generated, see docs/si-log.md). */\n"
        f"window.TARGETS = {json.dumps(items, separators=(',', ':'))};\n")


def service_collections() -> list[str]:
    """Names of the SPHEREx level 2 image collections, read from the service (they change with each release)."""
    import re
    import urllib.parse

    q = "SELECT DISTINCT collection FROM caom.observation WHERE collection LIKE 'spherex%' ORDER BY collection"
    url = TAP_URL + "?" + urllib.parse.urlencode({"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "csv", "QUERY": q})
    names = http_get(url, tries=3).decode().split()[1:]
    return [n for n in names if re.fullmatch(IMAGE_COLLECTION, n)]


def cmd_collections() -> None:
    print("image collections on the service:", ", ".join(service_collections()))


def cmd_probe(ra: float, dec: float, name: str) -> None:
    """Count the images that cover a position, per image collection and detector (one cheap SIA2 query each, no cutouts)."""
    for c in service_collections():
        rows = sia_rows(ra, dec, 0.02, c)
        by = {}
        for r in rows:
            by.setdefault(r["band"].replace("SPHEREx-", ""), []).append(r["t_min"])
        span = f", MJD {min(r['t_min'] for r in rows):.1f} to {max(r['t_min'] for r in rows):.1f}" if rows else ""
        print(f"{name}  {c}: {len(rows)} images" + (" (" + ", ".join(f"{d} {len(v)}" for d, v in sorted(by.items())) + ")" if rows else "") + span)


def cmd_resolve(names: list[str]) -> None:
    """Look names up in SIMBAD (sends only the name), move the position to the observing epoch with the proper motion,
    and save it to cell_demo/known_targets.json. Moving objects matter: Barnard's Star moves 10 arcsec a year."""
    known = json.loads(known_file().read_text()) if known_file().exists() else {}
    for n in names:
        k = simbad_lookup(n)
        # Only the median observing time is needed. IRSA's search times out above about 0.1 degrees (measured 15 Nov) and the images are
        # 3.5 degrees wide, so an image that covers the J2000 position also covers the star a few arcminutes away: a small circle is enough.
        try:
            rows = sia_rows(k["ra_j2000"], k["dec_j2000"], RESOLVE_RADIUS, COLLECTION)
        except Exception as e:  # noqa: BLE001
            print(f"  search for the observing epoch of {n} failed ({e}): using the middle of DR1")
            rows = []
        if rows:
            mjd = float(np.median([r["t_min"] for r in rows]))
        else:
            mjd = 60960.0  # about 1 Nov 2025, the middle of the DR1 observations of WISE 0855
            print(f"  no {COLLECTION} images near the J2000 position of {n}: epoch set to MJD {mjd:.0f} (middle of DR1)")
        ra, dec = epoch_position(k, mjd)
        shift = sep_arcsec(ra, dec, k["ra_j2000"], k["dec_j2000"])
        k.update(ra=ra, dec=dec, epoch_mjd=mjd, shift_arcsec=round(shift, 1), name=n,
                 note=f"SIMBAD position, moved {shift:.0f} arcsec to MJD {mjd:.0f} with its proper motion" if shift >= 1 else "SIMBAD position (proper motion is under 1 arcsec over the epoch)")
        known[n.lower()] = k
        print(f"{n}: SIMBAD {k['simbad_id']}, J2000 {k['ra_j2000']:.5f} {k['dec_j2000']:+.5f}, proper motion {k['pmra_masyr']:.0f} {k['pmdec_masyr']:.0f} mas/yr; "
              f"moved {shift:.1f} arcsec ({shift / 6.15:.1f} pixels) to MJD {mjd:.0f}: {ra:.5f} {dec:+.5f}")
    ROOT.mkdir(parents=True, exist_ok=True)
    known_file().write_text(json.dumps(known, indent=1) + "\n")


def cmd_update(detector: str | None, min_cover: float) -> None:
    """Bring the patch up to date: ask the service again, fetch only images that are new or have a new processing
    version (cached files are skipped), then rebuild the store and the exports. Nothing is merged across collections:
    a release with another collection name is another patch folder."""
    dets = [detector] if detector and detector != "all" else sorted(d.name[:2] for d in CACHE.glob("D?_full"))
    if not dets:
        sys.exit("nothing cached for this patch yet: run `fetch --full` first")
    for d in dets:
        print(f"== {d}")
        use_detector(d, True)
        before = {f.name: f.stat().st_mtime_ns for f in RAW.glob("*.npz")}
        cmd_fetch(0, detector=d, full=True)
        after = {f.name: f.stat().st_mtime_ns for f in RAW.glob("*.npz")}
        new = [k for k in after if k not in before]
        redone = [k for k in after if k in before and after[k] != before[k]]
        print(f"{d}: {len(new)} new images, {len(redone)} fetched again (new processing version), {len(after)} in the cache")
        if new or redone:
            cmd_export(min_cover)
        else:
            print(f"{d}: no new images, exports left as they are")


def cmd_view(min_cover: float = MIN_COVER) -> None:
    """Write a standalone HTML page that compares original and stored frames."""
    import base64

    frames = load_raw()
    if not frames:
        sys.exit("no raw frames: run `fetch` first")
    grid, _, shape, gwcs = to_common_grid(frames, min_cover)
    dec = ensure_store(grid, shape)
    aff, err_arcsec = sky_affine(gwcs, shape)
    tx, ty = gwcs.all_world2pix(TARGET["ra"], TARGET["dec"], 0)
    print(f"sky mapping: linear fit error at far corner {err_arcsec:.3f} arcsec; target {TARGET['name']} at grid pixel ({float(tx):.1f}, {float(ty):.1f})")
    orig = np.stack([g["img"] for g in grid]).astype("<f4")
    stored = np.stack([r for _, r in dec]).astype("<f4")
    valid = np.stack([g["valid"] for g in grid]).astype(np.uint8)
    data = {
        "n": len(grid), "h": shape[0], "w": shape[1], "cell": CELL, "sky": aff,
        "target": {"name": TARGET["name"], "x": float(tx), "y": float(ty)},
        "orig": base64.b64encode(orig.tobytes()).decode(),
        "stored": base64.b64encode(stored.tobytes()).decode(),
        "valid": base64.b64encode(valid.tobytes()).decode(),
        "sigma": [float(np.median(g["sig"])) for g in grid],
        "upd": [m["_upd"].ravel().astype(int).tolist() for m, _ in dec],
        "frames": [{k: m[k] for k in ("obs_id", "band", "t_min", "wave_um", "n_upd", "n_cells", "valid_frac")} for m, _ in dec],
        "store_kb": round(STORE.stat().st_size / 1e3), "raw_kb": round(orig.nbytes / 1e3),
    }
    tpl = (Path(__file__).with_name("cell_cache_viewer.html")).read_text()
    out = VIEWER
    out.write_text(tpl.replace("/*DATA*/null", json.dumps(data, separators=(",", ":")), 1))
    print(f"wrote {out} ({out.stat().st_size / 1e6:.1f} MB). Open it in a browser (file://).")


def main() -> None:
    global VIA
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    f = sub.add_parser("fetch", help="download small cutouts (not full frames) into the cache")
    f.add_argument("--n", type=int, default=24)
    f.add_argument("--window", type=int, default=None, help="observing window index (default: the one with most images)")
    f.add_argument("--start", type=int, default=0, help="first image inside the window")
    f.add_argument("--detector", default="D1", help="D1..D6 (one detector keeps the wavelength range the same), or 'all'")
    d = sub.add_parser("demo", help="build the cell store, test append, decode and report")
    v = sub.add_parser("view", help="write viewer.html to compare original, stored and difference frames")
    e = sub.add_parser("export", help="write sky.data.js for the web front end (original and cache-decoded frames)")
    e.add_argument("--slim", action="store_true", help="leave the decoded cache frames out of sky.data.js: the page decodes them in the browser from sky.store.js (about half the size)")
    u = sub.add_parser("update", help="fetch only new or reprocessed images for a cached patch, then re-export")
    pr = sub.add_parser("probe", help="count the images that cover a position, per collection and detector (no cutouts)")
    rs = sub.add_parser("resolve", help="look names up in SIMBAD (only the name is sent) and save them with the proper motion applied")
    rs.add_argument("names", nargs="+", help="SIMBAD identifiers, for example \"Barnard's star\" \"* eps Ind B\" \"V* RW Aur\" \"V* R Dra\"")
    sub.add_parser("collections", help="list the SPHEREx image collections the service offers now")
    for sp in (f, d, v, e, u, pr):  # which sky position: a known name, or explicit coordinates (default: WISE 0855)
        sp.add_argument("--target", default=None, help="a name from the known list or from `resolve` (default: WISE 0855)")
        sp.add_argument("--ra", type=float, default=None, help="right ascension in degrees (with --dec)")
        sp.add_argument("--dec", type=float, default=None, help="declination in degrees (with --ra)")
        sp.add_argument("--name", default=None, help="label for explicit coordinates")
        sp.add_argument("--collection", default=COLLECTION, help=f"image collection (default {COLLECTION}; `collections` lists them)")
    for sp in (f, u):
        sp.add_argument("--size", type=float, default=CUTOUT_DEG, help="cutout size in degrees (default 0.2, about 117 pixels)")
        sp.add_argument("--via", choices=["s3", "cutout"], default=VIA,
                        help="how to get a region of each frame: s3 = range reads on the public bucket (default; the cutout service is the fallback), cutout = IRSA cutout service only")
    for sp in (d, v, e, u):
        sp.add_argument("--min-coverage", type=float, default=MIN_COVER, help="drop frames with less of the grid covered (0 to 1, default 0.8)")
    for sp in (f, d, v, e):
        sp.add_argument("--full", action="store_true", help="use the <detector>_full folder: all images of the detector, all windows")
        if sp is not f:
            sp.add_argument("--detector", default="D1", help="D1..D6 or all: which cache folder to use")
    u.add_argument("--detector", default="all", help="D1..D6 or all (default all that are cached)")
    a = ap.parse_args()
    if a.cmd == "resolve":
        return cmd_resolve(a.names)
    if a.cmd == "collections":
        return cmd_collections()
    name, ra, dec, note = resolve_request(a.target, a.ra, a.dec)
    if a.name and a.ra is not None:
        name = a.name
    if a.cmd == "probe":
        return cmd_probe(ra, dec, name)
    VIA = getattr(a, "via", VIA)
    use_target(name, ra, dec, getattr(a, "size", CUTOUT_DEG), a.collection, note)
    if a.cmd == "update":
        return cmd_update(a.detector, a.min_coverage)
    use_detector(a.detector, a.full)
    if a.cmd == "fetch":
        cmd_fetch(a.n, a.start, a.window, None if a.detector == "all" else a.detector, a.full)
    elif a.cmd == "view":
        cmd_view(a.min_coverage)
    elif a.cmd == "export":
        cmd_export(a.min_coverage, getattr(a, "slim", False))
    else:
        cmd_demo(a.min_coverage)


if __name__ == "__main__":
    main()
