/*
 * Skyliner UI drafts: shared behavior. Vanilla JavaScript, no dependencies, works from file://.
 * Generated with SI assistance (Claude Sonnet 5.5, 2026-11-14); see docs/si-log.md.
 *
 * Real-data mode: when window.SKY exists (v1-studio-real.html loads it from the cache folder), the single crop and every
 * simulated effect below are replaced by real SPHEREx DR1 cutouts of WISE 0855; nothing is simulated then. Without it, the text below applies.
 *
 * What is real: the pixel values (a 192x192 crop of one SPHEREx DR1 image, float values in sample-d6-192.data.js).
 * What is simulated, and labelled so in the UI: the moving point, the per-frame noise, the background drift and the pointing jitter.
 * Frame times inside each observing window are evenly spaced placeholders; the window dates are the observed WISE 0855 windows in DR1.
 */
(() => {
  'use strict';
  /* Real-data mode: window.SKY (written by implementation/scripts/cell_cache_demo.py export, loaded by
     v1-studio-real.html) replaces the single sample crop and every simulated effect. Without it nothing changes. */
  const R = window.SKY || null;
  const S = R || window.SAMPLE;
  if (!S) return; // the static <img> stays as a fallback
  const KP = R ? 'skyflip.real.' : 'skyflip.'; // real mode keeps its own settings, so the draft's simulation sliders are not overwritten

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(KP + k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(KP + k, JSON.stringify(v)); } catch (e) { /* storage may be blocked */ } },
  };

  /* ---------------------------------------------------------------- data */
  const W = S.w, H = S.h, NPX = W * H;
  const b64f32 = (b64, n) => { // base64 little-endian float32 to Float32Array
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Float32Array(u8.buffer, 0, n);
  };
  const base = new Float32Array(NPX);
  let REAL = null; // real mode: { orig, cache } as N*NPX arrays, per-frame medians, no-data masks
  if (R) {
    const n = R.n, bits = atob(R.nodata), rowB = Math.ceil(NPX / 8);
    // the lossy-cache frames: decoded here in the browser from the cell store (sky.store.js, cellcache.js) when it is present,
    // otherwise the frames the export decoded in Python. When both exist they are compared, and a difference falls back to the export.
    let cacheF = null, fromStore = false;
    if (window.SKYSTORE && window.decodeCellStore) {
      try {
        cacheF = window.decodeCellStore(window.SKYSTORE.b64, W, H, window.SKYSTORE.cell, window.SKYSTORE.flipped_x, n);
        fromStore = true;
        if (R.cache) {
          const py = b64f32(R.cache, n * NPX); let bad = 0;
          for (let i = 0; i < py.length; i++) if (Math.abs(cacheF[i] - py[i]) > 1e-5 * Math.max(1, Math.abs(py[i]))) bad++;
          if (bad) { console.warn('The cell store decoded in the browser differs from the export in ' + bad + ' values: using the export.'); cacheF = py; fromStore = false; }
        }
      } catch (e) { console.warn('The cell store could not be decoded: ' + e.message); cacheF = null; }
    }
    if (!cacheF && R.cache) cacheF = b64f32(R.cache, n * NPX);
    REAL = { orig: b64f32(R.orig, n * NPX), cache: cacheF || b64f32(R.orig, n * NPX), hasCache: !!cacheF, fromStore, med: { orig: new Float32Array(n), cache: new Float32Array(n) }, nd: [] };
    for (let f = 0; f < n; f++) { // unpack the no-data bit mask (numpy packbits: first pixel in the top bit)
      const m = new Uint8Array(NPX);
      for (let i = 0; i < NPX; i++) m[i] = (bits.charCodeAt(f * rowB + (i >> 3)) >> (7 - (i & 7))) & 1;
      REAL.nd.push(m);
    }
    const medianOf = (a, o, m) => { // median over pixels that have data (no-data pixels hold filler values)
      const v = []; for (let i = 0; i < NPX; i++) if (!m[i]) v.push(a[o + i]);
      if (!v.length) return 0;
      const t = Float32Array.from(v).sort(); return t[t.length >> 1];
    };
    for (const k of ['orig', 'cache']) for (let f = 0; f < n; f++) REAL.med[k][f] = medianOf(REAL[k], f * NPX, REAL.nd[f]);
  } else {
    const bin = atob(S.b64);
    const dv = new DataView(new ArrayBuffer(bin.length));
    for (let i = 0; i < bin.length; i++) dv.setUint8(i, bin.charCodeAt(i));
    for (let i = 0; i < NPX; i++) base[i] = dv.getFloat32(i * 4, true);
  }
  // display scale. Real mode: pooled over all frames after each frame's median is removed, so the stretch does not flicker with the background level.
  const pooled = (() => {
    if (!R) return Float32Array.from(base);
    const step = Math.max(1, Math.floor((R.n * NPX) / 300000)), out = [];
    for (let f = 0; f < R.n; f++) for (let i = (f * 7) % step; i < NPX; i += step) if (!REAL.nd[f][i]) out.push(REAL.orig[f * NPX + i] - REAL.med.orig[f]);
    return Float32Array.from(out);
  })();
  const sorted = Float32Array.from(pooled).sort();
  const NS = sorted.length;
  const quant = (p) => sorted[clamp(Math.round(p * (NS - 1)), 0, NS - 1)];
  const med = quant(0.5);
  const sigma = (() => {
    const d = new Float32Array(NS);
    for (let i = 0; i < NS; i++) d[i] = Math.abs(pooled[i] - med);
    d.sort();
    return 1.4826 * d[NS >> 1];
  })();
  const UNIT = R ? R.unit.replace(/\s+/g, '') : 'MJy';

  /* ---------------------------------------------------------------- frames (window dates are observed, times inside are placeholders) */
  const WINDOWS = [
    { start: '2025-05-05T16:48:02Z', end: '2025-05-06T23:59:00Z', n: 15 },
    { start: '2025-10-31T00:00:00Z', end: '2025-11-14T23:59:00Z', n: 66 },
    { start: '2025-12-11T00:00:00Z', end: '2025-12-13T23:59:00Z', n: 10 },
    { start: '2026-04-21T00:00:00Z', end: '2026-05-14T23:59:00Z', n: 52 },
  ];
  const DETS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'];
  const IDX = Object.assign({}, window.SKYIDX || {}); // frame lists of every exported detector, for the timeline
  if (R && !IDX[R.det]) IDX[R.det] = { det: R.det, n: R.n, wave_range_um: R.wave_range_um, frames: R.frames };
  const mjdT = (m) => (m - 40587) * 864e5;
  let T0 = Date.parse('2025-05-01T00:00:00Z'), SPAN = 384 * 864e5;
  if (R) { // timeline extent from the real frames of all detectors, with a margin
    const all = DETS.flatMap((d) => (IDX[d] ? IDX[d].frames.map((f) => f.mjd) : []));
    const lo = Math.min(...all), hi = Math.max(...all);
    T0 = mjdT(lo - 10); SPAN = (hi - lo + 20) * 864e5;
  }
  const frames = [];
  const winStart = [];
  if (R) { // real times; an observing window ends where the gap to the next frame exceeds 20 days (windows are 1 to 6 months apart)
    let wi = -1;
    R.frames.forEach((fr, i) => {
      if (i === 0 || fr.mjd - R.frames[i - 1].mjd > 20) { wi++; winStart.push(i); }
      frames.push({ t: (fr.mjd - 40587) * 864e5, win: wi, mjd: fr.mjd });
    });
  } else WINDOWS.forEach((w, wi) => {
    const s = Date.parse(w.start), e = Date.parse(w.end);
    winStart.push(frames.length);
    for (let j = 0; j < w.n; j++) {
      const t = s + (w.n > 1 ? ((e - s) * j) / (w.n - 1) : 0);
      frames.push({ t, win: wi, mjd: t / 864e5 + 40587 });
    }
  });
  const N = frames.length;
  let V0 = T0, VSPAN = SPAN; // the part of the timeline in view (zoom): start time and length, in ms
  const pct = (t) => ((t - V0) / VSPAN) * 100;
  const fmtDate = (t) => new Date(t).toISOString().slice(0, 10);
  const FPS = [2, 4, 6, 8, 12, 16, 24, 32];

  /* ---------------------------------------------------------------- real timeline: ruler, "All" row and one lane per detector, from the data */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const groupsOf = (arr) => { // frames grouped into observing windows: a gap over 20 days starts a new window
    const out = [];
    arr.forEach((f, i) => { if (i === 0 || f.mjd - arr[i - 1].mjd > 20) out.push([]); out[out.length - 1].push(f); });
    return out;
  };
  function switchDet(d, mjd) { // one detector per page load: same time, other detector
    const u = new URL(location.href);
    u.searchParams.set('d', d); u.searchParams.delete('f');
    if (mjd != null) u.searchParams.set('t', mjd.toFixed(3));
    location.href = u.toString();
  }
  const mkEl = (tag, cls, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (css) e.style.cssText = css; return e; };
  function buildTimeline() { // lane labels once; the ruler and tracks are drawn by renderTimeline (again at every zoom or pan)
    const labels = $('.tl-labels'), mk = mkEl;
    const total = DETS.reduce((n, d) => n + (IDX[d] ? IDX[d].frames.length : 0), 0);
    const lab = mk('div'); lab.innerHTML = '<b>All</b><small></small>'; lab.querySelector('small').textContent = total + ' images';
    labels.appendChild(lab);
    DETS.forEach((d, di) => {
      const n = di + 1, ix = IDX[d], on = R.det === d;
      const l = mk('div', (on ? 'active' : '') + (ix ? '' : ' noload'));
      l.dataset.lane = String(n); l.dataset.det = d; l.style.setProperty('--clip', 'var(--d' + n + ')');
      l.innerHTML = '<span class="sw" style="background:var(--d' + n + ')"></span>' + d + '<small></small>';
      l.querySelector('small').textContent = ix ? ix.wave_range_um[0].toFixed(1) + '-' + ix.wave_range_um[1].toFixed(1) + ' \u00b5m' : 'not prepared';
      l.title = on ? d + ' is showing' : ix ? 'Show ' + d + ' at the same time' : d + ' is not prepared for this patch';
      if (ix && !on) { // keyboard users can reach the lane labels too
        l.tabIndex = 0; l.setAttribute('role', 'button');
        const go1 = () => switchDet(d, st.empty ? st.et / 864e5 + 40587 : frames[st.f] ? frames[st.f].mjd : null);
        l.addEventListener('click', go1);
        l.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go1(); } });
      }
      labels.appendChild(l);
    });
    renderTimeline();
  }
  function renderTimeline() { // ruler, "All" row and one lane per detector, for the part of the timeline in view
    const mk = mkEl, tlEl = $('#tl'), anchor = $('#range');
    $$('.tl-dyn', tlEl).forEach((e) => e.remove());
    const add = (el) => { el.classList.add('tl-dyn'); tlEl.insertBefore(el, anchor); return el; };
    const vEnd = V0 + VSPAN, spanDays = VSPAN / 864e5, ruler = mk('div', 'ruler');
    const inView = (t) => t >= V0 && t <= vEnd;
    if (spanDays > 150) { // months
      const d0 = new Date(V0), first = mk('i', '', 'left:0');
      first.appendChild(mk('span')).textContent = MON[d0.getUTCMonth()] + ' ' + String(d0.getUTCFullYear()).slice(2);
      ruler.appendChild(first);
      // label every 2nd month on a wide screen (as before), and every 3rd, 6th or 12th when the lane is narrow, so labels never overlap
      const pxMonth = Math.max(80, tlEl.clientWidth - 130) * ((30.44 * 864e5) / VSPAN), lab = [2, 3, 6, 12].find((s) => s * pxMonth >= 60) || 12;
      for (let y = d0.getUTCFullYear(), m = d0.getUTCMonth() + 1, k = 0; k < 40; k++, m++) {
        if (m > 11) { m = 0; y++; }
        const t = Date.UTC(y, m, 1);
        if (t > vEnd) break;
        if (pct(t) < Math.max(6, 5600 / Math.max(80, tlEl.clientWidth - 130))) continue; // too close to the first label (about 56 px)
        const i = mk('i', '', 'left:' + pct(t) + '%');
        if (m % lab === 0) i.appendChild(mk('span')).textContent = MON[m] + (m === 0 ? ' ' + String(y).slice(2) : '');
        ruler.appendChild(i);
      }
    } else { // days or hours, ticks at round numbers of MJD
      const step = [0.25, 0.5, 1, 2, 5, 7, 14, 30].find((s) => s >= spanDays / 9) || 30;
      for (let m = Math.ceil((V0 / 864e5 + 40587) / step) * step, k = 0; k < 60; m += step, k++) {
        const t = mjdT(m);
        if (t > vEnd) break;
        const dt = new Date(t), i = mk('i', '', 'left:' + pct(t) + '%');
        i.appendChild(mk('span')).textContent = dt.getUTCDate() + ' ' + MON[dt.getUTCMonth()] + (step < 1 ? ' ' + dt.toISOString().slice(11, 16) : '');
        ruler.appendChild(i);
      }
    }
    add(ruler).title = VSPAN < SPAN ? 'Drag to move the view' : '';
    const clipEl = (g, cssExtra, title, count) => { // one observing window of one row
      const t0 = mjdT(g[0].mjd), t1 = mjdT(g[g.length - 1].mjd), a0 = pct(t0), b0 = pct(t1);
      const c = mk('span', 'clip', 'left:' + a0 + '%;width:' + Math.max(0.5, b0 - a0) + '%' + cssExtra);
      c.title = title + fmtDate(t0) + (g.length > 1 ? ' to ' + fmtDate(t1) : '') + ', ' + g.length + ' images';
      c.dataset.t0 = String(t0); c.dataset.t1 = String(t1);
      if (count && b0 - a0 > 3) c.appendChild(mk('b')).textContent = g.length;
      return c;
    };
    // "All" row: observing windows of every exported detector together, with the gaps between them
    const allFr = DETS.flatMap((d) => (IDX[d] ? IDX[d].frames : [])).sort((x, y) => x.mjd - y.mjd);
    const allTrack = mk('div', 'track all'), gs = groupsOf(allFr);
    gs.forEach((g, gi) => {
      allTrack.appendChild(clipEl(g, ';--clip:var(--muted)', '', true));
      if (gi > 0) {
        const prevEnd = gs[gi - 1][gs[gi - 1].length - 1].mjd, pe = pct(mjdT(prevEnd)), w = pct(mjdT(g[0].mjd)) - pe;
        const gap = mk('span', 'gap', 'left:' + pe + '%;width:' + w + '%');
        if (w > 4) gap.appendChild(mk('span')).textContent = Math.round(g[0].mjd - prevEnd) + ' days';
        allTrack.appendChild(gap);
      }
    });
    add(allTrack);
    // one lane per detector: its windows and one tick per real image
    DETS.forEach((d, di) => {
      const n = di + 1, ix = IDX[d], on = R.det === d;
      const tr = mk('div', 'track' + (on ? ' active' : ''), '--clip:var(--d' + n + ')');
      tr.dataset.lane = String(n); tr.dataset.det = d;
      if (ix) groupsOf(ix.frames).forEach((g) => {
        tr.appendChild(clipEl(g, '', d + ': ', false));
        g.forEach((f) => { const t = mjdT(f.mjd); if (t >= V0 - 864e5 && t <= vEnd + 864e5) tr.appendChild(mk('i', 'tick', 'left:' + pct(t) + '%')); });
      });
      add(tr);
    });
    const span = (t) => MON[new Date(t).getUTCMonth()] + ' ' + new Date(t).getUTCFullYear();
    const sp = $('#tl-span');
    if (sp) sp.textContent = VSPAN < SPAN * 0.999 ? fmtDate(V0) + ' to ' + fmtDate(vEnd) : span(T0 + 10 * 864e5) + ' to ' + span(T0 + SPAN - 10 * 864e5);
    const info = $('#tz-info');
    if (info) info.textContent = VSPAN < SPAN * 0.999 ? (spanDays >= 10 ? Math.round(spanDays) + ' days' : spanDays >= 1 ? spanDays.toFixed(1) + ' days' : Math.round(spanDays * 24) + ' hours') + ' in view' : 'full span';
    const bi = $('#tz-in'), bo = $('#tz-out'), bf = $('#tz-fit');
    if (bi) bi.disabled = VSPAN <= MINV * 1.001;
    if (bo) bo.disabled = bf.disabled = VSPAN >= SPAN * 0.999;
    if (typeof playhead !== 'undefined' && frames[st.f]) playhead.style.left = pct(frames[st.f].t) + '%';
    if (typeof range !== 'undefined') updateClipUI();
  }
  /* timeline zoom: view = [V0, V0 + VSPAN] inside [T0, T0 + SPAN] */
  const MINV = 6 * 36e5; // the smallest view: 6 hours
  function setTlView(v0, vspan) {
    VSPAN = clamp(vspan, MINV, SPAN);
    V0 = clamp(v0, T0, T0 + SPAN - VSPAN);
    renderTimeline();
  }
  function zoomTl(factor, anchorT) { // anchorT stays under the same screen position
    const f = clamp((anchorT - V0) / VSPAN, 0, 1), ns = clamp(VSPAN * factor, MINV, SPAN);
    setTlView(anchorT - f * ns, ns);
  }
  const fitTl = () => setTlView(T0, SPAN);
  const tlAnchor = () => { const t = frames[st.f] ? frames[st.f].t : V0 + VSPAN / 2; return t >= V0 && t <= V0 + VSPAN ? t : V0 + VSPAN / 2; };

  /* ---------------------------------------------------------------- state */
  const st = {
    f: 0, empty: false, et: 0, playing: false, timer: 0, A: null, B: null, // empty: the playhead sits on a time with no frame (real mode), et is that time

    z: 1, vx: 0, vy: 0, tool: null, markers: [], hover: null,
    p: { bp: -15, wp: 997, g: 100, stretch: 'asinh', smooth: 'none', speed: 3, frames: 'all', loop: true,
         mOn: true, mSpeed: 12, mAmp: 10, noise: 60, cont: 6, drift: 10, jit: 0, src: 'orig' },
  };
  if (R) Object.assign(st.p, { mOn: false, noise: 0, drift: 0, jit: 0 }); // real data: nothing simulated, also for the reset buttons
  const DEFAULTS = Object.assign({}, st.p); // the values the reset buttons go back to
  {
    const saved = store.get('params');
    if (saved && typeof saved === 'object') for (const k of Object.keys(st.p)) if (k in saved && typeof saved[k] === typeof st.p[k]) st.p[k] = saved[k];
  }
  const saveParams = () => store.set('params', st.p);

  /* ---------------------------------------------------------------- deterministic randomness (repeatable when scrubbing) */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const fieldCache = new Map();
  function noiseField(k) {
    let f = fieldCache.get(k);
    if (f) return f;
    const rnd = mulberry32((0x9E3779B9 ^ Math.imul(k + 1, 2654435761)) >>> 0);
    f = new Float32Array(NPX);
    for (let i = 0; i < NPX; i += 2) {
      const R = Math.sqrt(-2 * Math.log(rnd() || 1e-9)), a = 2 * Math.PI * rnd();
      f[i] = R * Math.cos(a);
      f[i + 1] = R * Math.sin(a);
    }
    fieldCache.set(k, f);
    if (fieldCache.size > 8) fieldCache.delete(fieldCache.keys().next().value);
    return f;
  }
  const phases = (() => { const r = mulberry32(20261114); return Array.from({ length: 8 }, () => r() * 2 * Math.PI); })();

  /* ---------------------------------------------------------------- rendering */
  const cv = $('#pic'), ctx = cv.getContext('2d');
  const navC = $('#nav-c'), navCtx = navC.getContext('2d');
  cv.width = navC.width = W; cv.height = navC.height = H; // the grid size comes from the data
  const imgData = ctx.createImageData(W, H);
  const out32 = new Uint32Array(imgData.data.buffer);
  const work = new Float32Array(NPX);
  const STRETCH = {
    linear: (t) => t,
    asinh: (t) => Math.asinh(10 * t) / Math.asinh(10),
    log: (t) => Math.log(1 + 100 * t) / Math.log(101),
  };
  let mover = { x: 0, y: 0 };

  const NODATA = 0xFF463028; // blue-grey (ABGR): pixels with no data in this frame, never shown as data
  function buildSky(fi) {
    if (R) { // real frame, background level removed; nothing simulated
      const k = st.p.src === 'cache' ? 'cache' : 'orig', o = fi * NPX, m = REAL.med[k][fi], a = REAL[k];
      for (let i = 0; i < NPX; i++) work[i] = a[o + i] - m;
      mover = { x: 0, y: 0 };
      return;
    }
    const fr = frames[fi];
    let ox = 0, oy = 0;
    if (st.p.jit > 0) { // smooth pseudo-random pointing wobble, sub-pixel
      const a = st.p.jit / 100;
      ox = a * (0.6 * Math.sin((2 * Math.PI * fi) / 37 + phases[0]) + 0.4 * Math.sin((2 * Math.PI * fi) / 13 + phases[1]));
      oy = a * (0.6 * Math.sin((2 * Math.PI * fi) / 41 + phases[2]) + 0.4 * Math.sin((2 * Math.PI * fi) / 17 + phases[3]));
      for (let y = 0; y < H; y++) {
        const sy = clamp(y - oy, 0, H - 1.001), y0 = sy | 0, fy = sy - y0;
        for (let x = 0; x < W; x++) {
          const sx = clamp(x - ox, 0, W - 1.001), x0 = sx | 0, fx = sx - x0, i = y0 * W + x0;
          work[y * W + x] = (base[i] * (1 - fx) + base[i + 1] * fx) * (1 - fy) + (base[i + W] * (1 - fx) + base[i + W + 1] * fx) * fy;
        }
      }
    } else {
      work.set(base);
    }
    // simulated mover: a small Gaussian point moving along a straight path, in physical time
    if (st.p.mOn) {
      const yrs = (fr.t - frames[0].t) / (365.25 * 864e5);
      mover = { x: 60 + st.p.mSpeed * 0.98 * yrs + ox, y: 96 - st.p.mSpeed * 0.2 * yrs + oy };
      const amp = st.p.mAmp * sigma, cx = Math.round(mover.x), cy = Math.round(mover.y);
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const px = cx + dx, py = cy + dy;
          if (px < 0 || py < 0 || px >= W || py >= H) continue;
          const d2 = (px - mover.x) * (px - mover.x) + (py - mover.y) * (py - mover.y);
          work[py * W + px] += amp * Math.exp(-d2 / (2 * 0.81));
        }
      }
    }
    // simulated frame noise: random per keyframe, blended smoothly between keyframes so consecutive frames evolve continuously
    if (st.p.noise > 0) {
      const M = Math.max(1, st.p.cont), u = fi / M, i0 = Math.floor(u), w = u - i0;
      const A = noiseField(i0), B = noiseField(i0 + 1);
      const ca = Math.cos((w * Math.PI) / 2), cb = Math.sin((w * Math.PI) / 2), amp = (st.p.noise / 100) * sigma;
      for (let i = 0; i < NPX; i++) work[i] += amp * (ca * A[i] + cb * B[i]);
    }
    // simulated slow background drift (zodiacal-like): a level and a tilt that wander smoothly
    if (st.p.drift > 0) {
      const a = (st.p.drift / 10) * sigma;
      const lvl = a * (0.7 * Math.sin((2 * Math.PI * fi) / 57 + phases[4]) + 0.3 * Math.sin((2 * Math.PI * fi) / 23 + phases[5]));
      const tilt = a * Math.sin((2 * Math.PI * fi) / 71 + phases[6]);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) work[y * W + x] += lvl + (tilt * (x - W / 2)) / W;
    }
  }

  function drawEmpty() { // a time with no frame: the whole picture is "no data"
    out32.fill(NODATA);
    ctx.putImageData(imgData, 0, 0);
    if (!$('#nav').hidden) navCtx.drawImage(cv, 0, 0);
    $('#hud-badge').textContent = 'No observation at this time';
    $('#fd-mover').textContent = 'none (real data)';
    showHoverPixel();
  }
  function draw() {
    if (R && st.empty) { drawEmpty(); return; }
    buildSky(st.f);
    const lo = med + (st.p.bp / 10) * sigma;
    const hi = Math.max(lo + 1e-6, quant(st.p.wp / 1000));
    const inv = 1 / (hi - lo), ig = 100 / st.p.g, fn = STRETCH[st.p.stretch] || STRETCH.asinh;
    const nd = R ? REAL.nd[st.f] : null;
    for (let i = 0; i < NPX; i++) {
      if (nd && nd[i]) { out32[i] = NODATA; continue; }
      let t = (work[i] - lo) * inv;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      t = Math.pow(fn(t), ig);
      const v = (t * 255 + 0.5) | 0;
      out32[i] = 0xFF000000 | (v << 16) | (v << 8) | v;
    }
    ctx.putImageData(imgData, 0, 0);
    if (!$('#nav').hidden) navCtx.drawImage(cv, 0, 0);
    $('#fd-mover').textContent = R ? 'none (real data)' : st.p.mOn ? 'x ' + mover.x.toFixed(1) + ', y ' + mover.y.toFixed(1) : 'off';
    if (R) $('#hud-badge').textContent = st.p.src === 'cache' ? 'Real SPHEREx data, decoded from the lossy cache' : 'Real SPHEREx data';
    else $('#hud-badge').textContent = st.p.mOn || st.p.noise > 0 || st.p.drift > 0 ? 'Real crop, simulated variation' : 'Real sample crop';
    showHoverPixel();
  }

  /* ---------------------------------------------------------------- view: zoom, pan, navigator, scale bar */
  const canvas = $('#canvas'), nav = $('#nav'), navBox = $('#nav-box');
  function applyView() {
    const vw = W / st.z;
    cv.style.transformOrigin = '0 0';
    cv.style.transform = st.z === 1 ? '' : 'translate(' + (-(st.vx / W) * st.z * 100) + '%, ' + (-(st.vy / H) * st.z * 100) + '%) scale(' + st.z + ')';
    cv.style.imageRendering = st.p.smooth === 'none' ? 'pixelated' : 'auto';
    const zoomed = st.z > 1.0001;
    nav.hidden = !zoomed; // the navigator only exists while zoomed in
    canvas.classList.toggle('zoomed', zoomed);
    if (zoomed) {
      navCtx.drawImage(cv, 0, 0);
      navBox.style.left = (st.vx / W) * 100 + '%';
      navBox.style.top = (st.vy / H) * 100 + '%';
      navBox.style.width = navBox.style.height = (vw / W) * 100 + '%';
      $('#nav-z').textContent = (st.z < 10 ? st.z.toFixed(1).replace('.0', '') : Math.round(st.z)) + '×';
    }
    $('#hud-z').textContent = zoomed ? (st.z < 10 ? st.z.toFixed(1).replace('.0', '') : Math.round(st.z)) + '× zoom' : '';
    // scale bar: largest of a few round lengths that fits in 30% of the view (6.15 arcsec per pixel)
    const D = canvas.clientWidth || 520, cssPerPx = (D / W) * st.z, amPerPx = 6.15 / 60;
    let L = 0.25;
    for (const c of [0.25, 0.5, 1, 2, 5, 10]) if ((c / amPerPx) * cssPerPx <= 0.3 * D) L = c;
    $('#scale').style.width = (L / amPerPx) * cssPerPx + 'px';
    $('#scale-l').textContent = L + '′';
    layoutMarkers();
  }
  function setView(z, vx, vy) {
    st.z = clamp(z, 1, 16);
    const vw = W / st.z;
    st.vx = clamp(vx, 0, W - vw);
    st.vy = clamp(vy, 0, H - vw);
    applyView();
  }
  // zoom history: every click, key press or wheel burst is one step; Esc goes back one step
  const zoomHist = [];
  let lastWheel = -1e9;
  function pushHist() { zoomHist.push({ z: st.z, vx: st.vx, vy: st.vy }); if (zoomHist.length > 50) zoomHist.shift(); }
  function zoomAt(factor, fx, fy, wheel) {
    const z2 = clamp(st.z * factor, 1, 16);
    if (z2 === st.z) return;
    const now = performance.now();
    if (!(wheel && now - lastWheel < 300)) pushHist(); // a burst of wheel events is one step
    lastWheel = wheel ? now : -1e9;
    const vw0 = W / st.z, ix = st.vx + fx * vw0, iy = st.vy + fy * vw0, vw1 = W / z2;
    setView(z2, ix - fx * vw1, iy - fy * vw1);
  }
  function resetView() { if (st.z === 1) return; pushHist(); lastWheel = -1e9; setView(1, 0, 0); }
  function undoZoom() {
    const h = zoomHist.pop();
    if (!h) return false;
    lastWheel = -1e9;
    setView(h.z, h.vx, h.vy);
    return true;
  }
  function toImage(e) {
    const r = canvas.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height, vw = W / st.z;
    return { fx, fy, x: st.vx + fx * vw, y: st.vy + fy * vw, rect: r };
  }
  function showHoverPixel() {
    const el = $('#hud-px'), h = st.hover;
    if (!h) { el.innerHTML = '&nbsp;'; return; }
    const x = clamp(Math.floor(h.x), 0, W - 1), y = clamp(Math.floor(h.y), 0, H - 1);
    if (R && st.empty) { el.textContent = 'x ' + x + ', y ' + y + ': no data'; return; }
    if (R) {
      const sk = R.sky, ra = sk.ra0 + sk.dra_dx * x + sk.dra_dy * y, de = sk.dec0 + sk.ddec_dx * x + sk.ddec_dy * y;
      const k = st.p.src === 'cache' ? 'cache' : 'orig', v = REAL[k][st.f * NPX + y * W + x];
      el.textContent = 'x ' + x + ', y ' + y + ': ' + (REAL.nd[st.f][y * W + x] ? 'no data' : v.toFixed(3) + ' ' + UNIT) + ', RA ' + ra.toFixed(4) + ' Dec ' + de.toFixed(4);
      return;
    }
    el.textContent = 'x ' + x + ', y ' + y + ': ' + work[y * W + x].toFixed(3) + ' MJy';
  }

  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { sx: e.clientX, sy: e.clientY, vx: st.vx, vy: st.vy, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = toImage(e);
    st.hover = { x: p.x, y: p.y };
    if (drag) {
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      if (drag.moved && st.z > 1) {
        const vw = W / st.z;
        setView(st.z, drag.vx - (dx / p.rect.width) * vw, drag.vy - (dy / p.rect.height) * vw);
      }
    }
    showHoverPixel();
  });
  canvas.addEventListener('pointerup', (e) => {
    const d = drag; drag = null;
    if (!d || d.moved) return;
    const p = toImage(e);
    if (st.tool === 'zoom') zoomAt(e.shiftKey ? 0.5 : 2, p.fx, p.fy);
    else if (st.tool === 'pen') toggleMarker(p);
  });
  canvas.addEventListener('pointerleave', () => { st.hover = null; showHoverPixel(); });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = toImage(e);
    zoomAt(e.deltaY < 0 ? 1.25 : 0.8, p.fx, p.fy, true);
  }, { passive: false });
  canvas.addEventListener('dblclick', resetView);

  // navigator: click or drag to move the view
  function navMove(e) {
    const r = nav.getBoundingClientRect(), vw = W / st.z;
    setView(st.z, ((e.clientX - r.left) / r.width) * W - vw / 2, ((e.clientY - r.top) / r.height) * H - vw / 2);
  }
  let navDrag = false;
  nav.addEventListener('pointerdown', (e) => { navDrag = true; nav.setPointerCapture(e.pointerId); navMove(e); e.stopPropagation(); });
  nav.addEventListener('pointermove', (e) => { if (navDrag) navMove(e); });
  nav.addEventListener('pointerup', () => { navDrag = false; });
  window.addEventListener('resize', applyView);

  /* ---------------------------------------------------------------- full screen image */
  const stage = $('#stage');
  const isFull = () => document.fullscreenElement === stage || stage.classList.contains('pfs');
  function syncFull() {
    const on = isFull(), b = $('#btn-full');
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
    b.title = on ? 'Exit full screen (Esc)' : 'Full screen image (key F)';
    applyView(); // the scale bar depends on the size
  }
  function enterFull() {
    const fallback = () => { stage.classList.add('pfs'); syncFull(); };
    if (!stage.requestFullscreen) { fallback(); return; }
    try { Promise.resolve(stage.requestFullscreen()).catch(fallback); } catch (e) { fallback(); }
  }
  function exitFull() {
    stage.classList.remove('pfs');
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
    syncFull();
  }
  document.addEventListener('fullscreenchange', syncFull);

  /* ---------------------------------------------------------------- tools */
  function setTool(name) {
    st.tool = st.tool === name ? null : name;
    $$('[data-act="zoom"],[data-act="pen"]').forEach((b) => b.setAttribute('aria-pressed', String(st.tool === b.dataset.act)));
    canvas.classList.toggle('tool-zoom', st.tool === 'zoom');
    canvas.classList.toggle('tool-pen', st.tool === 'pen');
  }

  /* ---------------------------------------------------------------- markers (fixed in the image, shown in every frame) */
  const mLayer = $('#markers');
  function layoutMarkers() {
    const vw = W / st.z;
    $$('.marker', mLayer).forEach((el, i) => {
      const m = st.markers[i], fx = (m.x + 0.5 - st.vx) / vw, fy = (m.y + 0.5 - st.vy) / vw;
      el.hidden = fx < 0 || fx > 1 || fy < 0 || fy > 1;
      el.style.left = fx * 100 + '%';
      el.style.top = fy * 100 + '%';
    });
    layoutPos();
  }
  function renderMarkers() {
    mLayer.textContent = '';
    st.markers.forEach((m, i) => {
      const el = document.createElement('span'); el.className = 'marker';
      const b = document.createElement('b'); b.textContent = String(i + 1);
      el.appendChild(b); mLayer.appendChild(el);
    });
    const list = $('#m-list'); list.textContent = '';
    if (!st.markers.length) {
      const li = document.createElement('li'); li.className = 'empty';
      li.textContent = 'No markers yet. Turn on the marker tool and click the image.';
      list.appendChild(li);
    }
    st.markers.forEach((m, i) => {
      const li = document.createElement('li');
      const t = document.createElement('span'); t.textContent = (i + 1) + ': x ' + m.x + ', y ' + m.y + ' (frame ' + (m.f + 1) + ')';
      const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'x'; rm.textContent = 'Remove';
      rm.setAttribute('aria-label', 'Remove marker ' + (i + 1));
      rm.addEventListener('click', () => { st.markers.splice(i, 1); renderMarkers(); });
      li.append(t, rm); list.appendChild(li);
    });
    $('#m-count').textContent = String(st.markers.length);
    $('#m-clear').disabled = !st.markers.length;
    layoutMarkers();
  }
  function toggleMarker(p) {
    const vw = W / st.z, hit = st.markers.findIndex((m) => Math.hypot(((m.x + 0.5 - p.x) / vw) * p.rect.width, ((m.y + 0.5 - p.y) / vw) * p.rect.height) < 16);
    if (hit >= 0) st.markers.splice(hit, 1);
    else st.markers.push({ x: clamp(Math.floor(p.x), 0, W - 1), y: clamp(Math.floor(p.y), 0, H - 1), f: st.f });
    renderMarkers();
  }
  $('#m-clear').addEventListener('click', () => { st.markers = []; renderMarkers(); });
  $('#o-m').addEventListener('change', (e) => { mLayer.hidden = !e.target.checked; });

  /* ---------------------------------------------------------------- requested position (real data only)
     A ring that stays on one sky position. It starts on the patch target. A typed position inside the loaded patch moves it there
     and zooms in, with no new data needed: the patch covers about 12 arcminutes and the view starts at 1x. */
  const pos = { on: true, x: (W - 1) / 2, y: (H - 1) / 2 };
  const posEl = R ? document.createElement('span') : null;
  function skyToPix(ra, de) { // the inverse of the linear sky mapping used for the hover readout
    const k = R.sky, a = ((ra - k.ra0 + 540) % 360) - 180, b = de - k.dec0, det = k.dra_dx * k.ddec_dy - k.dra_dy * k.ddec_dx;
    return { x: (a * k.ddec_dy - b * k.dra_dy) / det, y: (b * k.dra_dx - a * k.ddec_dx) / det };
  }
  const inGrid = (p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= -0.5 && p.x <= W - 0.5 && p.y >= -0.5 && p.y <= H - 0.5;
  function layoutPos() {
    if (!posEl) return;
    const vw = W / st.z, fx = (pos.x + 0.5 - st.vx) / vw, fy = (pos.y + 0.5 - st.vy) / vw;
    posEl.hidden = !pos.on || fx < 0 || fx > 1 || fy < 0 || fy > 1;
    posEl.style.left = fx * 100 + '%';
    posEl.style.top = fy * 100 + '%';
  }
  function focusPos(ra, de) { // ring on this position, view zoomed to about 4 arcminutes around it
    const p = skyToPix(ra, de);
    pos.x = p.x; pos.y = p.y; pos.on = true;
    const c = $('#o-p'); if (c) c.checked = true;
    const n = $('#ring-note'); if (n) n.textContent = 'RA ' + ra.toFixed(3) + ', Dec ' + de.toFixed(3);
    const z = clamp(Math.round(W / 40), 2, 16), vw = W / z;
    pushHist();
    setView(z, p.x + 0.5 - vw / 2, p.y + 0.5 - vw / 2);
    try { const u = new URL(location.href); u.searchParams.set('ra', ra.toFixed(5)); u.searchParams.set('dec', de.toFixed(5)); history.replaceState(null, '', u); } catch (e) { /* file:// or blocked */ }
  }
  if (posEl) {
    posEl.className = 'posmark';
    posEl.setAttribute('aria-hidden', 'true');
    mLayer.parentNode.appendChild(posEl);
    const p0 = skyToPix(R.target.ra, R.target.dec);
    if (inGrid(p0)) { pos.x = p0.x; pos.y = p0.y; }
    const c = $('#o-p'); if (c) c.addEventListener('change', () => { pos.on = c.checked; layoutPos(); });
    layoutPos();
  }

  /* ---------------------------------------------------------------- frames, playhead, clip A to B */
  const tl = $('#tl'), playhead = $('#playhead'), range = $('#range');
  const visible = () => (st.p.frames === 'win' ? winStart.slice() : Array.from({ length: N }, (_, i) => i));
  const nearestIn = (list, i) => list.reduce((b, c) => (Math.abs(c - i) < Math.abs(b - i) ? c : b), list[0]);

  function updateClipUI() {
    const { A, B } = st;
    range.hidden = A === null;
    if (A !== null) {
      range.style.left = pct(frames[A].t) + '%';
      range.style.width = B !== null ? Math.max(0.4, pct(frames[B].t) - pct(frames[A].t)) + '%' : '0%';
      range.classList.toggle('only-a', B === null);
    }
    $('#chip-loop').textContent = A === null ? 'A to B: not set' : B === null ? 'A ' + (A + 1) + ', B not set' : 'A ' + (A + 1) + ', B ' + (B + 1);
  }
  function go(i) {
    st.empty = false;
    { const em = $('#empty-msg'); if (em) em.hidden = true; }
    st.f = clamp(i, 0, N - 1);
    const fr = frames[st.f], d = fmtDate(fr.t);
    $('#v-frame').textContent = 'Frame ' + (st.f + 1) + ' of ' + N;
    $('#v-date').textContent = d;
    $('#hud-frame').textContent = 'Frame ' + (st.f + 1) + ' of ' + N + ', ' + d;
    $('#tc-date').textContent = d;
    $('#tc-mjd').textContent = 'MJD ' + fr.mjd.toFixed(2);
    $('#fd-frame').textContent = (st.f + 1) + ' of ' + N;
    $('#fd-date').textContent = d;
    $('#fd-mjd').textContent = fr.mjd.toFixed(2);
    if (R) {
      const rf = R.frames[st.f], set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
      set('#fd-obs', rf.obs); set('#fd-det', R.det + ', ' + rf.wave.toFixed(2) + ' \u00b5m at the target');
    }
    playhead.style.left = pct(fr.t) + '%';
    if (R && VSPAN < SPAN * 0.999 && !scrub && (fr.t < V0 + 0.02 * VSPAN || fr.t > V0 + 0.98 * VSPAN)) setTlView(fr.t - 0.5 * VSPAN, VSPAN); // a zoomed timeline follows the playhead
    if (R) { // keep the frame in the address, but not at every step of a fast playback
      clearTimeout(go.urlTimer);
      go.urlTimer = setTimeout(() => { try { const u = new URL(location.href); u.searchParams.set('f', String(st.f + 1)); u.searchParams.delete('t'); history.replaceState(null, '', u); } catch (e) { /* the address stays as it is */ } }, 400);
    }
    tl.setAttribute('aria-valuenow', String(st.f + 1));
    tl.setAttribute('aria-valuetext', 'Frame ' + (st.f + 1) + ', ' + d);
    draw();
  }
  const pauseFirst = () => { if (st.playing) setPlaying(false); }; // a navigation button or key pauses playback, then acts
  /* a time with no frame (real mode): the picture is empty, the playhead is where the user put it */
  const fmtSpan = (ms) => { const d = Math.abs(ms) / 864e5; return d >= 1 ? d.toFixed(1) + ' days' : Math.round(d * 24) + ' hours'; };
  function goEmpty(t) {
    st.empty = true; st.et = t;
    let pi = -1, ni = -1;
    for (let i = 0; i < N; i++) { if (frames[i].t <= t) pi = i; if (ni < 0 && frames[i].t >= t) ni = i; }
    st.f = pi >= 0 ? pi : ni; // the nearest frame before, so window jumps and markers keep a place
    const d = fmtDate(t), mjd = t / 864e5 + 40587, set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set('#v-frame', 'No frame at this time'); set('#v-date', d);
    set('#hud-frame', 'No frame at this time, ' + d);
    set('#tc-date', d); set('#tc-mjd', 'MJD ' + mjd.toFixed(2));
    set('#fd-frame', 'none'); set('#fd-date', d); set('#fd-mjd', mjd.toFixed(2));
    set('#fd-obs', '-'); set('#fd-det', R.det + ': no observation at this time');
    const lines = ['No observation at this time', d + ', MJD ' + mjd.toFixed(2)];
    if (pi >= 0) lines.push('Before: frame ' + (pi + 1) + ', ' + fmtDate(frames[pi].t) + ' (' + fmtSpan(t - frames[pi].t) + ' earlier)');
    if (ni >= 0) lines.push('After: frame ' + (ni + 1) + ', ' + fmtDate(frames[ni].t) + ' (' + fmtSpan(frames[ni].t - t) + ' later)');
    const em = $('#empty-msg'); if (em) { em.textContent = ''; lines.forEach((l, k) => { const s = document.createElement(k ? 'div' : 'b'); s.textContent = l; em.appendChild(s); }); em.hidden = false; }
    playhead.style.left = pct(t) + '%';
    if (VSPAN < SPAN * 0.999 && !scrub && (t < V0 + 0.02 * VSPAN || t > V0 + 0.98 * VSPAN)) setTlView(t - 0.5 * VSPAN, VSPAN);
    clearTimeout(go.urlTimer);
    go.urlTimer = setTimeout(() => { try { const u = new URL(location.href); u.searchParams.set('t', mjd.toFixed(3)); u.searchParams.delete('f'); history.replaceState(null, '', u); } catch (e) { /* the address stays as it is */ } }, 400);
    tl.setAttribute('aria-valuetext', 'No frame at ' + d);
    draw();
  }
  function stepFrame(dir) {
    pauseFirst();
    const vis = visible();
    if (R && st.empty) { // from an empty time: the first frame after it is the next one, the last before it is the previous one
      let np = vis.findIndex((i) => frames[i].t > st.et); if (np < 0) np = vis.length;
      go(vis[clamp(dir > 0 ? np + dir - 1 : np + dir, 0, vis.length - 1)]);
      return;
    }
    const pos = vis.indexOf(st.f), cur = pos >= 0 ? pos : vis.indexOf(nearestIn(vis, st.f));
    go(vis[clamp(cur + dir, 0, vis.length - 1)]);
  }
  function jumpWindow(dir) {
    pauseFirst();
    if (R && st.empty) {
      const after = winStart.filter((s) => frames[s].t > st.et), before = winStart.filter((s) => frames[s].t < st.et);
      if (dir > 0) go(after.length ? after[0] : winStart[winStart.length - 1]);
      else go(before.length ? before[before.length - 1] : winStart[0]);
      return;
    }
    const w = frames[st.f].win;
    if (dir > 0) go(winStart[Math.min(w + 1, winStart.length - 1)]);
    else go(st.f > winStart[w] ? winStart[w] : winStart[Math.max(w - 1, 0)]);
  }
  function cycleClip() {
    if (st.A === null) st.A = st.f;
    else if (st.B === null) { st.B = st.f; if (st.B < st.A) [st.A, st.B] = [st.B, st.A]; }
    else { st.A = null; st.B = null; }
    updateClipUI();
  }

  /* playback */
  const fps = () => FPS[clamp(st.p.speed, 1, 8) - 1];
  function tick() {
    if (!st.playing) return;
    const vis = visible(), useClip = st.p.loop && st.A !== null && st.B !== null;
    let list = vis;
    if (useClip) { list = vis.filter((i) => i >= st.A && i <= st.B); if (!list.length) list = [st.A]; }
    if (R && st.empty) { const nx = list.find((i) => frames[i].t > st.et); go(nx !== undefined ? nx : list[0]); st.timer = setTimeout(tick, 1000 / fps()); return; }
    const pos = list.indexOf(st.f);
    go(pos < 0 || pos === list.length - 1 ? list[0] : list[pos + 1]);
    st.timer = setTimeout(tick, 1000 / fps());
  }
  function setPlaying(on) {
    st.playing = on;
    clearTimeout(st.timer);
    const b = $('[data-act="play"]');
    b.dataset.playing = String(on);
    b.setAttribute('aria-label', on ? 'Pause' : 'Play');
    if (on) st.timer = setTimeout(tick, 1000 / fps());
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && st.playing) setPlaying(false); });

  /* timeline scrubbing */
  /* choose a time on the timeline: the nearest frame if one is within about 4 pixels of the pointer, otherwise that exact time (empty) */
  const snapMs = () => (4 * VSPAN) / Math.max(300, tl.clientWidth);
  function selectAt(e) {
    if (!R) { go(frameAt(e)); return; }
    const r = tl.getBoundingClientRect(), t = V0 + clamp((e.clientX - r.left) / r.width, 0, 1) * VSPAN;
    const i = frameAt(e);
    if (Math.abs(frames[i].t - t) <= snapMs()) go(i); else goEmpty(t);
  }
  function frameAt(e) {
    const r = tl.getBoundingClientRect(), t = V0 + clamp((e.clientX - r.left) / r.width, 0, 1) * VSPAN;
    const vis = visible();
    return vis.reduce((b, c) => (Math.abs(frames[c].t - t) < Math.abs(frames[b].t - t) ? c : b), vis[0]);
  }
  let scrub = false;
  const laneAt = (e) => (R && e.target.closest ? e.target.closest('.track[data-det]') : null);
  const mjdAt = (e) => { const r = tl.getBoundingClientRect(); return (V0 + clamp((e.clientX - r.left) / r.width, 0, 1) * VSPAN) / 864e5 + 40587; };
  let pan = null; // dragging the ruler moves a zoomed timeline
  tl.addEventListener('pointerdown', (e) => {
    if (R && VSPAN < SPAN * 0.999 && e.target.closest && e.target.closest('.ruler')) { pan = { x: e.clientX, v0: V0, moved: false }; tl.setPointerCapture(e.pointerId); return; }
    const ln = laneAt(e); if (ln && ln.dataset.det !== R.det) { if (IDX[ln.dataset.det]) switchDet(ln.dataset.det, mjdAt(e)); return; } scrub = true; tl.setPointerCapture(e.pointerId); setPlaying(false); selectAt(e); tl.focus(); });
  // timeline zoom: wheel zooms around the pointer, Shift+wheel or a ruler drag moves, double-click a window zooms to it, double-click elsewhere fits
  tl.addEventListener('wheel', (e) => {
    if (!R) return;
    e.preventDefault();
    const r = tl.getBoundingClientRect(), t = V0 + clamp((e.clientX - r.left) / r.width, 0, 1) * VSPAN;
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) setTlView(V0 + ((e.deltaX || e.deltaY) / r.width) * VSPAN, VSPAN);
    else zoomTl(e.deltaY < 0 ? 0.8 : 1.25, t);
  }, { passive: false });
  tl.addEventListener('dblclick', (e) => {
    if (!R) return;
    const c = e.target.closest && e.target.closest('.clip');
    if (c && c.dataset.t0) { const t0 = Number(c.dataset.t0), t1 = Number(c.dataset.t1), pad = Math.max((t1 - t0) * 0.1, 6 * 36e5); setTlView(t0 - pad, t1 - t0 + 2 * pad); }
    else fitTl();
  });
  tl.addEventListener('pointermove', (e) => {
    if (pan) { if (Math.abs(e.clientX - pan.x) > 3) pan.moved = true; const rc = tl.getBoundingClientRect(); if (pan.moved) setTlView(pan.v0 - ((e.clientX - pan.x) / rc.width) * VSPAN, VSPAN); return; }
    const ln = laneAt(e);
    if (ln && ln.dataset.det !== R.det) { $('#tl-hover').textContent = IDX[ln.dataset.det] ? 'Click to show ' + ln.dataset.det + ' here' : ln.dataset.det + ' has no exported data'; return; }
    const i = frameAt(e);
    const near = !R || Math.abs(frames[i].t - ((V0 + clamp((e.clientX - tl.getBoundingClientRect().left) / tl.getBoundingClientRect().width, 0, 1) * VSPAN))) <= snapMs();
    $('#tl-hover').textContent = near ? 'Frame ' + (i + 1) + ', ' + fmtDate(frames[i].t) : 'No frame here: click to select this time';
    if (scrub) selectAt(e);
  });
  tl.addEventListener('pointerup', (e) => {
    if (pan && !pan.moved) { setPlaying(false); selectAt(e); tl.focus(); } // a click on the ruler jumps to that point (a drag moves the view)
    scrub = false; pan = null;
  });
  tl.addEventListener('pointerleave', () => { if (!scrub) $('#tl-hover').textContent = 'Click or drag to scrub'; });

  /* ---------------------------------------------------------------- buttons and keys */
  const ACTIONS = {
    prev1: () => stepFrame(-1), next1: () => stepFrame(1),
    first: () => { pauseFirst(); go(visible()[0]); }, last: () => { pauseFirst(); const v = visible(); go(v[v.length - 1]); },
    prevwin: () => jumpWindow(-1), nextwin: () => jumpWindow(1),
    play: () => setPlaying(!st.playing), clip: cycleClip,
    zoom: () => setTool('zoom'), pen: () => setTool('pen'), full: () => (isFull() ? exitFull() : enterFull()),
  };
  $$('[data-act]').forEach((b) => b.addEventListener('click', () => ACTIONS[b.dataset.act] && ACTIONS[b.dataset.act]()));
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'select', 'textarea'].includes(tag) && e.target.type !== 'checkbox' && e.target.type !== 'range') return;
    const interactive = tag === 'button' || tag === 'summary' || tag === 'a' || tag === 'label';
    const k = e.key;
    if (k === ' ' && !interactive) ACTIONS.play();
    else if (k === 'ArrowLeft' && tag !== 'input') stepFrame(e.shiftKey ? -10 : -1);
    else if (k === 'ArrowRight' && tag !== 'input') stepFrame(e.shiftKey ? 10 : 1);
    else if (k === 'Home') ACTIONS.first();
    else if (k === 'End') ACTIONS.last();
    else if (k === 'PageUp') ACTIONS.prevwin();
    else if (k === 'PageDown') ACTIONS.nextwin();
    else if (k === 'i' || k === 'I') { st.A = st.f; if (st.B !== null && st.B < st.A) st.B = null; updateClipUI(); }
    else if (k === 'o' || k === 'O') { if (st.A === null) st.A = 0; st.B = Math.max(st.f, st.A); updateClipUI(); }
    else if (k === 'x' || k === 'X') { st.A = null; st.B = null; updateClipUI(); }
    else if (k === 'z' || k === 'Z') setTool('zoom');
    else if (k === 'p' || k === 'P') setTool('pen');
    else if (k === 'f' || k === 'F') ACTIONS.full();
    else if (k === 'Escape') {
      if (stage.classList.contains('pfs')) exitFull();
      else if (!undoZoom() && st.tool) setTool(st.tool); // back one zoom step; with nothing left, leave the tool
    }
    else if (k === '+' || k === '=') zoomAt(1.25, 0.5, 0.5);
    else if (k === '-' || k === '_') zoomAt(0.8, 0.5, 0.5);
    else if (k === '0') resetView();
    else if (R && k === '[') zoomTl(1.6, tlAnchor());
    else if (R && k === ']') zoomTl(1 / 1.6, tlAnchor());
    else return;
    if (k !== ' ' || !interactive) e.preventDefault();
  });

  /* ---------------------------------------------------------------- parameter controls */
  /* a small reset button on every slider and dropdown; disabled while the value is already the default.
     Double-clicking a slider also resets it. */
  const resets = [];
  const refreshResets = () => resets.forEach((r) => { r.btn.disabled = st.p[r.key] === DEFAULTS[r.key]; });
  function addReset(el, key, apply) {
    const row = el.closest('.row'), name = row.querySelector('label').textContent.trim();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'reset';
    btn.title = 'Reset ' + name.toLowerCase() + ' to default';
    btn.setAttribute('aria-label', 'Reset ' + name + ' to default');
    btn.innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-reset"/></svg>'; // static markup, no user data
    row.classList.add('has-reset');
    row.insertBefore(btn, el);
    const doReset = () => { st.p[key] = DEFAULTS[key]; apply(); saveParams(); refreshResets(); };
    btn.addEventListener('click', doReset);
    resets.push({ btn, key });
    return doReset;
  }
  function bindRange(id, key, outId, fmt, after) {
    const el = $(id), out = $(outId);
    const sync = () => { out.textContent = fmt(Number(el.value)); };
    const apply = () => { el.value = String(st.p[key]); sync(); if (after) after(); draw(); };
    el.value = String(st.p[key]); sync();
    el.addEventListener('input', () => { st.p[key] = Number(el.value); sync(); saveParams(); if (after) after(); draw(); refreshResets(); });
    el.addEventListener('dblclick', addReset(el, key, apply));
  }
  function bindSelect(id, key, after) {
    const el = $(id); el.value = st.p[key];
    const apply = () => { el.value = st.p[key]; if (after) after(); draw(); };
    el.addEventListener('change', () => { st.p[key] = el.value; saveParams(); if (after) after(); draw(); refreshResets(); });
    addReset(el, key, apply);
  }
  bindRange('#p-bp', 'bp', '#o-bp', (v) => (v / 10).toFixed(1) + ' σ');
  bindRange('#p-wp', 'wp', '#o-wp', (v) => 'p' + (v / 10).toFixed(1));
  bindRange('#p-g', 'g', '#o-g', (v) => (v / 100).toFixed(2));
  bindRange('#p-sp', 'speed', '#o-sp', (v) => FPS[v - 1] + ' fps', () => { $('#chip-speed').textContent = fps() + ' fps'; });
  bindRange('#m-sp', 'mSpeed', '#o-ms', (v) => v + ' px/yr');
  bindRange('#m-amp', 'mAmp', '#o-ma', (v) => v + ' σ');
  bindRange('#n-amt', 'noise', '#o-na', (v) => v + '% of σ');
  bindRange('#n-cont', 'cont', '#o-nc', (v) => (v === 1 ? 'independent' : v + ' frames'));
  bindRange('#n-drift', 'drift', '#o-nd', (v) => (v / 10).toFixed(1) + ' σ');
  bindRange('#n-jit', 'jit', '#o-nj', (v) => (v / 100).toFixed(2) + ' px');
  if ($('#p-src')) {
    const so = $('#p-src').querySelector('option[value="cache"]');
    if (REAL && !REAL.hasCache) { if (so) so.remove(); st.p.src = 'orig'; } // no cache frames in this export and no cell store
    else if (REAL && REAL.fromStore && so) so.textContent = 'From the lossy cache (decoded in the browser)';
    bindSelect('#p-src', 'src');
  }
  bindSelect('#p-s', 'stretch');
  bindSelect('#p-i', 'smooth', applyView);
  bindSelect('#p-f', 'frames', () => { if (st.p.frames === 'win') go(nearestIn(winStart, st.f)); });
  { const l = $('#p-l'); l.checked = st.p.loop; l.addEventListener('change', () => { st.p.loop = l.checked; saveParams(); }); }
  { const m = $('#m-on'); m.checked = st.p.mOn; m.addEventListener('change', () => { st.p.mOn = m.checked; saveParams(); draw(); }); }
  $('#chip-speed').textContent = fps() + ' fps';
  if (R) { // counts and names from the loaded data
    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    const o = $('#p-f').options; o[0].text = 'All frames (' + N + ')'; o[1].text = 'One per window (' + winStart.length + ')';
    set('#tl-count', winStart.length + (winStart.length === 1 ? ' observing window, ' : ' observing windows, ') + N + ' images shown' + (R.dropped ? ' (' + R.dropped + (R.dropped === 1 ? ' edge cutout' : ' edge cutouts') + ' dropped, under ' + Math.round(100 * (R.min_cover || 0.8)) + '% covered)' : '') + ', detector ' + R.det);
    set('#v-detl', 'Detector ' + R.det + ', ' + R.wave_range_um[0].toFixed(2) + '-' + R.wave_range_um[1].toFixed(2) + ' \u00b5m at the target');
    tl.setAttribute('aria-valuemax', String(N));
    set('#hud-sky', R.target.name + ': RA ' + R.target.ra.toFixed(3) + '  Dec ' + R.target.dec.toFixed(3) + ' (' + (R.target.note || 'grid centre') + ')');
    set('#hud-field', 'Field ' + ((W * R.pix_arcsec) / 60).toFixed(1) + '\u2032, ' + W + '\u00d7' + H + ' px');
    { // which way is north and east on screen, from the exported sky mapping
      const k = R.sky, c = Math.cos((k.dec0 * Math.PI) / 180);
      const A = [[k.dra_dx * c, k.dra_dy * c], [k.ddec_dx, k.ddec_dy]], det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
      const dir = (de, dn) => { const x = (A[1][1] * de - A[0][1] * dn) / det, y = (-A[1][0] * de + A[0][0] * dn) / det; return Math.round((Math.atan2(x, -y) * 180) / Math.PI); };
      const n = dir(0, 1), e = dir(1, 0), nm = (v) => (v === 0 ? 'up' : v > 0 ? v + '\u00b0 right of up' : -v + '\u00b0 left of up');
      set('#hud-orient', 'North ' + nm(n) + ', east ' + nm(e));
    }
  }
  refreshResets();

  /* detectors: show or hide timeline lanes */
  $$('[data-d]').forEach((c) => c.addEventListener('change', () => {
    $$('[data-lane="' + c.dataset.d + '"]').forEach((el) => el.classList.toggle('off', !c.checked));
  }));

  /* theme and sidebar: remembered between visits */
  {
    const tlight = $('#t-light'), tside = $('#t-side');
    if (store.get('theme') === 'light') tlight.checked = true;
    if (store.get('side') === true) tside.checked = true;
    tlight.addEventListener('change', () => store.set('theme', tlight.checked ? 'light' : 'dark'));
    tside.addEventListener('change', () => store.set('side', tside.checked));
  }

  /* ---------------------------------------------------------------- coordinates: parse and explain */
  const SAMPLE_RA = R ? R.target.ra : 134.4099, SAMPLE_DEC = R ? R.target.dec : -9.0238;
  /* What the position boxes accept. An angle is decimal degrees (133.795, -7.2451, 133.795d) or up to three numbers, with optional
     separators between them: 08h55m10.8s, -7d14m42.5s, 12:30:15, 12 30 15. Anything else, letters included, is rejected: the old
     parser took the digits out of any text, so "abc12" was read as 12. The field takes one number with an optional unit (11.1, 11.1', 0.2 deg). */
  const RE_ANGLE = /^[+-]?\s*\d+(?:\.\d+)?(?:\s*[hd°:]?\s*\d+(?:\.\d+)?(?:\s*['′m:]?\s*\d+(?:\.\d+)?)?)?\s*[hdms°'′"″]?$/;
  const RE_FOV = /^\d+(?:\.\d+)?\s*(?:deg(?:rees?)?|°|arcmin|min|'|′)?$/i;
  const OK_ANGLE_CHARS = /[^0-9+\-−.:\shmsdHMSD°'′"″]/g, OK_FOV_CHARS = /[^0-9.\sdegrsaicmnDEGRSAICMN°'′]/g;
  function parseAngle(text, isRA) {
    const t = String(text).trim().toLowerCase().replace(/−/g, '-');
    if (!RE_ANGLE.test(t)) return NaN;
    const nums = t.match(/\d+(?:\.\d+)?/g);
    if (!nums) return NaN;
    const parts = nums.map(Number), neg = t.startsWith('-');
    const sexa = /[hdms:°]/.test(t) || parts.length > 1;
    let v = parts[0] + (parts[1] || 0) / 60 + (parts[2] || 0) / 3600;
    if (isRA && (/h/.test(t) || (sexa && !/[d°]/.test(t)))) v *= 15;
    v = neg ? -v : v;
    if (isRA ? v < 0 || v >= 360 : Math.abs(v) > 90) return NaN;
    return v;
  }
  function loadCoords() {
    const ra = $('#in-ra'), dec = $('#in-dec'), fov = $('#in-fov'), msg = $('#coord-msg');
    [ra, dec, fov].forEach((el) => el.removeAttribute('aria-invalid'));
    const r = parseAngle(ra.value, true), d = parseAngle(dec.value, false);
    const fovOk = RE_FOV.test(String(fov.value).trim()), fnum = parseFloat(String(fov.value).replace(/[^\d.]/g, '')), f = /deg|°/i.test(fov.value) ? fnum * 60 : fnum;
    const bad = [];
    if (Number.isNaN(r)) { ra.setAttribute('aria-invalid', 'true'); bad.push('RA must be 0 to 360 degrees, or hours like 08h55m10.8s'); }
    if (Number.isNaN(d)) { dec.setAttribute('aria-invalid', 'true'); bad.push('Dec must be -90 to 90 degrees, or like -7d14m42.5s'); }
    if (!(fovOk && f > 0 && f <= 240)) { fov.setAttribute('aria-invalid', 'true'); bad.push('Field must be a number from 0 to 240 arcminutes, like 11.1 or 0.2 deg'); }
    msg.classList.toggle('err', bad.length > 0);
    if (bad.length) { msg.textContent = bad.join('. ') + '.'; return; }
    const sep = Math.hypot((r - SAMPLE_RA) * Math.cos((SAMPLE_DEC * Math.PI) / 180), d - SAMPLE_DEC);
    if (R) {
      const here = skyToPix(r, d);
      if (inGrid(here)) { // the loaded patch holds this position: ring and zoom, no reload
        focusPos(r, d);
        const off = Math.hypot((r - R.target.ra) * Math.cos((d * Math.PI) / 180), d - R.target.dec) * 3600;
        msg.textContent = 'Marked RA ' + r.toFixed(4) + ', Dec ' + d.toFixed(4) + ' in ' + R.target.name + ' (' + off.toFixed(0) + ' arcsec from the patch target, pixel ' + here.x.toFixed(1) + ', ' + here.y.toFixed(1) + '). Zoomed to about 4 arcminutes; Esc steps back. The ring can be turned off under Overlays.';
        return;
      }
      if (window.SkyPrepare) { // the service looks the position up: a prepared patch opens at once, anything else is prepared with a progress bar
        msg.textContent = 'Looking for this position...';
        SkyPrepare.viewer = location.pathname.split('/').pop() || 'v1-studio-real.html';
        SkyPrepare.go(r, d, R.det).then((res) => {
          if (res.state === 'ready') { msg.textContent = 'Opening...'; SkyPrepare.openPatch(res.key, r, d, R.det); }
          else if (res.state === 'failed') { msg.classList.toggle('err', !res.shown); msg.textContent = res.shown ? '' : res.message; }
          else if (res.state === 'cancelled') msg.textContent = 'Cancelled.';
        });
        return;
      }
      let best = null; // another prepared patch whose centre is within 3 arcminutes: open it, ring on the position
      for (const x of window.TARGETS || []) {
        if (x.key === window.SKY_TARGET) continue;
        const s = Math.hypot((r - x.ra) * Math.cos((d * Math.PI) / 180), d - x.dec) * 3600;
        if (s <= 180 && (!best || s < best.s)) best = { x, s };
      }
      if (best) {
        msg.textContent = 'Opening ' + best.x.name + ' (' + best.s.toFixed(0) + ' arcsec from the position).';
        const u = new URL(location.href); u.searchParams.set('target', best.x.key);
        u.searchParams.set('ra', r.toFixed(5)); u.searchParams.set('dec', d.toFixed(5));
        for (const k of ['d', 'f', 't']) u.searchParams.delete(k);
        location.href = u.toString();
      } else {
        msg.classList.add('err');
        msg.textContent = 'No prepared patch holds RA ' + r.toFixed(4) + ', Dec ' + d.toFixed(4) + '. This page reads only patches built in advance (about ' + ((W * R.pix_arcsec) / 60).toFixed(0) + ' arcminutes across) and does not call IRSA. To build one: in implementation/scripts run  uv run --script cell_cache_demo.py fetch --ra ' + r.toFixed(4) + ' --dec ' + d.toFixed(4) + ' --detector D6 --full  and then the same with export, and reload.';
      }
      return;
    }
    msg.textContent = sep > 0.1
      ? 'Parsed RA ' + r.toFixed(4) + ', Dec ' + d.toFixed(4) + ' degrees. This draft has no data there, so it still shows the sample crop.'
      : 'Position matches the sample crop (RA ' + SAMPLE_RA + ', Dec ' + SAMPLE_DEC + '). The field is fixed at 19.7 arcminutes in this draft.';
  }
  /* while typing: characters that can never be part of a valid entry are removed (letters other than h, m, s and d in RA and Dec; most
     letters in Field), and an entry that cannot be read is marked at once, so a wrong value shows before Load is pressed */
  {
    const box = (id, charsRe, okRe, hint) => {
      const el = $(id); if (!el) return;
      const mark = () => { const v = el.value.trim().toLowerCase().replace(/−/g, '-'); if (v && !okRe.test(v)) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); };
      el.autocomplete = 'off'; el.spellcheck = false; el.setAttribute('autocapitalize', 'off');
      el.addEventListener('input', () => {
        const v = el.value, c = el.selectionStart == null ? v.length : el.selectionStart;
        if (charsRe.test(v)) { // the global regex keeps state, so reset it
          charsRe.lastIndex = 0;
          const keep = v.slice(0, c).replace(charsRe, '').length;
          el.value = v.replace(charsRe, '');
          try { el.setSelectionRange(keep, keep); } catch (e) { /* not supported for this input */ }
          const m = $('#coord-msg'); if (m) { m.classList.add('err'); m.textContent = hint; }
        }
        charsRe.lastIndex = 0;
        mark();
      });
      el.addEventListener('blur', mark);
    };
    box('#in-ra', OK_ANGLE_CHARS, RE_ANGLE, 'RA takes degrees (133.795) or hours, minutes and seconds (08h55m10.8s). Other letters are not allowed.');
    box('#in-dec', OK_ANGLE_CHARS, RE_ANGLE, 'Dec takes degrees (-7.2451) or degrees, minutes and seconds (-7d14m42.5s). Other letters are not allowed.');
    box('#in-fov', OK_FOV_CHARS, RE_FOV, 'Field takes a number in arcminutes (11.1) or degrees (0.2 deg).');
  }
  $('#btn-load').addEventListener('click', loadCoords);
  ['#in-ra', '#in-dec', '#in-fov'].forEach((id) => $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') loadCoords(); }));

  /* ---------------------------------------------------------------- start */
  $('#pic-img').hidden = true;
  cv.hidden = false;
  if (R) {
    { const em = document.createElement('div'); em.id = 'empty-msg'; em.className = 'hud mid'; em.hidden = true; $('#canvas').appendChild(em); }
    buildTimeline();
    const zb = (id, fn) => { const b = $(id); if (b) b.addEventListener('click', fn); };
    zb('#tz-in', () => zoomTl(0.5, tlAnchor()));
    zb('#tz-out', () => zoomTl(2, tlAnchor()));
    zb('#tz-fit', fitTl);
  }
  if (R) { // ?ra=&dec= (degrees): ring and zoom on that position when this patch holds it
    const q = new URLSearchParams(location.search), qr = parseFloat(q.get('ra')), qd = parseFloat(q.get('dec'));
    if (Number.isFinite(qr) && Number.isFinite(qd) && inGrid(skyToPix(qr, qd))) {
      focusPos(qr, qd);
      window.SKY_FOCUS = true; // tells the page script not to reset the boxes to the patch target
      $('#in-ra').value = qr.toFixed(4); $('#in-dec').value = qd.toFixed(4);
    }
  }
  renderMarkers();
  updateClipUI();
  { // opening frame: ?f=N (1-based) or ?t=MJD (nearest frame), else the first
    const q = new URLSearchParams(location.search);
    let f0 = 0;
    if (R && q.get('f')) f0 = clamp((parseInt(q.get('f'), 10) || 1) - 1, 0, N - 1);
    else if (R && q.get('t')) { // ?t=MJD: the nearest frame, or an empty time if no frame is within about 4 pixels of the full timeline
      const t = parseFloat(q.get('t'));
      f0 = frames.reduce((b, c, i) => (Math.abs(c.mjd - t) < Math.abs(frames[b].mjd - t) ? i : b), 0);
      if (Math.abs(frames[f0].mjd - t) * 864e5 > (4 * SPAN) / Math.max(300, tl.clientWidth)) f0 = -1, goEmpty(mjdT(t));
    }
    if (f0 >= 0) go(f0);
  }
  applyView();
})();
