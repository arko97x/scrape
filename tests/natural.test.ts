import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaintEngine } from '../src/engine.ts';

const make = (x: number) => {
  const engine = new PaintEngine(480, 600);
  engine.deposit({ x, y: 140 }, [.05,.45,.45], 13, 330);
  engine.beginScrape({ x, y: 110 }); engine.scrape({ x, y: 500 }); engine.endScrape();
  return engine;
};

test('paper and blade contact leave local thickness changes along a ribbon', () => {
  const engine = make(240);
  let rises = 0, falls = 0;
  for (let y = 180; y < 430; y++) {
    const change = engine.pixels[((y + 1) * 480 + 240) * 4 + 3] - engine.pixels[(y * 480 + 240) * 4 + 3];
    if (change > .00001) rises++; if (change < -.00001) falls++;
  }
  assert.ok(rises > 20 && falls > 20, `Expected local changes; got ${rises} rises and ${falls} falls.`);
  assert.ok(Math.abs(engine.totalMass() - 330) < .01);
});

test('equal dollops at different places have different material traces', () => {
  const a = make(180), b = make(300);
  const baseA = a.pixels[(180 * 480 + 180) * 4 + 3], baseB = b.pixels[(180 * 480 + 300) * 4 + 3];
  let difference = 0;
  for (let y = 180; y < 430; y++) difference += Math.abs(a.pixels[(y * 480 + 180) * 4 + 3] / baseA - b.pixels[(y * 480 + 300) * 4 + 3] / baseB);
  assert.ok(difference / 250 > .05, 'Distinct locations should not leave duplicate normalised traces.');
});

test('the same paper and gesture replay exactly, including their imperfections', () => {
  const a = make(240), b = make(240);
  assert.deepEqual(a.snapshot(), b.snapshot());
});

test('wet shoulders vary along the pull without breaking the ribbon', () => {
  const engine = make(240);
  const left: number[] = [], right: number[] = [];
  for (let y = 180; y < 430; y++) {
    const wet: number[] = [];
    for (let x = 200; x < 280; x++) if (engine.pixels[(y * 480 + x) * 4 + 3] > .004) wet.push(x);
    assert.ok(wet.length >= 24, `Ribbon broke or narrowed at row ${y}.`);
    assert.equal(wet.length, wet[wet.length - 1] - wet[0] + 1, `Hole at row ${y}.`);
    const height = (x: number) => engine.pixels[(y * 480 + x) * 4 + 3];
    const a = wet[0], b = wet[wet.length - 1];
    // Measure the actual subpixel boundary, not its rounded cell index. Smooth
    // shoulders can wander more than a cell without crossing two whole cells.
    left.push(a - 1 + (.004 - height(a - 1)) / (height(a) - height(a - 1)));
    right.push(b + (height(b) - .004) / (height(b) - height(b + 1)));
  }
  assert.ok(Math.max(...left) - Math.min(...left) >= 1, 'Left shoulder remains ruler-straight.');
  assert.ok(Math.max(...right) - Math.min(...right) >= 1, 'Right shoulder remains ruler-straight.');
});
