# To-do list

Status as of Saturday 14 November 2026 (hackathon day 1). This list gathers the open work from the sessions so far and the `#TODO` register in [AGENTS.md](../AGENTS.md) section 7. The register stays the source of truth for team decisions. Tick a box here when the item is done.

## Where the open items stand (15 Nov, midday)

Every item below that is still unchecked needs a person or a team decision, or is blocked, except the one marked "running".

- **Done:** detectors D1 to D5 for the four other targets were prepared on this machine (finished 15 Nov 13:58, 40 steps, no failure; see below). Only D6 of each is committed to the repository.
- **Human only:** fill the reviewer column in `docs/si-log.md`; test the page with a real mouse and keyboard; look at the page on a real phone; record the demo; check the Members tab; click Submit for Judging and test every link in a private window; the survey after the event.
- **Team decision:** team and roles; overlays.
- **Blocked:** the FITS viewer (its files are not on this machine).

## 1. Housekeeping from the current session

- [x] Push local commits (done 14 Nov, up to `c20c708`).
- [x] Stop the local web server on port 8765. It serves the FITS viewer from `implementation/data/cache/fullframe/` on 127.0.0.1 only. Checked 15 Nov: nothing listens on 8765 or 8000 on this machine (and the full-frame folder is not here).
- [x] Confirm the model name written in `docs/si-log.md` (currently Claude Sonnet 5.5). Confirmed 15 Nov: the agent is Claude Sonnet 5.5 (`claude-sonnet-5-5`) through Claude Code.
- [x] Tell the teammate who builds the UI drafts that `implementation/web/drafts/app.js` now has a real-data branch. It only activates when `window.SKY` exists, so the drafts are unchanged.
- [ ] Fill the reviewer field in the explainer's row of `docs/si-log.md`.
- [x] Verify the licenses of the two explainer sources in `docs/references.md` (mission paper arXiv:2404.11017 and the Caltech survey page). Done 15 Nov: the arXiv non-exclusive distribution license (no reuse beyond arXiv, so we paraphrase only) and no license statement on the Caltech page (footer links an Image Use Policy that was not read). A person should still read both.
- [x] Add the explainer (`research/challenge-12/spherex-observing.html`) to the challenge-12 README or the repository map in `AGENTS.md`. Done 15 Nov (repository map in `AGENTS.md`).

## 2. Make the pipeline work for any coordinate

Today the target is hardcoded (`TARGET` in `implementation/scripts/cell_cache_demo.py`), `fetch` and `export` are run by hand, and the web page only reads pre-built files. The wanted flow is: check the cache for a related position, fetch what is missing, build the cache, then show it in the tool.

- [x] Make the target a command-line argument (`--ra --dec --name`, or `--target NAME`) and key the cache by position, field of view and collection.
- [x] Reuse a cached position within a tolerance (30 arcsec), and fetch only the missing cutouts.
- [x] Key raw files by `obs_id` and detector instead of row index, so new releases do not break the cache.
- [x] Rebuild the store when `Q`, `T_CHI`, `T_MAX`, `CELL` or `MARGIN` change.
- [x] Add an incremental `update` command (done: fetches only new or reprocessed images, `collections` reads the names from the service, `target.json` is the manifest). Not done: merging several collections into one patch.
- [x] Add a progress state for a cold request (done in the command line and in `progress.json`; the page cannot start a fetch, see the stack decision).
- [x] Pre-warm the cache for the five NASA test targets (done 14 Nov: WISE 0855 all six detectors; the other four D6 only, about 208 cutouts). Open: the other five detectors for those four targets, if the demo needs them.
- [x] Resolve positions for Barnard's Star, Epsilon Indi B, RW Aurigae and R Draconis from a catalog (SIMBAD, Harvard mirror, only the names sent), with proper motion applied to the observing epoch.
- [x] Range-read fetch route (15 Nov, team allowed it): `fetch` reads one region of each frame from the public S3 bucket (`--via s3`, default), with the cutout service as fallback; shorter retry waits. Checked identical to the cutout route on one frame (`implementation/tests/s3_vs_cutout_check.py`).
- [x] Rebuild the data cache on this machine (it was not here on 15 Nov 09:00). Done 15 Nov 10:53 with range reads: WISE 0855 on all six detectors and D6 of the four other targets, with the same frame counts as the 14 Nov pre-warm (36, 48, 45, 35, 48, 44; 39, 57, 36, 68). The browser check passes 17 of 17 (`node implementation/tests/web_real_page_check.js`). Commands: "Rebuild the pre-warm from nothing" in `implementation/scripts/README.md`.
- [x] Dynamic app (15 Nov, Team Owner's request): blank landing page, lookup, automatic preparation of an unknown position with a progress bar, repeat for a new position. `implementation/server/app.py`, `implementation/web/index.html`, `implementation/web/lib/`, `start.sh`; checks `server_check.py` and `landing_check.js`. A real run prepared a never-seen position (RA 134.4099, Dec -9.0238, D6) in 7 minutes from Thailand, 44 frames, and the viewer opened on it.
- [x] Position boxes: letters cannot be typed, bad entries are marked, and the parser is strict (15 Nov).
- [x] Real-data page: first-visit introduction (with a link to Barnard's Star, dismissed once, back under Credits), the gallery `index.html` and the README now link to the real-data page (15 Nov).
- [x] Real-data page: "Requested position" ring and re-centring inside a prepared patch (typed position or `?ra=&dec=`), 15 Nov.
- [x] Clean-room run (15 Nov): a copy of the tracked and untracked files with no cache. The service started and created the cache folder itself, both stub checks passed in it, and a never-seen position (RA 134.4099, Dec -9.0238, D6) was prepared from nothing in 8.5 minutes (44 frames, 13:58 to 14:06 UTC+7); the link `/?ra=134.4099&dec=-9.0238` then opened the viewer on it. A fresh `git archive` of the repository also opens its five test targets as a plain file and from a plain static server.
- [x] Prune UI drafts 2 to 6 (15 Nov): five page files, five skin files and the Outfit font (only draft 5 and 6 used it), with the gallery, the drafts README, `docs/references.md` and the submission drafts updated. They remain in the git history. Revert with `git restore` of those paths if the team wants one back.
- [x] Commit a small prepared data set so the repository shows real images with no service (15 Nov, Team Owner's decision): the five NASA test targets, detector D6, `export --slim`, about 21 MB. Rules in `implementation/data/README.md`.
- [x] Prepare more detectors (D1 to D5) for the four targets other than WISE 0855. Done 15 Nov, 11:22 to 13:58 from Thailand (about 930 images, one job at a time, every step exited 0). All five targets now have all six detectors on this machine; the repository holds D6 only (the cache is 514 MB). The viewer's checks pass on it (41 page checks, decoder check on 26 patch and detector pairs).
- [x] Prepare a detector from the viewer (15 Nov): with the local service running, the detectors that are not prepared for a patch can be chosen in the Detector menu (or by clicking their timeline lane); the loading screen shows progress and the same patch opens on that detector at the same time. Without the service they stay greyed out. Check: `implementation/tests/landing_check.js` (stub service, no fetch).
- [x] Add a decoder for the cell cache in the browser. Done 15 Nov: `implementation/web/drafts/cellcache.js` decodes `sky.store.js` (bit-identical to Python on all 10 patch and detector pairs, `implementation/tests/cellcache_decode_check.js`); `export --slim` halves `sky.data.js`.
- [x] Try larger cutouts for more detail per frame. Tried 15 Nov on three D6 images of WISE 0855 with a 0.4 degree region: 4.0 MB read per image (2.1 MB for 0.2 degrees) and 438 KB kept (110 KB), so the data files would be 4 times bigger (about 22 MB per detector, 11 MB with `--slim`). Not recommended for a page that ships its data; the patch size stays 0.2 degrees unless the team wants a bigger field (a team decision). The test files were deleted.
- [x] Clean up the `?d=D9` leftover in the URL of the real-data page.

## 3. Hour-0 research (not done)

- [x] Test CORS headers on the IRSA SIA2 and cutout endpoints. Result: none, so a server is needed. The S3 bucket has CORS and allows range reads (see `research/challenge-12/README.md`).
- [x] Test cutout edge behavior, astroquery calls, TAP table names and the S3 bucket listing.
- [x] Find the meaning of the `FLAGS` bits and the contents of `WCS-WAVE`. Done 15 Nov: all bits in Table 16 of the Explanatory Supplement are identified (see `research/challenge-12/README.md`), `WCS-WAVE` fully read.
- [x] Decide whether range reads from the S3 bucket are allowed (a partial read of a full frame). Allowed by the Team Owner on 14 Nov.
- [x] Check the `qr2` and `qr3` S3 layout: not needed (DR1 only, decided 14 Nov).
- [x] Probe rate limits. Closed 15 Nov without probing, on purpose: a probe means hammering IRSA. What was seen instead: HTTP 503 often, HTTP 502 and timeouts for about ten minutes on 15 Nov, and searches above about 0.1 degrees time out (see `research/challenge-12/README.md`). The pipeline asks slowly (2 to 3 requests at a time, 5 to 30 s retry waits).

## 4. Testing

- [ ] Test the real-data page with a real mouse and keyboard. So far only scripted events were run.
- [ ] Look at the real-data page on a phone. A headless phone-size render (390 by 844 and 820 by 1180) showed no sideways scroll, and the month labels were changed on 15 Nov so they no longer overlap. A person should still look on a real phone.
- [ ] Look at the FITS viewer render in a real browser. Blocked on 15 Nov: the viewer and the 65 MB full frame it reads were in `implementation/data/cache/fullframe/`, which is not on this machine. It is the teammate's illustration tool, outside the product (the tool no longer needs full frames). Rebuilding it would need the one-off full-frame download again, so it is the team's call whether to bother.

## 5. Team decisions (`#TODO` register, AGENTS.md section 7)

- [x] **Local Event.** The Universal Event (decided 14 Nov). Deadline: the Team Owner's local time. Needs at least 2 members for global judging. Check that every member is registered in the Universal Event (changing events is allowed until 15 Nov).
- [ ] **Team and roles.** Known: two people, Team Owner `nacs-970`. The Team Owner's time zone is Thailand, UTC+7 (stated 14 Nov; the deadline is Sun 15 Nov 23:59 UTC+7). Still open: who owns the demo, the data pipeline and the front end. Original question: At most 6 people, who is the Team Owner, and who owns the demo, the data pipeline and the front end.
- [x] **Stack.** Plain HTML, CSS and JavaScript front end, Python back end and computing (Option B, decided 14 Nov). Next: build the Python service (the page cannot call IRSA).
- [x] **Scope.** Viewer only (decided 14 Nov). No automatic candidate flagging. Helpers only if the team adds them later.
- [x] **Collections.** `spherex_dr1` only (decided 14 Nov).
- [x] **Server framework.** FastAPI (chosen by the Team Owner, 14 Nov). Log `fastapi` and `uvicorn` in `docs/references.md` with the first service code.
- [ ] **Overlays.** Aladin Lite and Gaia or WISE overlays. Default: not until the core works.
- [x] **Hosting.** None for now (decided 14 Nov). The repository must still be public before the submission, because judges need a public link.
- [x] **License.** MIT (decided 14 Nov). Done 15 Nov: the `LICENSE` holder is now FixThisNoMistake.
- [x] **Project name and team name** (15 Nov): the project is Skyliner, the team is FixThisNoMistake (<https://www.spaceappschallenge.org/2026/find-a-team/fixthisnomistake/>). Used in `LICENSE`, `README.md`, `submission/01` and `06`, and `AGENTS.md`.
- [x] **Rename the in-app brand to Skyliner** (15 Nov): page header and titles, the service and its start scripts, the READMEs, the tests that check the name, and the manual (text, 13 screenshots, both PDFs). The localStorage keys (`skyflip.*`) and the `SKYFLIP_*` environment variables keep their old prefix on purpose.
- [x] **Does `research/` ship publicly?** Yes, scrubbed on 15 Nov: the contact details are out of `research/01-event-2026.md`, the browser-profile note is out of `research/05-sources-and-caveats.md`, and `research/summary.pdf` (stale) is left out. `research/raw/` stays out (gitignored).
- [x] **`research/demo/`.** Left out of the public repository (15 Nov); it stays in the private archive. Who wrote it and whether SI was used is still unknown, so it must not be used.
- [x] **Demo format:** a video of at most 30 seconds (Team Owner, 15 Nov). Hosted on YouTube, unlisted: https://youtu.be/zIq62jk0xJM. Open: paste `submission/demo/DESCRIPTION.txt` into its description (it was empty when checked).
- [x] **Final project link.** The new public repository `skyliner` (https://github.com/nacs-970/skyliner), made on 15 Nov from a snapshot with one first commit. Open: test it in a private window.

## 6. Submission

Deadline: Sunday 15 November 23:59 in the Team Owner's local time (Universal Event). The Phayao date no longer applies. See the full checklist in [AGENTS.md](../AGENTS.md) section 9.

- [ ] Draft every form field in `submission/`. Drafted 15 Nov and waiting for review: `01` to `05` (each has an "Open points" or status note). `02` holds the two links. `06` (demo) holds two storyboards; the team chose the video.
- [x] Check that `docs/references.md` and `docs/si-log.md` match what is actually used. Watermark SI-generated images and label SI-generated code and data. Done 15 Nov: all 30 files that carry an SI marker are named in the SI log, no code file in `implementation/` lacks a marker, the fonts and icons are in the references, the sample PNG says in its metadata that an SI-assisted script made it, and the data-flow diagram was redrawn (it was stale) with a visible "SI-generated diagram" label. Left for a person: `research/summary.pdf` is stale (delete or regenerate), and the reviewer column of the SI log.
- [x] Make the demo video (15 Nov): an HTML and CSS motion graphic with a voice-over by Underdog Woof, in `submission/demo/` (source, voice, rendered MP4, description with the credits). English captions, a visible "SI-generated video and voice" label, no one under 18, no NASA logo.
- [ ] Review the demo video (words, facts, look) and read the Underdog Woof license (non-commercial, credit required). The video is uploaded; its description on YouTube is still empty.
- [ ] Check the Members tab: everyone registered and confirmed, nobody waitlisted.
- [ ] Click **Submit for Judging** early, then test every link in a private window.
- [ ] After the event: participant survey by 1 December. Global Nominees are announced on 3 December.
