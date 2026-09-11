-- Applicants pick every store they could work at, not just one.
--
-- The careers form moved from a single-choice store radio to a multi-select,
-- and the "any store" pseudo-option was dropped: someone who can travel now
-- ticks several real stores instead, which tells the store managers more.

alter table public.job_applications
  add column if not exists store_slugs text[] not null default '{}';

-- Carry across anything captured while the column was single-valued. 'any' was
-- the old catch-all, so it expands to every store.
update public.job_applications
set store_slugs = case
  when store_slug = 'any'
    then array['park-ridge', 'fairfield', 'toowong', 'north-lakes', 'brassall']
  else array[store_slug]
end
where cardinality(store_slugs) = 0
  and store_slug is not null;

alter table public.job_applications drop column if exists store_slug;

-- store_slug backed this index; a GIN index suits membership lookups on the
-- array ("which applications include Toowong?").
drop index if exists public.idx_job_applications_store_status;
create index if not exists idx_job_applications_store_slugs
  on public.job_applications using gin (store_slugs);
create index if not exists idx_job_applications_status
  on public.job_applications (status, created_at desc);

comment on column public.job_applications.store_slugs is
  'Every store the applicant is willing to work at. At least one is required.';
