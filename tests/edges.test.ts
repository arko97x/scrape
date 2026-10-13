import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaintEngine } from '../src/engine.ts';

test('small lateral pointer movements shift the ribbon instead of snapping to one cell', () => {
  const centroid = (cx: number) => {
    const engine = new PaintEngine(480, 600);
    engine.deposit({ x: 240, y: 140 }, [.77, .36, .26], 13, 330);
    engine.beginScrape({ x: cx, y: 110 }); engine.scrape({ x: cx, y: 400 }); engine.endScrape();
    let mass = 0, moment = 0;
    for (let x = 200; x < 280; x++) {
      const h = engine.pixels[(250 * 480 + x) * 4 + 3]; mass += h; moment += x * h;
    }
    assert.ok(Math.abs(engine.totalMass() - 330) < .01);
    return moment / mass;
  };
  const shift = centroid(240.2) - centroid(240.1);
  assert.ok(shift > .08 && shift < .12, `A 0.1-cell motion shifted paint by ${shift}.`);
});

test('fractional forward samples do not repeatedly pick up fresh film and expand the ribbon', () => {
  const engine = new PaintEngine(480, 600);
  engine.deposit({ x: 240, y: 140 }, [.77, .36, .26], 13, 330);
  engine.beginScrape({ x: 240, y: 110 });
  for (let i = 1; i <= 550; i++) engine.scrape({ x: 240, y: 110 + i * .7 });
  engine.endScrape();
  for (let y = 180; y <= 450; y++) {
    let width = 0;
    for (let x = 180; x < 300; x++) if (engine.pixels[(y * 480 + x) * 4 + 3] > .004) width++;
    assert.ok(width >= 24 && width <= 40, `Ribbon width ${width} at row ${y}.`);
  }
  assert.ok(Math.abs(engine.totalMass() - 330) < .01);
});
