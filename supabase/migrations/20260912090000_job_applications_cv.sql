-- The optional second upload is a CV, not a cover letter.
--
-- 20260911170000 added the columns as cover_letter_*, which no longer describes
-- what they hold. Renaming keeps the column names honest. Guarded so a replay
-- from scratch, where the columns may already carry the new names, is a no-op.

do $$
declare
  column_rename record;
begin
  for column_rename in
    select *
    from (values
      ('cover_letter_path', 'cv_path'),
      ('cover_letter_filename', 'cv_filename'),
      ('cover_letter_mime_type', 'cv_mime_type'),
      ('cover_letter_size_bytes', 'cv_size_bytes')
    ) as t(old_name, new_name)
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'job_applications'
        and column_name = column_rename.old_name
    ) and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'job_applications'
        and column_name = column_rename.new_name
    ) then
      execute format(
        'alter table public.job_applications rename column %I to %I',
        column_rename.old_name,
        column_rename.new_name
      );
    end if;
  end loop;
end $$;

comment on column public.job_applications.cv_path is
  'Object path in the private job-applications bucket for the optional CV. Null when the applicant only attached a resume.';
