Supabase migration notes

1. Run the SQL in supabase/migrations/20260413_initial_schema.sql inside the Supabase SQL editor.
2. Deploy the Edge Function in supabase/functions/book-repair.
3. Set these function secrets before deployment:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - RESEND_API_KEY_BOOKING or RESEND_API_KEY
   - BOOKING_FROM_EMAIL
   - REPAIR_NOTIFICATION_EMAIL (optional extra internal notification recipient)
   - Optional store overrides: STORE_NOTIFICATION_EMAIL_PARK_RIDGE, STORE_NOTIFICATION_EMAIL_FAIRFIELD, STORE_NOTIFICATION_EMAIL_TOOWONG, STORE_NOTIFICATION_EMAIL_NORTH_LAKES, STORE_NOTIFICATION_EMAIL_BRASSALL
4. Deploy the Edge Function in supabase/functions/sync-product-images when you want product photos copied into Supabase Storage instead of using external source URLs.
5. Run the SQL in supabase/seeds/20260414_techm8_controllers.sql to create the first 5 controller products.
6. After the products exist, trigger the sync-product-images function once. It will:
   - create the `product-images` bucket if needed
   - download the 5 official product images
   - upload them into Supabase Storage
   - update `products.image_url`
   - recreate the related `product_images` rows with Supabase public URLs
7. Booking email notifications are sent through Resend. Each repair booking sends the internal notification to the selected store email plus techm8contact@gmail.com. REPAIR_NOTIFICATION_EMAIL can add another internal recipient.
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

Order operations

The order workflow is implemented by these Edge Functions:

- `submit-order`: creates pay-in-store orders, generates the English order confirmation, and emails the customer, selected store, and central TECHM8 contact.
- `create-checkout-session`: creates Stripe Checkout orders and captures the customer billing/contact details.
- `stripe-webhook`: confirms Stripe payments and refunds, generates invoices or credit notes, and sends the three-party emails.
- `order-document`: returns short-lived signed URLs for customer-owned confirmations, invoices, and credit notes.
- `admin-panel`: provides order details, document generation, fulfilment actions, cancellation, email retry, and authorised full/partial refunds.

Apply `supabase/migrations/20260713100124_order_operations_notifications_documents_refunds.sql` before deploying these functions. The migration creates private order documents, notification/refund/event ledgers, and the private `order-documents` Storage bucket.

Required function secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SITE_URL`
- `RESEND_API_KEY_ORDER` (falls back to the existing booking/general Resend keys)
- `ORDER_FROM_EMAIL` (must be a Resend-verified sender; falls back to the existing booking/general sender)
- `TECHM8_CENTRAL_ORDER_EMAIL` (defaults to `techm8contact@gmail.com`)
- `TECHM8_BUSINESS_NAME` (defaults to `YQM PTY LTD`)
- `TECHM8_TRADING_NAME` (defaults to `TECHM8`)
- `TECHM8_ABN`
- `TECHM8_GST_REGISTERED=true` only when the business is GST registered

The Stripe webhook must subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `invoice.paid` and `invoice.payment_succeeded` for legacy Stripe-invoice orders
- `refund.created`
- `refund.updated`
- `refund.failed`
- `charge.refunded`

The generated A6 shipping PDF is an internal address/packing label. It is deliberately marked as requiring postage or a carrier label; it is not a paid Australia Post/MyPost label. A carrier API account is required before postage purchase and lodgement can be automated.

Pickup submissions automatically generate a packing slip and A6 Pickup Docket. These internal documents are attached to the selected store and central TECHM8 notification emails; the customer receives the order confirmation and applicable invoice only.
