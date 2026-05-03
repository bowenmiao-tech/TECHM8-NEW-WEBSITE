create table if not exists public.customer_contacts (
  id bigserial primary key,
  contact_key text not null unique,
  auth_user_id uuid references auth.users(id) on delete set null,
  first_name text,
  last_name text,
  full_name text,
  email text,
  email_normalized text,
  phone_primary text,
  phone_secondary text,
  phone_other text,
  company text,
  business_name text,
  abn_crn text,
  labels text,
  address_type text,
  address_line_1 text,
  address_line_2 text,
  suburb text,
  state text,
  postcode text,
  country text,
  billing_address_line_1 text,
  billing_suburb text,
  billing_state text,
  billing_postcode text,
  billing_country text,
  email_subscriber_status text,
  sms_subscriber_status text,
  last_activity text,
  last_activity_at timestamptz,
  source text,
  language text,
  external_created_at timestamptz,
  raw_data jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customer_contacts_email on public.customer_contacts (email_normalized);
create index if not exists idx_customer_contacts_phone on public.customer_contacts (phone_primary);
create index if not exists idx_customer_contacts_auth_user_id on public.customer_contacts (auth_user_id);
create index if not exists idx_customer_contacts_imported_at on public.customer_contacts (imported_at desc);

drop trigger if exists set_updated_at_customer_contacts on public.customer_contacts;
create trigger set_updated_at_customer_contacts
before update on public.customer_contacts
for each row execute function public.set_updated_at();

alter table public.customer_contacts enable row level security;

comment on table public.customer_contacts is 'Imported customer contacts from the legacy Wix website. These rows are not login accounts; profiles remain tied to verified Supabase auth users.';
comment on column public.customer_contacts.contact_key is 'Deterministic import key based on email, phone, or legacy row data for safe upserts.';
comment on column public.customer_contacts.raw_data is 'Original CSV row JSON kept for future reconciliation and migration.';

update public.customer_contacts cc
set auth_user_id = p.id
from public.profiles p
where cc.auth_user_id is null
  and cc.email_normalized is not null
  and lower(coalesce(p.email, '')) = cc.email_normalized;
