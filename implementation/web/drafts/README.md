# UI drafts

The visual style of the Skyliner web app, built from the team's hand sketch and made interactive with one shared script. Six styles were drawn; the five that were not chosen were removed on 15 Nov 2026 (they remain in the git history, last in commit `2929dea`). Plain HTML, CSS and vanilla JavaScript: no dependencies, no build step, no network calls, works from `file://`.

**Chosen: v1 Studio**, locked by the team on 14 Nov 2026 (see `AGENTS.md`, section 7, Decided).

**Review:** open [index.html](index.html) in a browser, or open the draft directly.

| Draft | Style |
|-------|-------|
| [v1-studio.html](v1-studio.html) | Graphite panels, electric-blue accent, Geist |

## Real data page

[v1-studio-real.html](v1-studio-real.html) is the same page as v1 Studio, showing real SPHEREx DR1 cutouts instead of the sample crop and the simulation. The front door of the app is now `../index.html` (a blank page with a coordinate form; see [../README.md](../README.md)), and "New position" at the top left of this page goes back to it. Opened without parameters, this page still loads WISE 0855; `?target=KEY` (or the Sky patch menu under Position) picks any other exported patch, and typing a position that lies inside the loaded patch (about 12 arcminutes across) puts the **Requested position** ring on it and zooms to about 4 arcminutes (Esc steps back; the ring has its own checkbox under Overlays; `?ra=&dec=` in degrees does the same on load). A typed position within 3 arcminutes of another exported patch's centre opens that patch with the ring on it. For any other position the page says which command builds it, because it reads only the cache and does not call IRSA. The ring starts on the patch target. It marks a sky position, not a detection. The pixels under "From the lossy cache" are decoded in the browser by `cellcache.js` from `sky.store.js` (see "Browser decoder for the cell store" in `implementation/scripts/README.md`). A first visit shows a short introduction (dismissed once, remembered in this browser, and available again under Credits). It needs the exported data, which lives in the gitignored cache (see "Real data in the team's web front end" in `implementation/scripts/README.md`). Without it the page shows a message. `app.js` switches to real mode only when `window.SKY` exists, so the other drafts behave as before. Choose the detector under Display, click a lane in the timeline, or add `?d=D1` to `?d=D6` to the address. The timeline, its lanes and ticks are built from the data (`real.css` has the few extra styles); `?f=` and `?t=` open a given frame or time (a time with no observation opens an empty picture). The timeline zooms (wheel, buttons, `[` and `]`), see the scripts README.

## What you can do

The three tools (scissors, marker, magnifier) sit to the right of the player controls. The sidebar toggle is at the top right of the viewer.

| Control | Behavior |
|---------|----------|
| Transport (below the image) | In order: start (Home), previous observing window (Page Up), back one frame (Left), play or pause (Space), forward one frame (Right), next observing window (Page Down), end (End) |
| Timeline | Click or drag to scrub. The playhead jumps across the real gaps between observing windows |
| Scissors | Set clip points: first click sets A, second sets B, third clears. "Loop A to B" keeps playback inside the clip |
| Marker (pen) | Click the image to add a marker, click a marker to remove it. Markers are listed in the sidebar |
| Magnifier | Click to zoom in, Shift+click to zoom out. The mouse wheel also zooms, drag pans, double-click resets. **Esc goes back one zoom step** (each click, key press or wheel burst is one step); with nothing left to undo it leaves the tool. **The navigator in the top-left appears only while zoomed** and shows where the view sits in the whole image (click or drag it to move) |
| Sidebar (three-line icon) | Every slider and dropdown has a reset button that returns it to its default (dimmed while already at the default); double-clicking a slider resets it too. Display: black point, white point, gamma, stretch (linear, asinh, log), smoothing (true pixels or bilinear). Playback speed, frame set, loop. Simulated frames. Detectors (hide or show timeline lanes). Markers. Frame details |
| Sidebar, Position: RA, Dec, Field and Load | Accepts degrees or sexagesimal (`08h55m10.831s`, `-7d14m42.53s`). Bad input shows an error. This draft has data for the sample position only |
| Dark and Light button | Theme. Black is the default. The choice and the display settings are remembered in the browser |
| Full screen (next to the magnifier, key F) | Shows the image, its readouts and the navigator across the whole screen. Space, arrows and the wheel still work. The exit button in the corner or Esc leaves |
| Hover the image | Shows the pixel position and its value in MJy (the unit string in the FITS header) |

Keys: Space, Left and Right (Shift for 10 frames), Home, End, Page Up and Page Down (windows), I, O and X (clip points), Z, P and F (magnifier, marker, full screen), plus, minus and 0 (zoom), Esc (back one zoom step).

## What is real and what is simulated

- **Real:** the pixel values. They are a 192 by 192 crop of the IMAGE plane of one SPHEREx DR1 frame (detector D6, 5 May 2025), kept as float values in `sample-d6-192.data.js`. It is the centre of that image, not a target. The stretch controls work on the real values. The scale is 6.15 arcseconds per pixel.
- **Real:** the observing windows on the timeline (WISE 0855 in `spherex_dr1`, see `research/challenge-12/data-findings.md`).
- **Simulated, and labelled in the interface:**
  - the moving point (a Gaussian that moves in a straight line in physical time; speed and brightness are sliders);
  - the frame-to-frame noise: random, but blended smoothly between keyframes, so neighboring frames evolve continuously and the same frame always looks the same;
  - a slow background drift and optional sub-pixel pointing jitter.
  Turn noise, drift and jitter to 0 and hide the mover to see the pure real crop.
- **Placeholders:** the times of frames inside a window are evenly spaced. Contamination flags and known objects are not available in the drafts.

## Files

`base.css` has the shared layout, each draft adds one `skin-*.css`, and `app.js` has all the behavior. The six HTML files have identical markup except for the title and the skin link. Once a style is chosen, delete the other five and keep `base.css`, one skin, `app.js` and the data file. `fonts/` and `assets/` are self-hosted (licenses in `docs/references.md`).

Generated with SI assistance (see `docs/si-log.md`).
