# Scrape

A browser playground for squeezing paint and pulling a squeegee across textured paper.

```sh
npm install
npm run dev -- --port 5174
```

Open the Local address Vite prints. For tablets on the same Wi-Fi, use its Network address.

The studio is at `/`. A repeatable animated swipe inspired by the acrylic references is at `/reference.html`. The study uses the same engine and renderer as the studio and doesn't alter the saved studio painting.

## Checks

```sh
npm test
npm run build
```

## Current material model

Paint has a finite volume and a height field. The blade picks up paint, moves it sideways under compression, and deposits a thin ribbon with thicker free shoulders. Neighbouring colours mix only where pigment is transferred. Paint stays workable between gestures. This is an approximation tuned to the supplied scrape-painting references, not a calibrated acrylic rheology solver.

Paint transport runs on the CPU at 480 × 600; WebGL 2 shades the paper, paint height, and edge ridges. Undo includes paint carried on the blade. The studio saves locally in IndexedDB and exports at 960 × 1200. The border mask is fixed; additional tape placement and the marker remain future checkpoints.

Mixbox © Secret Weapons supplies pigment mixing under CC BY-NC 4.0. This prototype is non-commercial; commercial use requires revisiting that dependency's licence. Attribution is also available through “made for making” in the studio.
