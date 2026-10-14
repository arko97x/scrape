import mixbox from 'mixbox';
import type { Colour } from './engine';

export const rgb = (hex: string) => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255] as Colour;
export const pigmentBlend = (a: Colour, b: Colour, t: number): Colour => mixbox.lerp(a.map(v => v * 255), b.map(v => v * 255), t).map(v => v / 255) as Colour;
