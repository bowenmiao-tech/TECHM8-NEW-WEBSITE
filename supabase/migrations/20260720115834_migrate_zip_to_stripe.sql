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
  'Zip',
  'stripe',
  'combined',
  5.49,
  0.30,
  false,
  45,
  'Stripe-managed Zip checkout. Customer fee mirrors the standard AU Zip rate: 5.49% + A$0.30.'
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
  notes = excluded.notes,
  updated_at = timezone('utc', now());
