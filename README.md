# TECHM8 Website

Current live domain: `https://www.techm8australia.com/`

This README is the project memory file. It records the current architecture, business rules, and implementation constraints that must be preserved in future sessions.

## Current Stack

- Frontend: static HTML/CSS/JS
- Build: Vite
- Shared frontend files:
  - `script.js`
  - `styles.css`
  - `ga4.js`
- Backend: Supabase
- Auth: Supabase Auth
- Payments: Stripe
- Transactional email: Resend via Supabase Edge Functions

## Important Live Pages

- Home: `/index.html`
- Online store: `/shop.html`
- Product listing: `/products.html`
- Product detail: `/product.html`
- Repair booking: `/book-repair.html`
- Checkout: `/checkout.html`
- Stores overview: `/stores.html`
- Repairs overview: `/repairs.html`
- Account: `/account.html`
- Admin product page: `/admin/products.html`

## Backend / Supabase Reality

Do not revert this project back to Hostinger MySQL logic. The current system uses Supabase.

### Main tables in active use

- `products`
- `categories`
- `product_images`
- `product_store_inventory`
- `orders`
- `order_items`
- `repair_bookings`
- `profiles`
- `stores`
- `payment_fee_profiles`

### Edge Functions in active use

- `book-repair`
- `submit-order`
- `create-checkout-session`
- `stripe-webhook`
- `sync-product-images`
- `admin-panel`

## Product Admin Rules

The admin product page must support these workflows:

- Create new product
- Clone existing product
- Delete product
- Import products from fixed-format Excel
- Add category
- Upload product images
- Drag to reorder product images
- First image is the storefront thumbnail / main image
- Edit rich product description

### Product image rules

- New uploaded `jpg`, `jpeg`, and `png` files should be converted to `webp` before upload
- Existing legacy images may still be `jpg` and may require later migration
- Do not rely on manual image URL entry as the main upload workflow

### Product card rules

- Storefront product cards do **not** show a `Details` button
- Clicking the card itself should open the product detail page
- Product cards do **not** show short description text
- `Add to cart` should be the main CTA and should be visually wider
- Stock data is stored, but stock should **not** block ordering on the storefront
- Products with `product_group_id` are displayed as one product card using the group's name and main image
- Sellable colours remain separate product rows with independent SKU, barcode, price, and stock
- A grouped product detail page shows colour links, and choosing a colour opens that exact sellable variant
- Do not infer grouping from similar device names when an explicit product group exists

### Product detail page rules

- The product details section title should be `Description`
- Do not use filler titles like `Everything about this product`
- Product detail content must support rich text and images

## Shop / Catalog UI Rules

### General

- Desktop and mobile layouts are intentionally different
- When changing desktop catalog layout, do not accidentally break mobile

### Mobile shop rules

- Only keep the compact top controls needed for filtering and sorting
- Remove large mobile filler sections such as:
  - `Filter products`
  - `Live products synced from your database`
- Categories should open from a left-side drawer
- Sorting should be accessible at the top
- Product cards must display at a maximum of 2 items per row

### Homepage latest products

- Home `New Arrived` must show the latest 6 products from the database
- Newness should be based on newest product creation / latest intended ordering logic
- This section should load fast and use cache where possible

## Checkout Rules

Checkout is a multi-step process and must keep this logic:

1. Account confirmation
2. Delivery / pickup selection
3. Payment and review

### Required behavior

- Steps 2 and 3 should stay hidden until step 1 is complete
- Right-side order summary should remain visible
- Contact details should not be duplicated unnecessarily across steps
- `pay_in_store` does not go to Stripe
- `pay_in_store` should create the order directly and show a local confirmation page
- Successful Stripe one-time payments must create a paid invoice
- Stripe invoice number, hosted invoice URL, and PDF URL must be saved on the order
- Customers must be able to open or download the invoice from the success and order-history pages

### Delivery / pickup rules

- Customer chooses either:
  - Click & Collect
  - Delivery
- Click & Collect requires store selection
- Delivery requires address entry and shipping method selection

### Shipping pricing rules

- Standard Australia Post: `AU$15.00`
- Free Standard over: `AU$399.00`
- Express Australia Post: `AU$18.00`
- Free Express over: `AU$599.00`

These values must be reflected in checkout logic and totals.

## Repair Booking Rules

Repair booking form rules:

- `Model` is required
- `Issue description` is required
- `Preferred date` is required
- `Preferred time` is required
- `Email` is required
- `Phone` is required
- Phone and email must be validated in Australian format
- Date format should be Australian format
- Preferred time options are fixed business-friendly options, not free text

### Repair booking email rules

When a customer submits a repair booking and provides email:

- Send confirmation to the customer
- Send notification to `techm8contact@gmail.com`
- Include:
  - booking code
  - store
  - store address
  - clickable map link
  - clickable phone number
  - preferred date/time
  - repair details

Resend is used through Supabase function secrets for this workflow.

## Auth / Account Rules

- Supabase Auth is the source of truth
- Email/password login is active
- Google login is intended to be active through Supabase OAuth
- Account registration requires email verification
- Password reset flow should use the production domain, not localhost

### Production auth URLs

Use:

- `https://www.techm8australia.com/`

Do not use:

- localhost
- old GitHub Pages URLs

## Customer Data Rules

Customer records are important for future marketing and operations.

Required capabilities:

- Search by name / email / phone
- Create customer
- Edit customer
- Delete customer

The long-term intent is to use this platform for future email / SMS marketing campaigns.

## Email / SMTP Rules

- Supabase Auth mails and booking/order mails should use the configured production email setup
- Resend is used for booking notifications
- Customer-facing mails should use TECHM8 branding and production domain links

## Local SEO Rules

Local SEO store pages are important and should follow the same pattern for each store page:

- Localized title
- Localized meta description
- Localized H1
- Canonical URL
- Open Graph tags
- Twitter tags
- `ElectronicsRepair` or equivalent LocalBusiness JSON-LD
- `FAQPage` JSON-LD
- Local areas served section
- Strong local suburb references around the store

### Current store pages already optimized in this style

- Park Ridge
- Fairfield
- Toowong
- North Lakes

### Important note on ratings schema

- `aggregateRating` caused Google rich result issues on some store pages
- Do not blindly re-add it without testing

## Search Console / Crawl Rules

Root files must exist and remain accessible:

- `/sitemap.xml`
- `/robots.txt`

These are required for indexing and Search Console submissions.

## Navigation / UX Regression Risks

Be careful with mobile navigation changes.

Known sensitive behavior:

- Mobile `Repairs > Phones` submenu has historically been fragile
- Changes to repairs navigation must be tested on mobile, not just desktop

## Analytics Rules

- GA4 is for the public storefront only
- Admin pages should not include GA4
- Track important conversion events, not just page views
- Do not send PII into GA4

Target frontend events include:

- `search`
- `view_item`
- `add_to_cart`
- `begin_checkout`
- `purchase_request_submitted`
- `repair_booking_submitted`
- `login`
- `sign_up`
- `select_store`
- `click_call`
- `click_map`

## Development Rules

- Prefer updating shared behavior in `script.js` and `styles.css`
- For manual file edits, use patch-based changes
- Build after meaningful frontend changes:

```powershell
npm run build
```

- If a behavior differs between desktop and mobile, preserve both intentionally

## Deployment Notes

- This project is deployed as a static frontend plus Supabase backend services
- Frontend deployment and Supabase function deployment are separate concerns
- When backend behavior changes, ensure matching Edge Functions are deployed
- When frontend behavior changes, ensure the latest static site is redeployed

### Generated catalog pages

- Supabase remains the source of truth for products, categories, prices, stock and images.
- `npm run prerender` reads only publicly visible catalog rows through the existing publishable/anon key and generates crawlable pages at `/products/<slug>/`.
- Generated pages include initial product HTML, canonical metadata and `Product`/`Offer` JSON-LD. The browser then refreshes the product from Supabase so customers receive current catalog data.
- `npm run build` runs prerendering before Vite.
- `.github/workflows/refresh-catalog-pages.yml` checks Supabase every 30 minutes and commits only when generated output changed. It can also be run manually or triggered with the `catalog-updated` repository dispatch event.
- `sitemap-products.xml` is generated automatically in both the repository root and `public/`, so it is available whether the site is served directly or from Vite's `dist/` output. It is advertised alongside the main sitemap in `robots.txt`.
- Set `TECHM8_SKIP_PRODUCT_PRERENDER=1` only for an offline build where the existing generated catalog must be preserved.

## Current Business Priorities

The most important business areas currently are:

- Online store usability and speed
- Repair booking reliability
- Local SEO for each store page
- Product admin workflow quality
- Customer/account system stability
- Email confirmations and operational notifications
