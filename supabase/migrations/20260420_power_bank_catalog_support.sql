alter table public.products
  add column if not exists upc text;

create index if not exists idx_products_upc
  on public.products (upc);

create index if not exists idx_products_brand_model
  on public.products (brand, model);
