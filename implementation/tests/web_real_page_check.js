// Manual check of the real-data page (implementation/web/drafts/v1-studio-real.html) in headless Chrome, with real mouse,
// keyboard and menu events. Needs the exported cache (gitignored), Node 22 or later and google-chrome or chromium ($CHROME overrides). No dependencies.
// SI-GENERATED CODE: written by Claude Sonnet 5.5 (Anthropic) through Claude Code on 2026-11-14, updated 2026-11-15 for the requested-position ring. See docs/si-log.md.
//   node implementation/tests/web_real_page_check.js
// Part 1 checks the page controls on the first two exported patches. Part 2 loads every exported patch and measures where the
// brightest source near the marker sits (a sanity check of the position, not a science result).
const path = require('path');
const { launch, sleep } = require('./cdp.js');
const PAGE = 'file://' + path.resolve(__dirname, '../web/drafts/v1-studio-real.html');
let fails = 0;
const ok = (c, m, extra = '') => { console.log((c ? 'PASS ' : 'FAIL ') + m + (extra ? '  [' + extra + ']' : '')); if (!c) fails++; };

(async () => {
  const b = await launch();
  const info = () => b.ev(`JSON.stringify({q:location.search, chip:document.getElementById('chip-target').textContent, det:document.getElementById('p-det').value,
    disabled:[...document.getElementById('p-det').options].filter(o=>o.disabled).map(o=>o.value), picker:document.getElementById('p-target').value,
    nopt:document.getElementById('p-target').options.length, tl:(document.getElementById('tl-count')||{}).textContent, msg:document.getElementById('coord-msg').textContent,
    sky:!!window.SKY, n:window.SKY&&SKY.n})`).then(JSON.parse);

  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: "window.__warn=[];const w=console.warn;console.warn=(...a)=>{window.__warn.push(a.join(' '));w.apply(console,a)}" }); // keep the page's console warnings
  await b.nav(PAGE + '?service=9');
  const T = JSON.parse(await b.ev('JSON.stringify(window.TARGETS||[])'));
  if (T.length < 2) { console.log('FAIL need at least two exported patches (see implementation/scripts/README.md)'); process.exit(1); }
  const W = T.find((x) => x.name === 'WISE 0855') || T[0], O = T.find((x) => x.key !== W.key);
  const odet = O.detectors.map((x) => x.det);

  // ---- first-visit introduction (storage is cleared first, so it is a first visit; it ends dismissed)
  await b.nav(PAGE + '?service=9');
  await b.ev('localStorage.clear()');
  await b.nav(PAGE + '?service=9');
  const introShown = () => b.ev("(()=>{const e=document.getElementById('intro'); return !!e && !e.hidden && e.getBoundingClientRect().height > 20})()");
  ok(await introShown(), 'first visit: the introduction is shown above the image');
  ok(await b.ev("/viewer only|does not detect/i.test(document.getElementById('intro').textContent) && /faint/i.test(document.getElementById('intro').textContent)"), 'the introduction says it is a viewer only and that faint targets are not visible in one frame');
  const bl = await b.ev("(()=>{const a=document.querySelector('#intro-links a'); return a ? a.getAttribute('href') : null})()");
  ok(/Barnard/.test(O.name + W.name + T.map((x) => x.name).join()) && bl && /target=/.test(bl), "the introduction links to Barnard's Star", String(bl));
  await b.click('#intro-ok');
  ok(!(await introShown()), 'Got it hides the introduction');
  await b.nav(PAGE + '?service=9');
  ok(!(await introShown()), 'it stays hidden on the next visit (remembered in this browser)');
  await b.ev("(()=>{const d=document.getElementById('intro-again').closest('details'); d.open=true; document.getElementById('intro-again').scrollIntoView()})()");
  await b.click('#intro-again');
  ok(await introShown(), 'Show the introduction again (under Credits) brings it back');
  await b.click('#intro-ok');

  // ---- lossy cache decoded in the browser (cellcache.js from sky.store.js)
  await b.nav(PAGE + '?service=9&d=D6');
  const optTxt = await b.ev("(()=>{const o=document.querySelector('#p-src option[value=cache]'); return o ? o.textContent : null})()");
  ok(optTxt && /decoded in the browser/.test(optTxt), 'the lossy cache option says it is decoded in the browser', String(optTxt));
  const sig = () => b.ev("(()=>{const c=document.getElementById('pic'); const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let s=0; for(let i=0;i<d.length;i+=4) s=(s*31+d[i])%1000003; return s})()");
  const sigOrig = await sig();
  await b.ev("(()=>{const e=document.getElementById('p-src'); e.value='cache'; e.dispatchEvent(new Event('change'))})()");
  await sleep(600);
  const sigCache = await sig();
  ok(sigCache !== sigOrig && sigCache !== 0, 'switching to the lossy cache redraws the picture with the decoded frames', sigOrig + ' to ' + sigCache);
  await b.ev("(()=>{const e=document.getElementById('p-src'); e.value='orig'; e.dispatchEvent(new Event('change'))})()");
  ok((await b.ev('JSON.stringify(window.__warn||[])')) === '[]', 'no console warning about the cell store (the browser decode matches the export)', await b.ev('JSON.stringify(window.__warn||[])'));

  // ---- part 1: controls
  await b.nav(PAGE + '?service=9&target=' + O.key);
  let i = await info();
  ok(i.sky && i.n > 10, `${O.name} loads real data`, `n=${i.n}`);
  ok(i.chip.startsWith(await b.ev('SkyCoords.friendlyName(' + JSON.stringify(O.name) + ')')), 'chip shows the target name (the catalogue name made readable)', i.chip);
  const off = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'].filter((d) => !odet.includes(d));
  ok(i.disabled.join() === off.join(), 'detectors that are not exported are greyed out', 'disabled=' + i.disabled);
  ok(i.picker === O.key && i.nopt === T.length, 'patch picker lists every exported patch and selects this one');
  await b.nav(PAGE + '?service=9&target=' + O.key + '&d=' + (odet.includes('D1') ? 'D9' : 'D1'));
  i = await info();
  ok(odet.includes(i.det) && i.q.includes('d=' + i.det) && !/D9/.test(i.q), 'a bad or missing detector falls back and the URL is cleaned', i.q);
  await b.nav(PAGE + '?service=9&d=D9');
  i = await info();
  ok(!/D9/.test(i.q), '?d=D9 is removed from the address bar', i.q);
  await b.nav(PAGE + '?service=9');
  await b.ev(`(()=>{const s=document.getElementById('p-target');s.value=${JSON.stringify(O.key)};s.dispatchEvent(new Event('change'))})()`);
  await sleep(2500);
  i = await info();
  ok(i.picker === O.key && i.sky, 'patch picker navigates to the other patch', i.q);
  const near = (x) => [(x.ra + 0.0010).toFixed(4), x.dec.toFixed(4)];
  const load = async (ra, dec, how) => { await b.type('#in-ra', ra); await b.type('#in-dec', dec); if (how === 'enter') await b.key('Enter'); else await b.click('#btn-load'); return info(); };
  i = await load(...near(W), 'click');
  ok(i.chip.startsWith(W.name) && /target=/.test(i.q), `Load with a position a few arcsec from ${W.name} opens that patch`, i.q);
  const ring = () => b.ev(`JSON.stringify((()=>{const e=document.querySelector('.posmark'); if(!e) return null; const r=e.getBoundingClientRect(), c=document.getElementById('canvas').getBoundingClientRect();
    return {hidden:e.hidden, fx:(r.x+r.width/2-c.x)/c.width, fy:(r.y+r.height/2-c.y)/c.height, zoomed:!document.getElementById('nav').hidden};})())`).then(JSON.parse);
  i = await load(String(W.ra), String(W.dec), 'enter');
  ok(/^Marked RA/.test(i.msg), 'Enter in the box with the patch target puts the ring there', i.msg.slice(0, 70));
  let r = await ring();
  ok(r && !r.hidden && r.zoomed && Math.abs(r.fx - 0.5) < 0.08 && Math.abs(r.fy - 0.5) < 0.08, 'the ring sits in the middle of the zoomed view', JSON.stringify(r));
  i = await load((W.ra + 0.0111 / Math.cos((W.dec * Math.PI) / 180)).toFixed(4), String(W.dec), 'click');
  ok(/^Marked RA/.test(i.msg) && /[?&]ra=/.test(i.q) && /[?&]dec=/.test(i.q), '40 arcsec from the target is inside the patch: ring moves there and the URL keeps ra and dec', i.q);
  // every focus is one step in the zoom history, so Esc goes back one view at a time: press it until the view is at 1x (at most 4 times)
  let esc = 0;
  do { await b.key('Escape'); esc++; r = await ring(); } while (r && r.zoomed && esc < 4);
  ok(r && !r.zoomed && !r.hidden && (Math.abs(r.fx - 0.5) > 0.03 || Math.abs(r.fy - 0.5) > 0.03), 'Esc steps back through the zoom history to 1x and the ring is then off the centre', JSON.stringify(r) + ' after ' + esc + ' Esc');
  await b.ev("document.getElementById('o-p').scrollIntoView()"); await b.click('#o-p');
  r = await ring();
  ok(r && r.hidden === true, 'unchecking Requested position hides the ring');
  await b.click('#o-p');
  await b.nav(PAGE + '?service=9&target=' + W.key); // port 9 has no service, so this check never starts a real preparation
  const overlay = () => b.ev("(()=>{const o=document.querySelector('.pg-back'); return o && !o.hidden ? JSON.stringify({t:o.querySelector('#pg-title').textContent, cmd:(o.querySelector('#pg-cmd code')||{}).textContent}) : null})()").then((v) => v && JSON.parse(v));
  i = await load((W.ra + 0.5).toFixed(4), String(W.dec), 'click');
  await sleep(1500);
  let ov = await overlay();
  ok(ov && /Waiting for the preparation service/.test(ov.t) && /start\.sh/.test(ov.cmd), 'a position far from every patch, with no service running, shows a loading screen that waits and says how to start the service', JSON.stringify(ov));
  await b.click('#pg-cancel');
  i = await info();
  ok(!(await overlay()) && /Cancelled/.test(i.msg), 'Cancel closes it and the page stays where it is', i.msg.slice(0, 60));
  await b.nav(PAGE + '?service=9&target=' + W.key + '&ra=' + (W.ra + 0.004).toFixed(5) + '&dec=' + W.dec.toFixed(5));
  r = await ring();
  ok(r && !r.hidden && r.zoomed, '?ra=&dec= on load zooms to the position and shows the ring', JSON.stringify(r));

  // ---- the position boxes: letters are kept out while typing, bad entries are marked, and the parser is strict
  await b.nav(PAGE + '?service=9&target=' + W.key);
  const box = (id) => b.ev(`JSON.stringify({v: document.getElementById('${id}').value, bad: document.getElementById('${id}').getAttribute('aria-invalid') === 'true'})`).then(JSON.parse);
  await b.type('#in-ra', 'abc');
  let bx = await box('in-ra');
  ok(bx.v === '' && !bx.bad, 'typing abc into RA leaves it empty (letters are removed as they are typed)', JSON.stringify(bx));
  ok(/Other letters are not allowed/.test((await info()).msg), 'and says what RA accepts');
  await b.type('#in-ra', 'hello');
  bx = await box('in-ra');
  ok(bx.v === 'h' && bx.bad, 'typing hello into RA keeps only the allowed letter h and marks the entry as invalid', JSON.stringify(bx));
  await b.type('#in-dec', 'x1y2z');
  bx = await box('in-dec');
  ok(bx.v === '12' && !bx.bad, 'letters inside a number are removed from Dec (x1y2z gives 12)', JSON.stringify(bx));
  await b.type('#in-fov', 'xyz');
  bx = await box('in-fov');
  ok(bx.v === '' , 'typing xyz into Field leaves it empty', JSON.stringify(bx));
  await b.type('#in-fov', 'abc');
  bx = await box('in-fov');
  ok(bx.bad, 'Field marks an entry it cannot read (abc keeps a and c, which is not a number)', JSON.stringify(bx));
  // sexagesimal input typed as a person would, with the position NASA lists for WISE 0855
  await b.type('#in-ra', '08h55m10.831s'); await b.type('#in-dec', '-7d14m42.53s'); await b.type('#in-fov', '11.1');
  bx = await box('in-ra');
  ok(bx.v === '08h55m10.831s' && !bx.bad, 'a valid sexagesimal RA is left alone and not marked', JSON.stringify(bx));
  await b.click('#btn-load');
  i = await info();
  ok(/^Marked RA 133\.795/.test(i.msg) || /^Opening WISE/.test(i.msg), 'Load with 08h55m10.831s and -7d14m42.53s finds WISE 0855', i.msg.slice(0, 80));
  // the parser itself: a value set without typing (paste, autofill) is still rejected when it is not an angle
  await b.nav(PAGE + '?service=9&target=' + W.key);
  await b.ev("(()=>{document.getElementById('in-ra').value='abc12'; document.getElementById('in-dec').value='1e5'; document.getElementById('in-fov').value='12 abc'})()");
  await b.click('#btn-load');
  i = await info();
  ok(/RA must be/.test(i.msg) && /Dec must be/.test(i.msg) && /Field must be/.test(i.msg), 'abc12, 1e5 and "12 abc" are all rejected on Load (the parser no longer pulls digits out of text)', i.msg.slice(0, 120));
  await b.ev("(()=>{document.getElementById('in-ra').value='133.8'; document.getElementById('in-dec').value='-7.24'; document.getElementById('in-fov').value='0.2 deg'})()");
  await b.click('#btn-load');
  i = await info();
  ok(/^Marked RA/.test(i.msg), 'plain degrees and a field in degrees are accepted', i.msg.slice(0, 60));

  // ---- part 2: every patch, where is the brightest source near the marker?
  console.log('\nbrightest source within 12 px of the marker, per patch and detector (median of the frames in each observing window)');
  for (const x of T) {
    for (const d of x.detectors.map((y) => y.det)) {
      await b.nav(PAGE + '?service=9&target=' + x.key + '&d=' + d, 3000);
      const r = JSON.parse(await b.ev(`(()=>{
        const S=window.SKY; if(!S) return JSON.stringify({err:'no data'});
        const raw=atob(S.orig), buf=new Uint8Array(raw.length); for(let k=0;k<raw.length;k++) buf[k]=raw.charCodeAt(k);
        const a=new Float32Array(buf.buffer), W=S.w, H=S.h, n=S.n, cx=Math.round(S.target.x), cy=Math.round(S.target.y), R=12, out=[];
        for(let f=0;f<n;f++){ const fr=Array.from(a.subarray(f*W*H,(f+1)*W*H)).filter(Number.isFinite).sort((p,q)=>p-q), med=fr[fr.length>>1];
          let mx=-1e9; for(let y=-R;y<=R;y++)for(let xx=-R;xx<=R;xx++){const v=a[f*W*H+(cy+y)*W+cx+xx]-med; if(v>mx)mx=v;}
          let sx=0,sy=0,sw=0; for(let y=-R;y<=R;y++)for(let xx=-R;xx<=R;xx++){const v=a[f*W*H+(cy+y)*W+cx+xx]-med; if(v>0.5*mx){sx+=xx*v;sy+=y*v;sw+=v;}}
          out.push({mjd:S.frames[f].mjd,peak:mx,dx:sx/sw,dy:sy/sw}); }
        out.sort((p,q)=>p.mjd-q.mjd); const wins=[]; out.forEach((o,k)=>{ if(k===0||o.mjd-out[k-1].mjd>20) wins.push([]); wins[wins.length-1].push(o); });
        const med=(v)=>{v=v.slice().sort((p,q)=>p-q);return v[v.length>>1];};
        return JSON.stringify({n:n,unit:S.unit,note:S.target.note,wins:wins.map(w=>({k:w.length,peak:med(w.map(o=>o.peak)),dx:med(w.map(o=>o.dx)),dy:med(w.map(o=>o.dy))}))}); })()`));
      if (r.err) { ok(false, `${x.name} ${d} loads`, r.err); continue; }
      console.log(`  ${x.name} ${d}: ${r.n} frames, ${r.note}`);
      if (r.wins.every((w) => w.peak < 50)) console.log('     (no bright source in a single frame here: the brightest pixel is noise or a neighbour, so this check says nothing about the target)');
      for (const w of r.wins) console.log(`     window of ${String(w.k).padStart(2)} frames: peak ${w.peak.toFixed(1)} ${r.unit}, offset from marker (${w.dx.toFixed(2)}, ${w.dy.toFixed(2)}) px`);
      // The marker is the star's position at the median observing time. Barnard's Star moves about 10.4 arcsec a year (1.7 px a year),
      // so in a window months away from that time it sits up to about 2 px from the marker (2.5 px allowed for the centroid noise). That drift is real, not an error.
      if (/Barnard/.test(x.name)) ok(r.wins.every((w) => w.peak > 100 && Math.hypot(w.dx, w.dy) < 2.5), "Barnard's Star sits within 2.5 px of the marker in every window (proper motion is 1.7 px a year)", r.wins.map((w) => w.peak.toFixed(0) + ' at ' + Math.hypot(w.dx, w.dy).toFixed(1) + ' px').join(' / '));
    }
  }
  console.log(fails ? `\n${fails} FAILED` : '\nall checks passed');
  b.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
