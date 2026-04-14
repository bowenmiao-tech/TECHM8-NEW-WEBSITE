-- TECHM8 starter controller catalog seed
-- Source checked against the public TECHM8 website on 2026-04-14.
-- This seed preserves internal fields such as cost_price, wholesale_price,
-- stock_quantity and shelf_location if you run it again later.

insert into public.stores (
  slug,
  name,
  suburb,
  state,
  address_line_1,
  address_line_2,
  postcode,
  is_active
)
values
  ('park-ridge', 'Park Ridge', 'Park Ridge', 'QLD', 'Shop 11, 3732 Mount Lindesay Hwy', 'Park Ridge Town Centre', '4125', true),
  ('fairfield', 'Fairfield', 'Fairfield', 'QLD', 'Shop 8, 180 Fairfield Rd', null, '4103', true),
  ('north-lakes', 'North Lakes', 'North Lakes', 'QLD', '1114A N Lakes Drive', null, '4509', true),
  ('toowong', 'Toowong', 'Toowong', 'QLD', 'Ground Level Shop 53, 9 Sherwood Rd', null, '4066', true),
  ('brassall', 'Brassall', 'Brassall', 'QLD', '68 Hunter St', 'Primewest Brassall Shopping Centre', '4305', true)
on conflict (slug) do nothing;

insert into public.categories (slug, name, description, sort_order)
values
  ('gaming-essentials', 'Gaming Essentials', 'Controllers, console accessories and gaming products.', 10),
  ('ps5-controllers', 'PS5 Controllers', 'PlayStation 5 wireless controller range.', 20)
on conflict (slug) do nothing;

insert into public.suppliers (name, website_url, notes)
select
  'Sony Interactive Entertainment',
  'https://www.techm8australia.com/copy-of-computer-parts-accessories-1',
  'Starter retail catalog data captured from the public TECHM8 website on 2026-04-14.'
where not exists (
  select 1
  from public.suppliers
  where name = 'Sony Interactive Entertainment'
);

with product_source as (
  select *
  from (
    values
      (
        'TM8-PS5-DS-STERLING-SILVER',
        'dualsense-wireless-controller-sterling-silver-playstation-5',
        'DualSense Wireless Controller - Sterling Silver - PlayStation 5',
        'Sony',
        'DualSense Wireless Controller',
        'Official PS5 DualSense controller in Sterling Silver finish.',
        'Official PlayStation 5 DualSense wireless controller in Sterling Silver finish.',
        'New',
        'PlayStation 5',
        115.00::numeric,
        124.00::numeric,
        'https://static.wixstatic.com/media/ff60a8_44b8629acec14e089b265c9c134f3dcd~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg',
        'https://www.techm8australia.com/product-page/dualsense-wireless-controller-sterling-silver-playstation-5',
        'DualSense Wireless Controller - Sterling Silver - PlayStation 5 | TECHM8',
        'Buy the PlayStation 5 DualSense Wireless Controller in Sterling Silver from TECHM8.'
      ),
      (
        'TM8-PS5-DS-COSMIC-RED',
        'dualsense-wireless-controller-cosmic-red-playstation-5',
        'DualSense Wireless Controller - Cosmic Red - PlayStation 5',
        'Sony',
        'DualSense Wireless Controller',
        'Official PS5 DualSense controller in Cosmic Red finish.',
        'Official PlayStation 5 DualSense wireless controller in Cosmic Red finish.',
        'New',
        'PlayStation 5',
        109.00::numeric,
        null::numeric,
        'https://static.wixstatic.com/media/ff60a8_3d6c59b7f9844dce9cddba30391438aa~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg',
        'https://www.techm8australia.com/product-page/dualsense-wireless-controller-cosmic-red-playstation-5',
        'DualSense Wireless Controller - Cosmic Red - PlayStation 5 | TECHM8',
        'Buy the PlayStation 5 DualSense Wireless Controller in Cosmic Red from TECHM8.'
      ),
      (
        'TM8-PS5-DS-GRAY-CAMO',
        'dualsense-wireless-controller-gray-camouflage',
        'DualSense Wireless Controller - Gray Camouflage',
        'Sony',
        'DualSense Wireless Controller',
        'Official PS5 DualSense controller in Gray Camouflage finish.',
        'Official PlayStation 5 DualSense wireless controller in Gray Camouflage finish.',
        'New',
        'PlayStation 5',
        109.00::numeric,
        null::numeric,
        'https://static.wixstatic.com/media/ff60a8_e970ca83b1cb486aaae98a2172e07cbc~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg',
        'https://www.techm8australia.com/product-page/dualsense-wireless-controller-gray-camouflage',
        'DualSense Wireless Controller - Gray Camouflage | TECHM8',
        'Buy the PlayStation 5 DualSense Wireless Controller in Gray Camouflage from TECHM8.'
      ),
      (
        'TM8-PS5-DS-BLACK',
        'copy-of-dualsense-wireless-controller-playstation-5-black',
        'DualSense Wireless Controller - PlayStation 5 - Black',
        'Sony',
        'DualSense Wireless Controller',
        'Official PS5 DualSense controller in Black finish.',
        'Official PlayStation 5 DualSense wireless controller in Black finish.',
        'New',
        'PlayStation 5',
        109.00::numeric,
        null::numeric,
        'https://static.wixstatic.com/media/ff60a8_8b5310c0258a420ea7f0e18e943a501d~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg',
        'https://www.techm8australia.com/product-page/copy-of-dualsense-wireless-controller-playstation-5-black',
        'DualSense Wireless Controller - PlayStation 5 - Black | TECHM8',
        'Buy the PlayStation 5 DualSense Wireless Controller in Black from TECHM8.'
      ),
      (
        'TM8-PS5-DS-WHITE',
        'dualsense-wireless-controller-playstation-5-white',
        'DualSense Wireless Controller - PlayStation 5 - White',
        'Sony',
        'DualSense Wireless Controller',
        'Official PS5 DualSense controller in White finish.',
        'Official PlayStation 5 DualSense wireless controller in White finish.',
        'New',
        'PlayStation 5',
        109.00::numeric,
        null::numeric,
        'https://static.wixstatic.com/media/ff60a8_997f0a93bc8e4b9a907efb21027b37f0~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg',
        'https://www.techm8australia.com/product-page/dualsense-wireless-controller-playstation-5-white',
        'DualSense Wireless Controller - PlayStation 5 - White | TECHM8',
        'Buy the PlayStation 5 DualSense Wireless Controller in White from TECHM8.'
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
    image_url,
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
  categories.id,
  suppliers.id,
  source.short_description,
  source.description,
  source.condition_label,
  source.compatibility,
  source.retail_price,
  source.compare_at_price,
  source.image_url,
  source.image_url,
  source.supplier_product_url,
  0,
  1,
  true,
  true,
  source.seo_title,
  source.seo_description
from product_source source
cross join lateral (
  select id from public.categories where slug = 'ps5-controllers'
) categories
cross join lateral (
  select id from public.suppliers where name = 'Sony Interactive Entertainment' limit 1
) suppliers
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
  is_featured = excluded.is_featured,
  is_visible = excluded.is_visible,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description;

insert into public.product_images (product_id, image_url, alt_text, sort_order)
select
  products.id,
  products.image_url,
  products.name,
  0
from public.products products
where products.sku in (
  'TM8-PS5-DS-STERLING-SILVER',
  'TM8-PS5-DS-COSMIC-RED',
  'TM8-PS5-DS-GRAY-CAMO',
  'TM8-PS5-DS-BLACK',
  'TM8-PS5-DS-WHITE'
)
and not exists (
  select 1
  from public.product_images images
  where images.product_id = products.id
    and images.image_url = products.image_url
);

insert into public.product_store_inventory (product_id, store_id, quantity, shelf_location)
select
  products.id,
  stores.id,
  0,
  null
from public.products products
join (
  values
    ('park-ridge'),
    ('fairfield'),
    ('north-lakes'),
    ('toowong'),
    ('brassall')
) as wanted_stores(slug) on true
join public.stores stores on stores.slug = wanted_stores.slug
where products.sku in (
  'TM8-PS5-DS-STERLING-SILVER',
  'TM8-PS5-DS-COSMIC-RED',
  'TM8-PS5-DS-GRAY-CAMO',
  'TM8-PS5-DS-BLACK',
  'TM8-PS5-DS-WHITE'
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
  'TECHM8 website capture 2026-04-14',
  products.supplier_product_url,
  null,
  products.retail_price
from public.products products
where products.sku in (
  'TM8-PS5-DS-STERLING-SILVER',
  'TM8-PS5-DS-COSMIC-RED',
  'TM8-PS5-DS-GRAY-CAMO',
  'TM8-PS5-DS-BLACK',
  'TM8-PS5-DS-WHITE'
)
and not exists (
  select 1
  from public.price_history history
  where history.product_id = products.id
    and history.source_name = 'TECHM8 website capture 2026-04-14'
);
