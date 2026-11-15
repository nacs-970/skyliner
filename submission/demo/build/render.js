// Renders submission/demo/index.html to an MP4: headless Chrome steps the page through time with seek(t), one screenshot per frame
// (30 per second, 1920 by 1080), and ffmpeg joins the frames with the voice-over track.
// SI-GENERATED CODE: written by Claude Sonnet 5.5 (Anthropic) through Claude Code on 2026-11-15. See docs/si-log.md.
//   node submission/demo/build/render.js                      renders submission/demo/skyliner-demo.mp4
//   node submission/demo/build/render.js --preview 1.5,6,12   saves only those moments as PNG files in --out DIR (default: a temp folder)
// Needs Node 22 or later, google-chrome or chromium (or $CHROME), and ffmpeg. Nothing is fetched from the network.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { launch, sleep } = require('../../../implementation/tests/cdp.js');
const DEMO = path.resolve(__dirname, '..');
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const FPS = 30, SCALE = 1.5;

(async () => {
  const b = await launch(9440);
  await b.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: SCALE, mobile: false });
  await b.nav('file://' + path.join(DEMO, 'index.html') + '?render=1', 1500);
  await b.ev('window.READY');
  const total = await b.ev('window.TOTAL');
  const frameAt = async (t, file) => {
    await b.ev(`(async () => { window.seek(${t}); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); })()`);
    const r = await b.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  };
  const preview = arg('--preview');
  if (preview) {
    const out = arg('--out') || fs.mkdtempSync(path.join(os.tmpdir(), 'skyliner-preview-'));
    fs.mkdirSync(out, { recursive: true });
    for (const t of preview.split(',').map(Number)) { await frameAt(t, path.join(out, `t${String(t).replace('.', '_')}.png`)); console.log('saved', t); }
    console.log('folder', out); b.close(); process.exit(0);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skyliner-frames-'));
  const n = Math.round(total * FPS), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await frameAt(i / FPS, path.join(tmp, String(i).padStart(4, '0') + '.png'));
    if (i % 90 === 0) console.log(`frame ${i} of ${n}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  b.close();
  const out = path.join(DEMO, 'skyliner-demo.mp4');
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, '%04d.png'), '-i', path.join(DEMO, 'assets/vo/vo-full.wav'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', // the raw voice is quiet (-24 LUFS): bring it to about -16 LUFS, the usual level for online video
     '-t', String(total), '-movflags', '+faststart',
    '-metadata', 'title=Skyliner demo (SI-generated video, voice by Underdog Woof)',
    '-metadata', 'comment=SI-generated video made with HTML and CSS by Claude Sonnet 5.5 through Claude Code. Voice: Underdog Woof (underdog.ai), SI-generated speech. Data: NASA SPHEREx via IRSA.',
    out], { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });
  if (r.status !== 0) { console.error('ffmpeg failed'); process.exit(1); }
  console.log('wrote', out);
  process.exit(0);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
