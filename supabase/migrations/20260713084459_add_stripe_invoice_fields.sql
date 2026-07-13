alter table public.orders
  add column if not exists stripe_invoice_id text,
  add column if not exists stripe_invoice_number text,
  add column if not exists stripe_invoice_url text,
  add column if not exists stripe_invoice_pdf_url text;

comment on column public.orders.stripe_invoice_id is
  'Stripe invoice ID generated for a completed online checkout.';
comment on column public.orders.stripe_invoice_number is
  'Customer-facing Stripe invoice number.';
comment on column public.orders.stripe_invoice_url is
  'Stripe-hosted invoice page URL.';
comment on column public.orders.stripe_invoice_pdf_url is
  'Stripe-hosted downloadable invoice PDF URL.';
