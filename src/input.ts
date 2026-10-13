import { PaintEngine, type Colour, type Point } from './engine';

/** Integrates elapsed time rather than counting pointer events or rendered frames. */
export class SqueezeStroke {
  private pending: Point[] = [];
  private stationaryFor = 0;
  flow = 1;
  constructor(private engine: PaintEngine, private point: Point, private colour: Colour, private lastAt: number) {
    engine.deposit(point, colour, 6.4, 30);
  }
  move(point: Point) { this.pending.push(point); }
  advance(now: number) {
    const elapsed = Math.max(0, Math.min(.1, (now - this.lastAt) / 1000));
    this.lastAt = now;
    const path = [this.point, ...this.pending]; this.pending = [];
    let distance = 0;
    for (let i = 1; i < path.length; i++) distance += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    const amount = 230 * elapsed * this.flow;
    if (distance > .2) {
      this.stationaryFor = 0;
      for (let i = 1; i < path.length; i++) {
        const length = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
        this.engine.bead(path[i - 1], path[i], this.colour, 6.4, amount * length / distance);
      }
    } else {
      this.stationaryFor += elapsed;
      // A held squeeze expands a mound; drawing lays a narrower bead.
      this.engine.deposit(path[path.length - 1], this.colour, Math.min(24, 6.4 + Math.sqrt(this.stationaryFor) * 9), this.stationaryFor <= 2.5 ? amount : 0);
    }
    this.point = path[path.length - 1];
  }
}
