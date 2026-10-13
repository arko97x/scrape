import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaintEngine, PaintHistory } from '../src/engine.ts';

test('stationary pen contacts do not blot or manufacture wet paint', () => {
  const engine = new PaintEngine(140, 180);
  const stroke = engine.beginInk({ x: 70, y: 70 }, [.2, .3, .35], 2.5);
  const before = engine.snapshot(), revision = engine.inkRevision;
  for (let i = 0; i < 1000; i++) engine.extendInk(stroke, { x: 70, y: 70 });
  assert.deepEqual(engine.snapshot(), before);
  assert.equal(engine.inkRevision, revision);
  assert.equal(engine.totalMass(), 0);
});

test('the pen preserves sparse samples and corners, with a fixed width', () => {
  const engine = new PaintEngine(140, 180);
  const stroke = engine.beginInk({ x: 30, y: 30 }, [.2, .3, .35], 6);
  engine.extendInk(stroke, { x: 110, y: 30 }); engine.extendInk(stroke, { x: 110, y: 150 });
  assert.deepEqual(stroke.points, [{ x: 30, y: 30 }, { x: 110, y: 30 }, { x: 110, y: 150 }]);
  assert.equal(stroke.width, 6);
  assert.equal(engine.surfaceMass(), 0);
});

test('scraping and paint deposition do not transport permanent ink', () => {
  const engine = new PaintEngine(140, 180);
  const stroke = engine.beginInk({ x: 30, y: 70 }, [.2, .3, .35], 3);
  engine.extendInk(stroke, { x: 110, y: 70 });
  const ink = engine.snapshot().ink;
  engine.deposit({ x: 70, y: 40 }, [.9, .2, .1], 10, 200);
  engine.beginScrape({ x: 70, y: 20 }); engine.scrape({ x: 70, y: 150 }); engine.endScrape();
  assert.deepEqual(engine.ink, ink);
  assert.ok(Math.abs(engine.totalMass() - 200) < .01);
});

test('ink snapshots are independent and undo, redo and clear restore the whole document', () => {
  const engine = new PaintEngine(140, 180), history = new PaintHistory(engine);
  history.checkpoint();
  const stroke = engine.beginInk({ x: 30, y: 30 }, [.2, .3, .35], 2.5);
  engine.extendInk(stroke, { x: 90, y: 90 });
  const saved = engine.snapshot();
  engine.extendInk(stroke, { x: 100, y: 100 });
  assert.equal(saved.ink![0].points.length, 2);
  history.undo(); assert.equal(engine.ink.length, 0);
  history.redo(); assert.equal(engine.ink[0].points.length, 3);
  const restored = new PaintEngine(140, 180); restored.restore(saved);
  assert.deepEqual(restored.snapshot(), saved);
  restored.ink[0].points[0].x = 40;
  assert.equal(saved.ink![0].points[0].x, 30);
  history.checkpoint(); engine.clear(); assert.equal(engine.ink.length, 0);
  history.undo(); assert.equal(engine.ink[0].points.length, 3);
});

test('paintings created before the pen load cleanly, and invalid ink is rejected', () => {
  const engine = new PaintEngine(140, 180);
  const { ink: _ink, ...legacy } = engine.snapshot();
  engine.beginInk({ x: 30, y: 30 }, [.2, .3, .35], 2);
  engine.restore(legacy); assert.equal(engine.ink.length, 0);
  assert.throws(() => engine.restore({ ...legacy, ink: [{ width: 3, colour: [.2, .3, .35], points: [{ x: NaN, y: 10 }] }] }), /invalid pen/);
});
