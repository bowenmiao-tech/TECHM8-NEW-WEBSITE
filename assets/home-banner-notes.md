# Homepage banners

Created with the built-in ImageGen tool on 2026-09-15. Optimized WebP files are mirrored in `public/assets/`.

- iPhone campaign artwork: `banner-home-iphone18-{480,720,1200,1536}.webp`. This is illustrative accessory artwork; the heading and link are real HTML in `index.html` so they scale clearly on mobile. CTA opens the existing online shop.
- PS5 banner: `banner-home-ps5-unified-{720,1024,1200,wide}.webp`. All variants use 8:3 framing, matching the existing monitor banner. Original artwork remains available.
- All carousel frames use the same 8:3 aspect ratio. Keep future flat banners at that ratio to prevent letterboxing or cropping.

## iPhone artwork prompt

Use case: ads-marketing. Asset type: TECHM8 phone accessories website banner artwork. Premium photorealistic studio still life of generic smartphone accessories: sculptural teal and frosted clear magnetic-ring phone cases, screen protector glass, braided USB-C cable and compact white charger. No phone device, no specific camera cutout claims. Dark deep petrol teal backdrop with soft mint rim lighting, elegant glossy podium, realistic materials. Landscape 3:2 composition, accessories grouped on the RIGHT half with generous clean dark negative space LEFT for HTML heading 'iPhone 18 accessories is here'. Do not render any text, logo, watermark or letters. Keep all objects within frame with breathing room. High-end retail campaign.

## PS5 reformat prompt

Edit this retail banner into a true ultrawide 8:3 (2048x768) homepage banner. Recompose all the existing content to fill the entire wide canvas edge to edge; not letterboxed. Preserve PlayStation logo, PLAY YOUR WAY heading, DualSense Wireless Controller text and the same five controller colors and faithful controller shapes. Large bold readable heading on left, five controllers grouped right, dark blue studio background and electric blue accent. Simplify by omitting the small feature icons and bottom feature strip so the hero message and products read at mobile sizes. Do not add other copy. Keep at least 4% safe margin around text. High-quality professional advertising.

## Validation

Checked all three slides at 320, 390, 768 and 1440 CSS pixel viewport widths: consistent frame heights, loaded responsive assets and no horizontal overflow. Updated critical CSS and minified shared assets. Keyboard focus pauses rotation and hidden slides are inert; reduced-motion preference disables automatic rotation.
