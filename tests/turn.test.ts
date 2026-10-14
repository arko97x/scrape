import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseAngle, PaintEngine } from '../src/engine.ts';
import { PathSteer, twoFingerPose } from '../src/scrape-grip.ts';

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

test('swinging the card about one end sweeps paint round in an arc', () => {
  const engine = new PaintEngine(200, 220); engine.setBlade(81, 0);
  // Held still at (30, 60), the left end; the centre swings 40 cells out from it.
  const pose = (degrees: number) => { const r = degrees * Math.PI / 180; return { x: 30 + Math.cos(r) * 40, y: 60 + Math.sin(r) * 40 }; };
  engine.deposit({ x: 95, y: 82 }, red, 6, 120);
  const swept = heightAt(engine, 95, 82);
  engine.beginScrape(pose(0));
  for (let degrees = 2; degrees <= 80; degrees += 2) engine.scrape(pose(degrees), degrees);
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

// Drives a steer along a path, applying each angle it returns as a pull would.
const steerAlong = (path: { x: number; y: number }[], card: number, hold = () => false) => {
  const steer = new PathSteer(path[0]);
  const angles = [card];
  for (const at of path.slice(1)) { card = steer.follow(at, card, hold()) ?? card; angles.push(card); }
  return angles;
};
const turnedBy = (from: number, to: number) => normaliseAngle(to - from);

test('steering keeps a straight pull straight at any angle, despite hand shake', () => {
  for (const card of [0, 35, 90, -120]) {
    const path = Array.from({ length: 80 }, (_, step) => ({ x: step * 1.8 + Math.sin(step * 2.7) * .5, y: step * 2.4 + Math.cos(step * 1.9) * .5 }));
    for (const angle of steerAlong(path, card)) assert.ok(Math.abs(turnedBy(card, angle)) < 5, `${angle} drifted from ${card}`);
  }
});

test('the sway of a trackpad stroke does not turn the card', () => {
  // A pull that weaves 2 cells either side of straight, every 60 cells.
  const path = Array.from({ length: 400 }, (_, step) => ({ x: step, y: 2 * Math.sin(step / 60 * 2 * Math.PI) }));
  for (const angle of steerAlong(path, 90)) assert.equal(angle, 90);
});

test('steering turns the card with a curve, by as much as the path turns', () => {
  for (const card of [0, 30]) {
    // A quarter circle, from heading down to heading left.
    const path = Array.from({ length: 91 }, (_, degree) => { const r = degree * Math.PI / 180; return { x: 100 * Math.cos(r), y: 100 * Math.sin(r) }; });
    const angles = steerAlong(path, card);
    // Steering takes a little travel to find the heading and trails it by its
    // slack, but keeps pace with it:
    // between 30° and 80° round the curve, the card turns about 50° too.
    near(turnedBy(angles[30], angles[80]), 50, 4);
    // It turns gradually, never by a jolt.
    for (let i = 1; i < angles.length; i++) assert.ok(Math.abs(turnedBy(angles[i - 1], angles[i])) < 8);
  }
});

test('doubling back does not spin the card round', () => {
  const path = [...Array.from({ length: 40 }, (_, step) => ({ x: step * 2, y: 0 })), ...Array.from({ length: 40 }, (_, step) => ({ x: 78 - step * 2, y: 0 }))];
  for (const angle of steerAlong(path, 20)) assert.equal(angle, 20);
});

test('holding keeps the angle through a curve, and steering picks up from there', () => {
  const path = Array.from({ length: 181 }, (_, degree) => { const r = degree * Math.PI / 180; return { x: 100 * Math.cos(r), y: 100 * Math.sin(r) }; });
  let step = 0;
  const angles = steerAlong(path, 0, () => step++ < 90);
  near(angles[90], 0);
  near(turnedBy(angles[120], angles[170]), 50, 4);
});

test('a card turned mid-pull steers on from its new angle', () => {
  const steer = new PathSteer({ x: 0, y: 0 });
  let card = 0;
  for (let step = 1; step <= 20; step++) card = steer.follow({ x: 0, y: step * 3 }, card) ?? card;
  card = 30; steer.rebase(card);
  for (let step = 21; step <= 40; step++) card = steer.follow({ x: 0, y: step * 3 }, card) ?? card;
  near(card, 30);
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
