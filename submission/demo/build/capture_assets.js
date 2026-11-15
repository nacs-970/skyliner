// Captures the real pictures for the Skyliner demo video from the real app (headless Chrome, the committed Barnard's Star data):
// clean screenshots of the landing page and the viewer, every frame of Barnard's Star on detector D6 exactly as the viewer draws it
// (its canvas), and the frame list (observation times and wavelengths).
// SI-GENERATED CODE: written by Claude Sonnet 5.5 (Anthropic) through Claude Code on 2026-11-15. See docs/si-log.md.
// Run from the repository root:  node submission/demo/build/capture_assets.js     Output: submission/demo/assets/real/
// Nothing is fetched from the network: the pages open as files and read the data in implementation/data/cache/cell_demo/.
const fs = require('fs');
const path = require('path');
const { launch, sleep } = require('../../../implementation/tests/cdp.js');
const ROOT = path.resolve(__dirname, '../../..');
const OUT = path.resolve(__dirname, '../assets/real');
fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });
const KEY = 'ra269.4463_dec4.7675_s0.2_spherex_dr1'; // Barnard's Star, as listed in targets.js
const VIEWER = 'file://' + path.join(ROOT, 'implementation/web/drafts/v1-studio-real.html') + '?service=9&target=' + KEY + '&d=D6';
const LANDING = 'file://' + path.join(ROOT, 'implementation/web/index.html') + '?service=9';

(async () => {
  const b = await launch(9430);
  await b.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const shot = async (name) => {
    const r = await b.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, name), Buffer.from(r.result.data, 'base64'));
    console.log('saved', name);
  };
  // the introduction card of the viewer is shown on a first visit: mark it seen, as a returning visitor would have
  await b.nav(VIEWER + '&f=1', 2500);
  await b.ev("localStorage.setItem('skyflip.introSeen','1')");

  await b.nav(LANDING, 2500);
  await shot('landing-blank.png');
  await b.type('#l-ra', '269.4463');
  await b.type('#l-dec', '4.7675');
  await sleep(400);
  await shot('landing-typed.png');

  await b.nav(VIEWER + '&f=12', 3500);
  await shot('viewer.png');

  const info = JSON.parse(await b.ev('JSON.stringify({n: SKY.n, w: SKY.w, h: SKY.h, det: SKY.det, unit: SKY.unit, wave_range_um: SKY.wave_range_um, frames: SKY.frames, name: SKY.target.name})'));
  fs.writeFileSync(path.join(OUT, 'frames.json'), JSON.stringify(info, null, 1));
  for (let n = 1; n <= info.n; n++) {
    await b.nav(VIEWER + '&f=' + n, 1100);
    const label = await b.ev("(document.querySelector('#fd-mjd')||{}).textContent");
    const url = await b.ev("document.getElementById('pic').toDataURL('image/png')");
    fs.writeFileSync(path.join(OUT, 'frames', String(n).padStart(2, '0') + '.png'), Buffer.from(url.split(',')[1], 'base64'));
    if (n % 8 === 1 || n === info.n) console.log('frame', n, 'mjd', label);
  }
  b.close();
  process.exit(0);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
