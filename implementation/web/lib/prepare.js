/* Client for the local service (implementation/server/app.py): is a sky position prepared, and if not, prepare it while a loading
   screen shows progress. SI-GENERATED CODE: written by Claude Sonnet 5.5 (Anthropic) through Claude Code on 2026-11-15.
   See docs/si-log.md. No dependencies.

   SkyPrepare.go(ra, dec, det) resolves to one of
     { state: 'ready', key }       the patch is prepared (it may have just been built): open it with SkyPrepare.openPatch
     { state: 'failed', message }  the preparation failed, with a plain message (shown: true when the loading screen already showed it)
     { state: 'cancelled' }        the person cancelled
   A position that is already prepared opens at once. A new one is prepared with no further input: the loading screen shows the steps
   and a progress bar. If the service is not running, the screen says how to start it and waits, and carries on by itself the moment
   the service answers (so the page works whether it was opened from the service, from a file, or from another local server).
   The page that loads this file sets SkyPrepare.viewer, the address of the viewer page relative to itself. */
(function () {
  'use strict';
  const COVER_ARCSEC = 300; // a prepared patch covers a position this close to its centre (the same rule as the service)
  const START_CMD = './start.sh';
  const css = `
  .pg-back { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 16px; background: var(--bg, #0b0c10); }
  .pg-back[hidden] { display: none; }
  .pg-card { width: min(560px, 100%); display: grid; gap: 14px; padding: 24px; border: 1px solid var(--line, #353a45); border-radius: var(--radius, 8px); background: var(--panel, #14161b); color: var(--text, #f4f4f2); font: 14px/1.5 var(--font, system-ui, sans-serif); box-shadow: 0 12px 40px rgba(0, 0, 0, .35); }
  .pg-card h2 { margin: 0; font-size: 20px; letter-spacing: -.02em; }
  .pg-card progress { width: 100%; height: 12px; accent-color: var(--accent, #6ea2f0); }
  .pg-card p { margin: 0; color: var(--muted, #a3a6b0); font-size: 13px; }
  .pg-card p.pg-msg { color: var(--text, #f4f4f2); font-size: 14px; min-height: 1.5em; }
  .pg-steps { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
  .pg-steps li { padding-left: 24px; position: relative; color: var(--muted, #a3a6b0); font-size: 13px; }
  .pg-steps li::before { content: ''; position: absolute; left: 4px; top: 5px; width: 9px; height: 9px; border-radius: 50%; border: 2px solid var(--line, #353a45); }
  .pg-steps li.active { color: var(--text, #f4f4f2); font-weight: 600; }
  .pg-steps li.active::before { border-color: var(--accent, #6ea2f0); background: var(--accent, #6ea2f0); }
  .pg-steps li.done::before { border-color: var(--accent, #6ea2f0); }
  .pg-steps li.done { color: var(--text, #f4f4f2); }
  .pg-cmd { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid var(--line, #353a45); border-radius: var(--radius-sm, 6px); background: var(--bg, #0b0c10); font: 13px var(--mono, ui-monospace, monospace); }
  .pg-cmd code { flex: 1; overflow-wrap: anywhere; }
  .pg-act { display: flex; justify-content: flex-end; gap: 8px; }
  .pg-card.err h2 { color: var(--danger, #f0705f); }`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  /* ---- the loading screen */
  let overlay = null, onCancel = null;
  const STEPS = ['Searching NASA’s archive for images of this position', 'Reading the images', 'Building the view'];
  function ui() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'pg-back'; overlay.hidden = true;
    overlay.innerHTML = '<div class="pg-card" role="alertdialog" aria-labelledby="pg-title" aria-describedby="pg-msg"><h2 id="pg-title"></h2>' +
      '<progress id="pg-bar" max="100"></progress><p class="pg-msg" id="pg-msg" aria-live="polite"></p>' +
      '<ol class="pg-steps" id="pg-steps">' + STEPS.map((s) => '<li>' + s + '</li>').join('') + '</ol>' +
      '<div class="pg-cmd" id="pg-cmd" hidden><code>' + START_CMD + '</code><button class="btn small" id="pg-copy" type="button">Copy</button></div>' +
      '<p id="pg-note">Real images are read from NASA’s public archive. A new position takes a few minutes. You can leave this tab open; the same position opens at once afterwards.</p>' +
      '<div class="pg-act"><button class="btn small" id="pg-cancel" type="button">Cancel</button></div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#pg-cancel').addEventListener('click', () => { if (onCancel) onCancel(); });
    overlay.querySelector('#pg-copy').addEventListener('click', () => { try { navigator.clipboard.writeText(START_CMD); overlay.querySelector('#pg-copy').textContent = 'Copied'; } catch (e) { /* no clipboard */ } });
    return overlay;
  }
  const $ = (id) => ui().querySelector('#' + id);
  function steps(active) { // 0: none yet, 1..3: that step is active, 4: all done
    [...$('pg-steps').children].forEach((li, i) => { li.className = i + 1 < active ? 'done' : i + 1 === active ? 'active' : ''; });
  }
  function show(title) {
    ui().hidden = false; ui().querySelector('.pg-card').classList.remove('err');
    $('pg-title').textContent = title; $('pg-bar').removeAttribute('value'); $('pg-msg').textContent = '';
    $('pg-cancel').textContent = 'Cancel'; $('pg-note').hidden = false; $('pg-steps').hidden = false; $('pg-cmd').hidden = true; $('pg-copy').textContent = 'Copy'; steps(1);
  }
  function hide() { if (overlay) overlay.hidden = true; onCancel = null; }
  function update(j) {
    const bar = $('pg-bar');
    if (j.state === 'queued') { bar.removeAttribute('value'); steps(0); $('pg-msg').textContent = 'Waiting: another position is being prepared' + (j.queue_position > 1 ? ' (' + (j.queue_position - 1) + ' more ahead).' : '.'); return; }
    steps(j.step === 'export' ? 3 : j.total ? 2 : 1);
    if (j.percent > 2) bar.value = j.percent; else bar.removeAttribute('value');
    $('pg-msg').textContent = j.message || '';
  }
  function fail(message) { return new Promise((resolve) => {
    ui().hidden = false; ui().querySelector('.pg-card').classList.add('err');
    $('pg-title').textContent = 'This position could not be prepared'; $('pg-bar').value = 0; $('pg-msg').textContent = message;
    $('pg-note').hidden = true; $('pg-steps').hidden = true; $('pg-cmd').hidden = true;
    $('pg-cancel').textContent = 'OK'; onCancel = () => { hide(); resolve(); };
  }); }

  /* ---- talking to the service */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sep = (r1, d1, r2, d2) => Math.hypot((r1 - r2) * Math.cos((d1 * Math.PI) / 180), d1 - d2) * 3600;
  let base = null; // the address of the service once found
  function candidates() {
    const sp = new URLSearchParams(location.search).get('service'); // ?service=8123 points the page at another local port (tests)
    if (sp && /^\d{1,5}$/.test(sp)) return ['http://127.0.0.1:' + sp];
    return /^https?:$/.test(location.protocol) ? ['', 'http://127.0.0.1:8000'] : ['http://127.0.0.1:8000'];
  }
  async function probe(b) {
    try { const c = new AbortController(); const t = setTimeout(() => c.abort(), 2000); const r = await fetch(b + '/api/health', { cache: 'no-store', signal: c.signal }); clearTimeout(t); return r.ok && !!(await r.json()).ok; } catch (e) { return false; }
  }
  async function available() {
    if (base !== null) return true;
    for (const b of candidates()) if (await probe(b)) { base = b; return true; }
    return false;
  }
  async function api(path, opt) {
    const r = await fetch(base + '/api' + path, Object.assign({ cache: 'no-store' }, opt));
    let body = null; try { body = await r.json(); } catch (e) { /* no body */ }
    if (!r.ok) throw new Error((body && (typeof body.detail === 'string' ? body.detail : null)) || ('HTTP ' + r.status));
    return body;
  }
  // a prepared patch of the page's own list (window.TARGETS) that covers the position, for when the service is not running
  function nearest(ra, dec, det) { // det: only a patch that has this detector exported counts
    let best = null;
    for (const x of window.TARGETS || []) {
      if (det && x.detectors && !x.detectors.some((y) => y.det === det)) continue;
      const s = sep(ra, dec, x.ra, x.dec);
      if (s <= COVER_ARCSEC && (best === null || s < best.s)) best = { key: x.key, s, name: x.name };
    }
    return best;
  }
  // the service is down: say how to start it and keep asking; carry on by itself when it answers. false: the person cancelled
  async function waitForService() {
    let cancelled = false;
    show('Waiting for the preparation service');
    $('pg-steps').hidden = true; $('pg-cmd').hidden = false; $('pg-bar').removeAttribute('value');
    $('pg-msg').textContent = 'The service that prepares new positions is not running. Start it by running this in the project folder (a browser tab may open; you can ignore it). This page carries on by itself as soon as the service is up.';
    $('pg-note').hidden = true;
    onCancel = () => { cancelled = true; };
    while (!cancelled) { if (await available()) { hide(); return true; } await sleep(2000); }
    hide();
    return false;
  }

  const SkyPrepare = {
    viewer: 'v1-studio-real.html',
    available,
    nearest,
    openPatch(key, ra, dec, det) {
      const u = new URL(SkyPrepare.viewer, location.href);
      u.search = new URLSearchParams({ target: key, ra: Number(ra).toFixed(5), dec: Number(dec).toFixed(5), d: det || 'D6' }).toString();
      location.href = u.toString();
    },
    async go(ra, dec, det) {
      det = det || 'D6';
      if (!(await available())) { // a prepared patch in the page's own list opens without the service; anything else waits for it
        const n = nearest(ra, dec, det);
        if (n) return { state: 'ready', key: n.key };
        if (!(await waitForService())) return { state: 'cancelled' };
      }
      const q = '?ra=' + encodeURIComponent(ra) + '&dec=' + encodeURIComponent(dec) + '&detector=' + det;
      let lk;
      for (let attempt = 0; ; attempt++) {
        try { lk = await api('/lookup' + q); break; }
        catch (e) { // the service went away since the page loaded: wait for it once, then ask again
          if (e instanceof TypeError && attempt === 0) { base = null; if (!(await waitForService())) return { state: 'cancelled' }; continue; }
          return { state: 'failed', message: e instanceof TypeError ? 'The service is not answering. Start it again and enter the position again.' : String(e.message || e) };
        }
      }
      if (lk.state === 'ready') return { state: 'ready', key: lk.key };
      let job = lk.job;
      try { if (!job) job = await api('/prepare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ra, dec, detector: det }) }); } catch (e) { return { state: 'failed', message: String(e.message || e) }; }
      if (job.state === 'done' && job.key) return { state: 'ready', key: job.key };
      let cancelled = false;
      show('Preparing RA ' + Number(ra).toFixed(4) + ', Dec ' + Number(dec).toFixed(4));
      onCancel = () => { cancelled = true; if (job && job.id) fetch(base + '/api/jobs/' + job.id, { method: 'DELETE' }).catch(() => {}); };
      update(job);
      let misses = 0;
      while (!cancelled) {
        await sleep(1500);
        try { job = await api('/jobs/' + job.id); misses = 0; } catch (e) { if (++misses > 5) { hide(); return { state: 'failed', message: 'The service stopped answering. Start it again and enter the position again.' }; } continue; }
        update(job);
        if (job.state === 'done') { steps(4); hide(); return { state: 'ready', key: job.key }; }
        if (job.state === 'failed') { await fail(job.error || job.message || 'The preparation failed.'); return { state: 'failed', message: job.error || job.message, shown: true }; }
        if (job.state === 'cancelled') break;
      }
      hide();
      return { state: 'cancelled' };
    },
  };
  window.SkyPrepare = SkyPrepare;
})();
