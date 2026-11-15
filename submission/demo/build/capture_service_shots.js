// Captures the landing page and the progress card from the real app WITH the local service running (so the page shows no
// "service not running" notice). The progress card comes from one real preparation job that is cancelled a few seconds after it
// starts reading images (the same polite use as implementation/tests/manual_screenshots.js).
// SI-GENERATED CODE: written by Claude Sonnet 5.5 (Anthropic) through Claude Code on 2026-11-15. See docs/si-log.md.
// Start the service first:  NO_BROWSER=1 PORT=8124 uv run --script implementation/server/app.py
// Run:                      node submission/demo/build/capture_service_shots.js [port]     Output: submission/demo/assets/real/
const fs = require('fs');
const path = require('path');
const { launch, sleep } = require('../../../implementation/tests/cdp.js');
const PORT = process.argv[2] || '8124';
const OUT = path.resolve(__dirname, '../assets/real');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await launch(9431);
  await b.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const shot = async (name) => {
    const r = await b.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, name), Buffer.from(r.result.data, 'base64'));
    console.log('saved', name);
  };
  await b.nav(`http://127.0.0.1:${PORT}/`, 3000);
  await shot('landing-blank.png');
  await b.type('#l-ra', '269.4463');
  await b.type('#l-dec', '4.7675');
  await sleep(400);
  await shot('landing-typed.png');
  // a position that is not prepared: the service starts a real job and the page shows the progress card
  await b.nav(`http://127.0.0.1:${PORT}/`, 2500);
  await b.type('#l-ra', '133.95');
  await b.type('#l-dec', '-7.245');
  await b.click('#l-go');
  let text = '';
  for (let i = 0; i < 40; i++) { // wait until it is reading images (up to about 2 minutes)
    await sleep(3000);
    text = await b.ev("(document.querySelector('#pg-msg')||{}).textContent || ''");
    if (/Reading image \d+ of \d+/.test(text) && !/image 1 of/.test(text)) break;
  }
  await sleep(4000);
  text = await b.ev("(document.querySelector('#pg-msg')||{}).textContent || ''");
  console.log('progress text:', text);
  await shot('progress.png');
  await b.click('.pg-card #pg-cancel'); // cancel the job
  await sleep(2500);
  console.log('after cancel:', await b.ev("(document.querySelector('#l-msg')||{}).textContent || ''"));
  b.close();
  process.exit(0);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
