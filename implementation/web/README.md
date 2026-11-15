# web/

The browser side of the Skyliner web app. Plain HTML, CSS and JavaScript, no framework, no build step.

| Path | What it is |
|---|---|
| `index.html`, `landing.css` | The front door: a blank page with one form (RA and Dec). A prepared position opens the viewer at once. A new one is prepared by the local service while a progress bar shows how far it is, and then the viewer opens. |
| `lib/prepare.js` | Talks to the local service (`../server/app.py`): is this position prepared, if not prepare it, show progress, cancel. Also used by the viewer when someone types a new position there. |
| `lib/coords.js` | The rules for the RA and Dec boxes on the landing page (degrees, or hours and degrees with minutes and seconds; letters other than h, m, s and d cannot be typed). Same rules as the boxes in the viewer (`drafts/app.js`). |
| `drafts/` | The viewer (`v1-studio-real.html`, `app.js`, the Studio style) and draft 1 on sample data. See [drafts/README.md](drafts/README.md). |

**Use it:** run `./start.sh` from the repository root (`start.bat` on Windows). It starts the service and opens the app in your browser. You can also open `index.html` as a file: prepared positions open without the service, and for a new position the page shows a loading screen with the start command and carries on by itself when the service is running.

**The flow:** open the page (blank, no coordinates) -> type RA and Dec, or pick a NASA test target -> if the position is prepared, the viewer opens; if not, a loading screen with the steps and a progress bar appears while the images are fetched from NASA's archive and the display data is built (a few minutes), then the viewer opens -> use "New position" (top left of the viewer) or the Position box in the sidebar to try another one, and the same thing happens again.

**Other detectors:** the viewer shows one detector at a time (D1 to D6). A new position is prepared on D6 only. With the service running, the other detectors of that patch can be chosen in the Detector menu (they are marked "not prepared yet") or by clicking their lane in the timeline: the loading screen appears, the service reads that detector's images, and the same patch opens on it at the same time. Without the service they stay greyed out.
