import { normaliseAngle, type Point } from './engine';

/** Where the card's centre sits and which way it points, in field units and degrees. */
export type CardPose = { centre: Point; angle: number };

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

/** Lets a single pointer steer the card along its path, as two fingers would
 *  turn it through a curve. The card keeps whatever angle it made with the
 *  direction of travel when the pull began, so straight pulls never turn.
 *
 *  The heading comes from a bead towed `reach` behind the pointer, which
 *  smooths out hand shake. The card follows it with `slack` degrees of play,
 *  like a loose joint: the sway of a trackpad stroke is taken up in the play
 *  and leaves the card alone, while a curve that keeps turning takes the card
 *  with it, trailing by the slack. A turn sharper than `cusp` degrees between two
 *  updates is a doubling back, not a curve: the card keeps its angle and
 *  carries on from the new direction instead of spinning through the paint. */
export class PathSteer {
  private bead: Point;
  private heading: number | null = null;
  private offset = 0;
  constructor(start: Point, private readonly reach = 24, private readonly slack = 10, private readonly cusp = 75) { this.bead = { ...start }; }

  /** The card's new angle with the pointer at `at`, or null to keep it. While
   *  `hold` is set, the card keeps its angle whichever way the pointer goes. */
  follow(at: Point, card: number, hold = false): number | null {
    const dx = at.x - this.bead.x, dy = at.y - this.bead.y, distance = Math.hypot(dx, dy);
    if (distance <= this.reach) return null;
    this.bead = { x: at.x - dx / distance * this.reach, y: at.y - dy / distance * this.reach };
    const heading = pointAngle(this.bead, at), previous = this.heading;
    this.heading = heading;
    if (previous === null || hold || Math.abs(normaliseAngle(heading - previous)) > this.cusp) {
      this.offset = normaliseAngle(card - heading);
      return null;
    }
    const ahead = normaliseAngle(heading + this.offset - card);
    return Math.abs(ahead) <= this.slack ? null : normaliseAngle(card + ahead - Math.sign(ahead) * this.slack);
  }

  /** The card was turned some other way, by scrolling: steer on from its new angle. */
  rebase(card: number) { if (this.heading !== null) this.offset = normaliseAngle(card - this.heading); }
}
