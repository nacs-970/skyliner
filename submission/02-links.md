# Form fields: Link to Project Demo and Link to Final Project

Both links must open without login, permission or registration (rule 8). Test each in a private window before submitting. Videos and documents cannot be uploaded to the form, so host them publicly (YouTube, Google Drive, GitHub, OneDrive, Dropbox or similar).

Status: SI-drafted on 15 Nov 2026 (see [docs/si-log.md](../docs/si-log.md)). Both links exist (below). They were tested signed out in a clean headless Chromium profile; a person should test them again in a normal private window. Facts come from this repository, from `gh` and from the pages themselves.

## Link to Project Demo

`https://youtu.be/zIq62jk0xJM`

- What it is: the 24 second demo video (`submission/demo/skyliner-demo.mp4`) on YouTube, visibility "Unlisted" (anyone with the link can watch, no login).
- Checked on 15 Nov at about 19:15 UTC+7 in a clean headless Chromium profile with no login: the page loads, the video is playable, 24 seconds long, not private.
- **To change on YouTube:** the description was empty. Paste `submission/demo/DESCRIPTION.txt` (it has the credit "Underdog Woof" that the voice model's license requires, and the SI statement the Space Apps rules ask for: audio must acknowledge SI generation in descriptive text and metadata). The repository link in it is already filled in. Optional: title "Skyliner demo (SI-generated video and voice)".
- Rules checked: at most 30 seconds, English voice and burned-in English captions, visible SI label on every frame, no NASA logo, no one under 18. The options (video or 7 slides) are in [06-demo-script.md](06-demo-script.md); the team chose the video.

## Link to Final Project

`https://github.com/nacs-970/skyliner`

- What it is: the public repository. There is no hosted site (team decision of 14 Nov), so the repository is the project. A judge opens the repository, reads the README and runs one command, or opens one file (below).
- Made on 15 Nov 2026 from a snapshot of the final tree with one fresh first commit. The older private repository `nasa-space-challange-2026-sphereX` stays as the archive: its history holds personal data (commit `12d4cc3`) and must never be made public.
- FortiGuard Web Filter Classification: the Project Submission Guide recommends it only for a new website. The link is on github.com, so it is not needed.

### Decided: how the repository became public (15 Nov)

Option A. The Team Owner asked for a new public repository named `skyliner`. It was built from a snapshot of the committed tree (`git archive`) with these changes: `research/demo/` (a simulated viewer of unknown authorship) and `research/summary.pdf` (stale) are left out; the contact details in `research/01-event-2026.md` and the browser-profile note in `research/05-sources-and-caveats.md` were removed first; the first commit is signed with the GitHub no-reply address, not a personal email. Options B (rewrite history, a destructive operation) and C (make the old repository public) were not used.

### What a judge does with the repository (put this at the top of the README or in the description)

1. Open `implementation/web/index.html` in a browser. The five NASA test targets (WISE 0855, Barnard's Star, Epsilon Indi B, RW Aurigae, R Draconis) are in the repository on detector D6 and open at once. No install, no server.
2. Or run `./start.sh` (`start.bat` on Windows; needs [uv](https://docs.astral.sh/uv/) and an internet connection). It opens the app. Any other position is fetched from NASA's public archive while a progress bar shows how far it is (about 7 minutes for one detector from Thailand).

Both steps were checked on 15 Nov in headless Chrome on a fresh extract of the repository (`git archive`): opened as a plain file and from a plain static server, the five chips appear and Barnard's Star opens the viewer on 39 real D6 frames, with no service running.

Say plainly in the description that there is no live site, and that preparing a new position needs the service running on the judge's machine.

### Optional: a free live page from the repository (not enabled)

Because the display data is now in the repository, the page works as plain static files. GitHub Pages could serve it from the public repository, giving judges a live link with no install: `https://[owner].github.io/[repository]/implementation/web/index.html`. The five test targets would open at once. A new position would show the "preparation service is not running" notice, because there is no server behind Pages. That is honest, but it is a hosting step, and the team decided on 14 Nov that there is no hosting. Nothing was enabled. If the team wants it: Settings, Pages, "Deploy from a branch", `main`, `/ (root)`, on the public repository (Pages for a private repository needs a paid plan). Then add the address to this file and test it in a private window.

## Link test log

Fill in after the links exist. Test in a private window, signed out of GitHub, Google and YouTube.

| Link | Tested in private window | Date and time (UTC+7) | Result |
|------|--------------------------|-----------------------|--------|
| `[DEMO URL]` | | | |
| `[PUBLIC REPOSITORY URL]` (opens, README visible, no login prompt) | | | |
| `implementation/web/index.html` from a fresh clone of the public repository (opens, a test target loads) | | | |
| `[LIVE PAGE URL]` (only if the team enables GitHub Pages) | | | |
