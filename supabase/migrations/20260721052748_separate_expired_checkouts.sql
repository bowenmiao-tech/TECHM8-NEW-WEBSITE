alter table public.orders
  add column if not exists checkout_expired_at timestamptz;

comment on column public.orders.checkout_expired_at is
  'When an unpaid hosted checkout expired. This is not a customer or administrator cancellation.';

alter table public.orders
  drop constraint if exists orders_status_check,
  drop constraint if exists orders_payment_status_check,
  drop constraint if exists orders_fulfillment_status_check;

alter table public.orders
  add constraint orders_status_check
    check (status in (
      'draft',
      'submitted',
      'confirmed',
      'packed',
      'shipped',
      'completed',
      'cancelled',
      'abandoned'
    )),
  add constraint orders_payment_status_check
    check (payment_status in (
      'unpaid',
      'pending',
      'paid',
      'failed',
      'partially_refunded',
      'refunded',
      'not_required',
      'expired'
    )),
  add constraint orders_fulfillment_status_check
    check (fulfillment_status in (
      'new',
      'queued',
      'ready_for_pickup',
      'packed',
      'label_created',
      'shipped',
      'completed',
      'cancelled',
      'not_started'
    ));

update public.orders
set
  status = 'abandoned',
  payment_status = 'expired',
  fulfillment_status = 'not_started',
  checkout_expired_at = coalesce(cancelled_at, updated_at, created_at),
  cancelled_at = null,
  cancel_reason = null
where status = 'cancelled'
  and payment_status = 'failed'
  and cancel_reason = 'Stripe Checkout session expired.';

update public.order_events
set
  event_key = replace(event_key, 'order_cancelled:', 'checkout_abandoned:'),
  event_type = 'checkout_abandoned',
  title = 'Checkout expired',
  description = 'The Stripe Checkout session expired before payment was completed.',
  event_data = event_data || jsonb_build_object('reason', 'stripe_checkout_expired')
where event_type = 'order_cancelled'
  and description = 'The Stripe Checkout session expired before payment completed.';

drop policy if exists orders_select_own on public.orders;

create policy orders_select_own
on public.orders
for select
to authenticated
using (
  status <> 'abandoned'
  and (
    (select auth.uid()) = auth_user_id
    or lower(coalesce(email, '')) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  )
);
