# /// script
# requires-python = ">=3.10"
# dependencies = ["fastapi", "httpx"]
# ///
"""Check of the local service (implementation/server/app.py) with a stub in place of the real pipeline.

The stub prints the same progress lines as cell_cache_demo.py and writes a tiny fake patch, so the job logic is tested in seconds
without touching the archive: validation, lookup, prepare, progress, duplicate requests, the queue, cancelling, a failed job, the
cleanup of a failed new patch, and the static files. A temporary folder is used as the cache and removed at the end.

Run: uv run --script implementation/tests/server_check.py        (exit code 0 if every check passes)

Written with SI assistance (Claude Sonnet 5.5, 2026-11-15); see docs/si-log.md.
"""
from __future__ import annotations

import importlib.util
import json
import os
import sys
import tempfile
import textwrap
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
tmp = Path(tempfile.mkdtemp(prefix="skyflip-server-check-"))
cache = tmp / "cell_demo"
cache.mkdir()
stub = tmp / "stub_pipeline.py"
stub.write_text(textwrap.dedent('''
    import json, os, sys, time
    from pathlib import Path
    a = sys.argv[1:]
    cmd = a[0]
    get = lambda k: a[a.index(k) + 1]
    ra, dec, det = float(get("--ra")), float(get("--dec")), get("--detector")
    root = Path(os.environ["SKYFLIP_CACHE"])
    key = f"ra{ra:.4f}_dec{dec:+.4f}_s0.2_spherex_dr1".replace("+", "")
    patch = root / key
    delay = 0.6 if abs(dec - 30.0) < 1e-3 else 0.12  # dec 30 is the slow case (queue, duplicates, cancel)
    if cmd == "fetch":
        new = not patch.exists()
        patch.mkdir(exist_ok=True)
        (patch / "target.json").write_text(json.dumps({"name": get("--name"), "ra": ra, "dec": dec, "collection": "spherex_dr1", "size_deg": 0.2}))
        print(f"cache: {'new' if new else 'reusing'} patch {key}", flush=True)
        if abs(dec + 45.0) < 1e-3:
            print("no spherex_dr1 images cover this position: nothing to fetch", file=sys.stderr, flush=True)
            sys.exit(1)
        print("SIA2: 5 images for the position in spherex_dr1", flush=True)
        print(f"keeping detector {det} only: 5 images", flush=True)
        for k in range(1, 6):
            time.sleep(delay)
            print(f"  [{k}/5] 00{k} SPHEREx-{det} 2.1 MB read by range requests, kept 110 KB  ({k * delay / 60:.1f} min elapsed, about {(5 - k) * delay / 60:.1f} min left)", flush=True)
    elif cmd == "export":
        d = patch / f"{det}_full"
        d.mkdir(exist_ok=True)
        (d / "sky.data.js").write_text("window.SKY = {};")
        print(f"cache: reusing patch {key}", flush=True)
''').lstrip())
os.environ["SKYFLIP_CACHE"] = str(cache)
os.environ["SKYFLIP_PIPELINE_CMD"] = json.dumps([sys.executable, str(stub)])

spec = importlib.util.spec_from_file_location("skyflip_app", HERE.parent / "server" / "app.py")
mod = importlib.util.module_from_spec(spec)
sys.modules["skyflip_app"] = mod
spec.loader.exec_module(mod)
from fastapi.testclient import TestClient

fails: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    print(("PASS " if ok else "FAIL ") + name + (f"  ({detail})" if detail else ""))
    if not ok:
        fails.append(name)


def wait(c, jid, states, timeout=30.0):
    t0, seen = time.time(), []
    while time.time() - t0 < timeout:
        j = c.get(f"/api/jobs/{jid}").json()
        seen.append(j)
        if j["state"] in states:
            return j, seen
        time.sleep(0.1)
    return seen[-1], seen


with TestClient(mod.app) as c:
    check("health answers", c.get("/api/health").json().get("ok") is True)
    check("RA outside 0 to 360 is refused", c.post("/api/prepare", json={"ra": 400, "dec": 0}).status_code == 422)
    check("Dec outside -90 to 90 is refused", c.post("/api/prepare", json={"ra": 10, "dec": 100}).status_code == 422)
    check("an unknown detector is refused", c.post("/api/prepare", json={"ra": 10, "dec": 10, "detector": "D9"}).status_code == 422)
    check("text instead of a number is refused", c.post("/api/prepare", json={"ra": "abc", "dec": 10}).status_code == 422)
    check("lookup needs both numbers", c.get("/api/lookup?ra=10").status_code == 422)
    check("an unprepared position is reported missing", c.get("/api/lookup?ra=10&dec=12").json()["state"] == "missing")

    # a normal job with progress
    r = c.post("/api/prepare", json={"ra": 10.0, "dec": 12.0})
    check("prepare is accepted", r.status_code == 202 and r.json()["id"], str(r.json()))
    j, seen = wait(c, r.json()["id"], {"done", "failed", "cancelled"})
    check("the job finishes", j["state"] == "done", j.get("message") or "")
    pcts = [x["percent"] for x in seen]
    check("progress rises from the middle of the bar to 100", any(5 < p < 90 for p in pcts) and pcts[-1] == 100 and pcts == sorted(pcts), str(pcts[:3]) + " ... " + str(pcts[-3:]))
    check("the job names the patch", bool(j["key"]) and (cache / j["key"] / "D6_full" / "sky.data.js").exists(), str(j["key"]))
    key = j["key"]
    check("the step text reports image counts while reading", any(x["message"] and "Reading image" in x["message"] for x in seen))

    # lookup after the job
    lk = c.get("/api/lookup?ra=10&dec=12").json()
    check("lookup now says ready, with the patch key", lk["state"] == "ready" and lk["key"] == key, str(lk))
    check("a position 200 arcsec away is covered by that patch", c.get(f"/api/lookup?ra=10&dec={12 + 200 / 3600}").json()["state"] == "ready")
    check("a position 400 arcsec away is not", c.get(f"/api/lookup?ra=10&dec={12 + 400 / 3600}").json()["state"] == "missing")
    check("another detector of the same patch is not prepared", c.get("/api/lookup?ra=10&dec=12&detector=D3").json()["state"] == "missing")
    r2 = c.post("/api/prepare", json={"ra": 10.0, "dec": 12.0})
    check("preparing something that is ready finishes at once, with no job", r2.json()["state"] == "done" and r2.json()["id"] is None)

    # duplicates and the queue (dec 30 is the slow case)
    a = c.post("/api/prepare", json={"ra": 50.0, "dec": 30.0}).json()
    time.sleep(0.4)
    b = c.post("/api/prepare", json={"ra": 50.0, "dec": 30.0}).json()
    check("the same position asked twice gives the same job", a["id"] == b["id"], a["id"] + " " + b["id"])
    q = c.post("/api/prepare", json={"ra": 60.0, "dec": 30.0}).json()
    check("a second, different position waits in the queue", q["state"] == "queued" and q["queue_position"] == 1, str(q["state"]) + " " + str(q["queue_position"]))
    check("lookup of a running position returns its job", c.get("/api/lookup?ra=50&dec=30").json()["state"] in ("running", "queued"))
    ja, _ = wait(c, a["id"], {"done", "failed", "cancelled"})
    check("the first job finishes", ja["state"] == "done")
    jq, _ = wait(c, q["id"], {"running", "done"})
    check("then the queued one starts and finishes (one job at a time)", jq["state"] in ("running", "done"))
    # cancel
    cj = c.post("/api/prepare", json={"ra": 70.0, "dec": 30.0}).json()
    wait(c, q["id"], {"done"})
    jr, _ = wait(c, cj["id"], {"running"})
    time.sleep(0.5)
    c.delete(f"/api/jobs/{cj['id']}")
    jc, _ = wait(c, cj["id"], {"cancelled", "done", "failed"})
    check("a running job can be cancelled", jc["state"] == "cancelled", jc["state"])
    check("a cancelled new patch leaves no folder behind", not list(cache.glob("ra70.0000_dec30.0000*")))
    check("cancelling an unknown job gives 404", c.delete("/api/jobs/nope").status_code == 404)

    # failure
    fj = c.post("/api/prepare", json={"ra": 80.0, "dec": -45.0}).json()
    jf, _ = wait(c, fj["id"], {"failed", "done", "cancelled"})
    check("a position with no images fails with a plain message", jf["state"] == "failed" and "no images" in (jf["error"] or "").lower(), jf.get("error") or "")
    check("a failed new patch is cleaned up", not list(cache.glob("ra80.0000_dec-45.0000*")))

    # static files and the home redirect
    page = c.get("/web/drafts/v1-studio-real.html")
    check("the page is served", page.status_code == 200 and "Skyliner" in page.text)
    check("the home address redirects to the page", c.get("/", follow_redirects=False).headers.get("location") == mod.PAGE)
    check("the redirect keeps a query string", c.get("/?ra=20&dec=30", follow_redirects=False).headers.get("location") == mod.PAGE + "?ra=20&dec=30")
    check("the landing page is served", "Show this position" in c.get("/web/index.html").text)
    (mod.IMPL / "data").mkdir(exist_ok=True)
    (cache / "x.txt").write_text("x")
    check("prepared data is sent with no-store", False if not (mod.IMPL / "data").exists() else c.get("/web/drafts/app.js").headers.get("cache-control") == "no-store")

import shutil

shutil.rmtree(tmp, ignore_errors=True)
print("ALL CHECKS PASSED" if not fails else f"{len(fails)} CHECK(S) FAILED: " + ", ".join(fails))
sys.exit(1 if fails else 0)
