// Measured against the straight lower lip of the flat rubber card.
// Cursor width is corrected for its transparent margins so the visible
// working edge, rather than the image bounds, matches the simulated blade.
export const squeegeeGeometry = {
  width: 1536,
  height: 1024,
  bladeLeft: 104,
  bladeRight: 1432,
  contactY: 902,
  edgeThickness: 26,
} as const;
export const squeegeeWidthScale = squeegeeGeometry.width / (squeegeeGeometry.bladeRight - squeegeeGeometry.bladeLeft);
export const squeegeeAnchor = `${squeegeeGeometry.contactY / squeegeeGeometry.height * 100}%`;

// Directly overhead, a card perpendicular to the paper shows only its
// rubber thickness (~2% of its width), with parallel edges and no face skew.
// Its upper boundary stays on the simulated contact line.

// A comb card: teeth at both ends of the blade, with notches between them.
// Positions are fractions of the working edge so the simulated lanes and the
// drawn notches always agree, whatever the blade width.
export type BladeKind = 'flat' | 'comb';
export const comb = { teeth: 14, toothShare: .6 } as const;
const toothSpan = comb.toothShare / (comb.teeth * comb.toothShare + (comb.teeth - 1) * (1 - comb.toothShare));
const gapSpan = toothSpan * (1 - comb.toothShare) / comb.toothShare;

/** The notches between teeth, as [from, to] fractions of the edge. */
export const combGaps: [number, number][] = Array.from({ length: comb.teeth - 1 }, (_, index) => {
  const from = index * (toothSpan + gapSpan) + toothSpan;
  return [from, from + gapSpan];
});
