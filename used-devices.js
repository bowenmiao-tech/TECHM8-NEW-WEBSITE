// Second-hand devices on the storefront.
//
// Devices are published from the POS the moment staff put one on sale, and
// taken down the moment it sells, so these pages read the live catalogue on
// every visit instead of being prerendered with the product pages. Nothing here
// needs a build step: a device appears on the next page load after publishing.
//
//   used-devices.html            the category list (?category=used-phones)
//   used-device.html?d=<slug>    one device

const CONFIG = window.TECHM8_CONFIG || {};
const SUPABASE_URL = CONFIG.supabaseUrl || "https://fwlronvmgqzkleofriis.supabase.co";
const SUPABASE_KEY = CONFIG.supabaseAnonKey ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3bHJvbnZtZ3F6a2xlb2ZyaWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5OTIwMTYsImV4cCI6MjA5MTU2ODAxNn0.f_WFZmR8MlM49yXhnBMwKyqDDpT4EOZLGgg-TPbdrNY";
const DEFAULT_CATEGORY = "used-phones";
const GOOD_BATTERY_FROM = 85;

// Where each store is, so a device can say who to call about it.
const STORES = [
  { match: /park ridge/i, name: "Park Ridge", page: "stores/park-ridge.html", phone: "0452488710" },
  { match: /fairfield/i, name: "Fairfield", page: "stores/fairfield.html", phone: "0412788818" },
  { match: /toowong/i, name: "Toowong", page: "stores/toowong.html", phone: "0485500099" },
  { match: /north lakes/i, name: "North Lakes", page: "stores/north-lakes.html", phone: "0482390009" },
  { match: /brassall/i, name: "Brassall", page: "stores/brassall.html", phone: "0403999366" },
];

const escapeHtml = (value) =>
  String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);

const money = (value) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number(value) || 0);

async function rpc(name, body) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(body || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "The used device catalogue is unavailable right now.");
  return data;
}

// Battery health is shown as a number only from 85% up. Below that it is a
// good, tested battery, and that is what the page says. The POS already sends
// it this way; this is the same rule again so a stray number never shows.
function batteryText(listing) {
  const health = Number(listing.battery_health);
  if (listing.battery_health != null && Number.isFinite(health)) {
    return health >= GOOD_BATTERY_FROM ? `${health}% battery health` : "Good battery";
  }
  const highlights = Array.isArray(listing.highlights) ? listing.highlights : [];
  return highlights.some((line) => /^good battery$/i.test(String(line))) ? "Good battery" : "";
}

function cleanHighlights(listing) {
  return (Array.isArray(listing.highlights) ? listing.highlights : [])
    .map((line) => {
      const match = /^battery health (\d+)%$/i.exec(String(line));
      return match && Number(match[1]) < GOOD_BATTERY_FROM ? "Good battery" : String(line);
    })
    // The store gets its own panel on the detail page.
    .filter((line) => !/^in stock at /i.test(line));
}

function storeFor(listing) {
  const line = (Array.isArray(listing.highlights) ? listing.highlights : [])
    .find((entry) => /^in stock at /i.test(String(entry)));
  const label = line ? String(line).replace(/^in stock at /i, "") : "";
  const known = STORES.find((store) => store.match.test(label));
  return { label, ...(known || {}) };
}

function imagesOf(listing) {
  return (Array.isArray(listing.images) ? listing.images : [])
    .filter((image) => image && /^https:\/\//.test(image.url || ""))
    .sort((a, b) => Number(a.position) - Number(b.position));
}

function detailUrl(listing) {
  return `used-device.html?d=${encodeURIComponent(listing.slug)}`;
}

// ---------------------------------------------------------------- list page

function renderCard(listing) {
  const image = imagesOf(listing)[0];
  const battery = batteryText(listing);
  const store = storeFor(listing);
  const chips = [listing.storage, listing.color, battery].filter(Boolean);
  return `
    <article class="storefront-card used-card">
      <a class="storefront-card__media-link" href="${escapeHtml(detailUrl(listing))}">
        <div class="storefront-card__media used-card__media">
          ${image
            ? `<img class="storefront-card__image used-card__image" src="${escapeHtml(image.url)}" alt="${escapeHtml(listing.title)}" loading="lazy">`
            : `<span class="storefront-card__image--placeholder">${escapeHtml(listing.brand || "Used")}</span>`}
        </div>
      </a>
      <div class="storefront-card__body">
        <div class="storefront-card__top">
          <span class="storefront-card__pill used-condition">${escapeHtml(listing.condition_grade || "Tested")}</span>
          ${store.name ? `<span class="used-card__store">${escapeHtml(store.name)}</span>` : ""}
        </div>
        <a class="storefront-card__title-link" href="${escapeHtml(detailUrl(listing))}"><h3>${escapeHtml(listing.title)}</h3></a>
        ${chips.length ? `<ul class="used-chips">${chips.map((chip) => `<li>${escapeHtml(chip)}</li>`).join("")}</ul>` : ""}
        <div class="storefront-card__price-row"><strong>${money(listing.price)}</strong></div>
        <a class="button button--primary used-card__cta" href="${escapeHtml(detailUrl(listing))}">View details</a>
      </div>
    </article>
  `;
}

async function renderListPage(root) {
  const params = new URLSearchParams(window.location.search);
  let category = params.get("category") || DEFAULT_CATEGORY;
  const tabs = root.querySelector("[data-used-tabs]");
  const grid = root.querySelector("[data-used-grid]");
  const count = root.querySelector("[data-used-count]");
  const title = root.querySelector("[data-used-title]");

  async function load() {
    grid.innerHTML = '<p class="used-empty">Loading the devices in stock...</p>';
    try {
      const data = await rpc("get_used_device_listings", {
        category_slug: category === "all" ? null : category,
        result_limit: 120,
      });
      const categories = Array.isArray(data.categories) ? data.categories : [];
      const total = categories.reduce((sum, entry) => sum + Number(entry.count || 0), 0);
      tabs.innerHTML = [{ slug: "all", name: "All devices", count: total }]
        .concat(categories)
        .map((entry) => `
          <a class="used-tab ${entry.slug === category ? "is-active" : ""}" href="?category=${encodeURIComponent(entry.slug)}"
             data-used-category="${escapeHtml(entry.slug)}" aria-current="${entry.slug === category ? "page" : "false"}">
            ${escapeHtml(entry.name)} <span>${Number(entry.count || 0)}</span>
          </a>`)
        .join("");
      const current = categories.find((entry) => entry.slug === category);
      const heading = category === "all" ? "Used phones and devices" : current ? current.name : "Used devices";
      title.textContent = heading;
      document.title = `${heading} | TECHM8`;
      const listings = Array.isArray(data.listings) ? data.listings : [];
      count.textContent = `${listings.length} ${listings.length === 1 ? "device" : "devices"} in stock`;
      grid.innerHTML = listings.map(renderCard).join("") || `
        <div class="used-empty">
          <h3>Nothing here right now</h3>
          <p>Every device is one of a kind and sells fast. Check back soon, or ask at your nearest store.</p>
          <a class="button button--secondary" href="stores.html">Find a store</a>
        </div>`;
    } catch (error) {
      grid.innerHTML = `<p class="used-empty">${escapeHtml(error.message)}</p>`;
    }
  }

  tabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-used-category]");
    if (!tab) return;
    event.preventDefault();
    category = tab.dataset.usedCategory;
    window.history.replaceState(null, "", `?category=${encodeURIComponent(category)}`);
    load();
  });

  await load();
}

// -------------------------------------------------------------- detail page

function renderGallery(listing) {
  const images = imagesOf(listing);
  if (!images.length) return '<div class="used-gallery__main used-gallery__main--empty">Photo coming soon</div>';
  return `
    <div class="used-gallery__main">
      <img src="${escapeHtml(images[0].url)}" alt="${escapeHtml(listing.title)}" data-used-main-image>
    </div>
    ${images.length > 1 ? `
      <div class="used-gallery__thumbs">
        ${images.map((image, index) => `
          <button type="button" class="used-gallery__thumb ${index === 0 ? "is-active" : ""}" data-used-thumb="${escapeHtml(image.url)}"
            aria-label="Show photo ${index + 1} of ${images.length}">
            <img src="${escapeHtml(image.url)}" alt="" loading="lazy">
          </button>`).join("")}
      </div>` : ""}
  `;
}

// The POS brand is a product line ("Apple iPhone"); the maker is its first word.
const makerOf = (listing) => String(listing.brand || "").trim().split(/\s+/)[0] || "";

function specRows(listing) {
  return [
    ["Brand", makerOf(listing)],
    ["Model", listing.model],
    ["Storage", listing.storage],
    ["Colour", listing.color],
    ["Condition", listing.condition_grade],
    ["Battery", batteryText(listing)],
  ].filter(([, value]) => value);
}

function productSchema(listing) {
  const images = imagesOf(listing);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    brand: makerOf(listing) ? { "@type": "Brand", name: makerOf(listing) } : undefined,
    image: images.map((image) => image.url),
    description: String(listing.description || "").replace(/\s+/g, " ").trim(),
    offers: {
      "@type": "Offer",
      price: Number(listing.price).toFixed(2),
      priceCurrency: "AUD",
      availability: "https://schema.org/InStoreOnly",
      itemCondition: "https://schema.org/UsedCondition",
      url: window.location.href,
    },
  };
}

async function renderDetailPage(root) {
  const slug = new URLSearchParams(window.location.search).get("d") || "";
  const shell = root.querySelector("[data-used-shell]");
  if (!slug) {
    window.location.replace("used-devices.html");
    return;
  }
  let data;
  try {
    data = await rpc("get_used_device_listing", { listing_slug: slug });
  } catch (error) {
    shell.innerHTML = `<p class="used-empty">${escapeHtml(error.message)}</p>`;
    return;
  }
  // A device that sold is the usual reason a link stops working, not a fault.
  if (!data.ok || !data.listing) {
    document.title = "No longer available | TECHM8";
    shell.innerHTML = `
      <div class="used-empty used-empty--sold">
        <h1>This device has been sold</h1>
        <p>Every second-hand device we sell is one of a kind. Have a look at what else is in stock.</p>
        <a class="button button--primary" href="used-devices.html">See devices in stock</a>
      </div>`;
    return;
  }

  const listing = data.listing;
  const store = storeFor(listing);
  const highlights = cleanHighlights(listing);
  const paragraphs = String(listing.description || "").split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);

  document.title = `${listing.title} | Used ${listing.category_name ? listing.category_name.replace(/^used\s+/i, "") : "device"} | TECHM8`;
  const description = document.querySelector('meta[name="description"]');
  if (description) {
    description.setAttribute("content",
      `${listing.title}, ${money(listing.price)}. ${listing.condition_summary || "Tested in store before sale."}`);
  }
  const breadcrumb = root.querySelector("[data-used-breadcrumb]");
  if (breadcrumb) {
    breadcrumb.innerHTML = [
      '<a href="index.html">Home</a>',
      '<a href="used-devices.html?category=all">Used phones and devices</a>',
      `<a href="used-devices.html?category=${encodeURIComponent(listing.category_slug || DEFAULT_CATEGORY)}">${escapeHtml(listing.category_name || "Used devices")}</a>`,
      `<span>${escapeHtml(listing.title)}</span>`,
    ].join("<span>/</span>");
  }

  shell.innerHTML = `
    <div class="used-detail">
      <div class="used-gallery">${renderGallery(listing)}</div>
      <div class="used-detail__info">
        <span class="storefront-card__pill used-condition">${escapeHtml(listing.condition_grade || "Tested")} condition</span>
        <h1 class="used-detail__title">${escapeHtml(listing.title)}</h1>
        <p class="used-detail__price">${money(listing.price)}</p>
        <table class="used-specs">
          <tbody>
            ${specRows(listing).map(([label, value]) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}
          </tbody>
        </table>
        <div class="used-store">
          <p class="used-store__label">${store.label ? `In stock at <strong>${escapeHtml(store.label)}</strong>` : "In stock in store"}</p>
          <p>This is a one-of-a-kind device. Call the store to hold it, or come in to see it and buy it.</p>
          <div class="used-store__actions">
            ${store.phone ? `<a class="button button--primary" href="tel:${escapeHtml(store.phone)}">Call ${escapeHtml(store.name)}</a>` : ""}
            <a class="button button--secondary" href="${escapeHtml(store.page || "stores.html")}">${store.page ? "Store details" : "Find a store"}</a>
          </div>
        </div>
      </div>
    </div>
    <div class="used-detail__more">
      ${highlights.length ? `
        <section class="used-panel">
          <h2>Checked before sale</h2>
          <ul class="used-highlights">${highlights.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
        </section>` : ""}
      ${paragraphs.length ? `
        <section class="used-panel">
          <h2>About this device</h2>
          ${paragraphs.map((part) => `<p>${escapeHtml(part)}</p>`).join("")}
        </section>` : ""}
    </div>
  `;

  const schema = document.createElement("script");
  schema.type = "application/ld+json";
  schema.textContent = JSON.stringify(productSchema(listing));
  document.head.appendChild(schema);

  shell.addEventListener("click", (event) => {
    const thumb = event.target.closest("[data-used-thumb]");
    if (!thumb) return;
    const main = shell.querySelector("[data-used-main-image]");
    if (main) main.src = thumb.dataset.usedThumb;
    shell.querySelectorAll("[data-used-thumb]").forEach((button) => button.classList.toggle("is-active", button === thumb));
  });
}

const listRoot = document.querySelector("[data-used-list]");
if (listRoot) renderListPage(listRoot);
const detailRoot = document.querySelector("[data-used-detail]");
if (detailRoot) renderDetailPage(detailRoot);
