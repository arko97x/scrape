import { test } from 'node:test';
import assert from 'node:assert/strict';
import mixbox from 'mixbox';
import { PaintEngine, type Colour } from '../src/engine.ts';

const pigmentBlend = (a: Colour, b: Colour, t: number) => mixbox.lerp(a.map(v => v * 255), b.map(v => v * 255), t).map(v => v / 255) as Colour;
const widthAt = (engine: PaintEngine, y: number, centre: number, yellowOnly = false) => {
  let width = 0;
  for (let x = centre - 12; x <= centre + 12; x++) {
    const at = (y * engine.width + x) * 4;
    if (engine.pixels[at + 3] > .004 && (!yellowOnly || (engine.pixels[at] > .7 && engine.pixels[at + 1] > .7 && engine.pixels[at + 2] < .4))) width++;
  }
  return width;
};

test('a small dot retains at least 80% of its ribbon width across a 300-pixel pull', () => {
  const engine = new PaintEngine(480, 600, pigmentBlend);
  engine.setBlade(240, 0); engine.deposit({ x: 240, y: 140 }, [.99, .85, .13], 6, 70);
  engine.beginScrape({ x: 240, y: 115 }); engine.scrape({ x: 240, y: 505 }); engine.endScrape();
  const early = widthAt(engine, 180, 240), late = widthAt(engine, 480, 240);
  assert.ok(early >= 10);
  assert.ok(late >= early * .8, `Small ribbon narrowed from ${early} to ${late} pixels.`);
  assert.ok(Math.abs(engine.totalMass() - 70) < .002);
});

test('all three small yellow separators keep their width in the exact seven-dollop reference', () => {
  const engine = new PaintEngine(480, 600, pigmentBlend); engine.setBlade(240, 0);
  const palette: Colour[] = [[.03,.40,.42],[.99,.85,.13],[.97,.29,.06],[.99,.85,.13],[.73,.02,.27],[.99,.85,.13],[.47,.77,.37]];
  palette.forEach((colour, i) => engine.deposit({ x: 150 + i * 30, y: 140 }, colour, i % 2 ? 6 : 13, i % 2 ? 70 : 330));
  engine.beginScrape({ x: 240, y: 115 }); engine.scrape({ x: 240, y: 505 }); engine.endScrape();
  for (const centre of [180, 240, 300]) {
    const early = widthAt(engine, 180, centre, true), late = widthAt(engine, 480, centre, true);
    assert.ok(early >= 10);
    assert.ok(late >= early * .8, `Yellow at ${centre} narrowed from ${early} to ${late} pixels.`);
  }
  assert.ok(Math.abs(engine.totalMass() - 1530) < .02);
});

test('a finite small ribbon runs out by thinning across its width, not creating extra paint', () => {
  const engine = new PaintEngine(480, 600);
  engine.deposit({ x: 240, y: 80 }, [.9, .1, .1], 4, 12);
  engine.beginScrape({ x: 240, y: 60 }); engine.scrape({ x: 240, y: 570 }); engine.endScrape();
  let late = 0;
  for (let x = 210; x <= 270; x++) late += engine.pixels[(550 * 480 + x) * 4 + 3];
  assert.ok(late < .001, 'A small amount must eventually become an invisible thin film.');
  assert.ok(Math.abs(engine.totalMass() - 12) < .002);
});

test('paintings saved before wet-footprint metadata can still restore and scrape', () => {
  const engine = new PaintEngine(140, 180);
  engine.deposit({ x: 70, y: 40 }, [.9, .1, .1], 8, 100);
  engine.beginScrape({ x: 70, y: 20 }); engine.scrape({ x: 70, y: 75 }); engine.endScrape();
  const { wetSource: _wetSource, ...legacy } = engine.snapshot();
  const restored = new PaintEngine(140, 180); restored.restore(legacy);
  restored.beginScrape({ x: 70, y: 80 }); restored.scrape({ x: 70, y: 150 }); restored.endScrape();
  assert.ok(Math.abs(restored.totalMass() - 100) < .002);
  assert.ok(restored.pixels.every(Number.isFinite));
});
