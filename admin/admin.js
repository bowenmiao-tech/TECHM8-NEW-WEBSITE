const SUPABASE_BROWSER_CDN_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
const DEFAULT_PRODUCT_IMAGE_URL =
  "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/placeholders/image-coming-soon.png";
let adminSupabaseClientPromise = null;
const DETAIL_BLOCK_MARKER = "TECHM8_DETAIL_BLOCKS:";

const ADMIN_NAV_ITEMS = [
  { href: "dashboard.html", view: "dashboard", label: "Dashboard" },
  { href: "orders.html", view: "orders", label: "Orders" },
  { href: "repairs.html", view: "repairs", label: "Repair Bookings" },
  { href: "products.html", view: "products", label: "Products" },
  { href: "inventory.html", view: "inventory", label: "Inventory" },
];

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
  return String(detailHtml || "").replace(/<!--\s*TECHM8_DETAIL_BLOCKS:[\s\S]*?-->\s*/i, "").trim();
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
    target.classList.remove("is-error", "is-success");
    return;
  }

  target.hidden = false;
  target.textContent = message;
  target.classList.toggle("is-error", tone === "error");
  target.classList.toggle("is-success", tone === "success");
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
    case "products":
      return `
        <section class="admin-layout">
          <article class="admin-panel">
            <div class="admin-panel__heading">
              <div>
                <h2>Products</h2>
                <p>Manage pricing, visibility, featured status and hero image.</p>
              </div>
              <div class="admin-button-row">
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
          </article>
          <aside class="admin-panel">
            <div class="admin-panel__heading">
              <div>
                <h2>Product editor</h2>
                <p>Catalog edits are restricted to super admins.</p>
              </div>
            </div>
            <div data-products-editor class="admin-note">No product selected yet.</div>
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

function getImageOrPlaceholder(url) {
  const text = String(url || "").trim();
  return text || DEFAULT_PRODUCT_IMAGE_URL;
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

function renderProductsPage(root, bootstrap, session, alertTarget) {
  root.innerHTML = getViewTemplate("products");
  const filterForm = root.querySelector("[data-products-filters]");
  const tableTarget = root.querySelector("[data-products-table]");
  const editorTarget = root.querySelector("[data-products-editor]");
  const paginationTarget = root.querySelector("[data-products-pagination]");
  const categoryFilter = root.querySelector("[data-products-category-filter]");
  const refreshButton = root.querySelector("[data-products-refresh]");

  fillCategoryOptions(categoryFilter, bootstrap.categories || []);

  const state = { page: 1, selectedId: null, rows: [], meta: null, canEdit: false };

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
    await load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Products could not be loaded.", "error"));
  });

  refreshButton?.addEventListener("click", () => {
    load().catch((error) => setAlert(alertTarget, error instanceof Error ? error.message : "Products could not be refreshed.", "error"));
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
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      setAlert(messageBox, "Enter your admin email and password.", "error");
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
    case "products":
      renderProductsPage(pageRoot, bootstrap, authState.session, alertTarget);
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
