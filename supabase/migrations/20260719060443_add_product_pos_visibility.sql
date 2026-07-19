alter table public.products
  add column if not exists is_pos_visible boolean not null default true;

create index if not exists idx_products_pos_visibility
  on public.products (is_pos_visible, is_visible, updated_at desc);
