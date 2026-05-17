window.TECHM8_CONFIG = window.TECHM8_CONFIG || {
  supabaseUrl: "https://fwlronvmgqzkleofriis.supabase.co",
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3bHJvbnZtZ3F6a2xlb2ZyaWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5OTIwMTYsImV4cCI6MjA5MTU2ODAxNn0.f_WFZmR8MlM49yXhnBMwKyqDDpT4EOZLGgg-TPbdrNY",
  bookingEndpoint:
    "https://fwlronvmgqzkleofriis.supabase.co/functions/v1/book-repair",
  orderEndpoint:
    "https://fwlronvmgqzkleofriis.supabase.co/functions/v1/submit-order",
  checkoutSessionEndpoint:
    "https://fwlronvmgqzkleofriis.supabase.co/functions/v1/create-checkout-session",
  adminEndpoint:
    "https://fwlronvmgqzkleofriis.supabase.co/functions/v1/admin-panel",
  siteUrl: "https://www.techm8australia.com/",
};

const SUPABASE_BROWSER_CDN_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
const QUILL_CDN_URL = "https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js";
const QUILL_CSS_URL = "https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css";
const XLSX_CDN_URL = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
const DEFAULT_PRODUCT_IMAGE_URL =
  "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/placeholders/image-coming-soon.png";
let adminSupabaseClientPromise = null;
let adminQuillPromise = null;
let adminXlsxPromise = null;
const DETAIL_BLOCK_MARKER = "TECHM8_DETAIL_BLOCKS:";

const ADMIN_NAV_ITEMS = [
  { href: "dashboard.html", view: "dashboard", label: "Dashboard" },
  { href: "orders.html", view: "orders", label: "Orders" },
  { href: "repairs.html", view: "repairs", label: "Repair Bookings" },
  { href: "customers.html", view: "customers", label: "Customers" },
  { href: "products.html", view: "products", label: "Products" },
  { href: "inventory.html", view: "inventory", label: "Inventory" },
];

const ADMIN_LOGIN_ALIASES = {
  bowen: "techm8contact@gmail.com",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function splitLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSpecRows(value) {
  return splitLines(value).map((line) => {
    const [label, ...rest] = line.split("|");
    return {
      label: String(label || "").trim(),
      value: String(rest.join("|") || "").trim(),
    };
  }).filter((row) => row.label && row.value);
}

function encodeDetailBlocks(blocks) {
  return `<!-- ${DETAIL_BLOCK_MARKER}${encodeURIComponent(JSON.stringify(blocks))} -->`;
}

function parseStoredDetailBlocks(detailHtml) {
  const html = String(detailHtml || "").trim();
  if (!html) return null;
  const match = html.match(/<!--\s*TECHM8_DETAIL_BLOCKS:([\s\S]*?)\s*-->/i);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function getDetailHtmlWithoutMarker(detailHtml) {
  return String(detailHtml || "")
    .replace(/<!--\s*TECHM8_DETAIL_BLOCKS:[\s\S]*?-->\s*/i, "")
    .replace(/^\s*(<section[^>]*>\s*)?<h2[^>]*>\s*(Everything about this product|Description)\s*<\/h2>\s*/i, "$1")
    .trim();
}

function buildDefaultProductDetailBlocks(row) {
  const compatibilityItems = splitLines(String(row.compatibility || "").replace(/,\s*/g, "\n"));
  const comparePrice = Number(row.compare_at_price) > Number(row.retail_price) ? formatMoney(row.compare_at_price) : "";

  return {
    overview_title: "Product overview",
    overview_text: String(row.short_description || row.description || `${row.name} is available from the TECHM8 catalog.`).trim(),
    details_title: "Key details",
    bullets: compatibilityItems.join("\n"),
    image_url: String(row.image_url || "").trim(),
    image_alt: String(row.name || "").trim(),
    specs: [
      row.retail_price ? `Current selling price|${formatMoney(row.retail_price)}` : "",
      comparePrice ? `Original / compare price|${comparePrice}` : "",
      row.brand ? `Brand|${row.brand}` : "",
      row.model ? `Model|${row.model}` : "",
    ].filter(Boolean).join("\n"),
    extra_html: "",
  };
}

function buildDetailBlocksState(row) {
  const parsed = parseStoredDetailBlocks(row.detail_html);
  if (parsed) return parsed;
  const fallback = buildDefaultProductDetailBlocks(row);
  const rawHtml = getDetailHtmlWithoutMarker(row.detail_html);
  if (rawHtml) {
    fallback.extra_html = rawHtml;
  }
  return fallback;
}

function renderDetailBlocksPreview(blocks) {
  const bullets = splitLines(blocks.bullets);
  const specRows = normalizeSpecRows(blocks.specs);
  const extraHtml = String(blocks.extra_html || "").trim();

  return `
    <section>
      <h2>${escapeHtml(blocks.overview_title || "Product overview")}</h2>
      <p>${escapeHtml(blocks.overview_text || "")}</p>
    </section>
    <section>
      <h2>${escapeHtml(blocks.details_title || "Key details")}</h2>
      ${blocks.image_url ? `
        <figure>
          <img src="${escapeHtml(blocks.image_url)}" alt="${escapeHtml(blocks.image_alt || "")}">
        </figure>
      ` : ""}
      ${bullets.length ? `<ul>${bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      ${specRows.length ? `
        <table>
          <tbody>
            ${specRows.map((row) => `
              <tr>
                <th>${escapeHtml(row.label)}</th>
                <td>${escapeHtml(row.value)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : ""}
    </section>
    ${extraHtml}
  `.trim();
}

function buildDetailHtmlFromBlocks(blocks) {
  const normalizedBlocks = {
    overview_title: String(blocks.overview_title || "").trim(),
    overview_text: String(blocks.overview_text || "").trim(),
    details_title: String(blocks.details_title || "").trim(),
    bullets: String(blocks.bullets || "").trim(),
    image_url: String(blocks.image_url || "").trim(),
    image_alt: String(blocks.image_alt || "").trim(),
    specs: String(blocks.specs || "").trim(),
    extra_html: String(blocks.extra_html || "").trim(),
  };

  return `${encodeDetailBlocks(normalizedBlocks)}
${renderDetailBlocksPreview(normalizedBlocks)}`.trim();
}

function buildDefaultProductDescriptionHtml(row) {
  const description = String(row.description || row.short_description || `${row.name || "This product"} is available from the TECHM8 catalog.`).trim();
  return `
    <section>
      <p>${escapeHtml(description)}</p>
    </section>
  `.trim();
}

function getEditableProductDescriptionHtml(row) {
  return getDetailHtmlWithoutMarker(row.detail_html) || buildDefaultProductDescriptionHtml(row);
}

function insertTextAtCursor(textarea, text) {
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  textarea.value = `${textarea.value.slice(0, start)}${text}${textarea.value.slice(end)}`;
  const nextPosition = start + text.length;
  textarea.focus();
  textarea.setSelectionRange(nextPosition, nextPosition);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function wrapTextareaSelection(textarea, before, after, placeholder = "Text") {
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const selectedText = textarea.value.slice(start, end) || placeholder;
  const nextText = `${before}${selectedText}${after}`;
  textarea.value = `${textarea.value.slice(0, start)}${nextText}${textarea.value.slice(end)}`;
  textarea.focus();
  textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function formatMoney(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Brisbane",
  }).format(date);
}

function formatCurrencyNumber(value) {
  return Number(Number(value || 0).toFixed(2));
}

function formatAddress(parts = []) {
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

function slugifyAdminProductValue(value, fallback = "product") {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return text || fallback;
}

function parseImportNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value)
    .replace(/[^\d.-]/g, "")
    .trim();
  if (!normalized) return null;
  const numberValue = Number(normalized);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function extractImportModelToken(value) {
  const text = String(value || "");
  const match = text.match(/\b((?:RPP|FCP|WP|WDC)(?:-[A-Z0-9]+)+)\b/i);
  return match ? match[1].toUpperCase() : "";
}

function inferImportBrand(name, manufacturer) {
  const explicit = String(manufacturer || "").trim();
  if (explicit) return explicit.toUpperCase();
  const text = String(name || "").toUpperCase();
  if (/(^|\W)REMAX(\W|$)|RPP-|FCP-/.test(text)) return "REMAX";
  if (/(^|\W)WEKOME(\W|$)|WP-|WDC-/.test(text)) return "WEKOME";
  return "UNASSIGNED";
}

const IMPORT_TEMPLATE_TEXT_PATTERNS = [
  /this is the name of your product/i,
  /your product name can include letters/i,
  /the description of your product/i,
  /specify the manufacturer or brand/i,
  /enter the color for this specific/i,
  /stock-keeping unit \(sku\)/i,
  /scannable barcode/i,
  /automatically track the movement of inventory/i,
];

function normalizeImportHeaderName(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildImportRowLookup(row) {
  const lookup = new Map();
  Object.entries(row || {}).forEach(([key, value]) => {
    lookup.set(normalizeImportHeaderName(key), value);
  });
  return lookup;
}

function getImportField(lookup, aliases) {
  for (const alias of aliases) {
    const key = normalizeImportHeaderName(alias);
    if (!lookup.has(key)) continue;
    const value = lookup.get(key);
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }
  return "";
}

function importRowHasTemplateCopy(row) {
  const text = Object.values(row || {})
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return IMPORT_TEMPLATE_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

function appendImportValue(target, key, value) {
  if (value === null || value === undefined || value === "") return;
  target[key] = value;
}

function appendImportNumber(target, key, value) {
  if (value === null || value === undefined) return;
  target[key] = value;
}

function parseImportBoolean(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return null;
  if (["true", "yes", "y", "1", "visible", "published"].includes(text)) return true;
  if (["false", "no", "n", "0", "hidden", "draft"].includes(text)) return false;
  return null;
}

function appendImportBoolean(target, key, value) {
  const parsed = parseImportBoolean(value);
  if (parsed === null) return;
  target[key] = parsed;
}

function renderAdminImportSummary(summary) {
  return `
    <div class="admin-import-summary">
      <strong>${escapeHtml(summary.title || "Import complete")}</strong>
      <p>${escapeHtml(summary.message || "")}</p>
    </div>
  `;
}

function getStoreMapUrl(store) {
  if (!store) return "#";
  const address = formatAddress([
    store.address_line_1,
    store.address_line_2,
    store.suburb,
    store.state,
    store.postcode,
  ]);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || store.name || "")}`;
}

function getStorePageUrl(storeSlug) {
  const slug = String(storeSlug || "").trim();
  if (!slug) return "#";
  return new URL(`../stores/${slug}.html`, window.location.href).toString();
}

function getSiteBaseUrl() {
  const configured = String(window.TECHM8_CONFIG?.siteUrl || "").trim();
  return configured ? configured.replace(/\/+$/, "") : window.location.origin;
}

function resolveAdminLoginEmail(account) {
  const normalizedAccount = String(account || "").trim().toLowerCase();
  if (!normalizedAccount) return "";
  if (normalizedAccount.includes("@")) return normalizedAccount;
  return ADMIN_LOGIN_ALIASES[normalizedAccount] || "";
}

function ensureAdminModalRoot() {
  let modalRoot = document.querySelector("[data-admin-modal-root]");
  if (modalRoot instanceof HTMLElement) return modalRoot;

  modalRoot = document.createElement("div");
  modalRoot.className = "admin-modal-root";
  modalRoot.setAttribute("data-admin-modal-root", "true");
  modalRoot.hidden = true;
  document.body.appendChild(modalRoot);
  return modalRoot;
}

function closeAdminModal() {
  const modalRoot = document.querySelector("[data-admin-modal-root]");
  if (!(modalRoot instanceof HTMLElement)) return;
  modalRoot.hidden = true;
  modalRoot.innerHTML = "";
  document.body.classList.remove("admin-modal-open");
}

function openAdminModal({ title, subtitle = "", content = "" }) {
  const modalRoot = ensureAdminModalRoot();
  modalRoot.hidden = false;
  modalRoot.innerHTML = `
    <div class="admin-modal-backdrop" data-admin-modal-close></div>
    <div class="admin-modal">
      <header class="admin-modal__header">
        <div>
          <h2>${escapeHtml(title)}</h2>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        </div>
        <button class="admin-modal__close" type="button" data-admin-modal-close aria-label="Close">×</button>
      </header>
      <div class="admin-modal__body">${content}</div>
    </div>
  `;
  document.body.classList.add("admin-modal-open");

  modalRoot.querySelectorAll("[data-admin-modal-close]").forEach((element) => {
    element.addEventListener("click", () => closeAdminModal());
  });

  return modalRoot;
}

function printOrderDocument(order, stores) {
  const store = (stores || []).find((item) => item.slug === order.store_slug) || null;
  const addressText = order.fulfillment_method === "shipping"
    ? formatAddress([
        order.recipient_name || `${order.customer_name || ""}`.trim(),
        order.company_name,
        order.address_line_1,
        order.address_line_2,
        order.suburb,
        order.state,
        order.postcode,
        order.country_code || "AU",
      ])
    : formatAddress([
        store?.name,
        store?.address_line_1,
        store?.address_line_2,
        store?.suburb,
        store?.state,
        store?.postcode,
      ]);

  const itemRows = (order.items || []).map((item) => `
    <tr>
      <td>${escapeHtml(item.product_name || "Item")}</td>
      <td>${escapeHtml(item.quantity || 0)}</td>
      <td>${formatMoney(item.line_total || 0)}</td>
    </tr>
  `).join("");

  const html = `
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(order.order_code)} - TECHM8 Print</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
        h1 { margin: 0 0 8px; font-size: 28px; }
        .meta, .block { margin-bottom: 18px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .block { border: 1px solid #ccc; border-radius: 10px; padding: 14px; }
        .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #555; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #ddd; }
        th { font-size: 12px; text-transform: uppercase; color: #555; }
        .address { white-space: pre-line; font-size: 18px; line-height: 1.45; }
      </style>
    </head>
    <body>
      <h1>TECHM8 Order Slip</h1>
      <div class="meta">
        <strong>${escapeHtml(order.order_code)}</strong><br>
        ${escapeHtml(order.fulfillment_method === "shipping" ? "Warehouse dispatch" : `Store pickup - ${store?.name || order.store_slug}`)}<br>
        ${escapeHtml(formatDateTime(order.created_at))}
      </div>
      <div class="grid">
        <div class="block">
          <div class="eyebrow">Customer</div>
          <div>${escapeHtml(order.customer_name || "")}</div>
          <div>${escapeHtml(order.phone || "")}</div>
          <div>${escapeHtml(order.email || "")}</div>
        </div>
        <div class="block">
          <div class="eyebrow">${escapeHtml(order.fulfillment_method === "shipping" ? "Ship to" : "Pickup point")}</div>
          <div class="address">${escapeHtml(addressText).replaceAll(", ", "\n")}</div>
        </div>
      </div>
      <div class="block">
        <div class="eyebrow">Items</div>
        <table>
          <thead><tr><th>Product</th><th>Qty</th><th>Total</th></tr></thead>
          <tbody>${itemRows || '<tr><td colspan="3">No items found</td></tr>'}</tbody>
        </table>
      </div>
      <div class="block">
        <div class="eyebrow">Totals</div>
        <div>Subtotal: ${formatMoney(order.subtotal_amount || 0)}</div>
        <div>Payment fee: ${formatMoney(order.payment_fee_amount || 0)}</div>
        <div>Shipping fee: ${formatMoney(order.shipping_fee_amount || 0)}</div>
        <div><strong>Total: ${formatMoney(order.total_amount || 0)}</strong></div>
      </div>
      <script>window.onload = () => { window.print(); };</script>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=980,height=840");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function setAlert(target, message = "", tone = "error") {
  if (!(target instanceof HTMLElement)) return;
  if (!message) {
    target.hidden = true;
    target.textContent = "";
    target.classList.remove("is-error", "is-success", "is-info");
    return;
  }

  target.hidden = false;
  target.textContent = message;
  target.classList.toggle("is-error", tone === "error");
  target.classList.toggle("is-success", tone === "success");
  target.classList.toggle("is-info", tone === "info");
}

function setInlineStatus(target, message = "", tone = "info") {
  if (!(target instanceof HTMLElement)) return;
  target.hidden = !message;
  target.textContent = message;
  target.classList.toggle("is-error", tone === "error");
  target.classList.toggle("is-success", tone === "success");
  target.classList.toggle("is-info", tone === "info");
}

function getAdminEndpoint() {
  const configured = String(window.TECHM8_CONFIG?.adminEndpoint || "").trim();
  if (configured) return configured;
  const supabaseUrl = String(window.TECHM8_CONFIG?.supabaseUrl || "").trim();
  if (!supabaseUrl) return "";
  return `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/admin-panel`;
}

function getAdminLoginUrl() {
  return new URL("login.html", window.location.href).toString();
}

function getAdminPageUrl(page) {
  return new URL(page, window.location.href).toString();
}

async function ensureSupabaseBrowserLibrary() {
  if (window.supabase?.createClient) return window.supabase;

  const existingScript = document.querySelector("script[data-supabase-browser]");
  if (existingScript) {
    await new Promise((resolve, reject) => {
      if (window.supabase?.createClient) {
        resolve();
        return;
      }
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
    });
    return window.supabase;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SUPABASE_BROWSER_CDN_URL;
    script.defer = true;
    script.setAttribute("data-supabase-browser", "true");
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.appendChild(script);
  });

  return window.supabase;
}

async function ensureQuillLibrary() {
  if (window.Quill) return window.Quill;
  if (adminQuillPromise) return adminQuillPromise;

  adminQuillPromise = new Promise((resolve, reject) => {
    if (!document.querySelector("link[data-quill-css]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = QUILL_CSS_URL;
      link.setAttribute("data-quill-css", "true");
      document.head.appendChild(link);
    }

    const existingScript = document.querySelector("script[data-quill-js]");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.Quill), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = QUILL_CDN_URL;
    script.defer = true;
    script.setAttribute("data-quill-js", "true");
    script.addEventListener("load", () => resolve(window.Quill), { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.appendChild(script);
  });

  return adminQuillPromise;
}

async function ensureXlsxLibrary() {
  if (window.XLSX?.read) return window.XLSX;
  if (adminXlsxPromise) return adminXlsxPromise;

  adminXlsxPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector("script[data-xlsx-js]");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.XLSX), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = XLSX_CDN_URL;
    script.defer = true;
    script.setAttribute("data-xlsx-js", "true");
    script.addEventListener("load", () => resolve(window.XLSX), { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.appendChild(script);
  });

  return adminXlsxPromise;
}

async function getSupabaseBrowserClient() {
  if (adminSupabaseClientPromise) return adminSupabaseClientPromise;

  adminSupabaseClientPromise = (async () => {
    const supabaseLib = await ensureSupabaseBrowserLibrary();
    const { supabaseUrl, supabaseAnonKey } = window.TECHM8_CONFIG || {};
    if (!supabaseUrl || !supabaseAnonKey || !supabaseLib?.createClient) {
      throw new Error("Supabase is not configured for the admin panel.");
    }
    return supabaseLib.createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  })();

  return adminSupabaseClientPromise;
}

async function getCurrentSessionState() {
  const supabase = await getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return { supabase, session, user: session?.user || null };
}

async function callAdminApi(action, payload = {}, session) {
  const endpoint = getAdminEndpoint();
  const anonKey = String(window.TECHM8_CONFIG?.supabaseAnonKey || "").trim();
  if (!endpoint || !anonKey) {
    throw new Error("Admin API is not configured.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${session?.access_token || anonKey}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  let result = {};
  try {
    result = await response.json();
  } catch (_error) {
    result = {};
  }

  if (!response.ok || result?.ok === false) {
    throw new Error(result?.error || "Admin request failed.");
  }

  return result;
}

function normalizeQuillHtml(value) {
  const html = String(value || "").trim();
  if (!html || html === "<p><br></p>") return "";
  return html;
}

function getFileExtension(file) {
  const type = String(file?.type || "").toLowerCase();
  if (type.includes("webp")) return "webp";
  if (type.includes("png")) return "png";
  if (type.includes("gif")) return "gif";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  const match = String(file?.name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "jpg";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",").pop() : result);
    });
    reader.addEventListener("error", () => reject(new Error("Image could not be read.")));
    reader.readAsDataURL(file);
  });
}

function replaceFileExtension(fileName, nextExtension) {
  const safeExtension = String(nextExtension || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (!safeExtension) return fileName || "image";
  const baseName = String(fileName || "image").replace(/\.[a-z0-9]+$/i, "");
  return `${baseName}.${safeExtension}`;
}

async function convertImageFileToWebp(file, options = {}) {
  if (!(file instanceof File)) return file;
  if (!file.type.startsWith("image/")) return file;

  const normalizedType = String(file.type || "").toLowerCase();
  if (
    normalizedType === "image/webp" ||
    normalizedType === "image/gif" ||
    normalizedType === "image/svg+xml"
  ) {
    return file;
  }

  const maxDimension = Number(options.maxDimension) > 0 ? Number(options.maxDimension) : 2200;
  const quality = Number(options.quality) > 0 ? Number(options.quality) : 0.86;
  const objectUrl = URL.createObjectURL(file);

  try {
    let sourceWidth = 0;
    let sourceHeight = 0;
    let drawSource = null;

    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      sourceWidth = bitmap.width;
      sourceHeight = bitmap.height;
      drawSource = bitmap;
    } else {
      drawSource = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Image preview could not be prepared."));
        image.src = objectUrl;
      });
      sourceWidth = drawSource.naturalWidth || drawSource.width || 0;
      sourceHeight = drawSource.naturalHeight || drawSource.height || 0;
    }

    if (!sourceWidth || !sourceHeight || !drawSource) {
      throw new Error("Image dimensions could not be read.");
    }

    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      throw new Error("Image canvas is not available in this browser.");
    }

    context.drawImage(drawSource, 0, 0, targetWidth, targetHeight);

    const webpBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }
          reject(new Error("Image could not be converted to WebP."));
        },
        "image/webp",
        quality,
      );
    });

    if (typeof drawSource.close === "function") {
      drawSource.close();
    }

    return new File([webpBlob], replaceFileExtension(file.name, "webp"), {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function uploadProductDetailImage(file, row, session) {
  if (!(file instanceof File)) throw new Error("Please choose an image file.");
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be uploaded.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Image is too large. Please use a file under 8MB.");

  const uploadFile = await convertImageFileToWebp(file);
  if (uploadFile.size > 8 * 1024 * 1024) {
    throw new Error("Image is still too large after conversion. Please resize it and try again.");
  }
  const dataBase64 = await fileToBase64(uploadFile);
  const result = await callAdminApi("product_detail_image_upload", {
    product_id: row.id,
    product_slug: row.slug,
    file_name: uploadFile.name,
    content_type: uploadFile.type || "image/webp",
    extension: getFileExtension(uploadFile),
    data_base64: dataBase64,
  }, session);

  if (!result.public_url) {
    throw new Error("Image uploaded but no public URL was returned.");
  }

  return result.public_url;
}

async function readWorkbookRowsFromFile(file) {
  if (!(file instanceof File)) {
    throw new Error("Please choose an Excel file first.");
  }
  const XLSX = await ensureXlsxLibrary();
  if (!XLSX?.read) {
    throw new Error("Excel import library could not be loaded.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames?.[0];
  if (!firstSheetName) {
    throw new Error("The workbook does not contain any sheets.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });
  return Array.isArray(rows) ? rows : [];
}

function normalizeImportWorkbookRows(rows, fallbackCategoryId = "") {
  return rows
    .map((row) => {
      const raw = row && typeof row === "object" ? row : {};
      if (importRowHasTemplateCopy(raw)) return null;

      const lookup = buildImportRowLookup(raw);
      const name = getImportField(lookup, [
        "Item Name",
        "Name",
        "Product Name",
        "Title",
      ]);
      if (!name) return null;

      const normalizedName = normalizeImportHeaderName(name);
      if (["item name", "name", "product name", "title"].includes(normalizedName)) return null;

      const manufacturer = getImportField(lookup, [
        "Manufacturer",
        "Brand",
        "Vendor",
      ]);
      const brand = inferImportBrand(name, manufacturer);
      const sku = getImportField(lookup, ["SKU", "Variant SKU"]);
      const upc = getImportField(lookup, ["UPC", "Barcode", "Variant Barcode"]);
      const description = getImportField(lookup, [
        "Description",
        "Short Description",
        "Body (HTML)",
        "Body HTML",
      ]);
      const model =
        extractImportModelToken(getImportField(lookup, ["Model"])) ||
        extractImportModelToken(name) ||
        getImportField(lookup, ["Color", "Option1 Value", "Option 1 Value"]);
      const stockQuantity = parseImportNumber(getImportField(lookup, [
        "On Hand Qty",
        "Stock Quantity",
        "Quantity",
        "Inventory",
        "Variant Inventory Qty",
      ]));
      const costPrice = parseImportNumber(getImportField(lookup, [
        "Cost Price",
        "Cost per item",
        "Variant Cost",
      ]));
      const retailPrice = parseImportNumber(getImportField(lookup, [
        "Retail Price",
        "Price",
        "Variant Price",
      ]));
      const onlinePrice = parseImportNumber(getImportField(lookup, ["Online Price"]));
      const promotionalPrice = parseImportNumber(getImportField(lookup, [
        "Promotional Price",
        "Sale Price",
      ]));

      let effectiveRetailPrice = retailPrice;
      let compareAtPrice = null;
      if (promotionalPrice !== null && promotionalPrice > 0 && (!effectiveRetailPrice || promotionalPrice < effectiveRetailPrice)) {
        compareAtPrice = effectiveRetailPrice || null;
        effectiveRetailPrice = promotionalPrice;
      } else if (onlinePrice !== null && onlinePrice > 0 && (!effectiveRetailPrice || onlinePrice < effectiveRetailPrice)) {
        compareAtPrice = effectiveRetailPrice || null;
        effectiveRetailPrice = onlinePrice;
      }

      const slugBase = slugifyAdminProductValue(name, "product");
      const generatedSku = sku || `TM8-${(extractImportModelToken(name) || slugBase).toUpperCase()}`;
      const normalized = {
        name,
        brand,
        sku: generatedSku,
        slug: slugBase,
      };

      appendImportValue(normalized, "model", model);
      appendImportValue(normalized, "upc", upc);
      appendImportValue(normalized, "short_description", description);
      appendImportValue(normalized, "description", description);
      appendImportNumber(normalized, "cost_price", costPrice);
      appendImportNumber(normalized, "retail_price", effectiveRetailPrice);
      appendImportNumber(normalized, "compare_at_price", compareAtPrice);
      appendImportNumber(normalized, "stock_quantity", stockQuantity);
      appendImportValue(normalized, "condition_label", getImportField(lookup, ["Condition"]));
      appendImportValue(normalized, "category_id", fallbackCategoryId);
      appendImportValue(normalized, "shelf_location", getImportField(lookup, [
        "Physical Location",
        "Shelf Location",
        "Location",
      ]));
      appendImportValue(normalized, "image_url", getImportField(lookup, [
        "Image URL",
        "Image Src",
        "Image",
      ]));
      appendImportValue(normalized, "supplier_product_url", getImportField(lookup, [
        "Supplier Product URL",
        "Product URL",
      ]));
      appendImportBoolean(normalized, "is_visible", getImportField(lookup, [
        "Visible",
        "Published",
        "Status",
      ]));
      appendImportBoolean(normalized, "is_featured", getImportField(lookup, [
        "Featured",
        "Is Featured",
      ]));
      return normalized;
    })
    .filter(Boolean);
}

function openCreateProductModal({ bootstrap, session, alertTarget, onCreated }) {
  const modalRoot = openAdminModal({
    title: "Create product",
    subtitle: "Add a new product shell directly from the admin panel.",
    content: `
      <form class="admin-modal-form" data-admin-create-product-form>
        <div class="admin-editor__grid">
          <label><span>Name</span><input type="text" name="name" required></label>
          <label><span>Brand</span><input type="text" name="brand"></label>
          <label><span>Model</span><input type="text" name="model"></label>
          <label><span>SKU</span><input type="text" name="sku" placeholder="Optional"></label>
          <label><span>Category</span>
            <select name="category_id">
              <option value="">Unassigned</option>
              ${(bootstrap.categories || []).map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join("")}
            </select>
          </label>
          <label><span>Retail price</span><input type="number" step="0.01" name="retail_price" value="0"></label>
          <label><span>Cost price</span><input type="number" step="0.01" name="cost_price" value="0"></label>
          <label><span>Total stock</span><input type="number" step="1" name="stock_quantity" value="0"></label>
          <label class="admin-editor__wide"><span>Short description</span><textarea name="short_description"></textarea></label>
        </div>
        <div class="admin-button-row">
          <button class="button button--primary" type="submit">Create product</button>
        </div>
      </form>
    `,
  });

  const form = modalRoot.querySelector("[data-admin-create-product-form]");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      const result = await callAdminApi("product_create", {
        product: {
          name: formData.get("name"),
          brand: formData.get("brand"),
          model: formData.get("model"),
          sku: formData.get("sku"),
          category_id: formData.get("category_id"),
          retail_price: formData.get("retail_price"),
          cost_price: formData.get("cost_price"),
          stock_quantity: formData.get("stock_quantity"),
          short_description: formData.get("short_description"),
        },
      }, session);
      closeAdminModal();
      setAlert(alertTarget, "Product created.", "success");
      onCreated?.(result.row);
    } catch (error) {
      setAlert(alertTarget, error instanceof Error ? error.message : "Product could not be created.", "error");
    }
  });
}

function openImportProductsModal({ bootstrap, session, alertTarget, onImported }) {
  const modalRoot = openAdminModal({
    title: "Import products from Excel",
    subtitle: "Upload the same workbook format you already use. The sheet will be parsed and written directly into Supabase.",
    content: `
      <form class="admin-modal-form" data-admin-import-products-form>
        <div class="admin-editor__grid">
          <label><span>Default category</span>
            <select name="category_id">
              <option value="">Keep unassigned</option>
              ${(bootstrap.categories || []).map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join("")}
            </select>
          </label>
          <label class="admin-editor__wide"><span>Excel file</span><input type="file" name="workbook" accept=".xlsx,.xls,.csv" required></label>
        </div>
        <p class="admin-note">Expected headers: Item Name, Manufacturer, SKU, UPC, Description, Physical Location, On Hand Qty, Cost Price, Retail Price, Online Price, Promotional Price, Condition.</p>
        <div data-admin-import-feedback></div>
        <div class="admin-button-row">
          <button class="button button--primary" type="submit">Import products</button>
        </div>
      </form>
    `,
  });

  const form = modalRoot.querySelector("[data-admin-import-products-form]");
  const feedback = modalRoot.querySelector("[data-admin-import-feedback]");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("workbook");
    const categoryId = String(formData.get("category_id") || "").trim();
    try {
      const workbookRows = await readWorkbookRowsFromFile(file);
      const normalizedRows = normalizeImportWorkbookRows(workbookRows, categoryId);
      if (!normalizedRows.length) {
        throw new Error("No valid product rows were found in the workbook.");
      }
      if (feedback instanceof HTMLElement) {
        feedback.innerHTML = renderAdminImportSummary({
          title: "Workbook parsed",
          message: `${normalizedRows.length} product row(s) ready to import.`,
        });
      }
      const result = await callAdminApi("products_import_excel_rows", {
        category_id: categoryId || null,
        rows: normalizedRows,
      }, session);
      closeAdminModal();
      setAlert(
        alertTarget,
        `Import complete. Created ${result.created_count || 0}, updated ${result.updated_count || 0}.`,
        "success",
      );
      onImported?.(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workbook import failed.";
      if (feedback instanceof HTMLElement) {
        feedback.innerHTML = renderAdminImportSummary({
          title: "Import failed",
          message,
        });
      }
      setAlert(alertTarget, message, "error");
    }
  });
}

function openCreateCategoryModal({ bootstrap, session, alertTarget, initialName = "", onCreated }) {
  const modalRoot = openAdminModal({
    title: "Add category",
    subtitle: "Create a category once, then reuse it across products and Excel imports.",
    content: `
      <form class="admin-modal-form" data-admin-category-form>
        <label><span>Category name</span><input type="text" name="name" value="${escapeHtml(initialName)}" placeholder="Power Banks" required></label>
        <p class="admin-note">The category URL slug is generated automatically from the name.</p>
        <div class="admin-button-row">
          <button class="button button--primary" type="submit">Create category</button>
        </div>
      </form>
    `,
  });

  const form = modalRoot.querySelector("[data-admin-category-form]");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      const result = await callAdminApi("category_create", {
        name: formData.get("name"),
      }, session);
      if (Array.isArray(result.categories)) {
        bootstrap.categories = [...result.categories];
      }
      closeAdminModal();
      setAlert(alertTarget, "Category created.", "success");
      onCreated?.(result.category, result.categories || bootstrap.categories || []);
    } catch (error) {
      setAlert(alertTarget, error instanceof Error ? error.message : "Category could not be created.", "error");
    }
  });
}

function openEditCategoryModal({ bootstrap, session, alertTarget, category, onUpdated, onDeleted }) {
  if (!category?.id) {
    setAlert(alertTarget, "Select a category to edit first.", "error");
    return;
  }

  const modalRoot = openAdminModal({
    title: "Edit category",
    subtitle: "Update the category name used by storefront category pages.",
    content: `
      <form class="admin-modal-form" data-admin-category-edit-form>
        <label><span>Category name</span><input type="text" name="name" value="${escapeHtml(category.name || "")}" placeholder="Power Banks" required></label>
        <p class="admin-note">The category URL slug is generated automatically from the name.</p>
        <div class="admin-button-row">
          <button class="button button--primary" type="submit">Save category</button>
          <button class="button button--danger" type="button" data-admin-category-delete>Delete category</button>
        </div>
      </form>
    `,
  });

  const form = modalRoot.querySelector("[data-admin-category-edit-form]");
  const deleteButton = modalRoot.querySelector("[data-admin-category-delete]");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      const result = await callAdminApi("category_update", {
        id: category.id,
        name: formData.get("name"),
      }, session);
      if (Array.isArray(result.categories)) {
        bootstrap.categories = [...result.categories];
      }
      closeAdminModal();
      setAlert(alertTarget, "Category updated.", "success");
      onUpdated?.(result.category, result.categories || bootstrap.categories || []);
    } catch (error) {
      setAlert(alertTarget, error instanceof Error ? error.message : "Category could not be updated.", "error");
    }
  });

  deleteButton?.addEventListener("click", async () => {
    const confirmed = window.confirm(`Delete ${category.name || "this category"}? Products in this category will be kept without a category.`);
    if (!confirmed) return;
    try {
      const result = await callAdminApi("category_delete", { id: category.id }, session);
      if (Array.isArray(result.categories)) {
        bootstrap.categories = [...result.categories];
      }
      closeAdminModal();
      setAlert(alertTarget, "Category deleted.", "success");
      onDeleted?.(category, result.categories || bootstrap.categories || []);
    } catch (error) {
      setAlert(alertTarget, error instanceof Error ? error.message : "Category could not be deleted.", "error");
    }
  });
}

async function setupProductDescriptionQuill({ editorElement, hiddenInput, row, session, canEdit, alertTarget }) {
  if (!(editorElement instanceof HTMLElement) || !(hiddenInput instanceof HTMLInputElement)) return null;
  const Quill = await ensureQuillLibrary();
  if (!Quill) throw new Error("Quill editor could not be loaded.");

  const toolbarOptions = [
    [{ header: [2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "image"],
    ["clean"],
  ];

  const quill = new Quill(editorElement, {
    theme: "snow",
    readOnly: !canEdit,
    modules: {
      toolbar: canEdit ? toolbarOptions : false,
    },
    placeholder: "Add product description, supplier notes, images or specification details...",
  });

  const initialHtml = normalizeQuillHtml(hiddenInput.value);
  if (initialHtml) {
    quill.clipboard.dangerouslyPasteHTML(initialHtml);
  }

  const syncHiddenInput = () => {
    hiddenInput.value = normalizeQuillHtml(quill.root.innerHTML);
  };

  quill.on("text-change", syncHiddenInput);
  syncHiddenInput();

  if (canEdit) {
    const toolbar = quill.getModule("toolbar");
    toolbar?.addHandler("image", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          setAlert(alertTarget, "Uploading description image...", "info");
          const imageUrl = await uploadProductDetailImage(file, row, session);
          const range = quill.getSelection(true);
          const insertAt = typeof range?.index === "number" ? range.index : quill.getLength();
          quill.insertEmbed(insertAt, "image", imageUrl, "user");
          quill.setSelection(insertAt + 1, 0);
          syncHiddenInput();
          setAlert(alertTarget, "Description image uploaded.", "success");
        } catch (error) {
          setAlert(alertTarget, error instanceof Error ? error.message : "Description image could not be uploaded.", "error");
        }
      }, { once: true });
      input.click();
    });
  }

  return {
    quill,
    getHtml: () => {
      syncHiddenInput();
      return hiddenInput.value;
    },
  };
}

function roleLabel(role) {
  switch (role) {
    case "super_admin":
      return "Super admin";
    case "store_manager":
      return "Store manager";
    case "staff":
      return "Staff";
    default:
      return role || "Admin";
  }
}

function statusTone(value) {
  const text = String(value || "").toLowerCase();
  if (["paid", "completed", "ready_for_pickup", "active", "confirmed"].includes(text)) return "success";
  if (["submitted", "new", "pending", "packed", "queued", "contacted", "in_progress"].includes(text)) return "warning";
  if (["cancelled", "failed", "refunded", "hidden", "inactive"].includes(text)) return "danger";
  return "neutral";
}

function renderBadge(value) {
  const safe = escapeHtml(value || "—");
  return `<span class="admin-badge admin-badge--${statusTone(value)}">${safe}</span>`;
}

function renderPagination(meta) {
  const total = Number(meta.total || 0);
  const pageSize = Number(meta.page_size || 20);
  const page = Number(meta.page || 1);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return `
    <div class="admin-pagination">
      <span>Page ${page} of ${totalPages} · ${total} records</span>
      <div class="admin-button-row">
        <button class="button button--ghost" type="button" data-page-prev ${page <= 1 ? "disabled" : ""}>Previous</button>
        <button class="button button--ghost" type="button" data-page-next ${page >= totalPages ? "disabled" : ""}>Next</button>
      </div>
    </div>
  `;
}

function renderAppShell(root, view, title, bootstrap) {
  root.innerHTML = `
    <aside class="admin-sidebar">
      <a class="admin-sidebar__brand" href="../index.html" aria-label="TECHM8 home">
        <img src="../assets/logo-techm8.png" alt="TECHM8 logo">
      </a>
      <div class="admin-sidebar__section">
        <p class="admin-sidebar__label">Back office</p>
        ${ADMIN_NAV_ITEMS.map((item) => {
          return `<a class="admin-sidebar__link ${item.view === view ? "is-active" : ""}" href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`;
        }).join("")}
      </div>
      <div class="admin-sidebar__profile">
        <strong>${escapeHtml(bootstrap.admin.display_name || bootstrap.admin.email || "TECHM8 Admin")}</strong>
        <span>${escapeHtml(roleLabel(bootstrap.admin.role))}${bootstrap.admin.store_slug ? ` · ${escapeHtml(bootstrap.admin.store_slug)}` : ""}</span>
      </div>
      <div class="admin-sidebar__section">
        <p class="admin-sidebar__label">Session</p>
        <button class="admin-sidebar__logout" type="button" data-admin-logout>Sign out</button>
      </div>
    </aside>
    <section class="admin-main">
      <header class="admin-topbar">
        <div>
          <p class="eyebrow">TECHM8 Admin</p>
          <h1>${escapeHtml(title)}</h1>
        </div>
        <div class="admin-topbar__identity">
          <strong>${escapeHtml(bootstrap.admin.email || "Admin account")}</strong>
          <span>${escapeHtml(bootstrap.admin.store_slug ? `Scope: ${bootstrap.admin.store_slug}` : "Scope: all stores")}</span>
        </div>
      </header>
      <div class="admin-alert" data-admin-alert hidden></div>
      <div data-admin-page-root class="admin-grid"></div>
    </section>
  `;
}

function getViewTemplate(view) {
  switch (view) {
    case "dashboard":
      return `
        <section class="admin-grid admin-grid--cards" data-dashboard-cards></section>
        <section class="admin-layout">
          <article class="admin-panel">
            <div class="admin-panel__heading">
              <div>
                <h2>Recent orders</h2>
                <p>Most recent order requests across your visible stores.</p>
              </div>
            </div>
            <div class="admin-list" data-dashboard-orders></div>
          </article>
          <article class="admin-panel">
            <div class="admin-panel__heading">
              <div>
                <h2>Low stock</h2>
                <p>Products that need replenishment soon.</p>
              </div>
            </div>
            <div class="admin-list" data-dashboard-stock></div>
          </article>
        </section>
        <article class="admin-panel">
          <div class="admin-panel__heading">
            <div>
              <h2>Recent repair bookings</h2>
              <p>Latest incoming repair requests.</p>
            </div>
          </div>
          <div class="admin-list" data-dashboard-repairs></div>
        </article>
      `;
    case "orders":
      return `
        <section class="admin-layout">
          <article class="admin-panel">
            <div class="admin-panel__heading">
              <div>
                <h2>Orders</h2>
                <p>Review and update store pickup and warehouse dispatch orders.</p>
              </div>
              <div class="admin-button-row">
                <button class="button button--ghost" type="button" data-orders-refresh>Refresh</button>
              </div>
            </div>
            <form class="admin-filter-bar" data-orders-filters>
              <label class="admin-filter">
                <span>Search</span>
                <input type="search" name="search" placeholder="Order code, customer, email or phone">
              </label>
              <label class="admin-filter">
                <span>Store</span>
                <select name="store_slug" data-orders-store-filter></select>
              </label>
              <label class="admin-filter">
                <span>Status</span>
                <select name="status">
                  <option value="">All statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <label class="admin-filter">
                <span>Payment</span>
                <select name="payment_status">
                  <option value="">All payment states</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                  <option value="not_required">Not required</option>
                </select>
              </label>
              <button class="button button--primary" type="submit">Apply</button>
            </form>
            <div class="admin-table-wrap" data-orders-table></div>
            <div data-orders-pagination></div>
          </article>
          <aside class="admin-panel">
            <div class="admin-panel__heading">
              <div>
                <h2>Order detail</h2>
                <p>Select an order to edit status and notes.</p>
              </div>
            </div>
            <div data-orders-editor class="admin-note">No order selected yet.</div>
          </aside>
        </section>
      `;
    case "repairs":
      return `
        <section class="admin-layout">
          <article class="admin-panel">
            <div class="admin-panel__heading">
              <div>
                <h2>Repair bookings</h2>
                <p>Track callbacks, diagnosis and completion.</p>
              </div>
              <div class="admin-button-row">
                <button class="button button--ghost" type="button" data-repairs-refresh>Refresh</button>
              </div>
            </div>
            <form class="admin-filter-bar admin-filter-bar--compact" data-repairs-filters>
              <label class="admin-filter">
                <span>Search</span>
                <input type="search" name="search" placeholder="Booking code, customer, phone, device">
              </label>
              <label class="admin-filter">
                <span>Store</span>
                <select name="store_slug" data-repairs-store-filter></select>
              </label>
              <label class="admin-filter">
                <span>Status</span>
                <select name="status">
                  <option value="">All statuses</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <button class="button button--primary" type="submit">Apply</button>
            </form>
            <div class="admin-table-wrap" data-repairs-table></div>
            <div data-repairs-pagination></div>
          </article>
          <aside class="admin-panel">
            <div class="admin-panel__heading">
              <div>
                <h2>Booking detail</h2>
                <p>Update status, date and technician notes.</p>
              </div>
            </div>
            <div data-repairs-editor class="admin-note">No repair booking selected yet.</div>
          </aside>
        </section>
      `;
    case "customers":
      return `
        <section class="admin-layout admin-layout--customers">
          <aside class="admin-panel">
            <div class="admin-panel__heading">
              <div>
                <h2>Customer editor</h2>
                <p>Add or update customer contact records.</p>
              </div>
            </div>
            <div data-customers-editor class="admin-note">Select a customer, or create a new one.</div>
          </aside>
          <article class="admin-panel">
            <div class="admin-panel__heading">
              <div>
                <h2>Customers</h2>
                <p>Search by name, email or phone. Marketing consent is stored for future campaigns.</p>
              </div>
              <div class="admin-button-row">
                <button class="button button--primary" type="button" data-customers-new>New customer</button>
                <button class="button button--ghost" type="button" data-customers-refresh>Refresh</button>
              </div>
            </div>
            <form class="admin-filter-bar admin-filter-bar--customers" data-customers-filters>
              <label class="admin-filter">
                <span>Search</span>
                <input type="search" name="search" placeholder="Name, email, phone or company">
              </label>
              <label class="admin-filter">
                <span>Email marketing</span>
                <select name="email_status">
                  <option value="">All</option>
                  <option value="SUBSCRIBED">Subscribed</option>
                  <option value="NOT_SET">Not set</option>
                  <option value="UNSUBSCRIBED">Unsubscribed</option>
                </select>
              </label>
              <label class="admin-filter">
                <span>SMS marketing</span>
                <select name="sms_status">
                  <option value="">All</option>
                  <option value="SUBSCRIBED">Subscribed</option>
                  <option value="NOT_SET">Not set</option>
                  <option value="UNSUBSCRIBED">Unsubscribed</option>
                </select>
              </label>
              <button class="button button--primary" type="submit">Search</button>
            </form>
            <div class="admin-table-wrap" data-customers-table></div>
            <div data-customers-pagination></div>
          </article>
        </section>
      `;
    case "products":
      return `
        <section class="admin-products-workspace">
          <article class="admin-panel admin-products-editor-panel">
            <div class="admin-panel__heading">
              <div>
                <h2>Product editor</h2>
                <p>Edit storefront content, images, pricing and product visibility.</p>
              </div>
            </div>
            <div data-products-editor class="admin-note">No product selected yet.</div>
          </article>
          <aside class="admin-panel admin-products-list-panel">
            <div class="admin-panel__heading">
              <div>
                <h2>Products</h2>
                <p>Select a product to edit.</p>
              </div>
              <div class="admin-button-row">
                <button class="button button--primary" type="button" data-products-new>New product</button>
                <button class="button button--ghost" type="button" data-products-category-new>Add category</button>
                <button class="button button--ghost" type="button" data-products-category-edit>Edit category</button>
                <button class="button button--ghost" type="button" data-products-import>Import Excel</button>
                <button class="button button--ghost" type="button" data-products-refresh>Refresh</button>
              </div>
            </div>
            <form class="admin-filter-bar admin-filter-bar--compact" data-products-filters>
              <label class="admin-filter">
                <span>Search</span>
                <input type="search" name="search" placeholder="Product name, SKU, slug or brand">
              </label>
              <label class="admin-filter">
                <span>Category</span>
                <select name="category_id" data-products-category-filter></select>
              </label>
              <label class="admin-filter">
                <span>Visibility</span>
                <select name="visibility">
                  <option value="">All products</option>
                  <option value="visible">Visible</option>
                  <option value="hidden">Hidden</option>
                </select>
              </label>
              <button class="button button--primary" type="submit">Apply</button>
            </form>
            <div class="admin-table-wrap" data-products-table></div>
            <div data-products-pagination></div>
          </aside>
        </section>
      `;
    case "inventory":
      return `
        <section class="admin-layout">
          <article class="admin-panel">
            <div class="admin-panel__heading">
              <div>
                <h2>Inventory</h2>
                <p>Store-level quantity and shelf location management.</p>
              </div>
              <div class="admin-button-row">
                <button class="button button--ghost" type="button" data-inventory-refresh>Refresh</button>
              </div>
            </div>
            <form class="admin-filter-bar admin-filter-bar--compact" data-inventory-filters>
              <label class="admin-filter">
                <span>Search</span>
                <input type="search" name="search" placeholder="Product name, SKU or brand">
              </label>
              <label class="admin-filter">
                <span>Store</span>
                <select name="store_slug" data-inventory-store-filter></select>
              </label>
              <label class="admin-filter">
                <span>Stock view</span>
                <select name="low_stock_only">
                  <option value="false">All rows</option>
                  <option value="true">Low stock only</option>
                </select>
              </label>
              <button class="button button--primary" type="submit">Apply</button>
            </form>
            <div class="admin-table-wrap" data-inventory-table></div>
            <div data-inventory-pagination></div>
          </article>
          <aside class="admin-panel">
            <div class="admin-panel__heading">
              <div>
                <h2>Inventory editor</h2>
                <p>Update quantity and shelf location for the selected row.</p>
              </div>
            </div>
            <div data-inventory-editor class="admin-note">No inventory row selected yet.</div>
          </aside>
        </section>
      `;
    default:
      return `<article class="admin-panel"><p class="admin-note">Unknown admin view.</p></article>`;
  }
}

function fillStoreOptions(select, stores, allowAll = true) {
  if (!(select instanceof HTMLSelectElement)) return;
  const options = [];
  if (allowAll) {
    options.push(`<option value="">All stores</option>`);
  }
  stores.forEach((store) => {
    options.push(`<option value="${escapeHtml(store.slug)}">${escapeHtml(store.name)}</option>`);
  });
  select.innerHTML = options.join("");
}

function fillCategoryOptions(select, categories) {
  if (!(select instanceof HTMLSelectElement)) return;
  const options = ['<option value="">All categories</option>'];
  categories.forEach((category) => {
    options.push(`<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`);
  });
  select.innerHTML = options.join("");
}

function renderCategorySelectOptions(categories, selectedId = "") {
  const selectedValue = String(selectedId ?? "").trim();
  const options = ['<option value="">Unassigned</option>'];
  categories.forEach((category) => {
    const optionValue = String(category.id ?? "").trim();
    options.push(
      `<option value="${escapeHtml(optionValue)}" ${optionValue === selectedValue ? "selected" : ""}>${escapeHtml(category.name)}</option>`,
    );
  });
  return options.join("");
}

function getImageOrPlaceholder(url) {
  const text = String(url || "").trim();
  return text || DEFAULT_PRODUCT_IMAGE_URL;
}

function normalizeProductGallery(row) {
  const sourceImages = Array.isArray(row.images)
    ? row.images
    : Array.isArray(row.product_images)
      ? row.product_images
      : [];
  const seen = new Set();
  const gallery = [];

  const pushImage = (image, index = 0) => {
    const imageUrl = String(image?.image_url || image?.url || "").trim();
    if (!imageUrl || seen.has(imageUrl)) return;
    seen.add(imageUrl);
    gallery.push({
      id: image?.id || "",
      image_url: imageUrl,
      alt_text: String(image?.alt_text || row.name || "").trim(),
      sort_order: Number.isFinite(Number(image?.sort_order)) ? Number(image.sort_order) : index,
    });
  };

  if (row.image_url) {
    pushImage({ id: "", image_url: row.image_url, alt_text: row.name, sort_order: -1 }, -1);
  }

  [...sourceImages]
    .sort((left, right) => Number(left?.sort_order || 0) - Number(right?.sort_order || 0))
    .forEach(pushImage);

  return gallery.length
    ? gallery
    : [{ id: "", image_url: "", alt_text: String(row.name || "").trim(), sort_order: 0 }];
}

function renderProductGalleryRow(image, index, canEdit) {
  const draggable = canEdit ? "true" : "false";
  return `
    <div class="admin-gallery-tile" data-product-gallery-row draggable="${draggable}">
      <div class="admin-gallery-tile__preview">
        <img src="${escapeHtml(getImageOrPlaceholder(image.image_url))}" alt="${escapeHtml(image.alt_text || "")}" data-gallery-preview>
        <span class="admin-gallery-tile__order" data-gallery-index>${index + 1}</span>
        <span class="admin-gallery-tile__main">Main image</span>
        ${canEdit ? `
          <button class="admin-gallery-tile__edit" type="button" data-gallery-action="edit" aria-label="Edit image">Edit</button>
          <button class="admin-gallery-tile__remove" type="button" data-gallery-action="remove" aria-label="Remove image">×</button>
        ` : ""}
      </div>
      <input type="hidden" data-gallery-id value="${escapeHtml(image.id || "")}">
      <input type="hidden" data-gallery-url value="${escapeHtml(image.image_url || "")}">
      <input type="hidden" data-gallery-alt value="${escapeHtml(image.alt_text || "")}">
      ${canEdit ? `<input type="file" data-gallery-replace-input accept="image/*" hidden>` : ""}
    </div>
  `;
}

function renderProductGalleryUploadTile(canEdit) {
  if (!canEdit) return "";
  return `
    <label class="admin-gallery-upload" data-gallery-upload-dropzone>
      <input type="file" data-gallery-upload-input accept="image/*" multiple hidden>
      <span class="admin-gallery-upload__icon">+</span>
      <strong>Add image</strong>
      <small>Click or drag images here</small>
    </label>
  `;
}

function renderProductGalleryEditor(row, canEdit) {
  const gallery = normalizeProductGallery(row);
  return `
    <section class="admin-editor-section">
      <div class="admin-editor-section__heading">
        <div>
          <h3>Images and videos</h3>
          <p>Drag images to reorder. The first image is the storefront thumbnail and main product image.</p>
        </div>
      </div>
      <div class="admin-gallery-list" data-product-gallery-list>
        ${gallery.map((image, index) => renderProductGalleryRow(image, index, canEdit)).join("")}
        ${renderProductGalleryUploadTile(canEdit)}
      </div>
    </section>
  `;
}

function refreshProductGalleryRows(list) {
  if (!(list instanceof HTMLElement)) return;
  list.querySelectorAll("[data-product-gallery-row]").forEach((row, index) => {
    const indexTarget = row.querySelector("[data-gallery-index]");
    const imageInput = row.querySelector("[data-gallery-url]");
    const preview = row.querySelector("[data-gallery-preview]");
    row.classList.toggle("is-main", index === 0);
    if (indexTarget) indexTarget.textContent = String(index + 1);
    if (preview instanceof HTMLImageElement && imageInput instanceof HTMLInputElement) {
      preview.src = getImageOrPlaceholder(imageInput.value);
    }
  });
}

function setupProductGalleryDrag(list, onChange) {
  if (!(list instanceof HTMLElement)) return;
  let draggedRow = null;

  list.addEventListener("dragstart", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const row = target.closest("[data-product-gallery-row]");
    if (!(row instanceof HTMLElement) || row.getAttribute("draggable") !== "true") return;
    draggedRow = row;
    row.classList.add("is-dragging");
    event.dataTransfer?.setData("text/plain", "product-gallery-image");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  });

  list.addEventListener("dragover", (event) => {
    if (!draggedRow) return;
    event.preventDefault();
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const overRow = target.closest("[data-product-gallery-row]");
    if (!(overRow instanceof HTMLElement) || overRow === draggedRow) return;

    const overRect = overRow.getBoundingClientRect();
    const shouldInsertAfter = event.clientX > overRect.left + overRect.width / 2;
    if (shouldInsertAfter) {
      overRow.after(draggedRow);
    } else {
      overRow.before(draggedRow);
    }
  });

  list.addEventListener("drop", (event) => {
    if (!draggedRow) return;
    event.preventDefault();
    draggedRow.classList.remove("is-dragging");
    draggedRow = null;
    onChange?.();
  });

  list.addEventListener("dragend", () => {
    if (draggedRow) {
      draggedRow.classList.remove("is-dragging");
    }
    draggedRow = null;
    onChange?.();
  });
}

function removeEmptyGalleryPlaceholders(galleryList) {
  if (!(galleryList instanceof HTMLElement)) return;
  galleryList.querySelectorAll("[data-product-gallery-row]").forEach((row) => {
    const urlInput = row.querySelector("[data-gallery-url]");
    if (urlInput instanceof HTMLInputElement && !urlInput.value.trim()) {
      row.remove();
    }
  });
}

function appendUploadedGalleryImage(galleryList, imageUrl, altText, canEdit) {
  if (!(galleryList instanceof HTMLElement)) return;
  removeEmptyGalleryPlaceholders(galleryList);
  const count = galleryList.querySelectorAll("[data-product-gallery-row]").length;
  const uploadTile = galleryList.querySelector("[data-gallery-upload-dropzone]");
  const html = renderProductGalleryRow({ image_url: imageUrl, alt_text: altText }, count, canEdit);
  if (uploadTile instanceof HTMLElement) {
    uploadTile.insertAdjacentHTML("beforebegin", html);
  } else {
    galleryList.insertAdjacentHTML("beforeend", html);
  }
}

async function uploadProductGalleryFiles(files, options) {
  const { galleryList, row, session, canEdit, alertTarget, onChange } = options || {};
  if (!(galleryList instanceof HTMLElement)) return;
  const imageFiles = Array.from(files || []).filter((file) => file instanceof File && file.type.startsWith("image/"));
  if (!imageFiles.length) return;

  const uploadTile = galleryList.querySelector("[data-gallery-upload-dropzone]");
  uploadTile?.classList.add("is-uploading");
  setAlert(alertTarget, `Uploading ${imageFiles.length} product image${imageFiles.length === 1 ? "" : "s"}...`, "info");

  try {
    for (const file of imageFiles) {
      const imageUrl = await uploadProductDetailImage(file, row, session);
      appendUploadedGalleryImage(galleryList, imageUrl, row?.name || file.name, canEdit);
    }
    onChange?.();
    setAlert(alertTarget, "Product images uploaded. Click Save product to publish the gallery.", "success");
  } catch (error) {
    setAlert(alertTarget, error instanceof Error ? error.message : "Product image upload failed.", "error");
  } finally {
    uploadTile?.classList.remove("is-uploading", "is-drag-over");
    const input = uploadTile?.querySelector("[data-gallery-upload-input]");
    if (input instanceof HTMLInputElement) {
      input.value = "";
    }
  }
}

function collectProductGallery(editorTarget) {
  return Array.from(editorTarget.querySelectorAll("[data-product-gallery-row]"))
    .map((row, index) => {
      const idInput = row.querySelector("[data-gallery-id]");
      const urlInput = row.querySelector("[data-gallery-url]");
      const altInput = row.querySelector("[data-gallery-alt]");
      return {
        id: idInput instanceof HTMLInputElement ? idInput.value.trim() : "",
        image_url: urlInput instanceof HTMLInputElement ? urlInput.value.trim() : "",
        alt_text: altInput instanceof HTMLInputElement ? altInput.value.trim() : "",
        sort_order: index,
      };
    })
    .filter((image) => image.image_url);
}

function buildRowClickHandler(container, selector, callback) {
  container.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const row = target.closest(selector);
    if (!(row instanceof HTMLElement)) return;
    callback(row);
  });
}

function renderEmptyState(target, message) {
  if (!(target instanceof HTMLElement)) return;
  target.innerHTML = `<div class="admin-empty">${escapeHtml(message)}</div>`;
}

function makeStoreLabel(storeSlug, stores) {
  const store = (stores || []).find((item) => item.slug === storeSlug);
  return store?.name || storeSlug || "—";
}

function renderDashboardPage(root, bootstrap, session, alertTarget) {
  root.innerHTML = getViewTemplate("dashboard");
  const cardsTarget = root.querySelector("[data-dashboard-cards]");
  const ordersTarget = root.querySelector("[data-dashboard-orders]");
  const repairsTarget = root.querySelector("[data-dashboard-repairs]");
  const stockTarget = root.querySelector("[data-dashboard-stock]");

  const load = async () => {
    setAlert(alertTarget, "");
    if (cardsTarget) cardsTarget.innerHTML = `<div class="admin-loading">Loading dashboard...</div>`;
    const result = await callAdminApi("dashboard", {}, session);
    cardsTarget.innerHTML = result.cards.map((card) => {
      return `
        <article class="admin-card">
          <p class="admin-card__label">${escapeHtml(card.label)}</p>
          <p class="admin-card__value ${card.money ? "is-money" : ""}">${card.money ? escapeHtml(String(Number(card.value || 0).toFixed(2))) : escapeHtml(card.value)}</p>
        </article>
      `;
    }).join("");

    ordersTarget.innerHTML = (result.recent_orders || []).length
      ? result.recent_orders.map((row) => `
          <div class="admin-list-item">
            <div class="admin-list-item__content">
              <strong>${escapeHtml(row.order_code)}</strong>
              <span>${escapeHtml(row.customer_name)} · ${escapeHtml(makeStoreLabel(row.store_slug, result.stores || bootstrap.stores))}</span>
            </div>
            <div class="admin-list-item__content" style="text-align:right">
              <strong>${formatMoney(row.total_amount)}</strong>
              <span>${renderBadge(row.status)} ${renderBadge(row.payment_status)}</span>
            </div>
          </div>
        `).join("")
      : `<div class="admin-empty">No recent orders yet.</div>`;

    repairsTarget.innerHTML = (result.recent_repairs || []).length
      ? result.recent_repairs.map((row) => `
          <div class="admin-list-item">
            <div class="admin-list-item__content">
              <strong>${escapeHtml(row.booking_code)}</strong>
              <span>${escapeHtml(row.customer_name)} · ${escapeHtml(row.device_model)}</span>
            </div>
            <div class="admin-list-item__content" style="text-align:right">
              <strong>${escapeHtml(makeStoreLabel(row.store_slug, result.stores || bootstrap.stores))}</strong>
              <span>${renderBadge(row.status)}</span>
            </div>
          </div>
        `).join("")
      : `<div class="admin-empty">No recent repair bookings yet.</div>`;

    stockTarget.innerHTML = (result.low_stock_items || []).length
      ? result.low_stock_items.map((row) => `
          <div class="admin-list-item">
            <div class="admin-list-item__content">
              <strong>${escapeHtml(row.name)}</strong>
              <span>${escapeHtml(row.sku)}</span>
            </div>
            <div class="admin-list-item__content" style="text-align:right">
              <strong>${escapeHtml(row.stock_quantity)}</strong>
              <span>units left</span>
            </div>
          </div>
        `).join("")
      : `<div class="admin-empty">No low stock items.</div>`;
  };

  load().catch((error) => {
    setAlert(alertTarget, error instanceof Error ? error.message : "Dashboard could not be loaded.", "error");
  });
}

function renderDashboardPageEnhanced(root, bootstrap, session, alertTarget) {
  root.innerHTML = getViewTemplate("dashboard");
  const cardsTarget = root.querySelector("[data-dashboard-cards]");
  const ordersTarget = root.querySelector("[data-dashboard-orders]");
  const repairsTarget = root.querySelector("[data-dashboard-repairs]");
  const stockTarget = root.querySelector("[data-dashboard-stock]");
  const state = { orders: [], repairs: [], stores: bootstrap.stores || [] };

  const saveDashboardOrder = async (orderId, form, reload) => {
    const formData = new FormData(form);
    await callAdminApi("order_update", {
      id: orderId,
      status: formData.get("status"),
      payment_status: formData.get("payment_status"),
      fulfillment_status: formData.get("fulfillment_status"),
      tracking_number: formData.get("tracking_number"),
      tracking_url: formData.get("tracking_url"),
      notes: formData.get("notes"),
    }, session);
    setAlert(alertTarget, "Order updated.", "success");
    await reload();
  };

  const openOrderQuickView = (order, reload) => {
    const store = state.stores.find((item) => item.slug === order.store_slug) || null;
    const addressText = order.fulfillment_method === "shipping"
      ? formatAddress([
          order.recipient_name || `${order.customer_name || ""}`.trim(),
          order.company_name,
          order.address_line_1,
          order.address_line_2,
          order.suburb,
          order.state,
          order.postcode,
          order.country_code || "AU",
        ])
      : formatAddress([
          store?.name,
          store?.address_line_1,
          store?.address_line_2,
          store?.suburb,
          store?.state,
          store?.postcode,
        ]);

    const modal = openAdminModal({
      title: order.order_code,
      subtitle: `${order.customer_name || "Customer"} · ${order.fulfillment_method === "shipping" ? "Warehouse dispatch" : `Pickup - ${store?.name || order.store_slug}`}`,
      content: `
        <div class="admin-detail-grid">
          <section class="admin-panel admin-panel--embedded">
            <div class="admin-panel__heading">
              <div>
                <h3>Customer and fulfilment</h3>
                <p>Review the recipient details before updating the order.</p>
              </div>
              <div class="admin-button-row">
                <button class="button button--ghost" type="button" data-order-print>Print PDF</button>
                ${order.fulfillment_method === "shipping" ? "" : `<a class="button button--ghost" href="${escapeHtml(getStoreMapUrl(store))}" target="_blank" rel="noreferrer">Open map</a>`}
              </div>
            </div>
            <div class="admin-summary-grid">
              <div class="admin-summary-card"><span>Name</span><strong>${escapeHtml(order.customer_name || "—")}</strong></div>
              <div class="admin-summary-card"><span>Phone</span><strong>${escapeHtml(order.phone || "—")}</strong></div>
              <div class="admin-summary-card"><span>Email</span><strong>${escapeHtml(order.email || "—")}</strong></div>
              <div class="admin-summary-card"><span>Payment</span><strong>${escapeHtml(order.payment_method_label || "—")}</strong></div>
            </div>
            <div class="admin-address-card">
              <span>${escapeHtml(order.fulfillment_method === "shipping" ? "Delivery address" : "Pickup location")}</span>
              <strong>${escapeHtml(addressText || "No address available.")}</strong>
            </div>
          </section>
          <section class="admin-panel admin-panel--embedded">
            <div class="admin-panel__heading">
              <div>
                <h3>Update order</h3>
                <p>Tracking, status and internal notes.</p>
              </div>
            </div>
            <form class="admin-editor__form" data-dashboard-order-form>
              <div class="admin-editor__grid">
                <label><span>Status</span>
                  <select name="status">
                    ${["submitted", "confirmed", "packed", "shipped", "completed", "cancelled"].map((value) => `<option value="${value}" ${order.status === value ? "selected" : ""}>${value}</option>`).join("")}
                  </select>
                </label>
                <label><span>Payment</span>
                  <select name="payment_status">
                    ${["unpaid", "pending", "paid", "failed", "refunded", "not_required"].map((value) => `<option value="${value}" ${order.payment_status === value ? "selected" : ""}>${value}</option>`).join("")}
                  </select>
                </label>
                <label><span>Fulfilment</span>
                  <select name="fulfillment_status">
                    ${["new", "queued", "ready_for_pickup", "packed", "label_created", "shipped", "completed", "cancelled"].map((value) => `<option value="${value}" ${order.fulfillment_status === value ? "selected" : ""}>${value}</option>`).join("")}
                  </select>
                </label>
                <label><span>Tracking number</span><input type="text" name="tracking_number" value="${escapeHtml(order.tracking_number || "")}"></label>
              </div>
              <label><span>Tracking URL</span><input type="url" name="tracking_url" value="${escapeHtml(order.tracking_url || "")}"></label>
              <label><span>Notes</span><textarea name="notes">${escapeHtml(order.notes || "")}</textarea></label>
              <div class="admin-button-row">
                <button class="button button--primary" type="submit">Save order</button>
                <a class="button button--ghost" href="orders.html">Open full orders page</a>
              </div>
            </form>
          </section>
        </div>
        <section class="admin-panel admin-panel--embedded">
          <div class="admin-panel__heading">
            <div>
              <h3>Order items</h3>
              <p>Current line items and totals.</p>
            </div>
          </div>
          <div class="admin-list">
            ${(order.items || []).length ? order.items.map((item) => `
              <div class="admin-list-item">
                <div class="admin-list-item__content">
                  <strong>${escapeHtml(item.product_name || "Item")}</strong>
                  <span>${escapeHtml(item.quantity || 0)} × ${formatMoney(item.unit_price || 0)}</span>
                </div>
                <strong>${formatMoney(item.line_total || 0)}</strong>
              </div>
            `).join("") : `<div class="admin-empty">No line items found.</div>`}
          </div>
          <div class="admin-summary-grid admin-summary-grid--totals">
            <div class="admin-summary-card"><span>Subtotal</span><strong>${formatMoney(order.subtotal_amount || 0)}</strong></div>
            <div class="admin-summary-card"><span>Payment fee</span><strong>${formatMoney(order.payment_fee_amount || 0)}</strong></div>
            <div class="admin-summary-card"><span>Shipping fee</span><strong>${formatMoney(order.shipping_fee_amount || 0)}</strong></div>
            <div class="admin-summary-card"><span>Total</span><strong>${formatMoney(order.total_amount || 0)}</strong></div>
          </div>
        </section>
      `,
    });

    modal.querySelector("[data-order-print]")?.addEventListener("click", () => {
      printOrderDocument(order, state.stores);
    });
    modal.querySelector("[data-dashboard-order-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await saveDashboardOrder(order.id, event.currentTarget, load);
        closeAdminModal();
      } catch (error) {
        setAlert(alertTarget, error instanceof Error ? error.message : "Order update failed.", "error");
      }
    });
  };

  const openRepairQuickView = (repair) => {
    const store = state.stores.find((item) => item.slug === repair.store_slug) || null;
    openAdminModal({
      title: repair.booking_code,
      subtitle: `${repair.customer_name || "Customer"} · ${store?.name || repair.store_slug}`,
      content: `
        <div class="admin-detail-grid">
          <section class="admin-panel admin-panel--embedded">
            <div class="admin-panel__heading">
              <div>
                <h3>Repair customer</h3>
                <p>Core contact and booking details.</p>
              </div>
            </div>
            <div class="admin-summary-grid">
              <div class="admin-summary-card"><span>Name</span><strong>${escapeHtml(repair.customer_name || "—")}</strong></div>
              <div class="admin-summary-card"><span>Phone</span><strong>${escapeHtml(repair.phone || "—")}</strong></div>
              <div class="admin-summary-card"><span>Email</span><strong>${escapeHtml(repair.email || "—")}</strong></div>
              <div class="admin-summary-card"><span>Store</span><strong>${escapeHtml(store?.name || repair.store_slug || "—")}</strong></div>
              <div class="admin-summary-card"><span>Category</span><strong>${escapeHtml(repair.repair_category || "—")}</strong></div>
              <div class="admin-summary-card"><span>Status</span><strong>${escapeHtml(repair.status || "—")}</strong></div>
            </div>
          </section>
          <section class="admin-panel admin-panel--embedded">
            <div class="admin-panel__heading">
              <div>
                <h3>Device and issue</h3>
                <p>What the customer booked in for.</p>
              </div>
            </div>
            <div class="admin-address-card">
              <span>Device</span>
              <strong>${escapeHtml([repair.brand, repair.device_model].filter(Boolean).join(" ") || repair.device_model || "—")}</strong>
            </div>
            <div class="admin-address-card">
              <span>Issue description</span>
              <strong>${escapeHtml(repair.issue_description || "No description provided.")}</strong>
            </div>
            <div class="admin-address-card">
              <span>Requested time</span>
              <strong>${escapeHtml([repair.preferred_date, repair.preferred_time].filter(Boolean).join(" · ") || "Not specified")}</strong>
            </div>
            <div class="admin-button-row">
              <a class="button button--ghost" href="repairs.html">Open repair bookings page</a>
            </div>
          </section>
        </div>
      `,
    });
  };

  const load = async () => {
    setAlert(alertTarget, "");
    if (cardsTarget) cardsTarget.innerHTML = `<div class="admin-loading">Loading dashboard...</div>`;
    const result = await callAdminApi("dashboard", {}, session);
    state.orders = result.recent_orders || [];
    state.repairs = result.recent_repairs || [];
    state.stores = result.stores || bootstrap.stores || [];
    cardsTarget.innerHTML = result.cards.map((card) => {
      return `
        <article class="admin-card">
          <p class="admin-card__label">${escapeHtml(card.label)}</p>
          <p class="admin-card__value ${card.money ? "is-money" : ""}">${card.money ? escapeHtml(String(Number(card.value || 0).toFixed(2))) : escapeHtml(card.value)}</p>
        </article>
      `;
    }).join("");

    ordersTarget.innerHTML = state.orders.length
      ? state.orders.map((row) => `
          <button class="admin-list-item admin-list-item--interactive" type="button" data-dashboard-order="${row.id}">
            <div class="admin-list-item__content">
              <strong>${escapeHtml(row.order_code)}</strong>
              <span>${escapeHtml(row.customer_name)} · ${escapeHtml(makeStoreLabel(row.store_slug, state.stores))}</span>
            </div>
            <div class="admin-list-item__content" style="text-align:right">
              <strong>${formatMoney(row.total_amount)}</strong>
              <span>${renderBadge(row.status)} ${renderBadge(row.payment_status)}</span>
            </div>
          </button>
        `).join("")
      : `<div class="admin-empty">No recent orders yet.</div>`;

    repairsTarget.innerHTML = state.repairs.length
      ? state.repairs.map((row) => `
          <button class="admin-list-item admin-list-item--interactive" type="button" data-dashboard-repair="${row.id}">
            <div class="admin-list-item__content">
              <strong>${escapeHtml(row.booking_code)}</strong>
              <span>${escapeHtml(row.customer_name)} · ${escapeHtml(row.device_model)}</span>
            </div>
            <div class="admin-list-item__content" style="text-align:right">
              <strong>${escapeHtml(makeStoreLabel(row.store_slug, state.stores))}</strong>
              <span>${renderBadge(row.status)}</span>
            </div>
          </button>
        `).join("")
      : `<div class="admin-empty">No recent repair bookings yet.</div>`;

    stockTarget.innerHTML = (result.low_stock_items || []).length
      ? result.low_stock_items.map((row) => `
          <div class="admin-list-item">
            <div class="admin-list-item__content">
              <strong>${escapeHtml(row.name)}</strong>
              <span>${escapeHtml(row.sku)}</span>
            </div>
            <div class="admin-list-item__content" style="text-align:right">
              <strong>${escapeHtml(row.stock_quantity)}</strong>
              <span>units left</span>
            </div>
          </div>
        `).join("")
      : `<div class="admin-empty">No low stock items.</div>`;

    ordersTarget.onclick = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const rowElement = target.closest("[data-dashboard-order]");
      if (!(rowElement instanceof HTMLElement)) return;
      const orderId = Number(rowElement.getAttribute("data-dashboard-order"));
      const order = state.orders.find((item) => item.id === orderId);
      if (order) openOrderQuickView(order, load);
    };

    repairsTarget.onclick = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const rowElement = target.closest("[data-dashboard-repair]");
      if (!(rowElement instanceof HTMLElement)) return;
      const repairId = Number(rowElement.getAttribute("data-dashboard-repair"));
      const repair = state.repairs.find((item) => item.id === repairId);
      if (repair) openRepairQuickView(repair);
    };
  };

  load().catch((error) => {
    setAlert(alertTarget, error instanceof Error ? error.message : "Dashboard could not be loaded.", "error");
  });
}

function renderOrdersPage(root, bootstrap, session, alertTarget) {
  root.innerHTML = getViewTemplate("orders");
  const filterForm = root.querySelector("[data-orders-filters]");
  const tableTarget = root.querySelector("[data-orders-table]");
  const editorTarget = root.querySelector("[data-orders-editor]");
  const paginationTarget = root.querySelector("[data-orders-pagination]");
  const storeFilter = root.querySelector("[data-orders-store-filter]");
  const refreshButton = root.querySelector("[data-orders-refresh]");

  fillStoreOptions(storeFilter, bootstrap.stores, bootstrap.capabilities.can_view_all_stores);
  if (!bootstrap.capabilities.can_view_all_stores && storeFilter instanceof HTMLSelectElement && bootstrap.admin.store_slug) {
    storeFilter.value = bootstrap.admin.store_slug;
    storeFilter.disabled = true;
  }

  const state = {
    page: 1,
    selectedId: null,
    rows: [],
    meta: null,
  };

  const renderEditor = () => {
    const row = state.rows.find((item) => item.id === state.selectedId);
    if (!row) {
      editorTarget.innerHTML = `<p class="admin-note">No order selected yet.</p>`;
      return;
    }

    editorTarget.innerHTML = `
      <div class="admin-editor">
        <div class="admin-editor__meta">
          <strong>${escapeHtml(row.order_code)}</strong><br>
          ${escapeHtml(row.customer_name)} · ${escapeHtml(row.email)}<br>
          ${escapeHtml(makeStoreLabel(row.store_slug, bootstrap.stores))} · ${formatDateTime(row.created_at)}
        </div>
        <form class="admin-editor__form" data-order-editor-form>
          <div class="admin-editor__grid">
            <label><span>Status</span>
              <select name="status">
                ${["submitted", "confirmed", "packed", "shipped", "completed", "cancelled"].map((value) => `<option value="${value}" ${row.status === value ? "selected" : ""}>${value}</option>`).join("")}
              </select>
            </label>
            <label><span>Payment</span>
              <select name="payment_status">
                ${["unpaid", "pending", "paid", "failed", "refunded", "not_required"].map((value) => `<option value="${value}" ${row.payment_status === value ? "selected" : ""}>${value}</option>`).join("")}
              </select>
            </label>
            <label><span>Fulfilment</span>
              <select name="fulfillment_status">
                ${["new", "queued", "ready_for_pickup", "packed", "label_created", "shipped", "completed", "cancelled"].map((value) => `<option value="${value}" ${row.fulfillment_status === value ? "selected" : ""}>${value}</option>`).join("")}
              </select>
            </label>
            <label><span>Tracking number</span><input type="text" name="tracking_number" value="${escapeHtml(row.tracking_number || "")}"></label>
          </div>
          <label><span>Tracking URL</span><input type="url" name="tracking_url" value="${escapeHtml(row.tracking_url || "")}"></label>
          <label><span>Notes</span><textarea name="notes">${escapeHtml(row.notes || "")}</textarea></label>
          <div class="admin-button-row">
            <button class="button button--primary" type="submit">Save order</button>
          </div>
        </form>
        <div class="admin-panel">
          <p class="admin-card__label">Items</p>
          <div class="admin-list">
            ${(row.items || []).length ? row.items.map((item) => `
              <div class="admin-list-item">
                <div class="admin-list-item__content">
                  <strong>${escapeHtml(item.product_name)}</strong>
                  <span>${escapeHtml(item.quantity)} × ${formatMoney(item.unit_price)}</span>
                </div>
                <strong>${formatMoney(item.line_total)}</strong>
              </div>
            `).join("") : `<div class="admin-empty">No line items available.</div>`}
          </div>
        </div>
      </div>
    `;

    editorTarget.querySelector("[data-order-editor-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      try {
        await callAdminApi("order_update", {
          id: row.id,
          status: formData.get("status"),
          payment_status: formData.get("payment_status"),
          fulfillment_status: formData.get("fulfillment_status"),
          tracking_number: formData.get("tracking_number"),
          tracking_url: formData.get("tracking_url"),
          notes: formData.get("notes"),
        }, session);
        setAlert(alertTarget, "Order updated.", "success");
        await load();
      } catch (error) {
        setAlert(alertTarget, error instanceof Error ? error.message : "Order update failed.", "error");
      }
    });
  };

  const renderTable = () => {
    if (!state.rows.length) {
      renderEmptyState(tableTarget, "No orders matched the current filters.");
      paginationTarget.innerHTML = "";
      editorTarget.innerHTML = `<p class="admin-note">No order selected yet.</p>`;
      return;
    }

    tableTarget.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Store</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Total</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${state.rows.map((row) => `
            <tr data-order-row="${row.id}" class="${state.selectedId === row.id ? "is-selected" : ""}">
              <td>
                <div class="admin-cell-title">
                  <strong>${escapeHtml(row.order_code)}</strong>
                  <span>${escapeHtml(row.customer_name)} · ${escapeHtml(row.email)}</span>
                </div>
              </td>
              <td>${escapeHtml(makeStoreLabel(row.store_slug, bootstrap.stores))}</td>
              <td>${renderBadge(row.status)}</td>
              <td>${renderBadge(row.payment_status)}</td>
              <td>${formatMoney(row.total_amount)}</td>
              <td>${formatDateTime(row.created_at)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    paginationTarget.innerHTML = renderPagination(state.meta || {});
    buildRowClickHandler(tableTarget, "[data-order-row]", (rowElement) => {
      state.selectedId = Number(rowElement.getAttribute("data-order-row"));
      renderTable();
      renderEditor();
    });

    paginationTarget.querySelector("[data-page-prev]")?.addEventListener("click", async () => {
      state.page = Math.max(1, state.page - 1);
      await load();
    });
    paginationTarget.querySelector("[data-page-next]")?.addEventListener("click", async () => {
      const totalPages = Math.max(1, Math.ceil((state.meta?.total || 0) / (state.meta?.page_size || 20)));
      state.page = Math.min(totalPages, state.page + 1);
      await load();
    });
    renderEditor();
  };

  const load = async () => {
    setAlert(alertTarget, "");
    tableTarget.innerHTML = `<div class="admin-loading">Loading orders...</div>`;
    const formData = new FormData(filterForm);
    const result = await callAdminApi("orders_list", {
      filters: {
        page: state.page,
        page_size: 20,
        search: formData.get("search"),
        store_slug: formData.get("store_slug"),
        status: formData.get("status"),
        payment_status: formData.get("payment_status"),
      },
    }, session);
    state.rows = result.rows || [];
    state.meta = result;
    if (state.selectedId && !state.rows.some((row) => row.id === state.selectedId)) {
      state.selectedId = state.rows[0]?.id || null;
    }
    if (!state.selectedId && state.rows.length) {
      state.selectedId = state.rows[0].id;
    }
    renderTable();
  };

  filterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.page = 1;
    await load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Orders could not be loaded.", "error"));
  });

  refreshButton?.addEventListener("click", () => {
    load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Orders could not be refreshed.", "error"));
  });

  load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Orders could not be loaded.", "error"));
}

function renderRepairsPage(root, bootstrap, session, alertTarget) {
  root.innerHTML = getViewTemplate("repairs");
  const filterForm = root.querySelector("[data-repairs-filters]");
  const tableTarget = root.querySelector("[data-repairs-table]");
  const editorTarget = root.querySelector("[data-repairs-editor]");
  const paginationTarget = root.querySelector("[data-repairs-pagination]");
  const storeFilter = root.querySelector("[data-repairs-store-filter]");
  const refreshButton = root.querySelector("[data-repairs-refresh]");

  fillStoreOptions(storeFilter, bootstrap.stores, bootstrap.capabilities.can_view_all_stores);
  if (!bootstrap.capabilities.can_view_all_stores && storeFilter instanceof HTMLSelectElement && bootstrap.admin.store_slug) {
    storeFilter.value = bootstrap.admin.store_slug;
    storeFilter.disabled = true;
  }

  const state = { page: 1, selectedId: null, rows: [], meta: null };

  const renderEditor = () => {
    const row = state.rows.find((item) => item.id === state.selectedId);
    if (!row) {
      editorTarget.innerHTML = `<p class="admin-note">No repair booking selected yet.</p>`;
      return;
    }

    editorTarget.innerHTML = `
      <div class="admin-editor">
        <div class="admin-editor__meta">
          <strong>${escapeHtml(row.booking_code)}</strong><br>
          ${escapeHtml(row.customer_name)} · ${escapeHtml(row.device_model)}<br>
          ${escapeHtml(makeStoreLabel(row.store_slug, bootstrap.stores))} · ${formatDateTime(row.created_at)}
        </div>
        <form class="admin-editor__form" data-repair-editor-form>
          <div class="admin-editor__grid">
            <label><span>Status</span>
              <select name="status">
                ${["new", "contacted", "in_progress", "completed", "cancelled"].map((value) => `<option value="${value}" ${row.status === value ? "selected" : ""}>${value}</option>`).join("")}
              </select>
            </label>
            <label><span>Preferred date</span><input type="date" name="preferred_date" value="${escapeHtml(row.preferred_date || "")}"></label>
            <label><span>Preferred time</span><input type="text" name="preferred_time" value="${escapeHtml(row.preferred_time || "")}"></label>
          </div>
          <label><span>Admin notes</span><textarea name="admin_notes">${escapeHtml(row.admin_notes || "")}</textarea></label>
          <div class="admin-button-row">
            <button class="button button--primary" type="submit">Save booking</button>
          </div>
        </form>
        <div class="admin-note">
          <strong>Issue:</strong> ${escapeHtml(row.issue_description || "—")}<br>
          <strong>Contact:</strong> ${escapeHtml(row.phone || "—")} · ${escapeHtml(row.email || "—")}
        </div>
      </div>
    `;

    editorTarget.querySelector("[data-repair-editor-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      try {
        await callAdminApi("repair_update", {
          id: row.id,
          status: formData.get("status"),
          preferred_date: formData.get("preferred_date"),
          preferred_time: formData.get("preferred_time"),
          admin_notes: formData.get("admin_notes"),
        }, session);
        setAlert(alertTarget, "Repair booking updated.", "success");
        await load();
      } catch (error) {
        setAlert(alertTarget, error instanceof Error ? error.message : "Repair booking could not be updated.", "error");
      }
    });
  };

  const renderTable = () => {
    if (!state.rows.length) {
      renderEmptyState(tableTarget, "No repair bookings matched the current filters.");
      paginationTarget.innerHTML = "";
      editorTarget.innerHTML = `<p class="admin-note">No repair booking selected yet.</p>`;
      return;
    }

    tableTarget.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Booking</th>
            <th>Store</th>
            <th>Category</th>
            <th>Status</th>
            <th>Customer</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${state.rows.map((row) => `
            <tr data-repair-row="${row.id}" class="${state.selectedId === row.id ? "is-selected" : ""}">
              <td>
                <div class="admin-cell-title">
                  <strong>${escapeHtml(row.booking_code)}</strong>
                  <span>${escapeHtml(row.brand || "Unknown")} · ${escapeHtml(row.device_model)}</span>
                </div>
              </td>
              <td>${escapeHtml(makeStoreLabel(row.store_slug, bootstrap.stores))}</td>
              <td>${escapeHtml(row.repair_category)}</td>
              <td>${renderBadge(row.status)}</td>
              <td>${escapeHtml(row.customer_name)}</td>
              <td>${formatDateTime(row.created_at)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    paginationTarget.innerHTML = renderPagination(state.meta || {});
    buildRowClickHandler(tableTarget, "[data-repair-row]", (rowElement) => {
      state.selectedId = Number(rowElement.getAttribute("data-repair-row"));
      renderTable();
      renderEditor();
    });

    paginationTarget.querySelector("[data-page-prev]")?.addEventListener("click", async () => {
      state.page = Math.max(1, state.page - 1);
      await load();
    });
    paginationTarget.querySelector("[data-page-next]")?.addEventListener("click", async () => {
      const totalPages = Math.max(1, Math.ceil((state.meta?.total || 0) / (state.meta?.page_size || 20)));
      state.page = Math.min(totalPages, state.page + 1);
      await load();
    });
    renderEditor();
  };

  const load = async () => {
    setAlert(alertTarget, "");
    tableTarget.innerHTML = `<div class="admin-loading">Loading repair bookings...</div>`;
    const formData = new FormData(filterForm);
    const result = await callAdminApi("repairs_list", {
      filters: {
        page: state.page,
        page_size: 20,
        search: formData.get("search"),
        store_slug: formData.get("store_slug"),
        status: formData.get("status"),
      },
    }, session);
    state.rows = result.rows || [];
    state.meta = result;
    if (state.selectedId && !state.rows.some((row) => row.id === state.selectedId)) {
      state.selectedId = state.rows[0]?.id || null;
    }
    if (!state.selectedId && state.rows.length) {
      state.selectedId = state.rows[0].id;
    }
    renderTable();
  };

  filterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.page = 1;
    await load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Repair bookings could not be loaded.", "error"));
  });

  refreshButton?.addEventListener("click", () => {
    load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Repair bookings could not be refreshed.", "error"));
  });

  load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Repair bookings could not be loaded.", "error"));
}

function normalizeCustomerStatus(value) {
  const text = String(value || "").trim().toUpperCase();
  return text || "NOT_SET";
}

function renderCustomersPage(root, bootstrap, session, alertTarget) {
  root.innerHTML = getViewTemplate("customers");
  const filterForm = root.querySelector("[data-customers-filters]");
  const tableTarget = root.querySelector("[data-customers-table]");
  const editorTarget = root.querySelector("[data-customers-editor]");
  const paginationTarget = root.querySelector("[data-customers-pagination]");
  const refreshButton = root.querySelector("[data-customers-refresh]");
  const newButton = root.querySelector("[data-customers-new]");
  const canEdit = Boolean(bootstrap.capabilities?.can_edit_customers);

  if (!canEdit && newButton instanceof HTMLButtonElement) {
    newButton.disabled = true;
    newButton.title = "Only super admins can create customer records.";
  }

  const emptyCustomer = {
    id: null,
    first_name: "",
    last_name: "",
    full_name: "",
    email: "",
    phone_primary: "",
    phone_secondary: "",
    phone_other: "",
    company: "",
    business_name: "",
    abn_crn: "",
    labels: "",
    address_line_1: "",
    address_line_2: "",
    suburb: "",
    state: "QLD",
    postcode: "",
    country: "AU",
    email_subscriber_status: "NOT_SET",
    sms_subscriber_status: "NOT_SET",
    source: "Admin",
  };

  const state = {
    page: 1,
    selectedId: null,
    rows: [],
    meta: null,
    draft: null,
  };

  const renderEditor = () => {
    const row = state.draft || state.rows.find((item) => item.id === state.selectedId);
    if (!row) {
      editorTarget.innerHTML = `<p class="admin-note">Select a customer, or create a new one.</p>`;
      return;
    }

    const isNew = !row.id;
    editorTarget.innerHTML = `
      <form class="admin-editor__form" data-customer-editor-form>
        <div class="admin-editor__meta">
          <strong>${isNew ? "New customer" : escapeHtml(row.full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email || "Customer")}</strong><br>
          ${isNew ? "Create a contact record for orders, repairs and future marketing." : `Customer ID ${escapeHtml(row.id)} · Imported ${formatDateTime(row.imported_at)}`}
        </div>
        <div class="admin-editor__grid">
          <label><span>First name</span><input type="text" name="first_name" value="${escapeHtml(row.first_name || "")}" ${canEdit ? "" : "disabled"}></label>
          <label><span>Last name</span><input type="text" name="last_name" value="${escapeHtml(row.last_name || "")}" ${canEdit ? "" : "disabled"}></label>
          <label><span>Email</span><input type="email" name="email" value="${escapeHtml(row.email || "")}" ${canEdit ? "" : "disabled"}></label>
          <label><span>Primary phone</span><input type="tel" name="phone_primary" value="${escapeHtml(row.phone_primary || "")}" ${canEdit ? "" : "disabled"}></label>
          <label><span>Secondary phone</span><input type="tel" name="phone_secondary" value="${escapeHtml(row.phone_secondary || "")}" ${canEdit ? "" : "disabled"}></label>
          <label><span>Other phone</span><input type="tel" name="phone_other" value="${escapeHtml(row.phone_other || "")}" ${canEdit ? "" : "disabled"}></label>
          <label><span>Company</span><input type="text" name="company" value="${escapeHtml(row.company || "")}" ${canEdit ? "" : "disabled"}></label>
          <label><span>Business name</span><input type="text" name="business_name" value="${escapeHtml(row.business_name || "")}" ${canEdit ? "" : "disabled"}></label>
          <label><span>ABN / CRN</span><input type="text" name="abn_crn" value="${escapeHtml(row.abn_crn || "")}" ${canEdit ? "" : "disabled"}></label>
          <label><span>Labels</span><input type="text" name="labels" value="${escapeHtml(row.labels || "")}" ${canEdit ? "" : "disabled"} placeholder="VIP, repair customer, wholesale"></label>
        </div>
        <label><span>Address line 1</span><input type="text" name="address_line_1" value="${escapeHtml(row.address_line_1 || "")}" ${canEdit ? "" : "disabled"}></label>
        <label><span>Address line 2</span><input type="text" name="address_line_2" value="${escapeHtml(row.address_line_2 || "")}" ${canEdit ? "" : "disabled"}></label>
        <div class="admin-editor__grid">
          <label><span>Suburb</span><input type="text" name="suburb" value="${escapeHtml(row.suburb || "")}" ${canEdit ? "" : "disabled"}></label>
          <label><span>State</span>
            <select name="state" ${canEdit ? "" : "disabled"}>
              ${["", "QLD", "NSW", "VIC", "ACT", "SA", "WA", "TAS", "NT"].map((value) => `<option value="${value}" ${String(row.state || "") === value ? "selected" : ""}>${value || "Select state"}</option>`).join("")}
            </select>
          </label>
          <label><span>Postcode</span><input type="text" name="postcode" value="${escapeHtml(row.postcode || "")}" ${canEdit ? "" : "disabled"}></label>
          <label><span>Country</span><input type="text" name="country" value="${escapeHtml(row.country || "AU")}" ${canEdit ? "" : "disabled"}></label>
        </div>
        <div class="admin-editor__grid">
          <label><span>Email marketing</span>
            <select name="email_subscriber_status" ${canEdit ? "" : "disabled"}>
              ${["NOT_SET", "SUBSCRIBED", "UNSUBSCRIBED"].map((value) => `<option value="${value}" ${normalizeCustomerStatus(row.email_subscriber_status) === value ? "selected" : ""}>${value}</option>`).join("")}
            </select>
          </label>
          <label><span>SMS marketing</span>
            <select name="sms_subscriber_status" ${canEdit ? "" : "disabled"}>
              ${["NOT_SET", "SUBSCRIBED", "UNSUBSCRIBED"].map((value) => `<option value="${value}" ${normalizeCustomerStatus(row.sms_subscriber_status) === value ? "selected" : ""}>${value}</option>`).join("")}
            </select>
          </label>
          <label><span>Source</span><input type="text" name="source" value="${escapeHtml(row.source || "Admin")}" ${canEdit ? "" : "disabled"}></label>
        </div>
        <div class="admin-button-row">
          <button class="button button--primary" type="submit" ${canEdit ? "" : "disabled"}>${isNew ? "Create customer" : "Save customer"}</button>
          ${!isNew ? `<button class="button button--danger" type="button" data-customer-delete ${canEdit ? "" : "disabled"}>Delete</button>` : ""}
          ${isNew ? `<button class="button button--ghost" type="button" data-customer-cancel>Cancel</button>` : ""}
        </div>
      </form>
    `;

    editorTarget.querySelector("[data-customer-cancel]")?.addEventListener("click", () => {
      state.draft = null;
      renderEditor();
    });

    editorTarget.querySelector("[data-customer-delete]")?.addEventListener("click", async () => {
      if (!canEdit || !row.id) return;
      const confirmed = window.confirm(`Delete ${row.full_name || row.email || "this customer"}? This cannot be undone.`);
      if (!confirmed) return;
      try {
        await callAdminApi("customer_delete", { id: row.id }, session);
        setAlert(alertTarget, "Customer deleted.", "success");
        state.selectedId = null;
        state.draft = null;
        await load();
      } catch (error) {
        setAlert(alertTarget, error instanceof Error ? error.message : "Customer delete failed.", "error");
      }
    });

    editorTarget.querySelector("[data-customer-editor-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!canEdit) return;
      const formData = new FormData(event.currentTarget);
      const payload = Object.fromEntries(formData.entries());
      try {
        const result = await callAdminApi(isNew ? "customer_create" : "customer_update", {
          id: row.id,
          customer: payload,
        }, session);
        setAlert(alertTarget, isNew ? "Customer created." : "Customer updated.", "success");
        state.draft = null;
        state.selectedId = result.row?.id || row.id || null;
        await load();
      } catch (error) {
        setAlert(alertTarget, error instanceof Error ? error.message : "Customer save failed.", "error");
      }
    });
  };

  const renderTable = () => {
    if (!state.rows.length) {
      renderEmptyState(tableTarget, "No customers matched the current filters.");
      paginationTarget.innerHTML = "";
      if (!state.draft) editorTarget.innerHTML = `<p class="admin-note">No customer selected yet.</p>`;
      return;
    }

    tableTarget.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Phone</th>
            <th>Company</th>
            <th>Marketing</th>
            <th>Source</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          ${state.rows.map((row) => `
            <tr data-customer-row="${row.id}" class="${state.selectedId === row.id ? "is-selected" : ""}">
              <td>
                <div class="admin-cell-title">
                  <strong>${escapeHtml(row.full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Unnamed customer")}</strong>
                  <span>${escapeHtml(row.email || "No email")}</span>
                </div>
              </td>
              <td>${escapeHtml(row.phone_primary || row.phone_secondary || "No phone")}</td>
              <td>${escapeHtml(row.business_name || row.company || "—")}</td>
              <td>
                <div class="admin-mini-stack">
                  <span>Email: ${escapeHtml(normalizeCustomerStatus(row.email_subscriber_status))}</span>
                  <span>SMS: ${escapeHtml(normalizeCustomerStatus(row.sms_subscriber_status))}</span>
                </div>
              </td>
              <td>${escapeHtml(row.source || "—")}</td>
              <td>${formatDateTime(row.updated_at || row.imported_at)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    paginationTarget.innerHTML = renderPagination(state.meta || {});
    buildRowClickHandler(tableTarget, "[data-customer-row]", (rowElement) => {
      state.draft = null;
      state.selectedId = Number(rowElement.getAttribute("data-customer-row"));
      renderTable();
      renderEditor();
    });

    paginationTarget.querySelector("[data-page-prev]")?.addEventListener("click", async () => {
      state.page = Math.max(1, state.page - 1);
      await load();
    });
    paginationTarget.querySelector("[data-page-next]")?.addEventListener("click", async () => {
      const totalPages = Math.max(1, Math.ceil((state.meta?.total || 0) / (state.meta?.page_size || 25)));
      state.page = Math.min(totalPages, state.page + 1);
      await load();
    });
    renderEditor();
  };

  const load = async () => {
    setAlert(alertTarget, "");
    tableTarget.innerHTML = `<div class="admin-loading">Loading customers...</div>`;
    const formData = new FormData(filterForm);
    const result = await callAdminApi("customers_list", {
      filters: {
        page: state.page,
        page_size: 25,
        search: formData.get("search"),
        email_status: formData.get("email_status"),
        sms_status: formData.get("sms_status"),
      },
    }, session);
    state.rows = result.rows || [];
    state.meta = result;
    if (state.selectedId && !state.rows.some((row) => row.id === state.selectedId)) {
      state.selectedId = state.rows[0]?.id || null;
    }
    if (!state.selectedId && state.rows.length && !state.draft) {
      state.selectedId = state.rows[0].id;
    }
    renderTable();
  };

  filterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.page = 1;
    await load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Customers could not be loaded.", "error"));
  });

  refreshButton?.addEventListener("click", () => {
    load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Customers could not be refreshed.", "error"));
  });

  newButton?.addEventListener("click", () => {
    state.selectedId = null;
    state.draft = { ...emptyCustomer };
    renderTable();
    renderEditor();
  });

  load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Customers could not be loaded.", "error"));
}

function renderProductsPage(root, bootstrap, session, alertTarget) {
  root.innerHTML = getViewTemplate("products");
  const filterForm = root.querySelector("[data-products-filters]");
  const tableTarget = root.querySelector("[data-products-table]");
  const editorTarget = root.querySelector("[data-products-editor]");
  const paginationTarget = root.querySelector("[data-products-pagination]");
  const categoryFilter = root.querySelector("[data-products-category-filter]");
  const refreshButton = root.querySelector("[data-products-refresh]");

  fillCategoryOptions(categoryFilter, bootstrap.categories || []);

  const state = { page: 1, selectedId: null, rows: [], meta: null, canEdit: false, saveFlash: null, detailRequests: new Map() };

  const hasEmbeddedProductDetail = (row) => (
    Object.prototype.hasOwnProperty.call(row || {}, "detail_html") ||
    Array.isArray(row?.images) ||
    Array.isArray(row?.product_images)
  );

  const mergeProductRow = (row) => {
    if (!row?.id) return null;
    const rowIndex = state.rows.findIndex((item) => Number(item.id) === Number(row.id));
    const nextRow = {
      ...(rowIndex >= 0 ? state.rows[rowIndex] : {}),
      ...row,
      detail_loaded: Boolean(row.detail_loaded || hasEmbeddedProductDetail(row)),
    };
    if (rowIndex >= 0) {
      state.rows[rowIndex] = nextRow;
    } else {
      state.rows.unshift(nextRow);
    }
    return nextRow;
  };

  const loadProductDetail = async (productId) => {
    const id = Number(productId);
    if (!Number.isFinite(id)) return null;
    const existing = state.rows.find((item) => Number(item.id) === id);
    if (existing?.detail_loaded) return existing;
    if (!state.detailRequests.has(id)) {
      const request = callAdminApi("product_detail", { id }, session)
        .then((result) => mergeProductRow(result.row))
        .finally(() => state.detailRequests.delete(id));
      state.detailRequests.set(id, request);
    }
    return state.detailRequests.get(id);
  };

  const renderEditor = () => {
    const row = state.rows.find((item) => item.id === state.selectedId);
    if (!row) {
      editorTarget.innerHTML = `<p class="admin-note">No product selected yet.</p>`;
      return;
    }

    const detailBlocks = buildDetailBlocksState(row);

    editorTarget.innerHTML = `
      <div class="admin-editor">
        <img class="admin-inline-image" src="${escapeHtml(getImageOrPlaceholder(row.image_url))}" alt="${escapeHtml(row.name)}">
        <div class="admin-editor__meta">
          <strong>${escapeHtml(row.name)}</strong><br>
          ${escapeHtml(row.sku)} · ${escapeHtml(row.slug)}
        </div>
        <form class="admin-editor__form" data-product-editor-form>
          <div class="admin-editor__grid">
            <label><span>Name</span><input type="text" name="name" value="${escapeHtml(row.name || "")}" ${state.canEdit ? "" : "disabled"}></label>
            <label><span>Brand</span><input type="text" name="brand" value="${escapeHtml(row.brand || "")}" ${state.canEdit ? "" : "disabled"}></label>
            <label><span>Model</span><input type="text" name="model" value="${escapeHtml(row.model || "")}" ${state.canEdit ? "" : "disabled"}></label>
            <label><span>Category</span>
              <select name="category_id" ${state.canEdit ? "" : "disabled"}>
                <option value="">Unassigned</option>
                ${(bootstrap.categories || []).map((category) => `<option value="${category.id}" ${Number(row.category_id) === Number(category.id) ? "selected" : ""}>${escapeHtml(category.name)}</option>`).join("")}
              </select>
            </label>
            <label><span>Retail price</span><input type="number" step="0.01" name="retail_price" value="${escapeHtml(row.retail_price ?? "")}" ${state.canEdit ? "" : "disabled"}></label>
            <label><span>Compare at price</span><input type="number" step="0.01" name="compare_at_price" value="${escapeHtml(row.compare_at_price ?? "")}" ${state.canEdit ? "" : "disabled"}></label>
            <label><span>Cost price</span><input type="number" step="0.01" name="cost_price" value="${escapeHtml(row.cost_price ?? "")}" ${state.canEdit ? "" : "disabled"}></label>
            <label><span>Total stock</span><input type="number" step="1" name="stock_quantity" value="${escapeHtml(row.stock_quantity ?? "")}" ${state.canEdit ? "" : "disabled"}></label>
            <label><span>Visible</span>
              <select name="is_visible" ${state.canEdit ? "" : "disabled"}>
                <option value="true" ${row.is_visible ? "selected" : ""}>Visible</option>
                <option value="false" ${!row.is_visible ? "selected" : ""}>Hidden</option>
              </select>
            </label>
            <label><span>Featured</span>
              <select name="is_featured" ${state.canEdit ? "" : "disabled"}>
                <option value="false" ${!row.is_featured ? "selected" : ""}>No</option>
                <option value="true" ${row.is_featured ? "selected" : ""}>Yes</option>
              </select>
            </label>
          </div>
          <label><span>Hero image URL</span><input type="url" name="image_url" value="${escapeHtml(row.image_url || "")}" ${state.canEdit ? "" : "disabled"}></label>
          <label><span>Short description</span><textarea name="short_description" ${state.canEdit ? "" : "disabled"}>${escapeHtml(row.short_description || "")}</textarea></label>
          <label><span>Compatibility</span><textarea name="compatibility" ${state.canEdit ? "" : "disabled"}>${escapeHtml(row.compatibility || "")}</textarea></label>
          <div class="admin-detail-builder">
            <div class="admin-detail-builder__header">
              <div>
                <strong>Detail page builder</strong>
                <p>Use structured blocks for the product detail page. This generates the HTML shown on the storefront.</p>
              </div>
            </div>
            <div class="admin-detail-builder__grid">
              <label><span>Overview title</span><input type="text" data-detail-block-input="overview_title" value="${escapeHtml(detailBlocks.overview_title || "")}" ${state.canEdit ? "" : "disabled"}></label>
              <label class="admin-detail-builder__full"><span>Overview text</span><textarea data-detail-block-input="overview_text" ${state.canEdit ? "" : "disabled"}>${escapeHtml(detailBlocks.overview_text || "")}</textarea></label>
              <label><span>Key details title</span><input type="text" data-detail-block-input="details_title" value="${escapeHtml(detailBlocks.details_title || "")}" ${state.canEdit ? "" : "disabled"}></label>
              <label><span>Feature image URL</span><input type="url" data-detail-block-input="image_url" value="${escapeHtml(detailBlocks.image_url || "")}" ${state.canEdit ? "" : "disabled"}></label>
              <label><span>Feature image alt</span><input type="text" data-detail-block-input="image_alt" value="${escapeHtml(detailBlocks.image_alt || "")}" ${state.canEdit ? "" : "disabled"}></label>
              <label class="admin-detail-builder__full"><span>Bullet points</span><textarea data-detail-block-input="bullets" placeholder="One point per line" ${state.canEdit ? "" : "disabled"}>${escapeHtml(detailBlocks.bullets || "")}</textarea></label>
              <label class="admin-detail-builder__full"><span>Comparison / spec table</span><textarea data-detail-block-input="specs" placeholder="Label|Value&#10;Charging|USB-C PD" ${state.canEdit ? "" : "disabled"}>${escapeHtml(detailBlocks.specs || "")}</textarea></label>
              <label class="admin-detail-builder__full"><span>Additional custom HTML</span><textarea class="admin-editor__detail-html" data-detail-block-input="extra_html" ${state.canEdit ? "" : "disabled"}>${escapeHtml(detailBlocks.extra_html || "")}</textarea></label>
            </div>
            <input type="hidden" name="detail_html" value="${escapeHtml(buildDetailHtmlFromBlocks(detailBlocks))}">
            <div class="admin-detail-preview">
              <div class="admin-detail-preview__label">Preview</div>
              <div class="storefront-rich-content" data-detail-preview>${renderDetailBlocksPreview(detailBlocks)}</div>
            </div>
          </div>
          ${state.canEdit ? `<div class="admin-button-row"><button class="button button--primary" type="submit">Save product</button></div>` : `<p class="admin-note">This account can view catalog data but only super admins can change it.</p>`}
        </form>
      </div>
    `;

    const formElement = editorTarget.querySelector("[data-product-editor-form]");
    const hiddenDetailInput = editorTarget.querySelector('input[name="detail_html"]');
    const detailPreview = editorTarget.querySelector("[data-detail-preview]");
    const blockInputs = editorTarget.querySelectorAll("[data-detail-block-input]");

    const syncDetailBuilder = () => {
      const nextBlocks = {};
      blockInputs.forEach((input) => {
        const key = input.getAttribute("data-detail-block-input");
        if (!key) return;
        nextBlocks[key] = input.value;
      });
      const nextHtml = buildDetailHtmlFromBlocks(nextBlocks);
      if (hiddenDetailInput instanceof HTMLInputElement) {
        hiddenDetailInput.value = nextHtml;
      }
      if (detailPreview instanceof HTMLElement) {
        detailPreview.innerHTML = renderDetailBlocksPreview(nextBlocks);
      }
    };

    blockInputs.forEach((input) => {
      input.addEventListener("input", syncDetailBuilder);
      input.addEventListener("change", syncDetailBuilder);
    });

    formElement?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      try {
        await callAdminApi("product_update", {
          id: row.id,
          name: formData.get("name"),
          brand: formData.get("brand"),
          model: formData.get("model"),
          category_id: formData.get("category_id"),
          retail_price: formData.get("retail_price"),
          compare_at_price: formData.get("compare_at_price"),
          cost_price: formData.get("cost_price"),
          stock_quantity: formData.get("stock_quantity"),
          is_visible: formData.get("is_visible") === "true",
          is_featured: formData.get("is_featured") === "true",
          image_url: formData.get("image_url"),
          short_description: formData.get("short_description"),
          compatibility: formData.get("compatibility"),
          detail_html: formData.get("detail_html"),
        }, session);
        setAlert(alertTarget, "Product updated.", "success");
        await load();
      } catch (error) {
        setAlert(alertTarget, error instanceof Error ? error.message : "Product could not be updated.", "error");
      }
    });
  };

  const renderTable = () => {
    if (!state.rows.length) {
      renderEmptyState(tableTarget, "No products matched the current filters.");
      paginationTarget.innerHTML = "";
      editorTarget.innerHTML = `<p class="admin-note">No product selected yet.</p>`;
      return;
    }

    tableTarget.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Brand</th>
            <th>Retail</th>
            <th>Cost</th>
            <th>Stock</th>
            <th>Visibility</th>
          </tr>
        </thead>
        <tbody>
          ${state.rows.map((row) => `
            <tr data-product-row="${row.id}" class="${state.selectedId === row.id ? "is-selected" : ""}">
              <td>
                <div class="admin-list-item__content">
                  <strong>${escapeHtml(row.name)}</strong>
                  <span>${escapeHtml(row.sku)} · ${escapeHtml(row.slug)}</span>
                </div>
              </td>
              <td>${escapeHtml(row.brand || "—")}</td>
              <td>${formatMoney(row.retail_price)}</td>
              <td>${formatMoney(row.cost_price)}</td>
              <td>${escapeHtml(row.stock_quantity)}</td>
              <td>${renderBadge(row.is_visible ? "visible" : "hidden")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    paginationTarget.innerHTML = renderPagination(state.meta || {});
    buildRowClickHandler(tableTarget, "[data-product-row]", (rowElement) => {
      state.selectedId = Number(rowElement.getAttribute("data-product-row"));
      renderTable();
      renderEditor();
    });
    paginationTarget.querySelector("[data-page-prev]")?.addEventListener("click", async () => {
      state.page = Math.max(1, state.page - 1);
      await load();
    });
    paginationTarget.querySelector("[data-page-next]")?.addEventListener("click", async () => {
      const totalPages = Math.max(1, Math.ceil((state.meta?.total || 0) / (state.meta?.page_size || 20)));
      state.page = Math.min(totalPages, state.page + 1);
      await load();
    });
    renderEditor();
  };

  const load = async () => {
    setAlert(alertTarget, "");
    tableTarget.innerHTML = `<div class="admin-loading">Loading products...</div>`;
    const formData = new FormData(filterForm);
    const result = await callAdminApi("products_list", {
      filters: {
        page: state.page,
        page_size: 20,
        search: formData.get("search"),
        category_id: formData.get("category_id"),
        visibility: formData.get("visibility"),
      },
    }, session);
    state.rows = (result.rows || []).map((row) => ({
      ...row,
      detail_loaded: Boolean(row?.detail_loaded || hasEmbeddedProductDetail(row)),
    }));
    state.meta = result;
    state.canEdit = Boolean(result.can_edit);
    if (state.selectedId && !state.rows.some((row) => row.id === state.selectedId)) {
      state.selectedId = state.rows[0]?.id || null;
    }
    if (!state.selectedId && state.rows.length) {
      state.selectedId = state.rows[0].id;
    }
    renderTable();
  };

  filterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.page = 1;
    await load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Products could not be loaded.", "error"));
  });

  refreshButton?.addEventListener("click", () => {
    load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Products could not be refreshed.", "error"));
  });

  load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Products could not be loaded.", "error"));
}

function renderProductsPageV2(root, bootstrap, session, alertTarget) {
  root.innerHTML = getViewTemplate("products");
  const filterForm = root.querySelector("[data-products-filters]");
  const tableTarget = root.querySelector("[data-products-table]");
  const editorTarget = root.querySelector("[data-products-editor]");
  const paginationTarget = root.querySelector("[data-products-pagination]");
  const categoryFilter = root.querySelector("[data-products-category-filter]");
  const refreshButton = root.querySelector("[data-products-refresh]");
  const newButton = root.querySelector("[data-products-new]");
  const categoryNewButton = root.querySelector("[data-products-category-new]");
  const categoryEditButton = root.querySelector("[data-products-category-edit]");
  const importButton = root.querySelector("[data-products-import]");

  fillCategoryOptions(categoryFilter, bootstrap.categories || []);

  const state = { page: 1, selectedId: null, rows: [], meta: null, canEdit: false, saveFlash: null, detailRequests: new Map() };

  const hasEmbeddedProductDetail = (row) => (
    Object.prototype.hasOwnProperty.call(row || {}, "detail_html") ||
    Array.isArray(row?.images) ||
    Array.isArray(row?.product_images)
  );

  const mergeProductRow = (row) => {
    if (!row?.id) return null;
    const rowIndex = state.rows.findIndex((item) => Number(item.id) === Number(row.id));
    const nextRow = {
      ...(rowIndex >= 0 ? state.rows[rowIndex] : {}),
      ...row,
      detail_loaded: Boolean(row.detail_loaded || hasEmbeddedProductDetail(row)),
    };
    if (rowIndex >= 0) {
      state.rows[rowIndex] = nextRow;
    } else {
      state.rows.unshift(nextRow);
    }
    return nextRow;
  };

  const loadProductDetail = async (productId) => {
    const id = Number(productId);
    if (!Number.isFinite(id)) return null;
    const existing = state.rows.find((item) => Number(item.id) === id);
    if (existing?.detail_loaded) return existing;
    if (!state.detailRequests.has(id)) {
      const request = callAdminApi("product_detail", { id }, session)
        .then((result) => mergeProductRow(result.row))
        .finally(() => state.detailRequests.delete(id));
      state.detailRequests.set(id, request);
    }
    return state.detailRequests.get(id);
  };

  const syncCategoryCollections = (categories, selectedCategoryId = "") => {
    bootstrap.categories = Array.isArray(categories)
      ? [...categories].sort((left, right) => String(left?.name || "").localeCompare(String(right?.name || "")))
      : [];
    const currentFilterValue = categoryFilter instanceof HTMLSelectElement ? categoryFilter.value : "";
    fillCategoryOptions(categoryFilter, bootstrap.categories || []);
    if (categoryFilter instanceof HTMLSelectElement) {
      const desiredFilterValue = String(currentFilterValue || "").trim();
      if (desiredFilterValue && [...categoryFilter.options].some((option) => option.value === desiredFilterValue)) {
        categoryFilter.value = desiredFilterValue;
      }
    }
    if (selectedCategoryId && state.selectedId) {
      const selectedRow = state.rows.find((item) => Number(item.id) === Number(state.selectedId));
      if (selectedRow) {
        selectedRow.category_id = selectedCategoryId;
      }
    }
  };

  const renderEditor = () => {
    const row = state.rows.find((item) => Number(item.id) === Number(state.selectedId));
    if (!row) {
      editorTarget.innerHTML = `<p class="admin-note">Select a product from the list to edit images, content, pricing and visibility.</p>`;
      return;
    }

    if (!row.detail_loaded) {
      editorTarget.innerHTML = `<div class="admin-loading">Loading product details...</div>`;
      loadProductDetail(row.id)
        .then(() => {
          if (Number(state.selectedId) === Number(row.id)) {
            renderEditor();
          }
        })
        .catch((error) => {
          setAlert(alertTarget, error instanceof Error ? error.message : "Product details could not be loaded.", "error");
          editorTarget.innerHTML = `<p class="admin-note">Product details could not be loaded. Try Refresh.</p>`;
        });
      return;
    }

    const descriptionHtml = getEditableProductDescriptionHtml(row);
    const gallery = normalizeProductGallery(row);
    const heroImage = gallery.find((image) => image.image_url)?.image_url || row.image_url || "";
    const storefrontUrl = `../product.html?slug=${encodeURIComponent(row.slug || "")}`;

    editorTarget.innerHTML = `
      <div class="admin-editor admin-product-editor">
        <div class="admin-product-hero">
          <img src="${escapeHtml(getImageOrPlaceholder(heroImage))}" alt="${escapeHtml(row.name)}" data-product-hero-preview>
          <div>
            <span class="admin-kicker">Editing product</span>
            <h3>${escapeHtml(row.name || "Untitled product")}</h3>
            <p>${escapeHtml(row.sku || "No SKU")} / ${escapeHtml(row.slug || "No slug")}</p>
            <div class="admin-button-row">
              <a class="button button--ghost" href="${escapeHtml(storefrontUrl)}" target="_blank" rel="noreferrer">View product page</a>
              ${state.canEdit ? `<button class="button button--ghost" type="button" data-product-clone>Clone product</button>` : ""}
              ${state.canEdit ? `<button class="button button--danger" type="button" data-product-delete>Delete product</button>` : ""}
              ${state.canEdit ? `<button class="button button--primary" type="submit" form="admin-product-editor-form">Save product</button>` : ""}
            </div>
          </div>
        </div>

        <form class="admin-editor__form" id="admin-product-editor-form" data-product-editor-form>
          ${renderProductGalleryEditor(row, state.canEdit)}

          <section class="admin-editor-section">
            <div class="admin-editor-section__heading">
              <div>
                <h3>Product info</h3>
                <p>Core storefront fields and category placement.</p>
              </div>
            </div>
            <div class="admin-editor__grid">
              <label><span>Name</span><input type="text" name="name" value="${escapeHtml(row.name || "")}" ${state.canEdit ? "" : "disabled"}></label>
              <label><span>Brand</span><input type="text" name="brand" value="${escapeHtml(row.brand || "")}" ${state.canEdit ? "" : "disabled"}></label>
              <label><span>Model</span><input type="text" name="model" value="${escapeHtml(row.model || "")}" ${state.canEdit ? "" : "disabled"}></label>
              <div class="admin-editor__field-group">
                <label><span>Category</span>
                  <select name="category_id" data-product-category-select ${state.canEdit ? "" : "disabled"}>
                    ${renderCategorySelectOptions(bootstrap.categories || [], row.category_id)}
                  </select>
                </label>
                ${state.canEdit ? `
                  <div class="admin-button-row">
                    <button class="button button--ghost button--small" type="button" data-product-category-add>Add category</button>
                    <button class="button button--ghost button--small" type="button" data-product-category-edit>Edit category</button>
                  </div>
                ` : ""}
              </div>
              <label class="admin-editor__wide"><span>Short description</span><textarea name="short_description" ${state.canEdit ? "" : "disabled"}>${escapeHtml(row.short_description || "")}</textarea></label>
            </div>
          </section>

          <section class="admin-editor-section">
            <div class="admin-editor-section__heading">
              <div>
                <h3>Description</h3>
                <p>Edit the product page content directly. Use the image button to upload images into the description.</p>
              </div>
            </div>
            <input type="hidden" name="detail_html" data-description-html value="${escapeHtml(descriptionHtml)}">
            <div class="admin-quill-editor" data-description-quill></div>
          </section>

          <section class="admin-editor-section">
            <div class="admin-editor-section__heading">
              <div>
                <h3>Pricing and inventory</h3>
                <p>Retail, compare price, cost and total stock are kept POS-ready.</p>
              </div>
            </div>
            <div class="admin-editor__grid admin-editor__grid--four">
              <label><span>Retail price</span><input type="number" step="0.01" name="retail_price" value="${escapeHtml(row.retail_price ?? "")}" ${state.canEdit ? "" : "disabled"}></label>
              <label><span>Compare at price</span><input type="number" step="0.01" name="compare_at_price" value="${escapeHtml(row.compare_at_price ?? "")}" ${state.canEdit ? "" : "disabled"}></label>
              <label><span>Cost price</span><input type="number" step="0.01" name="cost_price" value="${escapeHtml(row.cost_price ?? "")}" ${state.canEdit ? "" : "disabled"}></label>
              <label><span>Total stock</span><input type="number" step="1" name="stock_quantity" value="${escapeHtml(row.stock_quantity ?? "")}" ${state.canEdit ? "" : "disabled"}></label>
            </div>
          </section>

          <section class="admin-editor-section">
            <div class="admin-editor-section__heading">
              <div>
                <h3>Publishing</h3>
                <p>Control online visibility and featured product placement.</p>
              </div>
            </div>
            <div class="admin-editor__grid">
              <label><span>Online visibility</span>
                <select name="is_visible" ${state.canEdit ? "" : "disabled"}>
                  <option value="true" ${row.is_visible ? "selected" : ""}>Show in online store</option>
                  <option value="false" ${!row.is_visible ? "selected" : ""}>Hide from online store</option>
                </select>
              </label>
              <label><span>Featured product</span>
                <select name="is_featured" ${state.canEdit ? "" : "disabled"}>
                  <option value="false" ${!row.is_featured ? "selected" : ""}>No</option>
                  <option value="true" ${row.is_featured ? "selected" : ""}>Yes</option>
                </select>
              </label>
            </div>
          </section>

          ${state.canEdit ? `
            <div class="admin-button-row admin-save-row">
              <span class="admin-save-status" data-product-save-status hidden></span>
              <button class="button button--primary" type="submit" data-product-save-button>Save product</button>
            </div>
          ` : `<p class="admin-note">This account can view catalog data but only super admins can change it.</p>`}
        </form>
      </div>
    `;

    const formElement = editorTarget.querySelector("[data-product-editor-form]");
    const cloneButton = editorTarget.querySelector("[data-product-clone]");
    const deleteButton = editorTarget.querySelector("[data-product-delete]");
    const categoryAddButton = editorTarget.querySelector("[data-product-category-add]");
    const categoryEditButton = editorTarget.querySelector("[data-product-category-edit]");
    const categorySelect = editorTarget.querySelector("[data-product-category-select]");
    const descriptionInput = editorTarget.querySelector("[data-description-html]");
    const descriptionEditor = editorTarget.querySelector("[data-description-quill]");
    const galleryList = editorTarget.querySelector("[data-product-gallery-list]");
    const heroPreview = editorTarget.querySelector("[data-product-hero-preview]");
    const saveButton = editorTarget.querySelector("[data-product-save-button]");
    const saveStatus = editorTarget.querySelector("[data-product-save-status]");
    if (state.saveFlash && Number(state.saveFlash.productId) === Number(row.id)) {
      setInlineStatus(saveStatus, state.saveFlash.message, state.saveFlash.tone);
    }
    let descriptionControllerPromise = null;
    if (descriptionInput instanceof HTMLInputElement && descriptionEditor instanceof HTMLElement) {
      descriptionControllerPromise = setupProductDescriptionQuill({
        editorElement: descriptionEditor,
        hiddenInput: descriptionInput,
        row,
        session,
        canEdit: state.canEdit,
        alertTarget,
      }).catch((error) => {
        setAlert(alertTarget, error instanceof Error ? error.message : "Description editor could not be loaded.", "error");
        return null;
      });
    }

    cloneButton?.addEventListener("click", async () => {
      try {
        const result = await callAdminApi("product_clone", { id: row.id }, session);
        state.selectedId = Number(result.row?.id || 0) || state.selectedId;
        state.saveFlash = { productId: state.selectedId, message: "Product cloned.", tone: "success" };
        setAlert(alertTarget, "Product cloned successfully.", "success");
        await load();
      } catch (error) {
        setAlert(alertTarget, error instanceof Error ? error.message : "Product clone failed.", "error");
      }
    });

    deleteButton?.addEventListener("click", async () => {
      const confirmed = window.confirm(`Delete ${row.name || "this product"}? This cannot be undone.`);
      if (!confirmed) return;
      try {
        await callAdminApi("product_delete", { id: row.id }, session);
        state.selectedId = null;
        state.draft = null;
        state.saveFlash = null;
        setAlert(alertTarget, "Product deleted.", "success");
        await load();
      } catch (error) {
        setAlert(alertTarget, error instanceof Error ? error.message : "Product delete failed.", "error");
      }
    });

    categoryAddButton?.addEventListener("click", () => {
      openCreateCategoryModal({
        bootstrap,
        session,
        alertTarget,
        onCreated: (category, categories) => {
          syncCategoryCollections(categories, category?.id ?? "");
          if (categorySelect instanceof HTMLSelectElement) {
            categorySelect.innerHTML = renderCategorySelectOptions(bootstrap.categories || [], category?.id ?? "");
            categorySelect.value = String(category?.id ?? "");
          }
          renderEditor();
        },
      });
    });

    categoryEditButton?.addEventListener("click", () => {
      const selectedCategory = (bootstrap.categories || []).find(
        (item) => String(item.id ?? "") === String(categorySelect?.value ?? ""),
      );
      openEditCategoryModal({
        bootstrap,
        session,
        alertTarget,
        category: selectedCategory,
        onUpdated: (category, categories) => {
          syncCategoryCollections(categories, category?.id ?? "");
          if (categorySelect instanceof HTMLSelectElement) {
            categorySelect.innerHTML = renderCategorySelectOptions(bootstrap.categories || [], category?.id ?? "");
            categorySelect.value = String(category?.id ?? "");
          }
          renderEditor();
        },
        onDeleted: (_category, categories) => {
          syncCategoryCollections(categories, "");
          if (categorySelect instanceof HTMLSelectElement) {
            categorySelect.innerHTML = renderCategorySelectOptions(bootstrap.categories || [], "");
            categorySelect.value = "";
          }
          row.category_id = "";
          renderEditor();
        },
      });
    });

    const syncGalleryPreview = () => {
      refreshProductGalleryRows(galleryList);
      const firstImage = collectProductGallery(editorTarget)[0]?.image_url || "";
      if (heroPreview instanceof HTMLImageElement) {
        heroPreview.src = getImageOrPlaceholder(firstImage);
      }
    };

    galleryList?.addEventListener("input", syncGalleryPreview);
    galleryList?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const actionButton = target.closest("[data-gallery-action]");
      if (!(actionButton instanceof HTMLElement)) return;
      const action = actionButton.getAttribute("data-gallery-action");
      const rowElement = actionButton.closest("[data-product-gallery-row]");
      if (!(rowElement instanceof HTMLElement) || !(galleryList instanceof HTMLElement)) return;

      if (action === "remove") {
        rowElement.remove();
      }
      if (action === "edit") {
        const replaceInput = rowElement.querySelector("[data-gallery-replace-input]");
        if (replaceInput instanceof HTMLInputElement) {
          replaceInput.click();
        }
      }
      syncGalleryPreview();
    });

    galleryList?.addEventListener("change", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.matches("[data-gallery-replace-input]")) return;
      const file = target.files?.[0];
      const rowElement = target.closest("[data-product-gallery-row]");
      if (!file || !(rowElement instanceof HTMLElement)) return;
      const urlInput = rowElement.querySelector("[data-gallery-url]");
      const altInput = rowElement.querySelector("[data-gallery-alt]");
      const preview = rowElement.querySelector("[data-gallery-preview]");
      try {
        setAlert(alertTarget, "Uploading replacement image...", "info");
        const imageUrl = await uploadProductDetailImage(file, row, session);
        if (urlInput instanceof HTMLInputElement) urlInput.value = imageUrl;
        if (altInput instanceof HTMLInputElement && !altInput.value.trim()) altInput.value = row.name || file.name;
        if (preview instanceof HTMLImageElement) preview.src = getImageOrPlaceholder(imageUrl);
        syncGalleryPreview();
        setAlert(alertTarget, "Product image replaced. Click Save product to publish the gallery.", "success");
      } catch (error) {
        setAlert(alertTarget, error instanceof Error ? error.message : "Replacement image upload failed.", "error");
      } finally {
        target.value = "";
      }
    });

    setupProductGalleryDrag(galleryList, syncGalleryPreview);

    const uploadDropzone = editorTarget.querySelector("[data-gallery-upload-dropzone]");
    const uploadInput = editorTarget.querySelector("[data-gallery-upload-input]");
    uploadInput?.addEventListener("change", () => {
      uploadProductGalleryFiles(uploadInput.files, {
        galleryList,
        row,
        session,
        canEdit: state.canEdit,
        alertTarget,
        onChange: syncGalleryPreview,
      });
    });
    if (uploadDropzone instanceof HTMLElement) {
      ["dragenter", "dragover"].forEach((type) => {
        uploadDropzone.addEventListener(type, (event) => {
          event.preventDefault();
          uploadDropzone.classList.add("is-drag-over");
        });
      });
      ["dragleave", "dragend"].forEach((type) => {
        uploadDropzone.addEventListener(type, () => uploadDropzone.classList.remove("is-drag-over"));
      });
      uploadDropzone.addEventListener("drop", (event) => {
        event.preventDefault();
        uploadDropzone.classList.remove("is-drag-over");
        uploadProductGalleryFiles(event.dataTransfer?.files, {
          galleryList,
          row,
          session,
          canEdit: state.canEdit,
          alertTarget,
          onChange: syncGalleryPreview,
        });
      });
    }

    formElement?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      const images = collectProductGallery(editorTarget);
      if (saveButton instanceof HTMLButtonElement) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
      }
      setInlineStatus(saveStatus, "Saving product changes...", "info");
      setAlert(alertTarget, "");
      state.saveFlash = null;
      try {
        const descriptionController = descriptionControllerPromise ? await descriptionControllerPromise : null;
        const result = await callAdminApi("product_update", {
          id: row.id,
          name: formData.get("name"),
          brand: formData.get("brand"),
          model: formData.get("model"),
          category_id: formData.get("category_id"),
          retail_price: formData.get("retail_price"),
          compare_at_price: formData.get("compare_at_price"),
          cost_price: formData.get("cost_price"),
          stock_quantity: formData.get("stock_quantity"),
          is_visible: formData.get("is_visible") === "true",
          is_featured: formData.get("is_featured") === "true",
          image_url: images[0]?.image_url || row.image_url || "",
          images,
          short_description: formData.get("short_description"),
          compatibility: "",
          detail_html: descriptionController?.getHtml() ?? formData.get("detail_html"),
        }, session);
        const updatedRow = mergeProductRow({
          ...row,
          ...(result.row || {}),
          images: Array.isArray(result.row?.images) ? result.row.images : images,
          detail_html: result.row?.detail_html ?? descriptionController?.getHtml() ?? formData.get("detail_html"),
          detail_loaded: true,
        });
        state.selectedId = Number(updatedRow?.id || row.id);
        state.saveFlash = {
          productId: state.selectedId,
          message: result.warning || "Saved successfully.",
          tone: result.warning ? "warning" : "success",
        };
        setInlineStatus(saveStatus, state.saveFlash.message, state.saveFlash.tone);
        setAlert(alertTarget, result.warning || "Product saved successfully.", result.warning ? "warning" : "success");
        renderTable();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Product could not be updated.";
        setInlineStatus(saveStatus, `Save failed: ${message}`, "error");
        setAlert(alertTarget, `Save failed: ${message}`, "error");
      } finally {
        if (saveButton instanceof HTMLButtonElement) {
          saveButton.disabled = false;
          saveButton.textContent = "Save product";
        }
      }
    });
  };

  const renderTable = () => {
    if (!state.rows.length) {
      renderEmptyState(tableTarget, "No products matched the current filters.");
      paginationTarget.innerHTML = "";
      renderEditor();
      return;
    }

    tableTarget.innerHTML = `
      <div class="admin-product-list">
        ${state.rows.map((row) => `
          <button class="admin-product-list__item ${Number(state.selectedId) === Number(row.id) ? "is-selected" : ""}" type="button" data-product-row="${row.id}">
            <img src="${escapeHtml(getImageOrPlaceholder(row.image_url))}" alt="${escapeHtml(row.name || "")}">
            <span>
              <strong>${escapeHtml(row.name || "Untitled product")}</strong>
              <small>${escapeHtml(row.sku || "No SKU")} / ${escapeHtml(row.brand || "No brand")}</small>
              <small>${formatMoney(row.retail_price)} / Stock ${escapeHtml(row.stock_quantity ?? 0)}</small>
            </span>
            ${renderBadge(row.is_visible ? "visible" : "hidden")}
          </button>
        `).join("")}
      </div>
    `;

    paginationTarget.innerHTML = renderPagination(state.meta || {});
    tableTarget.querySelectorAll("[data-product-row]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedId = Number(button.getAttribute("data-product-row"));
        renderTable();
        renderEditor();
      });
    });
    paginationTarget.querySelector("[data-page-prev]")?.addEventListener("click", async () => {
      state.page = Math.max(1, state.page - 1);
      await load();
    });
    paginationTarget.querySelector("[data-page-next]")?.addEventListener("click", async () => {
      const totalPages = Math.max(1, Math.ceil((state.meta?.total || 0) / (state.meta?.page_size || 20)));
      state.page = Math.min(totalPages, state.page + 1);
      await load();
    });
    renderEditor();
  };

  const load = async () => {
    setAlert(alertTarget, "");
    tableTarget.innerHTML = `<div class="admin-loading">Loading products...</div>`;
    const formData = new FormData(filterForm);
    const result = await callAdminApi("products_list", {
      filters: {
        page: state.page,
        page_size: 20,
        search: formData.get("search"),
        category_id: formData.get("category_id"),
        visibility: formData.get("visibility"),
      },
    }, session);
    state.rows = (result.rows || []).map((row) => ({
      ...row,
      detail_loaded: Boolean(row?.detail_loaded || hasEmbeddedProductDetail(row)),
    }));
    state.meta = result;
    state.canEdit = Boolean(result.can_edit);
    if (state.selectedId && !state.rows.some((row) => Number(row.id) === Number(state.selectedId))) {
      state.selectedId = state.rows[0]?.id || null;
    }
    if (!state.selectedId && state.rows.length) {
      state.selectedId = state.rows[0].id;
    }
    renderTable();
  };

  filterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.page = 1;
    await load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Products could not be loaded.", "error"));
  });

  refreshButton?.addEventListener("click", () => {
    load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Products could not be refreshed.", "error"));
  });

  newButton?.addEventListener("click", () => {
    openCreateProductModal({
      bootstrap,
      session,
      alertTarget,
      onCreated: async (row) => {
        state.selectedId = Number(row?.id || 0) || state.selectedId;
        state.saveFlash = { productId: state.selectedId, message: "Product created.", tone: "success" };
        await load();
      },
    });
  });

  categoryNewButton?.addEventListener("click", () => {
    openCreateCategoryModal({
      bootstrap,
      session,
      alertTarget,
      onCreated: (category, categories) => {
        syncCategoryCollections(categories, category?.id ?? "");
        renderEditor();
      },
    });
  });

  categoryEditButton?.addEventListener("click", () => {
    const selectedCategory = (bootstrap.categories || []).find(
      (item) => String(item.id ?? "") === String(categoryFilter?.value ?? ""),
    );
    openEditCategoryModal({
      bootstrap,
      session,
      alertTarget,
      category: selectedCategory,
      onUpdated: (category, categories) => {
        syncCategoryCollections(categories, category?.id ?? "");
        renderEditor();
        load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Products could not be refreshed.", "error"));
      },
      onDeleted: (_category, categories) => {
        syncCategoryCollections(categories, "");
        if (categoryFilter instanceof HTMLSelectElement) {
          categoryFilter.value = "";
        }
        renderEditor();
        load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Products could not be refreshed.", "error"));
      },
    });
  });

  importButton?.addEventListener("click", () => {
    openImportProductsModal({
      bootstrap,
      session,
      alertTarget,
      onImported: async () => {
        state.page = 1;
        await load();
      },
    });
  });

  load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Products could not be loaded.", "error"));
}

function renderInventoryPage(root, bootstrap, session, alertTarget) {
  root.innerHTML = getViewTemplate("inventory");
  const filterForm = root.querySelector("[data-inventory-filters]");
  const tableTarget = root.querySelector("[data-inventory-table]");
  const editorTarget = root.querySelector("[data-inventory-editor]");
  const paginationTarget = root.querySelector("[data-inventory-pagination]");
  const storeFilter = root.querySelector("[data-inventory-store-filter]");
  const refreshButton = root.querySelector("[data-inventory-refresh]");

  fillStoreOptions(storeFilter, bootstrap.stores, bootstrap.capabilities.can_view_all_stores);
  if (!bootstrap.capabilities.can_view_all_stores && storeFilter instanceof HTMLSelectElement && bootstrap.admin.store_slug) {
    storeFilter.value = bootstrap.admin.store_slug;
    storeFilter.disabled = true;
  }

  const state = { page: 1, selectedId: null, rows: [], meta: null, canEdit: false };

  const renderEditor = () => {
    const row = state.rows.find((item) => item.id === state.selectedId);
    if (!row) {
      editorTarget.innerHTML = `<p class="admin-note">No inventory row selected yet.</p>`;
      return;
    }

    editorTarget.innerHTML = `
      <div class="admin-editor">
        <div class="admin-editor__meta">
          <strong>${escapeHtml(row.product?.name || "Unknown product")}</strong><br>
          ${escapeHtml(row.product?.sku || "—")} · ${escapeHtml(row.store?.name || "Unknown store")}
        </div>
        <form class="admin-editor__form" data-inventory-editor-form>
          <div class="admin-editor__grid">
            <label><span>Quantity</span><input type="number" step="1" name="quantity" value="${escapeHtml(row.quantity ?? "")}" ${state.canEdit ? "" : "disabled"}></label>
            <label><span>Shelf location</span><input type="text" name="shelf_location" value="${escapeHtml(row.shelf_location || "")}" ${state.canEdit ? "" : "disabled"}></label>
          </div>
          ${state.canEdit ? `<div class="admin-button-row"><button class="button button--primary" type="submit">Save inventory</button></div>` : `<p class="admin-note">This account can view inventory but cannot change quantities.</p>`}
        </form>
      </div>
    `;

    editorTarget.querySelector("[data-inventory-editor-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      try {
        await callAdminApi("inventory_update", {
          id: row.id,
          quantity: formData.get("quantity"),
          shelf_location: formData.get("shelf_location"),
        }, session);
        setAlert(alertTarget, "Inventory updated.", "success");
        await load();
      } catch (error) {
        setAlert(alertTarget, error instanceof Error ? error.message : "Inventory could not be updated.", "error");
      }
    });
  };

  const renderTable = () => {
    if (!state.rows.length) {
      renderEmptyState(tableTarget, "No inventory rows matched the current filters.");
      paginationTarget.innerHTML = "";
      editorTarget.innerHTML = `<p class="admin-note">No inventory row selected yet.</p>`;
      return;
    }

    tableTarget.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Store</th>
            <th>Qty</th>
            <th>Shelf</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          ${state.rows.map((row) => `
            <tr data-inventory-row="${row.id}" class="${state.selectedId === row.id ? "is-selected" : ""}">
              <td>
                <div class="admin-list-item__content">
                  <strong>${escapeHtml(row.product?.name || "Unknown product")}</strong>
                  <span>${escapeHtml(row.product?.sku || "—")}</span>
                </div>
              </td>
              <td>${escapeHtml(row.store?.name || "—")}</td>
              <td>${escapeHtml(row.quantity)}</td>
              <td>${escapeHtml(row.shelf_location || "—")}</td>
              <td>${formatDateTime(row.updated_at)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    paginationTarget.innerHTML = renderPagination(state.meta || {});
    buildRowClickHandler(tableTarget, "[data-inventory-row]", (rowElement) => {
      state.selectedId = Number(rowElement.getAttribute("data-inventory-row"));
      renderTable();
      renderEditor();
    });
    paginationTarget.querySelector("[data-page-prev]")?.addEventListener("click", async () => {
      state.page = Math.max(1, state.page - 1);
      await load();
    });
    paginationTarget.querySelector("[data-page-next]")?.addEventListener("click", async () => {
      const totalPages = Math.max(1, Math.ceil((state.meta?.total || 0) / (state.meta?.page_size || 25)));
      state.page = Math.min(totalPages, state.page + 1);
      await load();
    });
    renderEditor();
  };

  const load = async () => {
    setAlert(alertTarget, "");
    tableTarget.innerHTML = `<div class="admin-loading">Loading inventory...</div>`;
    const formData = new FormData(filterForm);
    const result = await callAdminApi("inventory_list", {
      filters: {
        page: state.page,
        page_size: 25,
        search: formData.get("search"),
        store_slug: formData.get("store_slug"),
        low_stock_only: formData.get("low_stock_only") === "true",
      },
    }, session);
    state.rows = result.rows || [];
    state.meta = result;
    state.canEdit = Boolean(result.can_edit);
    if (state.selectedId && !state.rows.some((row) => row.id === state.selectedId)) {
      state.selectedId = state.rows[0]?.id || null;
    }
    if (!state.selectedId && state.rows.length) {
      state.selectedId = state.rows[0].id;
    }
    renderTable();
  };

  filterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.page = 1;
    await load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Inventory could not be loaded.", "error"));
  });

  refreshButton?.addEventListener("click", () => {
    load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Inventory could not be refreshed.", "error"));
  });

  load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Inventory could not be loaded.", "error"));
}

async function initAdminLoginPage() {
  const root = document.querySelector("[data-admin-login-page]");
  if (!(root instanceof HTMLElement)) return;

  const form = root.querySelector("[data-admin-login-form]");
  const messageBox = root.querySelector("[data-admin-auth-message]");
  if (!(form instanceof HTMLFormElement)) return;

  let authState = await getCurrentSessionState();
  if (authState.session) {
    try {
      await callAdminApi("bootstrap", {}, authState.session);
      window.location.href = getAdminPageUrl("dashboard.html");
      return;
    } catch (_error) {
      await authState.supabase.auth.signOut();
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAlert(messageBox, "");
    const formData = new FormData(form);
    const account = String(formData.get("account") || "").trim();
    const email = resolveAdminLoginEmail(account);
    const password = String(formData.get("password") || "");

    if (!account || !password) {
      setAlert(messageBox, "Enter your admin account and password.", "error");
      return;
    }

    if (!email) {
      setAlert(messageBox, "Admin account was not found.", "error");
      return;
    }

    try {
      const { error } = await authState.supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      authState = await getCurrentSessionState();
      await callAdminApi("bootstrap", {}, authState.session);
      window.location.href = getAdminPageUrl("dashboard.html");
    } catch (error) {
      await authState.supabase.auth.signOut();
      setAlert(messageBox, error instanceof Error ? error.message : "Admin sign in failed.", "error");
    }
  });
}

async function initAdminApp() {
  const root = document.querySelector("[data-admin-app]");
  if (!(root instanceof HTMLElement)) return;

  const view = String(root.getAttribute("data-admin-view") || "").trim();
  const title = String(root.getAttribute("data-admin-title") || "TECHM8 Admin").trim();

  let authState;
  try {
    authState = await getCurrentSessionState();
  } catch (_error) {
    window.location.href = getAdminLoginUrl();
    return;
  }

  if (!authState.session) {
    window.location.href = getAdminLoginUrl();
    return;
  }

  let bootstrap;
  try {
    bootstrap = await callAdminApi("bootstrap", {}, authState.session);
  } catch (error) {
    await authState.supabase.auth.signOut();
    window.location.href = getAdminLoginUrl();
    return;
  }

  renderAppShell(root, view, title, bootstrap);

  const alertTarget = root.querySelector("[data-admin-alert]");
  const pageRoot = root.querySelector("[data-admin-page-root]");
  const logoutButton = root.querySelector("[data-admin-logout]");

  if (!(pageRoot instanceof HTMLElement)) return;

  logoutButton?.addEventListener("click", async () => {
    await authState.supabase.auth.signOut();
    window.location.href = getAdminLoginUrl();
  });

  switch (view) {
    case "dashboard":
      renderDashboardPageEnhanced(pageRoot, bootstrap, authState.session, alertTarget);
      break;
    case "orders":
      renderOrdersPage(pageRoot, bootstrap, authState.session, alertTarget);
      break;
    case "repairs":
      renderRepairsPage(pageRoot, bootstrap, authState.session, alertTarget);
      break;
    case "customers":
      renderCustomersPage(pageRoot, bootstrap, authState.session, alertTarget);
      break;
    case "products":
      renderProductsPageV2(pageRoot, bootstrap, authState.session, alertTarget);
      break;
    case "inventory":
      renderInventoryPage(pageRoot, bootstrap, authState.session, alertTarget);
      break;
    default:
      pageRoot.innerHTML = `<article class="admin-panel"><p class="admin-note">Unknown admin page.</p></article>`;
      break;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initAdminLoginPage().catch(() => {});
  initAdminApp().catch(() => {});
});
