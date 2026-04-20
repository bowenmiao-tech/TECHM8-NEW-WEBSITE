create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  default_store_slug text,
  avatar_url text,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_email on public.profiles (lower(email));

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    avatar_url,
    provider
  )
  values (
    new.id,
    new.email,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(coalesce(new.raw_app_meta_data ->> 'provider', new.raw_user_meta_data ->> 'provider'), '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    provider = coalesce(excluded.provider, public.profiles.provider),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table if exists public.orders add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table if exists public.repair_bookings add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_orders_auth_user_id on public.orders (auth_user_id, created_at desc);
create index if not exists idx_repair_bookings_auth_user_id on public.repair_bookings (auth_user_id, created_at desc);

update public.orders o
set auth_user_id = p.id
from public.profiles p
where o.auth_user_id is null
  and p.email is not null
  and lower(coalesce(o.email, '')) = lower(p.email);

update public.repair_bookings rb
set auth_user_id = p.id
from public.profiles p
where rb.auth_user_id is null
  and p.email is not null
  and lower(coalesce(rb.email, '')) = lower(p.email);

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.repair_bookings enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
on public.orders
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "repair_bookings_select_own" on public.repair_bookings;
create policy "repair_bookings_select_own"
on public.repair_bookings
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

grant select, insert, update on public.profiles to authenticated;
grant select on public.orders to authenticated;
grant select on public.repair_bookings to authenticated;
