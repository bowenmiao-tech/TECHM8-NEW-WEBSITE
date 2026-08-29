-- TECHM8: fill in product descriptions that are too short to be indexed.
--
-- Why: the prerender quality gate refuses to index a product page whose description
-- is under 40 characters, so 40 live products are currently missing from
-- sitemap-products.xml, the Google Merchant feed and every AI shopping surface.
--
-- Each description below is built only from data already in this table: the product
-- name, brand, category label, condition and the standard TECHM8 delivery terms.
-- No specification has been invented. Replace any of them with better hand-written
-- copy whenever you can - these are a floor, not a ceiling.
--
-- Run in the Supabase SQL editor, then run: npm run prerender
--
-- The WHERE clause re-checks the length so this is safe to re-run and will never
-- overwrite a description you have already improved.

begin;

update public.products
   set description = 'The Drone Map is part of the TECHM8 Drones & Accessories range. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-misc-8483-drone-map'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The Remax F23 Icying Series Bladeless Neckband Fan White is a Remax product in the TECHM8 Personal Fans range. Key details from the product listing: bladeless design, neckband wear, white colourway. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-10267-remax-f23-icying-series-bladeless-neckband-fan-white'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The Remax Portable Mini Handheld Fan F34 is a Remax product in the TECHM8 Personal Fans range. Key details from the product listing: handheld form. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-10266-remax-portable-mini-handheld-fan-f34'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The Remax F37 USB Fan is a Remax product in the TECHM8 Personal Fans range. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-10265-remax-f37-usb-fan'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The T-Wold S3 Speaker is a T-WOLF product in the TECHM8 Speakers range. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-computer-11064-t-wold-s3-speaker'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The WEKOME YB06 Wired Earphone USB-C in EAR is a WEKOME product in the TECHM8 Wired Earphones & Headphones range. Key details from the product listing: USB-C connection, in-ear fit, wired connection. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-10382-wekome-yb06-wired-earphone-usb-c-in-ear'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The WEKOME YB06 Wired Earphone Aux IN EAR is a WEKOME product in the TECHM8 Wired Earphones & Headphones range. Key details from the product listing: 3.5mm aux connection, in-ear fit, wired connection. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-10383-wekome-yb06-wired-earphone-aux-in-ear'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The WEKOME YB10 Wired Earphone Lighting IN EAR is a WEKOME product in the TECHM8 Wired Earphones & Headphones range. Key details from the product listing: in-ear fit, wired connection. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-10743-wekome-yb10-wired-earphone-lighting-in-ear'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The WEKOME YB09 Wired Earphone Lighting ON EAR is a WEKOME product in the TECHM8 Wired Earphones & Headphones range. Key details from the product listing: on-ear fit, wired connection. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-10744-wekome-yb09-wired-earphone-lighting-on-ear'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The USB-C WEKOME YB03 Wired Earphone is part of the TECHM8 Wired Earphones & Headphones range. Key details from the product listing: USB-C connection, wired connection. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-11069-usb-c-wekome-yb03-wired-earphone'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The AUX WEKOME YB03 Wired Earphone is part of the TECHM8 Wired Earphones & Headphones range. Key details from the product listing: 3.5mm aux connection, wired connection. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-11070-aux-wekome-yb03-wired-earphone'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The MagSafe Car Phone Holder is a Generic product in the TECHM8 Magnetic Mount. Universal smartphones. range. Key details from the product listing: MagSafe connection, in-car use. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'tm8-car-8154'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The MagSafe Silicone Phone Grip - Purple is part of the TECHM8 Wallets, Card Holders & Grips range. Key details from the product listing: MagSafe connection, purple colourway. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-misc-10857-magsafe-silicone-phone-grip-purple'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The Magnetic Dashboard and Air Vent Car Phone Holder is a Generic product in the TECHM8 Magnetic Mount. Universal smartphones. range. Key details from the product listing: in-car use. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'tm8-car-6660'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The 2M Stand Selfie Live Stream Stand is part of the TECHM8 Selfie Sticks & Live Stands range. Key details from the product listing: 2m cable length. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-9368-2m-stand-selfie-live-stream-stand'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The WEKOME Desktop Phone Holder is a WEKOME product in the TECHM8 Phone & Tablet Stands range. Key details from the product listing: desktop stand format. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-11201-wekome-desktop-phone-holder'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The Remax RM-C42 Pro Magnetic Rotating Zinc Alloy Car Mount is a Remax product in the TECHM8 Magnetic Mount. Universal smartphones. range. Key details from the product listing: in-car use. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'tm8-car-11126'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The MagSafe Card Wallet - Green is part of the TECHM8 Wallets, Card Holders & Grips range. Key details from the product listing: MagSafe connection, green colourway. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-misc-8038-magsafe-card-wallet-green'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The MagSafe Card Wallet - Orange is part of the TECHM8 Wallets, Card Holders & Grips range. Key details from the product listing: MagSafe connection. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-misc-8040-magsafe-card-wallet-orange'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The MagSafe Card Wallet - Navy is part of the TECHM8 Wallets, Card Holders & Grips range. Key details from the product listing: MagSafe connection. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-misc-8041-magsafe-card-wallet-navy'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The Bike Phone Holder Z02 + MT01 is a Generic product in the TECHM8 Bicycle Mount. Bicycle handlebars. range. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'tm8-car-10362'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The Magnetic Stick-On Car Phone Holder is a Generic product in the TECHM8 Magnetic Mount. Universal smartphones. range. Key details from the product listing: in-car use. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'tm8-car-9977'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The Magnetic Air Vent Hook Car Phone Holder is a Generic product in the TECHM8 Magnetic Mount. Universal smartphones. range. Key details from the product listing: in-car use. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'tm8-car-9976'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The Remax Selfie Stick Holder with Lights P60 is a Remax product in the TECHM8 Selfie Sticks & Live Stands range. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-11139-remax-selfie-stick-holder-with-lights-p60'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The C141 Desktop Mobile Phone Holder is part of the TECHM8 Phone & Tablet Stands range. Key details from the product listing: desktop stand format. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-10989-c141-desktop-mobile-phone-holder'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The Remax P10 Multifunctional Selfie Stick is a Remax product in the TECHM8 Selfie Sticks & Live Stands range. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-10924-remax-p10-multifunctional-selfie-stick'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The Remax RM-C60 Phone Stand is a Remax product in the TECHM8 Phone & Tablet Stands range. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-10264-remax-rm-c60-phone-stand'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The 2M Stand 8809 is part of the TECHM8 Selfie Sticks & Live Stands range. Key details from the product listing: 2m cable length. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-8867-2m-stand-8809'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The Remax P12 Multifunctional Selfie Stick is a Remax product in the TECHM8 Selfie Sticks & Live Stands range. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-6553-remax-p12-multifunctional-selfie-stick'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The Remax Alien Series Phone Holder Green is a Remax product in the TECHM8 Phone & Tablet Stands range. Key details from the product listing: green colourway. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-6181-remax-alien-series-phone-holder-green'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The Stander is part of the TECHM8 Phone & Tablet Stands range. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-6031-stander'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The Black Aluminium Adjustable Laptop Stand is part of the TECHM8 Laptop Stands range. Key details from the product listing: black colourway. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-6771-black-aluminium-adjustable-laptop-stand'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The Silver Aluminium Adjustable Laptop Stand is part of the TECHM8 Laptop Stands range. Key details from the product listing: silver colourway. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-accessory-6770-silver-aluminium-adjustable-laptop-stand'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The MagSafe Stand Wallet - Black is part of the TECHM8 Wallets, Card Holders & Grips range. Key details from the product listing: MagSafe connection, black colourway. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-misc-10888-magsafe-stand-wallet-black'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The MagSafe Silicone Phone Grip - Pink is part of the TECHM8 Wallets, Card Holders & Grips range. Key details from the product listing: MagSafe connection, pink colourway. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-misc-10856-magsafe-silicone-phone-grip-pink'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The MagSafe Silicone Phone Grip - Sky Blue is part of the TECHM8 Wallets, Card Holders & Grips range. Key details from the product listing: MagSafe connection, blue colourway. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-misc-10855-magsafe-silicone-phone-grip-sky-blue'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The MagSafe Silicone Phone Grip - Black is part of the TECHM8 Wallets, Card Holders & Grips range. Key details from the product listing: MagSafe connection, black colourway. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-misc-10854-magsafe-silicone-phone-grip-black'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The MagSafe Multi-Wallet - Brown is part of the TECHM8 Wallets, Card Holders & Grips range. Key details from the product listing: MagSafe connection. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-misc-10853-magsafe-multi-wallet-brown'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The MagSafe Multi-Wallet - Black is part of the TECHM8 Wallets, Card Holders & Grips range. Key details from the product listing: MagSafe connection, black colourway. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-misc-10852-magsafe-multi-wallet-black'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

update public.products
   set description = 'The MagSafe Multi-Wallet - Grey is part of the TECHM8 Wallets, Card Holders & Grips range. Key details from the product listing: MagSafe connection, grey colourway. Sold as brand new. Order online for Australia-wide delivery, or collect free from the TECHM8 stores at Park Ridge, Fairfield, Toowong, North Lakes and Brassall in Queensland. Prices are in Australian dollars and include GST.'
 where slug = 'repairdesk-misc-10851-magsafe-multi-wallet-grey'
   and coalesce(length(regexp_replace(coalesce(description, ''), '<[^>]*>', ' ', 'g')), 0) < 40;

commit;
