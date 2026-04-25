update public.products
set compare_at_price = null
where sku in ('TM8-TEST-10C', 'TM8-ACC-001', 'TM8-ACC-010');

update public.products
set image_url = 'https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/copy-of-brand-new-45w-magsafe-1-power-adapter-for-macbook-air-six-months-warranty/00.png',
    supplier_image_url = 'https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/copy-of-brand-new-45w-magsafe-1-power-adapter-for-macbook-air-six-months-warranty/00.png',
    updated_at = timezone('utc', now())
where slug = 'copy-of-brand-new-45w-magsafe-1-power-adapter-for-macbook-air-six-months-warranty';

delete from public.product_images
where product_id = (
  select id
  from public.products
  where slug = 'copy-of-brand-new-45w-magsafe-1-power-adapter-for-macbook-air-six-months-warranty'
  limit 1
);

insert into public.product_images (
  product_id,
  image_url,
  alt_text,
  sort_order,
  created_at
)
select
  id,
  'https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/copy-of-brand-new-45w-magsafe-1-power-adapter-for-macbook-air-six-months-warranty/00.png',
  '45W MagSafe 1 Power Adapter for MacBook Air',
  0,
  timezone('utc', now())
from public.products
where slug = 'copy-of-brand-new-45w-magsafe-1-power-adapter-for-macbook-air-six-months-warranty';
