import type { PaintEngine } from './engine';

export type BladePaintBand = { from: number; to: number; colour: string; opacity: number };

/** Display the carried pigment at its actual position along the blade edge. */
export function bladePaint(engine: Pick<PaintEngine, 'carry' | 'bladeWidth'>): BladePaintBand[] {
  const bands: BladePaintBand[] = [];
  for (let lane = 0; lane < engine.bladeWidth; lane++) {
    const at = lane * 4, amount = engine.carry[at + 3];
    const opacity = Math.round((1 - Math.exp(-Math.max(0, amount) * 24)) * 100) / 100;
    if (!opacity) continue;
    const channel = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 255);
    const colour = `rgb(${channel(engine.carry[at])}, ${channel(engine.carry[at + 1])}, ${channel(engine.carry[at + 2])})`;
    const from = lane / engine.bladeWidth, to = (lane + 1) / engine.bladeWidth;
    const previous = bands[bands.length - 1];
    if (previous && previous.to === from && previous.colour === colour && previous.opacity === opacity) previous.to = to;
    else bands.push({ from, to, colour, opacity });
  }
  return bands;
}
