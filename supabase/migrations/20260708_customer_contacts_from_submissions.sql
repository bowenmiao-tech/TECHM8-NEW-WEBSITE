alter table public.orders
add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

alter table public.repair_bookings
add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_orders_auth_user_id on public.orders (auth_user_id);
create index if not exists idx_repair_bookings_auth_user_id on public.repair_bookings (auth_user_id);

create or replace function public.normalize_customer_contact_email(value text)
returns text
language sql
immutable
as $$
  select case
    when value is null then null
    when lower(trim(value)) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(trim(value))
    else null
  end
$$;

create or replace function public.normalize_customer_contact_phone(value text)
returns text
language plpgsql
immutable
as $$
declare
  compact text;
  digits text;
begin
  compact := regexp_replace(coalesce(value, ''), '[^\d+]', '', 'g');
  digits := regexp_replace(coalesce(value, ''), '\D', '', 'g');

  if compact = '' then
    return null;
  end if;

  if compact like '+61%' then
    return nullif('0' || regexp_replace(substr(compact, 4), '\D', '', 'g'), '0');
  end if;

  if digits like '61%' and length(digits) >= 11 then
    return nullif('0' || substr(digits, 3), '0');
  end if;

  return compact;
end
$$;

create or replace function public.customer_contact_key_for_submission(email text, phone text)
returns text
language plpgsql
immutable
as $$
declare
  normalized_email text;
  normalized_phone text;
begin
  normalized_email := public.normalize_customer_contact_email(email);
  normalized_phone := public.normalize_customer_contact_phone(phone);

  if normalized_email is not null then
    return 'email:' || normalized_email;
  end if;

  if normalized_phone is not null then
    return 'phone:' || regexp_replace(normalized_phone, '\D', '', 'g');
  end if;

  return null;
end
$$;

create or replace function public.merge_customer_contact_labels(existing_labels text, incoming_labels text)
returns text
language sql
immutable
as $$
  select nullif(
    array_to_string(
      array(
        select distinct trim(label) as label
        from unnest(string_to_array(concat_ws(',', existing_labels, incoming_labels), ',')) as label
        where trim(label) <> ''
        order by label
      ),
      ', '
    ),
    ''
  )
$$;

create or replace function public.upsert_customer_contact_from_submission(
  submission_type text,
  submission_id bigint,
  submission_code text,
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_auth_user_id uuid,
  submission_store_slug text,
  submission_contact_method text,
  submission_created_at timestamptz,
  submission_raw_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  normalized_phone text;
  normalized_name text;
  contact_key_value text;
  activity_label text;
  source_label text;
  raw_payload jsonb;
begin
  normalized_email := public.normalize_customer_contact_email(customer_email);
  normalized_phone := public.normalize_customer_contact_phone(customer_phone);
  normalized_name := nullif(trim(coalesce(customer_name, '')), '');
  contact_key_value := public.customer_contact_key_for_submission(customer_email, customer_phone);

  if contact_key_value is null and normalized_name is null then
    return;
  end if;

  if contact_key_value is null then
    contact_key_value := 'submission:' || coalesce(submission_type, 'unknown') || ':' || coalesce(submission_id::text, md5(coalesce(normalized_name, '') || coalesce(submission_code, '') || coalesce(submission_created_at::text, '')));
  end if;

  activity_label := case submission_type
    when 'repair_booking' then 'Repair booking submitted'
    when 'order' then 'Order submitted'
    else 'Website submission'
  end;

  source_label := case submission_type
    when 'repair_booking' then 'Website Repair Booking'
    when 'order' then 'Website Order'
    else 'Website'
  end;

  raw_payload := jsonb_build_object(
    submission_type,
    jsonb_build_object(
      'id', submission_id,
      'code', submission_code,
      'store_slug', submission_store_slug,
      'preferred_contact_method', submission_contact_method,
      'created_at', submission_created_at
    ) || coalesce(submission_raw_data, '{}'::jsonb)
  );

  insert into public.customer_contacts (
    contact_key,
    auth_user_id,
    full_name,
    email,
    email_normalized,
    phone_primary,
    labels,
    country,
    email_subscriber_status,
    sms_subscriber_status,
    last_activity,
    last_activity_at,
    source,
    raw_data
  )
  values (
    contact_key_value,
    customer_auth_user_id,
    normalized_name,
    coalesce(normalized_email, nullif(trim(coalesce(customer_email, '')), '')),
    normalized_email,
    normalized_phone,
    source_label,
    'AU',
    'NOT_SET',
    'NOT_SET',
    activity_label,
    coalesce(submission_created_at, now()),
    source_label,
    raw_payload
  )
  on conflict (contact_key) do update
  set
    auth_user_id = coalesce(public.customer_contacts.auth_user_id, excluded.auth_user_id),
    full_name = coalesce(excluded.full_name, public.customer_contacts.full_name),
    email = coalesce(excluded.email, public.customer_contacts.email),
    email_normalized = coalesce(excluded.email_normalized, public.customer_contacts.email_normalized),
    phone_primary = coalesce(excluded.phone_primary, public.customer_contacts.phone_primary),
    labels = public.merge_customer_contact_labels(public.customer_contacts.labels, excluded.labels),
    country = coalesce(public.customer_contacts.country, excluded.country),
    email_subscriber_status = coalesce(public.customer_contacts.email_subscriber_status, excluded.email_subscriber_status),
    sms_subscriber_status = coalesce(public.customer_contacts.sms_subscriber_status, excluded.sms_subscriber_status),
    last_activity = case
      when coalesce(excluded.last_activity_at, '-infinity'::timestamptz) >= coalesce(public.customer_contacts.last_activity_at, '-infinity'::timestamptz)
        then excluded.last_activity
      else public.customer_contacts.last_activity
    end,
    last_activity_at = greatest(
      coalesce(public.customer_contacts.last_activity_at, '-infinity'::timestamptz),
      coalesce(excluded.last_activity_at, '-infinity'::timestamptz)
    ),
    source = coalesce(public.customer_contacts.source, excluded.source),
    raw_data = coalesce(public.customer_contacts.raw_data, '{}'::jsonb) || excluded.raw_data;
end
$$;

create or replace function public.sync_customer_contact_from_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.upsert_customer_contact_from_submission(
    'order',
    new.id,
    new.order_code,
    new.customer_name,
    new.phone,
    new.email,
    new.auth_user_id,
    new.store_slug,
    new.preferred_contact_method,
    new.created_at,
    jsonb_build_object(
      'fulfillment_method', new.fulfillment_method,
      'payment_status', new.payment_status,
      'status', new.status,
      'total_amount', new.total_amount,
      'shipping_email', new.shipping_email,
      'shipping_phone', new.shipping_phone
    )
  );

  return new;
end
$$;

create or replace function public.sync_customer_contact_from_repair_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.upsert_customer_contact_from_submission(
    'repair_booking',
    new.id,
    new.booking_code,
    new.customer_name,
    new.phone,
    new.email,
    new.auth_user_id,
    new.store_slug,
    new.preferred_contact_method,
    new.created_at,
    jsonb_build_object(
      'repair_category', new.repair_category,
      'brand', new.brand,
      'device_model', new.device_model,
      'preferred_date', new.preferred_date,
      'preferred_time', new.preferred_time,
      'status', new.status
    )
  );

  return new;
end
$$;

drop trigger if exists sync_customer_contact_after_order_write on public.orders;
create trigger sync_customer_contact_after_order_write
after insert or update of customer_name, phone, email, auth_user_id, store_slug, preferred_contact_method, status, payment_status
on public.orders
for each row execute function public.sync_customer_contact_from_order();

drop trigger if exists sync_customer_contact_after_repair_booking_write on public.repair_bookings;
create trigger sync_customer_contact_after_repair_booking_write
after insert or update of customer_name, phone, email, auth_user_id, store_slug, preferred_contact_method, status
on public.repair_bookings
for each row execute function public.sync_customer_contact_from_repair_booking();

select public.upsert_customer_contact_from_submission(
  'order',
  id,
  order_code,
  customer_name,
  phone,
  email,
  auth_user_id,
  store_slug,
  preferred_contact_method,
  created_at,
  jsonb_build_object(
    'fulfillment_method', fulfillment_method,
    'payment_status', payment_status,
    'status', status,
    'total_amount', total_amount,
    'shipping_email', shipping_email,
    'shipping_phone', shipping_phone
  )
)
from public.orders
where nullif(trim(coalesce(email, '')), '') is not null
   or nullif(trim(coalesce(phone, '')), '') is not null
   or nullif(trim(coalesce(customer_name, '')), '') is not null;

select public.upsert_customer_contact_from_submission(
  'repair_booking',
  id,
  booking_code,
  customer_name,
  phone,
  email,
  auth_user_id,
  store_slug,
  preferred_contact_method,
  created_at,
  jsonb_build_object(
    'repair_category', repair_category,
    'brand', brand,
    'device_model', device_model,
    'preferred_date', preferred_date,
    'preferred_time', preferred_time,
    'status', status
  )
)
from public.repair_bookings
where nullif(trim(coalesce(email, '')), '') is not null
   or nullif(trim(coalesce(phone, '')), '') is not null
   or nullif(trim(coalesce(customer_name, '')), '') is not null;

comment on table public.customer_contacts is 'Customer contacts imported from legacy sources and automatically synced from website orders and repair bookings. These rows are not login accounts; profiles remain tied to verified Supabase auth users.';
