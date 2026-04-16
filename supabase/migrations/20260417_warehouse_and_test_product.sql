insert into public.stores (
  slug,
  name,
  short_description,
  seo_title,
  seo_description,
  suburb,
  state,
  address_line_1,
  postcode,
  phone,
  email,
  opening_hours,
  hero_heading,
  hero_text,
  is_active
)
values (
  'warehouse-dispatch',
  'Warehouse Dispatch',
  'Central warehouse fulfilment point for direct dispatch orders.',
  'TECHM8 Warehouse Dispatch',
  'Central warehouse dispatch point for online orders and stock fulfilment.',
  'Brisbane',
  'QLD',
  'Warehouse dispatch point',
  '4000',
  '0450 000 000',
  'techm8contact@gmail.com',
  'Warehouse dispatch by order confirmation',
  'Warehouse Dispatch',
  'Used for online orders that will be prepared and dispatched from warehouse stock.',
  true
)
on conflict (slug) do update
set
  name = excluded.name,
  short_description = excluded.short_description,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  suburb = excluded.suburb,
  state = excluded.state,
  address_line_1 = excluded.address_line_1,
  postcode = excluded.postcode,
  phone = excluded.phone,
  email = excluded.email,
  opening_hours = excluded.opening_hours,
  hero_heading = excluded.hero_heading,
  hero_text = excluded.hero_text,
  is_active = excluded.is_active;

insert into public.categories (
  slug,
  name,
  description,
  sort_order
)
values (
  'testing-products',
  'Testing Products',
  'Internal products used for checkout, payment and order-flow testing.',
  999
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.suppliers (
  name,
  contact_name,
  email,
  website_url,
  notes
)
select
  'TECHM8 Internal',
  'TECHM8 Admin',
  'techm8contact@gmail.com',
  'https://bowenmiao-tech.github.io/TECHM8-NEW-WEBSITE',
  'Internal supplier record for test and non-retail items.'
where not exists (
  select 1
  from public.suppliers
  where name = 'TECHM8 Internal'
);

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
  cost_price,
  wholesale_price,
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
  'TM8-TEST-10C',
  'techm8-test-payment-product-10-cents',
  'TECHM8 Test Payment Product - 10 Cents',
  'TECHM8',
  'Internal Test Item',
  c.id,
  s.id,
  'Internal checkout test item priced at 10 cents.',
  'Use this internal product to test cart, Stripe checkout, order creation and webhook updates without using a normal retail product.',
  'New',
  'Internal testing only',
  0.00,
  0.00,
  0.10,
  1.00,
  null,
  null,
  null,
  100,
  1,
  false,
  true,
  'TECHM8 Test Payment Product - 10 Cents',
  'Internal 10 cent test product for validating checkout and Stripe payment flow.'
from public.categories c
cross join public.suppliers s
where c.slug = 'testing-products'
  and s.name = 'TECHM8 Internal'
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
  cost_price = excluded.cost_price,
  wholesale_price = excluded.wholesale_price,
  retail_price = excluded.retail_price,
  compare_at_price = excluded.compare_at_price,
  image_url = excluded.image_url,
  supplier_image_url = excluded.supplier_image_url,
  supplier_product_url = excluded.supplier_product_url,
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
  100,
  'WH-TEST-01'
from public.products p
cross join public.stores st
where p.sku = 'TM8-TEST-10C'
  and st.slug = 'warehouse-dispatch'
on conflict (product_id, store_id) do update
set
  quantity = excluded.quantity,
  shelf_location = excluded.shelf_location;
