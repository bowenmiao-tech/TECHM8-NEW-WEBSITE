# Homepage banners

Created with the built-in ImageGen tool on 2026-09-15. Optimized WebP files are mirrored in `public/assets/`.

- Corrected iPhone campaign artwork: `banner-home-iphone18-pro-v2-{480,720,1200,1536}.webp`. Pro and Pro Max device geometry is based on Apple official reference photos. The artwork shows clear cases and a USB-C cable; no mains charger or plug. The heading and link are real HTML in `index.html` so they scale clearly on mobile. CTA opens the existing online shop. Earlier generic artwork is superseded.
- PS5 banner: `banner-home-ps5-unified-{720,1024,1200,wide}.webp`. All variants use 8:3 framing, matching the existing monitor banner. Original artwork remains available.
- All carousel frames use the same 8:3 aspect ratio. Keep future flat banners at that ratio to prevent letterboxing or cropping.

## Original iPhone artwork prompt (superseded)

Use case: ads-marketing. Asset type: TECHM8 phone accessories website banner artwork. Premium photorealistic studio still life of generic smartphone accessories: sculptural teal and frosted clear magnetic-ring phone cases, screen protector glass, braided USB-C cable and compact white charger. No phone device, no specific camera cutout claims. Dark deep petrol teal backdrop with soft mint rim lighting, elegant glossy podium, realistic materials. Landscape 3:2 composition, accessories grouped on the RIGHT half with generous clean dark negative space LEFT for HTML heading 'iPhone 18 accessories is here'. Do not render any text, logo, watermark or letters. Keep all objects within frame with breathing room. High-end retail campaign.

## PS5 reformat prompt

Edit this retail banner into a true ultrawide 8:3 (2048x768) homepage banner. Recompose all the existing content to fill the entire wide canvas edge to edge; not letterboxed. Preserve PlayStation logo, PLAY YOUR WAY heading, DualSense Wireless Controller text and the same five controller colors and faithful controller shapes. Large bold readable heading on left, five controllers grouped right, dark blue studio background and electric blue accent. Simplify by omitting the small feature icons and bottom feature strip so the hero message and products read at mobile sizes. Do not add other copy. Keep at least 4% safe margin around text. High-quality professional advertising.

## Corrected Pro / Pro Max artwork prompt

Generated with built-in ImageGen using these official device references:
- https://www.apple.com/au/iphone-18-pro/
- https://www.apple.com/v/iphone-18-pro/a/images/overview/product-viewer/3d_viewer__hgotqf9hvvee_large.jpg
- https://www.apple.com/v/iphone-18-pro/a/images/overview/product-viewer/color_burgundy__f95it7a6dnyq_large.jpg

Use case: ads-marketing. Generate a photorealistic TECHM8 accessories campaign image, landscape 3:2. The two attached Apple official photos are STRICT DEVICE GEOMETRY REFERENCES, not layout references. Show TWO rear-facing iPhone 18 Pro / Pro Max devices fitted inside premium transparent protective cases, one burgundy smaller Pro and one silver larger Pro Max. Preserve the EXACT reference rear camera architecture: broad horizontal rounded rectangular raised camera plateau spanning almost the whole phone width across the TOP; three large black circular lenses in triangular layout on the LEFT (two vertically at left edge, third midway to their right); small flash upper RIGHT, small black sensor lower RIGHT. NOT a narrow vertical camera hole, NOT an older small square camera island. Clear case has ONE FULL-WIDTH HORIZONTAL camera opening around this entire wide plateau, white magnetic ring lower down on the back. Devices rear-facing with mild three-quarter angle and recognizable reference proportions. A neatly coiled braided USB-C to USB-C cable in foreground. NO wall charger, NO power adapter, NO mains plug, NO prongs, NO screen protector, NO text, NO logos, NO watermark. Premium dark petrol teal studio background and mint rim light on low black stone podium. Group objects in RIGHT 60% with left 40% empty dark space. All devices fully within frame. Faithful industrial design, no invented lens positions.

## Validation

Checked all three slides at 320, 390, 768 and 1440 CSS pixel viewport widths: consistent frame heights, loaded responsive assets and no horizontal overflow. Updated critical CSS and minified shared assets. Keyboard focus pauses rotation and hidden slides are inert; reduced-motion preference disables automatic rotation.
