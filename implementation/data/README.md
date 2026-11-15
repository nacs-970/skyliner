# data/

- `cache/` holds downloaded SPHEREx products and generated frames. It is gitignored, with one exception: the small display set of the five NASA test targets (see below). Never commit anything else from it, above all no FITS files and no raw cutouts.
- `fixtures/` holds tiny files for tests. It is tracked, so keep every file small and list its source in [docs/references.md](../../docs/references.md).

Both folders are created when first needed. Downloaded files are untrusted input: parse them with astropy, never with `pickle` or `eval`.

## The committed display set

So that a person who only opens the repository sees real images at once (no service, no wait), the files below are committed for the five NASA test targets (WISE 0855, Barnard's Star, Epsilon Indi B, RW Aurigae, R Draconis), **detector D6 only**, about 21 MB in all:

| File (under `cache/cell_demo/<patch>/`) | What it is |
|------|------------|
| `target.json` | the position, its name and how it was found |
| `D6_full/sky.data.js` | the real calibrated pixels around the target on one sky grid, with times, wavelengths and a no-data mask (made with `export --slim`) |
| `D6_full/sky.index.js` | the frame list (times, wavelengths) for the timeline |
| `D6_full/sky.store.js` | the lossy cell store that the page decodes in the browser |
| `cache/cell_demo/targets.js` | the list of these patches, for the patch picker and the landing page |

They are small display extracts, not FITS files: a 0.2 degree region of each SPHEREx image, from NASA's `spherex_dr1` data via IRSA, resampled onto one grid. They carry a header that says SI-written code produced them. The acknowledgement that goes with SPHEREx data is in [docs/references.md](../../docs/references.md) and on the page under Credits. Everything else in `cache/` (raw cutouts, the other detectors, patches you prepare yourself) stays gitignored by the rules in the root `.gitignore`.

**Rules for people who work here**

- `targets.js` is tracked and lists only the committed patches. When you run `export` on a machine that has more patches, the pipeline rewrites it to list all of them, and `git status` shows it as changed. Do not commit that change. Either run `git update-index --skip-worktree implementation/data/cache/cell_demo/targets.js` once, or leave the file out of `git add`.
- Do not re-export the committed patches and commit them again without a reason: each new version stays in the git history for good.
- To add a patch to the set, add its folder name to the allow list in `.gitignore`, export it with `--slim`, and check that the total stays small.
