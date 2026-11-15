# Handoff

Written Saturday 14 November 2026 (hackathon day 1, evening, Thailand time) by the AI agent (Claude Sonnet 5.5, through Claude Code) at the team's request, for the next person or agent who picks up this repository. It says what has happened, what is verified, what is broken or unfinished, and what to do next. Read [AGENTS.md](../AGENTS.md) first (rules, data facts, decisions), then this file. The checklist is in [todo.md](todo.md).

Nothing here is a claim about science results. The tool shows real SPHEREx images; it does not detect anything.

## Update, Sunday 15 November (morning, Thailand time)

Written by the AI agent (Claude Sonnet 5.5, through Claude Code) after the Team Owner answered the open questions. Read the rest of this file as the Saturday snapshot, and this block as what changed.

- **Decisions (14 Nov, Team Owner):** delivery path is a static page plus pre-warmed patches, no live service, FastAPI only if one is built later; range reads from the public S3 bucket are allowed; no hosting for now; scope is viewer only; collection is `spherex_dr1`; license is MIT (`LICENSE`, copyright holder still a placeholder); time zone is Thailand, UTC+7 (the deadline is Sun 15 Nov 23:59 UTC+7); the repository stays private for now (it must be public before the submission). The demo, the project name, the team name and the roles come later. All in `AGENTS.md` section 7, Decided.
- **Data fetch is faster and lighter:** `cell_cache_demo.py fetch` now reads one region of each frame with HTTP range requests on the S3 bucket (`--via s3`, default; the cutout service is the fallback). About 2 MB per image instead of 4 MB. Checked identical to the cutout route (`implementation/tests/s3_vs_cutout_check.py`, 8 of 8). Retry waits are shorter (5 to 30 s). Why downloads were slow: the path from Thailand to the United States (0.27 s connect time); a GitHub runner in the United States was about ten times faster. See `research/challenge-12/README.md`, last entries.
- **The cache was not on this machine** on Sunday 09:00 (`implementation/data/cache/` did not exist), so everything the Saturday snapshot says about the page and the pre-warm was the teammate's claim until rebuilt. The rebuild uses the range-read route. WISE 0855 D1 to D6 is rebuilt and matches the earlier numbers (36, 48, 45, 35, 48 and 44 frames; D6 store 142 KB, 14.5x). The four other targets (D6 only) are rebuilt too (finished 10:53) with the same frame counts as Saturday's table (Barnard's Star 39, Epsilon Indi B 57, RW Aurigae 36, R Draconis 68) and the same findings: the bright stars (Barnard's Star, R Draconis, RW Aurigae) sit within about 1 px of the marker, and the faint brown dwarfs are not visible in a single frame. The browser check passes 17 of 17. Barnard's Star shows a real drift of the star against the marker between observing windows (0.6, 1.5 and 1.6 px), as its proper motion of 1.7 px a year predicts. The check limit is 2.5 px for that reason (offsets up to 2.0 px were seen once more detectors were prepared). The resolve epoch is now MJD 60949 (it was 61110 on Saturday; the median of the images changes as DR1 grows). IRSA's search service failed for about ten minutes at 09:50, and its search timed out for circles above about 0.1 degrees, so `resolve` uses 0.05 degrees now (see `research/challenge-12/README.md`).
- **Page:** a "Requested position" ring (typed position inside the loaded patch, or `?ra=&dec=`), a Credits section with the acknowledgements the data providers ask for, and the browser check updated for both. Details are in `implementation/web/drafts/README.md`.
- **Submission:** `submission/01`, `03`, `04` and `05` are drafted and marked as awaiting review. `02` (links, with placeholders) and `06` (demo, two storyboards) were drafted on 15 Nov afternoon.
- **Licenses and terms** were read from the web pages (summary, not legal advice) and recorded in `docs/references.md`, with the acknowledgement wording.
- **Dynamic app (15 Nov, at the Team Owner's request):** the app now opens on a blank page (`implementation/web/index.html`), a typed position opens at once if prepared, and a new one is prepared automatically by the local FastAPI service (`implementation/server/app.py`, start it with `./start.sh`, which also opens the browser; a page opened without the service shows a loading screen and waits for it) while a progress bar shows how far it is. The same happens when the position is changed in the viewer. One job at a time, default detector D6, a queue of 5. There is still no hosting, so this needs the service running on a laptop. Checks: `implementation/tests/server_check.py` (32, with a stub pipeline), `implementation/tests/landing_check.js` (23, browser against the service with the stub), and one real run (see the SI log). The position boxes also got the stricter input rules (letters kept out, "abc12" no longer read as 12).
- **Still to do, in order:** run the browser check on the rebuilt cache; decide the demo format and record it; fill name, team and roles; scrub `research/`; make the repository public; click through the page in a normal browser; fill the reviewer column in `docs/si-log.md`; submit with margin before 23:59.

## 1. Where we stand in one paragraph

We chose challenge 12, "Planet X and SPHEREx". The team locked the UI style (Studio, draft 1), entered the **Universal Event**, and chose **plain HTML, CSS and JavaScript for the front end and Python for the back end and computing**. We have real SPHEREx data in a working static page: one sky patch per page load, six detectors, a zoomable timeline built from the real exposure times, and a patch picker. A command-line tool fetches small cutouts from IRSA for any position, caches them (keyed by position), compresses them with a lossy cell-delta store, and exports them to the page. **There is no Python service yet**, so the page cannot load a position that was not prepared on the command line. The demo, the submission form text and the video are not started. The submission deadline is **Sunday 15 November 23:59 in the Team Owner's local time**.

## 2. People, dates, process facts

- **Team:** two people. Team Owner: `nacs-970` (GitHub handle). They share one laptop, so most commits carry the git user `Ma_Muang`, while `nacs-970` is usually the one who prompts the agent. Authorship in git does not show who did what. A Universal Event team needs at least 2 members for global judging, so we meet the minimum, but both must be registered in the Universal Event (changing events is allowed until 15 Nov).
- **Deadline:** Sunday 15 Nov 23:59, Team Owner's local time. The Team Owner's time zone is not written down anywhere yet. Submit early and re-check every link in a private window. Only the last saved submission is judged.
- **Remote:** `origin` is the private repo `nacs-970/nasa-space-challange-2026-sphereX` (the name spells "challange"). All commits up to `c20c708` are pushed. Since 15 Nov the public repository is `nacs-970/skyliner` (a snapshot of the final tree with one first commit); this private one stays as the archive.
- **Agent house rules:** never edit `CLAUDE.md` (it only imports `AGENTS.md`); put all guidance in `AGENTS.md`. Log every AI use in `docs/si-log.md`. Put every third-party item in `docs/references.md` in the same change. Do not push, publish or deploy without the team asking. End commit messages with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. The user reads English; replies in this session were in a terse style, but commits and docs use normal prose.

## 3. Decisions made (and by whom)

| Decision | When | Where recorded |
|---|---|---|
| Challenge 12, Planet X and SPHEREx | before the hackathon | AGENTS.md section 1 |
| UI style: Studio (draft 1) | 14 Nov | AGENTS.md section 7, Decided |
| Local Event: Universal Event | 14 Nov | AGENTS.md section 7, Decided |
| Stack: plain HTML/CSS/JS front end, Python back end (Option B) | 14 Nov | AGENTS.md section 5 and 7 |
| Team: two people, Team Owner `nacs-970` | 14 Nov | AGENTS.md section 7, Decided |
| One full SPHEREx frame downloaded, once, as an illustration | 14 Nov, at the user's explicit request | docs/si-log.md |

Still open (the register in AGENTS.md section 7 is the source of truth): Team Owner's time zone and roles; scope; collections (DR1 only, or also QR3); server framework (FastAPI proposed); overlays; hosting; license; whether `research/` ships publicly; `research/demo/`; demo format; final project link.

## 4. What exists, by area

### 4.1 Repository (12 commits before this handoff was added)

```
AGENTS.md, CLAUDE.md, README.md        guidance (README still says "Status: planning", see section 7)
docs/                                  si-log.md, references.md, todo.md, handoff.md (this file), data-flow diagram
research/                              background research; challenge-12/ has the data findings and the observing explainer
submission/                            one draft per form field (01 to 05), the links template (02) and the demo script (06, two storyboards)
implementation/scripts/                cell_cache_demo.py (the data pipeline, command line) and its README
implementation/web/drafts/             draft 1 (sample data) plus v1-studio-real.html (real data); drafts 2 to 6 were removed on 15 Nov
implementation/tests/                  web_real_page_check.js and cdp.js (a manual browser check, see 5.3)
implementation/data/cache/             gitignored: raw cutouts, stores, exports, one full frame (225 MB); except the committed display set (five test targets, D6, about 21 MB, see implementation/data/README.md)
```

### 4.2 Data pipeline: `implementation/scripts/cell_cache_demo.py`

Run with `uv run --script implementation/scripts/cell_cache_demo.py <command>`. Details and results are in `implementation/scripts/README.md`. Short version:

- **Commands:** `fetch`, `demo`, `view`, `export` (older), plus `collections`, `probe`, `resolve` and `update` (added 14 Nov).
- **Position is an argument:** `--target NAME` (WISE 0855 built in, others after `resolve`) or `--ra DEG --dec DEG --name LABEL`.
- **Cache layout:** `cell_demo/<patch>/` where `<patch>` is `ra133.7951_dec-7.2451_s0.2_spherex_dr1` (rounded centre, cutout size, collection). Inside: `target.json` (manifest), `<detector>_full/raw/<obs_id>_<detector>.npz` (one file per image), `store.cellcache` plus `store.params.json`, and the exports `sky.data.js` and `sky.index.js`. `cell_demo/targets.js` lists every exported patch for the page; `cell_demo/known_targets.json` holds the SIMBAD lookups.
- **Reuse:** a request within 30 arcsec of a cached patch centre (same collection and size) reuses it. Files are skipped when their processing version (the `l2b-v27-...` part of the URL) is unchanged, and fetched again when it differs.
- **Store settings:** `Q`, `T_CHI`, `T_MAX`, `CELL`, `MARGIN` are recorded; changing any of them rebuilds the store.
- **Progress:** `[done/total]` lines with minutes left, and `progress.json` in the patch folder.
- **Lossy cache result:** 9.7x to 14.5x smaller than raw float32, 0.72 to 0.82 sigma rms error, worst pixel about 7 sigma. It is for display only, not for measurement (it drops FLAGS, ZODI and the PSF table).
- **Moving targets:** SIMBAD gives J2000 positions. `resolve` moves them to the median observing time of that target's images using the proper motion. Barnard's Star moves about 270 arcsec (44 pixels) by 2026 (272 arcsec to MJD 61110 in the first build on 14 Nov, 268 arcsec to MJD 60949 in the committed rebuild; the epoch is the median time of the images found, so it depends on which images were found), Epsilon Indi B 121 arcsec (20 pixels), RW Aurigae and R Draconis under 1 arcsec. SIMBAD's Strasbourg server returned HTTP 404 from here, so the script uses the Harvard mirror `simbad.harvard.edu` (`SIMBAD_TAP` at the top of the script).
- **Politeness to IRSA:** generic User-Agent `sphereX-cache-demo/0.1`, 2 parallel requests for a full fetch (3 at most), retry with backoff on HTTP 503 (IRSA returns 503 often). Only target names go to SIMBAD. No personal data goes to any external service.

### 4.3 The real-data page: `implementation/web/drafts/v1-studio-real.html`

- Same page as the team's v1 Studio, with real data. `app.js` (the team's file) switches to a real-data branch only when `window.SKY` exists, so v1 to v6 behave as before. Nothing is simulated in real mode.
- One detector per page load (`?d=D1..D6`, default D6), one patch per page load (`?target=KEY`, default WISE 0855), `?f=N` (frame) or `?t=MJD` (time).
- Timeline built from the data: ruler, an "All" row with observing windows and gap labels, and six detector lanes with one tick per real image. Wheel and button zoom, drag to pan, double-click to zoom to a window. Times with no observation can be selected and show a clear "No observation at this time" state.
- Sky patch picker and a position box. A typed position inside the loaded patch puts a ring on it and zooms (added 15 Nov, see the drafts README); one within 3 arcminutes of another patch's centre opens that patch; otherwise the page says which command builds it. **The page reads only the local cache; it never calls IRSA.**
- Pixels: original, or "from the lossy cache" (decoded in Python at export time, not in the browser).
- Data files are 4 to 6 MB per detector (float32 as base64), loaded by plain `<script>` tags from `../../data/cache/cell_demo/`. The page works from `file://`.

### 4.4 Explainer: `research/challenge-12/spherex-observing.html`

A self-contained page (no network, no libraries) on how SPHEREx chooses where to point and how its exposures add up. Parts are tagged real data, computed or schematic. Sources: the mission paper (arXiv:2404.11017) and the Caltech survey page. Both licenses are marked "to verify" in `docs/references.md`. It is not linked from the README or AGENTS.md yet.

### 4.5 Data facts established today

All in [research/challenge-12/README.md](../research/challenge-12/README.md) under "Answers", summarised in AGENTS.md section 3.

- **CORS:** IRSA SIA2, TAP, the cutout service and the file server send no CORS headers, so a browser cannot call them. The public S3 bucket `nasa-irsa-spherex` does (`Access-Control-Allow-Origin: *`, range requests allowed). This is why a Python service is needed.
- **S3 range reads:** the FITS files are uncompressed with fixed byte offsets, so a browser or server could read one cutout-sized region of a frame with two range requests (about 1 MB, 3.7 s, against 4 MB and 17 s from the cutout service). Verified byte-identical on the one frame we have. This is a partial read of a full frame, which AGENTS.md does not cover, so **the team must decide** whether to allow it. S3 has no spatial index, so finding the files that cover a position still needs SIA2 or TAP.
- **Cutout service:** `?center=RA,DEC&size=DEG`. A cutout is about 4 MB however small (the `EPSF` table dominates) and takes 10 to 17 s. A center outside the image returns HTTP 422 `Arrays do not overlap.`
- **astroquery and pyvo work; plain HTTP plus astropy is enough.** TAP tables: `spherex.obscore`, `observation`, `plane`, `artifact`, `provenance_input`. TAP is slower than SIA2 for position searches (19 s against 6 s).
- **FLAGS bits identified:** 0 `TRANSIENT`, 11 `COLD`, 17 `PERSIST`, 19 `OUTLIER`, 21 `SOURCE` (real sources, 39% of a frame, not a defect). Bits 1, 12, 26, 27, 28 unidentified (Table 10 of the Explanatory Supplement has them; not read). 59% of pixels unflagged.
- **WCS-WAVE:** a 9 by 9 lookup of wavelength and bandwidth over the frame. On D6 the wavelength runs from 5.02 um (first row) to 4.40 um (last row), so one 117-pixel cutout spans about one channel (0.036 um). That matches the 0.035 um step between exposures.
- **Probe, images per position (DR1 / QR3):** WISE 0855 260 / 0, Barnard's Star 244 / 124, Epsilon Indi B 348 / 120, RW Aurigae 227 / 111, R Draconis 427 / 127. QR3 images are later (MJD 61176 to 61316) and DR1/QR3 consistency is untested.
- **Time coverage (WISE 0855):** four observing windows over 374 days, gaps of 178, 27 and 129 days. Full frames cannot fill the gaps; they come from the real observing schedule.

## 5. Verification

### 5.1 What was checked (by hand, no automated test suite yet)

- All six WISE 0855 exports are byte-identical before and after the refactor and the migration of the old cache into the new layout.
- A forced settings change rebuilds the store with an identical export.
- `update`: with nothing new it fetches nothing; with one raw file removed it fetches exactly that file; with one file marked as an older processing version it fetches that file again; the export is identical every time.
- Reuse: a request 9 arcsec off reused the patch with no download; a request 60 arcsec off, with explicit coordinates, made a new patch and fetched one cutout (test folder deleted).
- The page controls in headless Chrome with real mouse, keyboard and menu events: patch picker, position box (opens a patch within 30 arcsec, says "matches", says how to build an uncached position, rejects 40 arcsec), detector menu greyed for unexported detectors, `?d=D9` cleaned from the address bar.
- Barnard's Star: the cutout contains the star. A source of about 900 to 1060 MJy/sr sits within 1 px of the marker in all three windows, so the proper-motion correction put the patch on target.
- A bug was found by these checks and fixed: old `resolve` results had no `note` field, so every `--target` run crashed with `KeyError: 'note'`. It killed the first pre-warm after Barnard's Star.

### 5.2 What was NOT checked

- No human has clicked through the page. All input was synthetic (Chrome DevTools). Mobile and small-window layout was not checked for the real page.
- The FITS viewer (`implementation/data/cache/fullframe/fits_viewer.html`) parses correctly in Node but its in-browser render was never seen (headless Chrome stalled).
- Rate limits of IRSA (not probed). The `qr2` and `qr3` S3 layout. Whether DR1 and QR3 can be combined.
- Whether motion of a faint mover such as WISE 0855 is visible by eye in this tool. A brightest-pixel check on WISE 0855 finds only unidentified pixels 3 to 8 px from the marker (peaks of 1 to 27 MJy/sr, far below Barnard's Star's 900), so it says nothing about the target. Do not claim a detection or visible motion without looking and without measuring.
- Whether Epsilon Indi B is detectable in a single D6 frame (see section 6: not shown). All six detectors are cached for the four new targets since 15 Nov 13:58 (see the coverage table in `implementation/scripts/README.md`).

### 5.3 How to re-run the browser check

```bash
node implementation/tests/web_real_page_check.js
```

Needs Node 22 or later and `google-chrome`, and the exported cache. Part 1 checks the controls; part 2 prints where the brightest source near the marker sits for every exported patch and detector. It fails (exit code 1) if a check fails. It is a manual check; there is no CI. The helper `cdp.js` is a small Chrome DevTools driver with no dependencies.

## 6. Pre-warm and final test results

**Pre-warm (done 22:53, Thailand time).** One detector (D6) for the four NASA test targets that are not WISE 0855, one target at a time with 2 parallel requests. About 1.5 hours in all, because IRSA returned about 130 HTTP 503 responses and the script waited and retried. Every file was fetched, no failures. R Draconis stalled for about 20 minutes in the retry backoff and then recovered without help.

| Patch (D6) | Images fetched | Frames in the export | Notes |
|---|---|---|---|
| WISE 0855 (all six detectors) | 260 | 36 to 48 per detector | position from NASA |
| Barnard's Star | 41 | 39 | 2 edge cutouts dropped; position moved 272 arcsec to MJD 61110 in the first build (the committed rebuild says 268 arcsec to MJD 60949) |
| Epsilon Indi B | 59 | 57 | position moved 121 arcsec to MJD 60950 |
| RW Aurigae | 38 | 36 | proper motion under 1 arcsec |
| R Draconis | 70 | 68 | proper motion under 1 arcsec |

**Browser check (`node implementation/tests/web_real_page_check.js`, run after the pre-warm): 12 of 12 checks passed, exit code 0.** That covers the patch picker, the position box, the greyed-out detectors, the cleaned URL, and the Barnard's Star position check.

**Is the marked position on a real source? (brightest source within 12 px of the marker, median per observing window, detector D6)**

| Target | Peak per window (MJy/sr) | Offset from marker | Reading |
|---|---|---|---|
| Barnard's Star | 941, 870, 1064 | within 1 px | clear bright source on the marker: the proper-motion correction worked |
| R Draconis | 3939, 4004, 2907 | within 1 px | clear bright source on the marker |
| RW Aurigae | 675, 451 (two windows) | within 1 px | clear bright source on the marker |
| Epsilon Indi B | 5 to 8 in four windows; 227 in one | about 0.5 px for the faint ones; the 227 one is 10 px away | **not shown.** The brightest pixels near the marker are only 5 to 8 MJy/sr, so this check cannot say whether Epsilon Indi B is detected in D6. The 227 MJy/sr window is a different, brighter source about 10 px away (not identified). |
| WISE 0855 (six detectors) | 1 to 27 | 3 to 8 px, scattered | **not shown.** The brightest pixels are far below a star and are not at the marker. Expected for a very faint object; it says nothing about the target. |

So the position pipeline is verified on three bright stars. For the two faint brown dwarfs (WISE 0855, Epsilon Indi B) it is not verified that the object is visible in a single frame. Whether its motion can be seen in this tool is untested; it needs a stack or a difference image over many frames, and a claim of a detection is not allowed without a measurement.

## 7. What needs fixing (known problems, most important first)

**Blocking the product**

1. **No Python service.** The page cannot load any position that was not fetched and exported on the command line. Build a small service (FastAPI proposed): look up the position in the cache (`find_patch`), start a fetch job in the background, report progress (`progress.json` already has the shape), and serve frames. The functions in `cell_cache_demo.py` can be reused, but the script mixes command-line and library code; it should be split into a module the service imports.
2. **Data delivery is heavy.** The export puts 4 to 6 MB of base64 float32 per detector into a `.js` file. A service should send frames as PNG or WebP (with a JSON manifest) or decode the cell store in the browser. A browser decoder for the cell store was not written.
3. **Hosting is undecided.** The Python service needs a public URL with no login (free-tier container host, or a laptop with a tunnel as fallback). Judges must be able to open it from their own networks.

**Submission blockers**

4. **`submission/` is empty.** All six form-field files are templates ("(fill in)"). The demo (at most 30 seconds, or at most 7 slides, English, no one under 18) is not started.
5. **No LICENSE file** in the repository. The license decision is open (Apache-2.0 is the proposed default and matches NASA's fallback).
6. **`research/` scrub before the repo goes public:** `research/01-event-2026.md` has two Local Leads' personal email addresses and a phone number, and `research/05-sources-and-caveats.md` describes a local browser-profile workaround. `research/raw/` is gitignored. Decide whether `research/` ships at all.
7. **`README.md` is stale** ("Status: planning. Implementation starts when the hackathon starts").
8. **Licenses marked "to verify"** in `docs/references.md`: IRSA data policy, the mission paper, the Caltech page, the S3 bucket, the Explanatory Supplement, SIMBAD acknowledgement text.
9. **SI-log reviewer column:** every row from 14 Nov says "(reviewer to fill)". A human must review and fill them. The form asks how AI was used.
10. **Team Owner's time zone and roles** are not written down.

**Smaller or known limitations**

11. `AGENTS.md` still says "never download full frames". We made one documented exception at the user's request, and range reads of S3 files are a new question. The wording should be updated once the team decides.
12. `update` does not merge collections: a release with another collection name is another patch folder. DR1 versus QR3 is the open Collections decision.
13. Only detector D6 is cached for the four new targets (WISE 0855 has all six). Other detectors need `fetch` and `export` per target.
14. Edge cutouts (under 80% covered) are dropped from the export, and the grid is sized from the earliest of the largest cutouts. Barnard's Star lost 2 of 41 images this way.
15. Draft 1 (`v1-studio.html`) still uses fixed placeholder windows and numbers; only the real page builds its timeline from data. The team chose Studio, and drafts 2 to 6 were removed on 15 Nov (they remain in the git history).
16. `implementation/scripts/cell_cache_demo.py` has 3 pre-existing ruff warnings (an unused `noqa`, a `zip` that could be `pairwise`, a `sorted` that could be `min`). No test suite, lint config or pytest exists yet.
17. The `view` command's standalone `viewer.html` still draws the sky mirrored; only `export` flips it.
18. The Position box accepts only the sample patch plus cached patches; the "Field" is fixed at 11.1 arcminutes (cutouts are 0.2 degrees).
19. The explainer is not linked from the README or AGENTS.md.
20. Two local servers may still be running: port 8765 (the FITS viewer, started by the agent; stop it with `kill` on its PID, or `pkill -f "http.server 8765"`) and port 8000 (`--directory web`, not started by the agent).

## 8. What to do next (suggested order)

The deadline is tomorrow night, so protect the submission first and the service second.

1. **Settle the owner facts (10 minutes):** Team Owner's time zone, each person's role, confirm both are in the Universal Event.
2. **Decide the delivery path for any-coordinate:** (a) a Python service that runs the existing pipeline on demand (slow cold start, 10 to 17 s per cutout, 115 to 451 images per target, so a cold request takes minutes and needs a progress bar), or (b) keep the page static and ship pre-warmed patches for the five NASA test targets with a clear message for other positions. Option (b) is safe for the demo; option (a) is the real product. A hybrid is possible: service for the lookup and progress, S3 range reads for pixels (needs the team's decision on range reads).
3. **Finish the pre-warm** for the remaining detectors of the four targets if the demo needs more than D6 (about 5 times the traffic; IRSA often returns 503, so run it in the background and do not raise parallelism above 3).
4. **Build the service minimum:** one endpoint that takes RA, Dec and detector, returns the manifest and frames for a cached patch, and a job endpoint for uncached ones. Keep the page's real-data branch unchanged where possible (it reads `window.SKY`; a service could return the same structure).
5. **Draft the submission** in `submission/` (name, summary, links, description, AI use, data and references) and the demo script. Use `docs/si-log.md` and `docs/references.md` as the source for the AI-use and references fields.
6. **Record the demo** (30 seconds, or 7 slides). Show a real flipbook on Barnard's Star (it moves about 10.4 arcseconds a year, about 1.7 pixels a year, so the motion is small: a person must look at the frames before the demo says anything about it), the timeline with real gaps, and the honest limits (the tool shows images, it does not detect).
7. **Scrub, license, make public,** then test every link in a private window. Submit early, with margin before Sunday 23:59.
8. **Human checks:** click through the page in a normal browser, check the FITS viewer, and check small windows.

## 9. Gotchas for the next agent

- Downloaded files are untrusted data. Keep scripts that read them in a different directory and run Python with `-I`. Do not run an interpreter from inside the cache folder.
- Never download full 65 MB frames in the tool or in tests. The one frame in `implementation/data/cache/fullframe/` is an illustration, logged in the SI log.
- Mark AI-generated code with a header comment, log every use, label simulated data in the UI, and never present a candidate as a discovery.
- `uv run --script` resolves the script's inline dependencies (numpy, astropy); the first run is slow. The browser check needs no packages.
- Scratch scripts from this session (probes, migration, the SIMBAD test) were in a temporary folder and are not in the repo. The migration of the old index-keyed cache into the position-keyed layout was a one-off and is done; the old single-window `D1` to `D6` folders moved into the WISE patch folder, and `old_d1d4_mix/` and `old_spread/` (earlier experiments) remain in `cell_demo/`.
- The agent's replies in this session were terse by the user's request. Commits, docs and code comments are normal English.
