insert into public.categories (
  slug,
  name,
  description,
  sort_order
)
values (
  'screen-protectors',
  'Screen Protectors',
  'Screen protector products for POS and in-store sales.',
  330
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

with product_source as (
  select *
  from (
    values
      ('SP-7609', 'warranty-replacement-screen-protector', '0. Warranty Replacement', 'TECHM8', 'Warranty Replacement', '7609429', 0.00::numeric, 0.00::numeric, 945, '/assets/products/screen-protectors/sp-7609-warranty-replacement.jpg'),
      ('SP-6752', 'ipad-watch-lens-glass-one-time-free-replacement', '00. ipad, Watch and lens (Glass) One Time Free Replacement in 12 Months', 'TECHM8', 'iPad Watch Lens Glass', '6752139', 0.00::numeric, 19.00::numeric, 909, '/assets/products/screen-protectors/sp-6752-ipad-watch-lens-replacement.jpg'),
      ('SP-6047', 'lens-tempered-glass-screen-protector', '1 Lens Tempered Glass Screen Protector', 'TECHM8', 'Lens Tempered Glass', '604752', 1.00::numeric, 29.00::numeric, 896, '/assets/products/screen-protectors/sp-6047-lens-tempered-glass.jpg'),
      ('SP-6084', 'apple-watch-screen-protector', '2. Apple Watch Screen Protector', 'Apple', 'Apple Watch Screen Protector', '59096', 1.00::numeric, 29.00::numeric, -5, '/assets/products/screen-protectors/sp-6084-apple-watch-screen-protector.jpg'),
      ('SP-5992', 'ipad-tempered-glass-screen-protector', '3. iPad Tempered Glass Screen Protector', 'Apple', 'iPad Tempered Glass', '596131', 4.00::numeric, 49.00::numeric, 968, '/assets/products/screen-protectors/sp-5992-ipad-tempered-glass.jpg'),
      ('SP-5993', 'ipad-paperlike-screen-protector', '4. iPad Paperlike Screen Protector', 'Apple', 'iPad Paperlike', '596131', 4.00::numeric, 60.00::numeric, 0, '/assets/products/screen-protectors/sp-5993-ipad-paperlike.jpg'),
      ('SP-10705', 'cartoon-lens-tempered-glass-screen-protector', '5. Cartoon Lens Tempered Glass Screen Protector', 'TECHM8', 'Cartoon Lens Tempered Glass', '107051248', 3.00::numeric, 30.00::numeric, 13, '/assets/products/screen-protectors/sp-10705-cartoon-lens-tempered-glass.jpg'),
      ('SP-5959', 'full-cover-tempered-glass-screen-protector', '6. Full Cover Tempered Glass Screen Protector (One Time Free Replacement in 12 Months )', 'TECHM8', 'Full Cover Tempered Glass', '595930', 1.00::numeric, 50.00::numeric, 759, '/assets/products/screen-protectors/sp-5959-full-cover-tempered-glass.jpg'),
      ('SP-5996', 'mat-tempered-glass-screen-protector', '7. Mat Tempered Glass Screen Protector (One Time Free Replacement in 12 Months)', 'TECHM8', 'Mat Tempered Glass', '59096', 1.00::numeric, 55.00::numeric, 976, '/assets/products/screen-protectors/sp-5996-mat-tempered-glass.jpg'),
      ('SP-5998', 'anti-tempered-glass-screen-protector', '8. Anti Tempered Glass Screen Protector (One Time Free Replacement in 12 Months)', 'TECHM8', 'Anti Tempered Glass', '59096', 1.00::numeric, 55.00::numeric, 938, '/assets/products/screen-protectors/sp-5998-anti-tempered-glass.jpg'),
      ('SP-5999', 'anti-mat-tempered-glass-screen-protector', '9. Anit Mat Tempered Glass Screen Protector (One Time Free Replacement in 12 Months)', 'TECHM8', 'Anti Mat Tempered Glass', '59096', 1.20::numeric, 60.00::numeric, 996, '/assets/products/screen-protectors/sp-5999-anti-mat-tempered-glass.jpg'),
      ('SP-5909', 'nano-glass-clean-screen-protector', '91. NANO Glass Clean Screen Protector (One Time Free Replacement in 12 Months )', 'NANO', 'Glass Clean', '59096', 1.00::numeric, 60.00::numeric, 950, '/assets/products/screen-protectors/sp-5909-nano-glass-clean.jpg'),
      ('SP-5910', 'nano-glass-mat-screen-protector', '92. NANO Glass Mat Screen Protector (One Time Free Replacement in 12 Months )', 'NANO', 'Glass Mat', '59096', 1.00::numeric, 65.00::numeric, 998, '/assets/products/screen-protectors/sp-5910-nano-glass-mat.jpg'),
      ('SP-5911', 'nano-glass-anti-screen-protector', '93. NANO Glass Anti Screen Protector (One Time Free Replacement in 12 Months )', 'NANO', 'Glass Anti', '59096', 1.00::numeric, 65.00::numeric, 987, '/assets/products/screen-protectors/sp-5911-nano-glass-anti.jpg'),
      ('SP-5912', 'nano-glass-anti-mat-screen-protector', '94. NANO Glass Anti Mat Screen Protector (One Time Free Replacement in 12 Months )', 'NANO', 'Glass Anti Mat', '59096', 1.20::numeric, 70.00::numeric, 999, '/assets/products/screen-protectors/sp-5912-nano-glass-anti-mat.jpg'),
      ('SP-9388', 'google-pixel-screen-protector', 'Google Pixel Screen Protector (One Time Free Replacement in 12 Months)', 'Google Pixel', 'Screen Protector', '605655', 3.00::numeric, 50.00::numeric, 1003, '/assets/products/screen-protectors/sp-9388-google-pixel-screen-protector.jpg'),
      ('SP-6058', 'samsung-9d-full-gum-screen-protector', 'Samsung 9D Full Gum screen Protector', 'Samsung', '9D Full Gum', '605655', 30.00::numeric, 30.00::numeric, -20, '/assets/products/screen-protectors/sp-6058-samsung-9d-full-gum.jpg'),
      ('SP-6056', 'samsung-9h-polmernano-screen-protector', 'Samsung 9H Polmernano screen Protector (One Time Free Replacement in 12 Months )', 'Samsung', '9H Polmernano', '605655', 45.00::numeric, 60.00::numeric, 979, '/assets/products/screen-protectors/sp-6056-samsung-9h-polmernano.jpg'),
      ('SP-6081', 'samsung-full-glue-screen-protector', 'Samsung Full Glue Screen Protector (One Time Free Replacement in 12 Months)', 'Samsung', 'Full Glue', '605655', 6.00::numeric, 50.00::numeric, 980, '/assets/products/screen-protectors/sp-6081-samsung-full-glue.jpg'),
      ('SP-5961', 'samsung-uv-glass-screen-protector', 'Samsung UV Glass Screen Protector', 'Samsung', 'UV Glass', '596131', 8.00::numeric, 90.00::numeric, 0, '/assets/products/screen-protectors/sp-5961-samsung-uv-glass.jpg'),
      ('SP-5913', 'v-tempered-glass-screen-protector', 'V Tempered Glass Screen Protector', 'TECHM8', 'V Tempered Glass', '59096', 0.90::numeric, 29.00::numeric, 430, '/assets/products/screen-protectors/sp-5913-v-tempered-glass.jpg')
  ) as t (
    sku,
    slug,
    name,
    brand,
    model,
    upc,
    cost_price,
    retail_price,
    stock_quantity,
    image_url
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
  is_pos_visible,
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
  src.name || ' POS-only screen protector item.',
  src.name || ' imported from POS inventory. Hidden from the online catalogue and available in POS.',
  'New',
  'Screen protector',
  src.cost_price,
  src.retail_price,
  null,
  src.image_url,
  src.image_url,
  null,
  src.stock_quantity,
  1,
  false,
  false,
  true,
  src.name || ' | TECHM8',
  src.name || ' POS-only screen protector item.'
from product_source src
join public.categories c
  on c.slug = 'screen-protectors'
on conflict (sku) do update
set
  slug = excluded.slug,
  name = excluded.name,
  brand = excluded.brand,
  model = excluded.model,
  upc = excluded.upc,
  category_id = excluded.category_id,
  short_description = excluded.short_description,
  description = excluded.description,
  condition_label = excluded.condition_label,
  compatibility = excluded.compatibility,
  cost_price = excluded.cost_price,
  retail_price = excluded.retail_price,
  compare_at_price = excluded.compare_at_price,
  image_url = excluded.image_url,
  supplier_image_url = excluded.supplier_image_url,
  supplier_product_url = excluded.supplier_product_url,
  stock_quantity = excluded.stock_quantity,
  min_order_quantity = excluded.min_order_quantity,
  is_featured = excluded.is_featured,
  is_visible = excluded.is_visible,
  is_pos_visible = excluded.is_pos_visible,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description;

delete from public.product_images
where product_id in (
  select id
  from public.products
  where sku in (
    'SP-7609', 'SP-6752', 'SP-6047', 'SP-6084', 'SP-5992', 'SP-5993', 'SP-10705',
    'SP-5959', 'SP-5996', 'SP-5998', 'SP-5999', 'SP-5909', 'SP-5910', 'SP-5911',
    'SP-5912', 'SP-9388', 'SP-6058', 'SP-6056', 'SP-6081', 'SP-5961', 'SP-5913'
  )
);

insert into public.product_images (product_id, image_url, alt_text, sort_order)
select
  p.id,
  p.image_url,
  p.name,
  0
from public.products p
where p.sku in (
  'SP-7609', 'SP-6752', 'SP-6047', 'SP-6084', 'SP-5992', 'SP-5993', 'SP-10705',
  'SP-5959', 'SP-5996', 'SP-5998', 'SP-5999', 'SP-5909', 'SP-5910', 'SP-5911',
  'SP-5912', 'SP-9388', 'SP-6058', 'SP-6056', 'SP-6081', 'SP-5961', 'SP-5913'
);

insert into public.product_store_inventory (
  product_id,
  store_id,
  quantity,
  shelf_location
)
select
  p.id,
  st.id,
  p.stock_quantity,
  'POS'
from public.products p
join public.stores st
  on st.slug = 'warehouse-dispatch'
where p.sku in (
  'SP-7609', 'SP-6752', 'SP-6047', 'SP-6084', 'SP-5992', 'SP-5993', 'SP-10705',
  'SP-5959', 'SP-5996', 'SP-5998', 'SP-5999', 'SP-5909', 'SP-5910', 'SP-5911',
  'SP-5912', 'SP-9388', 'SP-6058', 'SP-6056', 'SP-6081', 'SP-5961', 'SP-5913'
)
on conflict (product_id, store_id) do update
set
  quantity = excluded.quantity,
  shelf_location = excluded.shelf_location,
  updated_at = timezone('utc', now());
