alter table public.orders
  add column if not exists zip_checkout_id text,
  add column if not exists zip_charge_id text,
  add column if not exists zip_receipt_number text,
  add column if not exists zip_payment_state text,
  add column if not exists zip_environment text;

create unique index if not exists idx_orders_zip_checkout_id
  on public.orders (zip_checkout_id)
  where zip_checkout_id is not null;

create unique index if not exists idx_orders_zip_charge_id
  on public.orders (zip_charge_id)
  where zip_charge_id is not null;

alter table public.order_refunds
  add column if not exists provider text not null default 'stripe',
  add column if not exists zip_refund_id text;

update public.order_refunds as refund
set provider = case
  when orders.payment_method_code = 'pay_in_store' then 'manual'
  else 'stripe'
end
from public.orders as orders
where orders.id = refund.order_id;

create unique index if not exists idx_order_refunds_zip_refund_id
  on public.order_refunds (zip_refund_id)
  where zip_refund_id is not null;

insert into public.payment_fee_profiles (
  code,
  label,
  provider,
  fee_type,
  percentage,
  fixed_amount,
  is_enabled,
  sort_order,
  notes
)
values (
  'zip',
  'Zip Pay',
  'zip',
  'none',
  0,
  0,
  false,
  45,
  'Direct Zip Checkouts API. Enable only after sandbox certification and production credentials are configured. Customer surcharge must remain zero.'
)
on conflict (code) do update
set
  label = excluded.label,
  provider = excluded.provider,
  fee_type = excluded.fee_type,
  percentage = excluded.percentage,
  fixed_amount = excluded.fixed_amount,
  is_enabled = excluded.is_enabled,
  sort_order = excluded.sort_order,
  notes = excluded.notes;

comment on column public.orders.zip_checkout_id is
  'Zip Checkouts API checkout identifier used for the customer approval redirect.';
comment on column public.orders.zip_charge_id is
  'Zip charge identifier used for reconciliation and refunds.';
comment on column public.order_refunds.zip_refund_id is
  'Direct Zip refund identifier returned by the Zip Checkouts API.';
comment on table public.order_refunds is
  'Provider-neutral refund ledger for manual, Stripe, and direct Zip refunds.';
