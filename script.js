function initFilters() {
  const filterButtons = document.querySelectorAll("[data-filter]");
  const productCards = document.querySelectorAll(".product-card");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;

      filterButtons.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");

      productCards.forEach((card) => {
        const shouldShow = filter === "all" || card.dataset.category === filter;
        card.classList.toggle("is-hidden", !shouldShow);
      });
    });
  });
}

function isMobileNavigation() {
  return window.innerWidth <= 960;
}

function keepMobileMenuOpen() {
  if (!isMobileNavigation()) return;
  setMobileMenuState(true);
}

function setMobileMenuState(isOpen) {
  const mobileInput = document.querySelector(".nav__mobile-input");
  const navMenu = document.querySelector(".nav__menu");
  const navToggle = document.querySelector(".nav__toggle--open, .nav > .nav__toggle");
  const navOverlay = document.querySelector(".nav__overlay");

  if (mobileInput instanceof HTMLInputElement) {
    mobileInput.checked = isOpen;
  }

  navMenu?.classList.toggle("is-open", isOpen);
  navOverlay?.classList.toggle("is-open", isOpen);
  navToggle?.setAttribute("aria-expanded", String(isOpen));
}

function closeAllDropdowns(exceptDropdown) {
  document.querySelectorAll(".nav__dropdown.is-open").forEach((item) => {
    if (item === exceptDropdown) return;
    item.classList.remove("is-open");
    const toggle = item.querySelector(".nav__dropdown-toggle");
    toggle?.setAttribute("aria-expanded", "false");
    if (toggle) {
      delete toggle.dataset.navReady;
    }
  });

  if (!exceptDropdown) {
    closeAllSubmenus();
    closeAllMobileRepairsGroups();
  }
}

function armDropdownNavigation(toggle) {
  document.querySelectorAll(".nav__dropdown-toggle").forEach((item) => {
    if (item !== toggle) {
      delete item.dataset.navReady;
    }
  });

  toggle.dataset.navReady = "true";
}

function closeAllSubmenus(exceptGroup) {
  document.querySelectorAll(".nav__dropdown-group.is-open").forEach((group) => {
    if (group === exceptGroup) return;
    group.classList.remove("is-open");
    group.querySelector(".nav__submenu-toggle")?.setAttribute("aria-expanded", "false");
  });
}

function closeAllMobileRepairsGroups(exceptGroup) {
  document.querySelectorAll(".nav__mobile-repairs-group.is-open").forEach((group) => {
    if (group === exceptGroup) return;
    group.classList.remove("is-open");
    group.querySelector(".nav__mobile-repairs-toggle")?.setAttribute("aria-expanded", "false");
  });
}

function openSubmenuGroup(group) {
  if (!(group instanceof HTMLElement)) return;
  closeAllSubmenus(group);
  group.classList.add("is-open");
  group.querySelector(".nav__submenu-toggle")?.setAttribute("aria-expanded", "true");
}

function decorateMobileMenu() {
  const nav = document.querySelector(".nav");
  const navMenu = nav?.querySelector(".nav__menu");
  const mobileInput = nav?.querySelector(".nav__mobile-input");
  const openToggle = nav?.querySelector(".nav__toggle");
  const brand = nav?.querySelector(".brand");

  if (!nav || !navMenu || !mobileInput || !openToggle || !brand) return;

  let trigger = openToggle;
  if (!(trigger instanceof HTMLButtonElement)) {
    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "nav__toggle nav__toggle--open";
    openButton.setAttribute("aria-label", "Open menu");
    openButton.setAttribute("aria-controls", navMenu.id || "primary-menu");
    openButton.setAttribute("aria-expanded", "false");
    openButton.innerHTML = openToggle.innerHTML;
    openToggle.replaceWith(openButton);
    trigger = openButton;
  } else {
    trigger.classList.add("nav__toggle--open");
  }

  if (!nav.querySelector(".nav__overlay")) {
    const overlay = document.createElement("button");
    overlay.type = "button";
    overlay.className = "nav__overlay";
    overlay.setAttribute("aria-label", "Close menu");
    trigger.insertAdjacentElement("afterend", overlay);
  }

  if (!navMenu.querySelector(".nav__menu-header")) {
    const menuHeader = document.createElement("div");
    menuHeader.className = "nav__menu-header";

    const brandClone = brand.cloneNode(true);
    brandClone.classList.add("brand--menu");

    const closeToggle = document.createElement("button");
    closeToggle.type = "button";
    closeToggle.className = "nav__toggle nav__toggle--close";
    closeToggle.setAttribute("aria-label", "Close menu");
    closeToggle.innerHTML = "<span></span><span></span>";

    menuHeader.append(brandClone, closeToggle);
    navMenu.prepend(menuHeader);
  }
}

function decorateMobileRepairsAccordion() {
  const repairsDropdown = Array.from(document.querySelectorAll(".nav__dropdown")).find((dropdown) => {
    const toggle = dropdown.querySelector(".nav__dropdown-toggle");
    return toggle?.dataset.href?.includes("repairs.html");
  });

  if (!(repairsDropdown instanceof HTMLElement)) return;
  repairsDropdown.classList.add("nav__dropdown--repairs");

  if (repairsDropdown.querySelector(".nav__mobile-repairs")) return;

  const sourceGroups = Array.from(repairsDropdown.querySelectorAll(".nav__dropdown-menu .nav__dropdown-group"));
  if (!sourceGroups.length) return;

  const mobilePanel = document.createElement("div");
  mobilePanel.className = "nav__mobile-repairs";

  sourceGroups.forEach((group, index) => {
    const sourceToggle = group.querySelector(".nav__submenu-toggle");
    const sourceLinks = Array.from(group.querySelectorAll(".nav__submenu-panel a"));
    if (!(sourceToggle instanceof HTMLElement) || !sourceLinks.length) return;

    const groupEl = document.createElement("div");
    groupEl.className = "nav__mobile-repairs-group";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav__mobile-repairs-toggle";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("data-mobile-repairs-toggle", String(index));
    button.textContent = sourceToggle.textContent?.trim() || `Group ${index + 1}`;

    const linksPanel = document.createElement("div");
    linksPanel.className = "nav__mobile-repairs-panel";

    sourceLinks.forEach((link) => {
      const clone = link.cloneNode(true);
      linksPanel.appendChild(clone);
    });

    groupEl.append(button, linksPanel);
    mobilePanel.appendChild(groupEl);
  });

  repairsDropdown.appendChild(mobilePanel);
}

function handleDropdownToggle(event, dropdownToggle) {
  event.stopPropagation();
  const dropdown = dropdownToggle.closest(".nav__dropdown");
  if (!dropdown) return;

  if (isMobileNavigation()) {
    event.preventDefault();
    const willOpen = !dropdown.classList.contains("is-open");
    closeAllDropdowns(willOpen ? dropdown : null);
    dropdown.classList.toggle("is-open", willOpen);
    dropdownToggle.setAttribute("aria-expanded", String(willOpen));
    keepMobileMenuOpen();
    if (!willOpen) {
      closeAllMobileRepairsGroups();
    }
    delete dropdownToggle.dataset.navReady;
    return;
  }

  const destination = dropdownToggle.dataset.href || dropdownToggle.getAttribute("href");
  const alreadyOpen = dropdown.classList.contains("is-open");
  const readyToNavigate = dropdownToggle.dataset.navReady === "true";

  if (!alreadyOpen || !readyToNavigate) {
    event.preventDefault();
    closeAllDropdowns(dropdown);
    dropdown.classList.add("is-open");
    dropdownToggle.setAttribute("aria-expanded", "true");
    armDropdownNavigation(dropdownToggle);
    return;
  }

  if (destination) {
    event.preventDefault();
    window.location.href = destination;
    return;
  }

  event.preventDefault();
}

function handleMobileRepairsToggle(event, toggle) {
  event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === "function") {
    event.stopImmediatePropagation();
  }

  const group = toggle.closest(".nav__mobile-repairs-group");
  const dropdown = toggle.closest(".nav__dropdown");
  if (!(group instanceof HTMLElement) || !(dropdown instanceof HTMLElement)) return;

  const isOpen = group.classList.contains("is-open");
  dropdown.classList.add("is-open");
  dropdown.querySelector(".nav__dropdown-toggle")?.setAttribute("aria-expanded", "true");
  keepMobileMenuOpen();
  closeAllMobileRepairsGroups(group);
  group.classList.toggle("is-open", !isOpen);
  toggle.setAttribute("aria-expanded", String(!isOpen));
}

function handleSubmenuToggle(event, toggle) {
  event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === "function") {
    event.stopImmediatePropagation();
  }

  const group = toggle.closest(".nav__dropdown-group");
  if (!group) return false;

  if (!isMobileNavigation()) {
    openSubmenuGroup(group);
    return false;
  }

  const isOpen = group.classList.contains("is-open");
  const parentDropdown = group.closest(".nav__dropdown");
  parentDropdown?.classList.add("is-open");
  parentDropdown
    ?.querySelector(".nav__dropdown-toggle")
    ?.setAttribute("aria-expanded", "true");
  keepMobileMenuOpen();
  closeAllSubmenus(group);
  group.classList.toggle("is-open", !isOpen);
  toggle.setAttribute("aria-expanded", String(!isOpen));
  return false;
}

window.toggleMainDropdown = function toggleMainDropdown(button, event) {
  if (event) {
    handleDropdownToggle(event, button);
  }
  return false;
};

window.toggleRepairsMenu = window.toggleMainDropdown;

window.toggleNavSubmenu = function toggleNavSubmenu(button, event) {
  if (event) {
    handleSubmenuToggle(event, button);
  }
  return false;
};

function initStoreSearch() {
  document.querySelectorAll(".store-switcher").forEach((switcher) => {
    const input = switcher.querySelector(".store-switcher__search");
    if (!(input instanceof HTMLInputElement)) return;

    const links = Array.from(switcher.querySelectorAll(".store-switcher__link"));

    input.addEventListener("input", () => {
      const query = input.value.trim().toLowerCase();

      links.forEach((link) => {
        const text = link.textContent?.trim().toLowerCase() || "";
        const match = !query || text.includes(query);
        link.classList.toggle("is-hidden", !match);
      });
    });
  });
}

function initHomeBanner() {
  const banner = document.querySelector("[data-home-banner]");
  if (!(banner instanceof HTMLElement)) return;

  const slides = Array.from(banner.querySelectorAll("[data-banner-slide]"));
  const dots = Array.from(banner.querySelectorAll("[data-banner-dot]"));
  const prev = banner.querySelector("[data-banner-prev]");
  const next = banner.querySelector("[data-banner-next]");

  if (!slides.length) return;

  let current = 0;
  let timer;

  const render = (index) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === current);
    });
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === current);
    });
  };

  const restart = () => {
    window.clearInterval(timer);
    timer = window.setInterval(() => {
      render(current + 1);
    }, 5000);
  };

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      render(index);
      restart();
    });
  });

  prev?.addEventListener("click", () => {
    render(current - 1);
    restart();
  });

  next?.addEventListener("click", () => {
    render(current + 1);
    restart();
  });

  render(0);
  restart();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "";
  }

  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(amount);
}

const STORE_NAME_MAP = {
  "park-ridge": "Park Ridge",
  "fairfield": "Fairfield",
  "toowong": "Toowong",
  "north-lakes": "North Lakes",
  "brassall": "Brassall",
  "warehouse-dispatch": "Warehouse Dispatch",
};

const STORE_CHECKOUT_DETAILS = {
  "park-ridge": {
    title: "Park Ridge",
    mode: "Click & Collect",
    summary: "Collect your order from the Park Ridge store once the team confirms stock and pickup timing.",
    address: "Shop 11, 3732 Mount Lindesay Hwy, Park Ridge QLD 4125",
    phone: "0452 488 710",
    mapUrl: "https://maps.app.goo.gl/SBzYCp7G5C3UM4SdA",
    pageUrl: "stores/park-ridge.html",
  },
  "fairfield": {
    title: "Fairfield",
    mode: "Click & Collect",
    summary: "Pick up directly from Fairfield after order confirmation.",
    address: "Shop 8, 180 Fairfield Rd, Fairfield QLD 4103",
    phone: "0412 788 818",
    mapUrl: "https://maps.app.goo.gl/2iQqRL4YURm5cUfy7",
    pageUrl: "stores/fairfield.html",
  },
  "toowong": {
    title: "Toowong",
    mode: "Click & Collect",
    summary: "Collect from the Toowong store once your order is prepared.",
    address: "Ground Level Shop 53, 9 Sherwood Rd, Toowong QLD 4066",
    phone: "0485 500 099",
    mapUrl: "https://maps.app.goo.gl/9V7EERgpiuUjreQp7",
    pageUrl: "stores/toowong.html",
  },
  "north-lakes": {
    title: "North Lakes",
    mode: "Click & Collect",
    summary: "North Lakes pickup with confirmation from the local team before collection.",
    address: "1114A N Lakes Drive, North Lakes QLD 4509",
    phone: "0482 390 009",
    mapUrl: "https://maps.app.goo.gl/ZdEjv8V98RxT9uCT7",
    pageUrl: "stores/north-lakes.html",
  },
  brassall: {
    title: "Brassall",
    mode: "Click & Collect",
    summary: "Collect in store from Brassall once the order is packed and ready.",
    address: "68 Hunter St, Primewest Brassall Shopping Centre, Brassall QLD 4305",
    phone: "0403 999 366",
    mapUrl: "https://maps.app.goo.gl/ViJetRb1zEiMhGyZ7",
    pageUrl: "stores/brassall.html",
  },
  "warehouse-dispatch": {
    title: "Warehouse Dispatch",
    mode: "Direct Shipping",
    summary: "Ship directly from warehouse. A full delivery address is required before payment can continue.",
    address: "Warehouse fulfilment only",
    phone: "",
    mapUrl: "",
    pageUrl: "",
  },
};

const REPAIR_CATEGORY_LABELS = {
  phone: "Phone",
  tablet: "Tablet",
  computer: "Computer",
  gaming_console: "Gaming Console",
};

function formatDateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateOnly(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
  }).format(date);
}

function formatStatusLabel(value) {
  const safeValue = String(value || "").trim();
  if (!safeValue) return "Not available";
  return safeValue
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getStoreDisplayName(storeSlug) {
  const safeSlug = String(storeSlug || "").trim().toLowerCase();
  return STORE_NAME_MAP[safeSlug] || formatStatusLabel(safeSlug);
}

function getProductCreatedTimestamp(product) {
  const createdAt = product?.created_at ? Date.parse(product.created_at) : NaN;
  return Number.isFinite(createdAt) ? createdAt : null;
}

function compareProductsByLatest(left, right) {
  const rightCreated = getProductCreatedTimestamp(right);
  const leftCreated = getProductCreatedTimestamp(left);

  if (rightCreated !== null && leftCreated !== null && rightCreated !== leftCreated) {
    return rightCreated - leftCreated;
  }

  if (rightCreated !== null && leftCreated === null) {
    return 1;
  }

  if (rightCreated === null && leftCreated !== null) {
    return -1;
  }

  const rightId = Number(right?.id);
  const leftId = Number(left?.id);
  if (Number.isFinite(rightId) && Number.isFinite(leftId) && rightId !== leftId) {
    return rightId - leftId;
  }

  return (Number(left?.catalog_index) || 0) - (Number(right?.catalog_index) || 0);
}

const DEFAULT_PRODUCT_IMAGE_URL =
  "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/placeholders/image-coming-soon.png";
const SUPABASE_BROWSER_CDN_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
let supabaseBrowserClientPromise = null;

function resolveProductImageUrl(product) {
  const imageUrl = String(product?.display_image || product?.image_url || "").trim();
  return imageUrl || DEFAULT_PRODUCT_IMAGE_URL;
}

function compareProductsByNewestRecord(left, right) {
  const rightId = Number(right?.id);
  const leftId = Number(left?.id);

  if (Number.isFinite(rightId) && Number.isFinite(leftId) && rightId !== leftId) {
    return rightId - leftId;
  }

  return compareProductsByLatest(left, right);
}

function ensureAccountNavLink(relativeHref = "account.html") {
  document.querySelectorAll(".nav__menu").forEach((menu) => {
    if (!(menu instanceof HTMLElement) || menu.querySelector("[data-account-link]")) {
      return;
    }

    const link = document.createElement("a");
    link.href = relativeHref;
    link.className = "nav__account-link";
    link.setAttribute("data-account-link", "true");
    link.textContent = "Account";

    const cartLink = menu.querySelector(".nav__cart-link");
    const shopLink = menu.querySelector(".nav__shop-link");

    if (cartLink?.parentNode === menu) {
      menu.insertBefore(link, cartLink);
    } else if (shopLink?.parentNode === menu) {
      menu.insertBefore(link, shopLink);
    } else {
      menu.appendChild(link);
    }
  });
}

function getAuthRedirectUrl() {
  const configuredSiteUrl = String(window.TECHM8_CONFIG?.siteUrl || "").trim();
  if (configuredSiteUrl) {
    return new URL("account.html", configuredSiteUrl.endsWith("/") ? configuredSiteUrl : `${configuredSiteUrl}/`).toString();
  }

  return new URL("account.html", window.location.href).toString();
}

function getAccountHomeUrl() {
  const configuredSiteUrl = String(window.TECHM8_CONFIG?.siteUrl || "").trim();
  if (configuredSiteUrl) {
    return new URL("account-details.html", configuredSiteUrl.endsWith("/") ? configuredSiteUrl : `${configuredSiteUrl}/`).toString();
  }

  return new URL("account-details.html", window.location.href).toString();
}

function getConfiguredSiteBaseUrl() {
  const configuredSiteUrl = String(window.TECHM8_CONFIG?.siteUrl || "").trim();
  if (configuredSiteUrl) {
    return configuredSiteUrl.endsWith("/") ? configuredSiteUrl.slice(0, -1) : configuredSiteUrl;
  }

  return window.location.origin;
}

function getAccountDashboardUrl() {
  const configuredSiteUrl = String(window.TECHM8_CONFIG?.siteUrl || "").trim();
  if (configuredSiteUrl) {
    return new URL("account-dashboard.html", configuredSiteUrl.endsWith("/") ? configuredSiteUrl : `${configuredSiteUrl}/`).toString();
  }

  return new URL("account-dashboard.html", window.location.href).toString();
}

async function ensureSupabaseBrowserLibrary() {
  if (window.supabase?.createClient) {
    return window.supabase;
  }

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
  if (supabaseBrowserClientPromise) {
    return supabaseBrowserClientPromise;
  }

  supabaseBrowserClientPromise = (async () => {
    const supabaseLib = await ensureSupabaseBrowserLibrary();
    const { supabaseUrl, supabaseAnonKey } = window.TECHM8_CONFIG || {};

    if (!supabaseUrl || !supabaseAnonKey || !supabaseLib?.createClient) {
      throw new Error("Supabase auth client is not configured.");
    }

    return supabaseLib.createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  })();

  return supabaseBrowserClientPromise;
}

async function getCurrentAuthState() {
  try {
    const supabase = await getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    return {
      supabase,
      session,
      user: session?.user || null,
    };
  } catch (error) {
    return {
      supabase: null,
      session: null,
      user: null,
    };
  }
}

const PROFILE_SELECT_FIELDS = [
  "id",
  "email",
  "full_name",
  "first_name",
  "last_name",
  "phone",
  "business_name",
  "address_line_1",
  "address_line_2",
  "suburb",
  "postcode",
  "state",
  "default_store_slug",
  "service_email_opt_in",
  "marketing_opt_in",
  "avatar_url",
  "provider",
  "created_at",
  "updated_at",
].join(", ");

const PROFILE_LEGACY_SELECT_FIELDS = [
  "id",
  "email",
  "full_name",
  "phone",
  "default_store_slug",
  "avatar_url",
  "provider",
  "created_at",
  "updated_at",
].join(", ");

function splitProfileName(profile, user = null) {
  const firstName = String(profile?.first_name || "").trim();
  const lastName = String(profile?.last_name || "").trim();

  if (firstName || lastName) {
    return {
      firstName,
      lastName,
    };
  }

  const fullName = String(profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "").trim();
  if (!fullName) {
    return { firstName: "", lastName: "" };
  }

  const parts = fullName.split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() || "",
    lastName: parts.join(" "),
  };
}

function buildProfileFullName(firstName, lastName, fallback = "") {
  const combined = [String(firstName || "").trim(), String(lastName || "").trim()].filter(Boolean).join(" ").trim();
  return combined || String(fallback || "").trim() || null;
}

function isMissingProfileColumnError(error) {
  const code = String(error?.code || "").trim();
  const message = String(error?.message || "").trim();
  return code === "PGRST204" || /Could not find the .* column of 'profiles'/i.test(message);
}

function toBooleanOrNull(value) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return null;
}

function buildProfilePayload(user, overrides = {}) {
  const existingFullName = String(overrides.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "").trim();
  const firstName = String(overrides.first_name || "").trim();
  const lastName = String(overrides.last_name || "").trim();

  return {
    id: user.id,
    email: String(overrides.email || user.email || "").trim() || null,
    full_name: buildProfileFullName(firstName, lastName, existingFullName),
    first_name: firstName || null,
    last_name: lastName || null,
    phone: String(overrides.phone || user.user_metadata?.phone || "").trim() || null,
    business_name: String(overrides.business_name || "").trim() || null,
    address_line_1: String(overrides.address_line_1 || "").trim() || null,
    address_line_2: String(overrides.address_line_2 || "").trim() || null,
    suburb: String(overrides.suburb || "").trim() || null,
    postcode: String(overrides.postcode || "").trim() || null,
    state: String(overrides.state || "").trim().toUpperCase() || null,
    avatar_url: String(user.user_metadata?.avatar_url || "").trim() || null,
    provider: String(user.app_metadata?.provider || user.user_metadata?.provider || "").trim() || null,
    default_store_slug: String(overrides.default_store_slug || "").trim() || null,
    service_email_opt_in: toBooleanOrNull(overrides.service_email_opt_in),
    marketing_opt_in: toBooleanOrNull(overrides.marketing_opt_in),
  };
}

function buildLegacyProfilePayload(payload) {
  return {
    id: payload.id,
    email: payload.email,
    full_name: payload.full_name,
    phone: payload.phone,
    avatar_url: payload.avatar_url,
    provider: payload.provider,
    default_store_slug: payload.default_store_slug,
  };
}

function normalizeProfileRecord(profile, user = null) {
  if (!profile) return null;

  const nameParts = splitProfileName(profile, user);
  return {
    ...profile,
    first_name: String(profile.first_name || nameParts.firstName || "").trim() || null,
    last_name: String(profile.last_name || nameParts.lastName || "").trim() || null,
    business_name: String(profile.business_name || "").trim() || null,
    address_line_1: String(profile.address_line_1 || "").trim() || null,
    address_line_2: String(profile.address_line_2 || "").trim() || null,
    suburb: String(profile.suburb || "").trim() || null,
    postcode: String(profile.postcode || "").trim() || null,
    state: String(profile.state || "").trim().toUpperCase() || null,
    service_email_opt_in: typeof profile.service_email_opt_in === "boolean" ? profile.service_email_opt_in : null,
    marketing_opt_in: typeof profile.marketing_opt_in === "boolean" ? profile.marketing_opt_in : null,
  };
}

async function upsertCustomerProfile(supabase, user, overrides = {}, options = {}) {
  if (!supabase || !user?.id) return null;
  const { allowLegacyFallback = true } = options;
  const payload = buildProfilePayload(user, overrides);

  try {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select(PROFILE_SELECT_FIELDS)
      .single();

    if (error) {
      throw error;
    }

    return normalizeProfileRecord(data, user);
  } catch (error) {
    if (!allowLegacyFallback || !isMissingProfileColumnError(error)) {
      throw error;
    }

    const { data, error: fallbackError } = await supabase
      .from("profiles")
      .upsert(buildLegacyProfilePayload(payload), { onConflict: "id" })
      .select(PROFILE_LEGACY_SELECT_FIELDS)
      .single();

    if (fallbackError) {
      throw fallbackError;
    }

    return normalizeProfileRecord(data, user);
  }
}

async function syncCustomerProfile(supabase, user, overrides = {}) {
  return upsertCustomerProfile(supabase, user, overrides, { allowLegacyFallback: true });
}

async function fetchCustomerProfile(supabase, user) {
  if (!supabase || !user?.id) return null;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT_FIELDS)
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return normalizeProfileRecord(data, user);
  } catch (error) {
    if (!isMissingProfileColumnError(error)) {
      throw error;
    }

    const { data, error: fallbackError } = await supabase
      .from("profiles")
      .select(PROFILE_LEGACY_SELECT_FIELDS)
      .eq("id", user.id)
      .maybeSingle();

    if (fallbackError) {
      throw fallbackError;
    }

    return normalizeProfileRecord(data, user);
  }
}

function fillFormField(form, fieldName, value, overwrite = false) {
  if (!(form instanceof HTMLFormElement)) return;
  const field = form.elements.namedItem(fieldName);
  if (
    !(field instanceof HTMLInputElement) &&
    !(field instanceof HTMLTextAreaElement) &&
    !(field instanceof HTMLSelectElement)
  ) {
    return;
  }

  const safeValue = String(value || "").trim();
  if (!safeValue) return;
  if (!overwrite && String(field.value || "").trim()) return;
  field.value = safeValue;
}

async function prefillCustomerContactForm(form, options = {}) {
  const { includeStore = false } = options;
  const authState = await getCurrentAuthState();
  if (!authState.user || !authState.supabase) {
    return null;
  }

  let profile = null;
  try {
    profile = await syncCustomerProfile(authState.supabase, authState.user);
  } catch (error) {
    try {
      profile = await fetchCustomerProfile(authState.supabase, authState.user);
    } catch (nestedError) {
      profile = null;
    }
  }

  const fullName = String(profile?.full_name || authState.user.user_metadata?.full_name || authState.user.user_metadata?.name || "").trim();
  const phone = String(profile?.phone || authState.user.user_metadata?.phone || "").trim();
  const email = String(profile?.email || authState.user.email || "").trim();
  const defaultStoreSlug = String(profile?.default_store_slug || "").trim();

  fillFormField(form, "customer_name", fullName);
  fillFormField(form, "phone", phone);
  fillFormField(form, "email", email);

  if (includeStore && defaultStoreSlug) {
    fillFormField(form, "store_slug", defaultStoreSlug);
  }

  return {
    ...authState,
    profile,
  };
}

async function loadCustomerOrders(supabase, user, limit = 50) {
  if (!supabase || !user?.id) return [];

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_code, customer_name, email, phone, store_slug, fulfillment_method, payment_method_label, payment_status, status, fulfillment_status, total_amount, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

async function loadCustomerRepairBookings(supabase, user, limit = 50) {
  if (!supabase || !user?.id) return [];

  const { data, error } = await supabase
    .from("repair_bookings")
    .select("id, booking_code, store_slug, repair_category, brand, device_model, preferred_date, preferred_time, preferred_contact_method, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

function renderHistoryPreview(target, records, kind) {
  if (!(target instanceof HTMLElement)) return;

  if (!Array.isArray(records) || !records.length) {
    target.innerHTML = `<p class="auth-history__empty">No ${kind === "orders" ? "orders" : "repair requests"} linked to this account yet.</p>`;
    return;
  }

  target.innerHTML = records.slice(0, 3).map((record) => {
    if (kind === "orders") {
      return `
        <article class="auth-history__item">
          <strong>${escapeHtml(record.order_code || "Pending order")}</strong>
          <span>${escapeHtml(getStoreDisplayName(record.store_slug))} · ${escapeHtml(formatMoney(record.total_amount || 0))}</span>
          <span>${escapeHtml(formatStatusLabel(record.status))} · ${escapeHtml(formatDateTime(record.created_at))}</span>
        </article>
      `;
    }

    return `
      <article class="auth-history__item">
        <strong>${escapeHtml(record.booking_code || "Pending repair")}</strong>
        <span>${escapeHtml(REPAIR_CATEGORY_LABELS[record.repair_category] || formatStatusLabel(record.repair_category))} · ${escapeHtml(getStoreDisplayName(record.store_slug))}</span>
        <span>${escapeHtml(formatStatusLabel(record.status))} · ${escapeHtml(formatDateTime(record.created_at))}</span>
      </article>
    `;
  }).join("");
}

function renderHistoryList(target, records, kind) {
  if (!(target instanceof HTMLElement)) return;

  if (!Array.isArray(records) || !records.length) {
    target.innerHTML = `
      <article class="history-card history-card--empty">
        <p class="eyebrow">${kind === "orders" ? "No orders yet" : "No repairs yet"}</p>
        <h2>${kind === "orders" ? "No order history is linked to this account." : "No repair bookings are linked to this account."}</h2>
        <p>${kind === "orders" ? "Place an order while signed in and it will appear here automatically." : "Submit a repair request while signed in and it will appear here automatically."}</p>
      </article>
    `;
    return;
  }

  target.innerHTML = records.map((record) => {
    if (kind === "orders") {
      return `
        <article class="history-card">
          <div class="history-card__top">
            <div>
              <p class="eyebrow">Order</p>
              <h2>${escapeHtml(record.order_code || "Pending order")}</h2>
            </div>
            <span class="history-card__status">${escapeHtml(formatStatusLabel(record.status))}</span>
          </div>
          <div class="history-card__grid">
            <div><strong>Store</strong><span>${escapeHtml(getStoreDisplayName(record.store_slug))}</span></div>
            <div><strong>Total</strong><span>${escapeHtml(formatMoney(record.total_amount || 0))}</span></div>
            <div><strong>Payment</strong><span>${escapeHtml(record.payment_method_label || "Pay in store")} · ${escapeHtml(formatStatusLabel(record.payment_status))}</span></div>
            <div><strong>Fulfilment</strong><span>${escapeHtml(formatStatusLabel(record.fulfillment_method || "pickup"))} · ${escapeHtml(formatStatusLabel(record.fulfillment_status || "new"))}</span></div>
            <div><strong>Placed</strong><span>${escapeHtml(formatDateTime(record.created_at))}</span></div>
            <div><strong>Contact</strong><span>${escapeHtml(record.phone || "")}${record.email ? ` / ${escapeHtml(record.email)}` : ""}</span></div>
          </div>
        </article>
      `;
    }

    return `
      <article class="history-card">
        <div class="history-card__top">
          <div>
            <p class="eyebrow">Repair booking</p>
            <h2>${escapeHtml(record.booking_code || "Pending repair")}</h2>
          </div>
          <span class="history-card__status">${escapeHtml(formatStatusLabel(record.status))}</span>
        </div>
        <div class="history-card__grid">
          <div><strong>Store</strong><span>${escapeHtml(getStoreDisplayName(record.store_slug))}</span></div>
          <div><strong>Category</strong><span>${escapeHtml(REPAIR_CATEGORY_LABELS[record.repair_category] || formatStatusLabel(record.repair_category))}</span></div>
          <div><strong>Brand</strong><span>${escapeHtml(record.brand || "Not specified")}</span></div>
          <div><strong>Model</strong><span>${escapeHtml(record.device_model || "Not specified")}</span></div>
          <div><strong>Preferred date</strong><span>${escapeHtml(record.preferred_date ? formatDateOnly(record.preferred_date) : "Flexible")}</span></div>
          <div><strong>Requested</strong><span>${escapeHtml(formatDateTime(record.created_at))}</span></div>
        </div>
      </article>
    `;
  }).join("");
}

const PRODUCT_VARIANT_COLOR_RULES = [
  { label: "Gray Camouflage", tokens: ["gray camouflage", "grey camouflage", "camouflage"] },
  { label: "Sterling Silver", tokens: ["sterling silver", "silver"] },
  { label: "Cosmic Red", tokens: ["cosmic red", "red"] },
  { label: "White", tokens: ["white"] },
  { label: "Black", tokens: ["black", "midnight black", "dark gray", "dark grey", "grey", "gray"] },
  { label: "Blue", tokens: ["blue"] },
  { label: "Pink", tokens: ["pink"] },
  { label: "Purple", tokens: ["purple"] },
];

const PRODUCT_IMAGE_LOW_PRIORITY_KEYWORDS = [
  "package",
  "packaging",
  "box",
  "combo",
  "group",
  "multi",
  "all-colour",
  "all-color",
  "feature",
  "detail",
  "details",
  "spec",
  "manual",
  "english",
  "包装",
  "套装",
  "组合",
  "全色",
  "详情",
  "参数",
  "说明",
];

function normalizeVariantText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isGroupedVariantProduct(product) {
  const categorySlug = normalizeVariantText(product?.category_slug);
  const model = String(product?.model || "").trim();
  return categorySlug === "power-banks" || /^(rpp|fcp|wp)-\d+/i.test(model);
}

function getProductVariantColor(product) {
  const searchable = normalizeVariantText(
    [product?.name, product?.short_description, product?.description, product?.compatibility].join(" ")
  );

  for (const rule of PRODUCT_VARIANT_COLOR_RULES) {
    if (rule.tokens.some((token) => searchable.includes(token))) {
      return rule.label;
    }
  }

  return "";
}

function getProductVariantGroupKey(product) {
  if (!isGroupedVariantProduct(product)) {
    return String(product?.slug || "");
  }

  return [
    normalizeVariantText(product?.brand || "techm8"),
    normalizeVariantText(product?.category_slug || "catalog"),
    normalizeVariantText(product?.model || product?.slug || ""),
  ].join("::");
}

function getVariantSortWeight(product) {
  const color = normalizeVariantText(getProductVariantColor(product));
  const weights = {
    white: 10,
    black: 20,
    "gray camouflage": 30,
    camouflage: 30,
    "sterling silver": 40,
    silver: 40,
    "cosmic red": 50,
    red: 50,
    blue: 60,
    pink: 70,
    purple: 80,
  };

  return weights[color] || 999;
}

function stripProductColorSuffix(name, colorLabel) {
  let output = String(name || "").trim();
  if (!output || !colorLabel) return output;

  const colorPattern = escapeRegExp(colorLabel);
  const patterns = [
    new RegExp(`\\s*-\\s*${colorPattern}\\s*$`, "i"),
    new RegExp(`\\s*\\(${colorPattern}\\)\\s*$`, "i"),
    new RegExp(`\\s+${colorPattern}\\s*$`, "i"),
  ];

  patterns.forEach((pattern) => {
    output = output.replace(pattern, "");
  });

  return output.replace(/\s{2,}/g, " ").trim();
}

function getProductDisplayName(product) {
  const baseName = String(product?.display_name || product?.name || "").trim();
  if (!product?.variant_options || product.variant_options.length <= 1) {
    return baseName;
  }

  return stripProductColorSuffix(baseName, getProductVariantColor(product));
}

function scoreProductImage(product, image, index) {
  const imageText = normalizeVariantText([image?.image_url, image?.alt_text].join(" "));
  const color = normalizeVariantText(getProductVariantColor(product));
  let score = 1000 - index * 10;

  if (index === 0) score += 90;
  if (index === 1) score += 80;
  if (index >= 2) score -= index * 8;

  if (PRODUCT_IMAGE_LOW_PRIORITY_KEYWORDS.some((keyword) => imageText.includes(keyword))) {
    score -= 300;
  }

  if (color) {
    if (imageText.includes(color)) {
      score += 450;
    }

    if (isGroupedVariantProduct(product)) {
      if (color === "white" && index === 0) score += 320;
      if (["black", "gray", "grey", "silver", "sterling silver", "gray camouflage"].includes(color) && index === 1) {
        score += 320;
      }
      if (["red", "cosmic red"].includes(color) && index <= 2) score += 220;
    }
  }

  return score;
}

function getOrderedProductGalleryImages(product) {
  return getProductGalleryImages(product)
    .slice()
    .sort((left, right) => {
      const scoreDiff = scoreProductImage(product, right, Number(right?.sort_order) || 0) - scoreProductImage(product, left, Number(left?.sort_order) || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (Number(left?.sort_order) || 0) - (Number(right?.sort_order) || 0);
    });
}

function applyProductVariantData(products) {
  if (!Array.isArray(products) || !products.length) return products;

  const groups = new Map();

  products.forEach((product) => {
    product.variant_group_key = getProductVariantGroupKey(product);
    product.color_label = getProductVariantColor(product);
    product.display_name = product.name;

    if (!isGroupedVariantProduct(product)) {
      product.variant_options = [];
      return;
    }

    const existing = groups.get(product.variant_group_key) || [];
    existing.push(product);
    groups.set(product.variant_group_key, existing);
  });

  groups.forEach((items) => {
    const sortedItems = items
      .slice()
      .sort((left, right) => {
        const sortDiff = getVariantSortWeight(left) - getVariantSortWeight(right);
        if (sortDiff !== 0) return sortDiff;
        return compareProductsByLatest(left, right);
      });

    const representative = sortedItems[0];
    const displayName = stripProductColorSuffix(representative?.name || "", representative?.color_label || "") || representative?.name || "";
    const variantOptions = sortedItems.map((item) => ({
      slug: item.slug,
      label: item.color_label || item.model || item.brand || "Option",
      is_active: false,
    }));

    sortedItems.forEach((item) => {
      item.display_name = displayName;
      item.variant_options = variantOptions.map((option) => ({
        ...option,
        is_active: option.slug === item.slug,
      }));

      const orderedGallery = getOrderedProductGalleryImages(item);
      if (orderedGallery.length) {
        item.gallery_images = orderedGallery.map((image, index) => ({
          ...image,
          sort_order: index,
        }));
        item.display_image = orderedGallery[0].image_url;
      } else {
        item.display_image = resolveProductImageUrl(item);
      }
    });
  });

  products.forEach((product) => {
    if (!Array.isArray(product.variant_options)) {
      product.variant_options = [];
    }

    if (!product.display_name) {
      product.display_name = product.name;
    }

    if ((!product.display_image || !String(product.display_image).trim()) && Array.isArray(product.gallery_images) && product.gallery_images.length) {
      const orderedGallery = getOrderedProductGalleryImages(product);
      if (orderedGallery.length) {
        product.gallery_images = orderedGallery.map((image, index) => ({
          ...image,
          sort_order: index,
        }));
        product.display_image = orderedGallery[0].image_url;
      }
    }

    product.display_image = resolveProductImageUrl(product);
  });

  return products;
}

function getCatalogDisplayProducts(products) {
  const orderedProducts = Array.isArray(products) ? products.slice().sort(compareProductsByLatest) : [];
  const visibleGroups = new Set();
  const displayProducts = [];

  orderedProducts.forEach((product) => {
    const groupKey = product?.variant_group_key || product?.slug;
    if (product?.variant_options?.length > 1) {
      if (visibleGroups.has(groupKey)) return;
      visibleGroups.add(groupKey);
    }

    displayProducts.push(product);
  });

  return displayProducts;
}

function getLatestDisplayProducts(products, limit = 6) {
  const orderedProducts = Array.isArray(products) ? products.slice().sort(compareProductsByNewestRecord) : [];
  const visibleGroups = new Set();
  const displayProducts = [];

  orderedProducts.forEach((product) => {
    const hasVariants = Array.isArray(product?.variant_options) && product.variant_options.length > 1;
    const groupKey = hasVariants
      ? (product?.variant_group_key || product?.slug)
      : (product?.slug || product?.sku || product?.id);

    if (visibleGroups.has(groupKey)) {
      return;
    }

    visibleGroups.add(groupKey);
    displayProducts.push(product);
  });

  return displayProducts.slice(0, limit);
}

function renderVariantSummary(product, classPrefix) {
  if (!Array.isArray(product?.variant_options) || product.variant_options.length <= 1) {
    return "";
  }

  const items = product.variant_options
    .map((option) => `<span class="${classPrefix}__variant ${option.is_active ? "is-active" : ""}">${escapeHtml(option.label)}</span>`)
    .join("");

  return `<div class="${classPrefix}__variants">${items}</div>`;
}

const CART_STORAGE_KEY = "techm8_cart_v1";
const LOCAL_ORDER_STORAGE_KEY = "techm8_orders_v1";

function loadCart() {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveCart(items) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("techm8:cart-updated", { detail: { items } }));
}

function getCartCount(items = loadCart()) {
  return items.reduce((total, item) => total + Math.max(0, Number(item.qty) || 0), 0);
}

function getCartSubtotal(items = loadCart()) {
  return items.reduce((total, item) => total + (Number(item.price) || 0) * (Number(item.qty) || 0), 0);
}

function ensureGlobalCartUi() {
  document.querySelectorAll(".nav__menu").forEach((menu) => {
    if (!(menu instanceof HTMLElement)) return;
    let cartLink = menu.querySelector(".nav__cart-link");

    if (!(cartLink instanceof HTMLAnchorElement)) {
      cartLink = document.createElement("a");
      cartLink.className = "nav__cart-link";
      cartLink.href = "cart.html";

      const shopLink = menu.querySelector(".nav__shop-link");
      if (shopLink?.parentNode === menu) {
        menu.insertBefore(cartLink, shopLink);
      } else {
        menu.appendChild(cartLink);
      }
    }

    if (!cartLink.querySelector(".nav__cart-icon")) {
      cartLink.innerHTML = `
        <span class="nav__cart-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="20" r="1.35"></circle>
            <circle cx="18" cy="20" r="1.35"></circle>
            <path d="M2 3h2.2l2.4 10.2a1 1 0 0 0 .98.78h9.85a1 1 0 0 0 .98-.8L20 7H6.1"></path>
          </svg>
        </span>
        <span class="nav__cart-text">Cart</span>
        <span class="nav__cart-count" data-cart-count>0</span>
      `;
    }
  });

  if (!document.querySelector("[data-floating-cart]")) {
    const floatingCart = document.createElement("a");
    floatingCart.className = "floating-cart";
    floatingCart.href = "cart.html";
    floatingCart.setAttribute("aria-label", "Open cart");
    floatingCart.setAttribute("data-floating-cart", "true");
    floatingCart.innerHTML = `
      <span class="floating-cart__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="20" r="1.35"></circle>
          <circle cx="18" cy="20" r="1.35"></circle>
          <path d="M2 3h2.2l2.4 10.2a1 1 0 0 0 .98.78h9.85a1 1 0 0 0 .98-.8L20 7H6.1"></path>
        </svg>
      </span>
      <span class="floating-cart__count" data-cart-count>0</span>
    `;
    document.body.appendChild(floatingCart);
  }
}

function updateCartIndicators(items = loadCart()) {
  const count = getCartCount(items);
  document.querySelectorAll("[data-cart-count]").forEach((target) => {
    if (!(target instanceof HTMLElement)) return;
    target.textContent = String(count);
    target.toggleAttribute("hidden", count <= 0);
    target.setAttribute("aria-hidden", count <= 0 ? "true" : "false");
  });
}

function normaliseCartItem(product, quantity = 1) {
  const price = Number(product.retail_price) || 0;
  const compareAtPrice = Number(product.compare_at_price) || 0;
  return {
    product_id: product.id,
    slug: product.slug,
    sku: product.sku || "",
    name: product.name,
    image_url: resolveProductImageUrl(product),
    brand: product.brand || "TECHM8",
    category_name: product.category_name || "Store product",
    category_slug: product.category_slug || "other-products",
    compatibility: product.compatibility || "",
    short_description: product.short_description || "",
    price,
    compare_at_price: compareAtPrice > price ? compareAtPrice : null,
    qty: Math.max(1, Number(quantity) || 1),
  };
}

function addItemToCart(product, quantity = 1) {
  const items = loadCart();
  const existing = items.find((item) => item.slug === product.slug);

  if (existing) {
    existing.qty = Math.max(1, Number(existing.qty) || 1) + Math.max(1, Number(quantity) || 1);
  } else {
    items.push(normaliseCartItem(product, quantity));
  }

  saveCart(items);
  updateCartIndicators(items);
  return items;
}

function updateCartItemQuantity(slug, quantity) {
  const items = loadCart()
    .map((item) => (item.slug === slug ? { ...item, qty: Math.max(1, Number(quantity) || 1) } : item));
  saveCart(items);
  updateCartIndicators(items);
  return items;
}

function removeCartItem(slug) {
  const items = loadCart().filter((item) => item.slug !== slug);
  saveCart(items);
  updateCartIndicators(items);
  return items;
}

function clearCart() {
  saveCart([]);
  updateCartIndicators([]);
}

function makeOrderCode() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 12);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TM8-${stamp}-${suffix}`;
}

function saveLocalOrder(payload) {
  const orders = (() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_ORDER_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  })();

  orders.unshift(payload);
  window.localStorage.setItem(LOCAL_ORDER_STORAGE_KEY, JSON.stringify(orders.slice(0, 30)));
}

async function loadPaymentFeeProfiles() {
  const { supabaseUrl, supabaseAnonKey } = window.TECHM8_CONFIG || {};

  if (!supabaseUrl || !supabaseAnonKey) {
    return [
      {
        code: "pay_in_store",
        label: "Pay in store",
        provider: "manual",
        fee_type: "none",
        percentage: 0,
        fixed_amount: 0,
        is_enabled: true,
      },
    ];
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/payment_fee_profiles?select=code,label,provider,fee_type,percentage,fixed_amount,is_enabled,sort_order,notes&is_enabled=eq.true&order=sort_order.asc`,
      {
        headers: {
          Accept: "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Payment fee profiles could not be loaded.");
    }

    const rows = await response.json();
    return Array.isArray(rows) && rows.length
      ? rows
      : [
          {
            code: "pay_in_store",
            label: "Pay in store",
            provider: "manual",
            fee_type: "none",
            percentage: 0,
            fixed_amount: 0,
            is_enabled: true,
          },
        ];
  } catch (error) {
    return [
      {
        code: "pay_in_store",
        label: "Pay in store",
        provider: "manual",
        fee_type: "none",
        percentage: 0,
        fixed_amount: 0,
        is_enabled: true,
      },
    ];
  }
}

function calculatePaymentFee(subtotal, profile) {
  if (!profile) return 0;

  const percentage = Number(profile.percentage) || 0;
  const fixedAmount = Number(profile.fixed_amount) || 0;

  switch (profile.fee_type) {
    case "fixed":
      return Number(fixedAmount.toFixed(2));
    case "percent":
      return Number((subtotal * (percentage / 100)).toFixed(2));
    case "combined":
      return Number((subtotal * (percentage / 100) + fixedAmount).toFixed(2));
    default:
      return 0;
  }
}

function initStorefront() {
  const root = document.querySelector("[data-storefront]");
  if (!(root instanceof HTMLElement)) return;

  const categoryTarget = root.querySelector("[data-store-categories]");
  const productTarget = root.querySelector("[data-store-products]");
  const searchField = root.querySelector("[data-store-search]");
  const countTarget = root.querySelector("[data-store-count]");
  const sourceTarget = root.querySelector("[data-store-source]");
  const sourceNoteTarget = root.querySelector("[data-store-source-note]");

  if (!(categoryTarget instanceof HTMLElement) || !(productTarget instanceof HTMLElement)) {
    return;
  }

  const fallbackProducts = [
    {
      id: "sample-1",
      sku: "TM8-PS5-DS-STERLING-SILVER",
      slug: "dualsense-wireless-controller-sterling-silver-playstation-5",
      name: "DualSense Wireless Controller - Sterling Silver - PlayStation 5",
      brand: "Sony",
      model: "DualSense Wireless Controller",
      short_description: "Official PS5 DualSense controller in Sterling Silver finish.",
      retail_price: 115,
      compare_at_price: 124,
      image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-sterling-silver-playstation-5.jpg",
      supplier_image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-sterling-silver-playstation-5.jpg",
      stock_quantity: 0,
      is_featured: true,
      condition_label: "New",
      compatibility: "PlayStation 5",
      category_id: "sample-ps5",
      category_name: "PS5 Controllers",
      category_slug: "ps5-controllers",
    },
    {
      id: "sample-2",
      sku: "TM8-PS5-DS-COSMIC-RED",
      slug: "dualsense-wireless-controller-cosmic-red-playstation-5",
      name: "DualSense Wireless Controller - Cosmic Red - PlayStation 5",
      brand: "Sony",
      model: "DualSense Wireless Controller",
      short_description: "Official PS5 DualSense controller in Cosmic Red finish.",
      retail_price: 109,
      compare_at_price: null,
      image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-cosmic-red-playstation-5.jpg",
      supplier_image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-cosmic-red-playstation-5.jpg",
      stock_quantity: 0,
      is_featured: true,
      condition_label: "New",
      compatibility: "PlayStation 5",
      category_id: "sample-ps5",
      category_name: "PS5 Controllers",
      category_slug: "ps5-controllers",
    },
    {
      id: "sample-3",
      sku: "TM8-PS5-DS-GRAY-CAMO",
      slug: "dualsense-wireless-controller-gray-camouflage",
      name: "DualSense Wireless Controller - Gray Camouflage",
      brand: "Sony",
      model: "DualSense Wireless Controller",
      short_description: "Official PS5 DualSense controller in Gray Camouflage finish.",
      retail_price: 109,
      compare_at_price: null,
      image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-gray-camouflage.jpg",
      supplier_image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-gray-camouflage.jpg",
      stock_quantity: 0,
      is_featured: true,
      condition_label: "New",
      compatibility: "PlayStation 5",
      category_id: "sample-ps5",
      category_name: "PS5 Controllers",
      category_slug: "ps5-controllers",
    },
    {
      id: "sample-4",
      sku: "TM8-PS5-DS-BLACK",
      slug: "copy-of-dualsense-wireless-controller-playstation-5-black",
      name: "DualSense Wireless Controller - PlayStation 5 - Black",
      brand: "Sony",
      model: "DualSense Wireless Controller",
      short_description: "Official PS5 DualSense controller in Black finish.",
      retail_price: 109,
      compare_at_price: null,
      image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/copy-of-dualsense-wireless-controller-playstation-5-black.jpg",
      supplier_image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/copy-of-dualsense-wireless-controller-playstation-5-black.jpg",
      stock_quantity: 0,
      is_featured: true,
      condition_label: "New",
      compatibility: "PlayStation 5",
      category_id: "sample-ps5",
      category_name: "PS5 Controllers",
      category_slug: "ps5-controllers",
    },
    {
      id: "sample-5",
      sku: "TM8-PS5-DS-WHITE",
      slug: "dualsense-wireless-controller-playstation-5-white",
      name: "DualSense Wireless Controller - PlayStation 5 - White",
      brand: "Sony",
      model: "DualSense Wireless Controller",
      short_description: "Official PS5 DualSense controller in White finish.",
      retail_price: 109,
      compare_at_price: null,
      image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-playstation-5-white.jpg",
      supplier_image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-playstation-5-white.jpg",
      stock_quantity: 0,
      is_featured: true,
      condition_label: "New",
      compatibility: "PlayStation 5",
      category_id: "sample-ps5",
      category_name: "PS5 Controllers",
      category_slug: "ps5-controllers",
    },
  ];

  const state = {
    products: [],
    categories: [],
    activeCategory: "all",
    query: "",
  };

  bindCartButtons(productTarget, () => state.products);

  const deriveCategories = (products) => {
    const map = new Map();
    products.forEach((product) => {
      const key = product.category_slug || product.category_id || "uncategorized";
      if (!map.has(key)) {
        map.set(key, {
          id: product.category_id || key,
          slug: product.category_slug || key,
          name: product.category_name || "Other Products",
        });
      }
    });
    return Array.from(map.values());
  };

  const normalizeProduct = (product, categoriesMap) => {
    const category = categoriesMap.get(product.category_id) || null;
    const retailPrice = Number(product.retail_price);
    const compareAtPrice = Number(product.compare_at_price);
    const hasValidComparePrice = Number.isFinite(compareAtPrice) && compareAtPrice > retailPrice;
    const fallbackComparePrice =
      Number.isFinite(retailPrice) && retailPrice > 0
        ? Math.ceil(retailPrice * 1.18)
        : null;

    return {
      ...product,
      category_name: category?.name || product.category_name || "Other Products",
      category_slug: category?.slug || product.category_slug || "other-products",
      display_image: resolveProductImageUrl(product),
      retail_price: retailPrice,
      compare_at_price: hasValidComparePrice ? compareAtPrice : fallbackComparePrice,
    };
  };

  const setSource = (title, note) => {
    if (sourceTarget instanceof HTMLElement) {
      sourceTarget.textContent = title;
    }
    if (sourceNoteTarget instanceof HTMLElement) {
      sourceNoteTarget.textContent = note;
    }
  };

  const renderCategories = () => {
    const categories = [{ slug: "all", name: "All products" }, ...state.categories];
    categoryTarget.innerHTML = categories
      .map(
        (category) => `
          <button class="storefront-category-button ${state.activeCategory === category.slug ? "is-active" : ""}" type="button" data-store-category="${escapeHtml(category.slug)}">
            ${escapeHtml(category.name)}
          </button>
        `
      )
      .join("");

    categoryTarget.querySelectorAll("[data-store-category]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeCategory = button.getAttribute("data-store-category") || "all";
        renderCategories();
        renderProducts();
      });
    });
  };

  const renderProducts = () => {
    const query = state.query.trim().toLowerCase();
    const matchingProducts = state.products.filter((product) => {
      const inCategory = state.activeCategory === "all" || product.category_slug === state.activeCategory;
      const haystack = [
        product.name,
        product.brand,
        product.model,
        product.short_description,
        product.category_name,
      ]
        .join(" ")
        .toLowerCase();

      return inCategory && (!query || haystack.includes(query));
    });
    const visibleProducts = getCatalogDisplayProducts(matchingProducts);

    if (countTarget instanceof HTMLElement) {
      countTarget.textContent = `${visibleProducts.length} product${visibleProducts.length === 1 ? "" : "s"} visible`;
    }

    if (!visibleProducts.length) {
      productTarget.innerHTML = `
        <article class="storefront-card storefront-card--empty">
          <div class="storefront-card__body">
            <span class="storefront-card__pill">No results</span>
            <h3>No products matched this filter</h3>
            <p>Try another category or clear the search to show all loaded products.</p>
          </div>
        </article>
      `;
      return;
    }

    productTarget.innerHTML = visibleProducts.map((product) => createCatalogCard(product)).join("");
  };

  const loadStorefrontData = async () => {
    const { supabaseUrl, supabaseAnonKey } = window.TECHM8_CONFIG || {};

    if (!supabaseUrl || !supabaseAnonKey) {
      state.products = fallbackProducts;
      state.categories = deriveCategories(fallbackProducts);
      setSource("Starter sample data", "Supabase config is missing, so the page is showing the first 5 controller products locally.");
      renderCategories();
      renderProducts();
      return;
    }

    try {
      const headers = {
        Accept: "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      };

      const categoriesUrl = `${supabaseUrl}/rest/v1/categories?select=id,slug,name,sort_order&order=sort_order.asc`;
      const productsUrl = `${supabaseUrl}/rest/v1/products?select=id,sku,slug,name,brand,model,short_description,retail_price,compare_at_price,image_url,stock_quantity,is_featured,condition_label,compatibility,category_id,created_at,upc&is_visible=eq.true&order=created_at.desc`;

      const [categoriesResponse, productsResponse] = await Promise.all([
        fetch(categoriesUrl, { headers, cache: "no-store" }),
        fetch(productsUrl, { headers, cache: "no-store" }),
      ]);

      if (!categoriesResponse.ok || !productsResponse.ok) {
        throw new Error("The product catalog could not be loaded from Supabase.");
      }

      const categories = await categoriesResponse.json();
      const products = await productsResponse.json();
      const categoriesMap = new Map(categories.map((category) => [category.id, category]));
      const normalizedProducts = applyProductVariantData(
        products
          .map((product) => normalizeProduct(product, categoriesMap))
          .sort(compareProductsByLatest)
      );

      if (normalizedProducts.length) {
        state.products = normalizedProducts;
        state.categories = categories.filter((category) =>
          normalizedProducts.some((product) => product.category_id === category.id)
        );
        setSource("Live Supabase products", "This page is rendering visible product rows directly from the Supabase catalog.");
      } else {
        state.products = fallbackProducts;
        state.categories = deriveCategories(fallbackProducts);
        setSource("Starter sample data", "No live product rows were found yet, so the first 5 controller products are shown as a fallback starter catalog.");
      }

      renderCategories();
      renderProducts();
    } catch (error) {
      state.products = fallbackProducts;
      state.categories = deriveCategories(fallbackProducts);
      setSource("Starter sample data", "Supabase could not be reached from this page, so the first 5 controller products are shown locally.");
      renderCategories();
      renderProducts();
    }
  };

  if (searchField instanceof HTMLInputElement) {
    searchField.addEventListener("input", () => {
      state.query = searchField.value || "";
      renderProducts();
    });
  }

  loadStorefrontData();
}

function getFallbackCatalogProducts() {
  return applyProductVariantData([
    {
      id: "sample-1",
      sku: "TM8-PS5-DS-STERLING-SILVER",
      slug: "dualsense-wireless-controller-sterling-silver-playstation-5",
      name: "DualSense Wireless Controller - Sterling Silver - PlayStation 5",
      brand: "Sony",
      model: "DualSense Wireless Controller",
      short_description: "Official PS5 DualSense controller in Sterling Silver finish.",
      description: "Official PlayStation 5 DualSense wireless controller in Sterling Silver finish.",
      retail_price: 115,
      compare_at_price: 124,
      image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-sterling-silver-playstation-5.jpg",
      supplier_image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-sterling-silver-playstation-5.jpg",
      stock_quantity: 0,
      is_featured: true,
      condition_label: "New",
      compatibility: "PlayStation 5",
      category_id: "sample-ps5",
      category_name: "PS5 Controllers",
      category_slug: "ps5-controllers",
      category_description: "PlayStation 5 wireless controller range.",
    },
    {
      id: "sample-2",
      sku: "TM8-PS5-DS-COSMIC-RED",
      slug: "dualsense-wireless-controller-cosmic-red-playstation-5",
      name: "DualSense Wireless Controller - Cosmic Red - PlayStation 5",
      brand: "Sony",
      model: "DualSense Wireless Controller",
      short_description: "Official PS5 DualSense controller in Cosmic Red finish.",
      description: "Official PlayStation 5 DualSense wireless controller in Cosmic Red finish.",
      retail_price: 109,
      compare_at_price: 129,
      image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-cosmic-red-playstation-5.jpg",
      supplier_image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-cosmic-red-playstation-5.jpg",
      stock_quantity: 0,
      is_featured: true,
      condition_label: "New",
      compatibility: "PlayStation 5",
      category_id: "sample-ps5",
      category_name: "PS5 Controllers",
      category_slug: "ps5-controllers",
      category_description: "PlayStation 5 wireless controller range.",
    },
    {
      id: "sample-3",
      sku: "TM8-PS5-DS-GRAY-CAMO",
      slug: "dualsense-wireless-controller-gray-camouflage",
      name: "DualSense Wireless Controller - Gray Camouflage",
      brand: "Sony",
      model: "DualSense Wireless Controller",
      short_description: "Official PS5 DualSense controller in Gray Camouflage finish.",
      description: "Official PlayStation 5 DualSense wireless controller in Gray Camouflage finish.",
      retail_price: 109,
      compare_at_price: 129,
      image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-gray-camouflage.jpg",
      supplier_image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-gray-camouflage.jpg",
      stock_quantity: 0,
      is_featured: true,
      condition_label: "New",
      compatibility: "PlayStation 5",
      category_id: "sample-ps5",
      category_name: "PS5 Controllers",
      category_slug: "ps5-controllers",
      category_description: "PlayStation 5 wireless controller range.",
    },
    {
      id: "sample-4",
      sku: "TM8-PS5-DS-BLACK",
      slug: "copy-of-dualsense-wireless-controller-playstation-5-black",
      name: "DualSense Wireless Controller - PlayStation 5 - Black",
      brand: "Sony",
      model: "DualSense Wireless Controller",
      short_description: "Official PS5 DualSense controller in Black finish.",
      description: "Official PlayStation 5 DualSense wireless controller in Black finish.",
      retail_price: 109,
      compare_at_price: 129,
      image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/copy-of-dualsense-wireless-controller-playstation-5-black.jpg",
      supplier_image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/copy-of-dualsense-wireless-controller-playstation-5-black.jpg",
      stock_quantity: 0,
      is_featured: true,
      condition_label: "New",
      compatibility: "PlayStation 5",
      category_id: "sample-ps5",
      category_name: "PS5 Controllers",
      category_slug: "ps5-controllers",
      category_description: "PlayStation 5 wireless controller range.",
    },
    {
      id: "sample-5",
      sku: "TM8-PS5-DS-WHITE",
      slug: "dualsense-wireless-controller-playstation-5-white",
      name: "DualSense Wireless Controller - PlayStation 5 - White",
      brand: "Sony",
      model: "DualSense Wireless Controller",
      short_description: "Official PS5 DualSense controller in White finish.",
      description: "Official PlayStation 5 DualSense wireless controller in White finish.",
      retail_price: 109,
      compare_at_price: 129,
      image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-playstation-5-white.jpg",
      supplier_image_url: "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-playstation-5-white.jpg",
      stock_quantity: 0,
      is_featured: true,
      condition_label: "New",
      compatibility: "PlayStation 5",
      category_id: "sample-ps5",
      category_name: "PS5 Controllers",
      category_slug: "ps5-controllers",
      category_description: "PlayStation 5 wireless controller range.",
    },
  ]).map((product, index) => ({
    ...product,
    catalog_index: index,
    display_image: resolveProductImageUrl(product),
    gallery_images: product.image_url
      ? [{ product_id: product.id, image_url: product.image_url, alt_text: product.name || "", sort_order: 0 }]
      : [],
  }));
}

async function loadSharedCatalogData() {
  const { supabaseUrl, supabaseAnonKey } = window.TECHM8_CONFIG || {};

  if (!supabaseUrl || !supabaseAnonKey) {
    const products = getFallbackCatalogProducts();
    return {
      products,
      categories: [
        { slug: "ps5-controllers", name: "PS5 Controllers", description: "PlayStation 5 wireless controller range." },
      ],
    };
  }

  try {
    const headers = {
      Accept: "application/json",
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    };
    const categoriesUrl = `${supabaseUrl}/rest/v1/categories?select=id,slug,name,description,sort_order&order=sort_order.asc`;
    const productsUrl = `${supabaseUrl}/rest/v1/products?select=id,sku,slug,name,brand,model,short_description,description,retail_price,compare_at_price,image_url,stock_quantity,is_featured,condition_label,compatibility,category_id,created_at,upc&is_visible=eq.true&order=created_at.desc,id.desc`;
    const productImagesUrl = `${supabaseUrl}/rest/v1/product_images?select=product_id,image_url,alt_text,sort_order&order=sort_order.asc`;

    const [categoriesResult, productsResult, productImagesResult] = await Promise.allSettled([
      fetch(categoriesUrl, { headers, cache: "no-store" }),
      fetch(productsUrl, { headers, cache: "no-store" }),
      fetch(productImagesUrl, { headers, cache: "no-store" }),
    ]);

    if (productsResult.status !== "fulfilled" || !productsResult.value.ok) {
      throw new Error("Products request failed");
    }

    const products = await productsResult.value.json();
    const categories =
      categoriesResult.status === "fulfilled" && categoriesResult.value.ok
        ? await categoriesResult.value.json()
        : [];
    const productImages =
      productImagesResult.status === "fulfilled" && productImagesResult.value.ok
        ? await productImagesResult.value.json()
        : [];

    const categoriesMap = new Map(categories.map((category) => [category.id, category]));
    const galleryMap = new Map();

    productImages.forEach((image) => {
      if (!image?.product_id || !image?.image_url) return;
      if (!galleryMap.has(image.product_id)) {
        galleryMap.set(image.product_id, []);
      }
      galleryMap.get(image.product_id).push({
        product_id: image.product_id,
        image_url: image.image_url,
        alt_text: image.alt_text || "",
        sort_order: Number(image.sort_order) || 0,
      });
    });

    const normalizedProducts = products.map((product, index) => {
      const category = categoriesMap.get(product.category_id) || null;
      const retailPrice = Number(product.retail_price);
      const compareAtPrice = Number(product.compare_at_price);
      const safeRetailPrice = Number.isFinite(retailPrice) && retailPrice > 0 ? retailPrice : 0;
      const galleryImages = Array.isArray(galleryMap.get(product.id))
        ? galleryMap.get(product.id).slice().sort((left, right) => (Number(left.sort_order) || 0) - (Number(right.sort_order) || 0))
        : [];
      const fallbackGallery =
        product.image_url && !galleryImages.length
          ? [{ product_id: product.id, image_url: product.image_url, alt_text: product.name || "", sort_order: 0 }]
          : [];
      const finalGallery = galleryImages.length ? galleryImages : fallbackGallery;

      return {
        ...product,
        catalog_index: index,
        retail_price: safeRetailPrice,
        compare_at_price:
          Number.isFinite(compareAtPrice) && compareAtPrice > safeRetailPrice
            ? compareAtPrice
            : Math.ceil(safeRetailPrice * 1.18),
        display_image: finalGallery[0]?.image_url || resolveProductImageUrl(product),
        gallery_images: finalGallery,
        category_slug: category?.slug || "other-products",
        category_name: category?.name || "Other Products",
        category_description: category?.description || "",
      };
    }).sort(compareProductsByLatest);

    const derivedCategories = categories.length
      ? categories
      : Array.from(
          new Map(
            normalizedProducts.map((product) => [
              product.category_slug || `category-${product.category_id || product.id}`,
              {
                id: product.category_id || product.category_slug || product.id,
                slug: product.category_slug || `category-${product.category_id || product.id}`,
                name: product.category_name || "Other Products",
                description: product.category_description || "",
                sort_order: 999,
              },
            ])
          ).values()
        );

    const catalogProducts = normalizedProducts.length ? applyProductVariantData(normalizedProducts) : getFallbackCatalogProducts();

    return {
      products: catalogProducts,
      categories: derivedCategories.length
        ? derivedCategories
        : [{ slug: "ps5-controllers", name: "PS5 Controllers", description: "PlayStation 5 wireless controller range." }],
    };
  } catch (error) {
    const products = getFallbackCatalogProducts();
    return {
      products,
      categories: [{ slug: "ps5-controllers", name: "PS5 Controllers", description: "PlayStation 5 wireless controller range." }],
    };
  }
}

function getProductGalleryImages(product) {
  if (Array.isArray(product?.gallery_images) && product.gallery_images.length) {
    return product.gallery_images
      .filter((item) => item?.image_url)
      .sort((left, right) => (Number(left?.sort_order) || 0) - (Number(right?.sort_order) || 0));
  }

  if (product?.display_image || product?.image_url) {
    return [
      {
        image_url: resolveProductImageUrl(product),
        alt_text: product.name || "",
        sort_order: 0,
      },
    ];
  }

  return [
    {
      image_url: DEFAULT_PRODUCT_IMAGE_URL,
      alt_text: product?.name || "TECHM8 product image coming soon",
      sort_order: 0,
    },
  ];
}

function createCatalogCard(product) {
  const detailUrl = `product.html?slug=${encodeURIComponent(product.slug)}`;
  const categoryUrl = `category.html?slug=${encodeURIComponent(product.category_slug)}`;
  const retailPrice = Number(product.retail_price) || 0;
  const compareAtPrice = Number(product.compare_at_price) || 0;
  const productName = getProductDisplayName(product) || product.name;
  const comparePrice =
    Number.isFinite(compareAtPrice) && compareAtPrice > retailPrice
      ? `<span class="storefront-card__compare">${escapeHtml(formatMoney(compareAtPrice))}</span>`
      : "";
  const savingsAmount =
    Number.isFinite(compareAtPrice) && compareAtPrice > retailPrice
      ? compareAtPrice - retailPrice
      : 0;
  const savingsPill =
    savingsAmount > 0
      ? `<span class="storefront-card__saving">Save ${escapeHtml(formatMoney(savingsAmount))}</span>`
      : "";
  const stockLabel =
    Number(product.stock_quantity) > 0
      ? `${escapeHtml(String(product.stock_quantity))} in network stock`
      : "Stock to be updated";
  const imageMarkup = product.display_image
    ? `<img class="storefront-card__image" src="${escapeHtml(product.display_image)}" alt="${escapeHtml(productName)}" loading="lazy">`
    : `<div class="storefront-card__image storefront-card__image--placeholder" aria-hidden="true">TECHM8</div>`;
  const stockClass = Number(product.stock_quantity) > 0 ? "is-in-stock" : "is-pending";

  return `
    <article class="storefront-card storefront-card--commerce">
      <a class="storefront-card__media-link" href="${detailUrl}">
        <div class="storefront-card__media">${imageMarkup}</div>
      </a>
      <div class="storefront-card__body">
        <div class="storefront-card__top">
          <a class="storefront-card__pill storefront-card__pill--link" href="${categoryUrl}">${escapeHtml(product.category_name)}</a>
          ${product.is_featured ? '<span class="storefront-card__tag">Featured</span>' : savingsPill}
        </div>
        <a class="storefront-card__title-link" href="${detailUrl}">
          <h3>${escapeHtml(productName)}</h3>
        </a>
        <p class="storefront-card__summary">${escapeHtml(product.short_description || "Retail catalog product.")}</p>
        ${renderVariantSummary(product, "storefront-card")}
        <div class="storefront-card__price-row storefront-card__price-row--stacked">
          <div class="storefront-card__price-meta">${comparePrice}</div>
          <strong>${escapeHtml(formatMoney(retailPrice))}</strong>
        </div>
        <div class="storefront-card__meta">
          <span>${escapeHtml(product.brand || "TECHM8")}</span>
          <span>${escapeHtml(product.compatibility || "Store product")}</span>
        </div>
        <div class="storefront-card__footer">
          <span class="storefront-card__stock ${stockClass}">${escapeHtml(stockLabel)}</span>
          <div class="storefront-card__actions">
            <button class="storefront-card__action storefront-card__action--primary" type="button" data-add-cart-slug="${escapeHtml(product.slug)}">Add to cart</button>
            <a class="storefront-card__action storefront-card__action--secondary" href="${detailUrl}">Details</a>
          </div>
        </div>
      </div>
    </article>
  `;
}

function selectLatestHomeProducts(products, limit = 6) {
  return getLatestDisplayProducts(products, limit);
}

function createHomeFeaturedCard(product) {
  const detailUrl = `product.html?slug=${encodeURIComponent(product.slug)}`;
  const categoryUrl = `category.html?slug=${encodeURIComponent(product.category_slug)}`;
  const retailPrice = Number(product.retail_price) || 0;
  const compareAtPrice = Number(product.compare_at_price) || 0;
  const hasComparePrice = Number.isFinite(compareAtPrice) && compareAtPrice > retailPrice;
  const productName = getProductDisplayName(product) || product.name;
  const imageMarkup = product.display_image
    ? `<img src="${escapeHtml(product.display_image)}" alt="${escapeHtml(productName)}" loading="lazy">`
    : `<div class="home-product-card__image-placeholder" aria-hidden="true">TECHM8</div>`;

  return `
    <article class="home-product-card">
      <a class="home-product-card__media" href="${detailUrl}">
        ${imageMarkup}
      </a>
      <div class="home-product-card__content">
          <div class="home-product-card__row">
            <a class="home-product-card__eyebrow" href="${categoryUrl}">${escapeHtml(product.category_name || "Latest product")}</a>
            <span class="home-product-card__pill">${product.is_featured ? "Featured" : "New"}</span>
          </div>
          <a class="home-product-card__title-link" href="${detailUrl}">
            <h3>${escapeHtml(productName)}</h3>
          </a>
          <p class="home-product-card__summary">${escapeHtml(product.short_description || product.description || "Latest item from the TECHM8 online catalog.")}</p>
          ${renderVariantSummary(product, "home-product-card")}
          <div class="home-product-card__price-row">
            <strong>${escapeHtml(formatMoney(retailPrice))}</strong>
            ${hasComparePrice ? `<span class="home-product-card__compare">${escapeHtml(formatMoney(compareAtPrice))}</span>` : ""}
          </div>
        <div class="home-product-card__meta">
          <span>${escapeHtml(product.brand || "TECHM8")}</span>
          <a href="${detailUrl}">View details</a>
        </div>
      </div>
    </article>
  `;
}

function initHomeFeaturedProducts() {
  const grid = document.querySelector("[data-home-featured-grid]");
  if (!(grid instanceof HTMLElement)) return;

  const render = (products) => {
    const latestProducts = selectLatestHomeProducts(products, 6);
    grid.innerHTML = latestProducts.length
      ? latestProducts.map((product) => createHomeFeaturedCard(product)).join("")
      : `<article class="home-product-card home-product-card--loading"><div class="home-product-card__content"><div class="home-product-card__row"><h3>No products available yet</h3><span class="home-product-card__pill">Catalog</span></div><p class="home-product-card__summary">Add products in Supabase and the newest six items will appear here automatically.</p></div></article>`;
  };

  loadSharedCatalogData()
    .then(({ products }) => {
      render(products);
    })
    .catch(() => {
      render(getFallbackCatalogProducts());
    });
}

function bindCartButtons(container, products, options = {}) {
  if (!(container instanceof HTMLElement) || container.dataset.cartBound === "true") {
    return;
  }

  container.dataset.cartBound = "true";

  container.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const button = target.closest("[data-add-cart-slug]");
    if (!(button instanceof HTMLElement)) return;

    event.preventDefault();
    const slug = button.getAttribute("data-add-cart-slug") || "";
    const qty = Number(button.getAttribute("data-add-cart-qty") || "1") || 1;
    const source = typeof products === "function" ? products() : products;
    const product = Array.isArray(source) ? source.find((item) => item.slug === slug) : null;
    if (!product) return;

    addItemToCart(product, qty);

    const original = button.textContent || "Add to cart";
    button.textContent = options.confirmText || "Added";
    window.setTimeout(() => {
      button.textContent = original;
    }, 1200);
  });
}

function initCategoryPage() {
  const root = document.querySelector("[data-category-page]");
  if (!(root instanceof HTMLElement)) return;

  const titleTarget = root.querySelector("[data-category-title]");
  const descriptionTarget = root.querySelector("[data-category-description]");
  const countTarget = root.querySelector("[data-category-count]");
  const productsTarget = root.querySelector("[data-category-products]");
  const linksTarget = root.querySelector("[data-category-links]");
  const searchField = root.querySelector("[data-category-search]");
  const breadcrumbTarget = root.querySelector("[data-category-breadcrumb]");
  if (!(productsTarget instanceof HTMLElement)) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug") || "";

  loadSharedCatalogData().then(({ products, categories }) => {
    bindCartButtons(productsTarget, products);
    const category = categories.find((item) => item.slug === slug);

    if (!category) {
      productsTarget.innerHTML = `<article class="storefront-card storefront-card--empty"><div class="storefront-card__body"><span class="storefront-card__pill">Missing category</span><h3>Category not found</h3><p>Return to the online store and choose another category.</p><div class="storefront-card__actions"><a href="shop.html">Back to online store</a></div></div></article>`;
      return;
    }

    if (titleTarget instanceof HTMLElement) titleTarget.textContent = category.name;
    if (descriptionTarget instanceof HTMLElement) descriptionTarget.textContent = category.description || `Browse all products in ${category.name}.`;
    if (breadcrumbTarget instanceof HTMLElement) breadcrumbTarget.textContent = category.name;
    if (linksTarget instanceof HTMLElement) {
      linksTarget.innerHTML = categories
        .map((item) => `<a class="storefront-category-link ${item.slug === slug ? "is-active" : ""}" href="category.html?slug=${encodeURIComponent(item.slug)}">${escapeHtml(item.name)}</a>`)
        .join("");
    }

    const render = () => {
      const query = searchField instanceof HTMLInputElement ? searchField.value.trim().toLowerCase() : "";
      const matchingProducts = products.filter((product) => {
        const haystack = [product.name, product.brand, product.model, product.short_description].join(" ").toLowerCase();
        return product.category_slug === slug && (!query || haystack.includes(query));
      });
      const visibleProducts = getCatalogDisplayProducts(matchingProducts);

      if (countTarget instanceof HTMLElement) {
        countTarget.textContent = `${visibleProducts.length} product${visibleProducts.length === 1 ? "" : "s"}`;
      }

      productsTarget.innerHTML = visibleProducts.length
        ? visibleProducts.map((product) => createCatalogCard(product)).join("")
        : `<article class="storefront-card storefront-card--empty"><div class="storefront-card__body"><span class="storefront-card__pill">No results</span><h3>No products matched this search</h3><p>Try another keyword or return to the full online store.</p></div></article>`;
    };

    if (searchField instanceof HTMLInputElement) {
      searchField.addEventListener("input", render);
    }

    render();
  });
}

function initProductDetailPage() {
  const root = document.querySelector("[data-product-page]");
  if (!(root instanceof HTMLElement)) return;

  const shell = root.querySelector("[data-product-shell]");
  if (!(shell instanceof HTMLElement)) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug") || "";

  loadSharedCatalogData().then(({ products }) => {
    const product = products.find((item) => item.slug === slug);
    if (!product) {
      shell.innerHTML = `<article class="storefront-card storefront-card--empty"><div class="storefront-card__body"><span class="storefront-card__pill">Missing product</span><h3>Product not found</h3><p>Return to the online store and select another item.</p><div class="storefront-card__actions"><a href="shop.html">Back to online store</a></div></div></article>`;
      return;
    }

    const compareAtPrice = Number(product.compare_at_price) || 0;
    const retailPrice = Number(product.retail_price) || 0;
    const savings = compareAtPrice > retailPrice ? compareAtPrice - retailPrice : 0;
    const stockText = Number(product.stock_quantity) > 0 ? `${product.stock_quantity} available across stores` : "Store stock is updated in-store";
    const productName = getProductDisplayName(product) || product.name;
    const productColor = getProductVariantColor(product);
    const galleryImages = getOrderedProductGalleryImages(product);
    const mainImage = galleryImages[0] || null;
    const variantOptions = Array.isArray(product.variant_options) ? product.variant_options : [];
    const productGroupKey = product.variant_group_key || product.slug;
    const relatedProducts = getCatalogDisplayProducts(
      products.filter((item) => item.category_slug === product.category_slug && (item.variant_group_key || item.slug) !== productGroupKey)
    )
      .sort(compareProductsByLatest)
      .slice(0, 4);
    const variantMarkup =
      variantOptions.length > 1
        ? `
          <div class="storefront-pdp__variant-picker">
            <span class="storefront-pdp__variant-label">Colour</span>
            <div class="storefront-pdp__variant-options">
              ${variantOptions
                .map(
                  (option) => `
                    <a
                      class="storefront-pdp__variant ${option.is_active ? "is-active" : ""}"
                      href="product.html?slug=${encodeURIComponent(option.slug)}"
                    >${escapeHtml(option.label)}</a>
                  `
                )
                .join("")}
            </div>
          </div>
        `
        : "";

    document.title = `${productName} | TECHM8 Online Store`;
    shell.innerHTML = `
      <div class="storefront-breadcrumbs">
        <a href="index.html">Home</a>
        <span>/</span>
        <a href="shop.html">Online Store</a>
        <span>/</span>
        <a href="category.html?slug=${encodeURIComponent(product.category_slug)}">${escapeHtml(product.category_name)}</a>
        <span>/</span>
        <span>${escapeHtml(productName)}</span>
      </div>

      <section class="storefront-pdp">
        <div class="storefront-pdp__gallery">
          <div class="storefront-pdp__gallery-main">
            ${mainImage ? `<img src="${escapeHtml(mainImage.image_url)}" alt="${escapeHtml(mainImage.alt_text || product.name)}" data-pdp-main-image>` : `<div class="storefront-card__image storefront-card__image--placeholder">TECHM8</div>`}
          </div>
          ${
            galleryImages.length > 1
              ? `
                <div class="storefront-pdp__gallery-thumbs">
                  ${galleryImages
                    .map(
                      (image, index) => `
                        <button
                          class="storefront-pdp__thumb ${index === 0 ? "is-active" : ""}"
                          type="button"
                          data-pdp-thumb
                          data-image-src="${escapeHtml(image.image_url)}"
                          data-image-alt="${escapeHtml(image.alt_text || product.name)}"
                          aria-label="View image ${index + 1}"
                        >
                          <img src="${escapeHtml(image.image_url)}" alt="${escapeHtml(image.alt_text || product.name)}" loading="lazy">
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
              : ""
          }
          <div class="storefront-pdp__gallery-note">
            <strong>${galleryImages.length > 1 ? `${galleryImages.length} product images` : "Product image"}</strong>
            <span>Catalog images are stored in Supabase and linked to the live storefront.</span>
          </div>
        </div>

        <div class="storefront-pdp__summary">
          <p class="eyebrow">Online store item</p>
          <div class="storefront-pdp__brand-row">
            <span class="storefront-pdp__brand">${escapeHtml(product.brand || "TECHM8")}</span>
            <span class="storefront-pdp__stock">${escapeHtml(stockText)}</span>
          </div>
          <h1>${escapeHtml(productName)}</h1>
          <p class="storefront-pdp__intro">${escapeHtml(product.description || product.short_description || "Retail catalog product.")}</p>

          <div class="storefront-pdp__price-card">
            <div class="storefront-pdp__price-top">
              ${compareAtPrice > retailPrice ? `<span class="storefront-pdp__compare">${escapeHtml(formatMoney(compareAtPrice))}</span>` : ""}
              ${savings > 0 ? `<span class="storefront-pdp__save">Save ${escapeHtml(formatMoney(savings))}</span>` : ""}
            </div>
            <div class="storefront-pdp__price-main">${escapeHtml(formatMoney(retailPrice))}</div>
            <p class="storefront-pdp__price-note">Final in-store pricing and stock can be confirmed by your nearest TECHM8 location.</p>
          </div>

          ${variantMarkup}

          <div class="storefront-pdp__purchase">
            <label class="storefront-pdp__qty">
              <span>Qty</span>
              <input type="number" min="1" value="1" data-product-qty>
            </label>
            <button class="button button--primary storefront-pdp__cart-button" type="button" data-product-add-cart>Add to cart</button>
            <a class="button button--ghost" href="stores.html">Find in store</a>
          </div>

          <div class="storefront-pdp__highlights">
            <div class="storefront-pdp__highlight"><strong>Brand</strong><span>${escapeHtml(product.brand || "TECHM8")}</span></div>
            <div class="storefront-pdp__highlight"><strong>Category</strong><span>${escapeHtml(product.category_name)}</span></div>
            <div class="storefront-pdp__highlight"><strong>Model</strong><span>${escapeHtml(product.model || "Store product")}</span></div>
            <div class="storefront-pdp__highlight"><strong>Colour</strong><span>${escapeHtml(productColor || "Standard")}</span></div>
            <div class="storefront-pdp__highlight"><strong>Compatibility</strong><span>${escapeHtml(product.compatibility || "General use")}</span></div>
            <div class="storefront-pdp__highlight"><strong>SKU</strong><span>${escapeHtml(product.sku || "To be assigned")}</span></div>
            <div class="storefront-pdp__highlight"><strong>UPC</strong><span>${escapeHtml(product.upc || "Not listed")}</span></div>
            <div class="storefront-pdp__highlight"><strong>Pickup</strong><span>Select a TECHM8 store at checkout</span></div>
          </div>
        </div>
      </section>

      <section class="storefront-pdp__content">
        <div class="storefront-pdp__content-main">
          <article class="storefront-pdp__panel">
            <div class="section-heading section-heading--split">
              <div>
                <p class="eyebrow">Overview</p>
                <h2>Product overview</h2>
              </div>
            </div>
            <p>${escapeHtml(product.description || product.short_description || "Retail catalog product.")}</p>
          </article>

          <article class="storefront-pdp__panel">
            <div class="section-heading section-heading--split">
              <div>
                <p class="eyebrow">Key details</p>
                <h2>What customers need to know</h2>
              </div>
            </div>
            <div class="storefront-pdp__facts">
              <div><strong>Current selling price</strong><span>${escapeHtml(formatMoney(retailPrice))}</span></div>
              <div><strong>Original / compare price</strong><span>${compareAtPrice > retailPrice ? escapeHtml(formatMoney(compareAtPrice)) : "Not listed"}</span></div>
              <div><strong>Availability</strong><span>${escapeHtml(stockText)}</span></div>
              <div><strong>Category link</strong><span><a href="category.html?slug=${encodeURIComponent(product.category_slug)}">${escapeHtml(product.category_name)}</a></span></div>
            </div>
          </article>
        </div>

        <aside class="storefront-pdp__sidebar">
          <article class="storefront-pdp__sidecard">
            <p class="eyebrow">Why buy here</p>
            <ul class="storefront-pdp__bullets">
              <li>Product data comes from the live TECHM8 catalog.</li>
              <li>Store pickup can be matched to your nearest location.</li>
              <li>Catalog structure is ready for future POS integration.</li>
            </ul>
          </article>

          <article class="storefront-pdp__sidecard">
            <p class="eyebrow">Need support first?</p>
            <a class="button button--secondary" href="book-repair.html">Book a repair</a>
          </article>
        </aside>
      </section>

      <section class="section">
        <div class="section-heading section-heading--split">
          <div>
            <p class="eyebrow">Related products</p>
            <h2>Customers also view</h2>
          </div>
          <a href="category.html?slug=${encodeURIComponent(product.category_slug)}">View ${escapeHtml(product.category_name)}</a>
        </div>
        <div class="storefront-grid storefront-grid--dense" data-product-related>
          ${relatedProducts.length
            ? relatedProducts.map((item) => createCatalogCard(item)).join("")
            : `<article class="storefront-card storefront-card--empty"><div class="storefront-card__body"><span class="storefront-card__pill">No related items</span><h3>No more products in this category yet</h3><p>More items can be added from the database later.</p></div></article>`}
        </div>
      </section>
    `;

    const addButton = shell.querySelector("[data-product-add-cart]");
    const qtyField = shell.querySelector("[data-product-qty]");
    const mainImageTarget = shell.querySelector("[data-pdp-main-image]");
    const thumbnailButtons = shell.querySelectorAll("[data-pdp-thumb]");
    if (addButton instanceof HTMLButtonElement) {
      addButton.addEventListener("click", () => {
        const quantity = qtyField instanceof HTMLInputElement ? Math.max(1, Number(qtyField.value) || 1) : 1;
        addItemToCart(product, quantity);
        addButton.textContent = "Added to cart";
        window.setTimeout(() => {
          addButton.textContent = "Add to cart";
        }, 1200);
      });
    }

    if (mainImageTarget instanceof HTMLImageElement && thumbnailButtons.length) {
      thumbnailButtons.forEach((button) => {
        button.addEventListener("click", () => {
          if (!(button instanceof HTMLButtonElement)) return;
          const imageSrc = button.getAttribute("data-image-src") || "";
          const imageAlt = button.getAttribute("data-image-alt") || product.name || "";
          if (!imageSrc) return;
          mainImageTarget.src = imageSrc;
          mainImageTarget.alt = imageAlt;
          thumbnailButtons.forEach((item) => item.classList.remove("is-active"));
          button.classList.add("is-active");
        });
      });
    }

    const relatedTarget = shell.querySelector("[data-product-related]");
    if (relatedTarget instanceof HTMLElement) {
      bindCartButtons(relatedTarget, products);
    }
  });
}

function renderCartLineItems(target, items) {
  if (!(target instanceof HTMLElement)) return;

  if (!items.length) {
    target.innerHTML = `
      <article class="storefront-card storefront-card--empty">
        <div class="storefront-card__body">
          <span class="storefront-card__pill">Cart empty</span>
          <h3>Your cart is empty</h3>
          <p>Add products from the online store before checking out.</p>
          <div class="storefront-card__actions">
            <a href="shop.html">Return to online store</a>
          </div>
        </div>
      </article>
    `;
    return;
  }

  target.innerHTML = items.map((item) => {
    const lineTotal = (Number(item.price) || 0) * (Number(item.qty) || 0);
    return `
      <article class="storefront-cart__item">
        <a class="storefront-cart__media" href="product.html?slug=${encodeURIComponent(item.slug)}">
          ${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">` : `<div class="storefront-card__image storefront-card__image--placeholder">TECHM8</div>`}
        </a>
        <div class="storefront-cart__details">
          <div class="storefront-cart__top">
            <div>
              <p class="storefront-cart__eyebrow">${escapeHtml(item.category_name || "Store product")}</p>
              <h3><a href="product.html?slug=${encodeURIComponent(item.slug)}">${escapeHtml(item.name)}</a></h3>
            </div>
            <strong>${escapeHtml(formatMoney(lineTotal))}</strong>
          </div>
          <p class="storefront-cart__meta">${escapeHtml(item.brand || "TECHM8")} ${item.compatibility ? `· ${escapeHtml(item.compatibility)}` : ""}</p>
          <div class="storefront-cart__controls">
            <label>
              <span>Qty</span>
              <input type="number" min="1" value="${escapeHtml(String(item.qty))}" data-cart-qty="${escapeHtml(item.slug)}">
            </label>
            <span class="storefront-cart__price">${escapeHtml(formatMoney(item.price))} each</span>
            <button class="storefront-cart__remove" type="button" data-cart-remove="${escapeHtml(item.slug)}">Remove</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderCartSummary(target, items, options = {}) {
  if (!(target instanceof HTMLElement)) return;

  const subtotal = getCartSubtotal(items);
  const paymentProfile = options.paymentProfile || null;
  const paymentFee = paymentProfile ? calculatePaymentFee(subtotal, paymentProfile) : 0;
  const itemCount = getCartCount(items);
  const total = subtotal + paymentFee;
  target.innerHTML = `
    <div class="storefront-summary__row">
      <span>Items</span>
      <strong>${escapeHtml(String(itemCount))}</strong>
    </div>
    <div class="storefront-summary__row">
      <span>Subtotal</span>
      <strong>${escapeHtml(formatMoney(subtotal))}</strong>
    </div>
    <div class="storefront-summary__row storefront-summary__row--muted">
      <span>Store pickup</span>
      <strong>To be confirmed</strong>
    </div>
    <div class="storefront-summary__row storefront-summary__row--muted">
      <span>Payment fee</span>
      <strong>${escapeHtml(formatMoney(paymentFee))}</strong>
    </div>
    <div class="storefront-summary__row storefront-summary__row--total">
      <span>Total</span>
      <strong>${escapeHtml(formatMoney(total))}</strong>
    </div>
  `;
}

function selectRecommendedProducts(products, cartItems, limit = 5) {
  const safeProducts = Array.isArray(products) ? products.slice() : [];
  const cartSlugs = new Set((Array.isArray(cartItems) ? cartItems : []).map((item) => item.slug).filter(Boolean));
  const cartTerms = new Set();
  const latestProducts = safeProducts
    .slice()
    .sort((left, right) => (Number(left.catalog_index) || 0) - (Number(right.catalog_index) || 0));

  (Array.isArray(cartItems) ? cartItems : []).forEach((item) => {
    const text = [item.name, item.category_name, item.compatibility, item.brand].join(" ").toLowerCase();
    if (/charger|adapter|magsafe|usb-c/.test(text)) cartTerms.add("power");
    if (/controller|dualsense|playstation|xbox|nintendo/.test(text)) cartTerms.add("gaming");
    if (/case|glass|protector|cover/.test(text)) cartTerms.add("protection");
    if (/cable/.test(text)) cartTerms.add("cable");
  });

  const scored = safeProducts
    .filter((product) => product?.slug && !cartSlugs.has(product.slug))
    .map((product) => {
      const haystack = [product.name, product.category_name, product.compatibility, product.brand, product.short_description]
        .join(" ")
        .toLowerCase();
      let score = 0;
      if (cartTerms.has("power") && /charger|adapter|magsafe|usb-c|cable/.test(haystack)) score += 3;
      if (cartTerms.has("gaming") && /controller|playstation|xbox|gaming/.test(haystack)) score += 3;
      if (cartTerms.has("protection") && /case|protector|glass|cover|charger|cable/.test(haystack)) score += 2;
      if (cartTerms.has("cable") && /charger|adapter|usb-c|plug/.test(haystack)) score += 2;
      if (product.is_featured) score += 1;
      return { product, score };
    })
    .sort((left, right) => right.score - left.score || Number(right.product.is_featured) - Number(left.product.is_featured));

  const related = scored.filter((item) => item.score > 0).map((item) => item.product).slice(0, limit);
  if (related.length >= limit) {
    return related;
  }

  const seen = new Set(related.map((item) => item.slug));
  latestProducts.forEach((product) => {
    if (!product?.slug || seen.has(product.slug) || cartSlugs.has(product.slug) || related.length >= limit) return;
    related.push(product);
    seen.add(product.slug);
  });

  return related;
}

function renderRecommendedProducts(target, products, cartItems) {
  if (!(target instanceof HTMLElement)) return;
  const recommendations = selectRecommendedProducts(products, cartItems, 5);

  target.innerHTML = recommendations.length
    ? recommendations.map((product) => createCatalogCard(product)).join("")
    : `<article class="storefront-card storefront-card--empty"><div class="storefront-card__body"><span class="storefront-card__pill">No recommendations</span><h3>No extra products to suggest yet</h3><p>New catalog items will appear here automatically.</p></div></article>`;
}

function initCartPage() {
  const root = document.querySelector("[data-cart-page]");
  if (!(root instanceof HTMLElement)) return;

  const itemsTarget = root.querySelector("[data-cart-items]");
  const summaryTarget = root.querySelector("[data-cart-summary]");
  const recommendationsTarget = root.querySelector("[data-cart-recommendations]");
  const checkoutButtons = root.querySelectorAll("[data-cart-checkout]");
  if (!(itemsTarget instanceof HTMLElement) || !(summaryTarget instanceof HTMLElement)) return;
  let catalogProducts = [];

  const render = () => {
    const items = loadCart();
    renderCartLineItems(itemsTarget, items);
    renderCartSummary(summaryTarget, items);
    if (recommendationsTarget instanceof HTMLElement && catalogProducts.length) {
      renderRecommendedProducts(recommendationsTarget, catalogProducts, items);
    }
    checkoutButtons.forEach((button) => {
      if (button instanceof HTMLAnchorElement || button instanceof HTMLButtonElement) {
        button.toggleAttribute("disabled", !items.length);
        if (button instanceof HTMLAnchorElement) {
          button.setAttribute("aria-disabled", items.length ? "false" : "true");
          button.href = items.length ? "checkout.html" : "cart.html";
        }
      }
    });
  };

  itemsTarget.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const slug = target.getAttribute("data-cart-qty");
    if (!slug) return;
    updateCartItemQuantity(slug, target.value);
    render();
  });

  itemsTarget.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("[data-cart-remove]");
    if (!(button instanceof HTMLElement)) return;
    const slug = button.getAttribute("data-cart-remove") || "";
    removeCartItem(slug);
    render();
  });

  loadSharedCatalogData()
    .then(({ products }) => {
      catalogProducts = Array.isArray(products) ? products : [];
      if (recommendationsTarget instanceof HTMLElement) {
        bindCartButtons(recommendationsTarget, () => catalogProducts, { confirmText: "Added" });
      }
      render();
    })
    .catch(() => {
      catalogProducts = getFallbackCatalogProducts();
      if (recommendationsTarget instanceof HTMLElement) {
        bindCartButtons(recommendationsTarget, () => catalogProducts, { confirmText: "Added" });
      }
      render();
    });

  window.addEventListener("techm8:cart-updated", render);
  render();
}

function initCheckoutPage() {
  const root = document.querySelector("[data-checkout-page]");
  if (!(root instanceof HTMLElement)) return;

  const form = root.querySelector("[data-checkout-form]");
  const summaryTarget = root.querySelector("[data-checkout-summary]");
  const itemsTarget = root.querySelector("[data-checkout-items]");
  const messageTarget = root.querySelector("[data-checkout-message]");
  const paymentOptionsTarget = root.querySelector("[data-payment-options]");
  const paymentMethodField = root.querySelector("[data-payment-method]");
  const paymentNoteTarget = root.querySelector("[data-payment-note]");
  const storeField = root.querySelector("[data-checkout-store]");
  const warehouseOption = root.querySelector("[data-checkout-warehouse-option]");
  const storeDetailTarget = root.querySelector("[data-checkout-store-detail]");
  const stepTwo = root.querySelector("[data-checkout-step-two]");
  const shippingSection = root.querySelector("[data-checkout-shipping]");
  const shippingFields = Array.from(root.querySelectorAll("[data-checkout-shipping-field]"));
  if (!(form instanceof HTMLFormElement) || !(summaryTarget instanceof HTMLElement) || !(itemsTarget instanceof HTMLElement)) return;
  const submitButton = form.querySelector('button[type="submit"]');
  const paymentProfiles = [];
  const checkoutParams = new URLSearchParams(window.location.search);
  const isPaymentCancelled = checkoutParams.get("payment") === "cancelled";
  let activeAuthState = null;
  const supabaseAnonKey = window.TECHM8_CONFIG?.supabaseAnonKey || "";

  const getSelectedPaymentProfile = () => {
    const selectedCode =
      paymentMethodField instanceof HTMLInputElement
        ? String(paymentMethodField.value || "pay_in_store").trim()
        : "pay_in_store";
    return paymentProfiles.find((profile) => profile.code === selectedCode) || null;
  };

  const parseJsonResponse = async (response) => {
    const raw = await response.text();
    try {
      return raw ? JSON.parse(raw) : {};
    } catch (_error) {
      return {
        ok: false,
        error: raw || `Request failed with status ${response.status}.`,
      };
    }
  };

  const getVisiblePaymentProfiles = () => {
    const isWarehouseDispatch = isWarehouseDispatchSelected();
    return paymentProfiles.filter((profile) => {
      if (!profile || !profile.code || profile.is_enabled === false) return false;
      if (isWarehouseDispatch) {
        return profile.provider !== "manual";
      }
      return true;
    });
  };

  const isWarehouseDispatchSelected = () => {
    if (!(storeField instanceof HTMLSelectElement)) return false;
    return String(storeField.value || "").trim() === "warehouse-dispatch";
  };

  const renderStoreSelectionDetail = () => {
    if (!(storeDetailTarget instanceof HTMLElement) || !(storeField instanceof HTMLSelectElement)) return;
    const storeSlug = String(storeField.value || "").trim();
    const detail = STORE_CHECKOUT_DETAILS[storeSlug];

    if (!storeSlug || !detail) {
      storeDetailTarget.hidden = true;
      storeDetailTarget.innerHTML = "";
      return;
    }

    storeDetailTarget.hidden = false;
    storeDetailTarget.innerHTML = `
      <div class="storefront-checkout__delivery-detail-top">
        <div>
          <p class="storefront-checkout__delivery-mode">${escapeHtml(detail.mode)}</p>
          <h3>${escapeHtml(detail.title)}</h3>
        </div>
        <span class="storefront-checkout__delivery-chip">${escapeHtml(detail.mode)}</span>
      </div>
      <p class="storefront-checkout__delivery-summary">${escapeHtml(detail.summary)}</p>
      <div class="storefront-checkout__delivery-meta">
        <p><strong>Address</strong><span>${escapeHtml(detail.address)}</span></p>
        ${detail.phone ? `<p><strong>Phone</strong><span><a href="tel:${escapeHtml(detail.phone.replace(/\s+/g, ""))}">${escapeHtml(detail.phone)}</a></span></p>` : ""}
      </div>
      <div class="storefront-checkout__delivery-actions">
        ${detail.mapUrl ? `<a class="button button--ghost" href="${escapeHtml(detail.mapUrl)}" target="_blank" rel="noopener">Open in Maps</a>` : ""}
        ${detail.pageUrl ? `<a class="button button--secondary" href="${escapeHtml(detail.pageUrl)}">View store page</a>` : ""}
      </div>
    `;
  };

  const syncCheckoutMode = () => {
    const storeSlug = storeField instanceof HTMLSelectElement ? String(storeField.value || "").trim() : "";
    const isWarehouseDispatch = isWarehouseDispatchSelected();
    const showStepTwo = Boolean(storeSlug);
    const visibleProfiles = getVisiblePaymentProfiles();
    const selectedProfile = getSelectedPaymentProfile();

    if (paymentMethodField instanceof HTMLInputElement && visibleProfiles.length) {
      const selectedCode = selectedProfile?.code || "";
      if (!visibleProfiles.some((profile) => profile.code === selectedCode)) {
        const fallbackProfile = isWarehouseDispatch
          ? visibleProfiles[0]
          : visibleProfiles.find((profile) => profile.code === "pay_in_store") || visibleProfiles[0];
        paymentMethodField.value = fallbackProfile ? fallbackProfile.code : "";
      }
    }

    if (stepTwo instanceof HTMLElement) {
      stepTwo.hidden = !showStepTwo;
    }

    const showShipping = isWarehouseDispatch;
    if (shippingSection instanceof HTMLElement) {
      shippingSection.hidden = !showShipping;
    }

    shippingFields.forEach((field) => {
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) {
        return;
      }
      const fieldName = String(field.getAttribute("name") || "").trim();
      const isRequiredShippingField = ["recipient_name", "address_line_1", "suburb", "postcode", "state"].includes(fieldName);
      field.required = showShipping && isRequiredShippingField;
      if (!showShipping && field instanceof HTMLInputElement && field.type !== "hidden") {
        field.setCustomValidity("");
      }
    });
  };

  const formatFeeRule = (profile) => {
    if (!profile) return "";
    const percentage = Number(profile.percentage) || 0;
    const fixedAmount = Number(profile.fixed_amount) || 0;

    switch (profile.fee_type) {
      case "fixed":
        return `Fee ${formatMoney(fixedAmount)}`;
      case "percent":
        return `Fee ${percentage.toFixed(1)}%`;
      case "combined":
        return `Fee ${percentage.toFixed(1)}% + ${formatMoney(fixedAmount)}`;
      default:
        return "No extra fee";
    }
  };

  const getPaymentBadges = (profile) => {
    if (!profile) return [];
    if (profile.code === "card") {
      return [
        { label: "VISA", className: "storefront-payment-option__badge--visa" },
        { label: "Mastercard", className: "storefront-payment-option__badge--mc" },
        { label: "AMEX", className: "storefront-payment-option__badge--amex" },
        { label: "JCB", className: "storefront-payment-option__badge--jcb" },
        { label: "Apple Pay", className: "storefront-payment-option__badge--apple" },
      ];
    }
    if (profile.code === "afterpay_clearpay") {
      return [{ label: "Afterpay", className: "storefront-payment-option__badge--afterpay" }];
    }
    return [{ label: "In-store", className: "storefront-payment-option__badge--manual" }];
  };

  const getPaymentDescription = (profile) => {
    if (!profile) return "";
    if (profile.code === "card") {
      return "Supports major credit and debit cards. Apple Pay will appear automatically inside Stripe Checkout on supported devices and browsers.";
    }
    if (profile.code === "afterpay_clearpay") {
      return "Split payments with Afterpay inside Stripe Checkout when the cart and customer are eligible.";
    }
    if (profile.code === "wechat_pay") {
      return "Complete payment with WeChat Pay through Stripe Checkout when enabled for your account.";
    }
    return "No online redirect. The store will contact you and collect payment directly.";
  };

  const renderPaymentOptions = (subtotal) => {
    if (!(paymentOptionsTarget instanceof HTMLElement) || !(paymentMethodField instanceof HTMLInputElement)) return;
    const visibleProfiles = getVisiblePaymentProfiles();
    const currentCode = String(paymentMethodField.value || "").trim();
    if (!visibleProfiles.some((profile) => profile.code === currentCode)) {
      const fallbackProfile = visibleProfiles.find((profile) => profile.code === "pay_in_store") || visibleProfiles[0] || null;
      paymentMethodField.value = fallbackProfile ? fallbackProfile.code : "";
    }

    paymentOptionsTarget.innerHTML = visibleProfiles.map((profile) => {
      const estimate = calculatePaymentFee(subtotal, profile);
      const badges = getPaymentBadges(profile).map((badge) => {
        return `<span class="storefront-payment-option__badge ${badge.className}">${escapeHtml(badge.label)}</span>`;
      }).join("");
      const isSelected = getSelectedPaymentProfile()?.code === profile.code;

      return `
        <button
          class="storefront-payment-option ${isSelected ? "is-selected" : ""}"
          type="button"
          data-payment-option="${escapeHtml(profile.code)}"
          aria-pressed="${isSelected ? "true" : "false"}"
        >
          <span class="storefront-payment-option__radio" aria-hidden="true"></span>
          <span class="storefront-payment-option__body">
            <span class="storefront-payment-option__top">
              <strong class="storefront-payment-option__title">${escapeHtml(profile.label)}</strong>
              <span class="storefront-payment-option__fee">${escapeHtml(formatFeeRule(profile))}</span>
            </span>
            <span class="storefront-payment-option__meta">${badges}</span>
            <span class="storefront-payment-option__description">${escapeHtml(getPaymentDescription(profile))}</span>
          </span>
          <span class="storefront-payment-option__estimate">
            <strong>${escapeHtml(formatMoney(estimate))}</strong>
            <span>Current surcharge</span>
          </span>
        </button>
      `;
    }).join("");
  };

  const renderPaymentNote = () => {
    if (!(paymentNoteTarget instanceof HTMLElement)) return;
    const profile = getSelectedPaymentProfile();
    if (!profile) {
      paymentNoteTarget.hidden = true;
      paymentNoteTarget.textContent = "";
      return;
    }

    const notes = [];
    if (profile.provider === "manual") {
      notes.push("No online payment redirect. The store will confirm the order and collect payment in store.");
    }
    if (profile.provider === "stripe" && profile.code === "card") {
      notes.push("Card payment uses Stripe Checkout. Apple Pay will appear automatically there on supported Apple devices and browsers.");
    }
    if (profile.provider === "stripe" && profile.code === "afterpay_clearpay") {
      notes.push("Afterpay opens in Stripe Checkout and is only shown when the cart and customer are eligible.");
    }
    if (profile.provider === "stripe" && profile.code === "wechat_pay") {
      notes.push("WeChat Pay opens in Stripe Checkout. Availability depends on your Stripe account and customer region.");
    }
    if (profile.notes) {
      notes.push(String(profile.notes).trim());
    }

    paymentNoteTarget.hidden = !notes.length;
    paymentNoteTarget.textContent = notes.join(" ");
  };

  const renderSuccessState = (payload) => {
    root.innerHTML = `
      <section class="section">
        <div class="container storefront-checkout storefront-checkout--success">
          <div class="storefront-checkout__main">
            <article class="storefront-success">
              <p class="eyebrow">Order submitted</p>
              <h1>Order request submitted successfully</h1>
              <p class="storefront-success__lead">Reference: ${escapeHtml(payload.order_code)}</p>
              <div class="storefront-success__grid">
                <div class="storefront-success__item">
                  <strong>Customer</strong>
                  <span>${escapeHtml(payload.customer_name)}</span>
                </div>
                <div class="storefront-success__item">
                  <strong>Store</strong>
                  <span>${escapeHtml(payload.store_name || payload.store_slug || "To be confirmed")}</span>
                </div>
                <div class="storefront-success__item">
                  <strong>Contact</strong>
                  <span>${escapeHtml(payload.phone)}${payload.email ? ` / ${escapeHtml(payload.email)}` : ""}</span>
                </div>
                <div class="storefront-success__item">
                  <strong>Total</strong>
                  <span>${escapeHtml(formatMoney(payload.total_amount))}</span>
                </div>
                <div class="storefront-success__item">
                  <strong>Payment</strong>
                  <span>${escapeHtml(payload.payment_method_label || 'Pay in store')}</span>
                </div>
                <div class="storefront-success__item">
                  <strong>Payment fee</strong>
                  <span>${escapeHtml(formatMoney(payload.payment_fee_amount || 0))}</span>
                </div>
              </div>
              <div class="storefront-success__actions">
                <a class="button button--primary" href="shop.html">Continue shopping</a>
                <a class="button button--ghost" href="stores.html">Find a store</a>
              </div>
            </article>

            <div class="storefront-summary storefront-summary--embedded">
              <p class="eyebrow">Submitted items</p>
              <div data-checkout-success-items></div>
            </div>
          </div>

          <aside class="storefront-checkout__sidebar">
            <div class="storefront-summary">
              <p class="eyebrow">Order summary</p>
              <div data-checkout-success-summary></div>
            </div>
          </aside>
        </div>
      </section>
    `;

    const successItemsTarget = root.querySelector("[data-checkout-success-items]");
    const successSummaryTarget = root.querySelector("[data-checkout-success-summary]");
    renderCartLineItems(successItemsTarget, payload.items || []);
    renderCartSummary(successSummaryTarget, payload.items || [], {
      paymentProfile:
        payload.payment_method_code
          ? paymentProfiles.find((profile) => profile.code === payload.payment_method_code) || null
          : null,
    });
  };

  const render = () => {
    const items = loadCart();
    const subtotal = getCartSubtotal(items);
    renderStoreSelectionDetail();
    renderPaymentOptions(subtotal);
    renderCartLineItems(itemsTarget, items);
    renderCartSummary(summaryTarget, items, {
      paymentProfile: getSelectedPaymentProfile(),
    });
    syncCheckoutMode();
    renderPaymentNote();
    if (messageTarget instanceof HTMLElement && items.length && !isPaymentCancelled) {
      messageTarget.hidden = true;
      messageTarget.textContent = "";
      messageTarget.className = "booking-message";
    }
    if (submitButton instanceof HTMLButtonElement) {
      const hasStoreSelection = storeField instanceof HTMLSelectElement && Boolean(String(storeField.value || "").trim());
      submitButton.disabled = !items.length || !hasStoreSelection;
      submitButton.textContent = items.length ? "Submit order request" : "Add items before checkout";
    }
  };

  const applyAccountPrefill = async () => {
    activeAuthState = await prefillCustomerContactForm(form, { includeStore: true });
  };

  itemsTarget.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const slug = target.getAttribute("data-cart-qty");
    if (!slug) return;
    updateCartItemQuantity(slug, target.value);
    render();
  });

  itemsTarget.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("[data-cart-remove]");
    if (!(button instanceof HTMLElement)) return;
    const slug = button.getAttribute("data-cart-remove") || "";
    removeCartItem(slug);
    render();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const items = loadCart();
    if (!items.length) {
      if (messageTarget instanceof HTMLElement) {
        messageTarget.hidden = false;
        messageTarget.className = "booking-message is-error";
        messageTarget.textContent = "Your cart is empty. Add products before checking out.";
      }
      return;
    }

    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const subtotal = getCartSubtotal(items);
    const selectedProfile = getSelectedPaymentProfile();
    activeAuthState = await getCurrentAuthState();
    const authAccessToken = activeAuthState?.session?.access_token || supabaseAnonKey;
    const storeSlug = String(formData.get("store_slug") || "").trim();
    const paymentMethodCode = String(formData.get("payment_method_code") || "pay_in_store").trim();
    const warehouseDispatch = storeSlug === "warehouse-dispatch";
    const shippingPayload = {
      recipient_name: String(formData.get("recipient_name") || "").trim(),
      company_name: String(formData.get("company_name") || "").trim(),
      shipping_phone: String(formData.get("shipping_phone") || "").trim(),
      shipping_email: String(formData.get("shipping_email") || "").trim(),
      address_line_1: String(formData.get("address_line_1") || "").trim(),
      address_line_2: String(formData.get("address_line_2") || "").trim(),
      suburb: String(formData.get("suburb") || "").trim(),
      postcode: String(formData.get("postcode") || "").trim(),
      state: String(formData.get("state") || "").trim(),
      country_code: String(formData.get("country_code") || "AU").trim(),
    };

    if (!storeSlug) {
      if (messageTarget instanceof HTMLElement) {
        messageTarget.hidden = false;
        messageTarget.className = "booking-message is-error";
        messageTarget.textContent = "Please select a pickup store or dispatch point.";
      }
      return;
    }

    if (paymentMethodCode === "pay_in_store" && warehouseDispatch) {
      if (messageTarget instanceof HTMLElement) {
        messageTarget.hidden = false;
        messageTarget.className = "booking-message is-error";
        messageTarget.textContent = "Pay in store can only be used with a physical pickup store.";
      }
      return;
    }

    if (warehouseDispatch) {
      const missingShippingField = !shippingPayload.recipient_name
        || !shippingPayload.address_line_1
        || !shippingPayload.suburb
        || !shippingPayload.postcode
        || !shippingPayload.state;

      if (missingShippingField) {
        if (messageTarget instanceof HTMLElement) {
          messageTarget.hidden = false;
          messageTarget.className = "booking-message is-error";
          messageTarget.textContent = "Warehouse Dispatch requires a full delivery address.";
        }
        return;
      }
    }

    const payload = {
      order_code: makeOrderCode(),
      customer_name: String(formData.get("customer_name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      store_slug: storeSlug,
      preferred_contact_method: String(formData.get("preferred_contact_method") || "phone").trim(),
      payment_method_code: paymentMethodCode,
      fulfillment_method: warehouseDispatch ? "shipping" : "pickup",
      notes: String(formData.get("notes") || "").trim(),
      subtotal_amount: subtotal,
      total_amount: subtotal,
      source: "website",
      site_url: getConfiguredSiteBaseUrl(),
      auth_user_id: activeAuthState?.user?.id || null,
      items,
      created_at: new Date().toISOString(),
      ...shippingPayload,
    };

    const endpoint = window.TECHM8_CONFIG?.orderEndpoint || "";
    const checkoutSessionEndpoint = window.TECHM8_CONFIG?.checkoutSessionEndpoint || "";

    try {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
      }

      if (activeAuthState?.supabase && activeAuthState?.user) {
        await syncCustomerProfile(activeAuthState.supabase, activeAuthState.user, {
          full_name: payload.customer_name,
          phone: payload.phone,
          email: payload.email,
          default_store_slug: payload.store_slug,
        });
      }

      if (selectedProfile?.provider === "stripe") {
        if (!checkoutSessionEndpoint) {
          throw new Error("Stripe Checkout is not configured yet.");
        }

        const response = await fetch(checkoutSessionEndpoint, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${authAccessToken}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify(payload),
        });

        const result = await parseJsonResponse(response);
        if (!response.ok || !result.ok || !result.checkout_url) {
          throw new Error(result.error || "Stripe Checkout could not be started.");
        }

        window.location.href = result.checkout_url;
        return;
      }

      if (endpoint) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${authAccessToken}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify(payload),
        });

        const result = await parseJsonResponse(response);
        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Checkout submission failed.");
        }

        payload.order_code = String(result.order_code || payload.order_code);
        payload.store_name = String(result.store_name || payload.store_name || "");
        payload.total_amount = Number(result.total_amount ?? payload.total_amount) || payload.total_amount;
        payload.payment_fee_amount = Number(result.payment_fee_amount ?? 0) || 0;
        payload.payment_method_code = String(result.payment_method_code || payload.payment_method_code || "");
        payload.payment_method_label = String(result.payment_method_label || payload.payment_method_label || "");
      } else {
        saveLocalOrder(payload);
      }

      clearCart();
      renderSuccessState(payload);
    } catch (error) {
      if (messageTarget instanceof HTMLElement) {
        messageTarget.hidden = false;
        messageTarget.className = "booking-message is-error";
        messageTarget.textContent = error instanceof Error ? error.message : "Checkout submission failed.";
      }
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
        submitButton.textContent = "Submit order request";
      }
    }
  });

  if (paymentOptionsTarget instanceof HTMLElement && paymentMethodField instanceof HTMLInputElement) {
    paymentOptionsTarget.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const option = target.closest("[data-payment-option]");
      if (!(option instanceof HTMLElement)) return;
      const code = String(option.getAttribute("data-payment-option") || "").trim();
      if (!code) return;
      paymentMethodField.value = code;
      render();
    });
  }

  if (storeField instanceof HTMLSelectElement) {
    storeField.addEventListener("change", () => {
      render();
    });
  }

  loadPaymentFeeProfiles()
    .then((profiles) => {
      const supportedProfiles = profiles.filter((profile) => {
        if (!profile || !profile.code || profile.is_enabled === false) return false;
        if (profile.provider === "manual") return true;
        if (profile.provider === "stripe") {
          return ["card", "afterpay_clearpay", "wechat_pay"].includes(profile.code);
        }
        return false;
      });

      paymentProfiles.splice(
        0,
        paymentProfiles.length,
        ...(supportedProfiles.length
          ? supportedProfiles
          : [
              {
                code: "pay_in_store",
                label: "Pay in store",
                provider: "manual",
                fee_type: "none",
                percentage: 0,
                fixed_amount: 0,
                is_enabled: true,
                notes: "",
              },
            ])
      );

      if (paymentMethodField instanceof HTMLInputElement) {
        const initialProfile = paymentProfiles.find((profile) => profile.code === "pay_in_store") || paymentProfiles[0];
        if (initialProfile) {
          paymentMethodField.value = initialProfile.code;
        }
      }

      render();
    })
    .catch(() => {
      paymentProfiles.splice(0, paymentProfiles.length, {
        code: "pay_in_store",
        label: "Pay in store",
        provider: "manual",
        fee_type: "none",
        percentage: 0,
        fixed_amount: 0,
        is_enabled: true,
        notes: "",
      });
      if (paymentMethodField instanceof HTMLInputElement) {
        paymentMethodField.value = "pay_in_store";
      }
      render();
    });

  applyAccountPrefill().then(() => {
    render();
  });

  if (isPaymentCancelled && messageTarget instanceof HTMLElement) {
    messageTarget.hidden = false;
    messageTarget.className = "booking-message is-error";
    messageTarget.textContent = "Stripe payment was cancelled. Your cart is still here and you can try again.";
  }
}

function initCheckoutSuccessPage() {
  const root = document.querySelector("[data-checkout-success-page]");
  if (!(root instanceof HTMLElement)) return;

  const params = new URLSearchParams(window.location.search);
  const orderCode = params.get("order_code") || "Pending";
  const sessionId = params.get("session_id") || "";
  const orderCodeTarget = root.querySelector("[data-success-order-code]");
  const sessionTarget = root.querySelector("[data-success-session-id]");

  clearCart();

  if (orderCodeTarget instanceof HTMLElement) {
    orderCodeTarget.textContent = orderCode;
  }

  if (sessionTarget instanceof HTMLElement) {
    sessionTarget.textContent = sessionId || "Stripe session confirmed";
  }
}

function initBookingForm() {
  const form = document.querySelector("[data-booking-form]");
  if (!(form instanceof HTMLFormElement)) return;

  const supabaseAnonKey = window.TECHM8_CONFIG?.supabaseAnonKey || "";
  const bookingEndpoint =
    window.TECHM8_CONFIG?.bookingEndpoint ||
    "api/book-repair.php";
  const isSupabaseEndpoint = /^https:\/\/.+\.supabase\.co\/functions\/v1\//.test(bookingEndpoint);
  let activeAuthState = null;

  const submitButton = form.querySelector("[data-booking-submit]");
  const messageBox = form.querySelector("[data-booking-message]");
  const storeField = form.elements.namedItem("store_slug");
  const modal = document.querySelector("[data-booking-modal]");
  const modalType = modal?.querySelector("[data-booking-modal-type]");
  const modalTitle = modal?.querySelector("[data-booking-modal-title]");
  const modalText = modal?.querySelector("[data-booking-modal-text]");
  const modalCloseButtons = modal?.querySelectorAll("[data-booking-modal-close]");

  const setMessage = (type, text) => {
    if (!(messageBox instanceof HTMLElement)) return;
    messageBox.hidden = false;
    messageBox.className = "booking-message";
    if (type) {
      messageBox.classList.add(`is-${type}`);
    }
    messageBox.textContent = text;
  };

  const openModal = (type, title, text) => {
    if (!(modal instanceof HTMLElement)) {
      window.alert(text);
      return;
    }

    modal.hidden = false;
    modal.className = "booking-modal";
    modal.classList.add(`is-${type}`);

    if (modalType instanceof HTMLElement) {
      modalType.textContent = type === "success" ? "Booking submitted" : "Submission failed";
    }

    if (modalTitle instanceof HTMLElement) {
      modalTitle.textContent = title;
    }

    if (modalText instanceof HTMLElement) {
      modalText.textContent = text;
    }

    document.body.classList.add("has-booking-modal");
  };

  const closeModal = () => {
    if (!(modal instanceof HTMLElement)) return;
    modal.hidden = true;
    modal.className = "booking-modal";
    document.body.classList.remove("has-booking-modal");
  };

  modalCloseButtons?.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  const params = new URLSearchParams(window.location.search);
  const storeParam = params.get("store");
  if (storeField instanceof HTMLSelectElement && storeParam) {
    storeField.value = storeParam;
  }

  prefillCustomerContactForm(form, { includeStore: true }).then((authState) => {
    activeAuthState = authState;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      setMessage("error", "Please complete the required fields before submitting.");
      openModal("error", "Required fields missing", "Please complete the required fields before submitting your repair request.");
      return;
    }

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    setMessage("", "");
    if (messageBox instanceof HTMLElement) {
      messageBox.hidden = true;
    }

    try {
      const formData = new FormData(form);
      activeAuthState = await getCurrentAuthState();
      const authAccessToken = activeAuthState?.session?.access_token || supabaseAnonKey;
      const payload = Object.fromEntries(formData.entries());

      if (activeAuthState?.supabase && activeAuthState?.user) {
        await syncCustomerProfile(activeAuthState.supabase, activeAuthState.user, {
          full_name: String(payload.customer_name || "").trim(),
          phone: String(payload.phone || "").trim(),
          email: String(payload.email || "").trim(),
          default_store_slug: String(payload.store_slug || "").trim(),
        });
      }

      const response = await fetch(
        bookingEndpoint,
        isSupabaseEndpoint
          ? {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${authAccessToken}`,
                apikey: supabaseAnonKey,
              },
              body: JSON.stringify({
                ...payload,
                auth_user_id: activeAuthState?.user?.id || null,
              }),
            }
          : {
              method: "POST",
              headers: {
                Accept: "application/json",
              },
              body: formData,
            }
      );

      const raw = await response.text();
      let result;

      try {
        result = JSON.parse(raw);
      } catch (parseError) {
        throw new Error(raw || "The server returned an invalid response.");
      }

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Repair request could not be submitted.");
      }

      form.reset();

      if (storeField instanceof HTMLSelectElement && storeParam) {
        storeField.value = storeParam;
      }

      setMessage(
        "success",
        `Repair request submitted successfully. Booking code: ${result.booking_code}. A confirmation email has been sent.`
      );
      openModal(
        "success",
        "Repair request submitted",
        `Your repair request has been submitted successfully. Booking code: ${result.booking_code}.`
      );
      messageBox?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      const errorText = error instanceof Error ? error.message : "Repair request could not be submitted.";
      setMessage("error", errorText);
      openModal("error", "Repair request failed", errorText);
      messageBox?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
        submitButton.textContent = "Submit repair request";
      }
    }
  });
}

function initNavigation() {
  decorateMobileMenu();
  decorateMobileRepairsAccordion();
  initStoreSearch();

  const mobileInput = document.querySelector(".nav__mobile-input");
  const navMenu = document.querySelector(".nav__menu");
  const navToggle = document.querySelector(".nav__toggle--open, .nav > .nav__toggle");
  const navOverlay = document.querySelector(".nav__overlay");
  const navCloseToggle = document.querySelector(".nav__toggle--close");
  const navDropdowns = document.querySelectorAll(".nav__dropdown");
  const navDropdownToggles = document.querySelectorAll(".nav__dropdown-toggle");
  const navSubmenuToggles = document.querySelectorAll(".nav__submenu-toggle");
  const mobileRepairsToggles = document.querySelectorAll(".nav__mobile-repairs-toggle");

  navDropdownToggles.forEach((toggle) => {
    if (!(toggle instanceof HTMLButtonElement)) return;
    toggle.removeAttribute("onclick");
    if (toggle.dataset.navBound === "true") return;
    toggle.dataset.navBound = "true";
    toggle.addEventListener("click", (event) => {
      handleDropdownToggle(event, toggle);
    });
  });

  navSubmenuToggles.forEach((toggle) => {
    if (!(toggle instanceof HTMLButtonElement)) return;
    toggle.removeAttribute("onclick");
    if (toggle.dataset.navBound === "true") return;
    toggle.dataset.navBound = "true";
    toggle.addEventListener("click", (event) => {
      handleSubmenuToggle(event, toggle);
    });
    toggle.addEventListener("touchstart", (event) => {
      event.stopPropagation();
      keepMobileMenuOpen();
    }, { passive: true });
  });

  mobileRepairsToggles.forEach((toggle) => {
    if (!(toggle instanceof HTMLButtonElement)) return;
    if (toggle.dataset.navBound === "true") return;
    toggle.dataset.navBound = "true";
    toggle.addEventListener("click", (event) => {
      handleMobileRepairsToggle(event, toggle);
    });
    toggle.addEventListener("touchstart", (event) => {
      event.stopPropagation();
      keepMobileMenuOpen();
    }, { passive: true });
  });

  if (mobileInput && navMenu) {
    navToggle?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setMobileMenuState(!navMenu.classList.contains("is-open"));
    });

    navOverlay?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setMobileMenuState(false);
    });

    navCloseToggle?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setMobileMenuState(false);
    });

    mobileInput.addEventListener("change", () => {
      const isOpen = mobileInput.checked;
      setMobileMenuState(isOpen);
      if (!isOpen) {
        closeAllDropdowns();
        closeAllSubmenus();
        closeAllMobileRepairsGroups();
      }
    });

    navMenu.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

  navDropdowns.forEach((dropdown) => {
    let closeTimer;

    dropdown.addEventListener("mouseenter", () => {
      if (isMobileNavigation()) return;

      window.clearTimeout(closeTimer);
      closeAllDropdowns(dropdown);
      dropdown.classList.add("is-open");
      const toggle = dropdown.querySelector(".nav__dropdown-toggle");
      toggle?.setAttribute("aria-expanded", "true");
      if (toggle) {
        delete toggle.dataset.navReady;
      }
      closeAllSubmenus();
    });

    dropdown.addEventListener("mouseleave", () => {
      if (isMobileNavigation()) return;

      closeTimer = window.setTimeout(() => {
        dropdown.classList.remove("is-open");
        const toggle = dropdown.querySelector(".nav__dropdown-toggle");
        toggle?.setAttribute("aria-expanded", "false");
        if (toggle) {
          delete toggle.dataset.navReady;
        }
        closeAllSubmenus();
      }, 180);
    });

    dropdown.querySelectorAll(".nav__dropdown-group").forEach((group) => {
      group.addEventListener("mouseenter", () => {
        if (isMobileNavigation()) return;
        openSubmenuGroup(group);
      });

      group.addEventListener("focusin", () => {
        if (isMobileNavigation()) return;
        openSubmenuGroup(group);
      });
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest(".nav__toggle")) {
      return;
    }

    if (target.closest(".nav__dropdown-toggle")) return;
    if (target.closest(".nav__submenu-toggle")) return;
    if (target.closest(".nav__dropdown")) return;

    closeAllDropdowns();
    closeAllSubmenus();
  });
}

function setAuthMessage(target, message, tone = "success") {
  if (!(target instanceof HTMLElement)) return;

  if (!message) {
    target.hidden = true;
    target.textContent = "";
    target.classList.remove("is-success", "is-error");
    return;
  }

  target.hidden = false;
  target.textContent = message;
  target.classList.toggle("is-success", tone === "success");
  target.classList.toggle("is-error", tone === "error");
}

function getReadableAuthError(error) {
  const message = String(error?.message || error || "Authentication request failed.");
  if (/Invalid login credentials/i.test(message)) return "The email or password is incorrect.";
  if (/Email rate limit exceeded/i.test(message)) return "Too many email requests were sent. Please wait and try again.";
  if (/provider is not enabled/i.test(message)) return "This login provider is not enabled in Supabase Auth yet.";
  return message;
}

function isValidEmailAddress(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(email || "").trim());
}

function normalizeAustralianPhone(phone) {
  const raw = String(phone || "").trim();
  const compact = raw.replace(/[^\d+]/g, "");
  const digitsOnly = raw.replace(/\D/g, "");

  if (/^\+61[2-478]\d{8}$/.test(compact)) {
    return compact;
  }

  if (/^61[2-478]\d{8}$/.test(digitsOnly)) {
    return `+${digitsOnly}`;
  }

  if (/^0[2-478]\d{8}$/.test(digitsOnly)) {
    return `+61${digitsOnly.slice(1)}`;
  }

  return raw;
}

function isValidAustralianPhone(phone) {
  return /^\+61[2-478]\d{8}$/.test(normalizeAustralianPhone(phone));
}

function isEmailConfirmed(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

function getUserDisplayName(user) {
  const fullName = String(user?.user_metadata?.full_name || "").trim();
  if (fullName) return fullName;
  const fallbackName = String(user?.user_metadata?.name || "").trim();
  if (fallbackName) return fallbackName;
  return String(user?.email || "TECHM8 customer");
}

async function initAccountPage() {
  const root = document.querySelector("[data-account-page]");
  if (!(root instanceof HTMLElement)) return;

  const guestPanel = root.querySelector("[data-auth-guest]");
  const messageBox = root.querySelector("[data-auth-message]");
  const loginForm = root.querySelector("[data-login-form]");
  const googleButton = root.querySelector("[data-auth-google]");
  const facebookButton = root.querySelector("[data-auth-facebook]");
  const passwordToggleButtons = root.querySelectorAll("[data-password-toggle]");

  let supabase;

  try {
    supabase = await getSupabaseBrowserClient();
  } catch (error) {
    setAuthMessage(messageBox, "Supabase Auth could not be loaded on this page.", "error");
    return;
  }

  const renderSignedOutState = () => {
    if (guestPanel instanceof HTMLElement) guestPanel.hidden = false;
  };

  const renderSession = async (session) => {
    const user = session?.user || null;

    if (!user) {
      renderSignedOutState();
      return;
    }

    window.location.replace(getAccountHomeUrl());
  };

  const { data: { session: initialSession } } = await supabase.auth.getSession();
  await renderSession(initialSession);

  supabase.auth.onAuthStateChange((_event, session) => {
    renderSession(session);
  });

  if (googleButton instanceof HTMLButtonElement) {
    googleButton.addEventListener("click", async () => {
      try {
        setAuthMessage(messageBox, "");
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: getAuthRedirectUrl(),
          },
        });
        if (error) throw error;
      } catch (error) {
        setAuthMessage(messageBox, getReadableAuthError(error), "error");
      }
    });
  }

  if (facebookButton instanceof HTMLButtonElement) {
    facebookButton.addEventListener("click", async () => {
      try {
        setAuthMessage(messageBox, "");
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "facebook",
          options: {
            redirectTo: getAuthRedirectUrl(),
          },
        });
        if (error) throw error;
      } catch (error) {
        setAuthMessage(messageBox, getReadableAuthError(error), "error");
      }
    });
  }

  if (loginForm instanceof HTMLFormElement) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      const email = String(formData.get("email") || "").trim();
      const password = String(formData.get("password") || "");

      try {
          setAuthMessage(messageBox, "");
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          loginForm.reset();
          window.location.assign(getAccountHomeUrl());
        } catch (error) {
          setAuthMessage(messageBox, getReadableAuthError(error), "error");
        }
      });
  }

  passwordToggleButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    const targetId = button.getAttribute("data-password-target");
    if (!targetId) return;
    const input = root.querySelector(`#${CSS.escape(targetId)}`);
    if (!(input instanceof HTMLInputElement)) return;

    button.addEventListener("click", () => {
      const nextType = input.type === "password" ? "text" : "password";
      input.type = nextType;
      button.textContent = nextType === "password" ? "Show" : "Hide";
      button.setAttribute("aria-pressed", nextType === "text" ? "true" : "false");
    });
  });

}

async function initAccountDashboardPage() {
  const root = document.querySelector("[data-account-dashboard-page]");
  if (!(root instanceof HTMLElement)) return;

  const messageBox = root.querySelector("[data-auth-message]");
  const logoutButton = root.querySelector("[data-auth-logout]");
  const nameTarget = root.querySelector("[data-auth-name]");
  const emailTarget = root.querySelector("[data-auth-email]");
  const phoneTarget = root.querySelector("[data-auth-phone]");
  const statusTarget = root.querySelector("[data-auth-status]");
  const verifiedTarget = root.querySelector("[data-auth-verified]");
  const ordersPreviewTarget = root.querySelector("[data-account-orders-preview]");
  const repairsPreviewTarget = root.querySelector("[data-account-repairs-preview]");

  let supabase;

  try {
    supabase = await getSupabaseBrowserClient();
  } catch (error) {
    setAuthMessage(messageBox, "Supabase Auth could not be loaded on this page.", "error");
    return;
  }

  const renderSession = async (session) => {
    const user = session?.user || null;
    const verified = isEmailConfirmed(user);

    if (!user) {
      window.location.replace(getAuthRedirectUrl());
      return;
    }

    let profile = null;
    let orders = [];
    let repairs = [];

    try {
      profile = await syncCustomerProfile(supabase, user);
    } catch (error) {
      try {
        profile = await fetchCustomerProfile(supabase, user);
      } catch (nestedError) {
        profile = null;
      }
    }

    try {
      [orders, repairs] = await Promise.all([
        loadCustomerOrders(supabase, user, 3),
        loadCustomerRepairBookings(supabase, user, 3),
      ]);
    } catch (error) {
      orders = [];
      repairs = [];
    }

    if (nameTarget instanceof HTMLElement) nameTarget.textContent = String(profile?.full_name || getUserDisplayName(user));
    if (emailTarget instanceof HTMLElement) emailTarget.textContent = String(profile?.email || user.email || "No email");
    if (phoneTarget instanceof HTMLElement) phoneTarget.textContent = String(profile?.phone || user.user_metadata?.phone || "Phone not saved");
    if (statusTarget instanceof HTMLElement) statusTarget.textContent = verified ? "Signed in" : "Pending email verification";
    if (verifiedTarget instanceof HTMLElement) {
      verifiedTarget.textContent = verified ? "Email verified" : "Verification pending";
    }
    renderHistoryPreview(ordersPreviewTarget, orders, "orders");
    renderHistoryPreview(repairsPreviewTarget, repairs, "repairs");
  };

  const { data: { session: initialSession } } = await supabase.auth.getSession();
  await renderSession(initialSession);

  supabase.auth.onAuthStateChange((_event, session) => {
    renderSession(session);
  });

  if (logoutButton instanceof HTMLButtonElement) {
    logoutButton.addEventListener("click", async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.assign(getAuthRedirectUrl());
      } catch (error) {
        setAuthMessage(messageBox, getReadableAuthError(error), "error");
      }
    });
  }
}

async function initRegisterPage() {
  const root = document.querySelector("[data-register-page]");
  if (!(root instanceof HTMLElement)) return;

  const messageBox = root.querySelector("[data-auth-message]");
  const registerForm = root.querySelector("[data-register-form]");
  if (!(registerForm instanceof HTMLFormElement)) return;

  let supabase;
  try {
    supabase = await getSupabaseBrowserClient();
  } catch (error) {
    setAuthMessage(messageBox, "Supabase Auth could not be loaded on this page.", "error");
    return;
  }

    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(registerForm);
      const fullName = String(formData.get("full_name") || "").trim();
      const phone = normalizeAustralianPhone(String(formData.get("phone") || "").trim());
      const email = String(formData.get("email") || "").trim().toLowerCase();
      const password = String(formData.get("password") || "");
      const confirmPassword = String(formData.get("confirm_password") || "");

      if (!fullName || !phone || !email || !password) {
        setAuthMessage(messageBox, "Please complete all required registration fields.", "error");
        return;
      }

      if (!isValidEmailAddress(email)) {
        setAuthMessage(messageBox, "Please enter a valid email address.", "error");
        return;
      }

      if (!isValidAustralianPhone(phone)) {
        setAuthMessage(messageBox, "Please enter a valid Australian phone number.", "error");
        return;
      }

      if (password !== confirmPassword) {
        setAuthMessage(messageBox, "Password confirmation does not match.", "error");
        return;
      }

    try {
      setAuthMessage(messageBox, "");
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          data: {
            full_name: fullName,
            phone,
          },
        },
      });
      if (error) throw error;

      if (data?.session && !isEmailConfirmed(data.user)) {
        await supabase.auth.signOut();
      }

      setAuthMessage(messageBox, "Registration submitted. Check your email and verify the account before signing in.");
      registerForm.reset();
    } catch (error) {
      setAuthMessage(messageBox, getReadableAuthError(error), "error");
    }
  });
}

async function initForgotPasswordPage() {
  const root = document.querySelector("[data-reset-page]");
  if (!(root instanceof HTMLElement)) return;

  const messageBox = root.querySelector("[data-auth-message]");
  const resetForm = root.querySelector("[data-reset-form]");
  if (!(resetForm instanceof HTMLFormElement)) return;

  let supabase;
  try {
    supabase = await getSupabaseBrowserClient();
  } catch (error) {
    setAuthMessage(messageBox, "Supabase Auth could not be loaded on this page.", "error");
    return;
  }

  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(resetForm);
    const email = String(formData.get("email") || "").trim();

    if (!email) {
      setAuthMessage(messageBox, "Enter an email address to send a reset link.", "error");
      return;
    }

    try {
      setAuthMessage(messageBox, "");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthRedirectUrl(),
      });
      if (error) throw error;
      setAuthMessage(messageBox, "Password reset link sent. Check your email inbox.");
      resetForm.reset();
    } catch (error) {
      setAuthMessage(messageBox, getReadableAuthError(error), "error");
    }
  });
}

function setCheckboxField(form, fieldName, checked) {
  if (!(form instanceof HTMLFormElement)) return;
  const field = form.elements.namedItem(fieldName);
  if (!(field instanceof HTMLInputElement) || field.type !== "checkbox") return;
  field.checked = Boolean(checked);
}

async function requireSignedInAccountPage(messageTarget = null) {
  const authState = await getCurrentAuthState();

  if (!authState.user || !authState.supabase) {
    if (messageTarget instanceof HTMLElement) {
      setAuthMessage(messageTarget, "Sign in to access your account.", "error");
    }
    window.location.replace(getAuthRedirectUrl());
    return null;
  }

  return authState;
}

async function loadResolvedCustomerProfile(supabase, user) {
  try {
    return await syncCustomerProfile(supabase, user);
  } catch (error) {
    return fetchCustomerProfile(supabase, user);
  }
}

function populateAccountDetailsForm(form, profile, user) {
  if (!(form instanceof HTMLFormElement)) return;
  const { firstName, lastName } = splitProfileName(profile, user);

  fillFormField(form, "email", profile?.email || user?.email || "", true);
  fillFormField(form, "first_name", firstName, true);
  fillFormField(form, "last_name", lastName, true);
  fillFormField(form, "phone", profile?.phone || user?.user_metadata?.phone || "", true);
  fillFormField(form, "business_name", profile?.business_name || "", true);
  fillFormField(form, "address_line_1", profile?.address_line_1 || "", true);
  fillFormField(form, "address_line_2", profile?.address_line_2 || "", true);
  fillFormField(form, "suburb", profile?.suburb || "", true);
  fillFormField(form, "postcode", profile?.postcode || "", true);
  fillFormField(form, "state", profile?.state || "", true);
  fillFormField(form, "default_store_slug", profile?.default_store_slug || "", true);
  setCheckboxField(form, "service_email_opt_in", profile?.service_email_opt_in);
  setCheckboxField(form, "marketing_opt_in", profile?.marketing_opt_in);
}

function populateDeliveryAddressForm(form, profile, user) {
  if (!(form instanceof HTMLFormElement)) return;
  const { firstName, lastName } = splitProfileName(profile, user);

  fillFormField(form, "first_name", firstName, true);
  fillFormField(form, "last_name", lastName, true);
  fillFormField(form, "phone", profile?.phone || user?.user_metadata?.phone || "", true);
  fillFormField(form, "business_name", profile?.business_name || "", true);
  fillFormField(form, "address_line_1", profile?.address_line_1 || "", true);
  fillFormField(form, "address_line_2", profile?.address_line_2 || "", true);
  fillFormField(form, "suburb", profile?.suburb || "", true);
  fillFormField(form, "postcode", profile?.postcode || "", true);
  fillFormField(form, "state", profile?.state || "", true);
}

function normalizeOrderSearchRecord(record) {
  return [
    record?.order_code,
    record?.customer_name,
    record?.store_slug,
    record?.payment_method_label,
    record?.status,
    record?.fulfillment_status,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .join(" ");
}

function normalizeRepairSearchRecord(record) {
  return [
    record?.booking_code,
    record?.brand,
    record?.device_model,
    record?.store_slug,
    record?.repair_category,
    record?.status,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .join(" ");
}

function isCompletedOrderRecord(record) {
  const status = String(record?.status || "").trim().toLowerCase();
  const fulfillmentStatus = String(record?.fulfillment_status || "").trim().toLowerCase();
  return ["completed", "complete", "closed"].includes(status)
    || ["completed", "fulfilled", "delivered", "collected", "picked_up", "picked up"].includes(fulfillmentStatus);
}

function renderAccountOrderCards(target, records, mode = "all") {
  if (!(target instanceof HTMLElement)) return;

  if (!Array.isArray(records) || !records.length) {
    target.innerHTML = `
      <article class="account-empty-card">
        <h3>${mode === "pending" ? "No pending orders" : "No completed orders"}</h3>
        <p>${mode === "pending"
          ? "New and in-progress orders linked to this account will appear here."
          : "Completed orders linked to this account will appear here once they are fulfilled."}</p>
      </article>
    `;
    return;
  }

  target.innerHTML = records.map((record) => `
    <article class="account-order-card">
      <div class="account-order-card__head">
        <div>
          <p class="eyebrow">Order</p>
          <h3 class="account-order-card__title">${escapeHtml(record.order_code || "Pending order")}</h3>
          <div class="account-inline-meta">
            <span>${escapeHtml(formatDateTime(record.created_at))}</span>
            <span>${escapeHtml(getStoreDisplayName(record.store_slug))}</span>
            <span>${escapeHtml(record.payment_method_label || "Pay in store")}</span>
          </div>
        </div>
        <span class="account-status">${escapeHtml(formatStatusLabel(record.status || record.fulfillment_status || "new"))}</span>
      </div>
      <div class="account-order-card__body">
        <div class="account-order-card__grid">
          <div><strong>Total</strong><span>${escapeHtml(formatMoney(record.total_amount || 0))}</span></div>
          <div><strong>Payment status</strong><span>${escapeHtml(formatStatusLabel(record.payment_status || "pending"))}</span></div>
          <div><strong>Fulfilment</strong><span>${escapeHtml(formatStatusLabel(record.fulfillment_method || "pickup"))}</span></div>
          <div><strong>Fulfilment status</strong><span>${escapeHtml(formatStatusLabel(record.fulfillment_status || "new"))}</span></div>
          <div><strong>Email</strong><span>${escapeHtml(record.email || "Not available")}</span></div>
          <div><strong>Phone</strong><span>${escapeHtml(record.phone || "Not available")}</span></div>
        </div>
      </div>
      <div class="account-order-card__foot">
        <span class="account-muted">${mode === "pending" ? "This order is still active." : "This order has been completed."}</span>
        <div class="account-order-card__actions">
          <a class="account-button--secondary" href="shop.html">Browse store</a>
          <a class="account-button" href="cart.html">${mode === "pending" ? "View cart" : "Shop again"}</a>
        </div>
      </div>
    </article>
  `).join("");
}

function renderAccountRepairCards(target, records) {
  if (!(target instanceof HTMLElement)) return;

  if (!Array.isArray(records) || !records.length) {
    target.innerHTML = `
      <article class="account-empty-card">
        <h3>No repair bookings found</h3>
        <p>Repair bookings linked to this signed-in account will appear here.</p>
      </article>
    `;
    return;
  }

  target.innerHTML = records.map((record) => `
    <article class="account-order-card">
      <div class="account-order-card__head">
        <div>
          <p class="eyebrow">Repair booking</p>
          <h3 class="account-order-card__title">${escapeHtml(record.booking_code || "Pending booking")}</h3>
          <div class="account-inline-meta">
            <span>${escapeHtml(getStoreDisplayName(record.store_slug))}</span>
            <span>${escapeHtml(REPAIR_CATEGORY_LABELS[record.repair_category] || formatStatusLabel(record.repair_category))}</span>
            <span>${escapeHtml(formatDateTime(record.created_at))}</span>
          </div>
        </div>
        <span class="account-status">${escapeHtml(formatStatusLabel(record.status || "new"))}</span>
      </div>
      <div class="account-order-card__body">
        <div class="account-order-card__grid">
          <div><strong>Brand</strong><span>${escapeHtml(record.brand || "Not specified")}</span></div>
          <div><strong>Model</strong><span>${escapeHtml(record.device_model || "Not specified")}</span></div>
          <div><strong>Preferred date</strong><span>${escapeHtml(record.preferred_date ? formatDateOnly(record.preferred_date) : "Flexible")}</span></div>
          <div><strong>Preferred time</strong><span>${escapeHtml(record.preferred_time || "Flexible")}</span></div>
          <div><strong>Contact method</strong><span>${escapeHtml(formatStatusLabel(record.preferred_contact_method || "phone"))}</span></div>
          <div><strong>Store</strong><span>${escapeHtml(getStoreDisplayName(record.store_slug))}</span></div>
        </div>
      </div>
      <div class="account-order-card__foot">
        <span class="account-muted">Use the store page or book a new repair if you need to follow up.</span>
        <div class="account-order-card__actions">
          <a class="account-button--secondary" href="stores.html">Find store</a>
          <a class="account-button" href="book-repair.html">Book again</a>
        </div>
      </div>
    </article>
  `).join("");
}

async function initAccountDetailsPage() {
  const root = document.querySelector("[data-account-details-page]");
  if (!(root instanceof HTMLElement)) return;

  const form = root.querySelector("[data-account-details-form]");
  const messageTarget = root.querySelector("[data-account-details-message]");
  if (!(form instanceof HTMLFormElement)) return;

  const authState = await requireSignedInAccountPage(messageTarget);
  if (!authState) return;

  try {
    const profile = await loadResolvedCustomerProfile(authState.supabase, authState.user);
    populateAccountDetailsForm(form, profile, authState.user);
  } catch (error) {
    setAuthMessage(messageTarget, error instanceof Error ? error.message : "Profile could not be loaded.", "error");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const phone = normalizeAustralianPhone(String(formData.get("phone") || "").trim());
    const postcode = String(formData.get("postcode") || "").trim();

    if (!email || !isValidEmailAddress(email)) {
      setAuthMessage(messageTarget, "Enter a valid email address.", "error");
      return;
    }

    if (phone && !isValidAustralianPhone(phone)) {
      setAuthMessage(messageTarget, "Enter a valid Australian phone number.", "error");
      return;
    }

    if (postcode && !/^\d{4}$/.test(postcode)) {
      setAuthMessage(messageTarget, "Post code must be a valid 4-digit Australian postcode.", "error");
      return;
    }

    try {
      await upsertCustomerProfile(authState.supabase, authState.user, {
        email,
        first_name: String(formData.get("first_name") || "").trim(),
        last_name: String(formData.get("last_name") || "").trim(),
        phone,
        business_name: String(formData.get("business_name") || "").trim(),
        address_line_1: String(formData.get("address_line_1") || "").trim(),
        address_line_2: String(formData.get("address_line_2") || "").trim(),
        suburb: String(formData.get("suburb") || "").trim(),
        postcode,
        state: String(formData.get("state") || "").trim(),
        default_store_slug: String(formData.get("default_store_slug") || "").trim(),
        service_email_opt_in: formData.get("service_email_opt_in") === "true",
        marketing_opt_in: formData.get("marketing_opt_in") === "true",
      }, { allowLegacyFallback: false });
      setAuthMessage(messageTarget, "Account details updated.");
    } catch (error) {
      const message = isMissingProfileColumnError(error)
        ? "The profile table still needs the account fields migration before this page can save all fields."
        : getReadableAuthError(error);
      setAuthMessage(messageTarget, message, "error");
    }
  });
}

async function initDeliveryAddressPage() {
  const root = document.querySelector("[data-delivery-address-page]");
  if (!(root instanceof HTMLElement)) return;

  const form = root.querySelector("[data-delivery-address-form]");
  const messageTarget = root.querySelector("[data-delivery-address-message]");
  if (!(form instanceof HTMLFormElement)) return;

  const authState = await requireSignedInAccountPage(messageTarget);
  if (!authState) return;

  try {
    const profile = await loadResolvedCustomerProfile(authState.supabase, authState.user);
    populateDeliveryAddressForm(form, profile, authState.user);
  } catch (error) {
    setAuthMessage(messageTarget, error instanceof Error ? error.message : "Saved address could not be loaded.", "error");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const phone = normalizeAustralianPhone(String(formData.get("phone") || "").trim());
    const postcode = String(formData.get("postcode") || "").trim();

    if (!String(formData.get("address_line_1") || "").trim() || !String(formData.get("suburb") || "").trim()) {
      setAuthMessage(messageTarget, "Address line 1 and suburb are required.", "error");
      return;
    }

    if (phone && !isValidAustralianPhone(phone)) {
      setAuthMessage(messageTarget, "Enter a valid Australian phone number.", "error");
      return;
    }

    if (!/^\d{4}$/.test(postcode)) {
      setAuthMessage(messageTarget, "Post code must be a valid 4-digit Australian postcode.", "error");
      return;
    }

    try {
      await upsertCustomerProfile(authState.supabase, authState.user, {
        first_name: String(formData.get("first_name") || "").trim(),
        last_name: String(formData.get("last_name") || "").trim(),
        phone,
        business_name: String(formData.get("business_name") || "").trim(),
        address_line_1: String(formData.get("address_line_1") || "").trim(),
        address_line_2: String(formData.get("address_line_2") || "").trim(),
        suburb: String(formData.get("suburb") || "").trim(),
        postcode,
        state: String(formData.get("state") || "").trim(),
      }, { allowLegacyFallback: false });
      setAuthMessage(messageTarget, "Delivery address updated.");
    } catch (error) {
      const message = isMissingProfileColumnError(error)
        ? "The profile table still needs the account fields migration before this page can save address fields."
        : getReadableAuthError(error);
      setAuthMessage(messageTarget, message, "error");
    }
  });
}

async function initPendingOrdersPage() {
  const root = document.querySelector("[data-pending-orders-page]");
  if (!(root instanceof HTMLElement)) return;

  const listTarget = root.querySelector("[data-pending-orders-list]");
  const messageTarget = root.querySelector("[data-pending-orders-message]");
  const queryInput = root.querySelector("[data-pending-orders-query]");
  const badgeTarget = root.querySelector("[data-pending-orders-count]");
  if (!(listTarget instanceof HTMLElement)) return;

  const authState = await requireSignedInAccountPage(messageTarget);
  if (!authState) return;

  try {
    const records = await loadCustomerOrders(authState.supabase, authState.user, 100);
    const pendingRecords = records.filter((record) => !isCompletedOrderRecord(record));
    if (badgeTarget instanceof HTMLElement) {
      badgeTarget.textContent = String(pendingRecords.length);
    }

    const render = () => {
      const query = String(queryInput?.value || "").trim().toLowerCase();
      const filtered = !query
        ? pendingRecords
        : pendingRecords.filter((record) => normalizeOrderSearchRecord(record).includes(query));
      renderAccountOrderCards(listTarget, filtered, "pending");
      setAuthMessage(messageTarget, `Showing ${filtered.length} pending order${filtered.length === 1 ? "" : "s"}.`);
    };

    render();
    queryInput?.addEventListener("input", render);
  } catch (error) {
    setAuthMessage(messageTarget, error instanceof Error ? error.message : "Pending orders could not be loaded.", "error");
    renderAccountOrderCards(listTarget, [], "pending");
  }
}

async function initCompletedOrdersPage() {
  const root = document.querySelector("[data-completed-orders-page]");
  if (!(root instanceof HTMLElement)) return;

  const listTarget = root.querySelector("[data-completed-orders-list]");
  const messageTarget = root.querySelector("[data-completed-orders-message]");
  const queryInput = root.querySelector("[data-completed-orders-query]");
  if (!(listTarget instanceof HTMLElement)) return;

  const authState = await requireSignedInAccountPage(messageTarget);
  if (!authState) return;

  try {
    const records = await loadCustomerOrders(authState.supabase, authState.user, 100);
    const completedRecords = records.filter((record) => isCompletedOrderRecord(record));

    const render = () => {
      const query = String(queryInput?.value || "").trim().toLowerCase();
      const filtered = !query
        ? completedRecords
        : completedRecords.filter((record) => normalizeOrderSearchRecord(record).includes(query));
      renderAccountOrderCards(listTarget, filtered, "completed");
      setAuthMessage(messageTarget, `Showing ${filtered.length} completed order${filtered.length === 1 ? "" : "s"}.`);
    };

    render();
    queryInput?.addEventListener("input", render);
  } catch (error) {
    setAuthMessage(messageTarget, error instanceof Error ? error.message : "Completed orders could not be loaded.", "error");
    renderAccountOrderCards(listTarget, [], "completed");
  }
}

async function initRepairBookingsPage() {
  const root = document.querySelector("[data-repair-bookings-page]");
  if (!(root instanceof HTMLElement)) return;

  const listTarget = root.querySelector("[data-repair-bookings-list]");
  const messageTarget = root.querySelector("[data-repair-bookings-message]");
  const queryInput = root.querySelector("[data-repair-bookings-query]");
  const rangeSelect = root.querySelector("[data-repair-bookings-range]");
  if (!(listTarget instanceof HTMLElement)) return;

  const authState = await requireSignedInAccountPage(messageTarget);
  if (!authState) return;

  try {
    const records = await loadCustomerRepairBookings(authState.supabase, authState.user, 100);

    const render = () => {
      const query = String(queryInput?.value || "").trim().toLowerCase();
      const rangeDays = String(rangeSelect?.value || "all");
      const now = Date.now();

      const filtered = records.filter((record) => {
        if (query && !normalizeRepairSearchRecord(record).includes(query)) {
          return false;
        }

        if (rangeDays !== "all") {
          const createdAt = Date.parse(record.created_at || "");
          if (!Number.isFinite(createdAt)) return false;
          const ageDays = (now - createdAt) / (1000 * 60 * 60 * 24);
          if (ageDays > Number(rangeDays)) return false;
        }

        return true;
      });

      renderAccountRepairCards(listTarget, filtered);
      setAuthMessage(messageTarget, `Showing ${filtered.length} repair booking${filtered.length === 1 ? "" : "s"}.`);
    };

    render();
    queryInput?.addEventListener("input", render);
    rangeSelect?.addEventListener("change", render);
  } catch (error) {
    setAuthMessage(messageTarget, error instanceof Error ? error.message : "Repair bookings could not be loaded.", "error");
    renderAccountRepairCards(listTarget, []);
  }
}

async function initWarrantyReturnsPage() {
  const root = document.querySelector("[data-warranty-returns-page]");
  if (!(root instanceof HTMLElement)) return;

  const messageTarget = root.querySelector("[data-warranty-returns-message]");
  const listTarget = root.querySelector("[data-warranty-returns-list]");
  const searchButton = root.querySelector("[data-warranty-search]");
  const returnButton = root.querySelector("[data-warranty-return-action]");
  const queryInput = root.querySelector("[data-warranty-returns-query]");

  const authState = await requireSignedInAccountPage(messageTarget);
  if (!authState) return;

  if (messageTarget instanceof HTMLElement) {
    setAuthMessage(messageTarget, "Warranty and return records are ready for backend connection. This page layout is in place.", "success");
  }

  searchButton?.addEventListener("click", () => {
    const query = String(queryInput?.value || "").trim();
    if (messageTarget instanceof HTMLElement) {
      setAuthMessage(
        messageTarget,
        query
          ? `Warranty search for "${query}" is ready once the warranty table is connected.`
          : "Enter an RA number or product name to search once the warranty backend is connected.",
        query ? "success" : "error"
      );
    }
  });

  returnButton?.addEventListener("click", () => {
    window.location.assign("store-policy.html");
  });

  if (listTarget instanceof HTMLElement && !listTarget.children.length) {
    listTarget.innerHTML = `
      <article class="account-empty-card">
        <h3>Warranty / RA integration pending</h3>
        <p>The frontend layout is ready. Once the warranty return table and workflow are added in Supabase, live RA records can render here.</p>
      </article>
    `;
  }
}

async function initMyOrdersPage() {
  const root = document.querySelector("[data-my-orders-page]");
  if (!(root instanceof HTMLElement)) return;

  const listTarget = root.querySelector("[data-orders-history-list]");
  const messageTarget = root.querySelector("[data-orders-history-message]");
  if (!(listTarget instanceof HTMLElement)) return;

  const authState = await getCurrentAuthState();
  if (!authState.user || !authState.supabase) {
    if (messageTarget instanceof HTMLElement) {
      messageTarget.hidden = false;
      messageTarget.className = "booking-message is-error";
      messageTarget.textContent = "Sign in to view your order history.";
    }
    renderHistoryList(listTarget, [], "orders");
    return;
  }

  try {
    const records = await loadCustomerOrders(authState.supabase, authState.user, 100);
    if (messageTarget instanceof HTMLElement) {
      messageTarget.hidden = false;
      messageTarget.className = "booking-message is-success";
      messageTarget.textContent = `Showing ${records.length} order${records.length === 1 ? "" : "s"} linked to your account.`;
    }
    renderHistoryList(listTarget, records, "orders");
  } catch (error) {
    if (messageTarget instanceof HTMLElement) {
      messageTarget.hidden = false;
      messageTarget.className = "booking-message is-error";
      messageTarget.textContent = error instanceof Error ? error.message : "Order history could not be loaded.";
    }
    renderHistoryList(listTarget, [], "orders");
  }
}

async function initMyRepairsPage() {
  const root = document.querySelector("[data-my-repairs-page]");
  if (!(root instanceof HTMLElement)) return;

  const listTarget = root.querySelector("[data-repairs-history-list]");
  const messageTarget = root.querySelector("[data-repairs-history-message]");
  if (!(listTarget instanceof HTMLElement)) return;

  const authState = await getCurrentAuthState();
  if (!authState.user || !authState.supabase) {
    if (messageTarget instanceof HTMLElement) {
      messageTarget.hidden = false;
      messageTarget.className = "booking-message is-error";
      messageTarget.textContent = "Sign in to view your repair history.";
    }
    renderHistoryList(listTarget, [], "repairs");
    return;
  }

  try {
    const records = await loadCustomerRepairBookings(authState.supabase, authState.user, 100);
    if (messageTarget instanceof HTMLElement) {
      messageTarget.hidden = false;
      messageTarget.className = "booking-message is-success";
      messageTarget.textContent = `Showing ${records.length} repair request${records.length === 1 ? "" : "s"} linked to your account.`;
    }
    renderHistoryList(listTarget, records, "repairs");
  } catch (error) {
    if (messageTarget instanceof HTMLElement) {
      messageTarget.hidden = false;
      messageTarget.className = "booking-message is-error";
      messageTarget.textContent = error instanceof Error ? error.message : "Repair history could not be loaded.";
    }
    renderHistoryList(listTarget, [], "repairs");
  }
}

function initPage() {
  ensureAccountNavLink();
  ensureGlobalCartUi();
  updateCartIndicators();
  window.addEventListener("storage", () => updateCartIndicators());
  initFilters();
  initNavigation();
  initHomeBanner();
  initHomeFeaturedProducts();
  initStorefront();
  initCategoryPage();
  initProductDetailPage();
  initCartPage();
  initCheckoutPage();
  initCheckoutSuccessPage();
  initBookingForm();
  initAccountPage();
  initAccountDashboardPage();
  initAccountDetailsPage();
  initDeliveryAddressPage();
  initPendingOrdersPage();
  initCompletedOrdersPage();
  initRepairBookingsPage();
  initWarrantyReturnsPage();
  initRegisterPage();
  initForgotPasswordPage();
  initMyOrdersPage();
  initMyRepairsPage();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}
