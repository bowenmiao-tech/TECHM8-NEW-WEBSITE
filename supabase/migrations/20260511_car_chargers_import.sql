insert into public.categories (
  slug,
  name,
  description,
  sort_order
)
values (
  'car-chargers',
  'Car Chargers',
  'In-car charging accessories for phones, tablets and other USB-powered devices.',
  320
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.suppliers (
  name,
  website_url,
  notes
)
select
  'WEKOME',
  'https://www.wekome.com/',
  'Supplier record reused for imported WEKOME charging accessories.'
where not exists (
  select 1
  from public.suppliers
  where lower(name) = 'wekome'
);

with product_source as (
  select *
  from (
    values
      (
        '110511620',
        'wekome-wp-c64-car-charger',
        'WEKOME WP-C64 Car Charger',
        'WEKOME',
        'WP-C64',
        '6941027655641',
        'WEKOME WP-C64 Car Charger available for online order and warehouse dispatch.',
        'WEKOME WP-C64 car charger imported from supplier catalogue.',
        'New',
        'Universal in-car charging',
        3.00::numeric,
        39.00::numeric,
        3
      ),
      (
        '110541619',
        'wekome-wp-c53-car-charger',
        'WEKOME WP-C53 Car Charger',
        'WEKOME',
        'WP-C53',
        '6941027651551',
        'WEKOME WP-C53 Car Charger available for online order and warehouse dispatch.',
        'WEKOME WP-C53 car charger imported from supplier catalogue.',
        'New',
        'Universal in-car charging',
        3.00::numeric,
        39.00::numeric,
        3
      ),
      (
        '110531618',
        'wekome-wp-c54-car-charger',
        'WEKOME WP-C54 Car Charger',
        'WEKOME',
        'WP-C54',
        '6941027651735',
        'WEKOME WP-C54 Car Charger available for online order and warehouse dispatch.',
        'WEKOME WP-C54 car charger imported from supplier catalogue.',
        'New',
        'Universal in-car charging',
        3.00::numeric,
        39.00::numeric,
        3
      )
  ) as t (
    sku,
    slug,
    name,
    brand,
    model,
    upc,
    short_description,
    description,
    condition_label,
    compatibility,
    cost_price,
    retail_price,
    stock_quantity
  )
)
insert into public.products (
  sku,
  slug,
  name,
  brand,
  model,
  upc,
  category_id,
  supplier_id,
  short_description,
  description,
  condition_label,
  compatibility,
  cost_price,
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
  src.sku,
  src.slug,
  src.name,
  src.brand,
  src.model,
  src.upc,
  c.id,
  s.id,
  src.short_description,
  src.description,
  src.condition_label,
  src.compatibility,
  src.cost_price,
  src.retail_price,
  null,
  null,
  null,
  null,
  src.stock_quantity,
  1,
  false,
  true,
  src.name || ' | TECHM8',
  src.short_description
from product_source src
join public.categories c
  on c.slug = 'car-chargers'
join public.suppliers s
  on lower(s.name) = 'wekome'
on conflict (sku) do update
set
  slug = excluded.slug,
  name = excluded.name,
  brand = excluded.brand,
  model = excluded.model,
  upc = excluded.upc,
  category_id = excluded.category_id,
  supplier_id = excluded.supplier_id,
  short_description = excluded.short_description,
  description = excluded.description,
  condition_label = excluded.condition_label,
  compatibility = excluded.compatibility,
  cost_price = excluded.cost_price,
  retail_price = excluded.retail_price,
  compare_at_price = excluded.compare_at_price,
  stock_quantity = excluded.stock_quantity,
  min_order_quantity = excluded.min_order_quantity,
  is_featured = excluded.is_featured,
  is_visible = excluded.is_visible,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description;

insert into public.product_store_inventory (
  product_id,
  store_id,
  quantity,
  shelf_location
)
select
  p.id,
  st.id,
  src.stock_quantity,
  'ONLINE'
from (
  values
    ('110511620', 3),
    ('110541619', 3),
    ('110531618', 3)
) as src (sku, stock_quantity)
join public.products p
  on p.sku = src.sku
join public.stores st
  on st.slug = 'warehouse-dispatch'
on conflict (product_id, store_id) do update
set
  quantity = excluded.quantity,
  shelf_location = excluded.shelf_location;
