# Skyliner: how the web app works (architecture)

Written 15 November 2026 with the help of an AI assistant (logged in [si-log.md](si-log.md)) for the team and for anyone who has to change or review the code. It says **what the web app is made of, which technology is used for what, and how the parts talk to each other**. It describes the code as it is now, and says plainly what is fragile or not done. For how to *use* the app, read [user-manual.md](user-manual.md). For a version anyone can read, with no jargon, read [how-it-works.pdf](how-it-works.pdf). For the rules and the decisions, read [../AGENTS.md](../AGENTS.md).

## 1. In one page

Skyliner has **three parts**:

| Part | What it is | Language and tools | Size |
|---|---|---|---|
| **The page** (front end) | A landing page and a viewer that play real SPHEREx images of one sky patch as a flipbook. | Plain HTML, CSS and JavaScript. No framework, no build step, no network calls except to the local service. | about 1,300 lines of JavaScript |
| **The service** (back end) | A small local web server. It serves the page and the data, answers "is this position prepared?", and runs the pipeline as a background job when it is not. | Python 3.10 or later, FastAPI, Uvicorn. | 310 lines (`implementation/server/app.py`) |
| **The pipeline** (computing) | Finds the images of a position in NASA's archive, reads a small region of each, lines them up, compresses them and writes display files. | Python, astropy, numpy. A command-line tool. | about 1,000 lines (`implementation/scripts/cell_cache_demo.py`) |

The data is **NASA's public SPHEREx data** from the IRSA archive. Positions of named stars come from SIMBAD.

**The idea that shapes everything.** The page is "just files". It reads display files that the pipeline wrote (`sky.data.js` and friends) with ordinary `<script>` tags. So it works when opened straight from disk, with no server at all, for every position that was prepared before. The service only exists to prepare *new* positions, because a browser cannot talk to NASA's search service directly (section 3).

```
                      NASA archive (IRSA, public S3 bucket)         SIMBAD
                              ^   search, read small regions           ^ names only
                              |                                        |
   browser  <--- files ---  cache folder  <---------- pipeline (Python, astropy) ----+
     |        (<script>)    (display files)                 ^
     |                                                      | runs as a background job
     +------ HTTP (JSON) ---------------------->  service (FastAPI): lookup, prepare, progress
              only to 127.0.0.1                         also serves the page and the files
```

## 2. Why it is built this way

| Choice | Reason |
|---|---|
| **Plain HTML, CSS and JavaScript** | The team chose it (14 Nov). It keeps the app light, readable and free of a build step, so a judge can open `index.html` and it works. |
| **Python for the computing** | astropy reads FITS files and applies the sky coordinate system (WCS) correctly. Writing a FITS and WCS reader in JavaScript would be slow to build and easy to get wrong. |
| **A Python service at all** | IRSA's search service (SIA2), TAP and cutout service send **no CORS headers**, so a web page cannot call them (tested 14 Nov). Something that is not a browser has to make those calls. |
| **A local service, no hosting** | The team decided on 14 Nov that no site is deployed. The service runs on the user's own machine and listens on `127.0.0.1` only. |
| **Prepared data as `.js` files** | A `<script src>` can load a file from disk, but `fetch()` of a local file is blocked in browsers. Wrapping the data as `window.SKY = {...}` lets the page work from `file://`. |
| **A lossy cache** | A year of cutouts for one detector is about 1 MB instead of 12 MB. It is for display only. |
| **Range reads from the S3 bucket** | One region of a 65 MB frame costs about 2 MB (the IMAGE and VARIANCE rows) and roughly 4 to 8 seconds instead of 4 MB and 10 to 17 seconds. The team allowed this on 14 Nov. The IRSA cutout service stays as the fallback. |

## 3. Technologies, layer by layer

### 3.1 Front end (runs in the browser)

| Technology | Used for |
|---|---|
| HTML5, CSS (custom properties for the theme, grid and flexbox) | Pages and layout. Dark and light themes are CSS variables. |
| JavaScript (classic scripts, one function scope per file, no modules, no libraries) | All behaviour. |
| `<canvas>` 2D (`ImageData`, `putImageData`) | Drawing the image: every frame is turned into grey levels by the stretch, pixel by pixel. |
| Typed arrays, `atob`, `DataView`, `TextDecoder` | Reading the base64 data and decoding the cell store. |
| `fetch` | Calls to the local service (`/api/...`). |
| `URLSearchParams`, History API | The view lives in the address (`?target=&d=&f=&t=&ra=&dec=`). |
| `localStorage` | Theme, display settings and sidebar state (keys `skyflip.real.theme`, `.params`, `.side`; the landing page shares the theme key), and whether the first-visit introduction was dismissed (`skyflip.introSeen`). |
| Pointer and keyboard events | Scrubbing, zoom, pan, shortcuts. |
| Geist and Geist Mono fonts (5.3.0, self-hosted), Phosphor icons (2.1.1, inlined SVG sprite) | Look of the interface. Licenses in [references.md](references.md). |

### 3.2 Service (runs on the user's machine)

| Technology | Used for |
|---|---|
| Python 3.10 or later, run by `uv run --script` | Starts the service. `uv` installs the dependencies named in the file header on first run. |
| FastAPI (with Starlette and Pydantic) | The routes, validation of RA, Dec and detector, and static files. |
| Uvicorn | The web server. |
| `subprocess` | Runs the pipeline as two child processes (`fetch`, then `export`). |
| One worker thread and a queue | One job at a time. |

### 3.3 Pipeline (command line, also run by the service)

| Technology | Used for |
|---|---|
| astropy | Reading FITS headers and VOTable, WCS (sky to pixel), WCS-WAVE (wavelength). |
| numpy | Pixel arrays, resampling, the cell store. |
| `urllib` | All requests (generic client name `sphereX-cache-demo/0.1`, retry with waiting). |
| `lzma`, `json`, `struct` | The compact cell store. |

### 3.4 Outside services the app talks to

| Service | What for | Browser or Python |
|---|---|---|
| IRSA SIA2 (`irsa.ipac.caltech.edu/SIA`) | "Which images cover this position?" One row per image. | Python only |
| IRSA TAP | Reading the collection names (`collections`, `probe`). | Python only |
| Public S3 bucket `nasa-irsa-spherex` | The image files. A region is read with HTTP range requests. | Python (the bucket allows browsers too, but the page does not use it) |
| IRSA cutout service | Fallback when a range read fails. | Python only |
| SIMBAD (Harvard mirror) | Position and proper motion of a named star. Only the name is sent, and only by the manual `resolve` command: the service and the page never call it. | Python only (developer command) |

### 3.5 Tooling for checks and documents

`uv`, `ruff`, Node 22 and headless Chrome (the browser checks and the screenshots), Python-Markdown and Pillow (the manual's PDF and its screenshot strips). None of these are needed to run the app.

## 4. What happens, step by step

### A. Someone opens `index.html` from disk and clicks a test target (no service)

1. The landing page loads `cache/cell_demo/targets.js` (`window.TARGETS`, the list of prepared patches) and shows a button for each test-target patch (names matching the five NASA targets; if the list is empty it shows a single WISE 0855 button).
2. A click calls `SkyPrepare.go(ra, dec, 'D6')` (`lib/prepare.js`). It first asks `GET /api/health` (2-second time-out). Nobody answers, so it looks in the page's own list (`window.TARGETS`) for a prepared patch that covers the position. There is one, so it resolves at once with the patch key. No data is fetched from anywhere. (With the service running, it asks the service instead: `GET /api/lookup`, case B.)
3. The page opens the viewer at `drafts/v1-studio-real.html?target=KEY&d=D6&ra=...&dec=...`.
4. The viewer's loader script reads `targets.js` again, picks the patch and the detector, and writes `<script>` tags for `sky.index.js` (the timeline of every prepared detector) and `sky.data.js` (this detector's pixels).
5. `app.js` sees `window.SKY` and switches to real-data mode: it decodes the pixels, builds the timeline from the frame times, draws the first frame.

### B. Someone types a position that was never prepared (service running)

1. The landing page validates RA and Dec (`lib/coords.js`) and calls `SkyPrepare.go`.
2. `GET /api/lookup?ra=&dec=&detector=D6` answers `missing`.
3. `POST /api/prepare` queues a job (or says the queue is full, or returns the job already running for that position).
4. The loading screen polls `GET /api/jobs/{id}` every 1.5 seconds and draws the progress bar.
5. The worker thread runs `cell_cache_demo.py fetch ...` then `export ...` and reads their output line by line to update the job (section 6.3).
6. When the job is `done`, the page opens the viewer on the new patch. The next visit to that position takes the path of case A.

### C. The service is not running when a new position is typed

`lib/prepare.js` asks `GET /api/health` with a 2-second time-out. If nobody answers and no prepared patch in the page's own list covers the position, it shows the loading screen with `./start.sh` and a Copy button, and asks again every 2 seconds. When the service answers, it carries on from step 2 of case B by itself.

### D. Someone chooses another detector

The viewer shows one detector per page load. A detector that is not exported is disabled, and with the service running it is marked "not prepared yet". With the service running, choosing it starts the same job as case B for that detector (the same patch, another `--detector`), and the viewer reopens at the same time.

## 5. The front end in detail

### 5.1 Files

| File | Role |
|---|---|
| `web/index.html`, `landing.css` | The front door: a blank page with the RA and Dec form and the test-target buttons. |
| `web/lib/coords.js` | Parses RA and Dec as degrees or sexagesimal, and limits what can be typed (digits, signs and `h m s d`). The viewer (`drafts/app.js`) keeps its own copy of the same rules, so a change must be made in both places. |
| `web/lib/prepare.js` | Client for the service: lookup, prepare, progress, cancel, "service not running" screen. It builds its own loading screen. |
| `web/drafts/v1-studio-real.html` | The viewer's markup and its loader script. |
| `web/drafts/app.js` | All viewer behaviour (about 1,060 lines). It started as the team's UI draft on sample data and switches to real mode only when `window.SKY` exists. |
| `web/drafts/cellcache.js` | Decodes the lossy cell store in the browser. |
| `web/drafts/base.css`, `skin-1-studio.css`, `real.css` | Layout, the Studio look, and the extra styles of the real page (timeline). |

### 5.2 State

There is no framework and no store object shared across files. State is:

- **In the address:** patch (`target`), detector (`d`), frame (`f`) or time (`t`), requested position (`ra`, `dec`). The address is rewritten with `history.replaceState` (`f` and `t` after a 400 ms delay, the rest at once), so a view can be bookmarked.
- **In `localStorage`:** theme, display settings, sidebar open or not. Reads and writes are wrapped in `try`, so a blocked storage only loses the memory.
- **In the page:** frame number, zoom, clip points and markers (none of these are saved).

### 5.3 How a frame gets on the screen

1. `sky.data.js` holds `orig`: all frames of one detector as **float32, little endian, base64**, frame by frame. The page decodes it once into a `Float32Array`.
2. Per frame, the page removes the frame's own median (the background level), then maps values to 0 to 255 with the **stretch** (linear, asinh or log) between the **black point** (in noise units, sigma) and the **white point** (a percentile pooled over all frames of the detector, so the picture does not flicker).
3. Pixels with no data in that frame (the `nodata` bit mask) are drawn blue-grey and never filled in.
4. The result goes into an `ImageData` and onto the canvas with `putImageData`. The canvas is drawn at the data's pixel grid and scaled by CSS; "None (true pixels)" turns smoothing off.
5. The "From the lossy cache" option does the same with the cell store decoded by `cellcache.js` instead of `orig`.

### 5.4 The timeline

Built from the data, never typed in. The frame times of every exported detector (`sky.index.js`, one `window.SKYIDX.D6 = {...}` per detector) give the observing windows (a gap of more than 20 days starts a new window), the gap labels in days, and one tick per image per lane. Zoom works on a view window `V0, VSPAN` in milliseconds; wheel, buttons and keys change it, and a zoomed timeline follows the playhead.

### 5.5 The browser decoder (`cellcache.js`)

The cell store is a sequence of records (section 8.5). The decoder reads the first frame in full, and for every later frame adds the stored deltas to the cells that changed. It matches the Python decoder to float32 rounding (`tests/cellcache_decode_check.js` compares them, but only on exports that are not slim, so on a fresh copy of the repository it compares nothing).

## 6. The service in detail

### 6.1 Routes

| Route | Meaning | Answer |
|---|---|---|
| `GET /api/health` | Is the service up? | `{ok, busy, queued}` |
| `GET /api/lookup?ra=&dec=&detector=` | Is this position prepared? | `{state: "ready", key, name, separation_arcsec}`, or the running job, or `{state: "missing"}` |
| `POST /api/prepare` with `{ra, dec, detector}` | Queue a job. | `202` and the job; `{state: "done", key}` if already prepared; `429` if 5 are waiting |
| `GET /api/jobs/{id}` | Progress. | the job (below) |
| `DELETE /api/jobs/{id}` | Cancel. | the job |
| `GET /` | Redirects to `/web/index.html` and keeps the query string. | |
| `/web/...` and `/data/...` | Static files (the page, and the cache). | sent with `Cache-Control: no-store` |

A job has `id`, `state` (`queued`, `running`, `done`, `failed`, `cancelled`), `step` (`queued`, `fetch`, `export` or `done`), `message`, `done`, `total`, `percent`, `eta_min`, `key` (the patch folder), `ra`, `dec`, `detector`, `error`, `tail` and `queue_position` (filled only while the job is queued).

### 6.2 Rules the service keeps

- **Inputs are validated** by Pydantic: RA 0 to under 360, Dec -90 to 90, detector `D1` to `D6`. Only these numbers reach the pipeline's command line; nothing else a person types ends up in a path or a command.
- **One job at a time** (one worker thread), a queue of at most 5, and a position already being prepared (within 30 arcseconds, same detector) is not started twice.
- **Fixed settings:** collection `spherex_dr1` and region size 0.2 degrees.
- **A prepared patch covers a position** when the patch centre is within 300 arcseconds and the detector is exported (the patch grid is about 108 pixels of 6.15 arcseconds).
- **Local only:** it listens on `127.0.0.1` by default. CORS allows only origin `null` (a page opened as a file) and `127.0.0.1` or `localhost` on any port.
- **Clean-up:** a new patch folder that ends up with no export (no images, or cancelled) is deleted. Old jobs are forgotten after 50.
- **Cancel** terminates the child process.
- **Settings by environment:** `HOST`, `PORT` (default 8000), `NO_BROWSER=1`, `SKYFLIP_CACHE` (where patches live), `SKYFLIP_PIPELINE_CMD` (tests replace the pipeline with a stub).

### 6.3 How progress is known

The service does not import the pipeline. It runs it as a child process and **reads its printed lines with regular expressions**: `cache: new patch KEY` or `cache: reusing patch KEY`, `keeping detector D6 only: N images`, `[done/total] ... (X min elapsed, about Y min left)`, and `SIA2:`. The bar covers 2 to 88 percent during `fetch`. `export` prints no progress lines, so the bar stays at 90 until the job is done and then jumps to 100. Error text is turned into plain sentences (for example "NASA's SPHEREx release DR1 has no images of this position. Try another position.").

**Fragile point:** if someone changes those printed messages in `cell_cache_demo.py`, the progress bar stops updating. The check `tests/server_check.py` covers it with a stub that prints the same lines.

## 7. The pipeline in detail

Run by `uv run --script implementation/scripts/cell_cache_demo.py <command>`. The commands the app depends on are `fetch` and `export`; the others (`collections`, `probe`, `resolve`, `update`, `demo`, `view`) are for people.

**`fetch` (per position and detector)**

1. **Search.** An SIA2 query (`POS=CIRCLE ra dec 0.02`, `COLLECTION=spherex_dr1`) returns one row per image: `obs_id`, detector, time `t_min`, and the file address. Duplicates are dropped and rows sorted by time.
2. **Read a region of each image.** Default route: the same file on the public S3 bucket. The reader asks for the FITS header with a few range requests, finds the extensions' byte offsets, computes which rows of the image cover the position, and reads those whole rows of `IMAGE` and `VARIANCE` (about 1 MB each) plus the small `WCS-WAVE` table. If it fails (except when the position is outside the frame, which is an error), it falls back to the IRSA cutout service (`?center=RA,DEC&size=0.2`). Each region is saved as `raw/<obs_id>_<detector>.npz` with its header, so a file already on disk is skipped (unless its processing version, the `l2b-v...` part of the URL, changed).
3. **Politeness:** generic client name, 2 requests at a time for a full fetch (3 at most), retries with growing waits on any network error (HTTP 503 is the usual one), progress lines for people and for the service.

**`export` (per position and detector)**

1. **Line up.** Every frame is resampled (bilinear) onto one sky grid centred on the patch, with the orientation and pixel size of the earliest of the largest cutouts. Frames with under 80 percent of the grid covered are dropped. The grid is mirrored left to right so that the page shows the usual sky view.
2. **Compress.** The grid is cut into 12 by 12 pixel cells. A cell is stored only if it changed by more than the noise; changes are rounded to half a noise step; the records are LZMA-compressed. About 10 to 15 times smaller than raw float32, average error about 0.7 times the noise. It drops FLAGS, ZODI and the PSF table.
3. **Write the display files** (section 8) and rewrite `targets.js`.

**Moving targets.** `resolve` looks up a name in SIMBAD (only the name is sent) and moves its J2000 position to the median observing time of its images with the proper motion. Barnard's Star is about 268 arcseconds (44 pixels) from its year-2000 position by 2026; without this the patch would be centred on the wrong place, with the star far off to one side. Only the developer command does this: a position typed in the page goes through the service as plain `--ra` and `--dec` and is used as typed.

**The cache and its reuse.** One folder per patch, named by the rounded centre, the size and the collection: `cell_demo/ra269.4463_dec4.7675_s0.2_spherex_dr1/`. A request within 30 arcseconds of an existing patch reuses it. If the compressor's settings change, the store is rebuilt.

**What the service prepares versus what is committed.** The service runs `export` without `--slim`, so its `sky.data.js` also holds the decoded cache frames (about 4 to 6 MB per detector for a patch like WISE 0855). The data committed in git (five test targets, detector D6, about 21 MB) is exported with `--slim`: the cache frames are left out and the page decodes them from `sky.store.js`.

## 8. Data formats

All files sit in `implementation/data/cache/cell_demo/`, and every one is a small JavaScript file that assigns a global, so a page can load it with `<script>` from disk.

### 8.1 `<patch>/<D>_full/sky.data.js` : `window.SKY`

| Field | Meaning |
|---|---|
| `det`, `w`, `h`, `n` | Detector, grid width and height in pixels (about 108), number of frames |
| `unit` | `MJy / sr` |
| `target` | `{name, ra, dec, note, x, y}`: the requested position, how it was found, and its pixel on the grid |
| `flipped_x` | `true`: the grid is mirrored left to right |
| `sky` | Linear sky mapping of the grid (`ra0, dec0, dra_dx, ...`) for the coordinate readout |
| `pix_arcsec` | 6.15 |
| `frames` | `[{obs, mjd, wave}]` per frame: observation id, time (MJD), wavelength at the target in micrometres |
| `orig` | Real pixels: float32 little endian, base64, frame-major |
| `cache` | The same frames decoded from the cell store (absent with `--slim`) |
| `nodata` | Bit mask, 1 = no data, one packed row per frame |
| `wave_range_um`, `min_cover`, `dropped`, `store_kb`, `raw_kb` | Summary numbers |

### 8.2 `<patch>/<D>_full/sky.index.js` : `window.SKYIDX.<D>`

`{det, n, wave_range_um, frames}`: only the frame list, about 3 KB. The timeline reads it for all detectors, so lanes of detectors that are not loaded can still be drawn.

### 8.3 `<patch>/<D>_full/sky.store.js` : `window.SKYSTORE`

`{det, w, h, cell, n, flipped_x, b64}`: the cell store, base64, for `cellcache.js`.

### 8.4 `cell_demo/targets.js` : `window.TARGETS`, and `<patch>/target.json`

`targets.js` lists the exported patches (`key`, `name`, `ra`, `dec`, `collection`, `size_deg`, `detectors`) for the landing page and the patch picker. `target.json` is each patch's manifest (name, centre, `note` on where the position came from, size, collection). The committed `targets.js` lists only the committed patches; running `export` on a machine with more patches rewrites it, and that change must not be committed (see `implementation/data/README.md`).

### 8.5 The cell store record

`u32 length`, a JSON head (`obs_id`, `band`, `t_min`, `wave_um`, `offset`, `step`, `dtype`, counts), a newline, and a payload: a bit mask of the cells that changed (numpy `packbits` order, row-major) followed by those cells' integer deltas (`int8`, `int16` or `int32` as `dtype` says). For each frame, the reference is first updated by `delta * step` for every changed cell, and the frame is then the reference plus `offset`. The Python file is LZMA-compressed per record; `sky.store.js` is not, because browsers cannot decompress LZMA natively.

### 8.6 `<patch>/progress.json`

`{detector, done, total, state, updated}`, written during `fetch`. The service reads the printed lines instead, but the file is there for other readers.

## 9. Safety, privacy and politeness

- **Untrusted data.** NASA's files are parsed with astropy only, never with `pickle` or `eval`. Downloaded data stays in the gitignored cache, except the small display set.
- **Inputs.** Validated numbers only reach the pipeline (6.2).
- **Local only.** The service listens on this machine, and CORS allows only local origins.
- **Privacy.** No tracking, no accounts, no cookies. Settings are in `localStorage`. The web app sends no name anywhere. The coordinates you type go to NASA's archive (the search service and the public file store) when a new position is prepared. A star's name goes to SIMBAD only when a developer runs the `resolve` command. No personal information is sent to any service.
- **Politeness to IRSA.** A generic client name, at most 3 requests at once, retries with waits, one job at a time, a small region instead of a whole frame, and a cache that is reused.
- **Honesty.** The page says "Real SPHEREx data", labels what is a position and not a detection, and never names a moving object.

## 10. How it is checked

There is no test framework yet. The checks are scripts you run (see [../implementation/tests/README.md](../implementation/tests/README.md)):

| Check | What it covers |
|---|---|
| `uv run --script implementation/tests/server_check.py` | The service routes, the queue, cancel and clean-up, with a stub pipeline. |
| `node implementation/tests/landing_check.js` | Landing page, loading screen and detector menu in headless Chrome against a stub service. |
| `node implementation/tests/web_real_page_check.js` | The viewer on the prepared data with real mouse and keyboard events; checks that the marker sits on the star for Barnard's Star. |
| `node implementation/tests/cellcache_decode_check.js` | The browser decoder against the Python decoder, on exports that are not slim (it compares nothing on the committed slim data). |
| `uv run --script implementation/tests/s3_vs_cutout_check.py` | (network) The range-read route and the cutout service give identical pixels. |

They need Node 22 and Chrome or Chromium. Nothing runs automatically.

## 11. Known limits and fragile points

- **The progress bar depends on the pipeline's printed text** (6.3).
- **One job at a time**, so a cold request waits behind another. A new position takes about 5 to 10 minutes from Thailand (IRSA often answers HTTP 503 and the pipeline retries).
- **One detector per page load**, and a new position is prepared on D6 only.
- **Only collection `spherex_dr1`** and a fixed 0.2-degree region. Positions DR1 does not cover fail with a plain message.
- **Data size.** Service-prepared data is not slim (about 4 to 6 MB per detector); the page loads it all as a script. A server that sent frames as images would be lighter, but it was not built.
- **No hosting.** The app runs on one machine. A public site would need a host, `HOST` set deliberately, and a review of the CORS and queue rules, because the archive is shared.
- **The lossy cache** is for display only.
- **The page reads only the cache and the local service.** It never calls NASA directly.
- **Pre-existing lint warnings:** 3 in `cell_cache_demo.py`.

## 12. Where to change what

| I want to... | Change |
|---|---|
| Change the look | `drafts/skin-1-studio.css`, `base.css`, `real.css` |
| Change how a frame is drawn or stretched | `drafts/app.js` (the drawing and stretch code) |
| Add a control to the viewer | `drafts/v1-studio-real.html` and `drafts/app.js` |
| Change what the landing page does | `web/index.html`, `lib/coords.js`, `lib/prepare.js` |
| Add an API route or change a rule | `server/app.py` |
| Change the region size, collection, or the compressor | the top of `scripts/cell_cache_demo.py` (and the matching constants in `server/app.py`) |
| Support another data release | `scripts/cell_cache_demo.py` (`collections`, `COLLECTION`), then the Collections decision in AGENTS.md |
| Prepare more detectors or targets by hand | the commands in [../implementation/scripts/README.md](../implementation/scripts/README.md) |
