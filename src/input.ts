import { PaintEngine, type Colour, type Point } from './engine';

export type SqueezeOutput = { startedAt: number; dispensing: boolean; speed: number; flow: number };

/** Integrates elapsed time rather than counting pointer events or rendered frames. */
export class SqueezeStroke {
  private pending: Point[] = [];
  private stationaryFor = 0;
  private speed = 0;
  private dispensing = true;
  private initialDelivered = 3;
  private finished = false;
  readonly startedAt: number;
  flow = 1;
  constructor(private engine: PaintEngine, private point: Point, private colour: Colour, private lastAt: number) {
    this.startedAt = lastAt;
    // A tiny contact point appears immediately; the first squeeze arrives
    // over the same 100 ms in which paint visibly emerges from the nozzle.
    engine.deposit(point, colour, 3, this.initialDelivered);
  }
  get output(): SqueezeOutput { return { startedAt: this.startedAt, dispensing: this.dispensing, speed: this.speed, flow: this.flow }; }
  move(point: Point) { if (!this.finished) this.pending.push(point); }
  advance(now: number) {
    if (this.finished) return;
    const elapsed = Math.max(0, Math.min(.1, (now - this.lastAt) / 1000));
    this.lastAt = now;
    const path = [this.point, ...this.pending]; this.pending = [];
    let distance = 0;
    for (let i = 1; i < path.length; i++) distance += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    const initialTarget = 30 * Math.min(1, Math.max(0, (now - this.startedAt) / 100));
    const initialAmount = Math.max(0, initialTarget - this.initialDelivered);
    this.initialDelivered += initialAmount;
    const amount = 230 * elapsed * this.flow + initialAmount;
    this.speed = elapsed > 0 ? distance / elapsed : this.speed;
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
    if (elapsed > 0) this.dispensing = this.flow > 0 && (distance > .2 || this.stationaryFor <= 2.5);
    this.point = path[path.length - 1];
  }
  finish(now: number) {
    if (this.finished) return;
    this.advance(now);
    // A quick tap still dispenses its full initial quantity. Committing the
    // remainder at release also prevents paint disappearing on interruption.
    const remaining = 30 - this.initialDelivered;
    if (remaining > 0) this.engine.deposit(this.point, this.colour, 6.4, remaining);
    this.initialDelivered = 30;
    this.finished = true; this.dispensing = false;
  }
}
