# Paste-ready text for the Project tab

Status: SI-drafted on 15 Nov 2026 (see [docs/si-log.md](../docs/si-log.md)) from the form as it looked at 19:22 UTC+7, with the drafts `01`, `03`, `04` and `05` as the source. A team member must read every block before pasting. The editor on the page is rich text: paste each block as plain text, with no Markdown marks. Every link was opened on 15 Nov, about 19:35 UTC+7, and answered normally.

Order on the page: Project Summary, Project Links, Project Information, Project Submission Verification. Save with **Save Progress** after each section.

## 1. Project Summary

Project Name:

```
Skyliner
```

Summary (177 words, 982 characters; the limit is 1500):

```
Skyliner is a web viewer for NASA's SPHEREx mission, built for Challenge 12, Planet X and SPHEREx. You enter a sky position (RA and Dec), or pick one of NASA's five test targets, and Skyliner plays real SPHEREx infrared images of that patch in time order, like a short video, so a person can look for objects that move. It shows the real observing times, including the long gaps between SPHEREx's observing windows, one detector (wavelength range) at a time, with zoom, a looping clip and a pixel readout in the archive's own units. A position that was prepared before opens at once. A new position is fetched from NASA's public archive by a small local service, with a progress bar, and then stays ready. SPHEREx maps the whole sky every six months, which is more than one person can inspect by hand, so an easy way to compare images over time helps anyone look for motion. Skyliner is a viewer only: it does not detect or name moving objects, and nothing it shows is a discovery.
```

## 2. Project Links (shown as "Complete": check that the saved values are these)

Project Demonstration (demo video, 24 seconds, YouTube, unlisted):

```
https://youtu.be/zIq62jk0xJM
```

Project (public repository):

```
https://github.com/nacs-970/skyliner
```

Before you rely on the demo link: paste the text of `submission/demo/DESCRIPTION.txt` into the description of the YouTube video (it was empty when checked).

## 3. Project Information

### Project Details

This replaces the draft that is on the page now (it is about 7400 characters, a little longer than the old one, which the page accepted; if the editor refuses it, cut BENEFITS AND INTENDED IMPACT first). Delete the whole old text first. The old text still has the block "Open points (delete this block before submitting)" and the line "(must match docs/references.md)", and it does not answer "How is your project creative?" or "What factors did your team consider?". Things to confirm before pasting are marked in [square brackets]: remove the brackets and the note, or fix the sentence.

```
Skyliner is a viewer for NASA SPHEREx images. Challenge 12 (Planet X and SPHEREx) asks for a public web tool where a user enters sky coordinates and sees a series of SPHEREx images of that patch, like a short video, to spot motion. Skyliner is that viewer.

HOW TO TRY IT
Project link: https://github.com/nacs-970/skyliner
Demo video (24 seconds): https://youtu.be/zIq62jk0xJM
There is no live website. The repository is the project.
1. No install: open implementation/web/index.html from the repository in a browser. The five test targets that NASA names (WISE 0855, Barnard's Star, Epsilon Indi B, RW Aurigae, R Draconis) are in the repository on detector D6 and open at once.
2. Any other position: run ./start.sh (start.bat on Windows; it needs uv and an internet connection). The small local service opens the app in the browser, fetches the images from NASA's public archive and shows a progress bar. In our tests one detector took about 7 to 9 minutes from Thailand. The position then stays ready.

WHAT IT DOES
The app opens on a blank page. You enter RA and Dec, or pick a test target. A position that was prepared before opens at once. A new position is fetched and processed automatically, and the same happens when you change the position.
- It shows real SPHEREx Level 2 images of a 0.2 degree patch (about 117 by 117 pixels of 6.15 arcseconds), one detector at a time (D1 to D6, six wavelength ranges from 0.75 to 5.0 micrometres).
- The timeline is built from the real observation times. SPHEREx observes a position in windows about six months apart, so the timeline shows each window and the gaps between them, and says "No observation at this time" for a time with no image. Nothing is invented to fill a gap.
- The viewer has play and pause, frame and window stepping, a clip that loops between two chosen points, a marker pen, a magnifier with a small overview map, a full-screen image, display controls (black and white point, stretch), and a pixel readout in the archive's units (MJy per steradian, a measure of surface brightness) with the sky position.
- Frame details give the observation id, the time and the wavelength at the target. The wavelength changes slightly across one detector, so one detector is not one wavelength, and the page says so.
- Moving stars are handled: a position from the SIMBAD catalog is moved to the time of the observations with the star's proper motion, so the marker sits on the star. Barnard's Star moves about 10.4 arcseconds a year, which is about 1.7 pixels a year.
It is a viewer only. A person looks at the frames and judges whether anything moves. The tool does not detect, identify or name moving objects, and nothing it shows is a discovery.

HOW IT WORKS
1. Finding the images. The IRSA SIA2 search service lists every spherex_dr1 image that covers a position, with its observation time and detector. This list is only an index.
2. Getting the pixels. Each image is a 65 MB calibrated FITS file. We never download a whole file. For each image we read only the rows around the target from the IMAGE and VARIANCE extensions, with HTTP range requests on the public NASA/IRSA S3 bucket (about 2 MB per image). The IRSA cutout service is the fallback.
3. Aligning. Every file has its own sky-coordinate mapping (a TAN-SIP projection), so each frame is resampled onto one sky grid centred on the target. Frames with too little of the patch covered (for example near a detector edge) are dropped.
4. Compressing for the page. A lossy cell-delta store keeps a 12 by 12 pixel cell only when it changes between frames. It shrinks the data by about ten to fourteen times for display, with an error of under one noise level on average. It is for display, not for measurement. The page decodes the stored cells itself, in the browser, with a small JavaScript decoder that gives the same frames as the Python decoder (checked value for value), and the viewer can switch to the original pixels.
5. Showing it. The page is plain HTML, CSS and JavaScript with no framework. It reads the prepared data as plain files, so it works from a local folder or any static file server.
A Python pipeline prepares each patch (numpy and astropy). A small local service (FastAPI) runs it on demand: the page asks whether a position is prepared, and if not the service queues a job, runs the pipeline one job at a time (the archive is public and shared) and reports progress.

BENEFITS AND INTENDED IMPACT
- A person can see motion that is hard to find in a table of numbers: the same patch, in time order, with the real gaps visible.
- It makes SPHEREx's repeated all-sky coverage easy to inspect without software or archive knowledge.
- It is honest about the data: the page labels what is real, shows missing observations as missing, and never calls a candidate a discovery.
- It is light: no tracking and no login, and the page reads its data as plain files, so it opens from a folder.

HOW IT IS CREATIVE
- The time axis shows the real gaps between SPHEREx's observing windows instead of a smooth animation, so a viewer sees how much time passed between two images.
- A cell-based lossy store, an idea of our team, keeps only the cells that change between frames, so a whole patch fits in a small file that the browser decodes by itself.
- Reading one region of each image from NASA's public cloud storage with range requests (about 2 MB) instead of a 65 MB file makes a new position possible in minutes.

WHAT WE CONSIDERED
- Data size and politeness: one image is 65 MB, so we read regions only, run one job at a time and use a generic client name.
- Browser access: the IRSA search and cutout services send no CORS headers, so a browser cannot call them. That is why a small local service exists.
- Small motion: a pixel is 6.15 arcseconds, so even a fast mover shifts only about a pixel a year. We chose to show the images and leave the judgement to the person, not to flag candidates.
- Honesty: only real data is shown, and the page says what it cannot show.

LIMITS
- Without the service, the repository gives the five test targets on detector D6 only. Other detectors and positions need the service running on the user's machine.
- WISE 0855 and Epsilon Indi B are faint and do not show in a single frame. Whether their motion can be seen in this viewer is untested, and we do not claim it.
- The size reduction is for display only.

TOOLS AND LANGUAGES
Python (numpy, astropy, FastAPI, uvicorn, httpx); JavaScript, HTML and CSS with no framework; NASA SPHEREx Level 2 images from IRSA (SIA2 search, public S3 bucket); SIMBAD (CDS) for positions and proper motions; Phosphor Icons (MIT); Geist and Geist Mono fonts (SIL Open Font License). The demo video is an HTML and CSS motion graphic rendered with headless Chromium and ffmpeg, with a voice-over from the Underdog Woof text-to-speech model. All items are listed with their licenses in the fields below and in docs/references.md in the repository.

SUPER INTELLIGENCE (SI)
We built this with SI assistance: Claude Sonnet 5.5 (Anthropic) through Claude Code wrote code, documents and the demo video, and the voice-over is SI-generated speech (Underdog Woof, voice Juno). The idea of the solution and the design choices are the team's. The demo video carries a visible SI label on every frame, and its description says the video and voice are SI-generated. The log of every SI use is docs/si-log.md in the repository.
```

Notes for the reviewer (not for the form):

- [ ] "How to try it" step 2 says 7 to 9 minutes. That is what we measured on 15 Nov from Thailand (7 minutes in one test, 8.5 minutes in the clean-room run). Fix it if a new test says otherwise.
- [ ] "an idea of our team" (cell-based store): `04-si-use.md` says the team proposed it. Confirm that is true, or delete the words.
- [ ] A person should try the flow once in a normal browser before submitting. The checks so far were scripted.

### Use of Super Intelligence (SI): tick the boxes

This form version has only checkboxes, no text box. Tick all four, they all apply:

- Presentation, Video, or Audio (the demo video and its voice-over)
- Visual Design or Image Creation (the video's visuals)
- Coding, Debugging, or Troubleshooting (the app and the service)
- Research or Information Gathering (event, challenge and data research)

Do not tick "I did not use SI". The question is for data collection and judges do not see it. What judges do see is the SI label in the video, the video description and the repository.

### NASA Data (Link Text, Link Url)

Add one row for each.

| Link Text | Link Url |
|-----------|----------|
| SPHEREx Level 2 spectral images, data release 1 (spherex_dr1), NASA/IPAC Infrared Science Archive (core data) | https://irsa.ipac.caltech.edu/Missions/spherex.html |
| SPHEREx public S3 bucket nasa-irsa-spherex (range reads of image regions) | https://nasa-irsa-spherex.s3.amazonaws.com/?list-type=2&delimiter=/ |
| SPHEREx cutout service documentation (IRSA, fallback route) | https://irsa.ipac.caltech.edu/data/SPHEREx/docs/cutout_tool.html |
| SPHEREx Explanatory Supplement (IRSA, source of the FLAGS bit definitions) | https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp_QR.pdf |
| SPHEREx survey page (Caltech and NASA JPL, mission facts) | https://spherex.caltech.edu/page/survey |
| IRSA SPHEREx tutorial notebooks | https://caltech-ipac.github.io/irsa-tutorials/spherex/ |
| IRSA data use terms | https://irsa.ipac.caltech.edu/data_use_terms.html |

(The IRSA SIA2 search address `https://irsa.ipac.caltech.edu/SIA` answered HTTP 502 when checked at 19:30, so it is not listed as a link. The details text names the service.)

### Space Agency Partner and Other Data (Link Text, Link Url)

No space agency partner data is used. Add one row for each:

| Link Text | Link Url |
|-----------|----------|
| SIMBAD astronomical database, TAP service (CDS Strasbourg; ODbL; positions and proper motions) | https://simbad.harvard.edu/simbad/sim-tap |
| SPHEREx mission paper, Crill et al. 2024, arXiv:2404.11017 (facts paraphrased) | https://arxiv.org/abs/2404.11017 |
| Underdog Woof text-to-speech model, voice Juno (Underdog Non-Commercial License 1.0; voice-over of the demo video) | https://underdog.ai/woof |
| numpy (BSD-3-Clause) | https://numpy.org/ |
| astropy (BSD-3-Clause) | https://www.astropy.org/ |
| FastAPI (MIT) | https://fastapi.tiangolo.com/ |
| uvicorn (BSD-3-Clause) | https://uvicorn.dev/ |
| httpx (BSD-3-Clause) | https://www.python-httpx.org/ |
| Phosphor Icons 2.1.1 (MIT) | https://phosphoricons.com/ |
| Geist font, via Fontsource (SIL Open Font License 1.1) | https://fontsource.org/fonts/geist |
| Geist Mono font, via Fontsource (SIL Open Font License 1.1) | https://fontsource.org/fonts/geist-mono |
| Python-Markdown (BSD-3-Clause; builds the manual from Markdown) | https://python-markdown.github.io/ |
| Pillow (HPND; adds the SI watermark to images) | https://python-pillow.org/ |
| ffmpeg (LGPL or GPL, depends on the build; encodes the demo video) | https://ffmpeg.org/ |
| Chromium (BSD-style; renders the demo video frames and the screenshots) | https://www.chromium.org/ |

Check before pasting: the licenses of Python-Markdown, Pillow, ffmpeg and Chromium are written from memory of their public pages and are not yet in `docs/references.md` (ffmpeg and Chromium are build tools, not shipped). Read them if you want that line to be exact, or drop the license words and keep the names.

## 4. Project Submission Verification

Tick both boxes, then **Save Progress**, then **Submit for Judging**:

- Agree to Terms and Conditions
- Confirm All Work is Original (this says every external resource is listed in the two link fields above: that is why the long lists matter)

Deadline: Sunday 15 Nov, 23:59 in the Team Owner's local time (Thailand, UTC+7). Aim for about 22:30. After the banner appears, open the project page once more and check the saved text and both links.
