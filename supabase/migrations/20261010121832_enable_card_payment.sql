-- Card & wallets is back on, still with no customer process fee.
update public.payment_fee_profiles
set fee_type = 'none',
    percentage = 0,
    fixed_amount = 0,
    is_enabled = true,
    updated_at = timezone('utc', now())
where code = 'card';
