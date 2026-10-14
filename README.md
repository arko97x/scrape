# Scrape

A browser playground for squeezing paint and pulling a squeegee across textured paper.

```sh
npm install
npm run dev -- --port 5174
```

Open the Local address Vite prints. For tablets on the same Wi-Fi, use its Network address.

The studio is at `/`. A repeatable animated swipe inspired by the acrylic references is at `/reference.html`. The study uses the same engine and renderer as the studio and doesn't alter the saved studio painting.

The picked-up tube visibly squeezes paint through its nozzle into the mound or
drawn bead. Its short connection stretches and pinches off on release, leaving
a small residue. The opening squeeze arrives progressively over 100 ms; taps
still deliver their full paint quantity. Reduced motion keeps the flow cue
without tube compression or the travelling highlight. A frame-by-frame check
and repeatable squeeze/drag live at `/tests/fixtures/dispense-check.html`; they do
not load or save the studio painting.

The pen (N) draws fixed-width, round-ended ink strokes in a separate layer.
Choose its colour and width in the settings bar above the tool dock. Ink stays put under the scraper,
does not grow on a held contact, and is included in undo/redo, local saves and
PNG export. P selects paint; S selects the scraper. The selected width stays
constant for mouse, finger and stylus.
An isolated ink-width, held-dot, tape-margin and PNG check is available at
`/tests/fixtures/pen-check.html`.

The floating dock keeps paint, pen, scraper and undo/redo together. Selecting a
tool opens its settings; clicking the selected tool again, or the chevron, tucks
them away without moving the paper. Arrow keys navigate the dock; Enter or Space
selects a tool. Escape closes settings and returns focus to the selected tool.
Mouse hover labels include P/N/S shortcuts. Short lifts and fades provide
feedback; keyboard shortcuts are immediate and reduced motion removes travel.

A first visit opens a three-step welcome. Each step taps its tool in a
miniature dock, pans up to a small sheet and runs the real paint engine to
show squeezing, scraping, and the pen with undo. The
info button opens About, with the story, a colophon, and a way back to the
welcome.

The scraper comes as a flat card or a comb. The comb pushes a bead of paint
ahead of it and extrudes it through its notches as continuous raised ridges,
while its teeth pull thin grooves between them. Like the flat card, it keeps
laying paint for as long as its load lasts.

The card turns to any angle, and keeps its paint as it turns. On touch, two
fingers hold its ends: the card sits between them and turns as they do, and
holding one finger still while the other sweeps round swings a fan. With a
mouse, trackpad or stylus, the path steers: the card keeps the angle it made
with the direction of the pull, so straight pulls stay straight and curves turn
it with them. Hold Shift to keep its angle through a curve. Scrolling over the
paper turns the card, in the air or mid-pull, and [ and ] turn it by 15°. Turn
switches it between level and upright, also keeping its paint. Choosing another
card starts it clean.

Every pull starts level. Whatever angle a pull ends at, lifting the card turns
it back to 0°, so an angle set by scrolling, [ ], or Turn applies to the next
pull only.

## Checks

```sh
npm test
npm run build
```

## Current material model

Paint has a finite volume and a height field. The blade picks up paint, moves it sideways under compression, and deposits a thin ribbon with thicker free shoulders. Neighbouring colours mix only where pigment is transferred. Paint stays workable between gestures. This is an approximation tuned to the supplied scrape-painting references, not a calibrated acrylic rheology solver.

Paint transport runs on the CPU at 480 × 600; WebGL 2 shades the paper, paint height, and edge ridges. Undo includes paint carried on the blade. The studio saves locally in IndexedDB and exports at 960 × 1200. The border mask is fixed; additional tape placement remains a future checkpoint.

Mixbox © Secret Weapons supplies pigment mixing under CC BY-NC 4.0. This prototype is non-commercial; commercial use requires revisiting that dependency's licence. Attribution is also available from the info button in the studio dock.
