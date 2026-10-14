// Builds every Scrape logo file from the fonts: the three rounds of exploration,
// the final logo, the favicon, and a master SVG laying out the whole progression.
//
//   node brand/source/build.cjs <DynaPuff-SemiBold.ttf> <Nunito-ExtraBold.ttf>
//
// Needs opentype.js (npm install --no-save opentype.js). See brand/README.md.
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');
const { strokeBands } = require('./s-bands.cjs');

const [dynaFile, nunitoFile] = process.argv.slice(2);
if (!dynaFile || !nunitoFile) throw new Error('usage: node brand/source/build.cjs <DynaPuff-SemiBold.ttf> <Nunito-ExtraBold.ttf>');
const dyna = opentype.loadSync(dynaFile), nunito = opentype.loadSync(nunitoFile);
const BRAND = path.resolve(__dirname, '..'), PUBLIC = path.resolve(BRAND, '..', 'public');

const C = { ink: '#35483a', paper: '#f5f1e5', desk: '#e9e3d7', butter: '#e5b84e', tomato: '#c55c43', lake: '#649295', rose: '#d99092', moss: '#7a8963', coral: '#b85943', muted: '#5d6a58' };
const f = n => +n.toFixed(2);
const svg = (w, h, body, x = 0, y = 0) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(x)} ${f(y)} ${f(w)} ${f(h)}" width="${f(w)}" height="${f(h)}">${body}</svg>\n`;
const written = {};
const save = (rel, content, root = BRAND) => { const file = path.join(root, rel); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content); written[rel] = content; };

// ---------------------------------------------------------------------------
// Letters, as outlines
// ---------------------------------------------------------------------------
function word(text, size, x0, y0, font = dyna) {
  let x = x0; const glyphs = [];
  for (const ch of text) { const g = font.charToGlyph(ch); glyphs.push({ ch, x, d: g.getPath(x, y0, size).toPathData(2) }); x += g.advanceWidth * size / font.unitsPerEm; }
  return { glyphs, end: x };
}
const fillGlyphs = (ws, fill) => ws.glyphs.map(g => `<path d="${g.d}" fill="${fill}"/>`).join('');
const textWidth = (font, text, size) => font.getAdvanceWidth(text, size);
const text = (font, str, size, x, y, fill) => `<path d="${font.getPath(str, x, y, size).toPathData(2)}" fill="${fill}"/>`;

// Every wordmark is set at 100 units, baseline 72, with 14 units either side.
const SIZE = 100, BASE = 72, PAD = 14;
const SCRAPE = word('scrape', SIZE, PAD, BASE), DOT = word('.', SIZE, SCRAPE.end, BASE);
const WW = Math.ceil(DOT.end + PAD), WH = 110;
const clipWord = (id, ws) => `<clipPath id="${id}">${ws.glyphs.map(g => `<path d="${g.d}"/>`).join('')}</clipPath>`;

// ---------------------------------------------------------------------------
// Round 1: three directions for the mark
// ---------------------------------------------------------------------------
const markPull = (tile = C.ink, card = C.paper) => `<rect width="64" height="64" rx="14" fill="${tile}"/><path d="M17 18H25L26.5 44H15.5Z" fill="${C.butter}"/><path d="M28 18H36L37.5 44H26.5Z" fill="${C.tomato}"/><path d="M39 18H47L48.5 44H37.5Z" fill="${C.lake}"/><circle cx="21" cy="18" r="5" fill="${C.butter}"/><circle cx="32" cy="18" r="5" fill="${C.tomato}"/><circle cx="43" cy="18" r="5" fill="${C.lake}"/><ellipse cx="19.4" cy="16.2" rx="1.7" ry="1.1" fill="#fffdf8" opacity=".5"/><ellipse cx="30.4" cy="16.2" rx="1.7" ry="1.1" fill="#fffdf8" opacity=".5"/><ellipse cx="41.4" cy="16.2" rx="1.7" ry="1.1" fill="#fffdf8" opacity=".5"/><rect x="12" y="43.5" width="40" height="8.5" rx="2.5" fill="${card}"/>`;
const markSwirl = `<rect width="64" height="64" rx="14" fill="${C.paper}"/><g transform="translate(6.4 6.4) scale(.8)" fill="none" stroke-width="4.9"><path d="M44.78 12.05A15.6 15.6 0 1 0 32 36.6A6.4 6.4 0 1 1 26.76 46.67" stroke="${C.lake}"/><path d="M41.01 14.69A11 11 0 1 0 32 32A11 11 0 1 1 22.99 49.31" stroke="${C.butter}"/><path d="M37.24 17.33A6.4 6.4 0 1 0 32 27.4A15.6 15.6 0 1 1 19.22 51.95" stroke="${C.tomato}"/></g>`;
const markCard = `<rect width="64" height="64" rx="14" fill="${C.ink}"/><clipPath id="card"><rect x="9" y="17" width="46" height="28" rx="6"/></clipPath><g transform="rotate(-10 32 31)"><rect x="9" y="17" width="46" height="28" rx="6" fill="${C.butter}"/><g clip-path="url(#card)"><rect x="9" y="35" width="11.5" height="10" fill="${C.lake}"/><rect x="20.5" y="35" width="11.5" height="10" fill="${C.tomato}"/><rect x="32" y="35" width="11.5" height="10" fill="${C.rose}"/><rect x="43.5" y="35" width="11.5" height="10" fill="${C.moss}"/></g><rect x="15" y="21.5" width="20" height="2.6" rx="1.3" fill="#fffdf8" opacity=".5"/></g>`;
save('exploration/round-1/a-the-pull.svg', svg(64, 64, markPull()));
save('exploration/round-1/b-the-swirl.svg', svg(64, 64, markSwirl));
save('exploration/round-1/c-the-card.svg', svg(64, 64, markCard));
save('exploration/round-1/1-plain.svg', svg(WW, WH, fillGlyphs(SCRAPE, C.ink) + fillGlyphs(DOT, C.coral)));
{
  // A three-band ribbon pulled under the word, stopped by a card.
  const y0 = BASE + 28, end = SCRAPE.end - 2;
  const band = (x0, y, colour) => `<path d="M${x0 + 4} ${y}H${f(end)}V${y + 8}H${x0 + 4}A4 4 0 0 1 ${x0 + 4} ${y}Z" fill="${colour}"/>`;
  const body = fillGlyphs(SCRAPE, C.ink) + band(PAD + 2, y0, C.butter) + band(PAD + 12, y0 + 8, C.tomato) + band(PAD + 22, y0 + 16, C.lake) + `<rect x="${f(end)}" y="${y0 - 4}" width="9" height="32" rx="3" fill="${C.ink}"/>`;
  save('exploration/round-1/2-with-a-pull.svg', svg(WW, y0 + 36, body));
}
{
  // The pull mark beside the word, then the same reversed.
  const m = 92, gap = 20, y = BASE - 31 - m / 2, w = word('scrape', SIZE, PAD + m + gap, BASE), d = word('.', SIZE, w.end, BASE);
  const width = Math.ceil(d.end + PAD);
  save('exploration/round-1/3-lockup.svg', svg(width, WH, `<g transform="translate(${PAD} ${f(y)}) scale(${m / 64})">${markPull()}</g>` + fillGlyphs(w, C.ink) + fillGlyphs(d, C.coral)));
  save('exploration/round-1/4-reversed.svg', svg(width, WH, `<rect width="${width}" height="${WH}" rx="18" fill="${C.ink}"/><g transform="translate(${PAD} ${f(y)}) scale(${m / 64})">${markPull(C.paper, C.ink)}</g>` + fillGlyphs(w, C.paper) + fillGlyphs(d, C.butter)));
}

// ---------------------------------------------------------------------------
// Round 2: a geometric ribbon s, and paint pulled through the letters
// ---------------------------------------------------------------------------
const bez = (p0, p1, p2, p3, t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };
function sample(chain, step = .6) {
  const dense = [];
  for (let i = 0; i + 3 < chain.length; i += 3) for (let k = 0; k <= 400; k++) { if (i && !k) continue; dense.push(bez(chain[i], chain[i + 1], chain[i + 2], chain[i + 3], k / 400)); }
  const out = [dense[0]]; let acc = 0;
  for (let i = 1; i < dense.length; i++) { acc += Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]); if (acc >= step) { out.push(dense[i]); acc = 0; } }
  out.push(dense[dense.length - 1]);
  return out;
}
const frames = pts => pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return { p, t: [dx / l, dy / l], n: [-dy / l, dx / l] }; });
// One band between lateral offsets a < b of a ribbon of half-width R, with round or flat ends.
function band(fr, a, b, R, startEnd, endEnd) {
  const pts = [];
  const cap = (q, dir, from, to) => { const t0 = Math.asin(Math.max(-1, Math.min(1, from / R))), t1 = Math.asin(Math.max(-1, Math.min(1, to / R))); for (let k = 0; k <= 16; k++) { const th = t0 + (t1 - t0) * k / 16; pts.push([q.p[0] + R * (Math.cos(th) * dir * q.t[0] + Math.sin(th) * q.n[0]), q.p[1] + R * (Math.cos(th) * dir * q.t[1] + Math.sin(th) * q.n[1])]); } };
  const first = fr[0], last = fr[fr.length - 1];
  if (startEnd === 'round') cap(first, -1, a, b); else pts.push([first.p[0] + a * first.n[0], first.p[1] + a * first.n[1]]);
  for (const q of fr) pts.push([q.p[0] + b * q.n[0], q.p[1] + b * q.n[1]]);
  if (endEnd === 'round') cap(last, 1, b, a);
  for (let i = fr.length - 1; i >= 0; i--) pts.push([fr[i].p[0] + a * fr[i].n[0], fr[i].p[1] + a * fr[i].n[1]]);
  return 'M' + pts.map(p => `${f(p[0])} ${f(p[1])}`).join('L') + 'Z';
}
function ribbon(chain, width, colours, ends = ['round', 'round']) {
  const fr = frames(sample(chain)), R = width / 2, n = colours.length;
  return colours.map((c, i) => `<path d="${band(fr, -R + 2 * R * i / n - (i ? .25 : 0), -R + 2 * R * (i + 1) / n, R, ends[0], ends[1])}" fill="${c}"/>`).join('');
}
const transform = (chain, s, dx, dy) => chain.map(([x, y]) => [x * s + dx, y * s + dy]);
// A lowercase s centre line, drawn in a 50 x 63 box.
const S_CHAIN = [[42, 14], [38, 6], [12, 4.5], [11, 17], [10, 29], [40, 29.5], [40, 44], [40, 58.5], [12, 59.5], [8, 49]], S_W = 16.5;
const ribbonS = k => transform(S_CHAIN, k, 32 - 25 * k, 32 - 31.75 * k);
const THREE = [C.lake, C.butter, C.tomato];
save('exploration/round-2/d-swirl-s-on-paper.svg', svg(64, 64, `<rect width="64" height="64" rx="14" fill="${C.paper}"/>${ribbon(ribbonS(.86), S_W * .86 * 1.05, THREE)}`));
save('exploration/round-2/e-swirl-s-on-ink.svg', svg(64, 64, `<rect width="64" height="64" rx="14" fill="${C.ink}"/>${ribbon(ribbonS(.86), S_W * .86 * 1.05, THREE)}`));
save('exploration/round-2/f-swirl-s-no-tile.svg', svg(64, 64, ribbon(ribbonS(.95), S_W * .95 * 1.05, THREE)));
{
  const ch = transform(ribbonS(.84), 1, 1.5, -1), w = S_W * .84 * 1.05, end = ch[ch.length - 1], prev = ch[ch.length - 2];
  const ang = Math.atan2(end[1] - prev[1], end[0] - prev[0]) * 180 / Math.PI;
  save('exploration/round-2/g-pulled-s.svg', svg(64, 64, `<rect width="64" height="64" rx="14" fill="${C.ink}"/>${ribbon(ch, w, THREE, ['round', 'flat'])}<rect x="${f(end[0] - 5.2)}" y="${f(end[1] - w * .66)}" width="5.2" height="${f(w * 1.32)}" rx="1.8" fill="${C.paper}" transform="rotate(${f(ang)} ${f(end[0])} ${f(end[1])})"/>`));
}
save('exploration/round-2/h-combed-s.svg', svg(64, 64, `<rect width="64" height="64" rx="14" fill="${C.ink}"/>${ribbon(ribbonS(.86), S_W * .86 * 1.15, [C.lake, C.paper, C.butter, C.paper, C.tomato])}`));
save('exploration/round-2/i-s-dot-in-ink.svg', svg(64, 64, `<rect width="64" height="64" rx="14" fill="${C.paper}"/>${ribbon(transform(S_CHAIN, .78, 9, 7.5), S_W * .78 * 1.05, [C.ink])}<circle cx="51.5" cy="51" r="5.2" fill="${C.coral}"/>`));
{
  const rest = word('crape', SIZE, word('s', SIZE, PAD, BASE).end, BASE), d = word('.', SIZE, rest.end, BASE);
  const s = ribbon(transform(S_CHAIN, .95, PAD + 3.35, BASE - 61), S_W * 1.24, THREE);
  save('exploration/round-2/5-swirl-s-leads.svg', svg(WW, WH, s + fillGlyphs(rest, C.ink) + fillGlyphs(d, C.coral)));
  save('exploration/round-2/6-swirl-s-reversed.svg', svg(WW, WH, `<rect width="${WW}" height="${WH}" fill="${C.ink}"/>` + s + fillGlyphs(rest, C.paper) + fillGlyphs(d, C.butter)));
}
{
  const top = BASE - 64, third = 64 / 3;
  const bands = `<rect x="0" y="${top - 4}" width="${WW}" height="${f(third + 4.2)}" fill="${C.butter}"/><rect x="0" y="${f(top + third)}" width="${WW}" height="${f(third + .2)}" fill="${C.tomato}"/><rect x="0" y="${f(top + 2 * third)}" width="${WW}" height="${f(third + 26)}" fill="${C.lake}"/>`;
  save('exploration/round-2/7-one-pull-through-the-word.svg', svg(WW, WH, `<defs>${clipWord('word', SCRAPE)}</defs><g clip-path="url(#word)">${bands}</g>` + fillGlyphs(DOT, C.ink)));
}
{
  const streak = `<g transform="rotate(-24 ${WW / 2} ${BASE - 31})"><rect x="-40" y="${BASE - 52}" width="${WW + 80}" height="13" fill="${C.butter}"/><rect x="-40" y="${BASE - 39.2}" width="${WW + 80}" height="13" fill="${C.tomato}"/><rect x="-40" y="${BASE - 26.4}" width="${WW + 80}" height="13" fill="${C.lake}"/></g>`;
  save('exploration/round-2/8-a-slanted-streak.svg', svg(WW, WH, `<defs>${clipWord('word', SCRAPE)}</defs>${fillGlyphs(SCRAPE, C.ink)}<g clip-path="url(#word)">${streak}</g>` + fillGlyphs(DOT, C.coral)));
}
{
  const pts = []; for (let x = -10; x <= WW + 10; x += 2) pts.push([x, BASE - 31 + 7 * Math.sin(x / WW * Math.PI * 3)]);
  const wave = (off, h) => 'M' + pts.map(([x, y]) => `${x} ${f(y + off)}`).join('L') + 'L' + pts.slice().reverse().map(([x, y]) => `${x} ${f(y + off + h)}`).join('L') + 'Z';
  save('exploration/round-2/9-a-wavy-ribbon.svg', svg(WW, WH, `<defs>${clipWord('word', SCRAPE)}</defs>${fillGlyphs(SCRAPE, C.ink)}<g clip-path="url(#word)"><path d="${wave(-17, 11.6)}" fill="${C.butter}"/><path d="${wave(-5.6, 11.4)}" fill="${C.tomato}"/><path d="${wave(5.6, 11.6)}" fill="${C.lake}"/></g>` + fillGlyphs(DOT, C.coral)));
}
{
  const cols = [C.lake, C.butter, C.tomato, C.rose, C.moss, C.lake];
  const ridges = []; for (let x = 0; x < WW; x += 6) ridges.push(`<rect x="${x + 3.6}" y="0" width="1.6" height="${WH}" fill="#fffdf8" opacity=".38"/>`);
  save('exploration/round-2/10-combed-letters.svg', svg(WW, WH, `<defs>${clipWord('word', SCRAPE)}</defs>${SCRAPE.glyphs.map((g, i) => `<path d="${g.d}" fill="${cols[i]}"/>`).join('')}<g clip-path="url(#word)">${ridges.join('')}</g>` + fillGlyphs(DOT, C.ink)));
}
{
  const cols = [C.butter, C.tomato, C.lake, C.rose, C.butter, C.tomato];
  const clips = SCRAPE.glyphs.map((g, i) => `<clipPath id="letter${i}"><path d="${g.d}"/></clipPath>`).join('');
  const fills = SCRAPE.glyphs.map((g, i) => `<path d="${g.d}" fill="${C.ink}"/><g clip-path="url(#letter${i})"><rect x="${f(g.x - 4)}" y="${BASE - 22}" width="80" height="60" fill="${cols[i]}"/><rect x="${f(g.x - 4)}" y="${BASE - 23.2}" width="80" height="2.4" fill="${C.paper}"/></g>`).join('');
  save('exploration/round-2/11-each-letter-dipped.svg', svg(WW, WH, `<defs>${clips}</defs>${fills}` + fillGlyphs(DOT, C.coral)));
}

// ---------------------------------------------------------------------------
// Round 3 and the final logo: DynaPuff's own s, painted along its stroke
// ---------------------------------------------------------------------------
const S_GLYPH = dyna.charToGlyph('s').getPath(0, 0, SIZE), S_D = S_GLYPH.toPathData(2);
// The s's two terminal tips, at size 100 with its baseline at 0.
const S_TIPS = [[51.5, -49], [2, -12]];
const bandCache = new Map();
// The painted s at the origin (baseline 0, size 100). Colours run from the
// inside of the top curve outward, so tomato sits outermost at the top.
function paintedS(colours, id) {
  const key = colours.length;
  if (!bandCache.has(key)) bandCache.set(key, strokeBands(S_GLYPH.commands, S_TIPS, colours.slice(1).map((_, i) => (i + 1) / colours.length)).regions);
  return `<defs><clipPath id="${id}"><path d="${S_D}"/></clipPath></defs><g clip-path="url(#${id})"><path d="${S_D}" fill="${colours[0]}"/>${bandCache.get(key).map((d, i) => `<path d="${d}" fill="${colours[i + 1]}"/>`).join('')}</g>`;
}
// Inside a 64 square: the s's box is x 2..52, y -62.6..0.4.
const sIn64 = (k, colours, id) => `<g transform="translate(${f(32 - 27 * k)} ${f(32 + 31.1 * k)}) scale(${k})">${paintedS(colours, id)}</g>`;
const tile64 = (fill, colours, k = .74) => svg(64, 64, `<rect width="64" height="64" rx="14" fill="${fill}"/>${sIn64(k, colours, 's')}`);
save('exploration/round-3/j-on-ink.svg', tile64(C.ink, THREE));
save('exploration/round-3/k-on-paper.svg', tile64(C.paper, THREE));
save('exploration/round-3/l-on-butter.svg', tile64(C.butter, [C.lake, C.paper, C.tomato]));
save('exploration/round-3/m-no-tile.svg', svg(64, 64, sIn64(.98, THREE, 's')));
save('exploration/round-3/n-combed.svg', tile64(C.ink, [C.lake, C.ink, C.butter, C.ink, C.tomato]));
save('exploration/round-3/o-s-dot.svg', svg(64, 64, `<rect width="64" height="64" rx="14" fill="${C.ink}"/><g transform="translate(9 51.5) scale(.66)">${paintedS(THREE, 's')}<path d="${dyna.charToGlyph('.').getPath(52, 0, SIZE).toPathData(2)}" fill="${C.butter}"/></g>`));
const REST = word('crape', SIZE, word('s', SIZE, PAD, BASE).end, BASE);
const paintedWord = (letters, dot, ground) => (ground ? `<rect width="${WW}" height="${WH}" fill="${ground}"/>` : '') + `<g transform="translate(${PAD} ${BASE})">${paintedS(THREE, 's')}</g>` + fillGlyphs(REST, letters) + fillGlyphs(DOT, dot);
save('exploration/round-3/12-wordmark.svg', svg(WW, WH, paintedWord(C.ink, C.coral)));
save('exploration/round-3/13-reversed.svg', svg(WW, WH, paintedWord(C.paper, C.butter, C.ink)));

// The final logo, cropped tight to the letters (1 unit of air all round).
{
  const all = dyna.getPath('scrape.', PAD, BASE, SIZE).getBoundingBox();
  const x = all.x1 - 1, y = all.y1 - 1, w = all.x2 - all.x1 + 2, h = all.y2 - all.y1 + 2;
  save('logo/wordmark.svg', svg(w, h, paintedWord(C.ink, C.coral), x, y));
  save('logo/wordmark-on-dark.svg', svg(w, h, paintedWord(C.paper, C.butter), x, y));
  save('logo/wordmark-one-colour.svg', svg(w, h, fillGlyphs(word('scrape.', SIZE, PAD, BASE), C.ink), x, y));
}
save('logo/logomark.svg', svg(64, 64, sIn64(.98, THREE, 's')));
save('logo/logomark-one-colour.svg', svg(64, 64, `<g transform="translate(${f(32 - 27 * .98)} ${f(32 + 31.1 * .98)}) scale(.98)"><path d="${S_D}" fill="${C.ink}"/></g>`));
// Home-screen icon: full bleed, since the system rounds the corners itself.
save('logo/app-icon.svg', svg(180, 180, `<rect width="180" height="180" fill="${C.paper}"/><g transform="translate(${f(90 - 27 * 1.85)} ${f(90 + 31.1 * 1.85)}) scale(1.85)">${paintedS(THREE, 's')}</g>`));
save('favicon.svg', written['logo/logomark.svg'], PUBLIC);

// ---------------------------------------------------------------------------
// The master: every round, in order, ready to open in Figma
// ---------------------------------------------------------------------------
let uid = 0;
// Places a saved SVG at (x, y), `w` wide, as a named group. Ids are prefixed
// so the clip paths of different pieces never collide.
function place(rel, x, y, w, name) {
  const src = written[rel], [, vx, vy, vw, vh] = src.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/).map(Number);
  const k = w / vw, p = `p${uid++}-`;
  const inner = src.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/id="([^"]+)"/g, `id="${p}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`);
  return { svg: `<g id="${name}" transform="translate(${f(x)} ${f(y)}) scale(${f(k)}) translate(${f(-vx)} ${f(-vy)})">${inner}</g>`, h: vh * k };
}
const MW = 2400, M = 120;
const parts = [`<rect id="background" width="${MW}" height="__H__" fill="${C.desk}"/>`];
let y = 110;
{
  const head = place('logo/wordmark.svg', M, y, 520, 'final-wordmark');
  parts.push(head.svg);
  y += head.h + 56;
  parts.push(`<g id="title">${text(nunito, 'LOGO PROGRESSION', 24, M, y, C.coral)}${text(nunito, 'From three first directions to DynaPuff’s own s, painted.', 30, M, y + 46, C.ink)}</g>`);
  y += 140;
}
function section(id, title, caption, marks, words) {
  const out = [`<g id="${id}">`];
  out.push(text(dyna, title, 46, M, y, C.ink), text(nunito, caption, 24, M, y + 44, C.muted));
  y += 100;
  if (marks.length) {
    const size = 170, gap = 100;
    let rowH = 0;
    marks.forEach(([rel, label], i) => {
      const x = M + i * (size + gap), m = place(rel, x, y, size, label.replace(/[^a-z0-9]+/gi, '-').toLowerCase());
      out.push(m.svg, text(nunito, label, 20, x, y + size + 38, C.ink));
      rowH = Math.max(rowH, m.h);
    });
    y += rowH + 100;
  }
  const ww = 640, gap = 100;
  for (let i = 0; i < words.length; i += 3) {
    let rowH = 0;
    words.slice(i, i + 3).forEach(([rel, label], j) => {
      const x = M + j * (ww + gap), w = place(rel, x, y, ww, label.replace(/[^a-z0-9]+/gi, '-').toLowerCase());
      out.push(w.svg);
      out.push(text(nunito, label, 20, x, y + w.h + 40, C.ink));
      rowH = Math.max(rowH, w.h);
    });
    y += rowH + 110;
  }
  out.push('</g>');
  parts.push(out.join(''));
  y += 70;
}
section('round-1', 'Round 1 — three directions', 'A pull of paint, a swirl, the scraper card; the wordmark plainly set in DynaPuff.',
  [['exploration/round-1/a-the-pull.svg', 'A · The pull'], ['exploration/round-1/b-the-swirl.svg', 'B · The swirl'], ['exploration/round-1/c-the-card.svg', 'C · The card']],
  [['exploration/round-1/1-plain.svg', '1 · Plain'], ['exploration/round-1/2-with-a-pull.svg', '2 · With a pull'], ['exploration/round-1/3-lockup.svg', '3 · Lockup with the pull mark'], ['exploration/round-1/4-reversed.svg', '4 · Reversed']]);
section('round-2', 'Round 2 — the swirl becomes the s', 'A geometric ribbon s, and paint pulled through the letters in different ways.',
  [['exploration/round-2/d-swirl-s-on-paper.svg', 'D · On paper'], ['exploration/round-2/e-swirl-s-on-ink.svg', 'E · On ink'], ['exploration/round-2/f-swirl-s-no-tile.svg', 'F · No tile'], ['exploration/round-2/g-pulled-s.svg', 'G · Pulled s'], ['exploration/round-2/h-combed-s.svg', 'H · Combed s'], ['exploration/round-2/i-s-dot-in-ink.svg', 'I · s. in ink']],
  [['exploration/round-2/5-swirl-s-leads.svg', '5 · Swirl s leads'], ['exploration/round-2/6-swirl-s-reversed.svg', '6 · Swirl s, reversed'], ['exploration/round-2/7-one-pull-through-the-word.svg', '7 · One pull through the word'], ['exploration/round-2/8-a-slanted-streak.svg', '8 · A slanted streak'], ['exploration/round-2/9-a-wavy-ribbon.svg', '9 · A wavy ribbon'], ['exploration/round-2/10-combed-letters.svg', '10 · Combed letters'], ['exploration/round-2/11-each-letter-dipped.svg', '11 · Each letter dipped']]);
section('round-3', 'Round 3 — DynaPuff’s own s, painted', 'The font’s s, its stroke split into three bands that run into its round ends.',
  [['exploration/round-3/j-on-ink.svg', 'J · On ink'], ['exploration/round-3/k-on-paper.svg', 'K · On paper'], ['exploration/round-3/l-on-butter.svg', 'L · On butter'], ['exploration/round-3/m-no-tile.svg', 'M · No tile'], ['exploration/round-3/n-combed.svg', 'N · Combed'], ['exploration/round-3/o-s-dot.svg', 'O · s. with the dot']],
  [['exploration/round-3/12-wordmark.svg', '12 · Wordmark'], ['exploration/round-3/13-reversed.svg', '13 · Reversed']]);
{
  // The chosen pair, with the mark at favicon sizes and the home-screen icon.
  const out = ['<g id="final">'];
  out.push(text(dyna, 'Final', 46, M, y, C.ink), text(nunito, 'Wordmark 12 and mark M: the logo, its one-colour and dark versions, and the favicon.', 24, M, y + 44, C.muted));
  y += 100;
  const wm = place('logo/wordmark.svg', M, y, 900, 'wordmark');
  out.push(wm.svg, text(nunito, 'Wordmark', 20, M, y + wm.h + 40, C.ink));
  const icon = place('logo/app-icon.svg', M + 1040, y, 190, 'app-icon');
    // Shown with the corners a phone would round off.
  out.push(`<clipPath id="icon-round"><rect x="${M + 1040}" y="${y}" width="190" height="190" rx="42"/></clipPath><g clip-path="url(#icon-round)">${icon.svg}</g>`, text(nunito, 'Home-screen icon', 20, M + 1040, y + 230, C.ink));
  const mark = place('logo/logomark.svg', M + 1370, y, 190, 'logomark');
  out.push(mark.svg, text(nunito, 'Logomark', 20, M + 1370, y + 230, C.ink));
  y += Math.max(wm.h, 190) + 110;
  const dark = 360;
  out.push(`<rect x="${M}" y="${y}" width="1000" height="${dark}" rx="24" fill="${C.ink}"/>`);
  const onDark = place('logo/wordmark-on-dark.svg', M + 60, y + 60, 640, 'wordmark-on-dark');
  out.push(onDark.svg);
  [64, 32, 16].reduce((x, s) => { out.push(place('logo/logomark.svg', x, y + dark - 60 - s, s, `favicon-${s}-dark`).svg); return x + s + 40; }, M + 60);
  out.push(text(nunito, 'On dark, and the mark at 64, 32 and 16', 20, M, y + dark + 40, C.ink));
  const light = `<rect x="${M + 1080}" y="${y}" width="1000" height="${dark}" rx="24" fill="${C.paper}"/>`;
  out.push(light, place('logo/wordmark-one-colour.svg', M + 1140, y + 60, 640, 'wordmark-one-colour').svg);
  [64, 32, 16].reduce((x, s) => { out.push(place('logo/logomark.svg', x, y + dark - 60 - s, s, `favicon-${s}-light`).svg); return x + s + 40; }, M + 1140);
  out.push(text(nunito, 'One colour, and the mark on paper', 20, M + 1080, y + dark + 40, C.ink));
  y += dark + 120;
  out.push('</g>');
  parts.push(out.join(''));
}
const MH = Math.ceil(y + 40);
save('scrape-logo-master.svg', svg(MW, MH, parts.join('').replace('__H__', MH)));

for (const rel of Object.keys(written)) console.log(rel);
