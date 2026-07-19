create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.request_catalog_prerender()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hook_url text;
  hook_secret text;
begin
  select decrypted_secret
  into hook_url
  from vault.decrypted_secrets
  where name = 'catalog_refresh_webhook_url';

  select decrypted_secret
  into hook_secret
  from vault.decrypted_secrets
  where name = 'catalog_refresh_webhook_secret';

  if coalesce(hook_url, '') = '' or coalesce(hook_secret, '') = '' then
    raise warning 'Catalog refresh webhook is not configured in Vault.';
    return null;
  end if;

  perform net.http_post(
    url := hook_url,
    body := jsonb_build_object(
      'schema', tg_table_schema,
      'table', tg_table_name,
      'type', tg_op,
      'requested_at', statement_timestamp()
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', hook_secret
    ),
    timeout_milliseconds := 5000
  );

  return null;
exception
  when others then
    raise warning 'Catalog refresh webhook could not be queued: %', sqlerrm;
    return null;
end;
$$;

revoke all on function private.request_catalog_prerender() from public;
revoke all on function private.request_catalog_prerender() from anon;
revoke all on function private.request_catalog_prerender() from authenticated;

drop trigger if exists products_request_catalog_prerender on public.products;
create trigger products_request_catalog_prerender
after insert or update or delete on public.products
for each statement execute function private.request_catalog_prerender();

drop trigger if exists product_images_request_catalog_prerender on public.product_images;
create trigger product_images_request_catalog_prerender
after insert or update or delete on public.product_images
for each statement execute function private.request_catalog_prerender();

drop trigger if exists categories_request_catalog_prerender on public.categories;
create trigger categories_request_catalog_prerender
after insert or update or delete on public.categories
for each statement execute function private.request_catalog_prerender();
