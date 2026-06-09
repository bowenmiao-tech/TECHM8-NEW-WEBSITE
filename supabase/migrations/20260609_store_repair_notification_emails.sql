update public.stores
set email = store_email_updates.email
from (
  values
    ('park-ridge', 'techm8.parkridge@gmail.com'),
    ('fairfield', 'techm8.fairfield@gmail.com'),
    ('toowong', 'techm8.toowong@gmail.com'),
    ('north-lakes', 'techm8.northlakes@gmail.com'),
    ('brassall', 'techm8.brassall@gmail.com')
) as store_email_updates(slug, email)
where public.stores.slug = store_email_updates.slug;
