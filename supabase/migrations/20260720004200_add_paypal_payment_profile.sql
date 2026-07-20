alter table public.orders
  add column if not exists paypal_order_id text,
  add column if not exists paypal_capture_id text,
  add column if not exists paypal_payer_id text,
  add column if not exists paypal_payment_state text,
  add column if not exists paypal_environment text;

create unique index if not exists idx_orders_paypal_order_id
  on public.orders (paypal_order_id)
  where paypal_order_id is not null;

create unique index if not exists idx_orders_paypal_capture_id
  on public.orders (paypal_capture_id)
  where paypal_capture_id is not null;

alter table public.order_refunds
  add column if not exists paypal_refund_id text;

create unique index if not exists idx_order_refunds_paypal_refund_id
  on public.order_refunds (paypal_refund_id)
  where paypal_refund_id is not null;

create unique index if not exists idx_order_refunds_one_pending_paypal_per_order
  on public.order_refunds (order_id)
  where provider = 'paypal' and status = 'pending';

alter table public.order_events
  drop constraint if exists order_events_actor_type_check;

alter table public.order_events
  add constraint order_events_actor_type_check
  check (actor_type in ('system', 'customer', 'admin', 'stripe', 'zip', 'paypal'));

create table if not exists public.paypal_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'failed')),
  attempt_count integer not null default 1 check (attempt_count > 0),
  last_error text,
  received_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

alter table public.paypal_webhook_events enable row level security;
revoke all on table public.paypal_webhook_events from anon, authenticated;

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
  'paypal',
  'PayPal',
  'paypal',
  'none',
  0,
  0,
  false,
  50,
  'Direct PayPal Orders v2 integration. Enable only after sandbox approval, webhook verification, refunds, invoices, and three-party email delivery have passed.'
)
on conflict (code) do update
set
  label = excluded.label,
  provider = excluded.provider,
  fee_type = excluded.fee_type,
  percentage = excluded.percentage,
  fixed_amount = excluded.fixed_amount,
  sort_order = excluded.sort_order,
  notes = excluded.notes;

comment on column public.orders.paypal_order_id is
  'PayPal Orders v2 identifier used for payer approval and capture reconciliation.';
comment on column public.orders.paypal_capture_id is
  'PayPal capture identifier used for reconciliation and refunds.';
comment on column public.order_refunds.paypal_refund_id is
  'PayPal Payments v2 refund identifier, or a verified webhook reconciliation key for refunds created directly in PayPal.';
comment on table public.paypal_webhook_events is
  'Private idempotency and audit ledger for verified PayPal webhook deliveries.';
