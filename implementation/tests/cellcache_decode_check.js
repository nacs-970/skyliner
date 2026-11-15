// Manual check: the browser decoder (implementation/web/drafts/cellcache.js) gives the same frames as the Python decoder.
// For every exported patch and detector it decodes sky.store.js and compares the result with the cache frames that sky.data.js
// holds (decoded in Python at export time). Needs the exported cache (gitignored) and Node 18 or later. No dependencies.
// SI-GENERATED CODE: written by Claude Sonnet 5.5 (Anthropic) through Claude Code on 2026-11-15. See docs/si-log.md.
//   node implementation/tests/cellcache_decode_check.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '../data/cache/cell_demo');
const DEC = fs.readFileSync(path.resolve(__dirname, '../web/drafts/cellcache.js'), 'utf8');
let fails = 0, checked = 0;
const ok = (c, m, extra = '') => { console.log((c ? 'PASS ' : 'FAIL ') + m + (extra ? '  [' + extra + ']' : '')); if (!c) fails++; };
const f32 = (b64) => { const u = Buffer.from(b64, 'base64'); return new Float32Array(u.buffer, u.byteOffset, u.byteLength / 4); };

if (!fs.existsSync(ROOT)) { console.log('FAIL no exported cache at ' + ROOT + ' (see implementation/scripts/README.md)'); process.exit(1); }
for (const patch of fs.readdirSync(ROOT).sort()) {
  const pdir = path.join(ROOT, patch);
  if (!fs.statSync(pdir).isDirectory()) continue;
  for (const det of fs.readdirSync(pdir).filter((d) => /^D\d_full$/.test(d)).sort()) {
    const dir = path.join(pdir, det), data = path.join(dir, 'sky.data.js'), store = path.join(dir, 'sky.store.js');
    if (!fs.existsSync(data)) continue;
    const label = patch.split('_s0.2')[0] + ' ' + det.slice(0, 2);
    if (!fs.existsSync(store)) { ok(false, label + ' has a sky.store.js', 'run export again'); continue; }
    const ctx = vm.createContext({ atob: (s) => Buffer.from(s, 'base64').toString('binary'), TextDecoder, console });
    ctx.window = ctx;
    vm.runInContext(DEC, ctx);
    vm.runInContext(fs.readFileSync(data, 'utf8'), ctx);
    vm.runInContext(fs.readFileSync(store, 'utf8'), ctx);
    const S = ctx.SKY, T = ctx.SKYSTORE;
    if (!S.cache) { ok(true, label + ': slim export (no cache frames to compare with), store only'); continue; }
    const t0 = Date.now();
    let got;
    try { got = ctx.decodeCellStore(T.b64, T.w, T.h, T.cell, T.flipped_x, S.n); } catch (e) { ok(false, label + ' decodes', e.message); continue; }
    const want = f32(S.cache);
    let bad = 0, maxd = 0;
    for (let i = 0; i < want.length; i++) { const d = Math.abs(got[i] - want[i]); if (d > maxd) maxd = d; if (d > 1e-5 * Math.max(1, Math.abs(want[i]))) bad++; }
    checked++;
    ok(got.length === want.length && bad === 0, label + ': ' + S.n + ' frames, browser decoder equals the Python decoder', `max abs difference ${maxd.toExponential(1)}, ${bad} values off, ${Date.now() - t0} ms`);
  }
}
ok(checked > 0 || fails > 0, 'at least one exported patch was checked', String(checked));
console.log(fails ? `\n${fails} FAILED` : '\nall checks passed');
process.exit(fails ? 1 : 0);
