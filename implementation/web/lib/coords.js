/* Position input rules for the landing page: the same rules as the position boxes in drafts/app.js (keep the two in step; the browser
   checks in implementation/tests test both). SI-GENERATED CODE: written by Claude Sonnet 5.5 (Anthropic) through Claude Code on
   2026-11-15. See docs/si-log.md. No dependencies.
   An angle is decimal degrees (133.795, -7.2451, 133.795d) or up to three numbers with optional separators between them: 08h55m10.8s,
   -7d14m42.5s, 12:30:15, 12 30 15. Anything else, letters included, is rejected. */
(function () {
  'use strict';
  const RE_ANGLE = /^[+-]?\s*\d+(?:\.\d+)?(?:\s*[hd°:]?\s*\d+(?:\.\d+)?(?:\s*['′m:]?\s*\d+(?:\.\d+)?)?)?\s*[hdms°'′"″]?$/;
  const OK_ANGLE_CHARS = /[^0-9+\-−.:\shmsdHMSD°'′"″]/g;
  function parseAngle(text, isRA) { // degrees, or NaN if the text is not an angle in range
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
  /* while typing: characters that can never be part of an angle are removed, and an entry that cannot be read is marked at once */
  function attachBox(el, hint, onHint) {
    const mark = () => { const v = el.value.trim().toLowerCase().replace(/−/g, '-'); if (v && !RE_ANGLE.test(v)) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); };
    el.autocomplete = 'off'; el.spellcheck = false; el.setAttribute('autocapitalize', 'off');
    el.addEventListener('input', () => {
      const v = el.value, c = el.selectionStart == null ? v.length : el.selectionStart;
      OK_ANGLE_CHARS.lastIndex = 0;
      if (OK_ANGLE_CHARS.test(v)) {
        OK_ANGLE_CHARS.lastIndex = 0;
        const keep = v.slice(0, c).replace(OK_ANGLE_CHARS, '').length;
        el.value = v.replace(OK_ANGLE_CHARS, '');
        try { el.setSelectionRange(keep, keep); } catch (e) { /* not supported */ }
        if (onHint) onHint(hint);
      }
      OK_ANGLE_CHARS.lastIndex = 0;
      mark();
    });
    el.addEventListener('blur', mark);
  }
  const NAMES = [[/barnard/i, 'Barnard’s Star'], [/eps ind b/i, 'Epsilon Indi B'], [/rw aur/i, 'RW Aurigae'], [/r dra/i, 'R Draconis'], [/wise 0855/i, 'WISE 0855']];
  function friendlyName(n) { for (const [re, f] of NAMES) if (re.test(n)) return f; return n; }
  window.SkyCoords = { RE_ANGLE, parseAngle, attachBox, friendlyName };
})();
