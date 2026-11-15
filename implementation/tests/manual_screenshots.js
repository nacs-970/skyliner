// Takes the screenshots for docs/user-manual.md from the RUNNING app (headless Chrome, real pages, real data).
// Start the service first:   NO_BROWSER=1 PORT=8123 uv run --script implementation/server/app.py
// Run:                       node implementation/tests/manual_screenshots.js [port]       Output: docs/manual/img/*.png
// It also starts one real preparation job (a position that is not prepared) to show the progress bar, and cancels it
// after the picture; the last picture needs the service to be stopped, so the script stops the service on that port.
// Every picture gets a visible "SI-generated" strip below it (implementation/scripts/watermark_images.py, AGENTS.md rule 2).
// The numbered orange badges on some images are drawn on top of the page by this script, for the manual only.
// SI-GENERATED CODE: written by Claude Sonnet 5.5 (Anthropic) through Claude Code on 2026-11-15. See docs/si-log.md.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { launch, sleep } = require('./cdp.js');
const PORT = process.argv[2] || '8123';
const BASE = `http://127.0.0.1:${PORT}/web`;
const OUT = path.resolve(__dirname, '../../docs/manual/img');
const RAW = fs.mkdtempSync(path.join(require('os').tmpdir(), 'skyflip-shots-')); // unmarked pictures; the watermark step writes the marked copies to OUT
const finish = () => { execSync(`uv run --script ${JSON.stringify(path.resolve(__dirname, '../scripts/watermark_images.py'))} ${JSON.stringify(RAW)} ${JSON.stringify(OUT)}`, { stdio: 'inherit' }); fs.rmSync(RAW, { recursive: true, force: true }); };

(async () => {
  const b = await launch(9400 + Math.floor(Math.random() * 400)); // a new profile each run: first-visit state
  await b.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const shot = async (name, clip) => {
    const r = await b.send('Page.captureScreenshot', Object.assign({ format: 'png' }, clip ? { clip: Object.assign({ scale: 1 }, clip) } : {}));
    fs.writeFileSync(path.join(RAW, name + '.png'), Buffer.from(r.result.data, 'base64'));
    console.log('saved', name + '.png');
  };
  const rect = (sel) => b.ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()`);
  const badges = (items) => b.ev(`(()=>{document.querySelectorAll('.mbadge').forEach(e=>e.remove());
    for(const [n,x,y] of ${JSON.stringify(items)}){const e=document.createElement('div');e.className='mbadge';e.textContent=n;
    e.style.cssText='position:fixed;z-index:99999;left:'+x+'px;top:'+y+'px;width:26px;height:26px;border-radius:13px;background:#ff8a00;color:#000;font:700 15px/26px sans-serif;text-align:center;box-shadow:0 0 0 2px #fff;pointer-events:none';document.body.appendChild(e);}})()`);
  const mouse = async (type, x, y, extra) => b.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, button: 'left', clickCount: 1 }, extra || {}));
  const dbl = async (x, y) => { await mouse('mouseMoved', x, y); for (const n of [1, 2]) { await mouse('mousePressed', x, y, { clickCount: n }); await mouse('mouseReleased', x, y, { clickCount: n }); } await sleep(600); };

  // 1 and 2. front page (service running), and a wrong value
  await b.nav(BASE + '/index.html', 3500);
  await shot('01-front-page');
  await b.type('#l-ra', '400'); await b.type('#l-dec', '-7.2451'); await b.click('#l-go'); await sleep(500);
  await shot('02-front-page-error');

  // 3. open Barnard's Star from the front page (the real flow); the first visit shows the introduction
  await b.nav(BASE + '/index.html', 3000);
  await b.ev(`[...document.querySelectorAll('#l-chips .chip')].find(x=>/Barnard/.test(x.textContent)).click()`);
  await sleep(6000);
  const KEY = new URL(await b.ev('location.href')).searchParams.get('target');
  console.log('patch', KEY);
  await shot('03-viewer-first-visit');
  const V = (q) => `${BASE}/drafts/v1-studio-real.html?target=${KEY}&d=D6${q || ''}`;

  // 4. overview with numbered badges (introduction dismissed, whole patch, a frame in the first window)
  await b.click('#intro-ok'); await sleep(300);
  await b.nav(V('&f=12'), 4500);
  const R = {};
  for (const [k, s] of Object.entries({ back: 'a.back', head: '#v-frame', stage: '#canvas', play: 'button[title^="Play or pause"]', tools: 'button[title^="Set clip points"]', speed: '#chip-speed', tl: '#tl', side: 'aside.side', chip: '#chip-target' })) R[k] = await rect(s);
  for (const k of Object.keys(R)) if (!R[k]) throw new Error('element not found: ' + k);
  await badges([
    ['1', R.back.x + 24, R.back.y + 24], ['2', 452, 62], ['3', R.stage.x - 36, R.stage.y + 6],
    ['4', R.play.x - 190, R.play.y + 8], ['5', R.tools.x + 160, R.tools.y + 8],
    ['6', 600, R.tl.y - 52 + 52], ['7', R.side.x - 36, R.side.y + 130], ['8', R.chip.x - 36, R.chip.y],
  ]);
  await shot('04-viewer-overview');
  await b.ev(`document.querySelectorAll('.mbadge').forEach(e=>e.remove())`);

  // 5 and 6. sidebar: Display, then Playback
  const side = R.side;
  await b.ev(`document.querySelector('aside.side').scrollTop=250`); await sleep(300);
  await shot('05-sidebar-display', { x: side.x, y: side.y, width: side.w, height: side.h });
  await b.ev(`document.querySelector('aside.side').scrollTop=720`); await sleep(300);
  await shot('06-sidebar-playback', { x: side.x, y: side.y, width: side.w, height: side.h });
  await b.ev(`document.querySelector('aside.side').scrollTop=0`);

  // 7 and 8. timeline: whole span, then zoomed to the first observing window (double-click it)
  const tl = R.tl;
  await shot('07-timeline-full', { x: 0, y: tl.y - 6, width: 1440, height: 900 - tl.y + 6 });
  for (let i = 0; i < 4; i++) await b.click('#tz-in'); // zoom in around the playhead (the + button)
  await shot('08-timeline-zoomed', { x: 0, y: tl.y - 6, width: 1440, height: 900 - tl.y + 6 });

  // 9. picture zoomed in with the magnifier (the navigator appears at the top left)
  await b.nav(V('&f=12'), 4000);
  await b.click('button[title^="Magnifier"]');
  const st = await rect('#canvas');
  for (let i = 0; i < 2; i++) { await mouse('mouseMoved', st.x + st.w / 2, st.y + st.h / 2); await mouse('mousePressed', st.x + st.w / 2, st.y + st.h / 2); await mouse('mouseReleased', st.x + st.w / 2, st.y + st.h / 2); await sleep(500); }
  await shot('09-picture-zoomed', { x: st.x - 20, y: st.y - 10, width: st.w + 40, height: st.h + 20 });

  // 10. a requested position inside the patch: the ring appears and the view zooms
  await b.nav(V('&f=12&ra=269.4700&dec=4.7690'), 4500);
  await shot('10-requested-position', { x: st.x - 20, y: st.y - 10, width: st.w + 40, height: st.h + 20 });

  // 11. a time with no observation (inside the gap between observing windows)
  await b.nav(V('&t=61050'), 4500);
  await shot('11-no-observation', { x: 0, y: 40, width: 1150, height: 860 });

  if (process.env.SKIP_NET) { b.close(); finish(); return; } // SKIP_NET=1: leave out the last two pictures (they start a real job and stop the service)
  // 12. a new position, prepared for real by the service: progress bar (then cancelled)
  await b.nav(BASE + '/index.html', 3000);
  await b.type('#l-ra', '133.95'); await b.type('#l-dec', '-7.245'); await b.click('#l-go');
  let seen = false;
  for (let i = 0; i < 40 && !seen; i++) { await sleep(3000); seen = await b.ev(`(()=>{const p=document.getElementById('pg-bar');return !!(p&&p.hasAttribute('value')&&p.value>3)})()`); }
  console.log('progress visible:', seen, await b.ev(`(document.getElementById('pg-msg')||{}).textContent`));
  await shot('12-progress', { x: 420, y: 270, width: 600, height: 360 });
  await b.ev(`document.getElementById('pg-cancel').click()`); await sleep(2500);
  console.log('after cancel:', await b.ev(`(document.getElementById('l-msg')||{}).textContent`));

  // 13. the service is not running: the loading screen shows the start command and waits
  execSync(`kill $(lsof -ti tcp:${PORT}) || true`, { shell: '/bin/bash' });
  await sleep(1500);
  await b.type('#l-ra', '150.2'); await b.type('#l-dec', '2.3'); await b.click('#l-go'); await sleep(3500);
  await shot('13-service-not-running', { x: 420, y: 290, width: 600, height: 320 });
  b.close();
  finish(); // adds the "SI-generated" strip (AGENTS.md rule 2) and writes the pictures to docs/manual/img/
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
