# /// script
# requires-python = ">=3.10"
# dependencies = ["fastapi", "uvicorn"]
# ///
"""Local service for the Skyliner web page.

It serves the page and the prepared data, and it prepares a new sky position on demand: when a person types coordinates that
have not been prepared, the page asks this service, which runs the pipeline (implementation/scripts/cell_cache_demo.py: search
the archive, read the images, build the display data) as a background job and reports progress until the data is ready.

Run (from the repository root):   uv run --script implementation/server/app.py
It opens http://127.0.0.1:8000/ in your browser by itself (NO_BROWSER=1 stops that; HOST and PORT change the address; it listens on this machine only by default).

Rules it keeps: one pipeline job at a time (the archive is public and shared, so no parallel flood), a short queue, the
collection and the region size are fixed, coordinates are validated numbers, nothing typed by a person ends up in a path or a
command except those numbers, and nothing personal is sent anywhere.

SI-GENERATED CODE: written by Claude Sonnet 5.5 (Anthropic) through Claude Code on 2026-11-15. See docs/si-log.md.
"""
from __future__ import annotations

import json
import math
import os
import re
import shutil
import subprocess
import sys
import threading
import uuid
from collections import deque
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

IMPL = Path(__file__).resolve().parents[1]
ROOT = IMPL.parent
CACHE = Path(os.environ.get("SKYFLIP_CACHE", IMPL / "data" / "cache" / "cell_demo"))  # where patches live (the pipeline's own folder)
PIPELINE = os.environ.get("SKYFLIP_PIPELINE_CMD")  # tests replace the pipeline with a stub: a JSON list, the command prefix
PIPELINE_CMD = json.loads(PIPELINE) if PIPELINE else ["uv", "run", "--script", str(IMPL / "scripts" / "cell_cache_demo.py")]
COLLECTION, SIZE_DEG = "spherex_dr1", 0.2  # the same fixed values as the pipeline
COVER_ARCSEC = 300.0  # a prepared patch covers a position this close to its centre (the patch grid is about 108 px of 6.15 arcsec, so
#                       a circle of 332 arcsec fits inside it whatever its rotation)
MAX_QUEUE = 5
PAGE = "/web/index.html"


def sep_arcsec(ra1: float, dec1: float, ra2: float, dec2: float) -> float:
    d = math.radians
    c = math.sin(d(dec1)) * math.sin(d(dec2)) + math.cos(d(dec1)) * math.cos(d(dec2)) * math.cos(d(ra1 - ra2))
    return math.degrees(math.acos(max(-1.0, min(1.0, c)))) * 3600


class Position(BaseModel):
    ra: float = Field(ge=0, lt=360, description="right ascension, degrees")
    dec: float = Field(ge=-90, le=90, description="declination, degrees")
    detector: str = Field("D6", pattern=r"^D[1-6]$")


def find_ready(ra: float, dec: float, det: str):
    """The prepared patch (with this detector exported) whose centre is nearest to the position and within COVER_ARCSEC."""
    best = None
    for f in CACHE.glob("*/target.json"):
        try:
            m = json.loads(f.read_text())
        except (OSError, ValueError):
            continue
        if m.get("collection") != COLLECTION or abs(m.get("size_deg", 0) - SIZE_DEG) > 1e-9:
            continue
        if not (f.parent / f"{det}_full" / "sky.data.js").exists():
            continue
        s = sep_arcsec(ra, dec, m["ra"], m["dec"])
        if s <= COVER_ARCSEC and (best is None or s < best[0]):
            best = (s, f.parent.name, m)
    return best


# ------------------------------------------------------------------ jobs ---
JOBS: dict[str, dict] = {}
ORDER: deque = deque(maxlen=50)  # job ids, oldest first (to forget old jobs)
PENDING: deque = deque()
LOCK = threading.RLock()
WAKE = threading.Event()
RE_PATCH = re.compile(r"cache: (?:new|reusing) patch (\S+)")
RE_PROGRESS = re.compile(r"\[(\d+)/(\d+)\].*\(([\d.]+) min elapsed, about ([\d.]+) min left\)")
RE_KEEP = re.compile(r"keeping detector (D\d) only: (\d+) images")
RE_KEY = re.compile(r"^ra[\d.]+_dec-?[\d.]+_s[\d.]+_spherex_dr\d+$")


def public(j: dict) -> dict:
    keys = ("id", "state", "step", "message", "done", "total", "percent", "eta_min", "key", "ra", "dec", "detector", "error", "tail", "queue_position")
    out = {k: j.get(k) for k in keys}
    if j["state"] == "queued":
        with LOCK:
            out["queue_position"] = list(PENDING).index(j["id"]) + 1 if j["id"] in PENDING else 0
    return out


def friendly_error(lines: list[str]) -> str:
    text = " ".join(lines)
    if "images cover this position" in text or "no spherex" in text.lower():
        return "NASA's SPHEREx release DR1 has no images of this position. Try another position."
    if "cutouts have under" in text or "grid is" in text:
        return "This position is too close to the edge of the detectors to build a view. Try a position a little further in."
    if "timed out" in text or "Proxy Error" in text or "HTTP Error 5" in text:
        return "The NASA archive did not answer. Wait a few minutes and try again."
    return "The preparation stopped with an error. " + (lines[-1] if lines else "")


def run_step(j: dict, args: list[str], lo: float, hi: float) -> tuple[int, list[str]]:
    """Run one pipeline command; update the job from its output lines. lo and hi: the part of the bar this step covers."""
    env = {**os.environ, "PYTHONUNBUFFERED": "1"}
    proc = subprocess.Popen([*PIPELINE_CMD, *args], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    j["proc"] = proc
    tail: list[str] = []
    for line in proc.stdout:  # type: ignore[union-attr]
        line = line.rstrip()
        if not line.strip():
            continue
        tail = (tail + [line])[-8:]
        if (m := RE_PATCH.search(line)):
            j["key"], j["new_patch"] = m.group(1), "new patch" in line
        elif (m := RE_KEEP.search(line)):
            j["total"] = int(m.group(2)); j["message"] = f"Found {m.group(2)} images of this position. Reading them from the archive."
        elif (m := RE_PROGRESS.search(line)):
            j["done"], j["total"], j["eta_min"] = int(m.group(1)), int(m.group(2)), float(m.group(4))
            j["percent"] = round(lo + (hi - lo) * j["done"] / max(1, j["total"]))
            j["message"] = f"Reading image {j['done']} of {j['total']}" + (f", about {max(1, round(j['eta_min']))} min left" if j["done"] < j["total"] else "")
        elif line.startswith("SIA2:"):
            j["message"] = "Searching the NASA archive for images of this position."
    code = proc.wait()
    j["proc"] = None
    return code, tail


def run_job(j: dict) -> None:
    ra, dec, det = j["ra"], j["dec"], j["detector"]
    common = ["--ra", f"{ra:.6f}", "--dec", f"{dec:.6f}", "--detector", det, "--full", "--name", f"RA {ra:.4f} Dec {dec:+.4f}"]
    j.update(state="running", step="fetch", message="Searching the NASA archive for images of this position.", percent=2)
    code, tail = run_step(j, ["fetch", *common], 2, 88)
    if j.get("cancel"):
        return finish(j, "cancelled", "Cancelled.", tail)
    if code != 0:
        return finish(j, "failed", friendly_error(tail), tail)
    j.update(step="export", message="Building the display data.", percent=90)
    code, tail = run_step(j, ["export", *common], 90, 99)
    if j.get("cancel"):
        return finish(j, "cancelled", "Cancelled.", tail)
    if code != 0:
        return finish(j, "failed", friendly_error(tail), tail)
    key = j.get("key")
    if not key or not (CACHE / key / f"{det}_full" / "sky.data.js").exists():
        return finish(j, "failed", "The data was built but is not where it should be.", tail)
    j.update(state="done", step="done", percent=100, message="Ready.")


def finish(j: dict, state: str, message: str, tail: list[str]) -> None:
    j.update(state=state, message=message, error=message if state == "failed" else None, tail=tail if state == "failed" else None)
    key = j.get("key")  # a new patch folder that holds no export is leftover from a failed run: remove it
    if state != "done" and key and j.get("new_patch") and RE_KEY.match(key):
        d = (CACHE / key).resolve()
        if d.parent == CACHE.resolve() and d.is_dir() and not list(d.glob("*/sky.data.js")):
            shutil.rmtree(d, ignore_errors=True)


def worker() -> None:
    while True:
        WAKE.wait()
        while True:
            with LOCK:
                jid = PENDING.popleft() if PENDING else None
                if not PENDING:
                    WAKE.clear()
            if jid is None:
                break
            j = JOBS.get(jid)
            if not j or j["state"] != "queued":
                continue
            try:
                run_job(j)
            except Exception as e:  # noqa: BLE001 - a job must never stop the worker
                finish(j, "failed", f"The preparation failed: {e}", [])


@asynccontextmanager
async def lifespan(_: FastAPI):
    threading.Thread(target=worker, daemon=True, name="pipeline-worker").start()
    yield


app = FastAPI(title="Skyliner service", lifespan=lifespan)
# The page may be opened as a file (origin "null") or from another local port. Only this machine's own pages may call the API.
app.add_middleware(CORSMiddleware, allow_origin_regex=r"^(null|https?://(127\.0\.0\.1|localhost)(:\d+)?)$",
                   allow_methods=["GET", "POST", "DELETE"], allow_headers=["Content-Type"])


@app.get("/api/health")
def health():
    with LOCK:
        busy = any(j["state"] == "running" for j in JOBS.values())
        return {"ok": True, "busy": busy, "queued": len(PENDING)}


@app.get("/api/lookup")
def lookup(ra: float = Query(ge=0, lt=360), dec: float = Query(ge=-90, le=90), detector: str = Query("D6", pattern=r"^D[1-6]$")):
    """Is this position prepared? Returns ready (with the patch key), or the running or queued job for it, or missing."""
    p = Position(ra=ra, dec=dec, detector=detector)
    hit = find_ready(p.ra, p.dec, p.detector)
    if hit:
        return {"state": "ready", "key": hit[1], "name": hit[2].get("name"), "separation_arcsec": round(hit[0], 1)}
    j = active_job(p)
    return {"state": j["state"], "job": public(j)} if j else {"state": "missing"}


def active_job(p: Position):
    for j in JOBS.values():
        if j["state"] in ("queued", "running") and j["detector"] == p.detector and sep_arcsec(p.ra, p.dec, j["ra"], j["dec"]) <= 30:
            return j
    return None


@app.post("/api/prepare", status_code=202)
def prepare(p: Position):
    hit = find_ready(p.ra, p.dec, p.detector)
    if hit:  # nothing to do
        return {"id": None, "state": "done", "percent": 100, "key": hit[1], "message": "Ready."}
    with LOCK:
        j = active_job(p)
        if j:
            return public(j)
        if len(PENDING) >= MAX_QUEUE:
            raise HTTPException(429, "The queue is full. Try again in a few minutes.")
        j = {"id": uuid.uuid4().hex[:12], "state": "queued", "step": "queued", "message": "Waiting for the earlier preparation to finish.",
             "done": 0, "total": None, "percent": 0, "eta_min": None, "key": None, "ra": p.ra, "dec": p.dec, "detector": p.detector,
             "error": None, "tail": None, "proc": None, "cancel": False}
        JOBS[j["id"]] = j
        ORDER.append(j["id"])
        PENDING.append(j["id"])
        WAKE.set()
        for old in [k for k in JOBS if k not in ORDER]:
            JOBS.pop(old, None)
    return public(j)


@app.get("/api/jobs/{job_id}")
def job(job_id: str):
    j = JOBS.get(job_id)
    if not j:
        raise HTTPException(404, "Unknown job")
    return public(j)


@app.delete("/api/jobs/{job_id}")
def cancel(job_id: str):
    j = JOBS.get(job_id)
    if not j:
        raise HTTPException(404, "Unknown job")
    with LOCK:
        if j["state"] == "queued":
            if job_id in PENDING:
                PENDING.remove(job_id)
            j.update(state="cancelled", message="Cancelled.")
        elif j["state"] == "running":
            j["cancel"] = True
            if j.get("proc"):
                j["proc"].terminate()
    return public(j)


class NoStore(StaticFiles):
    """Prepared data is rewritten by the pipeline, so the browser must not keep an old copy."""

    async def get_response(self, path, scope):
        r = await super().get_response(path, scope)
        r.headers["Cache-Control"] = "no-store"
        return r


@app.get("/", include_in_schema=False)
def home(request: Request):
    """The address of the service opens the landing page, and keeps a query such as ?ra=134.4&dec=-9.02."""
    q = request.url.query
    return RedirectResponse(PAGE + ("?" + q if q else ""))


app.mount("/web", NoStore(directory=IMPL / "web"), name="web")
(IMPL / "data").mkdir(exist_ok=True)
app.mount("/data", NoStore(directory=IMPL / "data"), name="data")

if __name__ == "__main__":
    import socket
    import webbrowser

    import uvicorn

    host, port = os.environ.get("HOST", "127.0.0.1"), int(os.environ.get("PORT", "8000"))
    with socket.socket() as s:
        if s.connect_ex((host if host != "0.0.0.0" else "127.0.0.1", port)) == 0:
            sys.exit(f"Port {port} is already in use. If it is this service, it is already running: open http://{host}:{port}/ . "
                     f"Otherwise stop the other program, or pick another port: PORT=8001 uv run --script implementation/server/app.py")
    url = f"http://{host}:{port}/"
    print(f"Skyliner service: {url}   (Ctrl+C to stop)", file=sys.stderr)
    if not os.environ.get("NO_BROWSER"):  # open the app in the default browser once the service is up (NO_BROWSER=1 to turn off)
        threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    uvicorn.run(app, host=host, port=port, log_level="warning")
