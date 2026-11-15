# Form field: Use of Super Intelligence (SI)

Source of the answer: [docs/si-log.md](../docs/si-log.md). Judges do not see this answer, but they do see SI indicators inside the project.

Checks before submitting:

- SI-generated images and video carry a visible watermark.
- SI-generated audio, code and data are acknowledged in descriptive text and metadata.
- No NASA logos, flags or mission identifiers were generated or altered by SI.
- SI was not used to come up with the idea of how to solve the challenge.

Status: SI-drafted on 15 Nov 2026, awaiting review by a team member. Every statement below must be true before it is submitted: the human review column of the SI log is still empty and a person has to fill it.

## Answer

We used one SI tool, Claude Sonnet 5.5 (Anthropic) through Claude Code, in a terminal on the team's laptop. It did not come up with our idea of how to solve the challenge. The solution design is ours: NASA's challenge text describes a viewer that shows a series of images of a sky patch like a video, and the team chose that viewer, drew the layout of the page by hand, picked the Studio visual style from six drafts (the other five were removed from the repository on 15 Nov and remain in its history), and proposed the cell-based delta idea for compressing the frames. The tool implemented these decisions and sped up the work.

What the SI tool did (each item is logged with its date and files in the SI log):

- **Research and documents.** Collected and summarized public information about the event, the challenges and the SPHEREx data service. Wrote the repository structure, the project rules file, the to-do list, the handoff note, the explainer page on how SPHEREx observes the sky, and drafts of these submission texts.
- **Code.** Wrote the Python data pipeline (search the archive, read image regions, align, compress, export), the six interactive page drafts and the real-data mode of the page, the local service (FastAPI) and the landing page with its progress bar, the manual checks (service, landing page, viewer, decoder), and a throwaway test of the data service (CORS, range reads, cutout service, timing).
- **Data.** Cut small crops and cutouts of public SPHEREx images and saved them as PNG and as data files. Built the small display files of the five test targets that are committed to the repository. Each says in its header or metadata that SI produced it.
- **Demo video.** Made the 24 second demo video as an HTML and CSS motion graphic (`submission/demo/`, with its build scripts) and rendered it to an MP4. The voice-over is SI-generated speech from the Underdog Woof text-to-speech model (voice Juno), run locally. The video carries a visible "SI-generated video and voice" label on every frame, and it credits Underdog Woof.
- **Review.** Reviewed the real-data page for bugs and for honest labelling (changed no files).

How we checked it (fill in before submitting, from the human review column of the SI log): (fill in: who reviewed what, and how, for example by running the pipeline and reading the code).

What we did to keep SI content marked: SI-written code files start with a header comment that says so; data files and the sample image say so in their headers or metadata; the page labels simulated data as simulated (the early drafts) and uses only real data in the real-data mode; no NASA logo, flag or mission mark was generated or changed; the UI uses real third-party icons and fonts (listed in the references) and none were drawn by SI. The demo video carries the visible label "SI-generated video and voice" on every frame, its file metadata says the video and voice are SI-generated, and so does its description on YouTube.
