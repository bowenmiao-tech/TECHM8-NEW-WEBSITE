alter table if exists public.products
  add column if not exists detail_html text;

comment on column public.products.detail_html is
  'Custom rich content block rendered on the product detail page below the buy box.';
