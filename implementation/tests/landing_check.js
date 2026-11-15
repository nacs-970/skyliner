// Manual check of the web app flow in headless Chrome against the local service, with a stub in place of the real pipeline:
// blank landing page, bad input, a prepared position (opens at once), a new position (progress bar, then the viewer opens), a position
// with no images (plain error), and cancelling. The stub writes only fake patches into a temporary cache folder, which is removed.
// Needs Node 22 or later, google-chrome or chromium (or $CHROME), and uv (it starts implementation/server/app.py). No packages.
// SI-GENERATED CODE: written by Claude Sonnet 5.5 (Anthropic) through Claude Code on 2026-11-15. See docs/si-log.md.
//   node implementation/tests/landing_check.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { launch, sleep } = require('./cdp.js');

const PORT = 8123, BASE = `http://127.0.0.1:${PORT}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skyflip-landing-'));
const cache = path.join(tmp, 'cell_demo');
fs.mkdirSync(cache);
// a "prepared" WISE 0855 patch for the stub service to find
const wise = path.join(cache, 'ra133.7951_dec-7.2451_s0.2_spherex_dr1');
fs.mkdirSync(path.join(wise, 'D6_full'), { recursive: true });
fs.writeFileSync(path.join(wise, 'target.json'), JSON.stringify({ name: 'WISE 0855', ra: 133.795129, dec: -7.245147, collection: 'spherex_dr1', size_deg: 0.2 }));
fs.writeFileSync(path.join(wise, 'D6_full', 'sky.data.js'), 'window.SKY = {};');
const stub = path.join(tmp, 'stub_pipeline.py');
fs.writeFileSync(stub, `
import json, os, sys, time
from pathlib import Path
a = sys.argv[1:]
get = lambda k: a[a.index(k) + 1]
ra, dec, det = float(get("--ra")), float(get("--dec")), get("--detector")
root = Path(os.environ["SKYFLIP_CACHE"])
key = f"ra{ra:.4f}_dec{dec:+.4f}_s0.2_spherex_dr1".replace("+", "")
patch = root / key
if a[0] == "fetch":
    new = not patch.exists(); patch.mkdir(exist_ok=True)
    (patch / "target.json").write_text(json.dumps({"name": get("--name"), "ra": ra, "dec": dec, "collection": "spherex_dr1", "size_deg": 0.2}))
    print(f"cache: {'new' if new else 'reusing'} patch {key}", flush=True)
    if abs(dec + 45.0) < 1e-3:
        print("no spherex_dr1 images cover this position: nothing to fetch", file=sys.stderr, flush=True); sys.exit(1)
    print(f"keeping detector {det} only: 6 images", flush=True)
    for k in range(1, 7):
        time.sleep(1.2)
        print(f"  [{k}/6] 00{k} SPHEREx-{det} 2.1 MB read by range requests, kept 110 KB  ({k * 1.2 / 60:.1f} min elapsed, about {(6 - k) * 1.2 / 60:.1f} min left)", flush=True)
else:
    (patch / f"{det}_full").mkdir(exist_ok=True); (patch / f"{det}_full" / "sky.data.js").write_text("window.SKY = {};")
`);

let fails = 0;
const ok = (c, m, extra = '') => { console.log((c ? 'PASS ' : 'FAIL ') + m + (extra ? '  [' + extra + ']' : '')); if (!c) fails++; };

(async () => {
  const root = path.resolve(__dirname, '../..');
  const py = process.env.PYTHON || 'python3';
  const startService = (port) => spawn('uv', ['run', '--script', 'implementation/server/app.py'], {
    cwd: root, stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, PORT: String(port), NO_BROWSER: '1', SKYFLIP_CACHE: cache, SKYFLIP_PIPELINE_CMD: JSON.stringify([py, stub]) },
  });
  const healthy = async (port) => { for (let i = 0; i < 120; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return true; } catch (e) { await sleep(500); } } return false; };
  const srv = startService(PORT);
  const up = await healthy(PORT);
  if (!up) { console.log('FAIL the service did not start'); srv.kill(); process.exit(1); }
  const b = await launch(9399);
  const st = () => b.ev(`JSON.stringify({url:location.pathname+location.search, ra:document.getElementById('l-ra')&&document.getElementById('l-ra').value,
    msg:(document.getElementById('l-msg')||{}).textContent, err:(document.getElementById('l-msg')||{classList:{contains:()=>false}}).classList.contains('err'),
    ov:(()=>{const o=document.querySelector('.pg-back'); if(!o||o.hidden) return null; const bar=o.querySelector('#pg-bar'); return {title:o.querySelector('#pg-title').textContent, val:bar.hasAttribute('value')?bar.value:null, text:o.querySelector('#pg-msg').textContent, failed:o.querySelector('.pg-card').classList.contains('err'), btn:o.querySelector('#pg-cancel').textContent};})(),
    chips:[...document.querySelectorAll('#l-chips button')].map(x=>x.textContent)})`).then(JSON.parse);
  let srv2 = null;
  try {
    await b.nav(BASE + '/', 2500);
    let s = await st();
    ok(/\/web\/index\.html/.test(s.url), 'the service address opens the landing page', s.url);
    ok(s.ra === '' && !s.ov, 'the page starts blank: no coordinates, no progress card');
    ok(await b.ev("!!document.querySelector('.lp h1') && /time/i.test(document.querySelector('.lp h1').textContent)"), 'it explains what the app does');
    ok(s.chips.length >= 1, 'test targets are offered as one-click examples', s.chips.join(', '));

    await b.type('#l-ra', 'abc'); await b.type('#l-dec', 'x1y2z');
    s = await st();
    ok(s.ra === '' && /Other letters are not allowed/.test(s.msg), 'letters cannot be typed into RA', JSON.stringify([s.ra, s.msg.slice(0, 40)]));
    await b.type('#l-ra', ''); await b.type('#l-dec', '');
    await b.click('#l-go');
    s = await st();
    ok(s.err && /RA must be/.test(s.msg) && /Dec must be/.test(s.msg), 'an empty form says what is needed and does not start anything', s.msg.slice(0, 80));

    // a prepared position opens at once
    await b.type('#l-ra', '08h55m10.831s'); await b.type('#l-dec', '-7d14m42.53s');
    await b.click('#l-go');
    await sleep(1500);
    s = await st();
    ok(/v1-studio-real\.html\?target=ra133\.7951_dec-7\.2451_s0\.2_spherex_dr1&ra=133\.7/.test(s.url), 'a prepared position (typed in hours and degrees) opens the viewer at once', s.url);

    // a new position: progress, then the viewer
    await b.nav(BASE + '/', 2000);
    await b.type('#l-ra', '20.0'); await b.type('#l-dec', '30.0');
    await b.click('#l-go');
    await sleep(2500);
    s = await st();
    ok(s.ov && /Preparing RA 20\.0000, Dec 30\.0000/.test(s.ov.title), 'a new position shows the progress card', s.ov && s.ov.title);
    ok(s.ov && s.ov.val !== null && s.ov.val > 2, 'the bar shows how far it is', String(s.ov && s.ov.val));
    ok(s.ov && /Reading image \d+ of 6/.test(s.ov.text), 'and says which image it is reading', s.ov && s.ov.text);
    await sleep(8000);
    s = await st();
    ok(/v1-studio-real\.html\?target=ra20\.0000_dec30\.0000_s0\.2_spherex_dr1&ra=20\.00000&dec=30\.00000&d=D6/.test(s.url), 'when it is ready the viewer opens on the new patch', s.url);

    // asking for the same position again opens at once (it is prepared now)
    await b.nav(BASE + '/?ra=20&dec=30', 3500);
    s = await st();
    ok(/v1-studio-real\.html\?target=ra20\.0000_dec30/.test(s.url), 'a link with ?ra=&dec= runs the form, and the same position now opens at once', s.url);

    // cancel
    await b.nav(BASE + '/', 2000);
    await b.type('#l-ra', '21.0'); await b.type('#l-dec', '30.0');
    await b.click('#l-go');
    await sleep(2200);
    ok((await st()).ov !== null, 'a second new position shows its progress card');
    await b.click('.pg-card #pg-cancel');
    await sleep(2500);
    s = await st();
    ok(!s.ov && /Cancelled/.test(s.msg) && /index\.html/.test(s.url), 'Cancel closes the card, says so, and stays on the landing page', s.msg);

    // no images
    await b.nav(BASE + '/', 2000);
    await b.type('#l-ra', '80.0'); await b.type('#l-dec', '-45.0');
    await b.click('#l-go');
    await sleep(4000);
    s = await st();
    ok(s.ov && s.ov.failed && /no images/i.test(s.ov.text) && s.ov.btn === 'OK', 'a position with no images gets a plain message and an OK button', s.ov && s.ov.text);
    await b.click('.pg-card #pg-cancel');
    await sleep(600);
    s = await st();
    ok(!s.ov && /index\.html/.test(s.url), 'OK closes the message and the form can be used again');

    // the viewer's detector menu: a detector that is not prepared yet is prepared from the menu (a real patch with only D6 is needed;
    // the stub service stands in for the pipeline, so nothing is fetched)
    let part = null;
    try { const w = {}; new Function('window', fs.readFileSync(path.join(root, 'implementation/data/cache/cell_demo/targets.js'), 'utf8'))(w); part = (w.TARGETS || []).filter((x) => x.detectors.length < 6 && x.detectors.some((y) => y.det === 'D6')).sort((x, y) => x.detectors.length - y.detectors.length)[0]; } catch (e) { /* no cache */ }
    if (!part) console.log('SKIP detector menu: no prepared patch with an unprepared detector in implementation/data/cache (prepare one position first)');
    else {
      const pk = path.join(cache, part.key);
      fs.mkdirSync(path.join(pk, 'D6_full'), { recursive: true });
      fs.writeFileSync(path.join(pk, 'target.json'), JSON.stringify({ name: part.name, ra: part.ra, dec: part.dec, collection: 'spherex_dr1', size_deg: 0.2 }));
      fs.writeFileSync(path.join(pk, 'D6_full', 'sky.data.js'), 'window.SKY = {};');
      const missingDet = ['D1', 'D2', 'D3', 'D4', 'D5'].find((d) => !part.detectors.some((y) => y.det === d));
      const V = BASE + '/web/drafts/v1-studio-real.html?target=' + part.key + '&ra=' + part.ra.toFixed(5) + '&dec=' + part.dec.toFixed(5);
      const opts = () => b.ev(`JSON.stringify([...document.getElementById('p-det').options].map(o=>({v:o.value,dis:o.disabled,t:o.textContent})))`).then(JSON.parse);
      await b.nav(V + '&service=8199', 2500); // no service on that port: the unprepared detectors stay greyed out
      let o = await opts();
      ok(o.find((x) => x.v === missingDet).dis, `without the service ${missingDet} stays greyed out`);
      await b.nav(V, 3000); // served by the stub service
      o = await opts();
      ok(!o.find((x) => x.v === missingDet).dis && /not prepared yet/.test(o.find((x) => x.v === missingDet).t), `with the service ${missingDet} can be chosen and says it is not prepared yet`, JSON.stringify(o.find((x) => x.v === missingDet)));
      ok(await b.ev("!document.getElementById('det-note').hidden"), 'a note explains that choosing it takes a few minutes');
      ok(await b.ev(`(document.querySelector('.tl-labels > div[data-det="${missingDet}"]')||{}).title.startsWith('Prepare')`), `its timeline lane offers to prepare it`);
      await b.ev(`(()=>{const s=document.getElementById('p-det'); s.value='${missingDet}'; s.dispatchEvent(new Event('change'));})()`);
      await sleep(2500);
      s = await st();
      ok(s.ov && new RegExp('Preparing RA ' + part.ra.toFixed(4)).test(s.ov.title), 'choosing it shows the progress card for this patch', s.ov && s.ov.title);
      ok(await b.ev("document.getElementById('p-det').disabled"), 'the menu is locked while it is preparing');
      await sleep(10000);
      s = await st();
      const went = await b.ev("performance.getEntriesByType('navigation')[0].name"); // the address it went to (the real page then cleans ?d= because the stub built no real data)
      ok(went.includes('target=' + part.key) && went.includes('d=' + missingDet) && /[?&]t=/.test(went) && !s.ov, `when it is ready the same patch opens on ${missingDet}, at the same time`, went.slice(-110));
      ok(await b.ev(`new URLSearchParams(location.search).get('ra') === '${part.ra.toFixed(5)}'`), 'the requested position is kept');
    }

    // opened as a plain file while the service is not running: the page waits, and carries on by itself when the service starts
    const FILE = 'file://' + path.join(root, 'implementation/web/index.html') + '?service=8124';
    await b.nav(FILE, 3500);
    ok(await b.ev("!document.getElementById('l-svc').hidden"), 'opened as a file with no service: the page says the service is not running yet');
    await b.type('#l-ra', '30.0'); await b.type('#l-dec', '30.0');
    await b.click('#l-go');
    await sleep(3000);
    s = await st();
    ok(s.ov && /Waiting for the preparation service/.test(s.ov.title), 'a new position then shows a loading screen that waits for the service', s.ov && s.ov.title);
    ok(await b.ev("/start\\.sh/.test(document.querySelector('.pg-card code').textContent)"), 'and shows the command that starts it');
    srv2 = startService(8124);
    ok(await healthy(8124), 'the service is started now (nothing is typed in the page)');
    await sleep(7000);
    s = await st();
    ok(s.ov && /Preparing RA 30\.0000, Dec 30\.0000/.test(s.ov.title), 'the page notices the service and starts preparing the position by itself', s.ov && s.ov.title);
    ok(await b.ev("[...document.querySelectorAll('.pg-steps li')].some((li) => li.className === 'active' || li.className === 'done')"), 'the loading screen marks its steps');
    await sleep(11000);
    s = await st();
    ok(/v1-studio-real\.html\?target=ra30\.0000_dec30\.0000_s0\.2_spherex_dr1/.test(s.url), 'and opens the viewer when it is ready (from a file)', s.url);
    srv2.kill();
  } finally {
    b.close(); srv.kill(); if (srv2) srv2.kill();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(fails ? `\n${fails} FAILED` : '\nall checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
