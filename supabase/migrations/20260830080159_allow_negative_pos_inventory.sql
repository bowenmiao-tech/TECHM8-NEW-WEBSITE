-- POS checkout is allowed even when a store has no recorded stock. Negative
-- inventory is intentional: it records the discrepancy for the next stocktake
-- instead of losing the sale or silently clamping the quantity to zero.

alter table public.product_store_inventory
  drop constraint if exists product_store_inventory_quantity_nonnegative;

alter table public.pos_inventory_order_movements
  drop constraint if exists pos_inventory_order_movements_quantity_before_check;

alter table public.pos_inventory_order_movements
  drop constraint if exists pos_inventory_order_movements_quantity_after_check;

create or replace function public.validate_pos_inventory_sale(
  target_store_slug text,
  target_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_store public.stores%rowtype;
  invalid_items jsonb;
  stock_warnings jsonb;
begin
  if jsonb_typeof(target_items) <> 'array' then
    raise exception 'Sale items must be an array';
  end if;

  select * into selected_store
  from public.stores store_row
  where store_row.is_active = true
    and store_row.slug = lower(btrim(coalesce(target_store_slug, '')))
  limit 1;
  if not found then raise exception 'Store not found'; end if;

  with requested as (
    select
      coalesce(item->>'product_id', item->>'id')::bigint as product_id,
      sum(coalesce(nullif(item->>'qty', '')::integer, 0))::integer as quantity
    from jsonb_array_elements(target_items) item
    where coalesce(item->>'product_id', item->>'id', '') ~ '^[0-9]+$'
      and lower(coalesce(item->>'is_repair', 'false')) <> 'true'
      and lower(coalesce(item->>'is_special', 'false')) <> 'true'
      and lower(coalesce(item->>'is_used_device', 'false')) <> 'true'
      and coalesce(item->>'line_type', 'product') not in ('repair', 'special', 'used_device')
    group by coalesce(item->>'product_id', item->>'id')::bigint
  ), checked as (
    select requested.product_id, requested.quantity, product.name, product.sku, product.is_pos_visible
    from requested
    left join public.products product on product.id = requested.product_id
    where requested.quantity <= 0
      or product.id is null
      or not coalesce(product.is_pos_visible, false)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'product_id', checked.product_id,
    'name', coalesce(checked.name, 'Unknown product'),
    'sku', coalesce(checked.sku, ''),
    'requested', checked.quantity
  ) order by checked.product_id), '[]'::jsonb)
  into invalid_items
  from checked;

  with requested as (
    select
      coalesce(item->>'product_id', item->>'id')::bigint as product_id,
      sum(coalesce(nullif(item->>'qty', '')::integer, 0))::integer as quantity
    from jsonb_array_elements(target_items) item
    where coalesce(item->>'product_id', item->>'id', '') ~ '^[0-9]+$'
      and lower(coalesce(item->>'is_repair', 'false')) <> 'true'
      and lower(coalesce(item->>'is_special', 'false')) <> 'true'
      and lower(coalesce(item->>'is_used_device', 'false')) <> 'true'
      and coalesce(item->>'line_type', 'product') not in ('repair', 'special', 'used_device')
    group by coalesce(item->>'product_id', item->>'id')::bigint
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'product_id', requested.product_id,
    'name', product.name,
    'sku', product.sku,
    'requested', requested.quantity,
    'available', coalesce(inventory.quantity, 0)
  ) order by requested.product_id), '[]'::jsonb)
  into stock_warnings
  from requested
  join public.products product on product.id = requested.product_id
  left join public.product_store_inventory inventory
    on inventory.product_id = requested.product_id
    and inventory.store_id = selected_store.id
  where product.is_pos_visible = true
    and requested.quantity > coalesce(inventory.quantity, 0);

  return jsonb_build_object(
    'ok', jsonb_array_length(invalid_items) = 0,
    'store_slug', selected_store.slug,
    'invalid_items', invalid_items,
    'stock_warnings', stock_warnings
  );
end;
$$;

create or replace function public.apply_pos_inventory_order_effect(
  target_order_code text,
  target_store_slug text,
  target_staff_name text,
  target_order_created_at timestamptz,
  target_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_store public.stores%rowtype;
  sync_started_at timestamptz;
  row_data record;
  inventory_row public.product_store_inventory%rowtype;
  effect_row public.pos_inventory_order_effects%rowtype;
  desired_delta integer;
  delta_to_apply integer;
  next_revision integer;
  affected_product_ids bigint[] := array[]::bigint[];
  results jsonb := '[]'::jsonb;
begin
  if coalesce(btrim(target_order_code), '') = '' then raise exception 'Order code is required'; end if;
  if coalesce(btrim(target_staff_name), '') = '' then raise exception 'Staff name is required'; end if;
  if target_order_created_at is null then raise exception 'Order creation time is required'; end if;
  if jsonb_typeof(target_items) <> 'array' then raise exception 'Order items must be an array'; end if;

  select setting.started_at into sync_started_at
  from public.pos_inventory_sync_settings setting
  where setting.singleton = true;
  if target_order_created_at < sync_started_at then
    return jsonb_build_object('ok', true, 'ignored', true, 'reason', 'Order predates POS inventory synchronization.');
  end if;

  select * into selected_store
  from public.stores store_row
  where store_row.is_active = true
    and store_row.slug = lower(btrim(coalesce(target_store_slug, '')))
  limit 1;
  if not found then raise exception 'Store not found'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('pos-inventory:' || selected_store.id || ':' || btrim(target_order_code), 0)
  );

  for row_data in
    select
      coalesce(item->>'product_id', item->>'id')::bigint as product_id,
      sum(coalesce(nullif(item->>'qty', '')::integer, 0))::integer as sold_quantity,
      sum(coalesce(nullif(item->>'refunded_quantity', '')::integer, 0))::integer as returned_quantity
    from jsonb_array_elements(target_items) item
    where coalesce(item->>'product_id', item->>'id', '') ~ '^[0-9]+$'
      and lower(coalesce(item->>'is_repair', 'false')) <> 'true'
      and lower(coalesce(item->>'is_special', 'false')) <> 'true'
      and lower(coalesce(item->>'is_used_device', 'false')) <> 'true'
      and coalesce(item->>'line_type', 'product') not in ('repair', 'special', 'used_device')
    group by coalesce(item->>'product_id', item->>'id')::bigint
    order by coalesce(item->>'product_id', item->>'id')::bigint
  loop
    if row_data.sold_quantity <= 0 then raise exception 'Product quantity must be above zero'; end if;
    if row_data.returned_quantity < 0 or row_data.returned_quantity > row_data.sold_quantity then
      raise exception 'Returned quantity is invalid for product %', row_data.product_id;
    end if;
    if not exists (
      select 1 from public.products product
      where product.id = row_data.product_id and product.is_pos_visible = true
    ) then raise exception 'Product % is unavailable in POS', row_data.product_id; end if;

    insert into public.product_store_inventory (product_id, store_id, quantity, updated_at)
    values (row_data.product_id, selected_store.id, 0, now())
    on conflict (product_id, store_id) do nothing;

    select * into inventory_row
    from public.product_store_inventory inventory
    where inventory.product_id = row_data.product_id
      and inventory.store_id = selected_store.id
    for update;

    select * into effect_row
    from public.pos_inventory_order_effects effect
    where effect.order_code = btrim(target_order_code)
      and effect.store_id = selected_store.id
      and effect.product_id = row_data.product_id
    for update;

    desired_delta := row_data.returned_quantity - row_data.sold_quantity;
    delta_to_apply := desired_delta - coalesce(effect_row.applied_delta, 0);
    next_revision := coalesce(effect_row.revision, 0) + case when delta_to_apply <> 0 then 1 else 0 end;

    if delta_to_apply <> 0 then
      update public.product_store_inventory inventory
      set quantity = inventory.quantity + delta_to_apply,
          updated_at = now()
      where inventory.id = inventory_row.id
      returning * into inventory_row;

      insert into public.pos_inventory_order_movements (
        movement_key, order_code, store_id, product_id, movement_type,
        quantity_delta, quantity_before, quantity_after, actor_staff_name
      ) values (
        'pos:' || btrim(target_order_code) || ':' || row_data.product_id || ':r' || next_revision,
        btrim(target_order_code), selected_store.id, row_data.product_id,
        case
          when delta_to_apply < 0 then 'pos_sale'
          when effect_row.order_code is null then 'pos_reconcile'
          else 'pos_refund_return'
        end,
        delta_to_apply,
        inventory_row.quantity - delta_to_apply,
        inventory_row.quantity,
        btrim(target_staff_name)
      );
    end if;

    insert into public.pos_inventory_order_effects (
      order_code, store_id, product_id, sold_quantity, returned_quantity,
      applied_delta, revision, actor_staff_name, order_created_at, updated_at
    ) values (
      btrim(target_order_code), selected_store.id, row_data.product_id,
      row_data.sold_quantity, row_data.returned_quantity,
      desired_delta, next_revision, btrim(target_staff_name), target_order_created_at, now()
    )
    on conflict (order_code, store_id, product_id) do update set
      sold_quantity = excluded.sold_quantity,
      returned_quantity = excluded.returned_quantity,
      applied_delta = excluded.applied_delta,
      revision = excluded.revision,
      actor_staff_name = excluded.actor_staff_name,
      updated_at = now();

    affected_product_ids := array_append(affected_product_ids, row_data.product_id);
    results := results || jsonb_build_array(jsonb_build_object(
      'product_id', row_data.product_id,
      'quantity', inventory_row.quantity,
      'applied_delta', desired_delta,
      'changed_by', delta_to_apply
    ));
  end loop;

  if coalesce(array_length(affected_product_ids, 1), 0) > 0 then
    perform public.refresh_product_stock_totals(affected_product_ids);
  end if;

  return jsonb_build_object(
    'ok', true,
    'ignored', false,
    'order_code', btrim(target_order_code),
    'store_slug', selected_store.slug,
    'inventory', results
  );
end;
$$;

revoke all on function public.validate_pos_inventory_sale(text, jsonb) from public, anon, authenticated;
revoke all on function public.apply_pos_inventory_order_effect(text, text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.validate_pos_inventory_sale(text, jsonb) to service_role;
grant execute on function public.apply_pos_inventory_order_effect(text, text, text, timestamptz, jsonb) to service_role;
