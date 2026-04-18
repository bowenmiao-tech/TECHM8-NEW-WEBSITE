-- Add MacBook charger products and expand gallery images for selected products.
-- Run this in Supabase SQL Editor, then run the updated sync-product-images function once.

insert into public.categories (slug, name, description, sort_order)
values
  ('macbook-chargers', 'MacBook Chargers', 'Replacement Apple laptop chargers, MagSafe adapters and USB-C charging kits.', 25)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.suppliers (name, website_url, notes)
select
  'TECHM8 Australia Website',
  'https://www.techm8australia.com/macbookcharger',
  'Public retail catalog data captured from TECHM8 website pages.'
where not exists (
  select 1
  from public.suppliers
  where name = 'TECHM8 Australia Website'
);

with charger_source as (
  select *
  from (
    values
      (
        'TM8-MAC-M1-85W',
        'brand-new-85w-magsafe-1-power-adapter-for-macbook-pro-six-months-warranty',
        '85W MagSafe 1 Power Adapter for MacBook Pro',
        'Apple Compatible',
        '85W MagSafe 1',
        'Replacement 85W MagSafe 1 charger for MacBook Pro models.',
        'Replacement 85W MagSafe 1 power adapter for compatible MacBook Pro models. Includes charging cable and is listed on the public TECHM8 retail catalog.',
        'New',
        'MacBook Pro · MagSafe 1',
        45.00::numeric,
        null::numeric,
        'https://static.wixstatic.com/media/ff60a8_82c47b57c47c4e35848e4cf0fbbc13d3~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg',
        'https://www.techm8australia.com/product-page/brand-new-85w-magsafe-1-power-adapter-for-macbook-pro-six-months-warranty',
        '85W MagSafe 1 Power Adapter for MacBook Pro | TECHM8',
        'Buy a replacement 85W MagSafe 1 power adapter for compatible MacBook Pro models from TECHM8.'
      ),
      (
        'TM8-MAC-M1-60W',
        'brand-new-60w-magsafe-1-power-adapter-for-macbook-air-and-macbook-pro',
        '60W MagSafe 1 Power Adapter for MacBook Air and MacBook Pro',
        'Apple Compatible',
        '60W MagSafe 1',
        'Replacement 60W MagSafe 1 charger for MacBook Air and selected MacBook Pro models.',
        'Replacement 60W MagSafe 1 power adapter for compatible MacBook Air and MacBook Pro models. Captured from the public TECHM8 retail catalog.',
        'New',
        'MacBook Air / MacBook Pro · MagSafe 1',
        45.00::numeric,
        null::numeric,
        'https://static.wixstatic.com/media/ff60a8_9393ed8d4111498e82effd5f2cddf721~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg',
        'https://www.techm8australia.com/product-page/brand-new-60w-magsafe-1-power-adapter-for-macbook-air-and-macbook-pro',
        '60W MagSafe 1 Power Adapter for MacBook Air and MacBook Pro | TECHM8',
        'Buy a replacement 60W MagSafe 1 power adapter for MacBook Air and MacBook Pro from TECHM8.'
      ),
      (
        'TM8-MAC-M1-45W',
        'copy-of-brand-new-45w-magsafe-1-power-adapter-for-macbook-air-six-months-warranty',
        '45W MagSafe 1 Power Adapter for MacBook Air',
        'Apple Compatible',
        '45W MagSafe 1',
        'Replacement 45W MagSafe 1 charger for MacBook Air models.',
        'Replacement 45W MagSafe 1 power adapter for compatible MacBook Air models. Captured from the public TECHM8 retail catalog.',
        'New',
        'MacBook Air · MagSafe 1',
        45.00::numeric,
        null::numeric,
        'https://static.wixstatic.com/media/ff60a8_e3b938a0776f4ddc8d5bb5dc0b0cc415~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg',
        'https://www.techm8australia.com/product-page/copy-of-brand-new-45w-magsafe-1-power-adapter-for-macbook-air-six-months-warranty',
        '45W MagSafe 1 Power Adapter for MacBook Air | TECHM8',
        'Buy a replacement 45W MagSafe 1 power adapter for MacBook Air from TECHM8.'
      ),
      (
        'TM8-MAC-USBC-87W',
        'new-87w-usb-c-macbook-charger-iphone-charger-with-cable-six-months-warranty',
        '87W USB-C MacBook Charger with Cable',
        'Apple Compatible',
        '87W USB-C',
        'Replacement 87W USB-C charger with cable for MacBook models.',
        'Replacement 87W USB-C MacBook charger with cable for compatible Apple laptops and USB-C devices, listed on the public TECHM8 catalog.',
        'New',
        'MacBook Pro · USB-C',
        65.00::numeric,
        null::numeric,
        'https://static.wixstatic.com/media/ff60a8_fc23e3fdda774c7ba40336b6cac8826e~mv2.png/v1/fit/w_500,h_500,q_90/file.png',
        'https://www.techm8australia.com/product-page/new-87w-usb-c-macbook-charger-iphone-charger-with-cable-six-months-warranty',
        '87W USB-C MacBook Charger with Cable | TECHM8',
        'Buy a replacement 87W USB-C MacBook charger with cable from TECHM8.'
      ),
      (
        'TM8-MAC-USBC-61W',
        'new-61w-usb-c-macbook-charger-iphone-charger-with-cable-six-months-warranty',
        '61W USB-C MacBook Charger with Cable',
        'Apple Compatible',
        '61W USB-C',
        'Replacement 61W USB-C charger with cable for MacBook Air and MacBook Pro models.',
        'Replacement 61W USB-C MacBook charger with cable for compatible Apple laptops and USB-C devices, listed on the public TECHM8 catalog.',
        'New',
        'MacBook Air / MacBook Pro · USB-C',
        55.00::numeric,
        null::numeric,
        'https://static.wixstatic.com/media/ff60a8_3c2acc8d32554ee397f2b10cc22c6afe~mv2.png/v1/fit/w_500,h_500,q_90/file.png',
        'https://www.techm8australia.com/product-page/new-61w-usb-c-macbook-charger-iphone-charger-with-cable-six-months-warranty',
        '61W USB-C MacBook Charger with Cable | TECHM8',
        'Buy a replacement 61W USB-C MacBook charger with cable from TECHM8.'
      ),
      (
        'TM8-MAC-USBC-30W',
        'new-30w-usb-c-macbook-charger-iphone-charger-with-cable-six-months-warranty',
        '30W USB-C MacBook Charger with Cable',
        'Apple Compatible',
        '30W USB-C',
        'Replacement 30W USB-C charger with cable for MacBook and iPhone charging.',
        'Replacement 30W USB-C charger with cable for compatible Apple devices, listed on the public TECHM8 catalog.',
        'New',
        'MacBook Air / iPhone / USB-C',
        50.00::numeric,
        null::numeric,
        'https://static.wixstatic.com/media/ff60a8_a6f80139c7714ebfac0e2803bd3dc645~mv2.png/v1/fit/w_500,h_500,q_90/file.png',
        'https://www.techm8australia.com/product-page/new-30w-usb-c-macbook-charger-iphone-charger-with-cable-six-months-warranty',
        '30W USB-C MacBook Charger with Cable | TECHM8',
        'Buy a replacement 30W USB-C charger with cable from TECHM8.'
      ),
      (
        'TM8-MAC-M2-85W',
        '85w-magsafe-2-power-adapter-for-macbook-pro-with-retina-display-six-months-wa',
        '85W MagSafe 2 Power Adapter for MacBook Pro with Retina Display',
        'Apple Compatible',
        '85W MagSafe 2',
        'Replacement 85W MagSafe 2 charger for Retina MacBook Pro models.',
        'Replacement 85W MagSafe 2 power adapter for Retina MacBook Pro models. Captured from the public TECHM8 retail catalog.',
        'New',
        'MacBook Pro Retina · MagSafe 2',
        50.00::numeric,
        null::numeric,
        'https://static.wixstatic.com/media/ff60a8_fb6323cc9b89460ab40c019182b43f5b~mv2.png/v1/fit/w_500,h_500,q_90/file.png',
        'https://www.techm8australia.com/product-page/85w-magsafe-2-power-adapter-for-macbook-pro-with-retina-display-six-months-wa',
        '85W MagSafe 2 Power Adapter for Retina MacBook Pro | TECHM8',
        'Buy a replacement 85W MagSafe 2 power adapter for Retina MacBook Pro from TECHM8.'
      ),
      (
        'TM8-MAC-M2-60W',
        '60w-magsafe-2-power-adapter-macbook-pro-with-13-inch-retina-display-six-mont',
        '60W MagSafe 2 Power Adapter for MacBook Air and MacBook Pro',
        'Apple Compatible',
        '60W MagSafe 2',
        'Replacement 60W MagSafe 2 charger for MacBook Air and selected Retina MacBook Pro models.',
        'Replacement 60W MagSafe 2 power adapter for compatible MacBook Air and Retina MacBook Pro models. Captured from the public TECHM8 retail catalog.',
        'New',
        'MacBook Air / MacBook Pro Retina · MagSafe 2',
        50.00::numeric,
        null::numeric,
        'https://static.wixstatic.com/media/ff60a8_116f8c2c7d9d4ad4b605474063149b85~mv2.png/v1/fit/w_500,h_500,q_90/file.png',
        'https://www.techm8australia.com/product-page/60w-magsafe-2-power-adapter-macbook-pro-with-13-inch-retina-display-six-mont',
        '60W MagSafe 2 Power Adapter for MacBook Air and MacBook Pro | TECHM8',
        'Buy a replacement 60W MagSafe 2 power adapter for MacBook Air and MacBook Pro from TECHM8.'
      ),
      (
        'TM8-MAC-M2-45W',
        'new-45w-magsafe-2-power-adapter-for-macbook-air-six-months-warranty',
        '45W MagSafe 2 Power Adapter for MacBook Air',
        'Apple Compatible',
        '45W MagSafe 2',
        'Replacement 45W MagSafe 2 charger for MacBook Air models.',
        'Replacement 45W MagSafe 2 power adapter for compatible MacBook Air models. Captured from the public TECHM8 retail catalog.',
        'New',
        'MacBook Air · MagSafe 2',
        50.00::numeric,
        null::numeric,
        'https://static.wixstatic.com/media/ff60a8_39ba1cbcb8b2404081090867ff7c631e~mv2.png/v1/fit/w_500,h_500,q_90/file.png',
        'https://www.techm8australia.com/product-page/new-45w-magsafe-2-power-adapter-for-macbook-air-six-months-warranty',
        '45W MagSafe 2 Power Adapter for MacBook Air | TECHM8',
        'Buy a replacement 45W MagSafe 2 power adapter for MacBook Air from TECHM8.'
      )
  ) as t (
    sku,
    slug,
    name,
    brand,
    model,
    short_description,
    description,
    condition_label,
    compatibility,
    retail_price,
    compare_at_price,
    first_image_url,
    supplier_product_url,
    seo_title,
    seo_description
  )
)
insert into public.products (
  sku,
  slug,
  name,
  brand,
  model,
  category_id,
  supplier_id,
  short_description,
  description,
  condition_label,
  compatibility,
  retail_price,
  compare_at_price,
  image_url,
  supplier_image_url,
  supplier_product_url,
  stock_quantity,
  min_order_quantity,
  is_featured,
  is_visible,
  seo_title,
  seo_description
)
select
  source.sku,
  source.slug,
  source.name,
  source.brand,
  source.model,
  category_row.id,
  supplier_row.id,
  source.short_description,
  source.description,
  source.condition_label,
  source.compatibility,
  source.retail_price,
  source.compare_at_price,
  source.first_image_url,
  source.first_image_url,
  source.supplier_product_url,
  0,
  1,
  false,
  true,
  source.seo_title,
  source.seo_description
from charger_source source
cross join lateral (
  select id from public.categories where slug = 'macbook-chargers'
) category_row
cross join lateral (
  select id from public.suppliers where name = 'TECHM8 Australia Website' limit 1
) supplier_row
on conflict (sku) do update
set
  slug = excluded.slug,
  name = excluded.name,
  brand = excluded.brand,
  model = excluded.model,
  category_id = excluded.category_id,
  supplier_id = excluded.supplier_id,
  short_description = excluded.short_description,
  description = excluded.description,
  condition_label = excluded.condition_label,
  compatibility = excluded.compatibility,
  retail_price = excluded.retail_price,
  compare_at_price = excluded.compare_at_price,
  image_url = excluded.image_url,
  supplier_image_url = excluded.supplier_image_url,
  supplier_product_url = excluded.supplier_product_url,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  is_visible = excluded.is_visible;

with controller_updates as (
  select *
  from (
    values
      ('TM8-PS5-DS-STERLING-SILVER', 115.00::numeric, 124.00::numeric, 'https://www.techm8australia.com/product-page/dualsense-wireless-controller-sterling-silver-playstation-5', 'https://static.wixstatic.com/media/ff60a8_44b8629acec14e089b265c9c134f3dcd~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-COSMIC-RED', 109.00::numeric, 119.95::numeric, 'https://www.techm8australia.com/product-page/dualsense-wireless-controller-cosmic-red-playstation-5', 'https://static.wixstatic.com/media/ff60a8_3d6c59b7f9844dce9cddba30391438aa~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-GRAY-CAMO', 109.00::numeric, 119.95::numeric, 'https://www.techm8australia.com/product-page/dualsense-wireless-controller-gray-camouflage', 'https://static.wixstatic.com/media/ff60a8_e970ca83b1cb486aaae98a2172e07cbc~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-BLACK', 109.00::numeric, 119.95::numeric, 'https://www.techm8australia.com/product-page/copy-of-dualsense-wireless-controller-playstation-5-black', 'https://static.wixstatic.com/media/ff60a8_8b5310c0258a420ea7f0e18e943a501d~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-WHITE', 109.00::numeric, 119.95::numeric, 'https://www.techm8australia.com/product-page/dualsense-wireless-controller-playstation-5-white', 'https://static.wixstatic.com/media/ff60a8_997f0a93bc8e4b9a907efb21027b37f0~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg')
  ) as t (sku, retail_price, compare_at_price, supplier_product_url, first_image_url)
)
update public.products as products
set
  retail_price = updates.retail_price,
  compare_at_price = updates.compare_at_price,
  supplier_product_url = updates.supplier_product_url,
  supplier_image_url = updates.first_image_url,
  image_url = updates.first_image_url
from controller_updates as updates
where products.sku = updates.sku;

with gallery_source as (
  select *
  from (
    values
      ('TM8-MAC-M1-85W', 0, 'https://static.wixstatic.com/media/ff60a8_82c47b57c47c4e35848e4cf0fbbc13d3~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-M1-85W', 1, 'https://static.wixstatic.com/media/ff60a8_cb25dbbec0e041d091534f8b67994793~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-M1-60W', 0, 'https://static.wixstatic.com/media/ff60a8_9393ed8d4111498e82effd5f2cddf721~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-M1-60W', 1, 'https://static.wixstatic.com/media/ff60a8_cb25dbbec0e041d091534f8b67994793~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-M1-45W', 0, 'https://static.wixstatic.com/media/ff60a8_e3b938a0776f4ddc8d5bb5dc0b0cc415~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-M1-45W', 1, 'https://static.wixstatic.com/media/ff60a8_cb25dbbec0e041d091534f8b67994793~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-USBC-87W', 0, 'https://static.wixstatic.com/media/ff60a8_fc23e3fdda774c7ba40336b6cac8826e~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-USBC-87W', 1, 'https://static.wixstatic.com/media/ff60a8_01270e17ceb0461a97f52417a817d297~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-USBC-61W', 0, 'https://static.wixstatic.com/media/ff60a8_3c2acc8d32554ee397f2b10cc22c6afe~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-USBC-61W', 1, 'https://static.wixstatic.com/media/ff60a8_576f43941adf4b33893c85972c80fe74~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-USBC-30W', 0, 'https://static.wixstatic.com/media/ff60a8_a6f80139c7714ebfac0e2803bd3dc645~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-USBC-30W', 1, 'https://static.wixstatic.com/media/ff60a8_339c920136d94845a88eac5ed75f737b~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-M2-85W', 0, 'https://static.wixstatic.com/media/ff60a8_fb6323cc9b89460ab40c019182b43f5b~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-M2-85W', 1, 'https://static.wixstatic.com/media/ff60a8_cb25dbbec0e041d091534f8b67994793~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-M2-60W', 0, 'https://static.wixstatic.com/media/ff60a8_116f8c2c7d9d4ad4b605474063149b85~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-M2-60W', 1, 'https://static.wixstatic.com/media/ff60a8_cb25dbbec0e041d091534f8b67994793~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-M2-45W', 0, 'https://static.wixstatic.com/media/ff60a8_39ba1cbcb8b2404081090867ff7c631e~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-M2-45W', 1, 'https://static.wixstatic.com/media/ff60a8_cb25dbbec0e041d091534f8b67994793~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-STERLING-SILVER', 0, 'https://static.wixstatic.com/media/ff60a8_44b8629acec14e089b265c9c134f3dcd~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-STERLING-SILVER', 1, 'https://static.wixstatic.com/media/ff60a8_c12a09563972465d8bb2885b5c7fd3f3~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-STERLING-SILVER', 2, 'https://static.wixstatic.com/media/ff60a8_83ed55bd7c2f43eebc7a6dcdf024bc18~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-STERLING-SILVER', 3, 'https://static.wixstatic.com/media/ff60a8_50adc098d4e140148de53e22255cbd85~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-COSMIC-RED', 0, 'https://static.wixstatic.com/media/ff60a8_3d6c59b7f9844dce9cddba30391438aa~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-COSMIC-RED', 1, 'https://static.wixstatic.com/media/ff60a8_fe58f9e9a961475e84ee19ae5f866a12~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-GRAY-CAMO', 0, 'https://static.wixstatic.com/media/ff60a8_e970ca83b1cb486aaae98a2172e07cbc~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-GRAY-CAMO', 1, 'https://static.wixstatic.com/media/ff60a8_ddaf2f2fce8f4fe395afbf54247c972a~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-GRAY-CAMO', 2, 'https://static.wixstatic.com/media/ff60a8_606559554bd544408840943b8356fe2f~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-GRAY-CAMO', 3, 'https://static.wixstatic.com/media/ff60a8_cc60f866f0df48d7994dd15fb2bc0227~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-BLACK', 0, 'https://static.wixstatic.com/media/ff60a8_8b5310c0258a420ea7f0e18e943a501d~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-BLACK', 1, 'https://static.wixstatic.com/media/ff60a8_c822fb68c48e4bdbb46b941113bd2718~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-BLACK', 2, 'https://static.wixstatic.com/media/ff60a8_96b13a2437b9425b829e143975830c0f~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-BLACK', 3, 'https://static.wixstatic.com/media/ff60a8_b8abb95556a0400c94d96110a5f331a2~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-WHITE', 0, 'https://static.wixstatic.com/media/ff60a8_997f0a93bc8e4b9a907efb21027b37f0~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-WHITE', 1, 'https://static.wixstatic.com/media/ff60a8_71b008d662b3413b9387870a23db14fb~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-WHITE', 2, 'https://static.wixstatic.com/media/ff60a8_2383e937cd4d41f29f5457d63e38c754~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-WHITE', 3, 'https://static.wixstatic.com/media/ff60a8_ce477dac9fa347528ba1c92b81f7f0af~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-WHITE', 4, 'https://static.wixstatic.com/media/ff60a8_b903692bb44b410a8b8c28eefc72dce0~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg')
  ) as t (sku, sort_order, image_url)
),
affected_products as (
  select id, sku, name
  from public.products
  where sku in (select distinct sku from gallery_source)
)
delete from public.product_images
where product_id in (select id from affected_products);

with gallery_source as (
  select *
  from (
    values
      ('TM8-MAC-M1-85W', 0, 'https://static.wixstatic.com/media/ff60a8_82c47b57c47c4e35848e4cf0fbbc13d3~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-M1-85W', 1, 'https://static.wixstatic.com/media/ff60a8_cb25dbbec0e041d091534f8b67994793~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-M1-60W', 0, 'https://static.wixstatic.com/media/ff60a8_9393ed8d4111498e82effd5f2cddf721~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-M1-60W', 1, 'https://static.wixstatic.com/media/ff60a8_cb25dbbec0e041d091534f8b67994793~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-M1-45W', 0, 'https://static.wixstatic.com/media/ff60a8_e3b938a0776f4ddc8d5bb5dc0b0cc415~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-M1-45W', 1, 'https://static.wixstatic.com/media/ff60a8_cb25dbbec0e041d091534f8b67994793~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-USBC-87W', 0, 'https://static.wixstatic.com/media/ff60a8_fc23e3fdda774c7ba40336b6cac8826e~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-USBC-87W', 1, 'https://static.wixstatic.com/media/ff60a8_01270e17ceb0461a97f52417a817d297~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-USBC-61W', 0, 'https://static.wixstatic.com/media/ff60a8_3c2acc8d32554ee397f2b10cc22c6afe~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-USBC-61W', 1, 'https://static.wixstatic.com/media/ff60a8_576f43941adf4b33893c85972c80fe74~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-USBC-30W', 0, 'https://static.wixstatic.com/media/ff60a8_a6f80139c7714ebfac0e2803bd3dc645~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-USBC-30W', 1, 'https://static.wixstatic.com/media/ff60a8_339c920136d94845a88eac5ed75f737b~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-M2-85W', 0, 'https://static.wixstatic.com/media/ff60a8_fb6323cc9b89460ab40c019182b43f5b~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-M2-85W', 1, 'https://static.wixstatic.com/media/ff60a8_cb25dbbec0e041d091534f8b67994793~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-M2-60W', 0, 'https://static.wixstatic.com/media/ff60a8_116f8c2c7d9d4ad4b605474063149b85~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-M2-60W', 1, 'https://static.wixstatic.com/media/ff60a8_cb25dbbec0e041d091534f8b67994793~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-M2-45W', 0, 'https://static.wixstatic.com/media/ff60a8_39ba1cbcb8b2404081090867ff7c631e~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-M2-45W', 1, 'https://static.wixstatic.com/media/ff60a8_cb25dbbec0e041d091534f8b67994793~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-STERLING-SILVER', 0, 'https://static.wixstatic.com/media/ff60a8_44b8629acec14e089b265c9c134f3dcd~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-STERLING-SILVER', 1, 'https://static.wixstatic.com/media/ff60a8_c12a09563972465d8bb2885b5c7fd3f3~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-STERLING-SILVER', 2, 'https://static.wixstatic.com/media/ff60a8_83ed55bd7c2f43eebc7a6dcdf024bc18~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-STERLING-SILVER', 3, 'https://static.wixstatic.com/media/ff60a8_50adc098d4e140148de53e22255cbd85~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-COSMIC-RED', 0, 'https://static.wixstatic.com/media/ff60a8_3d6c59b7f9844dce9cddba30391438aa~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-COSMIC-RED', 1, 'https://static.wixstatic.com/media/ff60a8_fe58f9e9a961475e84ee19ae5f866a12~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-GRAY-CAMO', 0, 'https://static.wixstatic.com/media/ff60a8_e970ca83b1cb486aaae98a2172e07cbc~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-GRAY-CAMO', 1, 'https://static.wixstatic.com/media/ff60a8_ddaf2f2fce8f4fe395afbf54247c972a~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-GRAY-CAMO', 2, 'https://static.wixstatic.com/media/ff60a8_606559554bd544408840943b8356fe2f~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-GRAY-CAMO', 3, 'https://static.wixstatic.com/media/ff60a8_cc60f866f0df48d7994dd15fb2bc0227~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-BLACK', 0, 'https://static.wixstatic.com/media/ff60a8_8b5310c0258a420ea7f0e18e943a501d~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-BLACK', 1, 'https://static.wixstatic.com/media/ff60a8_c822fb68c48e4bdbb46b941113bd2718~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-BLACK', 2, 'https://static.wixstatic.com/media/ff60a8_96b13a2437b9425b829e143975830c0f~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-BLACK', 3, 'https://static.wixstatic.com/media/ff60a8_b8abb95556a0400c94d96110a5f331a2~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-WHITE', 0, 'https://static.wixstatic.com/media/ff60a8_997f0a93bc8e4b9a907efb21027b37f0~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-WHITE', 1, 'https://static.wixstatic.com/media/ff60a8_71b008d662b3413b9387870a23db14fb~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-WHITE', 2, 'https://static.wixstatic.com/media/ff60a8_2383e937cd4d41f29f5457d63e38c754~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-WHITE', 3, 'https://static.wixstatic.com/media/ff60a8_ce477dac9fa347528ba1c92b81f7f0af~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-WHITE', 4, 'https://static.wixstatic.com/media/ff60a8_b903692bb44b410a8b8c28eefc72dce0~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg')
  ) as t (sku, sort_order, image_url)
)
insert into public.product_images (product_id, image_url, alt_text, sort_order)
select
  products.id,
  gallery_source.image_url,
  products.name,
  gallery_source.sort_order
from gallery_source
join public.products products on products.sku = gallery_source.sku;

with primary_images as (
  select sku, image_url
  from (
    values
      ('TM8-MAC-M1-85W', 'https://static.wixstatic.com/media/ff60a8_82c47b57c47c4e35848e4cf0fbbc13d3~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-M1-60W', 'https://static.wixstatic.com/media/ff60a8_9393ed8d4111498e82effd5f2cddf721~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-M1-45W', 'https://static.wixstatic.com/media/ff60a8_e3b938a0776f4ddc8d5bb5dc0b0cc415~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-MAC-USBC-87W', 'https://static.wixstatic.com/media/ff60a8_fc23e3fdda774c7ba40336b6cac8826e~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-USBC-61W', 'https://static.wixstatic.com/media/ff60a8_3c2acc8d32554ee397f2b10cc22c6afe~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-USBC-30W', 'https://static.wixstatic.com/media/ff60a8_a6f80139c7714ebfac0e2803bd3dc645~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-M2-85W', 'https://static.wixstatic.com/media/ff60a8_fb6323cc9b89460ab40c019182b43f5b~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-M2-60W', 'https://static.wixstatic.com/media/ff60a8_116f8c2c7d9d4ad4b605474063149b85~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-MAC-M2-45W', 'https://static.wixstatic.com/media/ff60a8_39ba1cbcb8b2404081090867ff7c631e~mv2.png/v1/fit/w_500,h_500,q_90/file.png'),
      ('TM8-PS5-DS-STERLING-SILVER', 'https://static.wixstatic.com/media/ff60a8_44b8629acec14e089b265c9c134f3dcd~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-COSMIC-RED', 'https://static.wixstatic.com/media/ff60a8_3d6c59b7f9844dce9cddba30391438aa~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-GRAY-CAMO', 'https://static.wixstatic.com/media/ff60a8_e970ca83b1cb486aaae98a2172e07cbc~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-BLACK', 'https://static.wixstatic.com/media/ff60a8_8b5310c0258a420ea7f0e18e943a501d~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg'),
      ('TM8-PS5-DS-WHITE', 'https://static.wixstatic.com/media/ff60a8_997f0a93bc8e4b9a907efb21027b37f0~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg')
  ) as t (sku, image_url)
)
update public.products as products
set
  image_url = primary_images.image_url,
  supplier_image_url = primary_images.image_url
from primary_images
where products.sku = primary_images.sku;

insert into public.product_store_inventory (product_id, store_id, quantity, shelf_location)
select
  products.id,
  stores.id,
  0,
  null
from public.products products
join public.stores stores on stores.is_active = true
where products.sku in (
  'TM8-MAC-M1-85W',
  'TM8-MAC-M1-60W',
  'TM8-MAC-M1-45W',
  'TM8-MAC-USBC-87W',
  'TM8-MAC-USBC-61W',
  'TM8-MAC-USBC-30W',
  'TM8-MAC-M2-85W',
  'TM8-MAC-M2-60W',
  'TM8-MAC-M2-45W'
)
on conflict (product_id, store_id) do nothing;

insert into public.price_history (
  product_id,
  source_name,
  source_url,
  old_retail_price,
  new_retail_price
)
select
  products.id,
  'TECHM8 website capture 2026-04-18',
  products.supplier_product_url,
  null,
  products.retail_price
from public.products products
where products.sku in (
  'TM8-MAC-M1-85W',
  'TM8-MAC-M1-60W',
  'TM8-MAC-M1-45W',
  'TM8-MAC-USBC-87W',
  'TM8-MAC-USBC-61W',
  'TM8-MAC-USBC-30W',
  'TM8-MAC-M2-85W',
  'TM8-MAC-M2-60W',
  'TM8-MAC-M2-45W'
)
and not exists (
  select 1
  from public.price_history history
  where history.product_id = products.id
    and history.source_name = 'TECHM8 website capture 2026-04-18'
);
