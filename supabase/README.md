Supabase migration notes

1. Run the SQL in supabase/migrations/20260413_initial_schema.sql inside the Supabase SQL editor.
2. Deploy the Edge Function in supabase/functions/book-repair.
3. Set these function secrets before deployment:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
4. If you want booking email notifications, add a mail provider key in the function later.
5. The frontend booking form is already prepared to call:
   https://<project-ref>.supabase.co/functions/v1/book-repair
