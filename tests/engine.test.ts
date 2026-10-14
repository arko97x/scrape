import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaintEngine, PaintHistory } from '../src/engine.ts';
import { VISIBLE_FILM_HEIGHT } from '../src/material.ts';
import { combGaps } from '../src/squeegee-geometry.ts';

const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < Math.max(.001, expected * .00001), `${actual} ≈ ${expected}`);
const red: [number, number, number] = [.9, .1, .1];
const blue: [number, number, number] = [.1, .2, .9];

test('a deposit conserves its requested volume; borders remain bare', () => {
  const engine = new PaintEngine(140, 180);
  engine.deposit({ x: 70, y: 50 }, red, 9, 120);
  near(engine.totalMass(), 120);
  engine.deposit({ x: engine.margin + 1, y: 50 }, blue, 12, 80);
  near(engine.totalMass(), 200);
  engine.deposit({ x: 0, y: 50 }, red, 10, 80);
  near(engine.totalMass(), 200);
  for (let y = 0; y < engine.height; y++) for (let x = 0; x < engine.width; x++) {
    if (!engine.inside(x, y)) assert.equal(engine.pixels[(y * engine.width + x) * 4 + 3], 0);
  }
});

test('a scraper transports finite paint, preserves lane colours and conserves volume', () => {
  const engine = new PaintEngine(140, 180); engine.setBlade(65, 0);
  engine.deposit({ x: 52, y: 45 }, red, 7, 150); engine.deposit({ x: 86, y: 45 }, blue, 7, 150);
  engine.beginScrape({ x: 70, y: 28 }); engine.scrape({ x: 70, y: 145 }); engine.endScrape();
  near(engine.totalMass(), 300);
  const a = (85 * 140 + 52) * 4, b = (85 * 140 + 86) * 4;
  assert.ok(engine.pixels[a + 3] > 0); assert.ok(engine.pixels[b + 3] > 0);
  assert.ok(engine.pixels[a] > engine.pixels[a + 2]); assert.ok(engine.pixels[b + 2] > engine.pixels[b]);
  for (let i = 3; i < engine.pixels.length; i += 4) assert.ok(engine.pixels[i] >= 0 && Number.isFinite(engine.pixels[i]));
});

test('scraping does not manufacture paint on an empty sheet', () => {
  const engine = new PaintEngine(140, 180);
  engine.beginScrape({ x: 70, y: 20 }); engine.scrape({ x: 70, y: 170 }); engine.endScrape();
  assert.equal(engine.totalMass(), 0);
});

test('a tap-sized dollop travels at least a third of the paper without extra paint', () => {
  const engine = new PaintEngine(480, 600);
  // Same volume and radius as the initial deposit made by a quick pointer tap.
  engine.deposit({ x: 240, y: 80 }, red, 6.4, 30);
  engine.beginScrape({ x: 240, y: 60 });
  engine.scrape({ x: 240, y: 540 }); engine.endScrape();
  let visibleWidth = 0;
  for (let x = 220; x <= 260; x++) if (engine.pixels[(280 * 480 + x) * 4 + 3] > VISIBLE_FILM_HEIGHT) visibleWidth++;
  assert.ok(visibleWidth >= 10, 'A small dollop should leave a visible ribbon, rather than one thick centreline, 200 pixels down the paper.');
  near(engine.totalMass(), 30);
});

test('the scraper leaves a thin film and eases into a translucent tail', () => {
  const engine = new PaintEngine(480, 600);
  engine.deposit({ x: 240, y: 80 }, red, 6.4, 30);
  engine.beginScrape({ x: 240, y: 60 });
  engine.scrape({ x: 240, y: 540 }); engine.endScrape();
  const thicknessAt = (y: number) => engine.pixels[(y * 480 + 240) * 4 + 3];
  assert.ok(thicknessAt(110) > .005 && thicknessAt(110) < .03);
  assert.ok(thicknessAt(440) > 0 && thicknessAt(440) < VISIBLE_FILM_HEIGHT * .5, 'The depleted end should be a translucent film.');
  near(engine.totalMass(), 30);
});

test('compression widens a dollop beyond its original footprint, with thicker free edges', () => {
  const engine = new PaintEngine(480, 600);
  engine.deposit({ x: 240, y: 80 }, red, 14, 300);
  const start = engine.snapshot();
  const widthAt = (pixels: Float32Array, y: number) => {
    let width = 0;
    for (let x = 180; x < 300; x++) if (pixels[(y * 480 + x) * 4 + 3] > .004) width++;
    return width;
  };
  engine.beginScrape({ x: 240, y: 50 }); engine.scrape({ x: 240, y: 300 }); engine.endScrape();
  const originalWidth = widthAt(start.pixels, 80);
  assert.ok(widthAt(engine.pixels, 100) >= originalWidth * 1.15, 'The flattened band should widen at least 15%.');
  let shoulder = 0;
  for (let x = 220; x < 260; x++) if (Math.abs(x - 240) >= 8) shoulder = Math.max(shoulder, engine.pixels[(180 * 480 + x) * 4 + 3]);
  const middle = engine.pixels[(180 * 480 + 240) * 4 + 3];
  assert.ok(shoulder > middle * 1.4, 'Displaced paint should leave a raised shoulder, not a flat colour outline.');
  near(engine.totalMass(), 300);
});

test('larger dollops widen more; deposited paint remains still between gestures', () => {
  const widths = [30, 300].map(amount => {
    const engine = new PaintEngine(480, 600);
    engine.deposit({ x: 240, y: 80 }, red, 6.4, amount);
    engine.beginScrape({ x: 240, y: 50 }); engine.scrape({ x: 240, y: 160 }); engine.endScrape();
    let width = 0;
    for (let x = 200; x < 280; x++) if (engine.pixels[(90 * 480 + x) * 4 + 3] > .004) width++;
    near(engine.totalMass(), amount);
    const snapshot = engine.snapshot(); engine.scrape({ x: 240, y: 160 });
    assert.deepEqual(engine.pixels, snapshot.pixels);
    return width;
  });
  assert.ok(widths[1] > widths[0], 'A larger mound should displace more paint sideways.');
});

test('the blade flattens the original mound instead of leaving a raised round blob', () => {
  const engine = new PaintEngine(480, 600);
  engine.deposit({ x: 240, y: 80 }, red, 14, 300);
  engine.beginScrape({ x: 240, y: 50 }); engine.scrape({ x: 240, y: 160 }); engine.endScrape();
  const start = engine.pixels[(80 * 480 + 240) * 4 + 3];
  const ribbon = engine.pixels[(110 * 480 + 240) * 4 + 3];
  assert.ok(start < ribbon * 2, 'The flattened starting cap should have similar thickness to the ribbon.');
  near(engine.totalMass(), 300);
});

test('sideways transport respects tape margins under a rotated blade', () => {
  const engine = new PaintEngine(140, 180); engine.setBlade(90, 90);
  engine.deposit({ x: 30, y: engine.margin + 6 }, blue, 10, 120);
  engine.beginScrape({ x: 15, y: 35 }); engine.scrape({ x: 120, y: 35 }); engine.endScrape();
  near(engine.totalMass(), 120);
  for (let y = 0; y < engine.height; y++) for (let x = 0; x < engine.width; x++) {
    if (!engine.inside(x, y)) assert.equal(engine.pixels[(y * engine.width + x) * 4 + 3], 0);
  }
});

test('one large drag and finely sampled drags produce the same vertical pass', () => {
  const a = new PaintEngine(140, 180), b = new PaintEngine(140, 180);
  for (const engine of [a, b]) { engine.deposit({ x: 70, y: 40 }, red, 9, 220); engine.beginScrape({ x: 70, y: 20 }); }
  a.scrape({ x: 70, y: 150 });
  for (let y = 21; y <= 150; y++) b.scrape({ x: 70, y });
  assert.deepEqual(a.pixels, b.pixels); assert.deepEqual(a.carry, b.carry);
});

test('diagonal, reversed and rotated passes conserve volume, including off-paper travel', () => {
  const engine = new PaintEngine(140, 180); engine.setBlade(65, 32);
  engine.deposit({ x: 70, y: 70 }, blue, 15, 450);
  engine.beginScrape({ x: 40, y: 20 });
  for (const point of [{ x: 90, y: 130 }, { x: 30, y: 50 }, { x: -30, y: 190 }, { x: 110, y: 90 }]) engine.scrape(point);
  engine.endScrape(); near(engine.totalMass(), 450);
  const mass = engine.totalMass(); engine.cleanBlade(); near(engine.totalMass(), mass); assert.equal(engine.carriedMass(), 0);
});

test('undo/redo restores both the sheet and loaded blade; a new gesture replaces redo', () => {
  const engine = new PaintEngine(140, 180), history = new PaintHistory(engine);
  history.checkpoint(); engine.deposit({ x: 70, y: 50 }, red, 9, 200);
  const before = engine.snapshot();
  history.checkpoint(); engine.beginScrape({ x: 70, y: 20 }); engine.scrape({ x: 70, y: 85 }); engine.endScrape();
  const after = engine.snapshot(); assert.ok(engine.carriedMass() > 0);
  history.undo(); assert.deepEqual(engine.snapshot(), before);
  history.redo(); assert.deepEqual(engine.snapshot(), after);
  history.undo(); history.checkpoint(); engine.deposit({ x: 30, y: 60 }, blue, 5, 30); assert.equal(history.canRedo, false);
});

test('beads remain continuous even when input events are far apart', () => {
  const engine = new PaintEngine(140, 180);
  engine.bead({ x: 30, y: 40 }, { x: 110, y: 40 }, red, 6, 240);
  near(engine.totalMass(), 240);
  for (let x = 35; x <= 109; x++) assert.ok(engine.pixels[(40 * 140 + x) * 4 + 3] > 0);
});

test('a comb extrudes ridges that keep going past the paint, with thin grooves between, and conserves volume', () => {
  const engine = new PaintEngine(140, 260); engine.setBlade(100, 0, 'comb');
  for (let y = 40; y < 90; y++) for (let x = 15; x < 125; x++) engine.pixels.set([...red, .25], (y * 140 + x) * 4);
  const before = engine.totalMass();
  engine.beginScrape({ x: 70, y: 30 }); engine.scrape({ x: 70, y: 240 }); engine.endScrape();
  near(engine.totalMass(), before);
  // Lane centres map to x = 70 + lane - 49.5; compare a middle notch with its neighbouring tooth.
  const [from, to] = combGaps[Math.floor(combGaps.length / 2)];
  const height = (fraction: number, y: number) => engine.pixels[(y * 140 + Math.round(70 + fraction * 100 - 50)) * 4 + 3];
  for (const y of [110, 150]) {
    const ridge = height((from + to) / 2, y), groove = height(from - .02, y);
    assert.ok(ridge > VISIBLE_FILM_HEIGHT * 4, `a ridge is still standing ${y - 90} pixels past the paint (${ridge})`);
    assert.ok(ridge > groove * 3, `the ridge stands above its groove (${ridge} vs ${groove})`);
  }
  assert.equal(engine.snapshot().blade, 'comb');
});
