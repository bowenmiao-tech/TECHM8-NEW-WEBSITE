-- Card & wallets no longer carries a customer process fee, and is switched off
-- for now. Re-enable later with: update payment_fee_profiles set is_enabled = true where code = 'card';
update public.payment_fee_profiles
set fee_type = 'none',
    percentage = 0,
    fixed_amount = 0,
    is_enabled = false,
    updated_at = timezone('utc', now())
where code = 'card';
