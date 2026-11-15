# 07. SPHEREx Data Check (challenge "Planet X and SPHEREx")

Checked 2026-11-13 against the live IRSA services. Items marked "tested" were run by hand; items marked "docs" come from IRSA pages and were not exercised.

## Result

SPHEREx spectral images are public and downloadable now. No login was needed for the queries or for a download header check.

## What exists (docs, https://irsa.ipac.caltech.edu/Missions/spherex.html)

- **Products:** Data Release 1 (DR1), Quick Releases (QR2, QR3), multi-extension FITS spectral images (extensions include IMAGE, FLAGS, VARIANCE, ZODI, PSF, WCS-WAVE), a SPLICES ice-source catalog, spectral cubes and HiPS all-sky cubes.
- **Access routes:** SPHEREx Data Explorer web app; IRSA programmatic interfaces (SIA2 and TAP); astroquery (per IRSA's announcement); AWS S3 (no AWS account needed to list); cutout, spectrophotometry, mosaic, source-discovery and Moving Object Search (MOST) tools.
- **Release timeline on the IRSA page:** first quick release July 2025; QR2 October 2025; QR3 September 2026; DR1 November 2026.
- **Bands:** 102 bands from 0.75 to 5.0 micrometres in six detector arrays (D1 to D6), matching the challenge text.
- **Tutorial notebooks** (https://caltech-ipac.github.io/irsa-tutorials/spherex/): intro to spectral images, cutouts, PSF models, source discovery tool, mosaic cubes, HiPS all-sky cubes. Python package requirements are not listed on the index page; check each notebook. None covers light curves.

## Tested: IRSA SIA2 image search

Endpoint: `https://irsa.ipac.caltech.edu/SIA`

Example (tested, returns a VOTable):

```
https://irsa.ipac.caltech.edu/SIA?COLLECTION=spherex_dr1&POS=CIRCLE%20269.452%204.693%200.05&MAXREC=5000
```

**Collection names changed.** A web search result and some documentation still show `COLLECTION=spherex_qr`, which now returns zero rows. The service's own parameter list currently offers:

`spherex_dr1`, `spherex_dr1_cube`, `spherex_dr1_deep`, `spherex_qr3`, `spherex_qr3_deep`

(`spherex_qr2` returns zero rows. `spherex_qr3_deep` returned zero rows for the one position tried.) Always confirm names against the service's self-description, because they change with each release.

### Images covering the challenge's test targets (cone radius 0.05 degrees)

| Target | RA, Dec used (deg) | `spherex_qr3` | `spherex_dr1` |
|--------|--------------------|---------------|---------------|
| Barnard's Star | 269.452, +4.693 | 126 | 255 |
| Epsilon Indi (B is a brown-dwarf pair there) | 330.84, -56.79 | 122 | 402 |
| WISE 0855 | 133.7951, -7.2452 | 0 | 282 |
| RW Aurigae | 76.9565, +30.4 | 115 | 228 |
| R Draconis | 248.17, +66.75 | 127 | 451 |

Notes:
- Coordinates for Epsilon Indi, RW Aurigae and R Draconis are approximate values I entered; WISE 0855 is the challenge's own value. Counts will shift slightly with exact positions.
- The 5,000-row cap was not reached.
- WISE 0855 has no QR3 images but 282 in DR1, so DR1 is the better collection for that target.

## Tested: a download

One DR1 spectral image (obs_id `2025W33_2C_0321_1`, band D6, 4.41 to 5.01 micrometres, 113.6 s exposure, MJD 60902.86):

- URL pattern: `https://irsa.ipac.caltech.edu/ibe/data/spherex/dr1/level2/<week_field>/<version>/<detector>/level2_<obs>_spx_<version>.fits`
- HTTP 200 on a header request; `content-type: application/fits`; **64,952,640 bytes (about 65 MB) for one image**; file dated 25 Sep 2026; range requests supported.

**Practical consequence:** the challenge test targets each overlap 115 to 451 images at about 65 MB each, which is roughly 7 to 29 GB if downloaded in full. For a 48-hour hackathon use the cutout service (it returns the same extensions for a small patch) or the S3 listing, not full-frame downloads. Cutout docs: https://irsa.ipac.caltech.edu/data/SPHEREx/docs/cutout_tool.html

## Not tested

- astroquery calls, the cutout service, the Data Explorer, the S3 bucket listing and the TAP table names. The TAP probe I tried used a guessed table name and returned no rows, so it proves nothing.
- Whether QR3 or DR1 images are ordered or timed for a "video" view of moving objects: the `t_min` field (MJD) is in the SIA2 result and can sort images by time.

## Source links

- IRSA SPHEREx page: https://irsa.ipac.caltech.edu/Missions/spherex.html
- Tutorial notebooks: https://caltech-ipac.github.io/irsa-tutorials/spherex/
- Quick release overview: https://irsa.ipac.caltech.edu/data/SPHEREx/docs/overview_qr.html
- Archive documentation: https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-access
- Challenge Resources tab (links): see the Planet X and SPHEREx section of [06-challenge-resources-2026.md](06-challenge-resources-2026.md)
