// Stable material variation: the same sheet and pointer path produce the same
// result. No frame-based randomness is added to the artwork.
export function materialHash(x: number, y: number, salt = 0): number {
  let value = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ salt;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

export function materialNoise(x: number, y: number, salt = 0): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = materialHash(ix, iy, salt), b = materialHash(ix + 1, iy, salt);
  const c = materialHash(ix, iy + 1, salt), d = materialHash(ix + 1, iy + 1, salt);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

export function paperResistance(x: number, y: number): number {
  return .86 + .27 * materialNoise(x / 29, y / 19, 1409)
    + .07 * (materialHash(x, y, 491) - .5);
}

export function bladeContact(lane: number, distance: number): number {
  const edge = .90 + .19 * materialNoise(lane / 2.7, 0, 301);
  const flex = .91 + .18 * materialNoise(lane / 13, distance / 34, 953);
  return edge * flex;
}
