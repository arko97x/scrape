// How each gallery painting was made in the Scrape studio, step by step.
// gallery/paint.mjs replays these with real pointer and key input.
//
// Positions are fractions of the paper: [0, 0] is the top-left corner and
// [1, 1] the bottom-right. `how` says the same in words, for the gallery page. Paint and ink are the studio's named colours or,
// where a picture needed one the studio doesn't name, a custom hex colour.
//
//   squeeze  press the tube on the paper: `hold` ms in one place grows a
//            dollop; a `path` drags it into a bead of paint
//   wipe     wipe the scraper clean, by switching cards and back
//   pull     drag the scraper card along `path`; `card` is flat or comb,
//            `angle` turns it first (in 15° steps, either way), and `steer: false`
//            holds Shift so a curved drag doesn't turn the card
//   pen      draw a line in `ink` at `width` (thin or thick)

const line = (x0, y0, x1, y1, n = 40) => Array.from({ length: n + 1 }, (_, i) => [x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]);
// An arc round (cx, cy), from one angle to another in degrees (0 = right, 90 = down).
const arc = (cx, cy, rx, ry, from, to, n = 60) => Array.from({ length: n + 1 }, (_, i) => { const a = (from + (to - from) * i / n) * Math.PI / 180; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
// A sideways wave from x0 to x1 about the height y.
const wave = (x0, x1, y, amp, waves, n = 60) => Array.from({ length: n + 1 }, (_, i) => [x0 + (x1 - x0) * i / n, y + amp * Math.sin(i / n * waves * Math.PI * 2)]);
// A row of dollops: [colour, x] pairs at height y, each held `hold` ms.
const row = (y, dots, hold = 600) => dots.map(([colour, x, h]) => ({ squeeze: { colour, at: [x, y], hold: h ?? hold } }));
// A column of dollops: [colour, y] pairs at x.
const column = (x, dots, hold = 600) => dots.map(([colour, y, h]) => ({ squeeze: { colour, at: [x, y], hold: h ?? hold } }));
// A small circle, for pen bubbles.
const ring = (cx, cy, r, n = 18) => arc(cx, cy, r, r * .8, 0, 360, n);
const join = (...paths) => paths.flat();
// A small filled dot for the pen: a tight spiral.
const dot = (cx, cy, r = .01) => Array.from({ length: 25 }, (_, i) => { const a = i / 24 * Math.PI * 6, k = 1 - i / 24; return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * .8]; });

const ORANGE = '#e0873a', VIOLET = '#7b5d9e', SKY = '#9cc3cf', CREAM = '#f5f1e5';
const PINK = '#e38bb5', PURPLE = '#9b6dc4', BLUE = '#5e97d6', LEMON = '#ecd04a', GREEN = '#8cc56a';

// A cat: a row of one colour pulled straight down from its head to the
// bottom of the paper, two small dollops above for ears, and a pen face.
// `eyes` is 'open', 'closed' (happy arcs) or 'lashes'.
function cat(cx, top, colour, eyes = 'open', bottom = .96) {
  const fy = top + .085, pen = (path, width = 'thin') => ({ pen: { ink: 'dark', width, path } });
  const eye = side => {
    const x = cx + side * .036;
    if (eyes === 'closed') return [pen(arc(x, fy + .004, .016, .012, 200, 340, 10))];
    const out = [pen(dot(x, fy, .009), 'thick')];
    if (eyes === 'lashes') out.push(pen(arc(x, fy, .02, .018, 210, 330, 10)), pen(line(x, fy - .018, x, fy - .028, 3)));
    return out;
  };
  return [
    // Ears first, above where the card will start, so the pull leaves them be.
    { squeeze: { colour, at: [cx - .072, top - .03], hold: 240 } },
    { squeeze: { colour, at: [cx + .072, top - .03], hold: 240 } },
    ...row(top, [-.08, -.04, 0, .04, .08].map(dx => [colour, cx + dx]), 720),
    { wipe: true },
    { pull: { card: 'flat', steer: false, path: line(cx, top - .008, cx, bottom, 50) } },
    // Ear centres, a nose, a mouth and three whiskers a side.
    pen(join(line(cx - .084, top - .022, cx - .072, top - .042, 3), line(cx - .072, top - .042, cx - .06, top - .022, 3))),
    pen(join(line(cx + .06, top - .022, cx + .072, top - .042, 3), line(cx + .072, top - .042, cx + .084, top - .022, 3))),
    ...eye(-1), ...eye(1),
    pen([[cx - .013, fy + .026], [cx + .013, fy + .026], [cx, fy + .04], [cx - .013, fy + .026]], 'thick'),
    pen([[cx - .034, fy + .05], [cx - .017, fy + .062], [cx, fy + .044], [cx + .017, fy + .062], [cx + .034, fy + .05]]),
    ...[-1, 1].flatMap(side => [0, 1, 2].map(k => pen(line(cx + side * .03, fy + .032 + k * .01, cx + side * .095, fy + .02 + k * .022, 4)))),
  ];
}

export const recipes = [
  {
    id: 'rainbow-arc',
    title: 'Rainbow arc',
    inspiredBy: { name: 'The Artful Parent: rainbow scraper art', url: 'https://artfulparent.com/rainbows-scraper-art-for-kids/' },
    note: 'Dots of paint in rainbow order along the bottom half of the paper, dragged into an arc with one pull.',
    how: [
      "Squeezed six dollops in a row near the bottom left, holding the tube about 0.65 s for each: Tomato, orange (#e0873a), Butter, Moss, Lake and violet (#7b5d9e).",
      "Pulled the flat card from just below the row straight up, round in a half circle and back down the right side, letting the card steer with the curve.",
      "No pen.",
    ],
    steps: [
      ...row(.72, [['Tomato', .315], [ORANGE, .345], ['Butter', .375], ['Moss', .405], ['Lake', .435], [VIOLET, .465]], 650),
      { pull: { card: 'flat', path: join(line(.39, .78, .39, .5, 24), arc(.6, .5, .21, .3, 180, 360, 70), line(.81, .5, .81, .8, 24)) } },
    ],
  },
  {
    id: 'rainbow-hi',
    title: 'Rainbow letters',
    inspiredBy: { name: 'Handmade Charlotte: DIY rainbow paint scrape art', url: 'https://www.handmadecharlotte.com/68630/' },
    note: 'Each stroke of the letters is one straight pull through a row of pink, orange, yellow, blue and violet; the crossbar is pulled sideways with the card turned upright.',
    how: [
      "Squeezed a row of five dollops, Rose, orange (#e0873a), Butter, Lake and violet (#7b5d9e), and pulled the flat card straight down through them for the H’s left leg, holding Shift so the card stayed level.",
      "Wiped the card, squeezed the same five colours again and pulled the right leg.",
      "Squeezed the five colours in a column between the legs, turned the card upright with six presses of ], and pulled it sideways for the crossbar.",
      "Wiped the card and pulled one more stripe for the I.",
      "No pen.",
    ],
    steps: [
      ...row(.24, [['Rose', .17], [ORANGE, .2], ['Butter', .23], ['Lake', .26], [VIOLET, .29]], 520),
      { pull: { card: 'flat', steer: false, path: line(.23, .2, .23, .76) } },
      { wipe: true },
      ...row(.24, [['Rose', .55], [ORANGE, .58], ['Butter', .61], ['Lake', .64], [VIOLET, .67]], 520),
      { pull: { card: 'flat', steer: false, path: line(.61, .2, .61, .76) } },
      { wipe: true },
      ...column(.3, [['Rose', .43], [ORANGE, .46], ['Butter', .49], ['Lake', .52], [VIOLET, .55]], 440),
      { pull: { card: 'flat', angle: 90, steer: false, path: line(.27, .49, .55, .49, 30) } },
      { wipe: true },
      ...row(.24, [['Rose', .78], [ORANGE, .81], ['Butter', .84], ['Lake', .87], [VIOLET, .9]], 520),
      { pull: { card: 'flat', steer: false, path: line(.84, .2, .84, .76) } },
    ],
  },
  {
    id: 'ocean',
    title: 'Ocean',
    inspiredBy: { name: 'The Education Hub: scrape painting with young children', url: 'https://theeducationhub.org.nz/?p=31215' },
    note: 'Three bands of sea pulled sideways in waves, the card turned upright and steered along each wave, then a fish and bubbles drawn on top with the pen.',
    how: [
      "Squeezed a column of four dollops at the left edge, pale blue (#9cc3cf), cream (#f5f1e5), Lake and pale blue, turned the card upright and pulled it across in a wave, letting it steer.",
      "Wiped the card and did the same twice lower down: Lake, Ink, Lake and cream, then Ink, Lake, Ink and Moss, each band with its own wave.",
      "Drew a fish with the thick pen in tomato ink, gave it a cream eye, and added three bubbles with the thin pen in cream.",
    ],
    steps: [
      ...column(.1, [[SKY, .3], [CREAM, .33, 420], ['Lake', .36], [SKY, .39]], 560),
      { pull: { card: 'flat', angle: 90, path: wave(.08, .95, .345, .025, 1.5) } },
      { wipe: true },
      ...column(.1, [['Lake', .48], ['Ink', .51, 480], ['Lake', .54], [CREAM, .57, 380]], 560),
      { pull: { card: 'flat', angle: 90, path: wave(.08, .95, .525, .03, 1.2) } },
      { wipe: true },
      ...column(.1, [['Ink', .66], ['Lake', .69], ['Ink', .72, 480], ['Moss', .75, 420]], 560),
      { pull: { card: 'flat', angle: 90, path: wave(.08, .95, .705, .022, 1.8) } },
      { pen: { ink: 'tomato', width: 'thick', path: join(arc(.62, .53, .06, .03, 200, 340, 18), arc(.62, .53, .06, .03, 20, 160, 18), [[.56, .54], [.53, .51], [.53, .56], [.56, .53]]) } },
      { pen: { ink: 'cream', width: 'thick', path: ring(.665, .525, .006, 10) } },
      ...[[.72, .47, .012], [.75, .42, .009], [.77, .38, .006]].map(([x, y, r]) => ({ pen: { ink: 'cream', width: 'thin', path: ring(x, y, r) } })),
    ],
  },
  {
    id: 'comb-squiggles',
    title: 'Comb squiggles',
    inspiredBy: { name: 'Tulip Color: credit card paint technique', url: 'https://tulipcolor.com/blogs/techniques/credit-card-paint-technique' },
    note: 'Dabs of paint pulled from top to bottom with the comb in squiggles, so the colours stand up in ridges that wiggle down the page.',
    how: [
      "Squeezed three rows of four dollops across the top: Tomato, Butter, Rose and Lake; Ink, Butter, cream (#f5f1e5) and Lake; Moss, Rose, Butter and Tomato.",
      "Switched to the comb and pulled it down through each row in a squiggle, holding Shift so it stayed level while the path wiggled, and wiped it between rows.",
      "No pen.",
    ],
    steps: [
      ...row(.13, [['Tomato', .2], ['Butter', .23], ['Rose', .26], ['Lake', .29]], 620),
      { pull: { card: 'comb', steer: false, path: Array.from({ length: 61 }, (_, i) => [.245 + .05 * Math.sin(i / 60 * Math.PI * 4), .1 + .8 * i / 60]) } },
      { wipe: true },
      ...row(.13, [['Ink', .46], ['Butter', .49], [CREAM, .52], ['Lake', .55]], 620),
      { pull: { card: 'comb', steer: false, path: Array.from({ length: 61 }, (_, i) => [.505 + .06 * Math.sin(i / 60 * Math.PI * 3), .1 + .8 * i / 60]) } },
      { wipe: true },
      ...row(.13, [['Moss', .71], ['Rose', .74], ['Butter', .77], ['Tomato', .8]], 620),
      { pull: { card: 'comb', steer: false, path: Array.from({ length: 61 }, (_, i) => [.755 + .045 * Math.sin(i / 60 * Math.PI * 5), .1 + .8 * i / 60]) } },
    ],
  },
  {
    id: 'swirl',
    title: 'Swirl',
    inspiredBy: { name: 'Tulip Color: credit card paint technique', url: 'https://tulipcolor.com/blogs/techniques/credit-card-paint-technique' },
    note: 'One row of paint pulled round and round in a curl that tightens towards the middle; the card steers with the curve the whole way.',
    how: [
      "Squeezed six dollops in a row near the top: Lake, Butter, Tomato, Rose, cream (#f5f1e5) and Butter.",
      "Pulled the flat card down a little, then round and round in a curl that tightens towards the middle, letting the card steer with the curve.",
      "No pen.",
    ],
    steps: [
      ...row(.18, [['Lake', .4], ['Butter', .43], ['Tomato', .46], ['Rose', .49], [CREAM, .52, 420], ['Butter', .55]], 640),
      { pull: { card: 'flat', path: join(line(.475, .13, .475, .2, 6), Array.from({ length: 121 }, (_, i) => { const t = i / 120, a = (-90 + 470 * t) * Math.PI / 180, r = .3 - .2 * t; return [.5 + Math.cos(a) * r * .95 - .025, .5 + Math.sin(a) * r * .76 + .05]; })) } },
    ],
  },
  {
    id: 'sunset',
    title: 'Sunset hills',
    inspiredBy: { name: 'Fine Art Tutorials: sunset painting', url: 'https://finearttutorials.com/?p=12569' },
    note: 'Bands of sky pulled sideways from yellow at the top through orange and pink to violet, a sun squeezed in a spiral, then dark hills pulled across in a gentle wave.',
    how: [
      "Pulled three bands of sky across the paper, top to bottom, each from a column of four dollops at the left edge with the card turned upright: Butter and cream (#f5f1e5); orange (#e0873a), Tomato and Rose; then Rose and violet (#7b5d9e).",
      "Squeezed the sun in Butter as a bead, dragging the tube round in a tight spiral so it builds up into a round disc.",
      "Pulled two bands of hills across in gentle waves, from Moss and Ink, letting the card steer.",
      "Drew two birds with the thin pen in dark ink.",
    ],
    steps: [
      ...column(.07, [['Butter', .1], [CREAM, .13, 380], ['Butter', .16], [ORANGE, .19]], 600),
      { pull: { card: 'flat', angle: 90, steer: false, path: line(.05, .145, .95, .145, 50) } },
      { wipe: true },
      ...column(.07, [[ORANGE, .27], ['Tomato', .3], ['Rose', .33], [ORANGE, .36]], 600),
      { pull: { card: 'flat', angle: 90, steer: false, path: line(.05, .315, .95, .315, 50) } },
      { wipe: true },
      ...column(.07, [['Rose', .44], [VIOLET, .47], ['Rose', .5, 420], [VIOLET, .53]], 600),
      { pull: { card: 'flat', angle: 90, steer: false, path: line(.05, .485, .95, .485, 50) } },
      // The sun: a bead squeezed in a tight spiral, bigger than one held dollop can grow.
      { squeeze: { colour: 'Butter', path: Array.from({ length: 61 }, (_, i) => { const a = i / 60 * Math.PI * 6, r = .045 * (1 - i / 60) + .006; return [.68 + Math.cos(a) * r, .37 + Math.sin(a) * r * .8]; }), hold: 400 } },
      { wipe: true },
      ...column(.07, [['Moss', .62], ['Ink', .65], ['Moss', .68], ['Ink', .71]], 640),
      { pull: { card: 'flat', angle: 90, path: wave(.05, .95, .665, .035, .9) } },
      { wipe: true },
      ...column(.07, [['Ink', .78], ['Moss', .81, 480], ['Ink', .84], ['Ink', .87]], 640),
      { pull: { card: 'flat', angle: 90, path: wave(.05, .95, .825, .03, 1.3) } },
      // Two birds, each a pair of shallow arcs.
      { pen: { ink: 'dark', width: 'thin', path: join(arc(.25, .245, .025, .02, 200, 330, 8), arc(.3, .245, .025, .02, 210, 340, 8)) } },
      { pen: { ink: 'dark', width: 'thin', path: join(arc(.34, .205, .018, .015, 200, 330, 8), arc(.376, .205, .018, .015, 210, 340, 8)) } },
    ],
  },
  {
    id: 'rainbow-cats',
    title: 'Rainbow cats',
    inspiredBy: { name: 'A rainbow cats painting shared with us (source unknown)', url: null },
    note: 'Five tall cats, each one row of a single colour pulled straight down from its head to the bottom of the paper, two small dollops for ears, and faces drawn with the pen. The front cats are pulled over the back ones, the card scraping the back paint away so each sits cleanly in front.',
    how: [
      "Painted the three back cats first, pink (#e38bb5), blue (#5e97d6) and lemon (#ecd04a): for each, two small dollops held 0.24 s for the ears, then a row of five dollops of the same colour held 0.72 s each across the head.",
      "Wiped the card and pulled it straight down from the head to the bottom of the paper, holding Shift so it stayed level. The dollops' rounded tops became the head.",
      "Painted the two front cats the same way, purple (#9b6dc4) and green (#8cc56a), pulled down over the back cats; the card scrapes the back paint away, so they sit cleanly in front.",
      "Drew every face with the pen in dark ink: thin triangles in the ears, dot eyes with the thick nib (closed, smiling arcs for the blue cat and lashes for the lemon one), a thick triangle nose, a w-shaped mouth and three whiskers a side.",
    ],
    steps: [
      ...cat(.17, .17, PINK, 'open'),
      ...cat(.48, .27, BLUE, 'closed'),
      ...cat(.81, .23, LEMON, 'lashes'),
      ...cat(.29, .4, PURPLE, 'open'),
      ...cat(.65, .56, GREEN, 'open'),
    ],
  },
];
