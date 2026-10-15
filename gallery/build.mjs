// Writes gallery/index.html from the recipes: a grid of the paintings, each
// linking to its full-size PNG. How each was made stays in recipes.mjs.
//
//   node gallery/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recipes } from './recipes.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SITE = 'https://scrape.arccc.co';
const esc = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Every sheet is cut, tilted and taped a little differently, but the same
// way on every build: the randomness is seeded by the painting's id.
function random(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
const n = v => +v.toFixed(2);
// A paper edge: fibres up to ~1.8px deep, and the odd small nick.
function paperEdge(rand) {
  const depth = () => rand() < .06 ? 2 + rand() * 1.6 : .2 + rand() * 1.6;
  const pts = [];
  for (let t = 0; t < 100; t += 1.6 + rand() * 1.4) pts.push(`${n(t)}% ${n(depth())}px`);
  for (let t = 0; t < 100; t += 1.4 + rand() * 1.2) pts.push(`calc(100% - ${n(depth())}px) ${n(t)}%`);
  for (let t = 100; t > 0; t -= 1.6 + rand() * 1.4) pts.push(`${n(t)}% calc(100% - ${n(depth())}px)`);
  for (let t = 100; t > 0; t -= 1.4 + rand() * 1.2) pts.push(`${n(depth())}px ${n(t)}%`);
  return `polygon(${pts.join(', ')})`;
}
// A strip of masking tape: straight along its length, torn across each end.
function tapeEdge(rand) {
  const pts = [`${n(rand() * 3)}% 0%`, `${n(97 + rand() * 3)}% 0%`];
  for (let t = 12; t < 100; t += 12 + rand() * 10) pts.push(`${n(94 + rand() * 6)}% ${n(t)}%`);
  pts.push(`${n(97 + rand() * 3)}% 100%`, `${n(rand() * 3)}% 100%`);
  for (let t = 88; t > 0; t -= 12 + rand() * 10) pts.push(`${n(rand() * 6)}% ${n(t)}%`);
  return `polygon(${pts.join(', ')})`;
}
const sheets = recipes.map(r => {
  const rand = random(r.id);
  const tilt = n((rand() - .5) * 1.6), tapeTilt = n((rand() - .5) * 6), tapeX = n(44 + rand() * 12), tapeW = n(24 + rand() * 8);
  return `
          <a class="g-sheet" href="/gallery/${r.id}.png" style="--tilt: ${tilt}deg">
            <span class="g-paper" style="clip-path: ${paperEdge(rand)}"><img src="/gallery/${r.id}.webp" alt="${esc(r.title)}: ${esc(r.note)}" width="640" height="800" loading="lazy" /></span>
            <span class="g-tape" style="--tape-tilt: ${tapeTilt}deg; left: ${tapeX}%; width: ${tapeW}%; clip-path: ${tapeEdge(rand)}" aria-hidden="true"></span>
          </a>`;
}).join('');

const data = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Scrape art gallery',
  url: `${SITE}/gallery/`,
  description: 'Scrape art painted in Scrape, the free online scrape painting studio, each after a scrape art idea shared online.',
  hasPart: recipes.map(r => ({ '@type': 'ImageObject', name: r.title, description: r.note, contentUrl: `${SITE}/gallery/${r.id}.png`, thumbnailUrl: `${SITE}/gallery/${r.id}.webp`, creditText: 'Made in Scrape' })),
};

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#e9e3d7" />
    <title>Scrape art gallery: scrape painting ideas | Scrape</title>
    <meta name="description" content="Rainbow arcs, combed squiggles, rainbow cats, an ocean and more: scrape art painted in Scrape, the free online scrape painting studio." />
    <link rel="canonical" href="${SITE}/gallery/" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Scrape" />
    <meta property="og:url" content="${SITE}/gallery/" />
    <meta property="og:title" content="Scrape art gallery" />
    <meta property="og:description" content="Scrape art painted in Scrape: rainbow arcs, combed squiggles, a swirl, a sunset and more." />
    <meta property="og:image" content="${SITE}/gallery/${recipes[0].id}.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/favicon.ico" sizes="32x32" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DynaPuff:wght@600&amp;family=Nunito:wght@400..800&amp;display=swap" />
    <link rel="stylesheet" href="/src/guide.css" />
    <script type="application/ld+json">
${JSON.stringify(data, null, 2).replace(/^/gm, '      ')}
    </script>
  </head>
  <body>
    <!-- Written by gallery/build.mjs from gallery/recipes.mjs; edit those, not this. -->
    <header class="g-header">
      <a class="g-logo" href="/"><img src="/brand/logo/wordmark.svg" alt="Scrape" width="162" height="37" /></a>
      <a class="g-cta" href="/">Open the studio</a>
    </header>
    <main class="g-page">
      <h1 class="sr-only">Scrape art gallery</h1>
      <div class="g-sheets">${sheets}
      </div>
    </main>
  </body>
</html>
`;
fs.writeFileSync(path.join(here, 'index.html'), html);
console.log('wrote gallery/index.html with', recipes.length, 'paintings');
