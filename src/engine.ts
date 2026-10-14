import { bladeContact, materialHash, materialNoise, paperResistance } from './surface';
import { copyInk, validInk, type InkStroke } from './ink';
import { combGaps, type BladeKind } from './squeegee-geometry';

export type Colour = [number, number, number];
export type Point = { x: number; y: number };
export type Blend = (a: Colour, b: Colour, ratio: number) => Colour;
export type PaintSnapshot = {
  pixels: Float32Array;
  carry: Float32Array;
  discarded: number;
  bladeWidth: number;
  angle: number;
  blade?: BladeKind;
  wetSource?: Uint8Array;
  ink?: InkStroke[];
};

export const linearBlend: Blend = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t) as Colour;

/** A material field: RGB pigment colour and paint height, independent of screen size. */
export class PaintEngine {
  readonly pixels: Float32Array;
  readonly margin: number;
  readonly carry = new Float32Array(256 * 4);
  readonly ink: InkStroke[] = [];
  inkRevision = 0;
  bladeWidth = 100;
  angle = 0;
  blade: BladeKind = 'flat';
  discarded = 0;
  private previous: Point | null = null;
  private previousCells: number[] = [];
  private bladeCells = new Int32Array(256);
  private edgeProfile = new Float32Array(256).fill(1);
  private notchLane = new Uint8Array(256);
  private laneRow = new Int32Array(256);
  private loadBeforeSqueeze = new Float32Array(256 * 4);
  private sidewaysFlux = new Float64Array(255);
  private ribbonFilm = new Float32Array(256);
  private wetSource = new Uint8Array(256);
  private allowedRibbon = new Uint8Array(256);
  private readonly resistance: Float32Array;
  private bladeNormal: Point = { x: 0, y: 1 };
  dirty: { x: number; y: number; right: number; bottom: number } | null;

  constructor(readonly width: number, readonly height: number, private blend: Blend = linearBlend) {
    this.pixels = new Float32Array(width * height * 4);
    this.resistance = new Float32Array(width * height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) this.resistance[y * width + x] = paperResistance(x, y);
    this.margin = Math.round(Math.min(width, height) * 0.045);
    this.dirty = { x: 0, y: 0, right: width, bottom: height };
  }

  inside(x: number, y: number) {
    return x >= this.margin && y >= this.margin && x < this.width - this.margin && y < this.height - this.margin;
  }

  beginInk(point: Point, colour: Colour, width: number): InkStroke {
    const stroke: InkStroke = { points: [{ ...point }], colour: [...colour], width };
    if (!validInk([stroke])) throw new Error('This pen stroke is invalid.');
    this.ink.push(stroke); this.inkRevision++;
    return stroke;
  }

  extendInk(stroke: InkStroke, point: Point) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    const last = stroke.points[stroke.points.length - 1];
    if (Math.hypot(point.x - last.x, point.y - last.y) < .01) return;
    stroke.points.push({ ...point }); this.inkRevision++;
  }

  private mark(x: number, y: number) {
    if (!this.dirty) this.dirty = { x, y, right: x + 1, bottom: y + 1 };
    else {
      this.dirty.x = Math.min(this.dirty.x, x);
      this.dirty.y = Math.min(this.dirty.y, y);
      this.dirty.right = Math.max(this.dirty.right, x + 1);
      this.dirty.bottom = Math.max(this.dirty.bottom, y + 1);
    }
  }

  private add(data: Float32Array, index: number, colour: Colour, amount: number) {
    if (amount <= 0) return;
    const existing = data[index + 3];
    const mixed = existing > 0.000001
      ? this.blend([data[index], data[index + 1], data[index + 2]], colour, amount / (existing + amount))
      : colour;
    data[index] = mixed[0]; data[index + 1] = mixed[1]; data[index + 2] = mixed[2];
    data[index + 3] = existing + amount;
  }

  /** Normalised dome; requested volume is conserved, including near protected borders. */
  deposit(point: Point, colour: Colour, radius: number, amount: number) {
    if (!this.inside(point.x, point.y) || amount <= 0 || radius <= 0) return;
    const cells: [number, number, number][] = [];
    const phase = materialHash(Math.round(point.x), Math.round(point.y), 739) * Math.PI * 2;
    const extent = radius * 1.075;
    let weight = 0;
    for (let y = Math.max(this.margin, Math.floor(point.y - extent)); y <= Math.min(this.height - this.margin - 1, Math.ceil(point.y + extent)); y++) {
      for (let x = Math.max(this.margin, Math.floor(point.x - extent)); x <= Math.min(this.width - this.margin - 1, Math.ceil(point.x + extent)); x++) {
        const theta = Math.atan2(y - point.y, x - point.x);
        const localRadius = radius * (1 + .045 * Math.sin(theta * 3 + phase) + .025 * Math.sin(theta * 5 - phase));
        const distance = ((x - point.x) ** 2 + (y - point.y) ** 2) / localRadius ** 2;
        if (distance >= 1) continue;
        const w = (1 - distance) ** 1.5 * (1 + .08 * (this.resistance[y * this.width + x] - 1));
        cells.push([x, y, w]); weight += w;
      }
    }
    if (!weight) return;
    for (const [x, y, w] of cells) {
      this.add(this.pixels, (y * this.width + x) * 4, colour, amount * w / weight);
      this.mark(x, y);
    }
  }

  bead(from: Point, to: Point, colour: Colour, radius: number, amount: number) {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const count = Math.max(1, Math.ceil(distance / Math.max(1, radius * 0.45)));
    for (let i = 1; i <= count; i++) {
      const t = i / count;
      this.deposit({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, colour, radius, amount / count);
    }
  }

  beginScrape(point: Point) { this.previous = point; this.previousCells = []; this.laneRow.fill(-1 << 30); }
  endScrape() { this.previous = null; this.previousCells = []; }

  private updateWetFootprint() {
    this.allowedRibbon.fill(0);
    for (let start = 0; start < this.bladeWidth;) {
      if (!this.wetSource[start]) { start++; continue; }
      let end = start;
      while (end + 1 < this.bladeWidth && this.wetSource[end + 1]) end++;
      // Compression expands the actual contact patch by a modest amount. Continued
      // feeding must not turn invisible traces into an ever-widening wet footprint.
      let pressure = 0;
      for (let lane = start; lane <= end; lane++) pressure = Math.max(pressure, this.wetSource[lane] / 24);
      const expansion = Math.max(2, Math.round((end - start + 1) * .12 + Math.min(3, pressure * .4)));
      this.allowedRibbon.fill(1, Math.max(0, start - expansion), Math.min(this.bladeWidth, end + expansion + 1));
      start = end + 1;
    }
  }

  /** Compression moves pigment down a load gradient along the blade.
   * Fluxes are calculated together, then applied together: no scan-direction bias,
   * invented paint or colour diffusion between equally loaded neighbouring bands.
   */
  private squeezeAlongBlade(pressure: number) {
    if (pressure <= 0) return;
    const before = this.loadBeforeSqueeze;
    before.set(this.carry);
    const mobility = 0.40 * Math.min(1, pressure * 4);
    this.sidewaysFlux.fill(0);
    for (let lane = 0; lane < this.bladeWidth - 1; lane++) {
      if (this.bladeCells[lane] < 0 || this.bladeCells[lane + 1] < 0) continue;
      const left = before[lane * 4 + 3], right = before[(lane + 1) * 4 + 3];
      const difference = left - right;
      if ((difference > 0 && !this.allowedRibbon[lane + 1]) || (difference < 0 && !this.allowedRibbon[lane])) continue;
      // A small resistance keeps already thin paint from spreading indefinitely.
      const amount = Math.min(Math.max(0, Math.abs(difference) - .0001) * mobility, Math.max(left, right) * .22);
      const flux = Math.sign(difference) * amount;
      this.sidewaysFlux[lane] = flux;
      const donor = flux > 0 ? lane : lane + 1;
      this.carry[donor * 4 + 3] -= amount;
    }
    for (let lane = 0; lane < this.bladeWidth - 1; lane++) {
      const flux = this.sidewaysFlux[lane];
      if (!flux) continue;
      const donor = (flux > 0 ? lane : lane + 1) * 4;
      const recipient = (flux > 0 ? lane + 1 : lane) * 4;
      this.add(this.carry, recipient, [before[donor], before[donor + 1], before[donor + 2]], Math.abs(flux));
    }
  }

  /** A carried bead shares material across its wet ribbon, even on bare paper.
   * The previous independent lane drains exhausted the edges first. Here the
   * bead feeds its shoulders and gets thinner as a whole when its load runs low.
   * Similar-colour patches share volume; separate pigments keep their boundaries.
   */
  private levelCarriedRibbons() {
    const before = this.loadBeforeSqueeze;
    before.set(this.carry);
    this.ribbonFilm.fill(0);
    const edgeWeight = (lane: number, start: number, end: number) => 1 + .85 * Math.max(0, 1 - Math.min(lane - start, end - lane) / 2);
    for (let start = 0; start < this.bladeWidth;) {
      const index = start * 4;
      const initial = before[index + 3];
      if (this.bladeCells[start] < 0 || initial <= .015) {
        this.ribbonFilm[start] = .0135 * initial / (initial + 1.2) * this.edgeProfile[start];
        start++; continue;
      }
      const anchor: Colour = [before[index], before[index + 1], before[index + 2]];
      let end = start;
      while (end + 1 < this.bladeWidth) {
        const next = (end + 1) * 4;
        const difference = Math.max(Math.abs(before[next] - anchor[0]), Math.abs(before[next + 1] - anchor[1]), Math.abs(before[next + 2] - anchor[2]));
        if (this.bladeCells[end + 1] < 0 || before[next + 3] <= .015 || difference > .10) break;
        end++;
      }
      let volume = 0, weight = 0;
      for (let lane = start; lane <= end; lane++) { volume += before[lane * 4 + 3]; weight += edgeWeight(lane, start, end); }
      let pooled = 0;
      let pooledColour: Colour = anchor;
      const deficits: [number, number][] = [];
      for (let lane = start; lane <= end; lane++) {
        const at = lane * 4;
        const target = volume * edgeWeight(lane, start, end) / weight;
        const change = (before[at + 3] - target) * .65;
        if (change > 0) {
          const pigment: Colour = [before[at], before[at + 1], before[at + 2]];
          pooledColour = pooled > 0 ? this.blend(pooledColour, pigment, change / (pooled + change)) : pigment;
          pooled += change; this.carry[at + 3] -= change;
        } else if (change < 0) deficits.push([at, -change]);
      }
      const required = deficits.reduce((total, [, amount]) => total + amount, 0);
      if (required > 0 && pooled > 0) {
        for (const [at, amount] of deficits) this.add(this.carry, at, pooledColour, pooled * amount / required);
      }
      const mean = volume / (end - start + 1);
      const film = .0135 * mean / (mean + 1.2);
      for (let lane = start; lane <= end; lane++) {
        const cell = this.bladeCells[lane];
        const x = cell % this.width, y = Math.floor(cell / this.width);
        const distance = x * this.bladeNormal.x + y * this.bladeNormal.y;
        // Ridges form in the air gap of a notch, so paper texture doesn't reach them.
        const contact = this.notchLane[lane] ? 1 : this.resistance[cell] * bladeContact(lane, distance);
        this.ribbonFilm[lane] = film * edgeWeight(lane, start, end) * contact * this.edgeProfile[lane];
      }
      start = end + 1;
    }
  }

  /** How much film each lane lays relative to a flat card. A comb's teeth
   * pull paint thin into grooves, while each notch extrudes a rounded ridge
   * from the load the comb pushes ahead of it.
   */
  private updateEdgeProfile() {
    for (let lane = 0; lane < this.bladeWidth; lane++) {
      this.notchLane[lane] = 0;
      if (this.blade !== 'comb') { this.edgeProfile[lane] = 1; continue; }
      const position = (lane + .5) / this.bladeWidth;
      const notch = combGaps.find(([from, to]) => position >= from && position < to);
      this.notchLane[lane] = notch ? 1 : 0;
      this.edgeProfile[lane] = notch ? .6 + 4.4 * Math.sin(Math.PI * (position - notch[0]) / (notch[1] - notch[0])) : .35;
    }
  }

  scrape(to: Point) {
    if (!this.previous) { this.beginScrape(to); return; }
    const from = this.previous;
    const dx = to.x - from.x, dy = to.y - from.y;
    const radians = this.angle * Math.PI / 180;
    const tx = Math.cos(radians), ty = Math.sin(radians);
    this.bladeNormal = { x: -ty, y: tx };
    // A blade moving along its own edge doesn't make a normal scraping pass.
    if (Math.abs(-ty * dx + tx * dy) < 0.001) { this.previous = to; return; }
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
    for (let step = 1; step <= steps; step++) {
      const cx = from.x + dx * step / steps, cy = from.y + dy * step / steps;
      const visited = new Set<number>();
      this.bladeCells.fill(-1);
      let pressure = 0;
      for (let lane = 0; lane < this.bladeWidth; lane++) {
        const offset = lane - (this.bladeWidth - 1) / 2;
        const x = Math.round(cx + tx * offset), y = Math.round(cy + ty * offset);
        const cell = y * this.width + x;
        const old = this.previousCells[lane];
        this.previousCells[lane] = cell;
        if (old === cell || visited.has(cell) || !this.inside(x, y)) continue;
        // A diagonal drag is split into sub-pixel steps, so a lane can slide
        // sideways within a row it has already worked. A comb's ridges would show
        // that as beads, so each comb lane works a given row only once.
        if (this.blade === 'comb') {
          const row = Math.round(x * this.bladeNormal.x + y * this.bladeNormal.y);
          if (row === this.laneRow[lane]) continue;
          this.laneRow[lane] = row;
        }
        visited.add(cell);
        this.bladeCells[lane] = cell;
        const index = cell * 4, load = lane * 4;
        const amount = this.pixels[index + 3];
        // Flatten the mound, rather than leaving a proportion of its original dome
        // sitting on top of the new ribbon. A small residual film stays on the paper.
        const picked = amount - Math.min(amount * .06, .006);
        if (picked > 0) {
          this.add(this.carry, load, [this.pixels[index], this.pixels[index + 1], this.pixels[index + 2]], picked);
          this.pixels[index + 3] = amount - picked;
          this.mark(x, y);
          if (picked > .001) this.wetSource[lane] = Math.max(this.wetSource[lane], Math.min(255, 1 + Math.round(picked * 24)));
        }
        pressure = Math.max(pressure, picked);
      }
      this.updateWetFootprint();
      this.squeezeAlongBlade(pressure);
      this.levelCarriedRibbons();
      for (let lane = 0; lane < this.bladeWidth; lane++) {
        const cell = this.bladeCells[lane];
        if (cell < 0) continue;
        const index = cell * 4, load = lane * 4;
        const available = this.carry[load + 3];
        const laid = Math.min(available, this.ribbonFilm[lane]);
        if (laid > 0) {
          const pigment: Colour = [this.carry[load], this.carry[load + 1], this.carry[load + 2]];
          const offset = lane - (this.bladeWidth - 1) / 2;
          const cellX = cell % this.width, cellY = Math.floor(cell / this.width);
          // Preserve the transport row so newly laid film is not fed back into
          // the next pickup. Only lateral coverage follows the subcell blade
          // position; this removes snapping at the ribbon's moving shoulders.
          const lateral = (cx + tx * offset - cellX) * tx + (cy + ty * offset - cellY) * ty;
          const x = cellX + tx * lateral, y = cellY + ty * lateral;
          // Local wetting shifts the contact line by at most 1.6 field pixels.
          // Fractional coverage moves actual pigment; lighting, undo and later
          // scrapes all see the same continuous shoulder.
          const drift = 1.6 * (2 * materialNoise(x / 58, y / 43, 2767) - 1);
          const px = x + tx * drift, py = y + ty * drift;
          const ix = Math.floor(px), iy = Math.floor(py), fx = px - ix, fy = py - iy;
          const coverage: [number, number, number][] = [
            [ix, iy, (1 - fx) * (1 - fy)], [ix + 1, iy, fx * (1 - fy)],
            [ix, iy + 1, (1 - fx) * fy], [ix + 1, iy + 1, fx * fy],
          ];
          const supported = coverage.filter(([sx, sy, weight]) => weight > 0 && this.inside(sx, sy));
          const total = supported.reduce((sum, [, , weight]) => sum + weight, 0);
          if (total > 0) {
            for (const [sx, sy, weight] of supported) {
              this.add(this.pixels, (sy * this.width + sx) * 4, pigment, laid * weight / total);
              this.mark(sx, sy);
            }
          } else { this.add(this.pixels, index, pigment, laid); }
          this.carry[load + 3] -= laid;
          this.mark(cell % this.width, Math.floor(cell / this.width));
        }
      }
    }
    this.previous = to;
  }

  cleanBlade() {
    for (let i = 3; i < this.carry.length; i += 4) this.discarded += this.carry[i];
    this.carry.fill(0);
    this.wetSource.fill(0);
  }

  setBlade(width: number, angle: number, blade: BladeKind = this.blade) {
    if (this.previous) return;
    // Clearing before a size/orientation/card change prevents hidden paint lanes from reappearing.
    this.cleanBlade();
    this.bladeWidth = Math.max(24, Math.min(240, Math.round(width)));
    this.angle = angle;
    this.blade = blade;
    this.updateEdgeProfile();
  }

  surfaceMass() { let sum = 0; for (let i = 3; i < this.pixels.length; i += 4) sum += this.pixels[i]; return sum; }
  carriedMass() { let sum = 0; for (let i = 3; i < this.carry.length; i += 4) sum += this.carry[i]; return sum; }
  totalMass() { return this.surfaceMass() + this.carriedMass() + this.discarded; }

  snapshot(): PaintSnapshot {
    return { pixels: this.pixels.slice(), carry: this.carry.slice(), discarded: this.discarded, bladeWidth: this.bladeWidth, angle: this.angle, blade: this.blade, wetSource: this.wetSource.slice(), ink: copyInk(this.ink) };
  }

  restore(snapshot: PaintSnapshot) {
    if (snapshot.pixels.length !== this.pixels.length || snapshot.carry.length !== this.carry.length) throw new Error('This painting has incompatible dimensions.');
    if (![...snapshot.carry].every(Number.isFinite) || !snapshot.pixels.every(Number.isFinite)) throw new Error('This painting contains invalid paint data.');
    if (snapshot.ink !== undefined && !validInk(snapshot.ink)) throw new Error('This painting contains invalid pen data.');
    this.ink.length = 0; this.ink.push(...copyInk(snapshot.ink ?? [])); this.inkRevision++;
    this.pixels.set(snapshot.pixels); this.carry.set(snapshot.carry);
    this.wetSource.fill(0);
    if (snapshot.wetSource?.length === this.wetSource.length) this.wetSource.set(snapshot.wetSource);
    else for (let lane = 0; lane < this.wetSource.length; lane++) this.wetSource[lane] = snapshot.carry[lane * 4 + 3] > .015 ? 1 : 0;
    this.discarded = snapshot.discarded; this.bladeWidth = snapshot.bladeWidth; this.angle = snapshot.angle; this.blade = snapshot.blade ?? 'flat'; this.updateEdgeProfile();
    this.endScrape(); this.dirty = { x: 0, y: 0, right: this.width, bottom: this.height };
  }

  clear() {
    this.ink.length = 0; this.inkRevision++;
    this.pixels.fill(0); this.carry.fill(0); this.discarded = 0; this.endScrape();
    this.wetSource.fill(0);
    this.dirty = { x: 0, y: 0, right: this.width, bottom: this.height };
  }
}

/** Bounded per-gesture history; snapshots include paint on the blade. */
export class PaintHistory {
  private past: PaintSnapshot[] = [];
  private future: PaintSnapshot[] = [];
  constructor(private engine: PaintEngine, private limit = 10) {}
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  checkpoint() { this.past.push(this.engine.snapshot()); if (this.past.length > this.limit) this.past.shift(); this.future = []; }
  undo() { const state = this.past.pop(); if (state) { this.future.push(this.engine.snapshot()); this.engine.restore(state); } }
  redo() { const state = this.future.pop(); if (state) { this.past.push(this.engine.snapshot()); this.engine.restore(state); } }
}
