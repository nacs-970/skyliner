# Challenge 12: what the SPHEREx data looks like (findings)

Findings from reading the live IRSA services and one FITS file, plus a comparison with the pre-existing simulated demo in `research/demo/` (kept only in the private archive, not in the public repository). Read-only: nothing was built.

## Provenance

- **2026-11-13:** a 3-row SIA2 search for WISE 0855, and a read of the headers and a few pixels of one DR1 FITS file through HTTP range requests (no full download).
- **2026-11-14:** full SIA2 result lists for WISE 0855 (collection `spherex_dr1`, 282 images) and Barnard's Star (collection `spherex_qr3`, 126 images), and the demo comparison.
- Search radius was 0.05 degrees. The positions are the ones in [../07-spherex-data-check.md](../07-spherex-data-check.md). Only WISE 0855 has an official position from the challenge.
- Made with SI assistance (see [../../docs/si-log.md](../../docs/si-log.md)). Each item is tagged **observed** (seen in the returned data), **tested** (a call was run), or **assumed** (taken from the demo or from memory).

## 1. Two layers of data, then our own third step

| Layer | What it is | Holds brightness values? |
|-------|------------|--------------------------|
| 1. Search result | An index table (VOTable, XML) with one row per image: where it is, when it was taken, its wavelength range, footprint and URL | No |
| 2. FITS file | The real measurements: a header plus pixel arrays | Yes |
| 3. Our tool | Turns pixel values into frames a person can look at (not built) | n/a |

Metadata therefore lives in two places: the layer 1 table (about many images) and the header inside each FITS file (about one image).

The images are calibrated Level 2 products (`calib_level` is 2, and the file path says `level2`). They are floating-point grids, not 8-bit pictures, and not raw detector counts. I have not checked whether Level 1 data is offered. Any PNG or WebP made for display is a lossy rendering (the values are squeezed into 8 bits with a brightness stretch), so any motion or brightness analysis should use the float values.

## 2. Search result (layer 1)

Endpoint `https://irsa.ipac.caltech.edu/SIA`, 51 columns per row. Example from the first rows for WISE 0855 (observed):

| Column | Row 1 | Row 2 |
|--------|-------|-------|
| `obs_id` | `2025W19_1B_0116_1` | `2025W19_1B_0116_1` (same exposure) |
| `energy_bandpassname` | `SPHEREx-D3` | `SPHEREx-D6` |
| `em_min`, `em_max` (metres) | 1.6301e-06, 2.4346e-06 | 4.4115e-06, 5.0096e-06 |
| `em_res_power` | 40.6 | 127.8 |
| `t_min` (MJD) | 60800.700028 | 60800.700028 |
| `t_exptime` (s) | 113.5826 | 113.5826 |
| `s_ra`, `s_dec` (image centre, degrees) | 134.4146, -9.0041 | 134.4100, -9.0234 |
| `s_xel1`, `s_xel2` | 2040, 2040 | 2040, 2040 |
| `s_pixel_scale` | 6.150 | 6.150 |
| `s_fov` (degrees) | 3.485 | 3.485 |
| `calib_level` | 2 | 2 |
| `access_estsize` (KB) | 65791 | 65673 |
| `obs_release_date` | 2026-09-27 23:59:28 | |
| `obs_collection` | `spherex_dr1` | |

Other useful columns: `access_url` (the FITS file), `s_region` (the footprint polygon), `target_name` (the survey field, for example `SPS_119395_S12`), and `cloud_access` (a JSON string naming the AWS bucket `nasa-irsa-spherex` and the object key). Whether the bucket can be listed without an account was not tested.

## 3. FITS file (layer 2)

One DR1 file for detector D6 (observed): 65,672,640 bytes (65.7 MB), 7 extensions, big-endian.

| HDU | Name | Content |
|-----|------|---------|
| 0 | PRIMARY | Empty, 5 header cards |
| 1 | `IMAGE` | 2040×2040 float32, `BUNIT=MJy`, 275 header cards |
| 2 | `FLAGS` | 2040×2040 int32 stored as a tile-compressed table (`RICE_1`, lossless), about 11.8 MB of compressed data |
| 3 | `VARIANCE` | 2040×2040 float32, `BUNIT=MJy2` |
| 4 | `ZODI` | 2040×2040 float32, a zodiacal light model for the same grid |
| 5 | `EPSF` | PSF table, 441 rows of 8752 bytes (the IRSA docs call it PSF) |
| 6 | `WCS-WAVE` | Table with 1 row of 720 bytes. Columns `X` and `Y` hold 9 integers each. A third column was not read |

Key header values in `IMAGE` (observed): `DETECTOR=6`, `OBSID=2025W19_1B_0116_1`, `DATE-OBS=2025-05-05T16:48:02.459`, `MJD-OBS=60800.700028461`, `CTYPE1=RA---TAN-SIP`, `CTYPE2=DEC--TAN-SIP`, `CRVAL1=134.409860313`, `CRVAL2=-9.02381012164`, `CRPIX1=CRPIX2=1020.5`.

Position is not stored per pixel. The sky-coordinate mapping (`TAN-SIP` WCS, including distortion terms) converts pixel (x, y) to RA and Dec, and every file has its own. Wavelength comes from the small `WCS-WAVE` table, not from a per-pixel plane. Its contents are not decoded yet.

Pixel sample at row 1020, columns 1016 to 1023 (observed):

```
IMAGE     0.482993 0.565057 0.452844 0.568741 0.417085 0.586322 0.577954 0.530483
VARIANCE  0.00304171 0.00336753 0.0036036 0.00307004 0.00242492 0.00331794 0.003279 0.00296439
ZODI      0.446213 0.446185 0.446145 0.446135 0.446112 0.446117 0.446107 0.446091
```

The scatter in `IMAGE` (about 0.05) matches the square root of `VARIANCE` (about 0.055). `IMAGE` sits close to the `ZODI` model, so zodiacal light is most of the signal in this patch. Whether `IMAGE` is already zodi-subtracted was not checked. The unit string in the header is `MJy`. Whether the true unit is per steradian was not checked.

## 4. Time coverage and release cadence

**Three clocks:**

1. **Sky coverage: every 6 months.** SPHEREx maps the whole sky once per pass. One position is observed in windows about 6 months apart.
2. **Publication: batches, not realtime.** IRSA lists the first quick release in July 2025, QR2 in October 2025, QR3 in September 2026 and DR1 in November 2026. Release dates inside a release roll out over weeks, and the lag between observation and release varies a lot.
3. **Our query: live.** A SIA2 call returns whatever IRSA lists at that moment. Nothing is streamed.

**WISE 0855 in `spherex_dr1`** (observed, 282 images):

- 143 distinct exposures, about 1.97 images per exposure on average. A position lands on only some of the six detectors in each exposure.
- Observed from 2025-05-05 to 2026-05-14 (374 days), in four windows:

| Window | Exposures | Span |
|--------|-----------|------|
| 2025-05-05 to 2025-05-06 | 15 | 0.8 days |
| 2025-10-31 to 2025-11-14 | 66 | 14.2 days |
| 2025-12-11 to 2025-12-13 | 10 | 1.9 days |
| 2026-04-21 to 2026-05-14 | 52 | 23.1 days |

- Release dates: 2026-09-27, 2026-10-05, 2026-10-06 and 2026-10-09. So the lag from observation to release was about 5 to 17 months.
- Images per detector: D1 47, D2 50, D3 46, D4 45, D5 49, D6 45.

**Barnard's Star in `spherex_qr3`** (observed, 126 images):

- 63 exposures, about 2 images per exposure, from 2026-08-16 to 2026-09-22 (37 days), in one window. QR3 alone gives no baseline of months.
- Release dates ran from 2026-09-23 to 2026-10-28, so the lag was days to about 2 months.
- Images per detector: D1 19, D2 25, D3 19, D4 19, D5 25, D6 19.

WISE 0855 has no `spherex_qr3` images at all (tested on 13 Nov).

**Wavelength range per detector** (WISE 0855 `spherex_dr1`, from `em_min` and `em_max`, observed):

| Detector | Range (µm) |
|----------|-----------|
| D1 | 0.75 to 1.12 |
| D2 | 1.10 to 1.65 |
| D3 | 1.63 to 2.43 |
| D4 | 2.40 to 3.85 |
| D5 | 3.81 to 4.43 |
| D6 | 4.41 to 5.01 |

## 5. Where the target sits in the image

Each image is about 3.49 degrees wide (half-width 1.74). Offset of the target from the image centre (observed):

| Target and collection | Minimum | Median | Maximum | Images with offset above 1.4 degrees |
|-----------------------|---------|--------|---------|--------------------------------------|
| WISE 0855, `spherex_dr1` | 0.46 | 1.37 | 2.53 | 134 of 282 |
| Barnard's Star, `spherex_qr3` | 0.04 | 1.22 | 2.28 | 53 of 126 |

The search returns every image whose footprint touches the cone, so many matches have the target near an edge. How the cutout service treats an edge was not tested.

## 6. Problems that come from the data alone

1. **Irregular time series.** Four windows with gaps of months (WISE 0855). Inside a window the time baseline is days. Barnard's Star in QR3 covers only 37 days. (Observed.)
2. **Tiny motion.** Pixels are 6.15 arcseconds. At about 8 arcseconds per year, WISE 0855 moves about 1.3 pixels over the full 374-day baseline. (Assumed: it uses the demo's from-memory proper motion. Verify against Gaia or SIMBAD.)
3. **Time and wavelength are mixed.** Each image covers one detector's wavelength range, and a position gets about 2 images per exposure. Brightness can change from frame to frame because of the filter, not the object. A brown dwarf is probably faint in the short-wavelength arrays. (Observed for the structure. Detectability per band is untested.)
4. **Size and speed.** One image is 65.7 MB, so about 18 GB per target in full frames (282 images). One range request to IRSA took about 3.9 seconds from the test machine (tested once). The cutout service is untested.
5. **Every image has its own sky grid.** Each file has its own `TAN-SIP` WCS and pointing. Aligning frames needs reprojection. The PSF is about one pixel (6 arcseconds, assumed), so images are undersampled. (Observed WCS. PSF size assumed.)
6. **Edges.** The target is often far from the image centre (section 5). Cutout behavior at the edge is untested.
7. **Zodiacal background dominates.** Roughly 9 times the noise in one sample (section 3).
8. **Awkward format for a browser.** Seven extensions, a compressed table for `FLAGS`, and an undecoded `WCS-WAVE` table. Reading FITS directly in a browser (stack Option A) means writing these decoders.
9. **Coverage and versions vary.** A position can return zero images in a collection. DR1 files carry a version string (`l2b-v27-2026-197`). Whether DR1 and QR3 can be combined consistently for a longer baseline is untested.
10. **Open unknowns.** CORS on IRSA, cutout parameters and latency, the meaning of the `FLAGS` bits, the IRSA data license and citation text, and exact positions for four of the five test targets.

## 7. What the challenge asks for

Per the statement in [../02-challenges-2026.md](../02-challenges-2026.md), the tool is a public web viewer. The user enters coordinates (RA and Dec) and sees a series of SPHEREx images of that patch, like a short video, to spot motion. The aim is to help people find comets, asteroids, brown dwarfs and possible new planets, in the way WiseView did for WISE data.

- The text does not require a time-range picker. Adding or subtracting images from different times, summing the six arrays, spectra, field of view, flags and update handling are listed as optional ideas.
- The text does not require automatic motion detection. A person spots the motion.
- Whether to go beyond a viewer is the team's decision (see the scope item in the open decisions of [../../AGENTS.md](../../AGENTS.md)).

A useful mental model is a read-only video player whose "clip" is built on demand:

| Video idea | Here |
|------------|------|
| Video source | A patch of sky, chosen by RA, Dec and field of view |
| Frame | One archive image, cut down to that patch |
| Frame order | `t_min` |
| Timeline | Time slider with play, pause and step |
| Compositing | The optional "add or subtract images" idea |

It differs from a normal video in that frames are unevenly spaced in time, each frame is in a different wavelength range, each source image must be cut and aligned, the clip is built per request, and the motion is only about a pixel.

## 8. The pre-existing demo compared with the data

`research/demo/` is a simulated viewer that existed before this file (kept only in the private archive, not in the public repository; see Decided in AGENTS.md). It states that nothing in it is real SPHEREx data. Comparison:

| Item | Demo (simulated) | Real data | Match |
|------|------------------|-----------|-------|
| Detector arrays | D1 to D6, 17 bands each (102 total), for example D3 1.64 to 2.42 µm | D3 is 1.63 to 2.43 µm, D6 is 4.41 to 5.01 µm | Yes, within 0.03 µm |
| Pixel size | notes "about 6 arcseconds" | 6.15 arcseconds | Yes |
| Wavelength gradient across a raw exposure | modelled | `WCS-WAVE` extension exists | Yes, as a concept |
| WISE 0855 position | the official value | the official value | Yes |
| Epochs | 4 fixed dates (2025-06-01, 2025-12-01, 2026-06-01, 2026-11-01), the same for every position | 143 irregular exposures in 4 windows for WISE 0855 | No |
| Frame size and sampling | 200×200 pixels, 1.5 arcseconds per pixel at the default 5 arcminute field | 2040×2040 pixels at 6.15 arcseconds per pixel, so a 5 arcminute cutout is only about 49 pixels | No |
| Motion of WISE 0855 | about 5 pixels over the demo's epochs | about 1.3 pixels over the full baseline (assumed proper motion) | No |
| Background | stars plus noise | zodiacal light dominates | No |
| Flags | invented hot, saturated and edge pixels | compressed int32 bit mask, not decoded | No |
| Units | arbitrary | `BUNIT=MJy` | No |

Design consequences (data facts only):

- A manifest of epochs is too coarse. The real manifest needs one row per image: detector, wavelength range, footprint, `t_min` and URL.
- The demo's fourth epoch (2026-11-01) has no data for WISE 0855 in DR1, which ends 2026-05-14, and QR3 has no images for it.
- The demo's planned cutout call (`?center=<ra>,<dec>&size=<fov in degrees>`) is a guess. Cutout parameters and CORS are unchecked.

## 9. Not yet verified

- CORS headers on the SIA2 and cutout endpoints.
- Cutout service parameters, output size, latency and edge behavior.
- Whether `IMAGE` is zodi-subtracted, and the true flux unit.
- Meaning of `FLAGS` bits, and the contents of `WCS-WAVE`.
- Real proper motions (use Gaia DR3 or SIMBAD), and exact positions for four of the five test targets.
- Whether DR1 and QR3 can be merged, and how a position near an edge is handled.
- Time coverage for the other four test targets (only WISE 0855 in DR1 and Barnard's Star in QR3 were analysed).
- Which Level 1 or cube products exist and whether they are useful.

## 10. How to reproduce

The queries (positions in degrees, radius 0.05):

```
https://irsa.ipac.caltech.edu/SIA?COLLECTION=spherex_dr1&POS=CIRCLE%20133.7951%20-7.2452%200.05&MAXREC=5000
https://irsa.ipac.caltech.edu/SIA?COLLECTION=spherex_qr3&POS=CIRCLE%20269.452%204.693%200.05&MAXREC=5000
```

The FITS file was read with HTTP range requests (the server returns `206` with `Content-Range`). The header starts at byte 0 in blocks of 2880 bytes. Each extension's data size is `abs(BITPIX)/8 × NAXIS1 × NAXIS2 + PCOUNT`, padded to a multiple of 2880. For the tile-compressed `FLAGS` table, `PCOUNT` (11,775,303) holds the compressed heap and must be included to find the next extension. The file used was:

```
https://irsa.ipac.caltech.edu/ibe/data/spherex/dr1/level2/2025W19_1B/l2b-v27-2026-197/6/level2_2025W19_1B_0116_1D6_spx_l2b-v27-2026-197.fits
```

## Glossary

- **RA (Right Ascension) and Dec (Declination):** the sky's longitude and latitude. Dec runs from -90 to +90 degrees. RA runs from 0 to 24 hours, or 0 to 360 degrees (one hour is 15 degrees). WISE 0855 is RA 08h55m10.831s, Dec -7d14m42.53s, which is about 133.795 and -7.245 degrees.
- **FITS:** the standard file format of astronomy. A file is a list of extensions (HDUs), each with a header and data.
- **HDU:** one extension of a FITS file.
- **WCS:** World Coordinate System, the header keywords that map pixel positions to sky positions (or to wavelength).
- **VOTable:** an XML table format used by astronomy services.
- **SIA2:** the Simple Image Access protocol (version 2) used to search for images.
- **MJD:** Modified Julian Date, a day count. MJD 60800.7 is 5 May 2025.
- **Zodiacal light:** sunlight scattered by dust in the solar system. It is the main background in infrared sky images.
