// Splits a single-contour glyph into paint bands that run along its stroke.
// Each point inside is given u = distance to one side wall / (sum of both),
// and the band edges are the level lines u = 1/3, 2/3. The two terminal caps
// are left out of the walls, so the bands run straight into the round ends.
function flatten(commands) {
  const polys = []; let cur = [], x = 0, y = 0, sx = 0, sy = 0;
  for (const c of commands) {
    if (c.type === 'M') { if (cur.length) polys.push(cur); cur = [[c.x, c.y]]; x = sx = c.x; y = sy = c.y; }
    else if (c.type === 'L') { cur.push([c.x, c.y]); x = c.x; y = c.y; }
    else if (c.type === 'Q') { for (let k = 1; k <= 24; k++) { const t = k / 24, u = 1 - t; cur.push([u * u * x + 2 * u * t * c.x1 + t * t * c.x, u * u * y + 2 * u * t * c.y1 + t * t * c.y]); } x = c.x; y = c.y; }
    else if (c.type === 'C') { for (let k = 1; k <= 32; k++) { const t = k / 32, u = 1 - t; cur.push([u * u * u * x + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x, u * u * u * y + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y]); } x = c.x; y = c.y; }
    else if (c.type === 'Z') { polys.push(cur); cur = []; }
  }
  if (cur.length) polys.push(cur);
  return polys;
}
function densify(poly, step) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(l / step));
    for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  return out;
}
const inside = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const nearest = (pts, x, y) => { let best = Infinity; for (const p of pts) { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < best) best = d; } return Math.sqrt(best); };

// caps: the two terminal tips, as points on (or near) the outline.
function strokeBands(commands, caps, levels, { cell = .25, reach = 12 } = {}) {
  const outline = densify(flatten(commands)[0], .3);
  // Each cap is the stretch of outline within `reach` (measured along the outline) of its tip.
  const isCap = new Array(outline.length).fill(false);
  for (const tipAt of caps) {
    let tip = 0; outline.forEach((q, i) => { if (Math.hypot(q[0] - tipAt[0], q[1] - tipAt[1]) < Math.hypot(outline[tip][0] - tipAt[0], outline[tip][1] - tipAt[1])) tip = i; });
    for (const step of [1, -1]) { let run = 0; for (let i = tip; run < reach; ) { isCap[i] = true; const j = (i + step + outline.length) % outline.length; run += Math.hypot(outline[j][0] - outline[i][0], outline[j][1] - outline[i][1]); i = j; } }
  }
  // Walk the outline from the first cap point; walls are the two runs between caps.
  const n = outline.length, start = isCap.findIndex((c, i) => c && !isCap[(i - 1 + n) % n]);
  const runs = []; let run = null;
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    if (!isCap[i]) { if (!run) runs.push(run = []); run.push(i); } else run = null;
  }
  if (runs.length !== 2) throw new Error(`expected two walls, found ${runs.length}`);
  const [wallA, wallB] = runs.map(r => r.map(i => outline[i]));
  const xs = outline.map(p => p[0]), ys = outline.map(p => p[1]);
  const x0 = Math.min(...xs) - 1, x1 = Math.max(...xs) + 1, y0 = Math.min(...ys) - 1, y1 = Math.max(...ys) + 1;
  const W = Math.ceil((x1 - x0) / cell) + 1, H = Math.ceil((y1 - y0) / cell) + 1;
  const u = new Float64Array(W * H).fill(NaN);
  const poly = flatten(commands)[0];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = x0 + i * cell, y = y0 + j * cell;
    // Score a margin outside the glyph too, so level lines reach the edge cleanly.
    if (!inside(poly, x, y) && nearest(outline, x, y) > 1.2) continue;
    const a = nearest(wallA, x, y), b = nearest(wallB, x, y);
    u[j * W + i] = a / (a + b);
  }
  const curves = levels.map(level => {
    // Marching squares: segments where u crosses the level, then chain them.
    const segs = [];
    const at = (i, j) => u[j * W + i], P = (i, j) => [x0 + i * cell, y0 + j * cell];
    const lerp = (p, q, a, b) => { const t = (level - a) / (b - a); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
    for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
      const v = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
      if (v.some(Number.isNaN)) continue;
      const c = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
      const hits = [];
      for (let e = 0; e < 4; e++) { const a = v[e], b = v[(e + 1) % 4]; if ((a < level) !== (b < level)) hits.push(lerp(c[e], c[(e + 1) % 4], a, b)); }
      if (hits.length === 2) segs.push(hits);
      else if (hits.length === 4) { segs.push([hits[0], hits[1]]); segs.push([hits[2], hits[3]]); }
    }
    const key = p => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;
    const ends = new Map();
    segs.forEach((s, idx) => s.forEach(p => { const k = key(p); if (!ends.has(k)) ends.set(k, []); ends.get(k).push(idx); }));
    const used = new Uint8Array(segs.length);
    let best = [];
    for (let s0 = 0; s0 < segs.length; s0++) {
      if (used[s0]) continue;
      used[s0] = 1; let chain = [segs[s0][0], segs[s0][1]];
      for (const forward of [true, false]) {
        for (;;) {
          const tip = forward ? chain[chain.length - 1] : chain[0];
          const next = (ends.get(key(tip)) || []).find(idx => !used[idx]);
          if (next === undefined) break;
          used[next] = 1;
          const [p, q] = segs[next], other = key(p) === key(tip) ? q : p;
          if (forward) chain.push(other); else chain.unshift(other);
        }
      }
      if (chain.length > best.length) best = chain;
    }
    // Smooth the stair-steps of the grid away.
    for (let pass = 0; pass < 3; pass++) best = best.map((p, i) => i === 0 || i === best.length - 1 ? p : [(best[i - 1][0] + 2 * p[0] + best[i + 1][0]) / 4, (best[i - 1][1] + 2 * p[1] + best[i + 1][1]) / 4]);
    return best.filter((_, i) => i % 2 === 0 || i === best.length - 1);
  });
  // Region u >= level: the level curve, then the outline back round to its
  // start, taking the way that runs along wall B rather than wall A.
  const idxNear = p => { let bi = 0, bd = Infinity; outline.forEach((q, i) => { const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; };
  const walk = (from, to, dir) => { const out = []; for (let i = from; ; i = (i + dir + n) % n) { out.push(outline[i]); if (i === to) break; } return out; };
  const aSet = new Set(runs[0]), bSet = new Set(runs[1]);
  const r = v => +v.toFixed(2);
  const regions = curves.map(curve => {
    let best = -Infinity, chosen = null;
    for (const c of [curve, curve.slice().reverse()]) for (const dir of [1, -1]) {
      const e = idxNear(c[c.length - 1]), s = idxNear(c[0]), path = walk(e, s, dir);
      let score = 0;
      for (let k = 0; k < path.length; k++) { const i = (e + dir * k + 2 * n) % n; if (bSet.has(i)) score++; if (aSet.has(i)) score--; }
      if (score > best) { best = score; chosen = [...c, ...path]; }
    }
    return 'M' + chosen.map(p => `${r(p[0])} ${r(p[1])}`).join('L') + 'Z';
  });
  return { regions, curves, walls: [wallA, wallB] };
}
module.exports = { strokeBands };
