# tests/

Automated tests. Use tiny fixtures only. Tests must not download full-frame SPHEREx images (about 65 MB each) and should not depend on live IRSA responses where a fixture will do. Empty until the hackathon starts.

## Manual browser check (14 Nov)

`web_real_page_check.js` drives the real-data page in headless Chrome (real mouse, keyboard and menu events) through `cdp.js`, a small Chrome DevTools helper. It needs the exported cache (gitignored), Node 22 or later and `google-chrome` or `chromium` (`$CHROME` overrides), and no packages. Run `node implementation/tests/web_real_page_check.js`. It is not a pytest suite and not run by CI. See `docs/handoff.md` section 5.

## Manual check: range reads against the cutout service (15 Nov)

`s3_vs_cutout_check.py` gets one region of one public frame (WISE 0855, detector D6) with the range-read route and with the IRSA cutout service, using `fetch_one_s3` and `fetch_one` from `implementation/scripts/cell_cache_demo.py`, and compares `IMAGE`, `VARIANCE`, the wavelength and the position of the target. It costs one search query, one cutout request (about 4 MB) and about 2 MB of range reads, and stores nothing. Run `uv run --script implementation/tests/s3_vs_cutout_check.py`. It needs the network, is not run by CI, and exits with 1 if a check fails. Result on 15 Nov 2026: all 8 checks passed (identical pixels over 117 by 117, same wavelength 4.968499 um, same crop origin).

Result on 15 Nov 2026 on the rebuilt cache: 17 of 17 checks pass. They now include the "Requested position" ring (typed position inside the patch, Esc through the zoom history, the checkbox, `?ra=&dec=` on load) and a limit of 2.5 px for Barnard's Star, because its proper motion (1.7 px a year) moves it that far from the marker between observing windows.

## Manual check: browser decoder for the cell store (15 Nov)

`cellcache_decode_check.js` loads `implementation/web/drafts/cellcache.js` in Node and decodes `sky.store.js` of every exported patch and detector, then compares the frames with the cache frames in `sky.data.js` that Python decoded at export time. Run `node implementation/tests/cellcache_decode_check.js` (the exported cache is needed, Node 18 or later, no packages). Result on 15 Nov 2026: all 10 pairs identical, maximum difference 0. `web_real_page_check.js` also checks that the page labels the option "decoded in the browser", that switching to it redraws the picture, and that the page logs no cell-store warning.

## Manual checks of the service and the app flow (15 Nov)

- `server_check.py`: `uv run --script implementation/tests/server_check.py`. Tests the local service with a stub in place of the real pipeline, in seconds and without touching the archive: input validation, lookup, prepare, progress, the same position asked twice, the queue (one job at a time), cancelling, a failed job, cleanup of a failed new patch, the static files and the home redirect. 32 checks.
- `landing_check.js`: `node implementation/tests/landing_check.js`. Starts the service with the stub and drives the app in headless Chrome: the blank landing page, letters kept out of the boxes, a bad entry, a prepared position that opens at once (typed in hours and degrees), a new position with the loading screen, its steps and bar, and then the viewer, the `?ra=&dec=` link, cancelling, and a position with no images. 23 checks, including the page opened as a file with no service running (it waits, then carries on by itself when the service starts).
- The real end to end run (real pipeline, a position never prepared before) is recorded in `implementation/server/README.md` and the SI log, not in a script, because it takes minutes and reads from the archive.
