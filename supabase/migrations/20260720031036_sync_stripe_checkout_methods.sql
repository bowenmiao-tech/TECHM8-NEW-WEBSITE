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
values
  ('card', 'Card & wallets', 'stripe', 'combined', 1.700, 0.30, true, 20, 'Card checkout with eligible Apple Pay, Google Pay and Link wallets shown by Stripe.'),
  ('afterpay_clearpay', 'Afterpay', 'stripe', 'combined', 6.000, 0.30, true, 40, 'Stripe-managed Afterpay checkout using the current AU standard rate.'),
  ('klarna', 'Klarna', 'stripe', 'combined', 4.990, 0.55, true, 45, 'Stripe-managed Klarna checkout using the current AU standard rate.'),
  ('zip', 'Zip', 'stripe', 'combined', 5.490, 0.30, true, 50, 'Stripe-managed Zip checkout using the current AU standard rate.'),
  ('wechat_pay', 'WeChat Pay', 'stripe', 'combined', 2.900, 0.30, true, 60, 'Stripe-managed WeChat Pay checkout using the current AU standard rate.')
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

update public.payment_fee_profiles
set is_enabled = false,
    updated_at = timezone('utc', now())
where code in ('apple_pay', 'paypal');
