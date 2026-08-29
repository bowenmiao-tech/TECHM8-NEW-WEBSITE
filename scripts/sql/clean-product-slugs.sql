-- TECHM8: remove the POS import prefix from product slugs.
--
-- Why: 34 products carry a slug like
-- "repairdesk-accessory-10266-remax-portable-mini-handheld-fan-f34". The
-- "repairdesk-<type>-<id>-" prefix is internal POS bookkeeping. It pushes the real
-- keywords out of the URL and leaks the POS vendor name into search results.
--
-- Safety notes:
--   * Google Merchant Center item ids come from SKU, not slug, so feed items keep
--     their identity and do not need re-approval.
--   * scripts/product-slug-redirects.json already maps every old slug to the new
--     one. After this runs, "npm run prerender" writes a canonical + meta-refresh
--     stub at each old URL, so existing links and rankings are carried over.
--   * Run this BEFORE the next prerender, then run: npm run prerender
--
-- Each statement checks the old slug still exists, so this is safe to re-run.

begin;

update public.products
   set slug = 'drone-map'
 where slug = 'repairdesk-misc-8483-drone-map';

update public.products
   set slug = 'remax-f23-icying-series-bladeless-neckband-fan-white'
 where slug = 'repairdesk-accessory-10267-remax-f23-icying-series-bladeless-neckband-fan-white';

update public.products
   set slug = 'remax-portable-mini-handheld-fan-f34'
 where slug = 'repairdesk-accessory-10266-remax-portable-mini-handheld-fan-f34';

update public.products
   set slug = 'remax-f37-usb-fan'
 where slug = 'repairdesk-accessory-10265-remax-f37-usb-fan';

update public.products
   set slug = 't-wold-s3-speaker'
 where slug = 'repairdesk-computer-11064-t-wold-s3-speaker';

update public.products
   set slug = 'wekome-yb06-wired-earphone-usb-c-in-ear'
 where slug = 'repairdesk-accessory-10382-wekome-yb06-wired-earphone-usb-c-in-ear';

update public.products
   set slug = 'wekome-yb06-wired-earphone-aux-in-ear'
 where slug = 'repairdesk-accessory-10383-wekome-yb06-wired-earphone-aux-in-ear';

update public.products
   set slug = 'wekome-yb10-wired-earphone-lighting-in-ear'
 where slug = 'repairdesk-accessory-10743-wekome-yb10-wired-earphone-lighting-in-ear';

update public.products
   set slug = 'wekome-yb09-wired-earphone-lighting-on-ear'
 where slug = 'repairdesk-accessory-10744-wekome-yb09-wired-earphone-lighting-on-ear';

update public.products
   set slug = 'usb-c-wekome-yb03-wired-earphone'
 where slug = 'repairdesk-accessory-11069-usb-c-wekome-yb03-wired-earphone';

update public.products
   set slug = 'aux-wekome-yb03-wired-earphone'
 where slug = 'repairdesk-accessory-11070-aux-wekome-yb03-wired-earphone';

update public.products
   set slug = 'magsafe-silicone-phone-grip-purple'
 where slug = 'repairdesk-misc-10857-magsafe-silicone-phone-grip-purple';

update public.products
   set slug = '2m-stand-selfie-live-stream-stand'
 where slug = 'repairdesk-accessory-9368-2m-stand-selfie-live-stream-stand';

update public.products
   set slug = 'wekome-desktop-phone-holder'
 where slug = 'repairdesk-accessory-11201-wekome-desktop-phone-holder';

update public.products
   set slug = 'magsafe-card-wallet-green'
 where slug = 'repairdesk-misc-8038-magsafe-card-wallet-green';

update public.products
   set slug = 'magsafe-card-wallet-orange'
 where slug = 'repairdesk-misc-8040-magsafe-card-wallet-orange';

update public.products
   set slug = 'magsafe-card-wallet-navy'
 where slug = 'repairdesk-misc-8041-magsafe-card-wallet-navy';

update public.products
   set slug = 'remax-selfie-stick-holder-with-lights-p60'
 where slug = 'repairdesk-accessory-11139-remax-selfie-stick-holder-with-lights-p60';

update public.products
   set slug = 'c141-desktop-mobile-phone-holder'
 where slug = 'repairdesk-accessory-10989-c141-desktop-mobile-phone-holder';

update public.products
   set slug = 'remax-p10-multifunctional-selfie-stick'
 where slug = 'repairdesk-accessory-10924-remax-p10-multifunctional-selfie-stick';

update public.products
   set slug = 'remax-rm-c60-phone-stand'
 where slug = 'repairdesk-accessory-10264-remax-rm-c60-phone-stand';

update public.products
   set slug = '2m-stand-8809'
 where slug = 'repairdesk-accessory-8867-2m-stand-8809';

update public.products
   set slug = 'remax-p12-multifunctional-selfie-stick'
 where slug = 'repairdesk-accessory-6553-remax-p12-multifunctional-selfie-stick';

update public.products
   set slug = 'remax-alien-series-phone-holder-green'
 where slug = 'repairdesk-accessory-6181-remax-alien-series-phone-holder-green';

update public.products
   set slug = 'stander'
 where slug = 'repairdesk-accessory-6031-stander';

update public.products
   set slug = 'black-aluminium-adjustable-laptop-stand'
 where slug = 'repairdesk-accessory-6771-black-aluminium-adjustable-laptop-stand';

update public.products
   set slug = 'silver-aluminium-adjustable-laptop-stand'
 where slug = 'repairdesk-accessory-6770-silver-aluminium-adjustable-laptop-stand';

update public.products
   set slug = 'magsafe-stand-wallet-black'
 where slug = 'repairdesk-misc-10888-magsafe-stand-wallet-black';

update public.products
   set slug = 'magsafe-silicone-phone-grip-pink'
 where slug = 'repairdesk-misc-10856-magsafe-silicone-phone-grip-pink';

update public.products
   set slug = 'magsafe-silicone-phone-grip-sky-blue'
 where slug = 'repairdesk-misc-10855-magsafe-silicone-phone-grip-sky-blue';

update public.products
   set slug = 'magsafe-silicone-phone-grip-black'
 where slug = 'repairdesk-misc-10854-magsafe-silicone-phone-grip-black';

update public.products
   set slug = 'magsafe-multi-wallet-brown'
 where slug = 'repairdesk-misc-10853-magsafe-multi-wallet-brown';

update public.products
   set slug = 'magsafe-multi-wallet-black'
 where slug = 'repairdesk-misc-10852-magsafe-multi-wallet-black';

update public.products
   set slug = 'magsafe-multi-wallet-grey'
 where slug = 'repairdesk-misc-10851-magsafe-multi-wallet-grey';

commit;

-- Verify: this should return zero rows afterwards.
-- select slug from public.products where slug like 'repairdesk-%';
