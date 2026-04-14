Supabase migration notes

1. Run the SQL in supabase/migrations/20260413_initial_schema.sql inside the Supabase SQL editor.
2. Deploy the Edge Function in supabase/functions/book-repair.
3. Set these function secrets before deployment:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
4. Deploy the Edge Function in supabase/functions/sync-product-images when you want product photos copied into Supabase Storage instead of using external source URLs.
5. Run the SQL in supabase/seeds/20260414_techm8_controllers.sql to create the first 5 controller products.
6. After the products exist, trigger the sync-product-images function once. It will:
   - create the `product-images` bucket if needed
   - download the 5 official product images
   - upload them into Supabase Storage
   - update `products.image_url`
   - recreate the related `product_images` rows with Supabase public URLs
7. If you want booking email notifications, add a mail provider key in the function later.
8. The frontend booking form is already prepared to call:
   https://<project-ref>.supabase.co/functions/v1/book-repair
