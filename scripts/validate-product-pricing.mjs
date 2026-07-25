import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const CURRENCY = "AUD";
const PRODUCTS_DIR = join(ROOT, "products");

const manifest = JSON.parse(
  await readFile(join(PRODUCTS_DIR, ".generated-manifest.json"), "utf8"),
);
const qualityReport = JSON.parse(
  await readFile(join(PRODUCTS_DIR, ".quality-report.json"), "utf8"),
);
const merchantFeed = await readFile(
  join(ROOT, "merchant-products.xml"),
  "utf8",
);
const publicMerchantFeed = await readFile(
  join(ROOT, "public", "merchant-products.xml"),
  "utf8",
);

const errors = [];
const formatAud = (value) =>
  `AU$${new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))}`;

if (merchantFeed !== publicMerchantFeed) {
  errors.push("Root and public Merchant Center feeds differ.");
}
if (/<g:price>[^<]*\bUSD\b/i.test(merchantFeed)) {
  errors.push("Merchant Center feed contains a USD price.");
}

const feedItems = new Map();
for (const match of merchantFeed.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
  const item = match[1];
  const id = item.match(/<g:id>([\s\S]*?)<\/g:id>/)?.[1]?.trim();
  const price = item.match(/<g:price>([\d.]+)\s+([A-Z]{3})<\/g:price>/);
  if (!id) {
    errors.push("Merchant Center feed contains an item without g:id.");
    continue;
  }
  if (!price) {
    errors.push(`Merchant Center item ${id} has an invalid g:price.`);
    continue;
  }
  feedItems.set(id, {
    amount: Number(price[1]),
    currency: price[2],
  });
}

const indexableSlugs = new Set(
  qualityReport.products
    .filter((product) => product.indexable)
    .map((product) => product.slug),
);

for (const slug of manifest.slugs) {
  const html = await readFile(join(PRODUCTS_DIR, slug, "index.html"), "utf8");
  const embeddedMatch = html.match(
    /<script type="application\/json" data-prerendered-product>([\s\S]*?)<\/script>/,
  );
  const jsonLdMatch = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );

  if (!embeddedMatch) {
    errors.push(`${slug}: missing embedded product data.`);
    continue;
  }

  const embedded = JSON.parse(embeddedMatch[1]);
  const amount = Number(embedded.retail_price);
  const expectedDisplay = formatAud(amount);
  const expectedAmount = amount.toFixed(2);

  if (!(amount > 0)) {
    errors.push(`${slug}: retail_price must be greater than zero.`);
  }
  if (!html.includes(`lang="en-AU"`)) {
    errors.push(`${slug}: page language is not en-AU.`);
  }
  if (
    !html.includes(
      `property="product:price:amount" content="${expectedAmount}"`,
    )
  ) {
    errors.push(`${slug}: Open Graph price amount does not match Supabase.`);
  }
  if (
    !html.includes(
      `property="product:price:currency" content="${CURRENCY}"`,
    )
  ) {
    errors.push(`${slug}: Open Graph price currency is not AUD.`);
  }
  if (
    !html.includes(
      `data-product-price="${expectedAmount}" data-price-currency="${CURRENCY}"`,
    )
  ) {
    errors.push(`${slug}: visible price metadata does not match Supabase.`);
  }
  if (!html.includes(`storefront-pdp__price-main">${expectedDisplay}</div>`)) {
    errors.push(`${slug}: visible price is not formatted as ${expectedDisplay}.`);
  }

  if (indexableSlugs.has(slug)) {
    if (!jsonLdMatch) {
      errors.push(`${slug}: indexable product is missing Product JSON-LD.`);
      continue;
    }
    const jsonLd = JSON.parse(jsonLdMatch[1]);
    const product = jsonLd["@graph"]?.find((item) => item["@type"] === "Product");
    if (!product?.offers) {
      errors.push(`${slug}: Product JSON-LD is missing offers.`);
    } else {
      if (Number(product.offers.price) !== amount) {
        errors.push(`${slug}: JSON-LD price does not match Supabase.`);
      }
      if (product.offers.priceCurrency !== CURRENCY) {
        errors.push(`${slug}: JSON-LD priceCurrency is not AUD.`);
      }
    }

    const feedId = String(embedded.sku || `techm8-${embedded.id}`);
    const feedPrice = feedItems.get(feedId);
    if (!feedPrice) {
      errors.push(`${slug}: missing from Merchant Center feed.`);
    } else {
      if (feedPrice.amount !== amount) {
        errors.push(`${slug}: Merchant Center feed price does not match Supabase.`);
      }
      if (feedPrice.currency !== CURRENCY) {
        errors.push(`${slug}: Merchant Center feed currency is not AUD.`);
      }
    }
  }
}

if (feedItems.size !== indexableSlugs.size) {
  errors.push(
    `Merchant Center feed has ${feedItems.size} items; expected ${indexableSlugs.size}.`,
  );
}

if (errors.length) {
  console.error(`Pricing validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${manifest.slugs.length} product pages and ${feedItems.size} AUD Merchant Center items.`,
  );
}
