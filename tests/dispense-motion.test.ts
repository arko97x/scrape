import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DispenseMotion, DISPENSE_RELEASE_MS, extrusionPath } from '../src/dispense-motion.ts';
import { PaintEngine } from '../src/engine.ts';
import { SqueezeStroke } from '../src/input.ts';

test('the nozzle connection stops when the actual held squeeze stops dispensing', () => {
  const engine = new PaintEngine(140, 180);
  const squeeze = new SqueezeStroke(engine, { x: 70, y: 80 }, [1, .2, .1], 0);
  const motion = new DispenseMotion();
  for (let at = 20; at <= 2600; at += 20) {
    squeeze.advance(at); motion.update(at, squeeze.output);
  }
  assert.equal(squeeze.output.dispensing, false);
  assert.equal(motion.update(2800, squeeze.output).phase, 'wet');
  const mass = engine.totalMass();
  squeeze.advance(2900);
  assert.equal(engine.totalMass(), mass);
  squeeze.move({ x: 95, y: 80 }); squeeze.advance(2920);
  assert.equal(squeeze.output.dispensing, true);
  assert.equal(motion.update(2920, squeeze.output).phase, 'feeding');
});

test('release lifts the nozzle, narrows and breaks the connection, then leaves residue', () => {
  const motion = new DispenseMotion();
  const feeding = motion.update(300, { startedAt: 0, dispensing: true, speed: 0, flow: 1 });
  motion.release(300);
  const pinch = motion.update(390);
  assert.ok(pinch.nozzleY < feeding.nozzleY);
  assert.ok(pinch.neck > 0 && pinch.neck < feeding.neck);
  assert.notEqual(extrusionPath(pinch), '');
  const broken = motion.update(430);
  assert.equal(extrusionPath(broken), '');
  assert.ok(broken.tail > 0);
  const settled = motion.update(300 + DISPENSE_RELEASE_MS);
  assert.equal(settled.phase, 'wet');
  assert.equal(settled.neck, 0); assert.equal(settled.tail, 0); assert.equal(settled.wet, true);
});

test('re-pressing and interruption cannot queue a second release or leave an active stream', () => {
  const motion = new DispenseMotion();
  motion.update(100, { startedAt: 0, dispensing: true, speed: 0, flow: 1 });
  motion.release(100); motion.update(150);
  const restarted = motion.update(160, { startedAt: 160, dispensing: true, speed: 0, flow: 1 });
  assert.equal(restarted.phase, 'feeding');
  assert.equal(motion.update(280, { startedAt: 160, dispensing: true, speed: 0, flow: 1 }).phase, 'feeding');
  motion.cancel();
  const stopped = motion.update(281);
  assert.equal(stopped.neck, 0); assert.equal(stopped.tail, 0);
  assert.equal(stopped.phase, 'wet');
});
