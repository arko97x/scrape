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
