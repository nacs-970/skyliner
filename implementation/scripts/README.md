# scripts/

One-off helpers: data-access checks, cache warm-up for the five NASA test targets, and similar. Keep each script small and documented at the top.

## cell_cache_demo.py

Demo of a lossy, cell-based delta cache for SPHEREx cutouts (SI-generated, see the file header for the design and its loss). Standalone: dependencies are declared inline, so there is no manifest or lockfile.

**Layout note (14 Nov):** the cache folders named below (`<detector>/`, `<detector>_full/`) now sit inside a patch folder such as `cell_demo/ra133.7951_dec-7.2451_s0.2_spherex_dr1/`, and raw files are named by observation id. See "Any position: the cache pipeline". The commands below default to WISE 0855.

```bash
uv run --script implementation/scripts/cell_cache_demo.py fetch --n 24 --detector D1   # D1 to D6; 24 consecutive images, small cutouts, 3 requests at a time
uv run --script implementation/scripts/cell_cache_demo.py demo           # encode, append test, decode, report
uv run --script implementation/scripts/cell_cache_demo.py fetch --detector D1 --full  # every image of the detector, all windows, into D1_full/ (add --full to demo and view too)
uv run --script implementation/scripts/cell_cache_demo.py export --detector D6 --full  # write <D6_full>/sky.data.js for the web front end (see below)
uv run --script implementation/scripts/cell_cache_demo.py view           # write viewer.html, then open it in a browser (add --min-coverage 0.95 to drop partial frames)
```

`view` writes a standalone page (`implementation/data/cache/cell_demo/viewer.html`, template in `cell_cache_viewer.html`). It shows four panels side by side, each with a mode menu. Default: original (real, current frame), previous original (real, frame k-1), stored (decoded from the cache), and original minus previous original. Other modes: previous stored, stored minus original (cache error), and stored minus previous stored. Hover any panel and the same pixel is marked in all four, with its pixel position, RA/Dec and cell index shown above the panels (click to pin it, click again to unpin; `#frame,x,y` in the URL opens with a pinned pixel). Gold cell outlines mark cells stored in the current frame. Slider, play and arrow keys step through frames; add `#5` to the URL to open at frame 6.

Add `--detector D1` to `demo` and `view` too (default D1). Each detector has its own folder, `implementation/data/cache/cell_demo/<detector>/` (gitignored), holding the raw cutouts, `store.cellcache` and `viewer.html`. `fetch` keeps one detector (`--detector`, default D1; `all` mixes detectors), then takes images in time order, with no gaps, from the observing window that has the most images (`--window`, `--start` choose another). For WISE 0855 in `spherex_dr1` no single detector has 24 images in one window: D1 has 20, D2 19, D3 18, D4 18, D5 19, D6 18. So the default gives 20 D1 images. `demo` and `view` then drop any frame where less of the grid has data than `--min-coverage` (default 0.8): two are dropped (one has 40% coverage, one almost none), leaving 18. Each file also gets its wavelength at the target from the `WCS-WAVE` table (the filter varies across the detector, so one detector is not one wavelength: here 0.74 to 1.12 micrometres, in steps of about 0.02). All frames are resampled onto one sky grid centred on the target (WISE 0855 sits at grid pixel 53.5, 53.5), so the same pixel is the same RA/Dec in every frame. Where a kept cutout is cut short by a detector edge (frame 12 has 84% coverage), the cache keeps the old value for the missing pixels, and the viewer shows them dark in every panel, including Stored, so old pixels are never passed off as new data. Earlier sets are in `data/cache/cell_demo/old_spread/` (24 frames over a year) and `old_d1d4_mix/` (24 frames, D1 and D4 alternating).

Result on the 18 D1 frames (2026-11-14): 840 KB of float32 pixels became 78 KB (10.7x; plain LZMA without loss gives 1.3x), 0.73 sigma rms error and 7 sigma worst case. 57% of cells are stored after frame 1 (72% with D1 and D4 mixed). Frames 10 and 11 change in every cell: frame 10 scatters 17 times more than its VARIANCE says, and frame 11 has a strong background gradient (not investigated; FLAGS are not kept). See the report the script prints.

### Range-read route (added 15 Nov 2026)

`fetch` now gets each region of a frame with HTTP range requests on the public bucket `nasa-irsa-spherex` (the team allowed this on 14 Nov). `--via s3` is the default; `--via cutout` uses only the IRSA cutout service, and a failed range read falls back to the cutout service for that image. A position outside the frame is reported as a failure and is not retried (the cutout service answers HTTP 422 for it).

- **What it reads.** The file is walked extension by extension (about 7 small header requests, because `FLAGS` is compressed and its size changes the offsets of the extensions after it), then the whole rows of `IMAGE` and of `VARIANCE` that hold the 117-pixel crop (about 1 MB each), then the small `WCS-WAVE` table. About 2 MB and 10 requests per image, against about 4 MB from the cutout service. No full frame is downloaded.
- **Same result.** `implementation/tests/s3_vs_cutout_check.py` compares both routes on one frame: identical `IMAGE` and `VARIANCE` pixels, the same wavelength and the same crop origin (the crop starts at the ceiling of the target pixel minus half the size, the rule the cutout service uses). The cut-out header is the full `IMAGE` header with `NAXIS1`, `NAXIS2`, `CRPIX1` and `CRPIX2` moved to the crop corner, so the rest of the pipeline is unchanged.
- **Same data end to end.** Rebuilding WISE 0855 detector D6 from scratch with range reads (15 Nov) gave the same result as the earlier cutout run: 45 images fetched, 1 dropped for low coverage, 44 used, a 142 KB store, 14.5x against raw float32, the same noise check (median 0.73).
- **All six detectors rebuilt (15 Nov).** WISE 0855 D1 to D6 with range reads gave 36, 48, 45, 35, 48 and 44 frames (256 in all, 4 edge cutouts dropped), the same counts as the earlier cutout run, and the page loads every detector.
- **Speed.** From Thailand an image takes about 8 s of wall time per worker (the path to the United States is slow: connect time 0.27 s). From a GitHub runner in the United States one range read of 1 MB took 0.5 s and one cutout 2.5 s (see `research/challenge-12/README.md`).
- **Search radius.** IRSA's SIA2 search gets very slow above about 0.05 to 0.1 degrees (a 0.3 degree circle timed out on 15 Nov, 0.05 degrees took 9 s). `fetch` uses 0.02 degrees and `resolve` uses 0.05 degrees (`RESOLVE_RADIUS`); keep any new search circle at 0.05 degrees or less.
- **Retries.** `http_get` now waits 5, 10, 15, 20, 25, then 30 s between tries (10 tries) instead of 10, 40, 90, 160 and 240 s. IRSA answers HTTP 503 (and sometimes 502) within a second, so the long waits only cost time. If IRSA is down for several minutes the fetch gives up on that image and the same command run again retries it.

### On demand, through the local service (15 Nov 2026)

`implementation/server/app.py` runs these same commands for a position typed in the web app: `fetch --ra --dec --detector D6 --full` and then `export` with the same arguments, one job at a time, reading the progress lines (`[k/N] ... about X min left`) for the progress bar. Nothing here changed for that except that the lines it reads must keep their shape: `cache: new patch ...` or `cache: reusing patch ...`, `keeping detector D6 only: N images`, and `[k/N] ... (x min elapsed, about y min left)`. See [../server/README.md](../server/README.md).

### Browser decoder for the cell store (added 15 Nov 2026)

`export` now also writes `sky.store.js` next to `sky.data.js`: the lossy cell store of that detector, re-packed for the browser (the same records, not LZMA compressed, because browsers cannot decompress LZMA natively; about 0.7 to 2 MB per detector, against 0.1 MB for the LZMA store). The page decodes it itself with `implementation/web/drafts/cellcache.js` (about 60 lines, no dependencies), so the "From the lossy cache" pixels are decoded in the browser and not by Python.

- **Same frames.** `node implementation/tests/cellcache_decode_check.js` decodes every exported patch and compares it with the frames Python decoded at export time: all 10 patch and detector pairs are bit-identical (maximum difference 0). Decoding takes 0.1 to 0.35 s. When both are present the page compares them itself and falls back to the export, with a console warning, if they ever differ.
- **`export --slim`** leaves the decoded cache frames out of `sky.data.js`, so the page gets them only from the store. WISE 0855 D6: `sky.data.js` 5.3 MB, or 2.8 MB with `--slim` plus the 0.9 MB store. The page shows the same picture either way (checked). The default stays the full export, because it is the version that gets cross-checked.
- **Without a store** the page still works from the export's cache frames, and if an export has neither, the "From the lossy cache" option is removed.

### Rebuild the pre-warm from nothing (15 Nov 2026)

The cache is gitignored except for the committed display set of the five test targets (detector D6 only, see `implementation/data/README.md`), so a fresh checkout has only that. These are the commands that rebuilt it on 15 Nov (WISE 0855 on all six detectors, and detector D6 of the four other NASA targets; the D1 to D5 loop below was added later the same day). Run them from the repository root, one after another (they are not meant to run in parallel):

```bash
PY="uv run --script implementation/scripts/cell_cache_demo.py"
for D in D1 D2 D3 D4 D5 D6; do $PY fetch --detector $D --full; $PY export --detector $D --full; done   # WISE 0855, position built in
$PY resolve "Barnard's star" "* eps Ind B" "V* RW Aur" "V* R Dra"                                      # SIMBAD, only the names are sent
for T in "Barnard's star" "* eps Ind B" "V* RW Aur" "V* R Dra"; do $PY fetch --target "$T" --detector D6 --full; $PY export --target "$T" --detector D6 --full; done
# the other five detectors of the four targets (one step at a time; it took 2 h 36 min from Thailand, about 930 images)
for T in "Barnard's star" "* eps Ind B" "V* RW Aur" "V* R Dra"; do for D in D1 D2 D3 D4 D5; do $PY fetch --target "$T" --detector $D --full; $PY export --target "$T" --detector $D --full; done; done
node implementation/tests/web_real_page_check.js                                                       # then check the page
```

Frames per detector kept on this machine on 15 Nov 2026 (after dropping edge cutouts under 80% covered):

| Target | D1 | D2 | D3 | D4 | D5 | D6 | All |
|--------|----|----|----|----|----|----|-----|
| WISE 0855 | 36 | 48 | 45 | 35 | 48 | 44 | 256 |
| Barnard's Star | 42 | 36 | 41 | 40 | 36 | 39 | 234 |
| Epsilon Indi B | 46 | 68 | 60 | 44 | 58 | 57 | 333 |
| RW Aurigae | 35 | 36 | 35 | 36 | 36 | 36 | 214 |
| R Draconis | 54 | 53 | 69 | 54 | 53 | 68 | 351 |


It reads about 2 MB per image and keeps about 110 KB. WISE 0855 took about 35 minutes for all six detectors from Thailand (260 images). If IRSA's search answers HTTP 502 or 503, wait a few minutes and run the same command again: files already fetched are skipped, so it carries on where it stopped. All six detectors of all five targets were prepared on 15 Nov (table below).

### All six detectors (WISE 0855, `spherex_dr1`, 2026-11-14)

Same rules for each: one detector, images consecutive in time (longest unbroken run), one target-centred sky grid, frames with under 80% coverage dropped.

| Detector | Wavelength at target (um) | Frames used | Time span (days) | Raw float32 | Cell store | Ratio | Cells stored after frame 1 | Error (rms sigma) |
|---|---|---|---|---|---|---|---|---|
| D1 | 0.74 to 1.12 | 18 of 20 | 3.7 | 840 KB | 78 KB | 10.7x | 57% | 0.73 |
| D2 | 1.10 to 1.62 | 19 of 19 | 3.2 | 886 KB | 85 KB | 10.5x | 55% | 0.76 |
| D3 | 1.62 to 2.38 | 18 of 18 | 4.6 | 653 KB | 65 KB | 10.0x | 57% | 0.76 |
| D4 | 2.43 to 3.83 | 17 of 18 | 3.0 | 793 KB | 73 KB | 10.9x | 54% | 0.76 |
| D5 | 3.81 to 4.40 | 19 of 19 | 3.2 | 886 KB | 60 KB | 14.8x | 39% | 0.80 |
| D6 | 4.41 to 4.98 | 18 of 18 | 4.6 | 746 KB | 54 KB | 13.8x | 43% | 0.77 |

- Plain lossless LZMA gets 1.3x on every detector.
- The longer-wavelength detectors (D5, D6) compress best: fewer cells change between frames.
- The grid is cut from the first frame's cutout, so when that cutout is short (D3: 97 rows, D6: 109 rows) the grid is smaller (84x108 and 96x108 px). The target is still at the grid centre.
- D2 and D5 have identical observing windows (same exposures), and D1 and D4 pair up in each exposure, as the D1 and D4 data showed. D3 and D6 have matching window sizes and spans, so they probably pair up the same way (not checked image by image). The three pairs are 0.75 to 1.1 / 2.4 to 3.8, 1.1 to 1.6 / 3.8 to 4.4 and 1.6 to 2.4 / 4.4 to 5.0 micrometres.
- Only WISE 0855 was tried. Other test targets need positions resolved from a catalog first.

### Every cutout of each detector, whole year (WISE 0855, `spherex_dr1`, 2026-11-14)

`fetch --full` takes every image of the detector from all 4 observing windows (374 days, gaps of months included) into `<detector>_full/`. Same grid and coverage rules. Failed downloads (IRSA answers HTTP 503 often) are listed at the end and retried by running the same command again.

| Detector | Frames used | Raw float32 | Cell store | Ratio | Cells stored after frame 1 | Error (rms sigma) |
|---|---|---|---|---|---|---|
| D1 | 36 of 38 | about 1,680 KB | 158 KB | 10.6x | 57% | 0.74 |
| D2 | 48 of 48 | about 2,240 KB | 195 KB | 11.5x | 52% | 0.79 |
| D3 | 45 of 45 | about 2,090 KB | 182 KB | 11.5x | 52% | 0.80 |
| D4 | 35 of 36 | about 1,630 KB | 168 KB | 9.7x | 62% | 0.72 |
| D5 | 48 of 48 | about 2,230 KB | 156 KB | 14.3x | 42% | 0.81 |
| D6 | 44 of 45 | about 2,060 KB | 142 KB | 14.5x | 42% | 0.82 |
| All six | 256 | about 11.9 MB | about 1.0 MB | about 11.9x | | |

- The ratios match the single-window samples above (9.7x to 14.5x against 10.0x to 14.8x): spreading frames over a year did not hurt much, because a cell is stored only when it changes.
- Plain lossless LZMA gets 1.3x on every detector. Worst-case pixel error is about 7 sigma (set by `T_MAX`).
- The raw column is the store size times the ratio (the report does not print it); the "All six" row is a sum.
- Four of 260 frames had under 80% coverage and were dropped (edge cutouts).

### Any position: the cache pipeline

Added 14 Nov. Everything above ran on WISE 0855 only; the position was fixed in the script. Now the position is an argument, and the cache follows the flow *look in the cache for this position, fetch what is missing, rebuild, show it*. It runs from the command line. The web page cannot start it, because IRSA sends no CORS headers (see `research/challenge-12/README.md`); a server or a team decision on the stack is needed for that.

```bash
S=implementation/scripts/cell_cache_demo.py
uv run --script $S collections                       # image collections the service offers now (read from the service, not hardcoded)
uv run --script $S resolve "Barnard's star" "* eps Ind B" "V* RW Aur" "V* R Dra"   # SIMBAD, only the name is sent; saved to cell_demo/known_targets.json
uv run --script $S probe --target "Barnard's star"   # images per collection and detector for a position, one cheap query each, no cutouts
uv run --script $S fetch --target "Barnard's star" --detector D6 --full     # or --ra 269.44 --dec 4.77 --name "my field"
uv run --script $S export --target "Barnard's star" --detector D6 --full    # writes sky.data.js, sky.index.js and cell_demo/targets.js
uv run --script $S update --target "Barnard's star"  # later: fetch only new or reprocessed images of the cached detectors, then re-export
```

- **Cache layout.** One folder per sky patch, named by the rounded centre, the cutout size and the collection, never by the free-text name: `cell_demo/ra133.7951_dec-7.2451_s0.2_spherex_dr1/`. It holds `target.json` (centre, size, collection, name, note on where the position comes from) and one `<detector>_full/` folder per detector with `raw/<obs_id>_<detector>.npz` (one file per image, keyed by observation id, never by a row index), `store.cellcache` and `store.params.json`.
- **Reuse.** A request within 30 arcsec of a cached patch centre (same collection and size) reuses that patch, and the progress line says so. The marker still goes to the requested position. A request further away starts a new patch.
- **Fetch only what is missing.** A cached file is skipped when its processing version (the `l2b-v27-...` part of the file URL) is the same. A new version is fetched again. Progress is printed as `[done/total]` with the time left, and written to `<patch>/progress.json` for a page or a server to poll.
- **Settings change.** `store.params.json` records `Q`, `T_CHI`, `T_MAX`, `CELL` and `MARGIN`. If they differ from the script, the store is rebuilt on the next `demo`, `view` or `export`.
- **`update`.** Asks the service again, fetches only new or reprocessed images for the detectors already cached, and re-exports those detectors. Checked on WISE 0855 D6: with nothing new it fetches nothing; with one raw file removed it fetched exactly that image and the export was byte-identical to before. It does not merge collections: a release with another collection name is another patch folder (the Collections `#TODO` in `AGENTS.md` is open).
- **Moving targets.** SIMBAD gives J2000 positions. `resolve` moves them to the median observing time of that target's images with the proper motion, because Barnard's Star moves about 10 arcsec a year and sits 272 arcsec (44 pixels) from its J2000 position by 2026. Without that the cutout would be centred on empty sky. Epsilon Indi B moves 121 arcsec (20 pixels). RW Aurigae and R Draconis move under 1 arcsec. Parallax and radial motion are ignored (far below one pixel). The marker shows the position at the median epoch, so a fast mover drifts away from it across the year, which is the motion the tool is for. The note on the page says where each position comes from.
- **SIMBAD server.** `simbad.cds.unistra.fr` answered HTTP 404 on 14 Nov (also for astroquery), so the script uses the Harvard mirror `simbad.harvard.edu`. Change `SIMBAD_TAP` at the top of the script if that changes.
- **Probe results (14 Nov, `spherex_dr1` / `spherex_qr3`, images at the position):** WISE 0855 260 / 0, Barnard's Star 244 / 124, Epsilon Indi B 348 / 120, RW Aurigae 227 / 111, R Draconis 427 / 127. Every target has DR1 images, so DR1 stays the default. QR3 images are later (MJD 61176 to 61316, about Nov 2026) and the DR1/QR3 consistency is untested.
- **Checked on 14 Nov (by hand, no test suite yet).** All six WISE 0855 exports were byte-identical before and after the refactor and the file migration. A forced settings change rebuilt the store with the same result. `update` with nothing new fetched nothing; with one raw file removed it fetched exactly that file; with one file marked as an older processing version it fetched that file again; each time the export was identical. A request 9 arcsec off reused the patch (no download), and one 60 arcsec off, with explicit coordinates, made a new patch and fetched one cutout (test folder deleted). In headless Chrome with real mouse, keyboard and menu events: the patch picker, the position box (opens a patch within 30 arcsec, says so when it matches, says how to build an uncached one, rejects 40 arcsec), the detector menu greyed for detectors that are not exported, and `?d=D9` removed from the address bar all behaved as described. For Barnard's Star the cutout does contain the star: a source of about 900 MJy/sr sits within 0.6 pixel of the marker in all three windows, so the proper-motion correction put the patch on target. The first run of this work had a bug found by these checks (old `resolve` results had no `note`, so every `--target` run crashed); it is fixed.
- **Pre-warm (14 Nov, 22:53):** D6 for Barnard's Star (41 images), Epsilon Indi B (59), RW Aurigae (38) and R Draconis (70); WISE 0855 has all six detectors. IRSA returned about 130 HTTP 503s over 1.5 hours and the retries handled them. `implementation/tests/web_real_page_check.js` finds a bright source on the marker for Barnard's Star, R Draconis and RW Aurigae, but not for Epsilon Indi B or WISE 0855 (faint; the check says nothing about them). Details in `docs/handoff.md`.
- **Not done:** a decoder for the cell store in the browser (the export still decodes in Python and ships float32), and cutouts larger than 0.2 degrees.

### Real data in the team's web front end

`export` writes `implementation/data/cache/cell_demo/<detector>_full/sky.data.js` (4 to 6 MB; 2 to 4 MB with `--slim`; gitignored, except the D6 files of the five test targets, which are committed) and a small `sky.index.js` (frame times and wavelengths only, about 3 KB, used for the timeline of all six detectors): the real pixels and the same frames decoded from the cell store, both float32 on the common grid, plus a no-data bit mask, observed times, wavelengths, `BUNIT` (`MJy / sr`) and the linear sky mapping. The page `implementation/web/drafts/v1-studio-real.html` (the teammate's style 1 page) loads it, one detector per page load: open it with `?d=D1` to `?d=D6` (default D6). To get data on a fresh checkout, run `fetch --detector D6 --full` and `export --detector D6 --full`, one pair per detector.

- The export mirrors the grid left to right, because the common grid keeps the first frame's orientation, which would draw the sky mirror-imaged. The page shows which way north and east point (a tilt of about 20 degrees). `export` stops with a message if the grid is not square or if no frame is kept.
- Within one detector the wavelength at the target still changes between frames (for example 4.41 to 4.98 um on D6), so a brightness change can be spectral, not variability.
- Nothing is simulated on that page: the mover, noise, drift and jitter are off, and the simulation panel is hidden. The badge says "Real SPHEREx data".
- Pixels: "Original (real)" or "From the lossy cache" (a toggle in the Display panel).
- Each frame has its own median removed for display, and the stretch is pooled over all frames of the detector, so the picture does not flicker with the background level.
- Pixels with no data in a frame are blue-grey, never filled in with old values.
- Hovering shows the pixel value in the file's unit, and RA/Dec from the linear fit (about 0.2 arcsec error).
- The timeline is built from the data: a ruler, an "All" row (windows of every exported detector, gaps in days) and one lane per detector with a tick for every real image. Click another lane, or its label, to show that detector at the same time. The timeline zooms: the mouse wheel over it (around the pointer), the `+`, `-` and Fit buttons or the keys `[` and `]` (around the playhead), Shift+wheel or dragging the ruler to move (a plain click on the ruler jumps the playhead there). Any time can be selected, also one with no observation (the gaps between windows, or between frames when zoomed in): the picture turns blue-grey with the message "No observation at this time" and the dates of the frames before and after, and the address keeps `?t=` (MJD). A click or drag within about 4 pixels of a frame snaps to that frame. Next frame, previous frame, window jumps and play start from the nearest frame after or before the empty time, double-click a window to zoom to it and double-click empty space to fit (down to a 6 hour view; the ruler switches from months to days to hours, and a zoomed timeline follows the playhead during playback). Detectors are not mixed in one flipbook. Windows are frame groups with gaps over 20 days. The address keeps the state: `?d=D2&f=20` (detector and frame) or `?d=D2&t=60986.9` (nearest frame to an MJD).
- It is tested in headless Chrome for D1 to D6 (frame counts 36, 48, 45, 35, 48, 44), the cache option, the bad-detector fallback and a scripted run of the controls (step, window jump, clip, scrub, marker, hover, play, switching detector from the timeline), with no console errors. The cache option still decodes in Python at export time; decoding the store in the browser is not done.
