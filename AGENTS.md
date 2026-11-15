# AGENTS.md

Guidance for AI coding agents and humans working in this repository. Read it fully before you change anything.

Open decisions are marked `#TODO` and collected in [section 7](#7-open-decisions-todo-register). Grep for `#TODO` to find them all.

## 1. What this project is

Our entry in the **2026 NASA Space Apps Challenge** (hackathon: Saturday 14 and Sunday 15 November 2026). The team chose challenge **12, "Planet X and SPHEREx"** (Advanced; Astrophysics, Planets & Moons, Software).

- Challenge page: <https://www.spaceappschallenge.org/2026/challenges/planet-x-and-spherex/>
- Full statement and resources: [research/02-challenges-2026.md](research/02-challenges-2026.md) and [research/06-challenge-resources-2026.md](research/06-challenge-resources-2026.md)

**The challenge in short**

- NASA's SPHEREx mission maps the whole sky every six months in 102 near-infrared bands. Moving objects (comets, asteroids, brown dwarfs, possible new planets) show up when you compare images taken at different times, but the volume is too large for one person.
- **Build:** a public-facing web tool. The user enters sky coordinates (Right Ascension and declination) and sees a series of SPHEREx images of that patch, like a short video, to spot motion.
- **What the text does not require:** a time-range picker or automatic motion detection. NASA describes a viewer in which a person spots the motion. Anything beyond that is the team's call (the team chose viewer only on 14 Nov, see Decided in section 7).
- **Test targets from NASA:** Barnard's Star, Epsilon Indi B, WISE 0855 (RA 08h55m10.831s, Dec -7d14m42.53s), and the variable stars RW Aurigae and R Draconis.
- **Optional ideas from NASA:** easy updates as new data arrives; add or subtract images from different times; sum the six detector arrays for signal-to-noise; spectra on the fly; adjustable field of view; overlays from Gaia or WISE; URL-based coordinates for embedding; show contamination flags. NASA mentions Astropy and Aladin (CDS) as tools.

**What judges score** (1 to 5 each, at every level): Impact, Creativity, Validity (scientifically grounded, feasible, usable and complete), Relevance (NASA data is a core component, not an add-on) and Presentation (the demo and the full submission). See [research/01-event-2026.md](research/01-event-2026.md).

## 2. Hard rules

These come from the official Space Apps pages, as summarized in [research/01-event-2026.md](research/01-event-2026.md). They bind every agent action. When unsure, ask a human on the team.

1. *(Retired.)* The "no work before the hackathon" rule ended when the hackathon started on 14 Nov 2026. Rule numbers stay as they are, so references to rules 2 to 10 still hold.
2. **Super Intelligence (SI) use.** SI is the organizers' term for AI. SI tools may speed up the work, but they "should not be used to come up with your idea of how to solve the challenge". The solution design is the team's. Agents implement it.
   - Log every SI use in [docs/si-log.md](docs/si-log.md): date, tool, purpose and the files affected. The submission form asks how SI was used.
   - SI-generated images and video need a **visible watermark** that says they are SI-generated.
   - SI-generated audio, code and data must say so in their descriptive text and metadata (for example a header comment or a metadata field).
   - SI-generated content must not use or change NASA branding (logos, flags, mission identifiers).
3. **Licensing and provenance.**
   - Our original content must be freely available or under an OSI-approved open-source license. The team chose the MIT license on 14 Nov (see Decided in section 7 and the `LICENSE` file).
   - Every third-party item (code, data, text, images, fonts, even open-source ones) goes into [docs/references.md](docs/references.md) with its source and license, **in the same change that adds it**. The submission lists all of them.
   - Data or code that does not come from NASA or a space agency partner must be freely and publicly available or open-source licensed.
   - Never include copyrighted material without permission, proprietary or business-sensitive data, personal data, or export-controlled information (ITAR or EAR).
4. **NASA data must be central.** A Global Award needs at least one NASA data set or resource, and the Relevance score looks for NASA data as a core component. SPHEREx data from IRSA is our core data.
5. **People under 18.** No photo, video, audio or likeness of anyone under 18 in the demo or the submission.
6. **English.** The submission page and all linked materials are in English. A video demo may use another language only with English subtitles.
7. **Demo limit.** At most **7 slides** (title and intro included) **or a video of at most 30 seconds**. Projects over the limit are not eligible for global judging.
8. **Links must be public.** Judges open links without login, permission or registration. The form takes pasted or uploaded images only (JPG, PNG, GIF, up to 10 MB). Videos and documents go on a public host and are linked. Test every link in a private window.
9. **Deadlines.** The Project tab opens Saturday 14 Nov 09:00 and submission closes **Sunday 15 Nov 23:59** in the time zone of the team's Local Event (Universal Event: the Team Owner's local time). **The team entered the Universal Event** (decided 14 Nov), so the deadline is the Team Owner's local time, and the earlier Phayao date does not apply. Local events may judge earlier. Only the last saved submission is reviewed, and anything saved after the deadline is not judged. Click **Submit for Judging**, then re-check.
10. **Team eligibility (a human check, not an agent task).** Every member is registered and confirmed at the same Local Event (not waitlisted) or the Universal Event, with at most 6 members. The Terms & Conditions bar participation in connection with an affiliation with China or a Chinese-owned entity, and NASA decides eligibility in its sole discretion. Each member should read the Terms before the event.

## 3. Data and APIs: what is known

Source of truth: [research/07-spherex-data-check.md](research/07-spherex-data-check.md) (tested live on 13 Nov 2026). Do not duplicate it here. The essentials:

- **Archive:** NASA/IPAC Infrared Science Archive (IRSA), <https://irsa.ipac.caltech.edu/Missions/spherex.html>. Public, no login for queries.
- **Image search:** IRSA SIA2 at `https://irsa.ipac.caltech.edu/SIA`, which returns a VOTable. `t_min` (MJD) in the result can order images by time.
- **Collection names change with each release.** On 13 Nov they were `spherex_dr1`, `spherex_dr1_cube`, `spherex_dr1_deep`, `spherex_qr3` and `spherex_qr3_deep`. Old names such as `spherex_qr` return zero rows. Read the names from the service's own description, and keep them in one config place.
- **Two layers:** the SIA2 search result is only an index (one row per image: footprint, time, wavelength range, URL, no brightness values). The FITS files hold the measurements. Our own step turns pixels into display frames.
- **Products:** calibrated Level 2 multi-extension FITS images, floating-point, not raw counts and not 8-bit pictures (IMAGE, FLAGS, VARIANCE, ZODI, EPSF, WCS-WAVE; the PSF extension is named `EPSF` in the files). 102 bands from 0.75 to 5.0 micrometres, six detector arrays (D1 to D6). One image comes from one detector, so a position gets about 2 images per exposure and frames at the same time differ in wavelength. Each file has its own sky-coordinate mapping (`TAN-SIP` WCS), so frames need alignment.
- **Time coverage:** a position is observed in windows about 6 months apart, not evenly. WISE 0855 in `spherex_dr1` has 143 exposures in 4 windows over 374 days. Releases come in batches and their release dates roll out over weeks, so the data is static during the hackathon. Do not assume a regular frame rate.
- **Motion is small:** pixels are 6.15 arcseconds, so even a fast mover like WISE 0855 shifts only about 1 pixel over a year (assumed proper motion, to verify).
- **Findings and problems from the data alone:** [research/challenge-12/data-findings.md](research/challenge-12/data-findings.md).
- **Size:** one full image is about **65 MB**, and each NASA test target overlaps 115 to 451 images. **Never download a full frame in tests or in a request path.** To get one region of a frame, use a range read from the public S3 bucket (allowed by the team on 14 Nov 2026, see Decided) or the IRSA cutout service (docs: <https://irsa.ipac.caltech.edu/data/SPHEREx/docs/cutout_tool.html>), which stays the fallback. Both are slow from Thailand and much faster from a host in the United States (measured 14 Nov, see [research/challenge-12/README.md](research/challenge-12/README.md)).
- **Coordinates:** only WISE 0855 has an official position. Positions for the other test targets must be resolved from a catalog, not guessed.
- **Overlay and inspiration sources named by NASA:** Gaia DR3, WiseView (a similar tool for WISE data), and Canadian Space Agency NEOSSat and CADC data.
- **Cutout service, tested 14 Nov:** `<access_url>?center=RA,DEC&size=DEG` (decimal degrees; `size=0.2` gives about 117 px). A cutout holds all extensions and is about 4 MB, almost all of it the `EPSF` table; the pixel arrays are about 55 KB each. It takes about 10 s per request, and IRSA sometimes answers HTTP 503 (retry, keep parallel requests at 3 or fewer).
- **Tested 14 Nov (details in [research/challenge-12/README.md](research/challenge-12/README.md)):** SIA2, TAP, the cutout service and the `ibe` file server send **no CORS headers**, so a browser cannot call them directly. The public S3 bucket `nasa-irsa-spherex` does send them (`Access-Control-Allow-Origin: *`, range requests allowed), and its FITS files are uncompressed, so a browser could read one cutout region of a frame with two HTTP range requests (about 1 MB and 3.7 s for the IMAGE rows alone, about 2 MB with the VARIANCE rows the pipeline also reads, against 4 MB and 17 s from the cutout service). Finding which files cover a position still needs SIA2 or TAP, which means a server or a prebuilt index. Reading part of a full file is a different route from the cutout service. The team allowed it on 14 Nov 2026 (see Decided), and the cutout service stays as the fallback. astroquery and TAP work; plain HTTP plus astropy is enough. A cutout is about 4 MB however small it is, and a center outside the image returns HTTP 422. `FLAGS` bits (Table 16 of the Explanatory Supplement, version 2.0, read 15 Nov): 0 `TRANSIENT`, 1 `OVERFLOW`, 2 `SUR_ERROR`, 6 `NONFUNC`, 7 `DICHROIC`, 9 `MISSING_DATA`, 10 `HOT`, 11 `COLD`, 12 `FULLSAMPLE` (informational), 14 `PHANMISS`, 15 `NONLINEAR`, 17 `PERSIST`, 19 `OUTLIER`, 20 `CROSSTALK`, 21 `SOURCE` (a pixel mapped to a known source, 39% of a frame, not a defect), 22 to 24 ghosts, 25 `STREAK`, 26 `BLOOM`, 27 `SNOWBALL`, 28 `HALO`, 29 `SATELLITE_HALO`. `WCS-WAVE` is a 9 by 9 lookup of wavelength and bandwidth over the frame, so wavelength changes across one image.
- **Not yet tested:** rate limits (IRSA's search service answered HTTP 502 and timeouts for about ten minutes on 15 Nov, and HTTP 503 often before that), the Data Explorer, and whether the `qr2` and `qr3` S3 folders have the same layout as `dr1` (not needed: the team uses DR1 only).

## 4. Repository map

```
.
├── AGENTS.md               this file
├── start.sh, start.bat     start the local service and open the app in the browser
├── README.md               short public description
├── .gitignore
├── research/               background research (reference only)
│   ├── 01-07 *.md          event, challenges, winners, sources, resources, SPHEREx check
│   ├── summary.html        one-page summary
│   ├── data-use.html       how data feeds the 14 challenges
│   ├── raw/                dumps of official pages (gitignored, see #TODO)
│   ├── demo/               pre-existing simulated viewer (private archive only, not in the public repository)
│   └── challenge-12/       open research questions and data findings for SPHEREx, plus spherex-observing.html (explainer page on how SPHEREx observes the sky)
├── docs/
│   ├── data-flow.mmd       data flow diagram source (render to .svg and .png with mmdc)
│   ├── si-log.md           every SI use, for the submission
│   ├── references.md       every external source and license
│   ├── user-manual.md      how to start and use the app, and how it works (plain English); user-manual.pdf is built from it
│   ├── how-it-works.md     how the app works explained simply for anyone (plain words, drawn diagrams); how-it-works.pdf is built from it
│   ├── architecture.md     how the web app is built: parts, technologies, request flows, data formats, limits (for developers)
│   └── manual/img/         screenshots for the manual, taken from the running app
├── submission/             one draft per form field, plus the demo script and demo/ (the HTML and CSS motion-graphic demo video: source, voice-over, rendered MP4)
└── implementation/         the tool itself (code allowed since the hackathon started)
    ├── web/                browser front end: index.html (the landing page, the front door), lib/, and drafts/ (the viewer v1-studio-real.html, and draft 1 on sample data)
    ├── server/             app.py: the local FastAPI service that serves the app and prepares new positions on demand
    ├── tests/
    ├── scripts/            one-off helpers (data checks, cache warm-up)
    └── data/               cache (gitignored, except the display files of the five test targets, D6 only) and tiny test fixtures
```

`research/` is background. Do not import code or data from `research/demo/` (private archive only) into `implementation/`.

## 5. Tech stack: decided, Option B (details still proposals)

**Principle: lightweight and efficient.** Few dependencies, no build step where possible, small payloads, and it must run on a laptop or a free tier for the live demo. Every new dependency needs a one-line justification in [docs/references.md](docs/references.md). The team confirms or changes everything in this section.

**Decided 14 Nov: plain HTML, CSS and JavaScript for the front end, Python for the back end and the computing (Option B).** The deciding question was browser access to IRSA. Tested 14 Nov: SIA2, TAP and the cutout service send no CORS headers, so the browser cannot call them and a Python service is needed (the public S3 bucket does allow browser reads, see section 3). **Decided 14 Nov (delivery path): a static page plus pre-warmed patches for the five NASA test targets. Extended on 15 Nov at the Team Owner's request: a small local service (`implementation/server/app.py`, FastAPI) prepares any other position on demand while the page shows a progress bar.** The Python part runs the pipeline (`implementation/scripts/cell_cache_demo.py`) offline for the test targets and, through the service, on demand for new positions. Without the service, a prepared position opens and a new position shows a loading screen that says how to start the service and carries on by itself when it runs. There is still no hosting, so on-demand preparation works on a laptop that runs the service. The rest of this section is still a proposal.

| | Option A: static only | Option B: static plus thin Python service (proposed default) |
|---|---|---|
| Front end | Plain HTML, CSS and ES modules, `<canvas>` flipbook, no framework, no bundler | Same |
| FITS handling | In the browser (a small FITS reader) | On the server with astropy and numpy |
| IRSA access | Direct from the browser | Server proxies SIA2 and cutouts, then caches |
| Works only if | CORS allows it and cutouts are small and fast | Always |
| Cost | Cheapest to host (static files) | One small web process |

**Option B, as decided (the items below are still proposals):**

- **Front end:** plain HTML, CSS and ES modules. A `<canvas>` flipbook with play, pause, frame step and a time slider. State in the URL (`?ra=&dec=&fov=`) so views can be shared and embedded.
- **Server:** Python managed with `uv`. astropy and numpy for FITS and WCS. `httpx` for requests. A small web layer (FastAPI by default; Starlette if install size matters).
- **Frame pipeline:** SIA2 query, order by `t_min`, request a cutout per image, apply a percentile stretch, and return WebP or PNG frames with a JSON manifest (obs_id, `t_min`, band, flags). Cache on disk by position, field of view and collection, with a size cap (full frames are about 65 MB each, roughly 18 GB for one target).
- **Demo reliability:** pre-warm the cache for the five NASA test targets, so the demo works even if IRSA is slow.
- **Tests:** pytest with tiny fixtures. Format and lint with ruff. No heavy front-end test framework.
- **Optional extras, only after the core works:** Aladin Lite for sky context and catalog overlays; Gaia and WISE overlays; contamination flags from the FLAGS extension.
- **Hosting:** none for now (see Decided in section 7).

No version numbers are fixed here. Pin versions with the lockfile on 14 Nov.

## 6. Working agreements for agents

- Read this file and [docs/](docs/) before editing. Keep changes small and focused.
- **Log SI use and update references in the same change.** No exceptions: see section 2.
- Treat downloaded data as untrusted input. Parse FITS and VOTable with astropy, never with `pickle` or `eval`. Keep downloads in `implementation/data/cache/` and never commit them. The one exception, decided on 15 Nov (see Decided): the small display set of the five NASA test targets, detector D6 only, about 21 MB, made with `export --slim` (`sky.data.js`, `sky.index.js`, `sky.store.js`, `target.json`, `targets.js`; see `implementation/data/README.md`). Never commit FITS files, raw cutouts or other detectors.
- Be polite to IRSA. Cache, limit concurrent requests, never loop over the archive, and use a generic client name in the User-Agent. Send no personal information to any external service.
- **Scientific honesty.** Label any simulated or placeholder data as such in the UI and in the docs. Never present a candidate moving object as a discovery. Say what the data shows and what it does not.
- Keep the tool light: small payloads, no tracking, no needless dependencies.
- **Code state:** the runnable code is `implementation/server/app.py` (the local service: serves the app, prepares new positions on demand, `uv run --script`), `implementation/web/index.html` (the landing page: blank form, progress bar), `implementation/scripts/cell_cache_demo.py` (the pipeline the service runs), a demo of a lossy cell-based delta cache (run with `uv run --script`; see `implementation/scripts/README.md`), and the team's static UI drafts in `implementation/web/drafts/` (plain HTML, CSS and JavaScript, no build; `v1-studio-real.html` shows our real data). On 18 consecutive WISE 0855 frames from detector D1 the cache demo cut 840 KB of float32 pixels to 78 KB (10.7x) at 0.73 sigma rms error. Tried on all six detectors: 10.0x to 14.8x, with 0.73 to 0.80 sigma rms error (table in the scripts README). On every cutout of each detector over the whole year (260 fetched, 256 kept after dropping 4 edge cutouts; about 11.9 MB raw) it is 9.7x to 14.5x, about 1.0 MB in total. Its `view` command writes an HTML viewer to compare original, stored and difference frames. Its `export` command writes real frames for the team's web page `implementation/web/drafts/v1-studio-real.html` (style 1 Studio on real data, nothing simulated; the display files of the five test targets (D6) are committed, everything else stays in the gitignored cache, see implementation/data/README.md). The position is an argument (`--target NAME`, or `--ra --dec`); `resolve` looks names up in SIMBAD with the proper motion applied, `probe` counts images per collection, and `update` fetches only new images. The cache is keyed by position, size and collection and reused within 30 arcsec. The page decodes the lossy store in the browser (`implementation/web/drafts/cellcache.js`, checked identical to the Python decoder; `export --slim` halves the data file). Regions of frames are read with HTTP range requests on the public S3 bucket (`--via s3`, the default; the cutout service is the fallback; checked identical on one frame by `implementation/tests/s3_vs_cutout_check.py`). The pipeline runs by hand or through the service (`implementation/server/app.py`), which prepares a position that is not cached when the page asks. It is a demo, not yet part of the tool, and the stack is chosen (plain front end, Python back end) and the local service exists (no hosting). Checks (manual, no test framework): `uv run --script implementation/tests/server_check.py` (the service, stub pipeline), `node implementation/tests/landing_check.js` (landing page, loading screen and detector menu in headless Chrome against a stub service), `node implementation/tests/web_real_page_check.js` (the viewer on the prepared data), `node implementation/tests/cellcache_decode_check.js` (browser decoder against Python), `uv run --script implementation/tests/s3_vs_cutout_check.py` (network; the two data routes give identical pixels). The browser checks need Node 22 and Chrome or Chromium. Lint: `uvx ruff check implementation` (3 old warnings in `cell_cache_demo.py`).
- **Edit this file, not `CLAUDE.md`.** `CLAUDE.md` only imports this file. Put all project guidance here.
- Do not commit secrets. Do not push, publish or deploy without a team decision. Ask before any destructive git operation (force-push, hard reset, clean).
- Write user-facing text and docs in plain English.

## 7. Open decisions (#TODO register)

Each item is a question with a proposed default. Answer by editing the line, then delete the `#TODO` marker.

- #TODO: **Team and roles.** Known: two people, the Team Owner is `nacs-970` (see Decided), and the Team Owner's time zone is Thailand, UTC+7 (stated 14 Nov, so the deadline is Sun 15 Nov 23:59 UTC+7). Open: who owns the demo, the data pipeline and the front end.
- #TODO: **Overlays.** Add Aladin Lite and Gaia or WISE overlays? Default: not until the core flipbook works.

### Decided

- **Local Event: the Universal Event.** Decided by the team on 14 Nov 2026 (<https://www.spaceappschallenge.org/2026/local-events/universal-event/>). The deadline is the Team Owner's local time: Thailand, UTC+7 (stated by the Team Owner on 14 Nov 2026), so Sunday 15 Nov 23:59 UTC+7. A Universal Event team needs at least 2 members to be eligible for global judging, at most 6, and competes only against other Universal Event projects ([research/01-event-2026.md](research/01-event-2026.md)).
- **Team: two people; the Team Owner is `nacs-970` (GitHub handle).** Stated by the team on 14 Nov 2026. They share one laptop, so most commits carry the git user `Ma_Muang`, while `nacs-970` is usually the one who prompts the AI agent. Git authorship alone therefore does not show who did what. The SI log records the tool and the files, and a human reviewer fills the review column. That is two members, the Universal Event minimum for global judging.
- **Stack: plain HTML, CSS and JavaScript front end, Python back end and computing (Option B).** Decided by the team on 14 Nov 2026. **Server framework: FastAPI**, chosen by the Team Owner on 14 Nov 2026 (add `fastapi` and `uvicorn` to [docs/references.md](docs/references.md) when the first service code lands). The host is still open.
- **UI style: Studio (draft 1).** Locked by the team on 14 Nov 2026. Graphite panels, one electric-blue accent, Geist and Geist Mono, 6px corners (chips are pills), black by default with a light theme. The five other drafts were removed on 15 Nov 2026; they remain in the git history (last in commit `2929dea`). [implementation/web/drafts/](implementation/web/drafts/index.html) keeps draft 1 and the viewer.
- **Delivery path: static page plus pre-warmed patches.** Decided by the Team Owner on 14 Nov 2026. The five NASA test targets are built beforehand with the Python pipeline, and the page reads them as files. Extended on 15 Nov, see the next bullet.
- **Dynamic preparation by a local service.** Asked for by the Team Owner on 15 Nov 2026: the app opens on a blank page; a position that was prepared before opens at once; a new position is fetched and processed automatically by `implementation/server/app.py` (FastAPI) with a progress bar, and the same happens whenever the person changes the coordinates. One job at a time, default detector D6. `./start.sh` (or `start.bat`) starts the service and opens the browser. If the page is opened without the service, a new position shows a loading screen that says how to start it and carries on by itself when it runs. Hosting is still none, so this runs on a laptop; a judge who only opens the repository can use the prepared positions.
- **Data in the repository: a small display set.** Decided by the Team Owner on 15 Nov 2026. The display files (not FITS, not raw cutouts) of the five NASA test targets, detector D6 only, about 21 MB, are committed, so a person who opens the repository sees real images with no service and no wait. Every other patch, and the other detectors, stay in the gitignored cache. Details and rules: `implementation/data/README.md`; the NASA source and acknowledgement: [docs/references.md](docs/references.md).
- **Range reads from the public S3 bucket: allowed.** Decided by the Team Owner on 14 Nov 2026. Reading one region of a frame from `nasa-irsa-spherex` with HTTP range requests is a permitted way to get pixels (never the whole 65 MB frame). The IRSA cutout service is the fallback. SIA2 still finds the files.
- **Hosting: none for now.** Decided by the Team Owner on 14 Nov 2026. No deployed site is planned. The old private repository stays the archive. The public link for judges is the new repository `skyliner` (see Decided below), because judges need public links.
- **Scope: viewer only.** Decided by the Team Owner on 14 Nov 2026. A person looks at the frames and spots motion. No automatic candidate flagging, and helpers (blink, difference images, markers) only if the team adds them later.
- **Collection: `spherex_dr1`.** Decided by the Team Owner on 14 Nov 2026. QR3 is not used for now. Read collection names from the service, as before.
- **License: MIT.** Decided by the Team Owner on 14 Nov 2026 (the `LICENSE` file names the copyright holder: the team name, FixThisNoMistake, since 15 Nov). Third-party items keep their own licenses, listed in [docs/references.md](docs/references.md).
- **Project name and team name.** Chosen by the team on 15 Nov 2026: the project is **Skyliner**, the team is **FixThisNoMistake** (team page: https://www.spaceappschallenge.org/2026/find-a-team/fixthisnomistake/, Universal Event, challenge Planet X and SPHEREx; the page says it is a team of CS students from Chiang Mai University). The in-app brand, the manual and its screenshots were renamed to Skyliner the same day (the older name was "Sky Flipbook"; localStorage keys and the `SKYFLIP_*` environment variables keep their old prefix on purpose, so no stored setting is lost).
- **Public repository: a new one, `skyliner`.** Asked for by the Team Owner on 15 Nov 2026 ("create new pub repo skyliner"): <https://github.com/nacs-970/skyliner>, public, made from a snapshot of the final tree with one fresh first commit (option A in `submission/02-links.md`). The private repository `nasa-space-challange-2026-sphereX` stays as the archive. Its history holds personal data and must never be made public. The snapshot leaves out `research/demo/` (a simulated viewer of unknown authorship that existed before this file) and `research/summary.pdf` (stale). The contact details in `research/01-event-2026.md` and the browser-profile note in `research/05-sources-and-caveats.md` were removed from the files before the snapshot. `research/raw/` is gitignored and never ships.
- **Demo: a video of 24 seconds, on YouTube (unlisted).** Link: <https://youtu.be/zIq62jk0xJM>. Source, voice-over (Underdog Woof, voice Juno) and the MP4 are in `submission/demo/`. The video description on YouTube must carry the text of `submission/demo/DESCRIPTION.txt` (SI statement and the credit that the voice model's license requires).
- **Later, by the team:** each person's role.

## 8. Timeline (local time of the team's event)

- **Fri 13 Nov:** structure, docs, research and rules only (done).
- **Sun 15 Nov, status (afternoon):** the tool works end to end: blank landing page, prepared positions open at once, new positions are prepared by the local service with a progress bar, other detectors can be prepared from the viewer, and a small display set of the five test targets (D6) is committed so the repository shows real images with no service. Submission fields 01 to 05 and the two demo storyboards (06) are drafted and wait for review. Evening: the names are chosen, the demo video is made and hosted (YouTube, unlisted), the `research/` files are scrubbed and the public repository `skyliner` was made from a snapshot (the old private history holds personal data and stays private). Next: roles, a human click-through, the form, and submitting with margin before 23:59 UTC+7.
- **Sat 14 Nov:** the hackathon starts (Universal Event: the Team Owner's local time) and the Project tab opens at 09:00. Hour 0: the data-access tests are done ([research/challenge-12/README.md](research/challenge-12/README.md)) and the stack is settled.
- **Suggested milestones** (not commitments):
  1. One cutout, converted to one image, shown in a page.
  2. A flipbook for one NASA test target, ordered by time.
  3. Any coordinates, with URL state.
  4. Polish, plus one or two optional ideas from section 1.
  5. Demo recorded and submission drafted.
  6. **Submit early**, with margin before the deadline, then re-check every link in a private window.
- **Sun 15 Nov 23:59** (or the earlier local deadline): submission closes.
- **1 Dec:** participant survey due. **3 Dec:** Global Nominees announced.

## 9. Submission checklist

Drafts live in [submission/](submission/), one file per form field. The official source for every field and rule is the Project Submission Guide: <https://www.spaceappschallenge.org/resources/project-submission-guide/>. Before you click **Submit for Judging**:

- [ ] All form fields are complete (name, summary, demo link, final project link, detailed description, SI use, NASA data, partner data and other references).
- [ ] Demo is at most 7 slides or 30 seconds, in English, with no likeness of anyone under 18.
- [ ] Every link opens in a private window with no login.
- [ ] [docs/references.md](docs/references.md) matches the code and data actually used, with licenses.
- [ ] [docs/si-log.md](docs/si-log.md) is complete. SI-generated images are watermarked and SI-generated code and data are labeled.
- [ ] At least one NASA data set is named and is central to the tool.
- [ ] Both checkboxes ticked: the Terms & Conditions, and the originality and references statement.
- [ ] Every member is on the Members tab and not waitlisted.
- [ ] Submitted before the deadline, and the saved version is the one we want judged.
