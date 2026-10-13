import { test } from 'node:test';
import assert from 'node:assert/strict';
import mixbox from 'mixbox';
import { PaintEngine, type Colour } from '../src/engine.ts';
const blend = (a: Colour, b: Colour, t: number) => mixbox.lerp(a.map(v => v * 255), b.map(v => v * 255), t).map(v => v / 255) as Colour;

test('the real Mixbox adapter mixes yellow and blue into green', () => {
  const result = blend([.996, .925, 0], [0, .129, .522], .5);
  assert.ok(result[1] > result[0] && result[1] > result[2], `Expected green; received ${result}`);
  assert.ok(result.every(v => v >= 0 && v <= 1));
});

test('real pigment mixing stays finite and conservative under repeated cross scrapes', () => {
  const engine = new PaintEngine(480, 600, blend);
  engine.deposit({ x: 220, y: 150 }, [.9, .72, .3], 20, 400);
  engine.deposit({ x: 240, y: 150 }, [.2, .3, .5], 20, 400);
  engine.beginScrape({ x: 230, y: 120 }); engine.scrape({ x: 230, y: 350 }); engine.endScrape();
  engine.setBlade(100, 90);
  engine.beginScrape({ x: 180, y: 250 }); engine.scrape({ x: 350, y: 250 }); engine.endScrape();
  assert.ok(Math.abs(engine.totalMass() - 800) < .01);
  assert.ok(engine.pixels.every(Number.isFinite));
  for (let i = 0; i < engine.pixels.length; i += 4) {
    assert.ok(engine.pixels[i] >= 0 && engine.pixels[i] <= 1);
    assert.ok(engine.pixels[i + 1] >= 0 && engine.pixels[i + 1] <= 1);
    assert.ok(engine.pixels[i + 2] >= 0 && engine.pixels[i + 2] <= 1);
  }
});
