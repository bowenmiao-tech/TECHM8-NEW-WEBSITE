# TECHM8 website starter

This is a lightweight static starter for the TECHM8 homepage, store landing pages, online store entry page and store policy page.

## Included

- Sticky header
- Promo banner
- Category filters
- Product cards
- Call-to-action sections
- Footer
- SEO-ready independent store pages
- Starter MySQL schema for Hostinger

## Files

- `index.html` - homepage
- `shop.html` - online store entry page
- `store-policy.html` - store policy page
- `stores/*.html` - SEO store landing pages
- `styles.css` - shared styling
- `script.js` - product card filtering
- `database/schema.sql` - MySQL starter schema

## Hostinger deployment

1. Upload these files to your website root with File Manager or Git deployment.
2. Set your real online shop link by editing `shop.html` and the `Online Store` menu links.
3. Replace placeholder store names with your real branch names, addresses and contact details.
4. Import `database/schema.sql` into Hostinger phpMyAdmin when you are ready for backend data.

## Backend data plan

The schema already supports:

- Products
- Categories
- Suppliers
- Product images
- Stock by store
- Price history
- SEO store pages

Once you give the supplier website or price source, the next stage can be:

1. Clean the source data
2. Map each item to the schema
3. Import products into MySQL
4. Render live product cards and category pages from the database
