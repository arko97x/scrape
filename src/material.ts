// Optical coverage is separate from height: a thin pigmented acrylic film can
// still cover paper. Tests use the same half-coverage threshold as the renderer.
export const PIGMENT_ABSORPTION = 240;
export const VISIBLE_FILM_HEIGHT = Math.LN2 / PIGMENT_ABSORPTION;
