# Demo script

Limit: a video of at most 30 seconds, or a deck of at most 7 slides (title and intro included). Anything longer is not eligible for global judging. English only; another spoken language needs English subtitles. No image, video or audio of anyone under 18.

Status: SI-drafted on 15 Nov 2026 (see [docs/si-log.md](../docs/si-log.md)). Two options are written out below so the team can pick one. The team decides the format, the names and every sentence that is said or shown. Facts come from this repository only.

Format chosen: **video** (decided by the Team Owner on 15 Nov: "create a motion graphic demo with html css, like a product showcase video, and use underdog-woof for voice over"). The finished 24 second video, its source and its voice-over are in [demo/](demo/README.md). It follows Option A below with a shorter script (one sentence per scene, timed to the voice). The team still has to review the words, host the file publicly and put the link in [02-links.md](02-links.md). The slide option (B) is not needed unless the team wants a deck as well.

## What the team must fill in first

| Item | Where it appears | Status |
|------|------------------|--------|
| Project name | title card or slide 1 | **Skyliner** (chosen 15 Nov). The page header, the titles and the manual now say Skyliner too |
| Team name | title card or slide 1 | **FixThisNoMistake** (team page: https://www.spaceappschallenge.org/2026/find-a-team/fixthisnomistake/) |
| Member names and roles | slide 1 (the guide asks for names) | not chosen |
| Format | video or slides | open |
| Public host for the file | link in field 2 | open (YouTube, Google Drive, GitHub or similar, no login) |

## Rules that apply to either option

- Show the real tool and real data. Do not mock up a screen that the tool cannot produce.
- No NASA logo, mission patch or flag, and no change to NASA branding (rule 2). Name SPHEREx and NASA in words only.
- Any SI-generated image or video needs a visible watermark that says so. Screenshots and screen recordings of our own page are our own output, but they show SI-written code, so keep the SI statement in the submission text (field 4).
- SI-generated voice (text to speech) must be labelled as SI-generated in the description of the file. A human voice needs nothing, but English captions are still the safest way to meet the English-only rule.
- Music or sounds: only with a license that allows it. Add the source to [docs/references.md](../docs/references.md). Silence with captions is fine.
- Nobody under 18 appears or is heard.
- Say plainly that the tool is a viewer: it does not detect or name moving objects, and nothing on screen is a discovery.
- A step that is sped up on screen (the preparation of a new position takes about 7 minutes for one detector) carries a caption "sped up". The rest runs at real speed.
- Test the link in a private window before putting it in the form.

## Option A: video of 30 seconds

Follows the timing in the Project Submission Guide. Captions carry the words, so no voice is needed. A voice-over of about 60 words fits in 30 seconds if the team wants one.

| Time | On screen | Caption or voice |
|------|-----------|------------------|
| 0:00 to 0:03 | Title card: project name, team name, "NASA Space Apps Challenge 2026" | Skyliner, by team FixThisNoMistake |
| 0:03 to 0:06 | Card with the challenge name | "Challenge: Planet X and SPHEREx. Spot moving objects in infrared images." |
| 0:06 to 0:10 | The landing page (blank form). A position is typed in, or the chip "Barnard's Star" is pressed | "Enter any position in the sky." |
| 0:10 to 0:20 | The viewer opens on real frames. Press play: the frames flip in time order. Show the timeline with its gaps, then the frame details with the observation time and the wavelength | "Real images from NASA's SPHEREx mission, played in time order. The gaps are real: SPHEREx looks again about every six months." |
| 0:20 to 0:25 | Short sped-up clip of the progress bar for a new position (captioned "sped up") | "A new position is fetched from NASA's public archive while you wait." |
| 0:25 to 0:30 | Closing card: link to the project, "Viewer only: you decide what moves." | "Public NASA data, open tools. Anyone can look for what moves." |

Shot list (what to record, with the real tool):

1. Start the service with `./start.sh` on a machine with a prepared Barnard's Star patch. The browser opens on the blank landing page.
2. Record the screen at 1280 by 720 or larger, with the page zoomed so text is readable on a phone-sized video.
3. Take 1: landing page, press "Barnard's Star", viewer opens, press play, let two observing windows pass.
4. Take 2: landing page, type a position that is not prepared yet, record the progress bar for 10 seconds (the whole wait is too long for the video, so cut it and caption it).
5. Take 3: the timeline and "Frame details", to show the real observation times and the wavelength.
6. Cut to 30 seconds or less. Check the length on the file, not on the editor's timeline.

What the video must not claim: that WISE 0855 or Epsilon Indi B moves visibly in the frames (untested, both are faint), that anything is detected, or that the tool is hosted online (it is not).

Suggested Barnard's Star facts, all from the repository: it has a proper motion of about 10.4 arcseconds a year (about 1.7 pixels a year), and the page moves the marker to the time of the observations so the marker sits on the star.

## Option B: deck of 7 slides

The guide asks for an image of the project, the user experience, and how NASA and space agency data make it possible. Put the team name, the member names and the challenge on slide 1. The words under each slide are notes for a speaker or for the caption on the slide, not text to paste.

| Slide | Title | Content | Image |
|-------|-------|---------|-------|
| 1 | Title and intro | Project name, team name, member names and roles, "Challenge 12: Planet X and SPHEREx", Universal Event | none, or the viewer |
| 2 | The problem | SPHEREx maps the whole sky every six months in 102 near-infrared bands. Moving objects show up when images from different times are compared. The volume is too large to check by hand. | none, or a plain timeline |
| 3 | What we built | A web page: enter a position, watch real SPHEREx frames in time order, like a short video | screenshot of the viewer on real data (Barnard's Star) |
| 4 | The experience | Blank page, enter RA and Dec, a progress bar for a new position, then the viewer. A prepared position opens at once. | screenshots of the landing page and the progress card |
| 5 | NASA data makes it possible | IRSA search (SIA2) finds the images, range reads on the public NASA/IRSA S3 bucket fetch only the rows around the target (about 2 MB of a 65 MB file), frames are aligned on one sky grid, and the page decodes them in the browser. All of it is public NASA data. | the data flow diagram, [docs/data-flow.png](../docs/data-flow.png) |
| 6 | Honest by design | Real observation times with the real gaps, no frame invented, pixel values in the archive's units (MJy per steradian), one detector at a time because wavelength differs, viewer only: no detections, no discoveries. | screenshot of the timeline and frame details |
| 7 | Vision and credits | Next, if the team continues: overlays from other catalogs, contamination flags, any position without a local service. Open license (MIT). Data: NASA SPHEREx via IRSA. Built with SI assistance, logged in the repository. Link to the project. | none |

Notes for slide 5: the data flow diagram already carries a visible "SI-generated diagram" label (rule 2). Keep that label in the slide image; do not crop it away.

Notes for slide 7: only list as vision what the team really wants to build, and say it is a plan, not a feature. The description in [03-detailed-description.md](03-detailed-description.md) already says these items are not built.

## Script (for Option A with a voice-over, or as speaker notes for Option B)

(fill in: the team's own words. A starting point of about 60 words for 30 seconds:)

"Challenge: Planet X and SPHEREx. We built Skyliner, a viewer. Type a position in the sky and watch real SPHEREx infrared images of that patch, in time order, like a short video. The gaps you see are real. New positions are fetched from NASA's public archive while you wait. It only shows images: you decide what moves. Public NASA data, open tools."

## Before recording

- [ ] Format chosen, names and team name filled in above.
- [ ] The final build of the page is the one on screen (commit it first).
- [ ] The patch you record is prepared: Barnard's Star, WISE 0855 and the other test targets (detector D6) are in the repository, so no preparation is needed. Prepare any other position beforehand.
- [ ] Length checked on the exported file: 30 seconds or less.
- [ ] Captions in English, readable on a phone.
- [ ] No logo, no one under 18, music licensed or absent.
- [ ] File uploaded to a public host and opened in a private window.
