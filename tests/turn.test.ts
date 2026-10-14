import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseAngle, PaintEngine } from '../src/engine.ts';
import { pinnedEnd, pivotPath, pivotPose, twoFingerPose } from '../src/scrape-grip.ts';

const near = (actual: number, expected: number, tolerance = Math.max(.001, Math.abs(expected) * .00001)) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);
const red: [number, number, number] = [.9, .1, .1];
const heightAt = (engine: PaintEngine, x: number, y: number) => engine.pixels[(Math.round(y) * engine.width + Math.round(x)) * 4 + 3];

test('angles normalise into (-180, 180]', () => {
  for (const [input, expected] of [[0, 0], [90, 90], [180, 180], [-180, 180], [270, -90], [-450, -90], [725, 5]]) assert.equal(normaliseAngle(input), expected);
});

test('turning the card in the air keeps its paint, and is ignored mid-pull', () => {
  const engine = new PaintEngine(140, 180); engine.setBlade(65, 0);
  engine.deposit({ x: 70, y: 45 }, red, 7, 150);
  engine.beginScrape({ x: 70, y: 28 }); engine.scrape({ x: 70, y: 60 });
  engine.turn(45); assert.equal(engine.angle, 0);
  engine.endScrape();
  const carried = engine.carriedMass(); assert.ok(carried > 0);
  engine.turn(45); assert.equal(engine.angle, 45); near(engine.carriedMass(), carried);
});

test('a card turning as it moves conserves paint and ends at the new angle', () => {
  const engine = new PaintEngine(140, 180); engine.setBlade(65, 0);
  engine.deposit({ x: 70, y: 70 }, red, 15, 450);
  engine.beginScrape({ x: 70, y: 30 });
  for (let step = 1; step <= 30; step++) engine.scrape({ x: 70 + step, y: 30 + step * 3 }, step * 4);
  engine.endScrape();
  near(engine.totalMass(), 450); assert.equal(engine.angle, 120);
  for (let i = 3; i < engine.pixels.length; i += 4) assert.ok(engine.pixels[i] >= 0 && Number.isFinite(engine.pixels[i]));
});

test('the card turns the short way round', () => {
  const engine = new PaintEngine(140, 180); engine.setBlade(60, 170);
  // Above the card's centre: only a turn through upright would reach it.
  engine.deposit({ x: 70, y: 62 }, red, 5, 40);
  const before = heightAt(engine, 70, 62);
  engine.beginScrape({ x: 70, y: 90 }); engine.scrape({ x: 70, y: 90 }, -170); engine.endScrape();
  assert.equal(engine.angle, -170);
  assert.equal(heightAt(engine, 70, 62), before);
});

test('pivoting about one end sweeps paint round in an arc', () => {
  const engine = new PaintEngine(200, 220); engine.setBlade(81, 0);
  const pin = pinnedEnd({ centre: { x: 70, y: 60 }, angle: 0 }, 81);
  near(pin.at.x, 30); near(pin.at.y, 60);
  engine.deposit({ x: 95, y: 82 }, red, 6, 120);
  const swept = heightAt(engine, 95, 82);
  engine.beginScrape({ x: 70, y: 60 });
  let angle = 0;
  for (const target of [20, 40, 60, 80]) {
    for (const pose of pivotPath(pin, angle, target, 81)) engine.scrape(pose.centre, pose.angle);
    angle = target;
  }
  engine.endScrape();
  near(engine.totalMass(), 120);
  assert.ok(heightAt(engine, 95, 82) < swept * .5, 'the blob in the card\'s path is picked up');
  // Downstream of the blob, around the arc, the card lays the paint back down.
  let laid = 0;
  for (let degrees = 45; degrees <= 75; degrees += 2) for (let radius = 50; radius <= 75; radius += 2) {
    const r = degrees * Math.PI / 180; laid += heightAt(engine, 30 + Math.cos(r) * radius, 60 + Math.sin(r) * radius);
  }
  assert.ok(laid > 0, 'paint is laid further round the arc');
});

test('two fingers set the centre and angle without flipping the card end for end', () => {
  const level = twoFingerPose({ x: 10, y: 50 }, { x: 90, y: 50 }, 0);
  assert.deepEqual(level, { centre: { x: 50, y: 50 }, angle: 0 });
  // Fingers the other way round give the same card.
  assert.equal(twoFingerPose({ x: 90, y: 50 }, { x: 10, y: 50 }, 0).angle, 0);
  near(twoFingerPose({ x: 90, y: 40 }, { x: 10, y: 60 }, 5).angle, normaliseAngle(Math.atan2(-20, 80) * 180 / Math.PI));
  // Fingers almost touching keep the current angle.
  assert.equal(twoFingerPose({ x: 50, y: 50 }, { x: 53, y: 52 }, 30).angle, 30);
});

test('a pivot keeps the pinned end fixed through a full arc', () => {
  for (const [angle, other] of [[0, false], [0, true], [90, false], [150, false], [-60, true]] as const) {
    const pin = pinnedEnd({ centre: { x: 100, y: 100 }, angle }, 61, other);
    const start = pivotPose(pin, angle, 61);
    near(start.centre.x, 100); near(start.centre.y, 100);
    for (const pose of pivotPath(pin, angle, angle + 170, 61)) {
      const r = pose.angle * Math.PI / 180;
      near(pose.centre.x - pin.side * Math.cos(r) * 30, pin.at.x); near(pose.centre.y - pin.side * Math.sin(r) * 30, pin.at.y);
    }
  }
  assert.equal(pivotPath(pinnedEnd({ centre: { x: 0, y: 0 }, angle: 0 }, 61), 0, 30, 61).length, 10);
  // The left end of a level card, and the top end of an upright one.
  assert.ok(pinnedEnd({ centre: { x: 100, y: 100 }, angle: 180 }, 61).at.x < 100);
  assert.ok(pinnedEnd({ centre: { x: 100, y: 100 }, angle: -90 }, 61).at.y < 100);
});

test('a card turning as it pulls leaves a continuous ribbon, without pinholes', () => {
  for (const [mx, my, spin] of [[0, 7, 1.6], [2, 7, 1.6], [3, 6, -2]]) {
    const engine = new PaintEngine(240, 360); engine.setBlade(101, 0);
    engine.deposit({ x: 120, y: 60 }, red, 14, 900);
    engine.beginScrape({ x: 120, y: 40 });
    for (let step = 1; step <= 36; step++) engine.scrape({ x: 120 + step * mx, y: 40 + step * my }, step * spin);
    engine.endScrape();
    near(engine.totalMass(), 900);
    // A cell inside the ribbon should never be much thinner than every cell around it.
    let interior = 0;
    for (let y = 80; y < 260; y++) for (let x = 2; x < 238; x++) {
      const around = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]].map(([ox, oy]) => heightAt(engine, x + ox, y + oy));
      if (Math.min(...around) < .004) continue;
      interior++;
      assert.ok(heightAt(engine, x, y) >= .25 * Math.min(...around), `pinhole at ${x},${y} (${mx}, ${my}, ${spin}°)`);
    }
    assert.ok(interior > 1000, 'the pull leaves a ribbon');
  }
});
