# Rubber scraper card

Generated with the built-in imagegen tool on 13 October 2026. Project asset:
`public/tools/rubber-card-overhead.png` (1536 × 1024, transparent RGBA).

The card matches the paint tubes' overhead camera and upper-left light. The
source is clean; the live coating comes only from the engine's carried pigment.
The shared `Squeegee` component supplies the resting tool, picked-up tool and
reference animation. Geometry in `src/squeegee-geometry.ts` calibrates the
straight working lip to the engine's width and pointer position, excluding the
image's transparent margins and rounded corners. Contact shadows are CSS.

The card lies flat only in the tray. When picked up, it stands perpendicular to
the paper. The directly overhead camera sees only its narrow rubber thickness,
with parallel edges, rounded ends, a satin bevel and fine grain rendered in SVG.
No broad face or perspective trapezoid is visible. The strip is about 2% of the
blade width; its upper boundary stays anchored to the simulated contact line.
Carried paint sits near the paper on the hidden lower face, so it is not drawn
over the elevated top edge. The flat tray pose reveals the stained face. This
visibility change does not alter paint pickup, transfer or wiping in the engine.

## Working-pose image

An earlier experiment, `public/tools/rubber-card-working.png` (1536 × 1024, transparent RGBA), was made
with the built-in imagegen edit tool, referencing the resting card. Its rendered
pose is retained as a source experiment; the active tool now uses the perpendicular
SVG profile described above rather than compressing this face photograph.

### Working-pose prompt

Use case: precise-object-edit. Edit target: the provided clean yellow rubber scraper card. Create a separate working-pose image of EXACTLY THE SAME card: preserve its mustard-yellow rubber colour, fine matte grain, softly rounded corners, worn satin material, tiny scuffs, 2-3 mm thickness, and the soft UPPER-LEFT lighting. Change ONLY the physical pose and projection. The camera still looks straight down at the paper plane. The artist has now picked the card up and tilted it steeply, approximately 72-76 degrees to the paper, holding its UPPER long edge against the paper with the card body leaning DOWNWARDS in the image toward the person holding it. The projected outline must be a SHALLOW SKEWED TRAPEZOID: the TOP edge is long, perfectly straight and horizontal, and is the PAINT-CONTACT edge. The lower edge is visibly shorter (about 80 percent of the upper edge), displaced down by only about 18 percent of the upper edge's length, and shifted slightly to the RIGHT by about 3 percent of that length. Thus both sides slope inward; the skew is subtle, physically plausible perspective. ALL of the card's face extends BELOW this wide top working edge. Nothing projects above the top contact edge except its tiny rubber bevel. This is a raised, leaning real rubber CARD viewed from above, NOT a card lying flat on the paper, NOT an almost invisible edge-on line, NOT a front-facing upright rectangle. The shape must visibly read as a shallow trapezoid with material depth. A thin darker rubber bevel along the top working lip and a soft brighter bevel on the raised lower edge make the inclination clear. Match material and lighting to the supplied image; photorealistic product rendering, not flat polygon clip art. Landscape 1536x1024 transparent canvas; place the top working edge near y=350, from approximately x=95 to x=1440; the narrower lower edge should be near y=600. Comfortable transparent padding, all of the face BELOW the top edge, no cast shadow baked in, no surface or paper. Truly transparent background, preserve alpha. One tool only; no hands, handles, wood, metal, screws, text, logos, or coloured paint marks. The app will add the actual carried paint at the TOP contact edge.

## Final generation prompt

Use case: product-mockup. Asset type: ONE photorealistic transparent PNG cutout for a browser acrylic-paint scraping studio. Primary request: a FLAT FLEXIBLE RUBBER SCRAPER CARD, like the small yellow flat card artists hold between fingers to scrape acrylic paint. This is a simple broad rectangular piece of rubber, absolutely NO handle, NO stem, NO T shape, NO metal rail, NO screws, NO wooden parts. Landscape 1536x1024 image. One muted warm mustard-yellow / ochre rubber card, landscape orientation, approximately 1.6:1 width:height, sized to occupy about 90% of the image width and 82% of its height, centred. The LOWER horizontal working edge is straight and parallel to the image's bottom edge; the top two corners are softly rounded and the lower corners have smaller rounded bevels. The card lies completely FLAT on the same horizontal plane as a painter's desk. Camera looks STRAIGHT DOWN, exactly perpendicular to the card face, orthographic flat-lay product photography. Absolutely no front-facing upright pose, no isometric angle, no perspective foreshortening, no diagonal rotation. Thin dense rubber, approximately 2-3 mm thick, with believable tiny edge bevels, fine matte rubber grain, subtly rubbed surface patches, very restrained moulding traces and a couple of hairline surface scuffs. A softly tactile satin rubber face with natural broad tonal variation, not a flat solid vector rectangle. The material has faint light transmission only at the very thin edge, while the main card remains opaque. Clean unpainted face and clean lower working edge: NO coloured paint, NO rainbow, NO stains (actual paint is added dynamically by the app). NO writing, no logo, no holes, no printed marks. A consistent large soft studio key light from the UPPER LEFT, gentle natural self-shading at rounded bevels, muted highlights, enough material texture to read as realistic rubber alongside photorealistic dented aluminium paint tubes. Truly transparent background; preserve alpha. No surface, no table, no background, no checkerboard baked in, no cast shadow baked in (CSS will provide shadows), no hands, no fingers, no other objects. Entire card visible with comfortable transparent padding. A believable practical artist's scraping tool, simple, quietly beautiful, absolutely a rubber CARD rather than a conventional handled squeegee.
