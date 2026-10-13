import type { SqueezeOutput } from './input';

export const DISPENSE_RELEASE_MS = 180;
export type DispensePose = {
  phase: 'idle' | 'feeding' | 'releasing' | 'wet';
  nozzleY: number;
  fill: number;
  neck: number;
  tail: number;
  wet: boolean;
};

/** A transient nozzle-to-paper connection; it never adds paint to the engine. */
export class DispenseMotion {
  private startedAt: number | null = null;
  private releasedAt: number | null = null;
  private wet = false;
  private width = 1;

  constructor(wet = false) { this.wet = wet; }

  release(now: number) {
    if (this.startedAt !== null && this.releasedAt === null) this.releasedAt = now;
  }

  cancel() { this.startedAt = null; this.releasedAt = null; }

  update(now: number, output?: SqueezeOutput): DispensePose {
    if (output?.dispensing) {
      // A new press, or movement after a capped stationary mound, interrupts
      // the old release at once. Neither queues an animation or more paint.
      if (this.startedAt !== output.startedAt || this.releasedAt !== null) {
        this.startedAt = output.startedAt;
        this.releasedAt = null;
      }
      this.wet = true;
      this.width = Math.max(.55, Math.min(1.3, output.flow / (1 + output.speed / 650)));
      const fill = Math.min(1, Math.max(.25, (now - output.startedAt) / 100));
      return { phase: 'feeding', nozzleY: 440, fill, neck: this.width, tail: 0, wet: true };
    }

    this.release(now);
    if (this.releasedAt !== null) {
      const progress = Math.max(0, (now - this.releasedAt) / DISPENSE_RELEASE_MS);
      if (progress < 1) {
        return {
          phase: 'releasing', nozzleY: 440 - 18 * progress, fill: 1,
          neck: progress < .6 ? this.width * (1 - progress / .6) : 0,
          tail: progress >= .6 ? (1 - progress) / .4 : 0, wet: this.wet,
        };
      }
      this.cancel();
    }
    return { phase: this.wet ? 'wet' : 'idle', nozzleY: 422, fill: 0, neck: 0, tail: 0, wet: this.wet };
  }
}

export function extrusionPath(pose: DispensePose) {
  if (pose.neck <= 0) return '';
  const top = pose.nozzleY - 3;
  const bottom = pose.nozzleY + (494 - pose.nozzleY) * pose.fill;
  const middle = (top + bottom) / 2;
  const throat = 10;
  const neck = 14 * pose.neck;
  const foot = 18 * Math.max(.4, pose.neck);
  return `M${100 - throat} ${top} C${100 - throat} ${top + 10} ${100 - neck} ${middle - 8} ${100 - neck} ${middle} C${100 - neck} ${middle + 10} ${100 - foot} ${bottom - 6} ${100 - foot} ${bottom} Q100 ${bottom + 7} ${100 + foot} ${bottom} C${100 + foot} ${bottom - 6} ${100 + neck} ${middle + 10} ${100 + neck} ${middle} C${100 + neck} ${middle - 8} ${100 + throat} ${top + 10} ${100 + throat} ${top}Z`;
}
