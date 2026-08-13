-- Keep immutable order-line snapshots while allowing a retired catalog product
-- to be removed from both sales channels.
alter table public.order_items
  drop constraint if exists order_items_product_id_fkey;

alter table public.order_items
  add constraint order_items_product_id_fkey
  foreign key (product_id)
  references public.products(id)
  on delete set null;

-- Stocktake changes belong to the live POS catalog item and should disappear
-- with it when a super admin explicitly performs a permanent delete.
alter table public.pos_stocktake_changes
  drop constraint if exists pos_stocktake_changes_product_id_fkey;

alter table public.pos_stocktake_changes
  add constraint pos_stocktake_changes_product_id_fkey
  foreign key (product_id)
  references public.products(id)
  on delete cascade;

create index if not exists order_items_product_id_idx
  on public.order_items(product_id);

create index if not exists pos_stocktake_changes_product_id_idx
  on public.pos_stocktake_changes(product_id);
