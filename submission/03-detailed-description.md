# Form field: Detailed Project Description

The guide asks for: what the project does, how it works, the benefits, the goals, and the tools and languages used. Judges score Validity, Relevance and Presentation from this text, so be specific about the data and the science.

Status: SI-drafted on 15 Nov 2026 (see [docs/si-log.md](../docs/si-log.md)), awaiting review by a team member. It describes what the repository contains. The items under "Open points" must be checked before this text is pasted into the form.

## What it does

Challenge 12 ("Planet X and SPHEREx") asks for a public web tool where a user enters sky coordinates and sees a series of SPHEREx images of that patch, like a short video, to spot motion. Our tool is that viewer. It opens on a blank page: you enter RA and Dec (or pick one of the five test targets NASA names: WISE 0855, Barnard's Star, Epsilon Indi B, RW Aurigae and R Draconis). A position that was prepared before opens at once. A new position is fetched and processed automatically, with a progress bar while you wait (a few minutes for one detector), and it stays ready afterwards. Change the position and the same happens again.

- It shows real SPHEREx Level 2 images of a 0.2 degree patch (about 117 by 117 pixels of 6.15 arcseconds), one detector at a time (D1 to D6, six wavelength ranges from 0.75 to 5.0 micrometres).
- The timeline is built from the real observation times. SPHEREx observes a position in windows about six months apart, so the timeline shows each window and the gaps between them, and says "No observation at this time" for a time with no image. Nothing is invented to fill a gap.
- The viewer has play and pause, frame and window stepping, a clip that loops between two chosen points, a marker pen, a magnifier with a small overview map, a full-screen image, display controls (black and white point, stretch), and a pixel readout in the archive's units (MJy per steradian, a measure of surface brightness) with the sky position.
- Frame details give the observation id, the time and the wavelength at the target. The wavelength changes slightly across one detector, so one detector is not one wavelength, and the page says so.
- The five test targets are in the repository on detector D6 and open at once, with no service. The other detectors of a patch are prepared from the Detector menu (or by clicking their lane in the timeline) when the service is running.
- Moving stars are handled: a position from the SIMBAD catalog is moved to the time of the observations with the star's proper motion, so the marker sits on the star. Barnard's Star moves about 10.4 arcseconds a year, which is about 1.7 pixels a year.

It is a viewer only. A person looks at the frames and judges whether anything moves. The tool does not detect, identify or name moving objects, and nothing it shows is a discovery.

## How it works

1. **Finding the images.** The IRSA SIA2 search service lists every `spherex_dr1` image that covers a position, with its observation time and detector. This list is only an index.
2. **Getting the pixels.** Each image is a 65 MB calibrated FITS file. We never download a whole file. For each image we read only the rows around the target from the `IMAGE` and `VARIANCE` extensions, with HTTP range requests on the public NASA/IRSA S3 bucket (about 2 MB per image). The IRSA cutout service is the fallback.
3. **Aligning.** Every file has its own sky-coordinate mapping (a TAN-SIP projection), so each frame is resampled onto one sky grid centred on the target. Frames with too little of the patch covered (for example near a detector edge) are dropped.
4. **Compressing for the page.** A lossy cell-delta store keeps a 12 by 12 pixel cell only when it changes between frames. It shrinks the data by about ten to fourteen times for display, with an error of under one noise level on average. It is for display, not for measurement. The page decodes the stored cells itself, in the browser, with a small JavaScript decoder that gives the same frames as the Python decoder (checked value for value), and the viewer can switch to the original pixels.
5. **Showing it.** The page is plain HTML, CSS and JavaScript with no framework. It reads the prepared data as plain files, so it works from a local folder or any static file server.

A Python pipeline prepares each patch (`implementation/scripts/cell_cache_demo.py`, using numpy and astropy). A small local service (FastAPI, `implementation/server/app.py`) runs it on demand: the page asks whether a position is prepared, and if not the service queues a job, runs the pipeline one job at a time (the archive is public and shared) and reports progress. The display files of the five test targets (detector D6, about 21 MB) are committed to the repository, so they open without the service. There is no hosting, so on-demand preparation works where the service is running, such as a laptop.

## Benefits

- A person can see motion that is hard to find in a table of numbers: the same patch, in time order, with the real gaps visible.
- It makes SPHEREx's repeated all-sky coverage easy to inspect without software or archive knowledge.
- It is honest about the data: the page labels what is real, shows missing observations as missing, and never calls a candidate a discovery.
- It is light: no tracking and no login, and the page reads its data as plain files, so it opens from a folder. The service is needed only to prepare a new position.

## Goals

- Give researchers and curious people a quick way to look at one patch of sky in SPHEREx data over time, which is the viewer NASA's challenge text describes.
- Keep the data path open and reproducible: only public NASA data and open tools, a small pipeline that anyone can run.
- Later, if the team continues: any coordinates through a service, overlays from other catalogs, and flags for contamination. These are not built.

## Tools and languages used

(must match [docs/references.md](../docs/references.md))

- Python (numpy, astropy) for the data pipeline. JavaScript, HTML and CSS for the page, no framework.
- NASA SPHEREx Level 2 images from the IRSA archive (SIA2 search, public S3 bucket). SIMBAD (CDS) for positions and proper motions.
- Phosphor Icons (MIT). Geist and Geist Mono fonts (SIL Open Font License).
- Built with the help of an AI assistant (Claude Sonnet 5.5 through Claude Code). See the SI answer.

## Open points (delete this block before submitting)

- Coverage: the repository holds the five test targets on detector D6 only. On the team's laptop all five targets also have D1 to D5 (prepared on 15 Nov, 1388 frames over six detectors in all), but those files are not in the repository. Say plainly that D6 is what a judge gets without the service. Browser checks on 15 Nov: all pass on a fresh extract of the repository (36 checks) and on the team's laptop with all six detectors (41). Barnard's Star, R Draconis and RW Aurigae show a bright star on the marker; WISE 0855 and Epsilon Indi B do not show in a single frame.
- WISE 0855 and Epsilon Indi B are faint. In earlier checks a single frame did not show them, and whether their motion can be seen in this viewer is untested. Do not claim it.
- The 10x to 14x size reduction and the error figure come from the team's tests on WISE 0855 (`implementation/scripts/README.md`). They were reproduced on 15 Nov on the rebuilt data (D6: 142 KB, 14.5x, noise check 0.73). Quote the table in the scripts README.
- Run the whole flow once on the final machine (blank page, a new position, the progress bar, the viewer), and check each feature named under "What it does" in the running page (frame details, wavelength note, magnifier, clip, full screen). They were written from the repository and checked only by scripted input in headless Chrome on the machine where this was drafted.
- The page was clicked through only by scripted input so far. A person should try it in a normal browser, including a small window.
- No live site: there is no hosting (team decision, 14 Nov). Judges reach the tool through the repository, which must be public by then (see [02-links.md](02-links.md) for how, and for the free GitHub Pages option the team has not taken). `implementation/web/index.html` opens the five test targets with no install. On-demand preparation needs the service running (`./start.sh` starts it and opens the browser); the demo can show it. Say this plainly.
