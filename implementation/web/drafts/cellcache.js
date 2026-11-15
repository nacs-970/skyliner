/* Browser decoder for the lossy cell store written by implementation/scripts/cell_cache_demo.py (export writes sky.store.js).
   SI-GENERATED CODE: written by Claude Sonnet 5.5 (Anthropic) through Claude Code on 2026-11-15. See docs/si-log.md. No dependencies.

   Store format (little endian), the same records as the Python store but not LZMA compressed, because browsers cannot decompress
   LZMA natively: u32 length, then a JSON head, a newline and a payload. The payload is a bit mask of the cells that changed (numpy
   packbits order: the first cell is the top bit, cells in row-major order) followed by the changed cells' deltas (int8, int16 or
   int32 as the head says, row-major inside each cell). Frame k is reference + offset, and then reference += delta * step for every
   changed cell, exactly as State.apply does in the Python script. The decoded frames match the Python decoder to float32 rounding
   (implementation/tests/cellcache_decode_check.js compares them for every exported patch). */
(function () {
  'use strict';
  /* b64: the store; W, H: grid size in pixels; CELL: cell edge in pixels; flipX: mirror each row (the export does, so the page shows
     east to the left); nExpected: number of frames, checked. Returns one Float32Array of nExpected * W * H, frame-major. */
  function decodeCellStore(b64, W, H, CELL, flipX, nExpected) {
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const dv = new DataView(u8.buffer), td = new TextDecoder();
    const ny = H / CELL, nx = W / CELL, nbits = ny * nx, nbytes = (nbits + 7) >> 3, NPX = W * H;
    if (!Number.isInteger(ny) || !Number.isInteger(nx)) throw new Error('grid is not a whole number of cells');
    const ref = new Float32Array(NPX), frames = [];
    let pos = 0;
    while (pos < u8.length) {
      const len = dv.getUint32(pos, true); pos += 4;
      const rec = u8.subarray(pos, pos + len); pos += len;
      const nl = rec.indexOf(10);
      if (nl < 0) throw new Error('bad record: no newline after the head');
      const meta = JSON.parse(td.decode(rec.subarray(0, nl))), pl = rec.subarray(nl + 1);
      const pv = new DataView(pl.buffer, pl.byteOffset, pl.byteLength);
      const step = Math.fround(meta.step), off = Math.fround(meta.offset);
      const bpe = meta.dtype === 'i1' ? 1 : meta.dtype === 'i2' ? 2 : meta.dtype === 'i4' ? 4 : 0;
      if (!bpe) throw new Error('unknown delta type ' + meta.dtype);
      let di = nbytes;
      for (let c = 0; c < nbits; c++) {
        if (!((pl[c >> 3] >> (7 - (c & 7))) & 1)) continue;
        const cy = (c / nx) | 0, cx = c % nx;
        for (let r = 0; r < CELL; r++) {
          const row = (cy * CELL + r) * W + cx * CELL;
          for (let k = 0; k < CELL; k++, di += bpe) {
            const d = bpe === 1 ? pv.getInt8(di) : bpe === 2 ? pv.getInt16(di, true) : pv.getInt32(di, true);
            ref[row + k] += Math.fround(d * step); // stored into a Float32Array, so rounded to float32 as in numpy
          }
        }
      }
      if (di !== pl.length) throw new Error('bad record: payload length does not match the mask');
      const f = new Float32Array(NPX);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) f[y * W + (flipX ? W - 1 - x : x)] = ref[y * W + x] + off;
      frames.push(f);
    }
    if (nExpected !== undefined && frames.length !== nExpected) throw new Error('store has ' + frames.length + ' frames, expected ' + nExpected);
    const out = new Float32Array(frames.length * NPX);
    frames.forEach((f, i) => out.set(f, i * NPX));
    return out;
  }
  const g = typeof window !== 'undefined' ? window : globalThis;
  g.decodeCellStore = decodeCellStore;
})();
