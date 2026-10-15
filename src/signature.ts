// Signs a painting in its bottom-right corner, the way a painter would. A
// painting with no name stays unsigned.
const FAMILY = 'Mrs Saint Delafield';
let fontReady: Promise<void> | null = null;
function loadFont() {
  return fontReady ??= Promise.all([
    ['latin', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
    ['latin-ext', 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF'],
  ].map(async ([subset, unicodeRange]) => {
    const face = new FontFace(FAMILY, `url(/fonts/mrs-saint-delafield-${subset}.woff2) format('woff2')`, { unicodeRange });
    document.fonts.add(await face.load());
  })).then(() => undefined, failure => { fontReady = null; throw failure; });
}

// The same tidy-up the gallery server gives a name.
export const signatureName = (name: string) => name.trim().replace(/\s+/gu, ' ');

export async function signPainting(painting: Blob, name: string): Promise<Blob> {
  const signature = signatureName(name);
  if (!signature) return painting;
  await loadFont();
  const image = await createImageBitmap(painting);
  const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
  const context = canvas.getContext('2d')!;
  context.drawImage(image, 0, 0); image.close();
  // Sized to the sheet (64px on the 960px export), smaller for a long name.
  const unit = canvas.width / 960, margin = 34 * unit, widest = canvas.width * .46;
  let size = 64 * unit;
  context.font = `${size}px "${FAMILY}", cursive`;
  const width = context.measureText(signature).width;
  if (width > widest) { size *= widest / width; context.font = `${size}px "${FAMILY}", cursive`; }
  context.textAlign = 'right'; context.textBaseline = 'alphabetic';
  const x = canvas.width - margin, y = canvas.height - margin;
  // A faint pale halo keeps the ink readable over dark paint.
  context.lineJoin = 'round'; context.lineWidth = 5 * unit; context.strokeStyle = 'rgba(255, 252, 244, .5)';
  context.strokeText(signature, x, y);
  context.fillStyle = '#26301f'; context.fillText(signature, x, y);
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not sign this painting.')), 'image/png'));
}
