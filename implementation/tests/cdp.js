// Minimal Chrome DevTools driver for the manual page checks (no dependencies; needs Node 22 or later and google-chrome or chromium).
// SI-GENERATED CODE: written by Claude Sonnet 5.5 (Anthropic) through Claude Code on 2026-11-14. See docs/si-log.md.
const { spawn, spawnSync } = require('child_process');
// the browser: $CHROME, else google-chrome or chromium, whichever is installed
const CHROME = process.env.CHROME || ['google-chrome', 'chromium', 'chromium-browser'].find((c) => spawnSync('sh', ['-c', `command -v ${c}`]).status === 0) || 'google-chrome';
const http = require('http');
const get = (u) => new Promise((res, rej) => http.get(u, (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => res(d)); }).on('error', rej));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function launch(port = 9333) {
  const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--window-size=1400,900', `--remote-debugging-port=${port}`, '--user-data-dir=/tmp/cdp-prof-' + port, 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await get(`http://127.0.0.1:${port}/json/version`); break; } catch (e) { await sleep(200); } }
  const tabs = JSON.parse(await get(`http://127.0.0.1:${port}/json`));
  const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pend = new Map();
  ws.addEventListener('message', (m) => { const o = JSON.parse(m.data); if (o.id && pend.has(o.id)) { pend.get(o.id)(o); pend.delete(o.id); } });
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
  const nav = async (url, wait = 2500) => { await send('Page.navigate', { url }); await sleep(wait); };
  const click = async (sel) => { // a real mouse press and release at the centre of the element
    const b = await ev(`(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`);
    for (const t of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type: t, x: b[0], y: b[1], button: 'left', clickCount: 1 });
    await sleep(1800);
  };
  const type = async (sel, text) => { await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.focus();e.select();})()`); await send('Input.insertText', { text }); };
  const key = async (k) => { for (const t of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type: t, key: k, code: k, windowsVirtualKeyCode: k === 'Enter' ? 13 : 0 }); await sleep(1800); };
  return { ev, nav, click, type, key, send, close: () => { ws.close(); ch.kill(); } };
}
module.exports = { launch, sleep };
