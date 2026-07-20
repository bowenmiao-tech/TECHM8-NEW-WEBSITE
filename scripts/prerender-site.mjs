import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import vm from "node:vm";

const ROOT = resolve(import.meta.dirname, "..");
const SITE_URL = "https://www.techm8australia.com";
const PRODUCTS_DIR = join(ROOT, "products");
const PRODUCT_MANIFEST = join(PRODUCTS_DIR, ".generated-manifest.json");
const PRODUCT_QUALITY_REPORT = join(PRODUCTS_DIR, ".quality-report.json");
const PRODUCT_SITEMAP = join(ROOT, "sitemap-products.xml");
const PUBLIC_PRODUCT_SITEMAP = join(ROOT, "public", "sitemap-products.xml");
const BUSINESS_FILES = [
  "business-services.html",
  "business-services/ndis-technology-support.html",
  "business-services/on-site-tech-services.html",
  "business-services/business-it-device-support.html",
];

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const stripHtml = (value = "") =>
  String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (value, maxLength) => {
  const text = stripHtml(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const TEMPLATE_CONTENT_PATTERNS = [
  /this is the name of your product/i,
  /the description of your product/i,
  /stock-keeping unit \(sku\) is a scannable barcode/i,
  /this column indicates the current condition/i,
  /this is your universal product code/i,
];

function getProductDescription(product) {
  return stripHtml(
    product.description ||
      product.short_description ||
      product.seo_description ||
      "",
  );
}

function assessProductQuality(product) {
  const blockers = [];
  const warnings = [];
  const description = getProductDescription(product);
  const sourceText = [
    product.name,
    product.sku,
    product.slug,
    product.description,
    product.short_description,
    product.seo_description,
    product.condition_label,
    product.upc,
  ]
    .filter(Boolean)
    .join(" ");

  if (TEMPLATE_CONTENT_PATTERNS.some((pattern) => pattern.test(sourceText))) {
    blockers.push("template-placeholder-content");
  }
  if (description.length < 40) {
    blockers.push("description-under-40-characters");
  } else if (description.length < 90) {
    warnings.push("description-under-90-characters");
  }
  if (!(Number(product.retail_price) > 0)) {
    blockers.push("missing-valid-price");
  }
  if (!product.display_image) {
    blockers.push("missing-product-image");
  }
  if (!String(product.brand || "").trim()) {
    warnings.push("missing-brand");
  }
  if (!String(product.sku || "").trim()) {
    warnings.push("missing-sku");
  }
  if (/(?:^|-)copy(?:-of)?(?:-|$)|(?:^|-)copy$/i.test(product.slug)) {
    warnings.push("copy-style-slug-review-needed");
  }

  const score = Math.max(0, 100 - blockers.length * 35 - warnings.length * 8);
  return {
    indexable: blockers.length === 0,
    score,
    blockers,
    warnings,
  };
}

function getSchemaCondition(conditionLabel) {
  const label = String(conditionLabel || "").toLowerCase();
  if (label.includes("refurb")) return "https://schema.org/RefurbishedCondition";
  if (label.includes("used") || label.includes("pre-owned")) {
    return "https://schema.org/UsedCondition";
  }
  if (label.includes("damaged")) return "https://schema.org/DamagedCondition";
  return "https://schema.org/NewCondition";
}

function getValidGtin(value) {
  const raw = String(value || "").trim();
  if (!/^\d+$/.test(raw) || ![8, 12, 13, 14].includes(raw.length)) return "";
  return raw;
}

const safeSlug = (value = "") => {
  const slug = String(value).trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : "";
};

const money = (value) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(Number(value) || 0);

async function readPublicSupabaseConfig() {
  const script = await readFile(join(ROOT, "script.js"), "utf8");
  const url =
    process.env.SUPABASE_URL ||
    script.match(/supabaseUrl:\s*["']([^"']+)["']/)?.[1] ||
    "";
  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    script.match(/supabaseAnonKey:\s*[\r\n\s]*["']([^"']+)["']/)?.[1] ||
    "";

  if (!url || !key) {
    throw new Error(
      "Public Supabase configuration is unavailable. Set SUPABASE_URL and SUPABASE_ANON_KEY.",
    );
  }

  return { url: url.replace(/\/+$/, ""), key };
}

async function fetchJson(url, key) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const endpoint = new URL(url);
    throw new Error(
      `Supabase request failed (${response.status}) for ${endpoint.pathname}${endpoint.search.slice(0, 180)}: ${detail.slice(0, 240)}`,
    );
  }

  return response.json();
}

async function loadCatalog() {
  const { url, key } = await readPublicSupabaseConfig();
  const productSelect = [
    "id",
    "sku",
    "slug",
    "name",
    "brand",
    "model",
    "short_description",
    "description",
    "condition_label",
    "compatibility",
    "stock_quantity",
    "retail_price",
    "compare_at_price",
    "image_url",
    "category_id",
    "created_at",
    "updated_at",
    "upc",
    "seo_description",
  ].join(",");

  const [products, categories] = await Promise.all([
    fetchJson(
      `${url}/rest/v1/products?select=${productSelect}&is_visible=eq.true&order=updated_at.desc,id.desc&limit=1000`,
      key,
    ),
    fetchJson(
      `${url}/rest/v1/categories?select=id,slug,name,description&order=sort_order.asc&limit=1000`,
      key,
    ),
  ]);

  const images = [];
  const productIds = products.map((product) => product.id).filter(Boolean);
  for (let index = 0; index < productIds.length; index += 40) {
    const ids = productIds.slice(index, index + 40);
    const filter = ids
      .map((id) => `"${String(id).replaceAll('"', '\\"')}"`)
      .join(",");
    const rows = await fetchJson(
      `${url}/rest/v1/product_images?select=product_id,image_url,alt_text,sort_order&product_id=in.(${encodeURIComponent(filter)})&limit=1000`,
      key,
    );
    images.push(...rows);
  }

  const categoryById = new Map(categories.map((item) => [item.id, item]));
  const imagesByProduct = new Map();
  for (const image of images) {
    if (!image?.product_id || !image?.image_url) continue;
    const current = imagesByProduct.get(image.product_id) || [];
    current.push(image);
    imagesByProduct.set(image.product_id, current);
  }

  return products
    .filter((product) => safeSlug(product.slug))
    .map((product) => {
      const category = categoryById.get(product.category_id) || null;
      const gallery = (imagesByProduct.get(product.id) || [])
        .sort(
          (left, right) =>
            (Number(left.sort_order) || 0) - (Number(right.sort_order) || 0),
        )
        .map((image) => ({
          product_id: image.product_id,
          image_url: image.image_url,
          alt_text: image.alt_text || product.name || "",
          sort_order: Number(image.sort_order) || 0,
        }));

      if (!gallery.length && product.image_url) {
        gallery.push({
          product_id: product.id,
          image_url: product.image_url,
          alt_text: product.name || "",
          sort_order: 0,
        });
      }

      return {
        ...product,
        retail_price: Number(product.retail_price) || 0,
        compare_at_price: Number(product.compare_at_price) || null,
        stock_quantity:
          product.stock_quantity === null || product.stock_quantity === undefined
            ? null
            : Number(product.stock_quantity),
        display_image: gallery[0]?.image_url || product.image_url || "",
        gallery_images: gallery,
        category_slug: category?.slug || "other-products",
        category_name: category?.name || "Other Products",
        category_description: category?.description || "",
      };
    });
}

function productJsonLd(product) {
  const canonical = `${SITE_URL}/products/${product.slug}/`;
  const description = truncate(
    product.seo_description ||
      product.short_description ||
      product.description ||
      `${product.name} available from the TECHM8 online store.`,
    500,
  );
  const organizationId = `${SITE_URL}/#organization`;
  const validGtin = getValidGtin(product.upc);
  const productData = {
    "@type": "Product",
    "@id": `${canonical}#product`,
    name: product.name,
    description,
    url: canonical,
    image: product.gallery_images.map((image) => image.image_url).filter(Boolean),
    sku: product.sku || undefined,
    gtin: validGtin || undefined,
    category: product.category_name || undefined,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand }
      : undefined,
    model: product.model || undefined,
  };

  if (product.retail_price > 0) {
    productData.offers = {
      "@type": "Offer",
      url: canonical,
      price: product.retail_price.toFixed(2),
      priceCurrency: "AUD",
      itemCondition: getSchemaCondition(product.condition_label),
      availability:
        Number.isFinite(product.stock_quantity) && product.stock_quantity <= 0
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      seller: { "@id": organizationId },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "AU",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 7,
        merchantReturnLink: `${SITE_URL}/store-policy.html#returns`,
        returnMethod: [
          "https://schema.org/ReturnByMail",
          "https://schema.org/ReturnInStore",
        ],
      },
    };
  }

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "TECHM8",
        legalName: "YQM PTY LTD",
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/assets/logo-techm8.png`,
        telephone: "+61452488710",
        email: "info@techm8australia.com",
        identifier: {
          "@type": "PropertyValue",
          propertyID: "ABN",
          value: "12 645 861 463",
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Online Store",
            item: `${SITE_URL}/shop.html`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: product.category_name,
            item: `${SITE_URL}/category.html?slug=${encodeURIComponent(product.category_slug)}`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: product.name,
            item: canonical,
          },
        ],
      },
      productData,
    ],
  };

  return JSON.stringify(data, (_, value) =>
    value === undefined || (Array.isArray(value) && !value.length)
      ? undefined
      : value,
  );
}

function renderProductPage(product) {
  const canonical = `${SITE_URL}/products/${product.slug}/`;
  const quality = assessProductQuality(product);
  const description = truncate(
    product.seo_description ||
      product.short_description ||
      product.description ||
      `${product.name} available from the TECHM8 online store.`,
    160,
  );
  const visibleDescription = stripHtml(
    product.description || product.short_description || description,
  );
  const image = product.gallery_images[0] || null;
  const embeddedProduct = JSON.stringify(product).replaceAll("<", "\\u003c");
  const comparePrice =
    product.compare_at_price > product.retail_price
      ? `<span class="storefront-pdp__compare">${escapeHtml(money(product.compare_at_price))}</span>`
      : "";
  const stockCopy =
    Number.isFinite(product.stock_quantity) && product.stock_quantity <= 0
      ? "Currently out of stock online"
      : "Availability is checked live before checkout";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(product.name)} | TECHM8 Online Store</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="${quality.indexable ? "index, follow, max-snippet:-1, max-image-preview:large" : "noindex, follow"}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="product">
  <meta property="og:title" content="${escapeHtml(product.name)} | TECHM8">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  ${image ? `<meta property="og:image" content="${escapeHtml(image.image_url)}">` : ""}
  ${quality.indexable ? `<script type="application/ld+json">${productJsonLd(product).replaceAll("<", "\\u003c")}</script>` : ""}
  <script type="application/json" data-prerendered-product>${embeddedProduct}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-7YLMGHMRDG"></script>
  <script defer src="/ga4.js"></script>
</head>
<body>
  <!-- GENERATED: TECHM8 product prerender. Supabase remains the source of truth. -->
  <div class="promo-banner"><div class="container promo-banner__inner"><span>TECHM8 online store product</span><a href="/shop.html">Back to online store</a></div></div>
  <header class="site-header"><div class="container nav">
    <a class="brand" href="/" aria-label="TECHM8 home"><img class="brand__logo" src="/assets/logo-techm8.png" alt="TECHM8 logo"></a>
    <nav class="nav__menu"><a href="/repairs.html">Repairs</a><a href="/blog.html">Tech Insights</a><a href="/stores.html">Store Locator</a><a href="/business-services.html">Business Services</a><a class="nav__cart-link" href="/cart.html">Cart <span class="nav__cart-count" data-cart-count>0</span></a><a class="nav__shop-link" href="/shop.html">Online Store</a></nav>
  </div></header>
  <main class="storefront-page storefront-page--detail" data-product-page data-product-slug="${escapeHtml(product.slug)}" data-content-quality="${quality.indexable ? "indexable" : "limited"}">
    <section class="section"><div class="container" data-product-shell>
      <div class="storefront-breadcrumbs"><a href="/">Home</a><span>/</span><a href="/shop.html">Online Store</a><span>/</span><a href="/category.html?slug=${encodeURIComponent(product.category_slug)}">${escapeHtml(product.category_name)}</a><span>/</span><span>${escapeHtml(product.name)}</span></div>
      <section class="storefront-pdp">
        <div class="storefront-pdp__gallery"><div class="storefront-pdp__gallery-main">${image ? `<img src="${escapeHtml(image.image_url)}" alt="${escapeHtml(image.alt_text || product.name)}" loading="eager" decoding="async" fetchpriority="high">` : `<div class="storefront-card__image storefront-card__image--placeholder">TECHM8</div>`}</div></div>
        <div class="storefront-pdp__summary">
          <p class="eyebrow">Online store item</p>
          <div class="storefront-pdp__brand-row"><span class="storefront-pdp__brand">${escapeHtml(product.brand || "TECHM8")}</span><span class="storefront-pdp__stock">${escapeHtml(stockCopy)}</span></div>
          <h1>${escapeHtml(product.name)}</h1>
          <p class="storefront-pdp__intro">${escapeHtml(visibleDescription)}</p>
          <div class="storefront-pdp__price-card"><div class="storefront-pdp__price-top">${comparePrice}</div><div class="storefront-pdp__price-main">${escapeHtml(money(product.retail_price))}</div></div>
          <div class="zip-widget-slot" data-zip-product-widget data-zip-price="${escapeHtml(String(product.retail_price))}" hidden></div>
          <div class="storefront-pdp__highlights"><div class="storefront-pdp__highlight"><strong>Brand</strong><span>${escapeHtml(product.brand || "TECHM8")}</span></div><div class="storefront-pdp__highlight"><strong>Category</strong><span>${escapeHtml(product.category_name)}</span></div></div>
        </div>
      </section>
      <section class="storefront-pdp__detail-stack">
        <article class="storefront-pdp__panel"><div class="section-heading"><div><p class="eyebrow">Product details</p><h2>Product information</h2></div></div><div class="storefront-rich-content"><p>${escapeHtml(visibleDescription)}</p>${product.compatibility ? `<h3>Compatibility</h3><p>${escapeHtml(stripHtml(product.compatibility))}</p>` : ""}${product.model ? `<p><strong>Model:</strong> ${escapeHtml(product.model)}</p>` : ""}${product.sku ? `<p><strong>SKU:</strong> ${escapeHtml(product.sku)}</p>` : ""}${product.condition_label ? `<p><strong>Condition:</strong> ${escapeHtml(product.condition_label)}</p>` : ""}</div></article>
        <article class="storefront-pdp__panel"><div class="section-heading"><div><p class="eyebrow">Buying from TECHM8</p><h2>Price, availability and returns</h2></div></div><div class="storefront-rich-content"><p>Prices are shown in Australian dollars. Online stock and pickup availability are checked again before checkout or collection.</p><p>Eligible unopened online purchases may be submitted for a change-of-mind return review within 7 days. Online-store products include six-month return-to-base warranty support, subject to the published terms.</p><p><a href="/store-policy.html">Read the shipping, returns and warranty policy</a>.</p></div></article>
      </section>
    </div></section>
  </main>
  <footer class="site-footer"><div class="container footer footer--bottom"><p>&copy; 2026 TECHM8. All rights reserved.</p><a href="/store-policy.html">Repair Terms &amp; Conditions</a></div></footer>
  <script type="module" src="/script.js"></script>
</body>
</html>
`;
}

function extractBusinessPageData(html, file) {
  const match = html.match(
    /<script>\s*(window\.BUSINESS_SERVICE_PAGE_DATA\s*=\s*\{[\s\S]*?\};)\s*<\/script>/i,
  );
  if (!match) throw new Error(`Business page data was not found in ${file}`);
  const sandbox = { window: {} };
  vm.runInNewContext(match[1], sandbox, { timeout: 1000, filename: file });
  return sandbox.window.BUSINESS_SERVICE_PAGE_DATA;
}

function renderBusinessPrerender(data) {
  const cards = (data.cards || [])
    .map(
      (card) =>
        `<article class="repair-card"><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.text)}</p></article>`,
    )
    .join("");
  const steps = (data.steps || [])
    .map(
      (step) =>
        `<article class="repair-card"><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.text)}</p></article>`,
    )
    .join("");
  const services = (data.seoServices || [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const locations = (data.locations || [])
    .map((item) => `<span>${escapeHtml(item)}</span>`)
    .join("");
  const faqs = (data.faqs || [])
    .map(
      (item) =>
        `<article class="business-faq-item"><h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p></article>`,
    )
    .join("");
  const relatedLinks = (data.relatedLinks || [])
    .map(
      (item) =>
        `<a class="business-seo-link" href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`,
    )
    .join("");

  return `<main class="inner-page business-static-prerender" data-business-prerendered>
  <section class="hero hero--service"><div class="container repair-detail-hero"><div><p class="eyebrow">${escapeHtml(data.eyebrow || "Business Services")}</p><h1>${escapeHtml(data.h1)}</h1><p class="hero__lead">${escapeHtml(data.lead)}</p><div class="hero__actions"><a class="button button--primary" href="${escapeHtml(data.primaryHref || "/book-repair.html")}">${escapeHtml(data.primaryCta || "Book a repair")}</a><a class="button button--secondary" href="${escapeHtml(data.secondaryHref || "/stores.html")}">${escapeHtml(data.secondaryCta || "Find a store")}</a></div></div></div></section>
  ${data.directAnswer ? `<section class="section"><div class="container"><div class="booking-card"><p class="eyebrow">Direct answer</p><h2>${escapeHtml(data.answerHeading || `What ${data.eyebrow || "business technology"} support is available?`)}</h2><p>${escapeHtml(data.directAnswer)}</p></div></div></section>` : ""}
  ${data.isNdisPage ? `<section class="section section--muted"><div class="container"><p><strong>Important:</strong> TECHM8 is not a direct NDIS support provider. Suitable enquiries may be shared with Proud Support Services for follow-up, with the customer’s consent.</p></div></section>` : ""}
  <section class="section"><div class="container"><div class="section-heading"><p class="eyebrow">${escapeHtml(data.cardEyebrow || "Support options")}</p><h2>${escapeHtml(data.cardHeading || "Available support")}</h2></div><div class="repair-grid">${cards}</div></div></section>
  ${data.seoLead || services ? `<section class="section section--muted"><div class="container business-seo-layout"><div class="business-seo-main"><h2>${escapeHtml(data.seoHeading || data.h1)}</h2>${data.seoLead ? `<p>${escapeHtml(data.seoLead)}</p>` : ""}${services ? `<ul class="business-seo-list">${services}</ul>` : ""}</div>${locations || relatedLinks ? `<aside class="business-seo-aside">${locations ? `<div class="business-seo-card"><h3>${escapeHtml(data.locationHeading || "Service areas")}</h3><div class="business-seo-tags">${locations}</div></div>` : ""}${relatedLinks ? `<div class="business-seo-card"><h3>${escapeHtml(data.relatedHeading || "Related services")}</h3><div class="business-seo-links">${relatedLinks}</div></div>` : ""}</aside>` : ""}</div></section>` : ""}
  <section class="section"><div class="container"><div class="section-heading"><p class="eyebrow">How it works</p><h2>${escapeHtml(data.stepHeading || "A clear support process")}</h2></div><div class="repair-grid">${steps}</div></div></section>
  ${faqs ? `<section class="section section--muted"><div class="container"><div class="section-heading"><p class="eyebrow">Questions</p><h2>${escapeHtml(data.faqHeading || "Frequently asked questions")}</h2></div><div class="business-faq-grid">${faqs}</div></div></section>` : ""}
  <section class="section"><div class="container"><div class="booking-card"><p class="eyebrow">Provider details</p><h2>Who provides this service?</h2><p>TECHM8 is the trading name of YQM PTY LTD (ABN 12 645 861 463). TECHM8 operates stores in Park Ridge, Fairfield, Toowong, North Lakes and Brassall and provides device repair, product and practical technology support. Service scope, location, timing and price are confirmed after the enquiry is reviewed.</p><p><a href="/stores.html">View TECHM8 store contact details</a>.</p></div></div></section>
</main>`.replace(/^[ \t]+$/gm, "");
}

function renderBusinessJsonLd(data, file) {
  const canonical =
    file === "business-services.html"
      ? `${SITE_URL}/business-services.html`
      : `${SITE_URL}/${file}`;
  const organizationId = `${SITE_URL}/#organization`;
  const graph = [
    {
      "@type": "Organization",
      "@id": organizationId,
      name: "TECHM8",
      legalName: "YQM PTY LTD",
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/assets/logo-techm8.png`,
      telephone: "+61452488710",
      email: "info@techm8australia.com",
      identifier: {
        "@type": "PropertyValue",
        propertyID: "ABN",
        value: "12 645 861 463",
      },
      areaServed: data.locations || ["Brisbane", "Logan", "Ipswich", "Moreton Bay"],
    },
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: data.h1,
      description: data.seoLead || data.lead,
      inLanguage: "en-AU",
      publisher: { "@id": organizationId },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${canonical}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${SITE_URL}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Business Services",
          item: `${SITE_URL}/business-services.html`,
        },
        ...(file === "business-services.html"
          ? []
          : [
              {
                "@type": "ListItem",
                position: 3,
                name: data.h1,
                item: canonical,
              },
            ]),
      ],
    },
  ];

  if (file !== "business-services.html") {
    graph.push({
      "@type": "Service",
      "@id": `${canonical}#service`,
      name: data.h1,
      serviceType: data.serviceType || data.eyebrow || data.h1,
      description: data.directAnswer || data.seoLead || data.lead,
      url: canonical,
      provider: { "@id": organizationId },
      areaServed: data.locations || ["Brisbane"],
      termsOfService: `${SITE_URL}/store-policy.html`,
    });
  }

  if (Array.isArray(data.faqs) && data.faqs.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${canonical}#faq`,
      mainEntity: data.faqs.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }

  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
}

function upsertBusinessStructuredData(html, data, file) {
  const markerPattern =
    /\s*<script type="application\/ld\+json" data-business-prerender-schema>[\s\S]*?<\/script>/i;
  const block = `\n    <script type="application/ld+json" data-business-prerender-schema>${renderBusinessJsonLd(data, file).replaceAll("<", "\\u003c")}</script>`;
  if (markerPattern.test(html)) return html.replace(markerPattern, block);
  if (/type="application\/ld\+json"/i.test(html)) return html;
  return html.replace(/\s*<\/head>/i, `${block}\n  </head>`);
}

async function prerenderBusinessPages() {
  for (const file of BUSINESS_FILES) {
    const path = join(ROOT, file);
    const html = await readFile(path, "utf8");
    const data = extractBusinessPageData(html, file);
    const content = renderBusinessPrerender(data);
    const rootPattern =
      /<div\s+data-business-service-root(?:\s[^>]*)?>[\s\S]*<\/div>\s*<\/body>/i;
    if (!rootPattern.test(html)) {
      throw new Error(`Business service root could not be found in ${file}`);
    }
    const updated = upsertBusinessStructuredData(html, data, file).replace(
      rootPattern,
      `<div data-business-service-root>\n${content}\n    </div>\n  </body>`,
    );
    await writeFile(path, updated, "utf8");
  }
}

async function loadPreviousManifest() {
  if (!existsSync(PRODUCT_MANIFEST)) return [];
  try {
    const parsed = JSON.parse(await readFile(PRODUCT_MANIFEST, "utf8"));
    return Array.isArray(parsed.slugs) ? parsed.slugs.filter(safeSlug) : [];
  } catch {
    return [];
  }
}

async function writeProducts(products) {
  const currentSlugs = products.map((product) => product.slug);
  const qualityResults = products.map((product) => ({
    product,
    quality: assessProductQuality(product),
  }));
  const indexableProducts = qualityResults
    .filter((item) => item.quality.indexable)
    .map((item) => item.product);
  const currentSet = new Set(currentSlugs);
  const previousSlugs = await loadPreviousManifest();
  const resolvedProductsDir = resolve(PRODUCTS_DIR);

  await mkdir(PRODUCTS_DIR, { recursive: true });
  for (const slug of previousSlugs) {
    if (currentSet.has(slug)) continue;
    const target = resolve(PRODUCTS_DIR, slug);
    if (dirname(target) !== resolvedProductsDir) {
      throw new Error(`Refusing to remove an unsafe generated path: ${target}`);
    }
    await rm(target, { recursive: true, force: true });
  }

  for (const product of products) {
    const folder = join(PRODUCTS_DIR, product.slug);
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, "index.html"), renderProductPage(product), "utf8");
  }

  await writeFile(
    PRODUCT_MANIFEST,
    `${JSON.stringify({ slugs: currentSlugs }, null, 2)}\n`,
    "utf8",
  );

  await writeFile(
    PRODUCT_QUALITY_REPORT,
    `${JSON.stringify(
      {
        catalog_updated_at:
          products
            .map((product) => String(product.updated_at || product.created_at || ""))
            .filter(Boolean)
            .sort()
            .at(-1) || null,
        total_products: products.length,
        indexable_products: indexableProducts.length,
        limited_products: products.length - indexableProducts.length,
        products: qualityResults.map(({ product, quality }) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          indexable: quality.indexable,
          score: quality.score,
          blockers: quality.blockers,
          warnings: quality.warnings,
        })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexableProducts
  .map((product) => {
    const modified = String(product.updated_at || product.created_at || "").slice(0, 10);
    return `  <url>\n    <loc>${SITE_URL}/products/${product.slug}/</loc>${modified ? `\n    <lastmod>${escapeHtml(modified)}</lastmod>` : ""}\n  </url>`;
  })
  .join("\n")}
</urlset>
`;
  await writeFile(PRODUCT_SITEMAP, sitemap, "utf8");
  await writeFile(PUBLIC_PRODUCT_SITEMAP, sitemap, "utf8");
}

async function main() {
  await prerenderBusinessPages();

  if (process.env.TECHM8_SKIP_PRODUCT_PRERENDER === "1") {
    console.log("Business pages prerendered; product generation was skipped.");
    return;
  }

  const products = await loadCatalog();
  if (!products.length) {
    throw new Error("Supabase returned no visible products; generated pages were left unchanged.");
  }
  await writeProducts(products);
  const limitedCount = products.filter(
    (product) => !assessProductQuality(product).indexable,
  ).length;
  console.log(
    `Prerendered ${products.length} product pages (${limitedCount} noindex pending content review) and ${BUSINESS_FILES.length} business pages.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
