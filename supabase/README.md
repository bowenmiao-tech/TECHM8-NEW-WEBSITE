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

Internal products API

Deploy the Edge Function in `supabase/functions/internal-products` when the internal website needs a product feed.

Set these function secrets before deployment:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTERNAL_PRODUCTS_API_KEY`

Deploy with JWT verification disabled because this endpoint uses its own `x-api-key` secret:

```bash
supabase functions deploy internal-products --no-verify-jwt
```

Endpoint:

```text
GET https://<project-ref>.supabase.co/functions/v1/internal-products
```

Required header:

```text
x-api-key: <INTERNAL_PRODUCTS_API_KEY>
```

Supported query parameters:

- `page`: defaults to `1`
- `limit` or `page_size`: defaults to `200`, max `500`
- `updated_since`: optional ISO timestamp for incremental sync
- `store_slug`: optional store inventory filter
- `include_hidden=true`: optional, includes products not visible on the website

Example:

```bash
curl "https://<project-ref>.supabase.co/functions/v1/internal-products?limit=200" \
  -H "x-api-key: <INTERNAL_PRODUCTS_API_KEY>"
```

Returned product fields:

- `name`: product name
- `category`: category object with id, slug, and name
- `category_id`: category id
- `category_slug`: category slug
- `category_name`: category name
- `cost_price`: cost price
- `sale_price`: current selling price from `retail_price`
- `store_inventory`: per-store stock rows with store name, store slug, quantity, and shelf location
- `barcode`: product UPC/barcode
- `thumbnail_url`: small product thumbnail URL
- `image_url`: original product image URL
