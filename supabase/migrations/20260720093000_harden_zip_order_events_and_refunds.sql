alter table public.order_events
  drop constraint if exists order_events_actor_type_check;

alter table public.order_events
  add constraint order_events_actor_type_check
  check (actor_type in ('system', 'customer', 'admin', 'stripe', 'zip'));

create unique index if not exists idx_order_refunds_one_pending_zip_per_order
  on public.order_refunds (order_id)
  where provider = 'zip' and status = 'pending';

comment on index public.idx_order_refunds_one_pending_zip_per_order is
  'Prevents a second Zip refund while the first provider response still requires reconciliation.';
