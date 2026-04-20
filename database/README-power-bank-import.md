Power bank Excel import
=======================

This import path keeps new supplier products in the same shared catalog schema as the
existing TECHM8 online store.

What it updates
---------------

- `public.products`
- `public.product_images`
- `public.product_store_inventory`
- Supabase Storage bucket: `product-images`

Before first upload
-------------------

1. Run the migration:
   - `supabase/migrations/20260420_power_bank_catalog_support.sql`
2. Ensure the `warehouse-dispatch` store already exists.
3. Set environment variables before running upload mode:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

Preview mode
------------

This parses the Excel and extracts local images without uploading:

```powershell
.\database\import-power-banks.ps1 -ImageRoot 'E:\垃圾箱\充电宝照片'
```

Upload mode
-----------

This writes products, images and warehouse inventory to Supabase:

```powershell
.\database\import-power-banks.ps1 -ImageRoot 'E:\垃圾箱\充电宝照片' -UploadToSupabase
```

Generated output
----------------

- `database/generated/power-bank-import/products.json`
- `database/generated/power-bank-import/summary.json`
- extracted local image cache under `database/generated/power-bank-import/images/`
