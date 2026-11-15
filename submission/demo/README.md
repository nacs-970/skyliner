# Skyliner demo video

A product-showcase style motion graphic of about 24 seconds, written in plain HTML and CSS (with a little JavaScript to move it), with a voice-over made by Underdog Woof (voice Juno, seed 0; the first version used the other voice, Mira; `make_vo.py --voice mira` draws it again).

Status: made by the SI assistant (Claude Sonnet 5.5 through Claude Code) on 15 Nov 2026 at the Team Owner's request, awaiting review by a team member. See [../../docs/si-log.md](../../docs/si-log.md). The team owns the words and may change them (see "Change the words").

| File | What it is |
|------|------------|
| `skyliner-demo.mp4` | The video: 24.000 seconds, 1920 by 1080, 30 frames a second (720 frames), H.264 and AAC mono at about -16 LUFS, 3.2 MB. This is the file to upload to a public host. |
| `index.html` | The motion graphic. Open it in a browser and press **Play with sound**: the voice is the clock and every scene moves to it. `?t=12.5` shows one moment. |
| `DESCRIPTION.txt` | Text to paste into the video description on the host. It carries the credits and labels the licenses and the SI rules ask for. |
| `assets/vo/` | The voice-over: one WAV per sentence, `vo-full.wav` (the whole track), and `timing.json` and `timing.js` (when each sentence starts and ends). |
| `assets/real/` | The real pictures: screenshots of the real app (`landing-*.png`, `progress.png`, `viewer.png`), the 39 real SPHEREx frames of Barnard's Star on detector D6 exactly as the viewer draws them (`frames/`), and their times and wavelengths (`frames.json`). |
| `assets/fonts/` | Geist and Geist Mono (SIL Open Font License), with their license texts. |
| `build/` | The scripts that made it (below). |

## What the video says and shows

| Time | Voice | On screen |
|------|-------|-----------|
| 0:00 | "Skyliner, by team FixThisNoMistake." | Title, team, the challenge name |
| 0:03 | "SPHEREx maps the whole sky every six months. Moving objects show up when you compare images over time." | Two real frames of the same patch, 262 days apart (frames 1 and 38 of Barnard's Star, detector D6) |
| 0:10 | "Type any position." | The real landing page, a position typed in |
| 0:11 | "Skyliner fetches real NASA images and plays them in time order, like a short video." | The real progress card, a counter "44 images, 8.5 minutes, shown sped up" (a real run), then the 39 real frames flipping with the real time axis |
| 0:17 | "The gaps are real. You decide what moves." | The gaps on the axis: 204 days and 24 days with no image (computed from the real frame times) |
| 0:20 | "Public NASA data. Open tools." | End card with the credits |

Every number on screen comes from the data in the repository: the frame count, the dates, the wavelengths and the gaps are read from `assets/real/frames.json`. The counter "44 images, 8.5 minutes" is the measured clean-room run of 15 Nov. The video says nothing about detecting anything: the app is a viewer only.

## Rules this video follows (AGENTS.md section 2)

- **Length:** under 30 seconds (24 s; the build stops if the speech would not fit).
- **English:** voice and burned-in captions are English.
- **SI labels:** a visible label "SI-generated video and voice" is on screen from the first frame to the last, the end card says the video was made with SI assistance, the MP4 metadata says so, and `DESCRIPTION.txt` says so.
- **Underdog Woof license:** free for non-commercial use with credit. The credit "Underdog Woof (underdog.ai)" is on the end card and in `DESCRIPTION.txt` (the license wants it in the title or description of anything published with its audio). Do not monetize the video. The license is not an OSI license, so a team member should read it (`~/underdog-woof/LICENSE`) before the video is published. It is listed in [../../docs/references.md](../../docs/references.md).
- **No NASA logo, flag or mission patch**, and no one under 18.
- **Real data:** the pictures are screenshots of the real app and real frames. Nothing is simulated. The frames are shown at their real scale of 108 by 108 pixels, enlarged without smoothing.

## Rebuild (about 15 minutes in all, no network)

From the repository root. The voice step needs numpy and the Underdog Woof folder (default `~/underdog-woof`); the render step needs Node 22, Chrome or Chromium, and ffmpeg.

```bash
python3 submission/demo/build/make_vo.py            # voice: about 40 s of CPU for each changed sentence (4 minutes for all six); unchanged sentences are reused; the video ends 1.4 s after the last word, at most 29.5 s
node submission/demo/build/capture_assets.js        # only if the app changed: real screenshots and frames (reads the committed data)
node submission/demo/build/render.js                # frames of index.html (about 10 minutes), then ffmpeg: writes skyliner-demo.mp4
node submission/demo/build/render.js --preview 4,13,19,27 --out /tmp/preview   # look at single moments first
```

`build/capture_service_shots.js` took the landing and progress pictures with the service running (it starts one real preparation job and cancels it, as `implementation/tests/manual_screenshots.js` does). Start the service first: `NO_BROWSER=1 PORT=8124 uv run --script implementation/server/app.py`.

## Change the words

The words are in `build/script.json` (one place). Edit a sentence, run `make_vo.py` (it draws only the changed sentences and stops with an error if the speech would no longer fit under 30 seconds), then `render.js`. If a sentence gets much longer or shorter, check the scene timing in `index.html`: scenes are tied to the sentence start times in `timing.js`.

Published on YouTube (unlisted): https://youtu.be/zIq62jk0xJM. The voice-over files (`assets/vo/`) and the MP4 carry the Underdog Woof license terms (non-commercial, credit required), not the repository's MIT license.

## Before it is published

- [ ] A team member listens to the voice-over and reads the captions. The voice is a text-to-speech model: check the pronunciation of "SPHEREx" and "FixThisNoMistake" in particular.
- [ ] Read the Underdog Woof license and decide that its terms fit (non-commercial, credit, no monetization).
- [x] Uploaded to YouTube (unlisted): https://youtu.be/zIq62jk0xJM. Still to do: paste `DESCRIPTION.txt` as the description (it was empty when checked) and test the link in a private window.
- [ ] Put the link in [../02-links.md](../02-links.md) and in the form.
