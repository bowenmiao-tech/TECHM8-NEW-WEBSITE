grant select on table public.pos_category_taxonomy to anon, authenticated;

drop policy if exists "public can read active POS taxonomy" on public.pos_category_taxonomy;
create policy "public can read active POS taxonomy"
on public.pos_category_taxonomy
for select
to anon, authenticated
using (active = true);

with legacy_category_mapping(old_category_name, pos_category_name, pos_subcategory_name) as (
  values
    ('PS5 Controllers', 'Computer & Gaming', 'Consoles & Controllers'),
    ('MacBook Chargers', 'Charging & Power', 'Laptop Chargers'),
    ('Power Banks', 'Charging & Power', 'Power Banks'),
    ('Speakers', 'Audio', 'Speakers'),
    ('Car Chargers', 'Charging & Power', 'Car Chargers'),
    ('Wall Chargers', 'Charging & Power', 'Wall Chargers'),
    ('Wireless Charger', 'Charging & Power', 'Wireless Chargers'),
    ('Liquid Cooling', 'Computer & Gaming', 'PC Components'),
    ('Cable', 'Cables & Adapters', 'Charging & Data Cables')
)
update public.products as product
set pos_category_id = taxonomy.id
from public.categories as legacy_category,
     legacy_category_mapping as mapping,
     public.pos_category_taxonomy as taxonomy
where product.category_id = legacy_category.id
  and legacy_category.name = mapping.old_category_name
  and taxonomy.category_name = mapping.pos_category_name
  and taxonomy.subcategory_name = mapping.pos_subcategory_name
  and taxonomy.active = true
  and product.is_visible = true
  and product.pos_category_id is null;

update public.products as product
set pos_category_id = taxonomy.id
from public.categories as legacy_category,
     public.pos_category_taxonomy as taxonomy
where product.category_id = legacy_category.id
  and legacy_category.name = 'Accessories'
  and taxonomy.category_name = 'Cables & Adapters'
  and taxonomy.subcategory_name = 'Car Connectivity'
  and taxonomy.active = true
  and product.is_visible = true
  and product.pos_category_id is null
  and (
    product.name ilike '%CarPlay%'
    or product.name ilike '%FM Transmitter%'
  );

update public.products as product
set pos_category_id = taxonomy.id
from public.categories as legacy_category,
     public.pos_category_taxonomy as taxonomy
where product.category_id = legacy_category.id
  and legacy_category.name = 'Accessories'
  and taxonomy.category_name = 'Uncategorized'
  and taxonomy.subcategory_name = 'Uncategorized'
  and taxonomy.active = true
  and product.is_visible = true
  and product.pos_category_id is null;
