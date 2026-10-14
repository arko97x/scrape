import { normaliseAngle, type Point } from './engine';

/** Where the card's centre sits and which way it points, in field units and degrees. */
export type CardPose = { centre: Point; angle: number };
/** A pinned end of the card. `side` says which way the centre lies along the card from it. */
export type Pin = { at: Point; side: 1 | -1 };

export const pointAngle = (from: Point, to: Point) => Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;

/** Two fingers hold the card's ends. The card's paint stays on the same lanes,
 *  so it never flips end for end: of the two directions the fingers give, the
 *  one closer to the card's current angle wins. Fingers almost on top of each
 *  other give no reliable direction, so the card keeps its angle. */
export function twoFingerPose(a: Point, b: Point, current: number): CardPose {
  const centre = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (Math.hypot(b.x - a.x, b.y - a.y) < 12) return { centre, angle: current };
  let angle = pointAngle(a, b);
  if (Math.abs(normaliseAngle(angle - current)) > 90) angle += 180;
  return { centre, angle: normaliseAngle(angle) };
}

/** The end that stays put while pivoting: the left one, or the top one for an
 *  upright card. `other` pins the opposite end. */
export function pinnedEnd({ centre, angle }: CardPose, width: number, other = false): Pin {
  const radians = angle * Math.PI / 180, half = (width - 1) / 2;
  const tx = Math.cos(radians), ty = Math.sin(radians);
  const forwards = Math.abs(tx) > 1e-6 ? tx > 0 : ty > 0;
  // With the card pointing right (or down), the left (or top) end is behind the centre.
  const side = forwards !== other ? 1 : -1;
  return { at: { x: centre.x - side * tx * half, y: centre.y - side * ty * half }, side };
}

/** The card at `angle`, swung about its pinned end. */
export function pivotPose(pin: Pin, angle: number, width: number): CardPose {
  const radians = angle * Math.PI / 180, half = (width - 1) / 2;
  return { centre: { x: pin.at.x + pin.side * Math.cos(radians) * half, y: pin.at.y + pin.side * Math.sin(radians) * half }, angle: normaliseAngle(angle) };
}

/** Breaks a pivot into turns of at most `limit` degrees, so the card sweeps a
 *  true arc rather than cutting the corner between far-apart pointer events. */
export function pivotPath(pin: Pin, from: number, to: number, width: number, limit = 3): CardPose[] {
  const turn = normaliseAngle(to - from);
  const count = Math.max(1, Math.ceil(Math.abs(turn) / limit));
  return Array.from({ length: count }, (_, step) => pivotPose(pin, from + turn * (step + 1) / count, width));
}
