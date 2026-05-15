insert into public.categories (slug, name, description, sort_order)
select
  'wall-chargers',
  'Wall Chargers',
  'Wall charging adapters and power plugs.',
  120
where not exists (
  select 1
  from public.categories
  where slug = 'wall-chargers'
);
