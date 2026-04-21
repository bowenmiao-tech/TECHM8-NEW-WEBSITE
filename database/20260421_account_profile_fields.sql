alter table if exists public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists business_name text,
  add column if not exists address_line_1 text,
  add column if not exists address_line_2 text,
  add column if not exists suburb text,
  add column if not exists postcode text,
  add column if not exists state text,
  add column if not exists service_email_opt_in boolean,
  add column if not exists marketing_opt_in boolean;

update public.profiles
set
  first_name = coalesce(first_name, nullif(split_part(full_name, ' ', 1), '')),
  last_name = coalesce(
    last_name,
    nullif(
      regexp_replace(
        coalesce(full_name, ''),
        '^\S+\s*',
        ''
      ),
      ''
    )
  )
where coalesce(full_name, '') <> '';

comment on column public.profiles.first_name is 'Customer first name used in account details and checkout prefills.';
comment on column public.profiles.last_name is 'Customer last name used in account details and checkout prefills.';
comment on column public.profiles.business_name is 'Optional business name for non-residential deliveries.';
comment on column public.profiles.address_line_1 is 'Primary delivery or contact address line.';
comment on column public.profiles.address_line_2 is 'Secondary delivery address line.';
comment on column public.profiles.suburb is 'Australian suburb / locality.';
comment on column public.profiles.postcode is 'Australian 4-digit postcode.';
comment on column public.profiles.state is 'Australian state or territory abbreviation.';
comment on column public.profiles.service_email_opt_in is 'Customer preference for service/order related emails.';
comment on column public.profiles.marketing_opt_in is 'Customer preference for promotional marketing emails.';
