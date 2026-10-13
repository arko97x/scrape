import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaintEngine } from '../src/engine.ts';
import { SqueezeStroke } from '../src/input.ts';

test('held squeezes dispense the same quantity at 30 and 120 frames per second', () => {
  const masses = [30, 120].map(fps => {
    const engine = new PaintEngine(140, 180);
    const squeeze = new SqueezeStroke(engine, { x: 70, y: 80 }, [1, .2, .1], 0);
    for (let frame = 1; frame <= fps; frame++) squeeze.advance(frame * 1000 / fps);
    return engine.totalMass();
  });
  assert.ok(Math.abs(masses[0] - masses[1]) < .002); assert.ok(Math.abs(masses[0] - 260) < .002);
});

test('queued movement preserves corners instead of cutting across a drawing', () => {
  const engine = new PaintEngine(140, 180);
  const squeeze = new SqueezeStroke(engine, { x: 35, y: 35 }, [1, .2, .1], 0);
  squeeze.move({ x: 35, y: 90 }); squeeze.move({ x: 100, y: 90 }); squeeze.advance(40);
  assert.ok(engine.pixels[(80 * 140 + 35) * 4 + 3] > 0);
  assert.ok(engine.pixels[(90 * 140 + 90) * 4 + 3] > 0);
  assert.equal(engine.pixels[(60 * 140 + 70) * 4 + 3], 0);
});

test('a background pause cannot accidentally flood the paper', () => {
  const engine = new PaintEngine(140, 180);
  const squeeze = new SqueezeStroke(engine, { x: 70, y: 80 }, [1, .2, .1], 0);
  squeeze.advance(60_000); assert.ok(engine.totalMass() < 54);
});
