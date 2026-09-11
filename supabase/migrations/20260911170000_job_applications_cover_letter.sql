-- Optional supporting document alongside the required resume / CV.
--
-- The careers form now offers a second upload for a cover letter, certificates
-- or references. It is optional, so every column here is nullable; the resume
-- columns stay the required pair.

alter table public.job_applications
  add column if not exists cover_letter_path text,
  add column if not exists cover_letter_filename text,
  add column if not exists cover_letter_mime_type text,
  add column if not exists cover_letter_size_bytes integer;

comment on column public.job_applications.cover_letter_path is
  'Object path in the private job-applications bucket for the optional supporting document. Null when the applicant did not attach one.';
