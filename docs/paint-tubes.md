# Paint tube assets

Generated with the built-in imagegen tool on 13 October 2026.
The project asset is `public/tools/paint-tubes-overhead.png` (1536 × 1024, RGBA).

The single atlas keeps all seven tubes in one photographic setup. `Tube` in
`src/tools.tsx` clips each sprite without resampling the source image and aligns
every nozzle with the same cursor hotspot. The seventh, neutral tube receives a
multiply colour band for custom pigments; this retains the photographed paper
texture. The pigment sent to the engine remains the selected hex value.

The camera looks straight down at tubes lying flat on the desk. In-plane
rotations add a little variation without introducing an isometric camera.
Upper-left highlights are part of the image; contact and lifted shadows are CSS.

## Final generation prompt

Use case: product-mockup. Asset type: ONE transparent PNG sprite atlas for a tactile browser art desk. Create a premium photorealistic product-photography atlas with exactly SEVEN small, slightly used aluminium artist acrylic paint tubes, positioned in a precise FOUR COLUMN by TWO ROW grid of equal cells, eighth bottom-right cell EMPTY. No objects overlap their cells. The canvas should be landscape, 1536 by 1024 or equivalent 3:2 aspect ratio. Order top row left to right: buttery ochre yellow (#dfb84f), muted tomato red (#c55c43), dusty rose (#d99092), lake teal (#649295). Bottom row left to right: moss green (#7a8963), ink blue-black (#344c5a), warm white neutral tube for custom colours, empty. ALL seven tubes lie FLAT on the SAME horizontal plane, camera exactly overhead looking straight down, orthographic flat-lay, NO front-facing upright tubes, NO isometric tilt or perspective foreshortening. Each tube is vertical within its cell, sealed flattened CRIMPED TAIL at TOP, broad soft squeezed aluminium BODY in middle, rounded conical SHOULDERS near BOTTOM tapering into a SHORT exposed THREADED NOZZLE at BOTTOM. NO CAP on nozzle. Realistic folded crimp, softly dented silver metal foil, uneven squeeze creases, fine material detail. Each tube has a restrained cream paper label wrapped around central body with a broad stripe in its specified pigment colour and tiny elegant exact lowercase word 'scrape' in dark charcoal above the stripe. No other text or logos. Mostly silver foil with paper label, NOT a rigid plastic bottle, NOT a pouch, NOT a cylindrical vial. For the seventh neutral tube, the colour stripe is white, label can be left completely blank. Identical photographic scale and identical vertical orientation in all seven cells, with modest individually different foil dents. Tubes have approximately 1:3.3 width:height proportions. All tips and tails fit comfortably inside cells with 12% clear padding. Soft large studio light from upper left consistent across every tube, realistic muted metal highlights, no harsh black outline. Truly transparent background, preserve alpha, no table, no checkerboard baked into artwork, NO cast shadows baked into image (we add those in CSS), no extra elements, no decorative composition. High-end artist's studio objects, tactile lifelike material and accurate overhead perspective. This is a production sprite atlas, NOT a webpage mockup.
