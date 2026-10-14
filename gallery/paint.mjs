// Replays the gallery recipes in the real studio, with pointer and key input,
// and saves each painting through the studio's own download button.
//
//   npm install --no-save playwright-core
//   npm run dev                       # in another terminal
//   node gallery/paint.mjs [--url http://localhost:5173/] [--only rainbow-arc]
//   node gallery/paint.mjs --thumbs   # only remake the WebP previews
//
// Uses the Chrome installed on this machine (set CHROME to its path if it
// lives somewhere else). Each painting is saved to public/gallery/ as the
// studio's full-size PNG, with a smaller WebP beside it for the gallery page.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recipes } from './recipes.mjs';

const { chromium } = createRequire(import.meta.url)('playwright-core');

const arg = name => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const url = arg('url') ?? 'http://localhost:5173/', only = arg('only'), thumbsOnly = process.argv.includes('--thumbs');
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/gallery');
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: chrome, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
// A 640 × 800 WebP of a saved painting, encoded by the browser.
async function thumb(id) {
  const page = await browser.newPage();
  const png = fs.readFileSync(path.join(out, `${id}.png`)).toString('base64');
  const webp = await page.evaluate(async data => {
    const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 800;
    const context = canvas.getContext('2d'); context.imageSmoothingQuality = 'high'; context.drawImage(image, 0, 0, 640, 800);
    return canvas.toDataURL('image/webp', .86).split(',')[1];
  }, png);
  fs.writeFileSync(path.join(out, `${id}.webp`), Buffer.from(webp, 'base64'));
  await page.close();
}
for (const recipe of recipes.filter(r => !only || r.id === only)) {
  if (thumbsOnly) { await thumb(recipe.id); console.log('preview', recipe.id); continue; }
  const page = await browser.newPage({ viewport: { width: 1000, height: 1100 }, acceptDownloads: true });
  await page.addInitScript(() => { localStorage.clear(); localStorage.setItem('scrape:welcomed', '1'); });
  await page.goto(url);
  await page.locator('.dock-pen:not([disabled])').waitFor();
  const box = await page.locator('canvas.painting').boundingBox();
  const at = ([x, y]) => [box.x + box.width * x, box.y + box.height * y];
  const openSettings = async () => { if (await page.locator('.studio-dock').getAttribute('data-settings') === 'closed') await page.locator('.settings-toggle').click(); };
  // A colour input changes the way a picker would.
  const setColour = (label, hex) => page.locator(`input[aria-label="${label}"]`).evaluate((input, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true })); input.blur();
  }, hex);
  let card = 'flat';
  const chooseCard = async kind => { await page.keyboard.press('s'); await openSettings(); await page.locator(`.dock-choice[aria-label="${kind === 'comb' ? 'Comb' : 'Flat'} scraper"]`).click(); card = kind; };

  for (const step of recipe.steps) {
    if (step.squeeze) {
      const { colour, at: point, hold = 0, path: bead } = step.squeeze;
      await page.keyboard.press('p'); await openSettings();
      if (colour.startsWith('#')) await setColour('Choose a custom paint colour', colour);
      else await page.locator(`.dock-palette .paint-swatch[aria-label="Use ${colour} paint"]`).click();
      await page.mouse.move(...at(bead ? bead[0] : point)); await page.mouse.down();
      if (bead) for (const p of bead.slice(1)) { await page.mouse.move(...at(p)); await page.waitForTimeout(16); }
      if (hold) await page.waitForTimeout(hold);
      await page.mouse.up();
    } else if (step.wipe) {
      // Switching cards starts the new one clean; switch straight back.
      const kind = card; await chooseCard(kind === 'comb' ? 'flat' : 'comb'); await chooseCard(kind);
    } else if (step.pull) {
      const { card: kind = 'flat', angle = 0, steer = true, path: pts } = step.pull;
      if (kind !== card) await chooseCard(kind); else await page.keyboard.press('s');
      // ] turns the card 15° one way, [ the other.
      for (let turned = 0; turned < Math.abs(angle); turned += 15) await page.keyboard.press(angle > 0 ? ']' : '[');
      await page.mouse.move(...at(pts[0]));
      if (!steer) await page.keyboard.down('Shift');
      await page.mouse.down();
      for (const p of pts.slice(1)) await page.mouse.move(...at(p), { steps: 2 });
      await page.mouse.up();
      if (!steer) await page.keyboard.up('Shift');
    } else if (step.pen) {
      const { ink, width = 'thin', path: pts } = step.pen;
      await page.keyboard.press('n'); await openSettings();
      if (ink.startsWith('#')) await setColour('Choose a custom ink colour', ink);
      else await page.locator(`.ink-swatches .paint-swatch[aria-label="Use ${ink} ink"]`).click();
      await page.locator(`.dock-choice[aria-label="${width === 'thick' ? 'Thick' : 'Thin'} line"]`).click();
      await page.mouse.move(...at(pts[0])); await page.mouse.down();
      for (const p of pts.slice(1)) await page.mouse.move(...at(p), { steps: 2 });
      await page.mouse.up();
    }
  }
  await page.mouse.move(2, 2); await page.waitForTimeout(400);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.export-button').click()]);
  await download.saveAs(path.join(out, `${recipe.id}.png`));
  await thumb(recipe.id);
  console.log('painted', recipe.id);
  await page.close();
}
await browser.close();
