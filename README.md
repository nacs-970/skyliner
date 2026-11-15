# Skyliner

A project by team **FixThisNoMistake** ([team page](https://www.spaceappschallenge.org/2026/find-a-team/fixthisnomistake/)).

Our entry for the **2026 NASA Space Apps Challenge**, challenge 12: **Planet X and SPHEREx**.

**Demo video (24 seconds):** <https://youtu.be/zIq62jk0xJM>

The goal is a public web tool. You enter sky coordinates (Right Ascension and declination) and see a time series of NASA SPHEREx images of that patch, like a short video, so you can spot objects that move.

Status: hackathon in progress (14 and 15 November 2026). A web app shows real SPHEREx images of a sky patch as a time series. A small local service prepares any position on demand. There is no deployed site yet. See [docs/handoff.md](docs/handoff.md) for where things stand.

## Try it

```bash
./start.sh        # Linux and macOS (start.bat on Windows); needs uv. Starts the service and opens the app in your browser.
```

The app opens on a blank page. Enter a position (RA and Dec), or pick one of NASA's test targets. If the position was prepared before, the viewer opens at once. If not, the service fetches the images from NASA's public archive while a progress bar shows how far it is (a few minutes), and then the viewer opens. Use "New position" to try another one. See [implementation/web/README.md](implementation/web/README.md). **New here? Read the [user manual](docs/user-manual.md)** ([PDF](docs/user-manual.pdf)): how to start and use the app, and how it works. **How does it work, in plain words?** Read [docs/how-it-works.pdf](docs/how-it-works.pdf) ([source](docs/how-it-works.md)). **Developers:** [docs/architecture.md](docs/architecture.md) says how the web app is built.

A small set of prepared data is in git: the five NASA test targets (WISE 0855, Barnard's Star, Epsilon Indi B, RW Aurigae, R Draconis) on detector D6, about 21 MB (see [implementation/data/README.md](implementation/data/README.md)), so they open at once with no wait. Every other position, and the other five detectors, are prepared by the service when you ask (`implementation/data/cache/`, not in git). To prepare more of the test targets yourself, follow "Rebuild the pre-warm from nothing" in [implementation/scripts/README.md](implementation/scripts/README.md). If the page is opened without the service running, prepared positions still open, and for a new position the page shows a loading screen with the command to start the service and carries on by itself as soon as it is running.

## Where things are

| Path | What it holds |
|------|---------------|
| [AGENTS.md](AGENTS.md) | Rules, data facts, proposed stack, open decisions, checklist. Start here. |
| [research/](research/) | Background research on the event, the challenges and the SPHEREx data |
| [docs/](docs/) | SI-use log and the list of external sources and licenses |
| [submission/](submission/) | Drafts for each field of the project submission form, and the demo video (`submission/demo/`: source, voice-over, MP4) |
| [implementation/](implementation/) | The tool itself |

## Data

NASA/IPAC Infrared Science Archive (IRSA), SPHEREx mission: <https://irsa.ipac.caltech.edu/Missions/spherex.html>

## License

MIT, see [LICENSE](LICENSE). Third-party items (fonts, icons, libraries, data) keep their own licenses, listed in [docs/references.md](docs/references.md). The voice-over of the demo video (`submission/demo/assets/vo/` and the MP4) was made with the Underdog Woof model and carries its non-commercial license terms (credit required), not the MIT license.
