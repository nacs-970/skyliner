# server/

A small local service (FastAPI) that serves the web app and prepares a new sky position on demand.

```bash
./start.sh                                          # or: uv run --script implementation/server/app.py   (start.bat on Windows)
```

It starts the service and opens the app in your default browser (`NO_BROWSER=1` turns that off). `HOST` and `PORT` change the address (it listens on this machine only by default; there is no hosting). If the port is taken it says so and how to pick another. The first run installs `fastapi` and `uvicorn`.

**The page does not have to be opened from the service.** The API answers pages served by the service itself, pages opened as a file, and pages from another local port (CORS allows `null` and `127.0.0.1` or `localhost` origins only). If the service is not running when a new position is entered, the page shows a loading screen with the start command and waits, then carries on by itself the moment the service answers.

**What it does.** The landing page asks `GET /api/lookup?ra=&dec=&detector=`. If a prepared patch covers the position (its centre within 300 arcseconds, the detector exported) the answer is `ready` with the patch key and the viewer opens. If not, the page calls `POST /api/prepare`, which queues a job. The job runs the pipeline (`implementation/scripts/cell_cache_demo.py`) as two subprocesses, `fetch` (search the archive, read the images with range requests) and `export` (build the display data), and the page polls `GET /api/jobs/{id}` for a progress bar. When the job is done the viewer opens on the new patch. `DELETE /api/jobs/{id}` cancels. `GET /api/health` says the service is up.

**Rules it keeps.**
- One pipeline job at a time, a queue of at most 5, and a position already being prepared is not started twice. The archive is public and shared.
- The collection (`spherex_dr1`) and the region size (0.2 degrees) are fixed. Coordinates are validated numbers, and nothing else a person types reaches a path or a command.
- A new patch folder that ends up with no data (a position with no images, or a cancelled job) is removed.
- Prepared data is sent with `Cache-Control: no-store`, because the pipeline rewrites it.
- Default detector is D6 (the fastest to prepare; one detector of a new position takes about 5 to 10 minutes from Thailand, probably 1 to 2 minutes from a host in the United States). Nothing is sent to any outside service except the archive requests the pipeline makes.

**Checks.** `uv run --script implementation/tests/server_check.py` tests the jobs with a stub pipeline in seconds, and `node implementation/tests/landing_check.js` drives the whole flow in a headless browser against the service with the stub. See [../tests/README.md](../tests/README.md).
