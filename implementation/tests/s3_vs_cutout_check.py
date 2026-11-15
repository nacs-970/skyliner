# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "astropy"]
# ///
"""Manual check: the range-read route gives the same pixels as the IRSA cutout service.

Gets one region of one public SPHEREx frame (WISE 0855, detector D6) both ways, with `fetch_one_s3` and `fetch_one` from
implementation/scripts/cell_cache_demo.py, and compares IMAGE, VARIANCE and the wavelength. Costs one search query, one
cutout request (about 4 MB) and about 2 MB of range reads. Nothing is stored (a temporary folder is deleted).

Run: uv run --script implementation/tests/s3_vs_cutout_check.py
Exit code 0 if every check passes, 1 otherwise. It is a manual check: it needs the network and there is no CI.

Written with SI assistance (Claude Sonnet 5.5, 2026-11-15); see docs/si-log.md.
"""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import warnings
from pathlib import Path

import numpy as np
from astropy.io import fits
from astropy.wcs import WCS

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "cell_cache_demo.py"
spec = importlib.util.spec_from_file_location("ccd", SCRIPT)
ccd = importlib.util.module_from_spec(spec)
sys.modules["ccd"] = ccd
spec.loader.exec_module(ccd)

fails = []


def check(name: str, ok: bool, detail: str = "") -> None:
    print(("PASS " if ok else "FAIL ") + name + (f"  ({detail})" if detail else ""))
    if not ok:
        fails.append(name)


def crpix(npz) -> tuple[float, float]:
    h = fits.Header.fromstring(str(npz["hdr"]), sep="\n")
    return float(h["CRPIX1"]), float(h["CRPIX2"])


rows = [r for r in ccd.sia_rows() if r["band"] == "SPHEREx-D6"]
row = next((r for r in rows if "2025W19_1B_0116_1" in r["url"]), rows[0])
print(f"frame {row['obs_id']} {row['band']}, {len(rows)} D6 images cover WISE 0855")

with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    ccd.RAW = tmp / "s3"
    msg_s3 = ccd.fetch_one_s3((0, row))
    ccd.RAW = tmp / "cutout"
    msg_cut = ccd.fetch_one((0, row))
    print("range route :", msg_s3)
    print("cutout route:", msg_cut)
    a = np.load(tmp / "s3" / ccd.raw_name(row))
    b = np.load(tmp / "cutout" / ccd.raw_name(row))
    ma, mb = json.loads(str(a["meta"])), json.loads(str(b["meta"]))
    ca, cb = crpix(a), crpix(b)
    # a crop's CRPIX is the full-frame CRPIX minus the crop's origin, so the CRPIX difference is the difference of the origins:
    # dx, dy = (cutout origin) - (range-read origin). Pixel y[j, i] of the cutout is pixel x[j + dy, i + dx] of the range read.
    dx, dy = round(ca[0] - cb[0]), round(ca[1] - cb[1])
    check("range read used the S3 route", ma.get("via") == "s3")
    check("range route read far less than the cutout service", ma["fits_bytes"] < mb["fits_bytes"], f"{ma['fits_bytes']} against {mb['fits_bytes']} bytes")
    print(f"crop origins differ by x {dx}, y {dy} pixels; shapes {a['img'].shape} and {b['img'].shape}")
    for key in ("img", "var"):
        x, y = a[key], b[key]
        # compare the pixels both crops contain: y[j, i] is the same pixel as x[j + dy, i + dx]
        j0, i0 = max(0, -dy), max(0, -dx)
        j1, i1 = min(y.shape[0], x.shape[0] - dy), min(y.shape[1], x.shape[1] - dx)
        xs, ys = x[j0 + dy : j1 + dy, i0 + dx : i1 + dx], y[j0:j1, i0:i1]
        same = ys.size > 0 and np.array_equal(xs, ys, equal_nan=True)
        check(f"{key.upper()} pixels identical on the common area", same, f"{ys.shape[1]} by {ys.shape[0]} pixels")
    check("common area is almost the whole cutout", ys.size >= 0.95 * b["img"].size, f"{ys.size} of {b['img'].size} pixels")
    check("wavelength at the target equal", abs(ma["wave_um"] - mb["wave_um"]) < 1e-6, f"{ma['wave_um']:.6f} and {mb['wave_um']:.6f} um")
    check("bandwidth equal", abs(ma["bw_um"] - mb["bw_um"]) < 1e-6)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        wa = WCS(fits.Header.fromstring(str(a["hdr"]), sep="\n"))
        wb = WCS(fits.Header.fromstring(str(b["hdr"]), sep="\n"))
        pa = wa.all_world2pix(ccd.CENTER["ra"], ccd.CENTER["dec"], 0)
        pb = wb.all_world2pix(ccd.CENTER["ra"], ccd.CENTER["dec"], 0)
    check("the target lands on the same pixel in both crops", abs((pa[0] - dx) - pb[0]) < 1e-3 and abs((pa[1] - dy) - pb[1]) < 1e-3,
          f"({float(pa[0]):.2f}, {float(pa[1]):.2f}) and ({float(pb[0]):.2f}, {float(pb[1]):.2f}) with offset ({dx}, {dy})")

print("ALL CHECKS PASSED" if not fails else f"{len(fails)} CHECK(S) FAILED: " + ", ".join(fails))
sys.exit(1 if fails else 0)
