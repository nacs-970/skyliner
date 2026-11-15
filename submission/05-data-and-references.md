# Form fields: NASA Data, and Space Agency Partner Data and Other References

Source of the answer: [docs/references.md](../docs/references.md). A Global Award needs at least one NASA data set or resource, used as a core part of the project. The originality checkbox says every external resource (code, text, images, even open-source ones) is listed in the References field.

Status: SI-drafted on 15 Nov 2026, awaiting review by a team member. Copy only what is still true when you submit. On 15 Nov 2026 SI read the IRSA data use terms, the SPHEREx and IRSA acknowledgement pages, the arXiv license link and the SIMBAD terms (results in `docs/references.md`, a summary and not legal advice): a team member should read them before submitting. Still "to verify" in `docs/references.md`: the Caltech survey page and the Explanatory Supplement.

## NASA Data

**SPHEREx Level 2 spectral images, data release 1 (collection `spherex_dr1`)**, NASA/IPAC Infrared Science Archive (IRSA): <https://irsa.ipac.caltech.edu/Missions/spherex.html>. This is the core data of the tool. Everything the page shows is a real SPHEREx image.

How the tool uses it:

- The IRSA SIA2 search service lists the images that cover a position (observation id, time, detector).
- For each image, one region around the target is read from the `IMAGE` and `VARIANCE` extensions of the FITS file, with HTTP range requests on the public NASA/IRSA S3 bucket `nasa-irsa-spherex` (the IRSA cutout service is the fallback). The `WCS-WAVE` table gives the wavelength at the target. We never download a whole file for the tool.
- The page shows the images in time order, per detector, with the real observation times. A lossy copy for display is built from them, and the page can show the original pixels.
- A small set of display files made from these images (a 0.2 degree region per image on one grid, detector D6, the five test targets, about 21 MB) is committed to the repository; every other position and detector is fetched when asked. They are not the FITS files.
- Sample picture in the early page draft: a 192 by 192 pixel crop of image `2025W19_1B_0116_1`, detector D6. It is not a target and not a detection.

Targets: WISE 0855, Barnard's Star, Epsilon Indi B, RW Aurigae and R Draconis (the test targets named in the challenge).

Mission facts for the explainer page come from the SPHEREx mission paper and the Caltech survey page (below). The `FLAGS` extension is documented in the SPHEREx Explanatory Supplement, which is named as a pointer only.

Acknowledgements the data providers ask for (also shown in the page under Credits):

- "This publication makes use of data products from the Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer (SPHEREx), which is a joint project of the Jet Propulsion Laboratory and the California Institute of Technology, and is funded by the National Aeronautics and Space Administration."
- "This research has made use of the NASA/IPAC Infrared Science Archive, which is funded by the National Aeronautics and Space Administration and operated by the California Institute of Technology."

Terms: IRSA says "Most data served by IRSA is public, with no usage restrictions" (<https://irsa.ipac.caltech.edu/data_use_terms.html>).

## Space Agency Partner Data and Other References

No space agency partner data is used in the tool. (Gaia DR3, NEOSSat and WiseView are named in the plan as optional ideas only. None is used.)

Other data and documentation:

- **SIMBAD astronomical database (CDS, Strasbourg)**, TAP service at the Harvard mirror: <https://simbad.harvard.edu/simbad/sim-tap>. Used for the position and proper motion of four test targets. Only the target name is sent. Free to use under the ODbL licence. "This research has made use of the SIMBAD database, operated at CDS, Strasbourg, France." Reference: Wenger et al. 2000, A&AS 143, 9.
- **SPHEREx mission paper:** Crill et al. 2024, "SPHEREx: NASA's Near-Infrared Spectrophotometric All-Sky Survey", arXiv:2404.11017 (arXiv non-exclusive distribution license). Facts paraphrased for the explainer page, no text or figures copied.
- **SPHEREx survey page, Caltech:** <https://spherex.caltech.edu/page/survey>. Facts paraphrased for the explainer page.
- **SPHEREx Explanatory Supplement (IRSA):** <https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp_QR.pdf>. Named as the source of the `FLAGS` bit definitions (Table 16 was read on 15 Nov; the document carries no license text).

Software (name, license):

- numpy (BSD-3-Clause) and astropy (BSD-3-Clause): array math, FITS and VOTable reading, sky-coordinate mapping.
- Phosphor Icons core 2.1.1 (MIT): icons in the page.
- FastAPI (MIT, with starlette and pydantic) and uvicorn (BSD-3-Clause): the local service. httpx (BSD-3-Clause): only in the service check.
- Geist and Geist Mono variable fonts 5.3.0, via `@fontsource-variable` (SIL Open Font License 1.1): fonts in the page, self-hosted.
- Underdog Woof text-to-speech model, voice Juno (Underdog Non-Commercial License 1.0: free non-commercial use with credit; its NOTICE credits Mimi by Kyutai, LibriTTS-R and Emilia-YODAS, all CC-BY 4.0): <https://underdog.ai/woof>. Made the SI-generated voice-over of the demo video, run locally. Credited in the video and in its description. The speech files and the video carry its terms.
- Our own code and text are under the MIT license (`LICENSE` in the repository).

AI assistance: see the Use of Super Intelligence field.
