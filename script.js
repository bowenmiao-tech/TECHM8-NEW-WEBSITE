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
  paymentMethodsEndpoint:
    "https://fwlronvmgqzkleofriis.supabase.co/functions/v1/payment-methods",
  siteUrl: "https://www.techm8australia.com/",
  googleMapsApiKey: "AIzaSyAecM2vtQCDDZCSOJvx2dgdZBfsM_fz1QM",
  zipPublicKey: "",
  zipWidgetEnvironment: "production",
  zipMarketingEnabled: false,
};

const ZIP_WIDGET_SCRIPT_URL =
  "https://static.zip.co/lib/js/zm-widget-js/dist/zip-widget.min.js";
let zipWidgetLibraryPromise = null;

function getZipMarketingConfig() {
  const publicKey = String(window.TECHM8_CONFIG?.zipPublicKey || "").trim();
  const environment =
    String(window.TECHM8_CONFIG?.zipWidgetEnvironment || "production")
      .trim()
      .toLowerCase() === "sandbox"
      ? "sandbox"
      : "production";
  return {
    publicKey,
    environment,
    enabled:
      window.TECHM8_CONFIG?.zipMarketingEnabled === true && Boolean(publicKey),
  };
}

function ensureZipWidgetLibrary() {
  if (zipWidgetLibraryPromise) return zipWidgetLibraryPromise;
  const existing = document.querySelector("script[data-techm8-zip-widget-library]");
  if (existing instanceof HTMLScriptElement) {
    zipWidgetLibraryPromise = Promise.resolve(existing);
    return zipWidgetLibraryPromise;
  }
  zipWidgetLibraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = ZIP_WIDGET_SCRIPT_URL;
    script.async = true;
    script.dataset.techm8ZipWidgetLibrary = "true";
    script.addEventListener("load", () => resolve(script), { once: true });
    script.addEventListener("error", () => reject(new Error("Zip messaging could not be loaded.")), { once: true });
    document.head.append(script);
  });
  return zipWidgetLibraryPromise;
}

function initZipMarketingAssets(root = document) {
  const config = getZipMarketingConfig();
  if (!config.enabled) return;

  const scope = root instanceof Element || root instanceof Document ? root : document;
  const productAndCartWidgets = scope.querySelectorAll(
    "[data-zip-product-widget], [data-zip-cart-widget]",
  );
  productAndCartWidgets.forEach((widget) => {
    if (!(widget instanceof HTMLElement)) return;
    const price = Number(widget.dataset.zipPrice || "0");
    if (!(price > 0)) return;
    widget.hidden = false;
    widget.style.cursor = "pointer";
    widget.setAttribute("data-zm-widget", "popup");
    widget.setAttribute("data-zm-region", "au");
    widget.setAttribute("data-env", config.environment);
    widget.setAttribute("data-zm-merchant", config.publicKey);
    widget.setAttribute("data-zm-price", price.toFixed(2));
    widget.setAttribute("data-zm-asset", "productwidget");
    widget.setAttribute("data-zm-popup-asset", "termsdialog");
  });

  scope.querySelectorAll("[data-zip-landing-widget]").forEach((widget) => {
    if (!(widget instanceof HTMLElement)) return;
    widget.hidden = false;
    widget.setAttribute("zm-asset", "landingpage");
    widget.setAttribute("zm-widget", "inline");
    widget.setAttribute("data-zm-region", "au");
    widget.setAttribute("data-env", config.environment);
    widget.setAttribute("data-zm-merchant", config.publicKey);
    const fallback = widget.parentElement?.querySelector("[data-zip-landing-fallback]");
    if (fallback instanceof HTMLElement) fallback.hidden = true;
  });

  document.querySelectorAll(".site-footer .footer--bottom").forEach((footer) => {
    if (!(footer instanceof HTMLElement) || footer.querySelector("[data-zip-footer-link]")) return;
    const link = document.createElement("a");
    link.href = "/zip.html";
    link.dataset.zipFooterLink = "true";
    link.className = "zip-footer-link";
    link.setAttribute("aria-label", "Learn about paying with Zip");
    link.innerHTML = `<img src="https://static.zip.co/developers/assets/default/footer-tile/footer-tile-new.png" alt="Zip payment icon" height="24" loading="lazy">`;
    footer.append(link);
  });

  if (productAndCartWidgets.length || scope.querySelector("[data-zip-landing-widget]")) {
    ensureZipWidgetLibrary().catch((error) => console.error(error));
  }
}

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
  return window.innerWidth <= 1120;
}

function keepMobileMenuOpen() {
  if (!isMobileNavigation()) return;
  setMobileMenuState(true);
}

function expandMobileRepairsContainer(dropdown) {
  if (!isMobileNavigation() || !(dropdown instanceof HTMLElement)) return;
  const mobilePanel = dropdown.querySelector(".nav__mobile-repairs");
  if (!(mobilePanel instanceof HTMLElement)) return;
  mobilePanel.style.maxHeight = `${mobilePanel.scrollHeight + 480}px`;
}

function setMobileMenuState(isOpen) {
  const mobileInput = document.querySelector(".nav__mobile-input");
  const navMenu = document.querySelector(".nav__menu");
  const navToggle = document.querySelector(
    ".nav__toggle--open, .nav > .nav__toggle",
  );
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
    group
      .querySelector(".nav__submenu-toggle")
      ?.setAttribute("aria-expanded", "false");
  });
}

function closeAllMobileRepairsGroups(exceptGroup) {
  document
    .querySelectorAll(".nav__mobile-repairs-group.is-open")
    .forEach((group) => {
      if (group === exceptGroup) return;
      group.classList.remove("is-open");
      group
        .querySelector(".nav__mobile-repairs-toggle")
        ?.setAttribute("aria-expanded", "false");
    });
}

function openSubmenuGroup(group) {
  if (!(group instanceof HTMLElement)) return;
  closeAllSubmenus(group);
  group.classList.add("is-open");
  group
    .querySelector(".nav__submenu-toggle")
    ?.setAttribute("aria-expanded", "true");
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

const MOBILE_REPAIR_GROUPS = [
  {
    label: "Phones",
    links: [
      ["Apple", "repair-services/phones/apple.html"],
      ["Samsung", "repair-services/phones/samsung.html"],
      ["Oppo", "repair-services/phones/oppo.html"],
      ["Huawei", "repair-services/phones/huawei.html"],
      ["Xiaomi", "repair-services/phones/xiaomi.html"],
      ["Google", "repair-services/phones/google.html"],
      ["OnePlus", "repair-services/phones/oneplus.html"],
      ["Others", "repair-services/phones/others.html"],
    ],
  },
  {
    label: "Tablets",
    links: [
      ["Apple", "repair-services/tablets/apple.html"],
      ["Samsung", "repair-services/tablets/samsung.html"],
      ["Other Tablets", "repair-services/tablets/other.html"],
    ],
  },
  {
    label: "Computers",
    links: [
      ["PC Tower", "repair-services/computers/pc-tower.html"],
      ["All in One", "repair-services/computers/all-in-one.html"],
      ["Laptop", "repair-services/computers/laptop.html"],
      ["Small PC", "repair-services/computers/small-pc.html"],
    ],
  },
  {
    label: "Game Consoles",
    links: [
      ["Sony", "repair-services/consoles/sony.html"],
      ["Xbox", "repair-services/consoles/xbox.html"],
      ["Nintendo", "repair-services/consoles/nintendo.html"],
    ],
  },
];

function getSiteRelativePrefix() {
  const directoryPath = window.location.pathname.replace(/\/[^/]*$/, "/");
  const siteRootMarker = "/TECHM8-NEW-WEBSITE/";
  const relativeDirectory = directoryPath.includes(siteRootMarker)
    ? directoryPath.split(siteRootMarker)[1]
    : directoryPath.replace(/^\//, "");
  const depth = relativeDirectory.split("/").filter(Boolean).length;
  return depth > 0 ? "../".repeat(depth) : "";
}

function buildSiteRelativeHref(path) {
  const safePath = String(path || "").replace(/^\/+/, "");
  return `${getSiteRelativePrefix()}${safePath}`;
}

function decorateStoreLocatorMenu() {
  document.querySelectorAll(".nav__dropdown--stores").forEach((dropdown) => {
    const toggle = dropdown.querySelector(".nav__dropdown-toggle");
    if (!(toggle instanceof HTMLElement)) return;

    toggle.textContent = "Store Locator";

    const title = dropdown.querySelector(".store-switcher__top strong");
    if (title instanceof HTMLElement) {
      title.textContent = "Store Locator";
    }
  });
}

function normalizeDesktopPhoneRepairSubmenu(repairsDropdown) {
  if (!(repairsDropdown instanceof HTMLElement)) return;

  const phoneGroup = Array.from(
    repairsDropdown.querySelectorAll(
      ".nav__dropdown-menu .nav__dropdown-group",
    ),
  ).find((group) => {
    const toggle = group.querySelector(".nav__submenu-toggle");
    return toggle?.textContent?.trim().toLowerCase() === "phones";
  });
  if (!(phoneGroup instanceof HTMLElement)) return;

  const phoneLinks =
    MOBILE_REPAIR_GROUPS.find((group) => group.label === "Phones")?.links || [];
  const linksPanel = phoneGroup.querySelector(".nav__submenu-panel");
  if (!(linksPanel instanceof HTMLElement)) return;

  linksPanel.replaceChildren();
  phoneLinks.forEach(([label, href]) => {
    const link = document.createElement("a");
    link.href = buildSiteRelativeHref(href);
    link.textContent = label;
    linksPanel.appendChild(link);
  });
}

function decorateMobileRepairsAccordion() {
  const repairsDropdown = Array.from(
    document.querySelectorAll(".nav__dropdown"),
  ).find((dropdown) => {
    const toggle = dropdown.querySelector(".nav__dropdown-toggle");
    return toggle?.dataset.href?.includes("repairs.html");
  });

  if (!(repairsDropdown instanceof HTMLElement)) return;
  repairsDropdown.classList.add("nav__dropdown--repairs");
  normalizeDesktopPhoneRepairSubmenu(repairsDropdown);

  if (repairsDropdown.querySelector(".nav__mobile-repairs")) return;

  const mobilePanel = document.createElement("div");
  mobilePanel.className = "nav__mobile-repairs";

  MOBILE_REPAIR_GROUPS.forEach((group, index) => {
    const groupEl = document.createElement("div");
    groupEl.className = "nav__mobile-repairs-group";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav__mobile-repairs-toggle";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("data-mobile-repairs-toggle", String(index));
    button.textContent = group.label;

    const linksPanel = document.createElement("div");
    linksPanel.className = "nav__mobile-repairs-panel";

    group.links.forEach(([label, href]) => {
      const link = document.createElement("a");
      link.href = buildSiteRelativeHref(href);
      link.textContent = label;
      link.addEventListener(
        "touchstart",
        (e) => {
          e.stopPropagation();
          keepMobileMenuOpen();
        },
        { passive: true },
      );
      link.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        keepMobileMenuOpen();
      });
      linksPanel.appendChild(link);
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
  const destination =
    dropdownToggle.dataset.href || dropdownToggle.getAttribute("href");

  if (isMobileNavigation()) {
    event.preventDefault();
    const alreadyOpen = dropdown.classList.contains("is-open");
    if (alreadyOpen && destination) {
      window.location.href = destination;
      return;
    }

    const willOpen = !alreadyOpen;
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
  if (!(group instanceof HTMLElement) || !(dropdown instanceof HTMLElement))
    return;

  const isOpen = group.classList.contains("is-open");
  dropdown.classList.add("is-open");
  dropdown
    .querySelector(".nav__dropdown-toggle")
    ?.setAttribute("aria-expanded", "true");
  keepMobileMenuOpen();
  closeAllMobileRepairsGroups(group);
  group.classList.toggle("is-open", !isOpen);
  toggle.setAttribute("aria-expanded", String(!isOpen));
  window.requestAnimationFrame(() => expandMobileRepairsContainer(dropdown));
}

function handleMobileRepairsActivation(event, toggle) {
  if (!isMobileNavigation()) return;

  event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === "function") {
    event.stopImmediatePropagation();
  }

  const now = Date.now();
  const previous = Number(toggle.dataset.mobileRepairsActivatedAt || 0);
  if (now - previous < 450) {
    keepMobileMenuOpen();
    return;
  }

  toggle.dataset.mobileRepairsActivatedAt = String(now);
  handleMobileRepairsToggle(event, toggle);
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

    const links = Array.from(
      switcher.querySelectorAll(".store-switcher__link"),
    );

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

function loadGoogleMapsApi() {
  const apiKey = String(window.TECHM8_CONFIG?.googleMapsApiKey || "").trim();
  if (!apiKey) {
    return Promise.reject(new Error("Google Maps API key is not configured."));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (window.__techm8GoogleMapsPromise) {
    return window.__techm8GoogleMapsPromise;
  }

  window.__techm8GoogleMapsPromise = new Promise((resolve, reject) => {
    const callbackName = `techm8GoogleMapsReady_${Date.now()}`;
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      callback: callbackName,
      loading: "async",
      v: "weekly",
    });

    window[callbackName] = () => {
      delete window[callbackName];
      resolve(window.google.maps);
    };

    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      delete window[callbackName];
      window.__techm8GoogleMapsPromise = null;
      reject(new Error("Google Maps JavaScript API could not be loaded."));
    };
    document.head.appendChild(script);
  });

  return window.__techm8GoogleMapsPromise;
}

function initStoresLocator() {
  const root = document.querySelector("[data-store-locator]");
  if (!(root instanceof HTMLElement)) return;

  const storeOrder = [
    "park-ridge",
    "fairfield",
    "toowong",
    "north-lakes",
    "brassall",
  ];
  const cards = Array.from(root.querySelectorAll("[data-store-card]"));
  const searchInput = root.querySelector("[data-store-search]");
  const countTarget = root.querySelector("[data-store-count]");
  const addressForm = root.querySelector("[data-store-address-form]");
  const addressInput = root.querySelector("[data-store-address-search]");
  const mapCanvas = root.querySelector("[data-store-map-canvas]");
  const mapShell = mapCanvas?.closest(".store-locator__map");
  const mapFrame = root.querySelector("[data-store-map]");
  const mapTitle = root.querySelector("[data-store-map-title]");
  const mapAddress = root.querySelector("[data-store-map-address]");
  const directionsLink = root.querySelector("[data-store-directions]");
  const pageLink = root.querySelector("[data-store-page]");
  const allStoresButton = root.querySelector("[data-store-all]");
  const locateButton = root.querySelector("[data-store-locate]");
  const locationStatus = root.querySelector("[data-store-location-status]");
  const recommendation = root.querySelector("[data-store-recommendation]");
  const recommendationTitle = root.querySelector(
    "[data-store-recommendation-title]",
  );
  const recommendationCopy = root.querySelector(
    "[data-store-recommendation-copy]",
  );
  const recommendationDirections = root.querySelector(
    "[data-store-recommendation-directions]",
  );
  const recommendationPage = root.querySelector(
    "[data-store-recommendation-page]",
  );
  const allStoresMapSrc =
    "https://www.google.com/maps?q=OZ%20Tech%20M8%20Queensland%20Australia&output=embed";
  const defaultMapCenter = { latitude: -27.485, longitude: 153.02 };
  let googleMap = null;
  let googleMaps = null;
  let infoWindow = null;
  let geocoder = null;
  let currentPosition = null;
  let userMarker = null;
  const storeMarkers = new Map();

  const getMapSrc = (store) => {
    const address = String(store?.address || "").trim();
    return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
  };

  const getDirectionsUrl = (store, origin = currentPosition) => {
    const destination = store?.coordinates
      ? `${store.coordinates.latitude},${store.coordinates.longitude}`
      : store?.address || "";
    const params = new URLSearchParams({
      api: "1",
      destination,
    });
    if (origin?.latitude && origin?.longitude) {
      params.set("origin", `${origin.latitude},${origin.longitude}`);
    }
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  };

  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const getDistanceKm = (from, to) => {
    const earthRadiusKm = 6371;
    const deltaLat = toRadians(to.latitude - from.latitude);
    const deltaLng = toRadians(to.longitude - from.longitude);
    const fromLat = toRadians(from.latitude);
    const toLat = toRadians(to.latitude);
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;
    return (
      earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
    );
  };

  const formatDistance = (distanceKm) => {
    if (!Number.isFinite(distanceKm)) return "";
    if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m away`;
    return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km away`;
  };

  const getStoresWithDistance = (position) =>
    storeOrder
      .map((slug) => {
        const store = STORE_CHECKOUT_DETAILS[slug];
        if (!store?.coordinates) return null;
        return {
          slug,
          store,
          distanceKm: getDistanceKm(position, store.coordinates),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceKm - b.distanceKm);

  const setLocationStatus = (message) => {
    if (locationStatus instanceof HTMLElement) {
      locationStatus.textContent = message;
    }
  };

  const toGoogleLatLng = (position) => ({
    lat: position.latitude,
    lng: position.longitude,
  });

  const fitInteractiveMap = (selectedSlug = "") => {
    if (!googleMap || !googleMaps) return;

    const bounds = new googleMaps.LatLngBounds();
    storeOrder.forEach((slug) => {
      const store = STORE_CHECKOUT_DETAILS[slug];
      if (store?.coordinates) {
        bounds.extend(toGoogleLatLng(store.coordinates));
      }
    });
    if (currentPosition) {
      bounds.extend(toGoogleLatLng(currentPosition));
    }

    if (!bounds.isEmpty()) {
      googleMap.fitBounds(bounds, 56);
    }

    if (selectedSlug) {
      const store = STORE_CHECKOUT_DETAILS[selectedSlug];
      if (store?.coordinates) {
        googleMap.panTo(toGoogleLatLng(store.coordinates));
        googleMap.setZoom(Math.max(googleMap.getZoom() || 12, 13));
      }
    }
  };

  const openStoreInfoWindow = (slug) => {
    const store = STORE_CHECKOUT_DETAILS[slug];
    const marker = storeMarkers.get(slug);
    if (!googleMap || !googleMaps || !infoWindow || !store || !marker) return;

    infoWindow.setContent(`
      <div class="store-locator-map-window">
        <strong>${escapeHtml(store.title)}</strong>
        <p>${escapeHtml(store.address)}</p>
        <a href="${escapeHtml(getDirectionsUrl(store))}" target="_blank" rel="noopener">Directions</a>
      </div>
    `);
    infoWindow.open({
      anchor: marker,
      map: googleMap,
    });
  };

  const showAllStores = () => {
    cards.forEach((card) => {
      card.classList.remove("is-active");
      card.setAttribute("aria-pressed", "false");
      card.style.order = "";
      const distanceTarget = card.querySelector("[data-store-distance]");
      if (distanceTarget instanceof HTMLElement) {
        distanceTarget.textContent = "";
      }
    });
    if (recommendation instanceof HTMLElement) {
      recommendation.hidden = true;
    }
    setLocationStatus(
      "Allow location access to see the nearest TECHM8 store first.",
    );
    if (mapFrame instanceof HTMLIFrameElement) {
      mapFrame.src = allStoresMapSrc;
      mapFrame.title = "OZ Tech M8 Queensland Google Map";
    }
    if (mapTitle instanceof HTMLElement) {
      mapTitle.textContent = "All TECHM8 stores";
    }
    if (mapAddress instanceof HTMLElement) {
      mapAddress.textContent =
        "Search result view for OZ Tech M8 stores across Queensland.";
    }
    if (directionsLink instanceof HTMLAnchorElement) {
      directionsLink.href =
        "https://www.google.com/maps/search/?api=1&query=OZ%20Tech%20M8%20Queensland%20Australia";
    }
    if (pageLink instanceof HTMLAnchorElement) {
      pageLink.href = "stores.html";
    }
    fitInteractiveMap();
  };

  const updateRecommendation = (nearest) => {
    if (
      !(recommendation instanceof HTMLElement) ||
      !(recommendationTitle instanceof HTMLElement) ||
      !(recommendationCopy instanceof HTMLElement)
    ) {
      return;
    }

    recommendation.hidden = false;
    recommendationTitle.textContent = nearest.store.title;
    recommendationCopy.textContent = `${formatDistance(nearest.distanceKm)}. ${nearest.store.summary}`;

    if (recommendationDirections instanceof HTMLAnchorElement) {
      recommendationDirections.href = getDirectionsUrl(nearest.store);
    }
    if (recommendationPage instanceof HTMLAnchorElement) {
      recommendationPage.href = nearest.store.pageUrl || "stores.html";
    }
  };

  const applyLocationDistances = (position) => {
    currentPosition = position;
    const storesByDistance = getStoresWithDistance(position);
    if (!storesByDistance.length) return;

    const distanceBySlug = new Map(
      storesByDistance.map((item) => [item.slug, item.distanceKm]),
    );

    cards.forEach((card) => {
      const slug = card.getAttribute("data-store-card") || "";
      const distanceTarget = card.querySelector("[data-store-distance]");
      const distanceKm = distanceBySlug.get(slug);
      if (distanceTarget instanceof HTMLElement) {
        distanceTarget.textContent = formatDistance(distanceKm);
      }
      const rank = storesByDistance.findIndex((item) => item.slug === slug);
      card.style.order = rank >= 0 ? String(rank) : "";
    });

    const nearest = storesByDistance[0];
    updateRecommendation(nearest);
    selectStore(nearest.slug);
    if (googleMap && googleMaps) {
      if (userMarker) {
        userMarker.setMap(null);
      }
      userMarker = new googleMaps.Marker({
        map: googleMap,
        position: toGoogleLatLng(position),
        title: "Your location",
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#0b7cff",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });
      fitInteractiveMap(nearest.slug);
    }
    setLocationStatus(
      `Showing stores nearest to your current location. Closest match: ${nearest.store.title}.`,
    );
  };

  const selectStore = (slug) => {
    const store = STORE_CHECKOUT_DETAILS[slug];
    if (!store) return;

    cards.forEach((card) => {
      const isActive = card.getAttribute("data-store-card") === slug;
      card.classList.toggle("is-active", isActive);
      card.setAttribute("aria-pressed", String(isActive));
    });

    if (mapFrame instanceof HTMLIFrameElement) {
      mapFrame.src = getMapSrc(store);
      mapFrame.title = `OZ Tech M8 ${store.title} Google Map`;
    }
    if (mapTitle instanceof HTMLElement) {
      mapTitle.textContent = store.title;
    }
    if (mapAddress instanceof HTMLElement) {
      mapAddress.textContent = store.address;
    }
    if (directionsLink instanceof HTMLAnchorElement) {
      directionsLink.href = currentPosition
        ? getDirectionsUrl(store)
        : store.mapUrl || getMapSrc(store);
    }
    if (pageLink instanceof HTMLAnchorElement) {
      pageLink.href = store.pageUrl || "stores.html";
    }
    if (googleMap && store.coordinates) {
      googleMap.panTo(toGoogleLatLng(store.coordinates));
      googleMap.setZoom(Math.max(googleMap.getZoom() || 12, 13));
      openStoreInfoWindow(slug);
    }
  };

  const searchAddress = (address) => {
    const query = String(address || "").trim();
    if (!query) {
      setLocationStatus("Enter a suburb, postcode or address to find the nearest store.");
      return;
    }

    if (!geocoder) {
      setLocationStatus(
        "Address search is still loading. Try again in a few seconds.",
      );
      return;
    }

    setLocationStatus("Searching for that location.");
    geocoder.geocode(
      {
        address: query,
        componentRestrictions: { country: "AU" },
        region: "au",
      },
      (results, status) => {
        const location = results?.[0]?.geometry?.location;
        if (status !== "OK" || !location) {
          setLocationStatus(
            "That location could not be found. Try a Brisbane suburb, postcode or full address.",
          );
          return;
        }
        applyLocationDistances({
          latitude: location.lat(),
          longitude: location.lng(),
        });
      },
    );
  };

  const initInteractiveMap = (maps) => {
    if (!(mapCanvas instanceof HTMLElement)) return;
    googleMaps = maps;
    geocoder = new maps.Geocoder();
    infoWindow = new maps.InfoWindow();
    googleMap = new maps.Map(mapCanvas, {
      center: toGoogleLatLng(defaultMapCenter),
      zoom: 10,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    mapShell?.classList.add("is-interactive");

    storeOrder.forEach((slug) => {
      const store = STORE_CHECKOUT_DETAILS[slug];
      if (!store?.coordinates) return;
      const marker = new maps.Marker({
        map: googleMap,
        position: toGoogleLatLng(store.coordinates),
        title: store.title,
      });
      marker.addListener("click", () => selectStore(slug));
      storeMarkers.set(slug, marker);
    });

    fitInteractiveMap();
  };

  cards.forEach((card) => {
    const slug = card.getAttribute("data-store-card") || "";
    if (storeOrder.includes(slug)) {
      card.setAttribute(
        "aria-pressed",
        card.classList.contains("is-active") ? "true" : "false",
      );
      card.addEventListener("click", () => selectStore(slug));
    }
  });

  if (allStoresButton instanceof HTMLButtonElement) {
    allStoresButton.addEventListener("click", showAllStores);
  }

  const requestCurrentLocation = (options = {}) => {
    const automatic = Boolean(options.automatic);
    if (!("geolocation" in navigator)) {
      if (locateButton instanceof HTMLButtonElement) {
        locateButton.disabled = true;
      }
      setLocationStatus(
        "Your browser does not support location access. Search by suburb or choose a store from the list.",
      );
      return;
    }

    if (locateButton instanceof HTMLButtonElement) {
      locateButton.disabled = true;
      locateButton.textContent = "Finding nearest store...";
    }
    setLocationStatus(
      automatic
        ? "Allow location access in your browser to show your nearest TECHM8 store."
        : "Requesting location permission from your browser.",
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (locateButton instanceof HTMLButtonElement) {
          locateButton.disabled = false;
          locateButton.textContent = "Use my current location";
        }
        applyLocationDistances({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        if (locateButton instanceof HTMLButtonElement) {
          locateButton.disabled = false;
          locateButton.textContent = "Use my current location";
        }
        setLocationStatus(
          "Location access was not available. Search by suburb or choose a store manually.",
        );
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: 10000,
      },
    );
  };

  const requestCurrentLocationOnLoad = () => {
    if (!("geolocation" in navigator)) {
      setLocationStatus(
        "Your browser does not support location access. Search by suburb or choose a store from the list.",
      );
      return;
    }

    window.setTimeout(() => {
      requestCurrentLocation({ automatic: true });
    }, 250);
  };

  if (locateButton instanceof HTMLButtonElement) {
    locateButton.addEventListener("click", () => {
      requestCurrentLocation();
    });
  }

  if (addressForm instanceof HTMLFormElement) {
    addressForm.addEventListener("submit", (event) => {
      event.preventDefault();
      searchAddress(
        addressInput instanceof HTMLInputElement ? addressInput.value : "",
      );
    });
  }

  if (searchInput instanceof HTMLInputElement) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();
      let visibleCount = 0;

      cards.forEach((card) => {
        const slug = card.getAttribute("data-store-card") || "";
        const store = STORE_CHECKOUT_DETAILS[slug];
        const searchable = [
          store?.title,
          store?.address,
          store?.phone,
          card.textContent,
        ]
          .join(" ")
          .toLowerCase();
        const isVisible = !query || searchable.includes(query);
        card.hidden = !isVisible;
        if (isVisible) visibleCount += 1;
      });

      if (countTarget instanceof HTMLElement) {
        countTarget.textContent = `${visibleCount} store${visibleCount === 1 ? "" : "s"}`;
      }
    });
  }

  const initialSlug =
    cards
      .find((card) => card.classList.contains("is-active"))
      ?.getAttribute("data-store-card") || "";
  if (initialSlug) {
    selectStore(initialSlug);
  } else {
    showAllStores();
  }

  requestCurrentLocationOnLoad();

  loadGoogleMapsApi()
    .then(initInteractiveMap)
    .catch(() => {
      setLocationStatus(
        "Interactive Google Map is unavailable. Store search and location recommendation still work.",
      );
    });
}

function initHomeBanner() {
  const banner = document.querySelector("[data-home-banner]");
  if (!(banner instanceof HTMLElement)) return;

  const slides = Array.from(banner.querySelectorAll("[data-banner-slide]"));
  const dots = Array.from(banner.querySelectorAll("[data-banner-dot]"));
  const prev = banner.querySelector("[data-banner-prev]");
  const next = banner.querySelector("[data-banner-next]");
  const currentCount = banner.querySelector("[data-banner-current]");
  const totalCount = banner.querySelector("[data-banner-total]");

  if (!slides.length) return;

  let current = 0;
  let timer;
  let touchStartX = 0;
  let touchDeltaX = 0;

  if (totalCount instanceof HTMLElement) {
    totalCount.textContent = String(slides.length);
  }

  const hydrateSlideImage = (slide) => {
    if (!(slide instanceof HTMLElement)) return;
    const image = slide.querySelector("img[data-src]");
    if (!(image instanceof HTMLImageElement)) return;
    image.src = image.dataset.src || "";
    if (image.dataset.srcset) image.srcset = image.dataset.srcset;
    if (image.dataset.sizes) image.sizes = image.dataset.sizes;
    delete image.dataset.src;
    delete image.dataset.srcset;
    delete image.dataset.sizes;
  };

  const render = (index) => {
    current = (index + slides.length) % slides.length;
    hydrateSlideImage(slides[current]);
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === current);
    });
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === current);
    });
    if (currentCount instanceof HTMLElement) {
      currentCount.textContent = String(current + 1);
    }
  };

  const restart = (delay = 5000) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      render(current + 1);
      restart();
    }, delay);
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

  banner.addEventListener("mouseenter", () => {
    window.clearTimeout(timer);
  });

  banner.addEventListener("mouseleave", () => {
    restart();
  });

  banner.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.touches[0]?.clientX ?? 0;
      touchDeltaX = 0;
    },
    { passive: true },
  );

  banner.addEventListener(
    "touchmove",
    (event) => {
      const currentX = event.touches[0]?.clientX ?? touchStartX;
      touchDeltaX = currentX - touchStartX;
    },
    { passive: true },
  );

  banner.addEventListener("touchend", () => {
    if (Math.abs(touchDeltaX) < 36) return;
    if (touchDeltaX < 0) {
      render(current + 1);
    } else {
      render(current - 1);
    }
    restart();
  });

  render(0);
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      slides[0]?.removeAttribute("data-banner-initial");
    });
  });
  restart(10000);
}

function initRepairCountMeter() {
  const meter = document.querySelector("[data-repair-count]");
  if (!(meter instanceof HTMLElement)) return;

  const digitsTarget = meter.querySelector("[data-repair-count-digits]");
  if (!(digitsTarget instanceof HTMLElement)) return;

  const startCount = Number(meter.dataset.startCount || 9895);
  const startDate = String(meter.dataset.startDate || "2026-05-31");
  const startDateMatch = startDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!Number.isFinite(startCount) || !startDateMatch) return;

  const getBrisbaneDate = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Australia/Brisbane",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );

    return new Date(Date.UTC(values.year, values.month - 1, values.day));
  };

  const start = new Date(
    Date.UTC(
      Number(startDateMatch[1]),
      Number(startDateMatch[2]) - 1,
      Number(startDateMatch[3]),
    ),
  );
  const today = getBrisbaneDate();
  const dayMs = 24 * 60 * 60 * 1000;
  const elapsedDays = Math.max(0, Math.floor((today - start) / dayMs));

  const dailyIncrease = (dayIndex) => {
    let seed = Math.imul(dayIndex + 37, 2654435761) >>> 0;
    seed ^= seed >>> 15;
    seed = Math.imul(seed, 2246822519) >>> 0;
    seed ^= seed >>> 13;
    return 3 + (seed % 8);
  };

  let total = startCount;
  for (let day = 1; day <= elapsedDays; day += 1) {
    total += dailyIncrease(day);
  }

  const formatCount = (value) =>
    new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 }).format(value);

  const renderDigits = (value) => {
    const formatted = formatCount(value);
    digitsTarget.setAttribute("aria-label", `${formatted} devices repaired`);
    digitsTarget.innerHTML = Array.from(formatted)
      .map((char) => {
        if (/\d/.test(char)) {
          return `<span class="repair-count-meter__digit" aria-hidden="true">${char}</span>`;
        }
        return `<span class="repair-count-meter__separator" aria-hidden="true">${char}</span>`;
      })
      .join("");
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    renderDigits(total);
    return;
  }

  const animationStart = Math.max(startCount, total - 36);
  const durationMs = 900;
  const startedAt = performance.now();

  const tick = (now) => {
    const progress = Math.min(1, (now - startedAt) / durationMs);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(animationStart + (total - animationStart) * eased);
    renderDigits(current);

    if (progress < 1) {
      window.requestAnimationFrame(tick);
    }
  };

  renderDigits(animationStart);
  window.requestAnimationFrame(tick);
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

  return `AU$${new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function trackGa4Event(name, params = {}) {
  if (!name || typeof window.trackTechM8Event !== "function") {
    return false;
  }

  return window.trackTechM8Event(name, params);
}

function getGa4ProductUnitPrice(product) {
  if (!product || typeof product !== "object") {
    return 0;
  }

  const candidates = [
    product.retail_price,
    product.sale_price,
    product.promotional_price,
    product.online_price,
    product.price,
  ];

  for (const candidate of candidates) {
    const amount = Number(candidate);
    if (Number.isFinite(amount) && amount >= 0) {
      return amount;
    }
  }

  return 0;
}

function buildGa4Item(product, quantity = 1) {
  if (!product || typeof product !== "object") {
    return null;
  }

  const itemName =
    getProductDisplayName(product) ||
    product.name ||
    product.slug ||
    product.sku ||
    "TECHM8 Product";
  const itemPrice = getGa4ProductUnitPrice(product);

  return {
    item_id: String(product.sku || product.slug || itemName),
    item_name: String(itemName),
    item_brand: String(product.brand || "TECHM8"),
    item_category: String(
      product.category_name ||
        product.category ||
        product.category_slug ||
        "Products",
    ),
    item_variant: String(
      product.model || product.compatibility || product.condition_label || "",
    ),
    price: Number(itemPrice.toFixed(2)),
    quantity: Math.max(1, Number(quantity) || 1),
  };
}

function buildGa4ItemsFromCart(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => buildGa4Item(item, item?.qty || 1))
    .filter(Boolean);
}

function getGa4CartValue(items) {
  return buildGa4ItemsFromCart(items).reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);
}

function initGa4LinkTracking() {
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      const href = anchor.getAttribute("href") || "";
      if (!href) {
        return;
      }

      if (href.startsWith("tel:")) {
        trackGa4Event("click_call", {
          interaction_type: "phone",
        });
      }

      if (
        anchor.hasAttribute("data-map-link") ||
        /maps\.app\.goo\.gl|google\.com\/maps|maps\.google/i.test(href)
      ) {
        trackGa4Event("click_map", {
          interaction_type: "map",
        });
      }
    },
    { capture: true },
  );
}

const STORE_NAME_MAP = {
  "park-ridge": "Park Ridge",
  fairfield: "Fairfield",
  toowong: "Toowong",
  "north-lakes": "North Lakes",
  brassall: "Brassall",
  "warehouse-dispatch": "Warehouse Dispatch",
};

const STORE_CHECKOUT_DETAILS = {
  "park-ridge": {
    title: "Park Ridge",
    mode: "Click & Collect",
    summary:
      "Collect your order from the Park Ridge store once the team confirms pickup timing.",
    address: "Shop 11, 3732 Mount Lindesay Hwy, Park Ridge QLD 4125",
    phone: "0452 488 710",
    hours: "Mon-Sat 9:00 AM - 5:00 PM, Sun 10:00 AM - 4:00 PM",
    mapUrl: "https://maps.app.goo.gl/SBzYCp7G5C3UM4SdA",
    pageUrl: "stores/park-ridge.html",
    coordinates: { latitude: -27.6966, longitude: 153.0392 },
  },
  fairfield: {
    title: "Fairfield",
    mode: "Click & Collect",
    summary: "Pick up directly from Fairfield after order confirmation.",
    address: "Shop 8, 180 Fairfield Rd, Fairfield QLD 4103",
    phone: "0412 788 818",
    hours: "Mon-Sat 9:00 AM - 5:00 PM, Sun 10:00 AM - 4:00 PM",
    mapUrl: "https://maps.app.goo.gl/2iQqRL4YURm5cUfy7",
    pageUrl: "stores/fairfield.html",
    coordinates: { latitude: -27.5097, longitude: 153.0245 },
  },
  toowong: {
    title: "Toowong",
    mode: "Click & Collect",
    summary: "Collect from the Toowong store once your order is prepared.",
    address: "Ground Level Shop 53, 9 Sherwood Rd, Toowong QLD 4066",
    phone: "0485 500 099",
    hours: "Mon-Sat 9:00 AM - 5:00 PM, Sun 10:00 AM - 4:00 PM",
    mapUrl: "https://maps.app.goo.gl/9V7EERgpiuUjreQp7",
    pageUrl: "stores/toowong.html",
    coordinates: { latitude: -27.4854, longitude: 152.9922 },
  },
  "north-lakes": {
    title: "North Lakes",
    mode: "Click & Collect",
    summary:
      "North Lakes pickup with confirmation from the local team before collection.",
    address: "1114A N Lakes Drive, North Lakes QLD 4509",
    phone: "0482 390 009",
    hours: "Mon-Sat 9:00 AM - 5:00 PM, Sun 10:00 AM - 4:00 PM",
    mapUrl: "https://maps.app.goo.gl/ZdEjv8V98RxT9uCT7",
    pageUrl: "stores/north-lakes.html",
    coordinates: { latitude: -27.2409, longitude: 153.0189 },
  },
  brassall: {
    title: "Brassall",
    mode: "Click & Collect",
    summary:
      "Collect in store from Brassall once the order is packed and ready.",
    address:
      "68 Hunter St, Primewest Brassall Shopping Centre, Brassall QLD 4305",
    phone: "0403 999 366",
    hours: "Mon-Sat 9:00 AM - 5:00 PM, Sun 10:00 AM - 4:00 PM",
    mapUrl: "https://maps.app.goo.gl/ViJetRb1zEiMhGyZ7",
    pageUrl: "stores/brassall.html",
    coordinates: { latitude: -27.5969, longitude: 152.7471 },
  },
  "warehouse-dispatch": {
    title: "Warehouse Dispatch",
    mode: "Direct Shipping",
    summary:
      "Ship directly from warehouse. A full delivery address is required before payment can continue.",
    address: "Warehouse fulfilment only",
    phone: "",
    mapUrl: "",
    pageUrl: "",
  },
};

const CHECKOUT_SUCCESS_STORAGE_KEY = "techm8_checkout_success";

function saveCheckoutSuccessContext(payload) {
  try {
    sessionStorage.setItem(
      CHECKOUT_SUCCESS_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch (_error) {
    // Ignore storage failures and continue with query-string fallback.
  }
}

function readCheckoutSuccessContext(orderCode = "") {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_SUCCESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (
      orderCode &&
      String(parsed.order_code || "").trim() &&
      String(parsed.order_code || "").trim() !== String(orderCode || "").trim()
    ) {
      return null;
    }
    return parsed;
  } catch (_error) {
    return null;
  }
}

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
  const safeSlug = String(storeSlug || "")
    .trim()
    .toLowerCase();
  return STORE_NAME_MAP[safeSlug] || formatStatusLabel(safeSlug);
}

function getProductCreatedTimestamp(product) {
  const createdAt = product?.created_at ? Date.parse(product.created_at) : NaN;
  return Number.isFinite(createdAt) ? createdAt : null;
}

function compareProductsByLatest(left, right) {
  const rightCreated = getProductCreatedTimestamp(right);
  const leftCreated = getProductCreatedTimestamp(left);

  if (
    rightCreated !== null &&
    leftCreated !== null &&
    rightCreated !== leftCreated
  ) {
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
  if (
    Number.isFinite(rightId) &&
    Number.isFinite(leftId) &&
    rightId !== leftId
  ) {
    return rightId - leftId;
  }

  return (
    (Number(left?.catalog_index) || 0) - (Number(right?.catalog_index) || 0)
  );
}

const DEFAULT_PRODUCT_IMAGE_URL =
  "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/placeholders/image-coming-soon.png";
const SUPABASE_BROWSER_CDN_URL =
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
const SHARED_CATALOG_CACHE_KEY = "techm8:catalog:shared:v6";
const SHOP_CATALOG_CACHE_KEY = "techm8:catalog:shop:v6";
const HOME_LATEST_CATALOG_CACHE_KEY = "techm8:catalog:home-latest:v6";
const PRODUCT_GROUP_CATALOG_SELECT =
  "product_group_id,variant_name,variant_color,product_groups(id,code,slug,name,main_image_url,product_family)";
const SHARED_CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
const SHOP_CATALOG_CACHE_TTL_MS = 3 * 60 * 1000;
const HOME_LATEST_CATALOG_CACHE_TTL_MS = 3 * 60 * 1000;
let sharedCatalogLoadPromise = null;
let homeLatestCatalogLoadPromise = null;
let supabaseBrowserClientPromise = null;

function resolveProductImageUrl(product) {
  const productGroup = getProductGroupData(product);
  const imageUrl = String(
    product?.display_image || productGroup.main_image_url || product?.image_url || "",
  ).trim();
  return imageUrl || DEFAULT_PRODUCT_IMAGE_URL;
}

function compareProductsByNewestRecord(left, right) {
  const rightUpdated = getProductUpdatedTimestamp(right);
  const leftUpdated = getProductUpdatedTimestamp(left);

  if (
    rightUpdated !== null &&
    leftUpdated !== null &&
    rightUpdated !== leftUpdated
  ) {
    return rightUpdated - leftUpdated;
  }

  if (rightUpdated !== null && leftUpdated === null) {
    return 1;
  }

  if (rightUpdated === null && leftUpdated !== null) {
    return -1;
  }

  const latestCompare = compareProductsByLatest(left, right);
  if (latestCompare !== 0) {
    return latestCompare;
  }

  const rightId = Number(right?.id);
  const leftId = Number(left?.id);

  if (
    Number.isFinite(rightId) &&
    Number.isFinite(leftId) &&
    rightId !== leftId
  ) {
    return rightId - leftId;
  }

  return compareProductsByLatest(left, right);
}

function getProductUpdatedTimestamp(product) {
  const updatedAt = product?.updated_at ? Date.parse(product.updated_at) : NaN;
  return Number.isFinite(updatedAt) ? updatedAt : null;
}

function readCatalogSessionCache(key, maxAgeMs) {
  if (!key || !Number.isFinite(maxAgeMs) || maxAgeMs <= 0) return null;

  const readFromStorage = (storage) => {
    if (!storage) return null;
    const raw = storage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const cachedAt = Number(parsed?.cachedAt);
    if (!Number.isFinite(cachedAt) || Date.now() - cachedAt > maxAgeMs) {
      storage.removeItem(key);
      return null;
    }

    const payload = parsed?.payload;
    if (!payload || !Array.isArray(payload.products)) return null;
    return payload;
  };

  try {
    return (
      readFromStorage(window.sessionStorage) ||
      readFromStorage(window.localStorage)
    );
  } catch (error) {
    return null;
  }
}

function writeCatalogSessionCache(key, payload) {
  if (!key || !payload || !Array.isArray(payload.products)) return;

  try {
    const raw = JSON.stringify({
      cachedAt: Date.now(),
      payload,
    });
    window.sessionStorage.setItem(key, raw);
    window.localStorage.setItem(key, raw);
  } catch (error) {
    // Ignore storage write failures and continue with network-only data.
  }
}

function readCatalogSessionCacheAnyAge(key) {
  if (!key) return null;

  const readFromStorage = (storage) => {
    if (!storage) return null;
    const raw = storage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const payload = parsed?.payload;
    if (!payload || !Array.isArray(payload.products)) return null;
    return payload;
  };

  try {
    return (
      readFromStorage(window.sessionStorage) ||
      readFromStorage(window.localStorage)
    );
  } catch (error) {
    return null;
  }
}

function readBestCatalogCache(cacheEntries = [], options = {}) {
  const allowStale = options?.allowStale === true;
  for (const entry of cacheEntries) {
    if (!entry?.key) continue;
    const freshPayload = readCatalogSessionCache(entry.key, entry.maxAgeMs);
    if (freshPayload) {
      return freshPayload;
    }
  }

  if (!allowStale) {
    return null;
  }

  for (const entry of cacheEntries) {
    if (!entry?.key) continue;
    const stalePayload = readCatalogSessionCacheAnyAge(entry.key);
    if (stalePayload) {
      return stalePayload;
    }
  }

  return null;
}

function ensureAccountNavLink(relativeHref = "/account.html") {
  document.querySelectorAll(".nav__menu").forEach((menu) => {
    if (
      !(menu instanceof HTMLElement) ||
      menu.querySelector("[data-account-link]")
    ) {
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
    return new URL(
      "account.html",
      configuredSiteUrl.endsWith("/")
        ? configuredSiteUrl
        : `${configuredSiteUrl}/`,
    ).toString();
  }

  return new URL("/account.html", window.location.origin).toString();
}

function getPasswordRecoveryRedirectUrl() {
  const configuredSiteUrl = String(window.TECHM8_CONFIG?.siteUrl || "").trim();
  if (configuredSiteUrl) {
    return new URL(
      "reset-password.html",
      configuredSiteUrl.endsWith("/")
        ? configuredSiteUrl
        : `${configuredSiteUrl}/`,
    ).toString();
  }

  return new URL("/reset-password.html", window.location.origin).toString();
}

function getAccountHomeUrl() {
  const configuredSiteUrl = String(window.TECHM8_CONFIG?.siteUrl || "").trim();
  if (configuredSiteUrl) {
    return new URL(
      "account-details.html",
      configuredSiteUrl.endsWith("/")
        ? configuredSiteUrl
        : `${configuredSiteUrl}/`,
    ).toString();
  }

  return new URL("/account-details.html", window.location.origin).toString();
}

function getConfiguredSiteBaseUrl() {
  const configuredSiteUrl = String(window.TECHM8_CONFIG?.siteUrl || "").trim();
  if (configuredSiteUrl) {
    return configuredSiteUrl.endsWith("/")
      ? configuredSiteUrl.slice(0, -1)
      : configuredSiteUrl;
  }

  return window.location.origin;
}

function getProductPageHref(slug) {
  const safeSlug = String(slug || "").trim();
  return safeSlug
    ? `/product.html?slug=${encodeURIComponent(safeSlug)}`
    : "/shop.html";
}

function getProductCanonicalHref(slug) {
  const safeSlug = String(slug || "").trim();
  return safeSlug ? `/products/${encodeURIComponent(safeSlug)}/` : "/shop.html";
}

function getCatalogSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "other";
}

function normalizePosCatalogTaxonomy(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row?.active !== false)
    .map((row) => {
      const parentName = String(row.category_name || "Other Products").trim();
      const name = String(row.subcategory_name || parentName).trim();
      const parentSlug = getCatalogSlug(parentName);
      return {
        id: row.id,
        slug: `${parentSlug}--${getCatalogSlug(name)}`,
        name,
        parent_name: parentName,
        parent_slug: parentSlug,
        sort_order: Number(row.subcategory_sort) || 999,
        parent_sort_order: Number(row.category_sort) || 999,
        description: `Browse ${name} in ${parentName}.`,
      };
    })
    .sort(
      (left, right) =>
        left.parent_sort_order - right.parent_sort_order ||
        left.sort_order - right.sort_order ||
        left.name.localeCompare(right.name),
    );
}

function getAccountDashboardUrl() {
  const configuredSiteUrl = String(window.TECHM8_CONFIG?.siteUrl || "").trim();
  if (configuredSiteUrl) {
    return new URL(
      "account-dashboard.html",
      configuredSiteUrl.endsWith("/")
        ? configuredSiteUrl
        : `${configuredSiteUrl}/`,
    ).toString();
  }

  return new URL("/account-dashboard.html", window.location.origin).toString();
}

async function ensureSupabaseBrowserLibrary() {
  if (window.supabase?.createClient) {
    return window.supabase;
  }

  const existingScript = document.querySelector(
    "script[data-supabase-browser]",
  );
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
    const {
      data: { session },
    } = await supabase.auth.getSession();
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

  const fullName = String(
    profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      "",
  ).trim();
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
  const combined = [
    String(firstName || "").trim(),
    String(lastName || "").trim(),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  return combined || String(fallback || "").trim() || null;
}

function isMissingProfileColumnError(error) {
  const code = String(error?.code || "").trim();
  const message = String(error?.message || "").trim();
  return (
    code === "PGRST204" ||
    /Could not find the .* column of 'profiles'/i.test(message)
  );
}

function toBooleanOrNull(value) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return null;
}

function buildProfilePayload(user, overrides = {}) {
  const existingFullName = String(
    overrides.full_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      "",
  ).trim();
  const firstName = String(overrides.first_name || "").trim();
  const lastName = String(overrides.last_name || "").trim();

  return {
    id: user.id,
    email: String(overrides.email || user.email || "").trim() || null,
    full_name: buildProfileFullName(firstName, lastName, existingFullName),
    first_name: firstName || null,
    last_name: lastName || null,
    phone:
      String(overrides.phone || user.user_metadata?.phone || "").trim() || null,
    business_name: String(overrides.business_name || "").trim() || null,
    address_line_1: String(overrides.address_line_1 || "").trim() || null,
    address_line_2: String(overrides.address_line_2 || "").trim() || null,
    suburb: String(overrides.suburb || "").trim() || null,
    postcode: String(overrides.postcode || "").trim() || null,
    state:
      String(overrides.state || "")
        .trim()
        .toUpperCase() || null,
    avatar_url: String(user.user_metadata?.avatar_url || "").trim() || null,
    provider:
      String(
        user.app_metadata?.provider || user.user_metadata?.provider || "",
      ).trim() || null,
    default_store_slug:
      String(overrides.default_store_slug || "").trim() || null,
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
    first_name:
      String(profile.first_name || nameParts.firstName || "").trim() || null,
    last_name:
      String(profile.last_name || nameParts.lastName || "").trim() || null,
    business_name: String(profile.business_name || "").trim() || null,
    address_line_1: String(profile.address_line_1 || "").trim() || null,
    address_line_2: String(profile.address_line_2 || "").trim() || null,
    suburb: String(profile.suburb || "").trim() || null,
    postcode: String(profile.postcode || "").trim() || null,
    state:
      String(profile.state || "")
        .trim()
        .toUpperCase() || null,
    service_email_opt_in:
      typeof profile.service_email_opt_in === "boolean"
        ? profile.service_email_opt_in
        : null,
    marketing_opt_in:
      typeof profile.marketing_opt_in === "boolean"
        ? profile.marketing_opt_in
        : null,
  };
}

async function upsertCustomerProfile(
  supabase,
  user,
  overrides = {},
  options = {},
) {
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
  let existingProfile = null;
  try {
    existingProfile = await fetchCustomerProfile(supabase, user);
  } catch (error) {
    if (!isMissingProfileColumnError(error)) {
      throw error;
    }
  }

  return upsertCustomerProfile(
    supabase,
    user,
    {
      ...(existingProfile || {}),
      ...overrides,
    },
    {
      allowLegacyFallback: true,
    },
  );
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

  const { firstName, lastName } = splitProfileName(profile, authState.user);
  const phone = String(
    profile?.phone || authState.user.user_metadata?.phone || "",
  ).trim();
  const email = String(profile?.email || authState.user.email || "").trim();
  const defaultStoreSlug = String(profile?.default_store_slug || "").trim();

  fillFormField(form, "first_name", firstName);
  fillFormField(form, "last_name", lastName);
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

const CUSTOMER_ORDER_SELECT =
  "id, order_code, customer_name, email, phone, store_slug, fulfillment_method, payment_method_code, payment_method_label, payment_status, status, fulfillment_status, subtotal_amount, discount_amount, payment_fee_amount, shipping_fee_amount, total_amount, amount_paid, amount_refunded, gst_amount, confirmation_number, invoice_number, stripe_invoice_id, stripe_invoice_number, stripe_invoice_url, stripe_invoice_pdf_url, created_at";

function getSafeStripeInvoiceUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      (hostname !== "stripe.com" && !hostname.endsWith(".stripe.com"))
    ) {
      return "";
    }
    return url.toString();
  } catch (_error) {
    return "";
  }
}

function buildCustomerInvoiceLinks(
  order,
  { primaryClass = "button button--primary", secondaryClass = "button button--ghost" } = {},
) {
  const orderCode = String(order?.order_code || "").trim();
  const paymentMethodCode = String(order?.payment_method_code || "").trim();
  const paymentStatus = String(order?.payment_status || "").trim();
  const canGenerateTechm8Invoice = Boolean(orderCode) && (
    paymentMethodCode === "pay_in_store" ||
    ["paid", "partially_refunded", "refunded"].includes(paymentStatus)
  );
  const invoiceUrl = getSafeStripeInvoiceUrl(order?.stripe_invoice_url);
  const invoicePdfUrl = getSafeStripeInvoiceUrl(order?.stripe_invoice_pdf_url);
  const links = [];

  // Historical paid orders only have Stripe invoice fields. Always route eligible
  // orders through order-document so the first click creates the current TECHM8 PDF.
  if (canGenerateTechm8Invoice) {
    links.push(
      `<button class="${escapeHtml(primaryClass)}" type="button" data-customer-order-document="invoice" data-order-code="${escapeHtml(orderCode)}">View invoice</button>`,
    );
    links.push(
      `<button class="${escapeHtml(secondaryClass)}" type="button" data-customer-order-document="invoice" data-order-code="${escapeHtml(orderCode)}">Download invoice PDF</button>`,
    );
  }

  if (orderCode) {
    links.push(
      `<button class="${escapeHtml(secondaryClass)}" type="button" data-customer-order-document="order_confirmation" data-order-code="${escapeHtml(orderCode)}">View order confirmation</button>`,
    );
  }

  if (links.length) {
    return links.join("");
  }

  if (invoiceUrl) {
    links.push(
      `<a class="${escapeHtml(primaryClass)}" href="${escapeHtml(invoiceUrl)}" target="_blank" rel="noopener">View invoice</a>`,
    );
  }
  if (invoicePdfUrl && invoicePdfUrl !== invoiceUrl) {
    links.push(
      `<a class="${escapeHtml(secondaryClass)}" href="${escapeHtml(invoicePdfUrl)}" target="_blank" rel="noopener">Download invoice PDF</a>`,
    );
  }

  return links.join("");
}

function getOrderDocumentEndpoint() {
  const supabaseUrl = String(window.TECHM8_CONFIG?.supabaseUrl || "").replace(/\/+$/, "");
  return supabaseUrl ? `${supabaseUrl}/functions/v1/order-document` : "";
}

function initCustomerOrderDocumentDownloads() {
  document.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("[data-customer-order-document]");
    if (!(button instanceof HTMLButtonElement)) return;
    event.preventDefault();

    const endpoint = getOrderDocumentEndpoint();
    const orderCode = String(button.dataset.orderCode || "").trim();
    const documentType = String(button.dataset.customerOrderDocument || "").trim();
    if (!endpoint || !orderCode || !documentType) return;
    const documentWindow = window.open("about:blank", "_blank");
    if (documentWindow) documentWindow.opener = null;

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Preparing PDF...";
    try {
      const authState = await getCurrentAuthState();
      const accessToken = authState?.session?.access_token;
      const anonKey = window.TECHM8_CONFIG?.supabaseAnonKey || "";
      if (!accessToken) throw new Error("Please sign in again to access this document.");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          order_code: orderCode,
          document_type: documentType,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.signed_url) {
        throw new Error(result.error || "The document could not be prepared.");
      }
      if (documentWindow) {
        documentWindow.location.replace(result.signed_url);
      } else {
        window.location.assign(result.signed_url);
      }
    } catch (error) {
      documentWindow?.close();
      window.alert(error instanceof Error ? error.message : "The document could not be opened.");
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });
}

async function loadCustomerOrders(supabase, user, limit = 50) {
  if (!supabase || !user?.id) return [];

  const { data, error } = await supabase
    .from("orders")
    .select(CUSTOMER_ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

async function loadCustomerOrderByCode(supabase, user, orderCode) {
  const safeOrderCode = String(orderCode || "").trim();
  if (!supabase || !user?.id || !safeOrderCode) return null;

  const { data, error } = await supabase
    .from("orders")
    .select(CUSTOMER_ORDER_SELECT)
    .eq("order_code", safeOrderCode)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function loadCustomerRepairBookings(supabase, user, limit = 50) {
  if (!supabase || !user?.id) return [];

  const { data, error } = await supabase
    .from("repair_bookings")
    .select(
      "id, booking_code, store_slug, repair_category, brand, device_model, preferred_date, preferred_time, preferred_contact_method, status, created_at",
    )
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

  target.innerHTML = records
    .slice(0, 3)
    .map((record) => {
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
    })
    .join("");
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

  target.innerHTML = records
    .map((record) => {
      if (kind === "orders") {
        const invoiceLinks = buildCustomerInvoiceLinks(record, {
          primaryClass: "button button--primary",
          secondaryClass: "button button--ghost",
        });
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
          ${invoiceLinks ? `<div class="history-card__actions">${invoiceLinks}</div>` : ""}
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
    })
    .join("");
}

const PRODUCT_VARIANT_COLOR_RULES = [
  {
    label: "Gray Camouflage",
    tokens: ["gray camouflage", "grey camouflage", "camouflage"],
  },
  { label: "Sterling Silver", tokens: ["sterling silver", "silver"] },
  { label: "Cosmic Red", tokens: ["cosmic red", "red"] },
  { label: "White", tokens: ["white"] },
  {
    label: "Black",
    tokens: [
      "black",
      "midnight black",
      "dark gray",
      "dark grey",
      "grey",
      "gray",
    ],
  },
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

function getProductGroupData(product) {
  const group = product?.product_group || product?.product_groups;
  return group && typeof group === "object" && !Array.isArray(group)
    ? group
    : {};
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isGroupedVariantProduct(product) {
  const productGroup = getProductGroupData(product);
  if (product?.product_group_id || productGroup.id || productGroup.code) {
    return true;
  }
  const categorySlug = normalizeVariantText(product?.category_slug);
  const model = String(product?.model || "").trim();
  return categorySlug === "power-banks" || /^(rpp|fcp|wp)-\d+/i.test(model);
}

function getProductVariantColor(product) {
  const explicitColor = String(
    product?.variant_color || product?.variant_name || "",
  ).trim();
  if (explicitColor) return explicitColor;

  const searchable = normalizeVariantText(
    [
      product?.name,
      product?.short_description,
      product?.description,
      product?.compatibility,
    ].join(" "),
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

  const productGroup = getProductGroupData(product);
  if (productGroup.code || productGroup.id || product?.product_group_id) {
    return `product-group::${String(
      productGroup.code || productGroup.id || product.product_group_id,
    )}`;
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
  const imageText = normalizeVariantText(
    [image?.image_url, image?.alt_text].join(" "),
  );
  const color = normalizeVariantText(getProductVariantColor(product));
  let score = 1000 - index * 10;

  if (index === 0) score += 90;
  if (index === 1) score += 80;
  if (index >= 2) score -= index * 8;

  if (
    PRODUCT_IMAGE_LOW_PRIORITY_KEYWORDS.some((keyword) =>
      imageText.includes(keyword),
    )
  ) {
    score -= 300;
  }

  if (color) {
    if (imageText.includes(color)) {
      score += 450;
    }

    if (isGroupedVariantProduct(product)) {
      if (color === "white" && index === 0) score += 320;
      if (
        [
          "black",
          "gray",
          "grey",
          "silver",
          "sterling silver",
          "gray camouflage",
        ].includes(color) &&
        index === 1
      ) {
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
      const scoreDiff =
        scoreProductImage(product, right, Number(right?.sort_order) || 0) -
        scoreProductImage(product, left, Number(left?.sort_order) || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (Number(left?.sort_order) || 0) - (Number(right?.sort_order) || 0);
    });
}

function applyProductVariantData(products) {
  if (!Array.isArray(products) || !products.length) return products;

  const groups = new Map();

  products.forEach((product) => {
    const productGroup = getProductGroupData(product);
    product.variant_group_key = getProductVariantGroupKey(product);
    product.color_label = getProductVariantColor(product);
    product.display_name = productGroup.name || product.name;

    if (!isGroupedVariantProduct(product)) {
      product.variant_options = [];
      return;
    }

    const existing = groups.get(product.variant_group_key) || [];
    existing.push(product);
    groups.set(product.variant_group_key, existing);
  });

  groups.forEach((items) => {
    const sortedItems = items.slice().sort((left, right) => {
      const sortDiff = getVariantSortWeight(left) - getVariantSortWeight(right);
      if (sortDiff !== 0) return sortDiff;
      return compareProductsByLatest(left, right);
    });

    const representative = sortedItems[0];
    const representativeGroup = getProductGroupData(representative);
    const displayName =
      representativeGroup.name ||
      stripProductColorSuffix(
        representative?.name || "",
        representative?.color_label || "",
      ) ||
      representative?.name ||
      "";
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

      const itemGroup = getProductGroupData(item);
      const orderedGallery = getOrderedProductGalleryImages(item);
      if (orderedGallery.length) {
        item.gallery_images = orderedGallery.map((image, index) => ({
          ...image,
          sort_order: index,
        }));
        item.display_image = itemGroup.main_image_url || orderedGallery[0].image_url;
      } else {
        item.display_image = itemGroup.main_image_url || resolveProductImageUrl(item);
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

    if (
      (!product.display_image || !String(product.display_image).trim()) &&
      Array.isArray(product.gallery_images) &&
      product.gallery_images.length
    ) {
      const orderedGallery = getOrderedProductGalleryImages(product);
      if (orderedGallery.length) {
        product.gallery_images = orderedGallery.map((image, index) => ({
          ...image,
          sort_order: index,
        }));
        product.display_image = orderedGallery[0].image_url;
      }
    }

    const productGroup = getProductGroupData(product);
    product.display_image =
      productGroup.main_image_url || resolveProductImageUrl(product);
  });

  return products;
}

function getCatalogDisplayProducts(products) {
  const orderedProducts = Array.isArray(products)
    ? products.slice().sort(compareProductsByLatest)
    : [];
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
  const orderedProducts = Array.isArray(products)
    ? products.slice().sort(compareProductsByLatest)
    : [];
  const visibleGroups = new Set();
  const displayProducts = [];

  orderedProducts.forEach((product) => {
    const hasVariants =
      Array.isArray(product?.variant_options) &&
      product.variant_options.length > 1;
    const groupKey = hasVariants
      ? product?.variant_group_key || product?.slug
      : product?.slug || product?.sku || product?.id;

    if (visibleGroups.has(groupKey)) {
      return;
    }

    visibleGroups.add(groupKey);
    displayProducts.push(product);
  });

  return displayProducts.slice(0, limit);
}

function sanitizeRichContentHtml(html) {
  const source = String(html || "").trim();
  if (!source) return "";

  const template = document.createElement("template");
  template.innerHTML = source;
  template.content
    .querySelectorAll(
      "script, iframe, object, embed, style, link[rel='import']",
    )
    .forEach((node) => node.remove());

  template.content.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = String(attribute.value || "");
      if (name.startsWith("on")) {
        node.removeAttribute(attribute.name);
        return;
      }
      if (["src", "href"].includes(name) && /^\s*javascript:/i.test(value)) {
        node.removeAttribute(attribute.name);
      }
    });
  });

  return template.innerHTML.trim();
}

function stripDefaultProductDetailHeading(html) {
  return String(html || "")
    .replace(
      /^\s*(<section[^>]*>\s*)?<h2[^>]*>\s*(Everything about this product|Description)\s*<\/h2>\s*/i,
      "$1",
    )
    .trim();
}

function formatProductDetailHtml(product) {
  const detailHtml = stripDefaultProductDetailHeading(
    sanitizeRichContentHtml(product?.detail_html || ""),
  );
  if (detailHtml) {
    return detailHtml;
  }

  const paragraphs = [product?.description, product?.short_description]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return `<p>Product information will be expanded as more supplier content is added to the catalog.</p>`;
  }

  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

function createRailProductCard(product) {
  const detailUrl = getProductPageHref(product.slug);
  const retailPrice = Number(product.retail_price) || 0;
  const compareAtPrice = Number(product.compare_at_price) || 0;
  const savingsAmount =
    Number.isFinite(compareAtPrice) && compareAtPrice > retailPrice
      ? compareAtPrice - retailPrice
      : 0;
  const productName = getProductDisplayName(product) || product.name;
  const compareMarkup =
    Number.isFinite(compareAtPrice) && compareAtPrice > retailPrice
      ? `<span class="storefront-rail-card__compare">${escapeHtml(formatMoney(compareAtPrice))}</span>`
      : "";
  const savingsMarkup =
    savingsAmount > 0
      ? `<span class="storefront-rail-card__saving">Save ${escapeHtml(formatMoney(savingsAmount))}</span>`
      : "";
  const navigationCache = buildProductNavigationCache(product);

  return `
    <article class="storefront-rail-card" data-product-cache="${escapeHtml(navigationCache)}">
      <a class="storefront-rail-card__media" href="${detailUrl}" data-product-cache="${escapeHtml(navigationCache)}">
        <img src="${escapeHtml(resolveProductImageUrl(product))}" alt="${escapeHtml(productName)}" loading="lazy">
      </a>
      <div class="storefront-rail-card__body">
        <p class="storefront-rail-card__eyebrow">${escapeHtml(product.brand || product.category_name || "TECHM8")}</p>
        <a class="storefront-rail-card__title" href="${detailUrl}" data-product-cache="${escapeHtml(navigationCache)}">${escapeHtml(productName)}</a>
        <div class="storefront-rail-card__price">
          <strong>${escapeHtml(formatMoney(retailPrice))}</strong>
          ${compareMarkup}
        </div>
        ${savingsMarkup}
        <div class="storefront-rail-card__actions">
          ${renderVariantAwareCartAction(product, detailUrl, "storefront-card__action storefront-card__action--primary")}
        </div>
      </div>
    </article>
  `;
}

function renderProductRailSection(config) {
  const {
    eyebrow = "",
    title = "",
    linkHref = "",
    linkLabel = "",
    emptyTitle = "",
    emptyCopy = "",
    products = [],
    dataAttribute = "",
  } = config || {};

  return `
    <section class="section storefront-product-rail">
      <div class="section-heading section-heading--split">
        <div>
          ${eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
          <h2>${escapeHtml(title)}</h2>
        </div>
        ${linkHref && linkLabel ? `<a href="${escapeHtml(linkHref)}">${escapeHtml(linkLabel)}</a>` : ""}
      </div>
      ${
        Array.isArray(products) && products.length
          ? `
            <div class="storefront-rail" ${dataAttribute ? `${dataAttribute}` : ""}>
              ${products.map((product) => createRailProductCard(product)).join("")}
            </div>
          `
          : `
            <article class="storefront-card storefront-card--empty">
              <div class="storefront-card__body">
                <span class="storefront-card__pill">No products</span>
                <h3>${escapeHtml(emptyTitle || "Nothing to show yet")}</h3>
                <p>${escapeHtml(emptyCopy || "This section will update automatically as the catalog grows.")}</p>
              </div>
            </article>
          `
      }
    </section>
  `;
}

function renderVariantSummary(product, classPrefix) {
  if (
    !Array.isArray(product?.variant_options) ||
    product.variant_options.length <= 1
  ) {
    return "";
  }

  const items = product.variant_options
    .map(
      (option) =>
        `<span class="${classPrefix}__variant ${option.is_active ? "is-active" : ""}">${escapeHtml(option.label)}</span>`,
    )
    .join("");

  return `<div class="${classPrefix}__variants">${items}</div>`;
}

function renderVariantAwareCartAction(product, detailUrl, className) {
  if (Array.isArray(product?.variant_options) && product.variant_options.length > 1) {
    return `<a class="${className}" href="${detailUrl}" data-product-cache="${escapeHtml(buildProductNavigationCache(product))}">Choose colour</a>`;
  }

  return `<button class="${className}" type="button" data-add-cart-slug="${escapeHtml(product.slug)}">Add to cart</button>`;
}

const CART_STORAGE_KEY = "techm8_cart_v1";
const LOCAL_ORDER_STORAGE_KEY = "techm8_orders_v1";
const RECENT_PRODUCTS_STORAGE_KEY = "techm8_recent_products_v1";
const COOKIE_CONSENT_STORAGE_KEY = "techm8_cookie_consent_v1";
const COOKIE_CONSENT_COOKIE_NAME = "techm8_cookie_consent";
const COOKIE_CONSENT_VERSION = 1;

function readCookieConsent() {
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.version === COOKIE_CONSENT_VERSION) {
      return parsed;
    }
  } catch (_error) {
    // Ignore unavailable storage; cookie fallback below keeps the banner usable.
  }

  try {
    const cookie = document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${COOKIE_CONSENT_COOKIE_NAME}=`));
    if (!cookie) return null;
    const value = decodeURIComponent(cookie.split("=").slice(1).join("="));
    const parsed = JSON.parse(value);
    return parsed && parsed.version === COOKIE_CONSENT_VERSION ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function writeCookieConsent(preferences) {
  const consent = {
    version: COOKIE_CONSENT_VERSION,
    essential: true,
    personalisation: Boolean(preferences?.personalisation),
    analytics: Boolean(preferences?.analytics),
    marketing: Boolean(preferences?.marketing),
    updated_at: new Date().toISOString(),
  };

  const serialized = JSON.stringify(consent);
  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, serialized);
  } catch (_error) {
    // Local storage can be blocked in private mode; the cookie still records the choice.
  }

  try {
    document.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=${encodeURIComponent(serialized)}; Max-Age=31536000; Path=/; SameSite=Lax`;
  } catch (_error) {
    // Non-critical: the visible preference state remains in localStorage when available.
  }

  window.dispatchEvent(
    new CustomEvent("techm8:cookie-consent-updated", { detail: { consent } }),
  );
  return consent;
}

function hasCookieConsent(type) {
  const consent = readCookieConsent();
  if (!consent) return false;
  if (type === "personalisation") return Boolean(consent.personalisation);
  if (type === "analytics") return Boolean(consent.analytics);
  if (type === "marketing") return Boolean(consent.marketing);
  return Boolean(consent.essential);
}

function clearNonEssentialBrowserData() {
  try {
    window.localStorage.removeItem(RECENT_PRODUCTS_STORAGE_KEY);
  } catch (_error) {
    // Ignore storage errors.
  }
}

function initCookieConsentBanner() {
  if (
    !document.body ||
    document.querySelector("[data-cookie-consent]") ||
    readCookieConsent()
  ) {
    return;
  }

  const banner = document.createElement("section");
  banner.className = "cookie-consent";
  banner.setAttribute("data-cookie-consent", "true");
  banner.setAttribute("aria-label", "Cookie preferences");
  banner.innerHTML = `
    <div class="cookie-consent__content">
      <p class="cookie-consent__eyebrow">Privacy preferences</p>
      <h2>We use cookies to improve your TECHM8 experience.</h2>
      <p>Essential cookies keep the cart and checkout working. With your permission, we also remember recently viewed products on this browser so we can show more relevant product suggestions.</p>
      <a href="/store-policy.html">View privacy and store policies</a>
    </div>
    <div class="cookie-consent__actions">
      <button class="cookie-consent__button cookie-consent__button--ghost" type="button" data-cookie-settings>Settings</button>
      <button class="cookie-consent__button cookie-consent__button--muted" type="button" data-cookie-essential>Essential only</button>
      <button class="cookie-consent__button cookie-consent__button--primary" type="button" data-cookie-accept>Accept all</button>
    </div>
  `;

  const settingsPanel = document.createElement("div");
  settingsPanel.className = "cookie-settings";
  settingsPanel.hidden = true;
  settingsPanel.setAttribute("data-cookie-settings-panel", "true");
  settingsPanel.innerHTML = `
    <div class="cookie-settings__card" role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title">
      <button class="cookie-settings__close" type="button" aria-label="Close cookie settings" data-cookie-settings-close>&times;</button>
      <p class="cookie-consent__eyebrow">Cookie settings</p>
      <h2 id="cookie-settings-title">Choose what TECHM8 can remember</h2>
      <label class="cookie-settings__option is-locked">
        <span>
          <strong>Essential cookies</strong>
          <small>Required for cart, checkout, account security and basic website functions.</small>
        </span>
        <input type="checkbox" checked disabled>
      </label>
      <label class="cookie-settings__option">
        <span>
          <strong>Personalisation</strong>
          <small>Remember recently viewed products on this browser for product suggestions.</small>
        </span>
        <input type="checkbox" data-cookie-personalisation checked>
      </label>
      <label class="cookie-settings__option">
        <span>
          <strong>Analytics</strong>
          <small>Allow Google Analytics to measure site usage and help us improve loading, navigation and services.</small>
        </span>
        <input type="checkbox" data-cookie-analytics>
      </label>
      <div class="cookie-settings__actions">
        <button class="cookie-consent__button cookie-consent__button--muted" type="button" data-cookie-save-essential>Essential only</button>
        <button class="cookie-consent__button cookie-consent__button--primary" type="button" data-cookie-save-settings>Save settings</button>
      </div>
    </div>
  `;

  const closeBanner = () => {
    banner.remove();
    settingsPanel.remove();
  };
  const acceptAll = () => {
    writeCookieConsent({
      personalisation: true,
      analytics: true,
      marketing: false,
    });
    closeBanner();
  };
  const essentialOnly = () => {
    writeCookieConsent({
      personalisation: false,
      analytics: false,
      marketing: false,
    });
    clearNonEssentialBrowserData();
    closeBanner();
  };
  const saveSettings = () => {
    const personalisation = settingsPanel.querySelector(
      "[data-cookie-personalisation]",
    );
    const analytics = settingsPanel.querySelector("[data-cookie-analytics]");
    writeCookieConsent({
      personalisation:
        personalisation instanceof HTMLInputElement
          ? personalisation.checked
          : false,
      analytics:
        analytics instanceof HTMLInputElement ? analytics.checked : false,
      marketing: false,
    });
    if (!hasCookieConsent("personalisation")) {
      clearNonEssentialBrowserData();
    }
    closeBanner();
  };

  banner
    .querySelector("[data-cookie-accept]")
    ?.addEventListener("click", acceptAll);
  banner
    .querySelector("[data-cookie-essential]")
    ?.addEventListener("click", essentialOnly);
  banner
    .querySelector("[data-cookie-settings]")
    ?.addEventListener("click", () => {
      settingsPanel.hidden = false;
    });
  settingsPanel
    .querySelector("[data-cookie-settings-close]")
    ?.addEventListener("click", () => {
      settingsPanel.hidden = true;
    });
  settingsPanel
    .querySelector("[data-cookie-save-essential]")
    ?.addEventListener("click", essentialOnly);
  settingsPanel
    .querySelector("[data-cookie-save-settings]")
    ?.addEventListener("click", saveSettings);

  document.body.appendChild(banner);
  document.body.appendChild(settingsPanel);
}

function loadRecentProductSlugs() {
  if (!hasCookieConsent("personalisation")) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_PRODUCTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
  } catch (_error) {
    return [];
  }
}

function saveRecentProductSlugs(slugs) {
  if (!hasCookieConsent("personalisation")) {
    return;
  }

  const normalized = Array.isArray(slugs)
    ? slugs
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 24)
    : [];
  window.localStorage.setItem(
    RECENT_PRODUCTS_STORAGE_KEY,
    JSON.stringify(normalized),
  );
}

function rememberRecentProduct(product) {
  if (!hasCookieConsent("personalisation")) {
    return;
  }

  const slug = String(product?.slug || "").trim();
  if (!slug) return;
  const existing = loadRecentProductSlugs().filter((item) => item !== slug);
  existing.unshift(slug);
  saveRecentProductSlugs(existing);
}

function getRecentlyViewedProducts(products, currentSlug, limit = 6) {
  const allProducts = Array.isArray(products) ? products : [];
  const slugs = loadRecentProductSlugs().filter(
    (slug) => slug && slug !== currentSlug,
  );
  const bySlug = new Map(allProducts.map((product) => [product.slug, product]));
  const seenGroups = new Set();
  const items = [];

  slugs.forEach((slug) => {
    if (items.length >= limit) return;
    const product = bySlug.get(slug);
    if (!product) return;
    const groupKey = product.variant_group_key || product.slug;
    if (seenGroups.has(groupKey)) return;
    seenGroups.add(groupKey);
    items.push(product);
  });

  return items.slice(0, limit);
}

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
  window.dispatchEvent(
    new CustomEvent("techm8:cart-updated", { detail: { items } }),
  );
}

function getCartCount(items = loadCart()) {
  return items.reduce(
    (total, item) => total + Math.max(0, Number(item.qty) || 0),
    0,
  );
}

function getCartSubtotal(items = loadCart()) {
  return items.reduce(
    (total, item) =>
      total + (Number(item.price) || 0) * (Number(item.qty) || 0),
    0,
  );
}

function ensureGlobalCartUi() {
  document.querySelectorAll(".nav__menu").forEach((menu) => {
    if (!(menu instanceof HTMLElement)) return;
    let cartLink = menu.querySelector(".nav__cart-link");

    if (!(cartLink instanceof HTMLAnchorElement)) {
      cartLink = document.createElement("a");
      cartLink.className = "nav__cart-link";
      cartLink.href = buildSiteRelativeHref("cart.html");

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
    floatingCart.href = buildSiteRelativeHref("cart.html");
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

  if (!document.querySelector("[data-floating-repair]")) {
    const floatingRepair = document.createElement("a");
    const isSchoolServicesPage = document.body.classList.contains("school-services-page");
    floatingRepair.className = "floating-repair";
    floatingRepair.href = isSchoolServicesPage
      ? "/school-services#school-quote"
      : buildSiteRelativeHref("book-repair.html");
    floatingRepair.setAttribute(
      "aria-label",
      isSchoolServicesPage ? "Request a school quote" : "Book a repair",
    );
    floatingRepair.setAttribute("data-floating-repair", "true");
    floatingRepair.innerHTML = `
      <span class="floating-repair__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.7 6.3a4.1 4.1 0 0 0-5 5L4.8 16.2a1.8 1.8 0 0 0 0 2.6l.4.4a1.8 1.8 0 0 0 2.6 0l4.9-4.9a4.1 4.1 0 0 0 5-5l-2.8 2.8-2.9-2.9 2.7-2.9Z"></path>
          <path d="M16.8 17.2 20 20.4"></path>
          <path d="M18.4 15.6 21.6 18.8"></path>
        </svg>
      </span>
      <span class="floating-repair__text">${isSchoolServicesPage ? "School quote" : "Book repair"}</span>
    `;
    document.body.appendChild(floatingRepair);
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

const DEFAULT_CART_ITEM_MAX_QUANTITY = 99;
const CART_ITEM_MAX_QUANTITY_BY_SLUG = Object.freeze({
  "techm8-everyday-accessory": 9999,
});

function getCartItemMaxQuantity(slug) {
  return (
    CART_ITEM_MAX_QUANTITY_BY_SLUG[String(slug || "").trim().toLowerCase()] ||
    DEFAULT_CART_ITEM_MAX_QUANTITY
  );
}

function normaliseCartQuantity(slug, quantity) {
  const numericQuantity = Number(quantity);
  const wholeQuantity = Number.isFinite(numericQuantity)
    ? Math.floor(numericQuantity)
    : 1;
  return Math.min(
    getCartItemMaxQuantity(slug),
    Math.max(1, wholeQuantity),
  );
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
    qty: normaliseCartQuantity(product.slug, quantity),
  };
}

function reconcileCartItems(items, products) {
  const safeItems = Array.isArray(items) ? items : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const productsBySlug = new Map();
  const productsBySku = new Map();
  const productsByName = new Map();

  safeProducts.forEach((product) => {
    const slug = String(product?.slug || "").trim();
    const sku = String(product?.sku || "")
      .trim()
      .toUpperCase();
    const name = String(product?.name || "")
      .trim()
      .toLowerCase();
    if (slug) productsBySlug.set(slug, product);
    if (sku) productsBySku.set(sku, product);
    if (name) productsByName.set(name, product);
  });

  const resolved = [];
  const missing = [];
  let changed = false;

  safeItems.forEach((item) => {
    const slug = String(item?.slug || "").trim();
    const sku = String(item?.sku || "")
      .trim()
      .toUpperCase();
    const name = String(item?.name || "")
      .trim()
      .toLowerCase();
    const qty = normaliseCartQuantity(slug, item?.qty);

    let product = null;
    if (slug && productsBySlug.has(slug)) {
      product = productsBySlug.get(slug);
    } else if (sku && productsBySku.has(sku)) {
      product = productsBySku.get(sku);
      changed = true;
    } else if (name && productsByName.has(name)) {
      product = productsByName.get(name);
      changed = true;
    }

    if (!product) {
      missing.push({
        slug,
        sku,
        name: String(item?.name || "").trim(),
      });
      return;
    }

    const nextItem = normaliseCartItem(product, qty);
    if (
      nextItem.slug !== slug ||
      String(nextItem.sku || "").trim() !== String(item?.sku || "").trim() ||
      Number(nextItem.price || 0) !== Number(item?.price || 0) ||
      String(nextItem.image_url || "").trim() !==
        String(item?.image_url || "").trim()
    ) {
      changed = true;
    }

    resolved.push(nextItem);
  });

  return {
    items: resolved,
    missing,
    changed,
  };
}

function addItemToCart(product, quantity = 1) {
  const items = loadCart();
  const existing = items.find((item) => item.slug === product.slug);
  const safeQuantity = normaliseCartQuantity(product.slug, quantity);

  if (existing) {
    existing.qty = normaliseCartQuantity(
      product.slug,
      Number(existing.qty || 0) + safeQuantity,
    );
  } else {
    items.push(normaliseCartItem(product, safeQuantity));
  }

  saveCart(items);
  updateCartIndicators(items);
  const gaItem = buildGa4Item(product, safeQuantity);
  if (gaItem) {
    trackGa4Event("add_to_cart", {
      currency: "AUD",
      value: Number((gaItem.price * gaItem.quantity).toFixed(2)),
      items: [gaItem],
    });
  }
  return items;
}

function updateCartItemQuantity(slug, quantity) {
  const items = loadCart().map((item) =>
    item.slug === slug
      ? { ...item, qty: normaliseCartQuantity(slug, quantity) }
      : item,
  );
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
  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 12);
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
  window.localStorage.setItem(
    LOCAL_ORDER_STORAGE_KEY,
    JSON.stringify(orders.slice(0, 30)),
  );
}

async function loadPaymentFeeProfiles() {
  const { supabaseUrl, supabaseAnonKey, paymentMethodsEndpoint } =
    window.TECHM8_CONFIG || {};

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
    const endpoint =
      String(paymentMethodsEndpoint || "").trim() ||
      `${supabaseUrl}/functions/v1/payment-methods`;
    const response = await fetch(
      endpoint,
      {
        headers: {
          Accept: "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Payment fee profiles could not be loaded.");
    }

    const payload = await response.json();
    const rows = Array.isArray(payload?.profiles) ? payload.profiles : [];
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
          {
            code: "card",
            label: "Card & wallets",
            provider: "stripe",
            fee_type: "combined",
            percentage: 1.7,
            fixed_amount: 0.3,
            is_enabled: true,
            sort_order: 20,
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
      {
        code: "card",
        label: "Card & wallets",
        provider: "stripe",
        fee_type: "combined",
        percentage: 1.7,
        fixed_amount: 0.3,
        is_enabled: true,
        sort_order: 20,
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

const CHECKOUT_SHIPPING_OPTIONS = [
  {
    code: "standard_auspost",
    label: "Standard Shipping With Australia Post",
    deliveryTime: "3-5 business day",
    rate: 15,
    freeOver: 399,
  },
  {
    code: "express_auspost",
    label: "Express Shipping With Australia Post",
    deliveryTime: "1-3 business day",
    rate: 18,
    freeOver: 599,
  },
];

function getCheckoutShippingOption(code) {
  return (
    CHECKOUT_SHIPPING_OPTIONS.find((option) => option.code === code) ||
    CHECKOUT_SHIPPING_OPTIONS[0]
  );
}

function calculateShippingFee(subtotal, option) {
  if (!option) return 0;
  const freeOver = Number(option.freeOver) || 0;
  if (freeOver > 0 && subtotal >= freeOver) return 0;
  return Number((Number(option.rate) || 0).toFixed(2));
}

function initStorefront() {
  const root = document.querySelector("[data-storefront]");
  if (!(root instanceof HTMLElement)) return;

  const categoryTarget = root.querySelector("[data-store-categories]");
  const drawerCategoryTarget = document.querySelector(
    "[data-store-categories-drawer]",
  );
  const drawerCategoryGroupsTarget = document.querySelector(
    "[data-store-category-groups]",
  );
  const drawerCategoryParentTitle = document.querySelector(
    "[data-store-category-parent-title]",
  );
  const drawerCategoryParentView = document.querySelector(
    "[data-store-category-parent-view]",
  );
  const productTarget = root.querySelector("[data-store-products]");
  const searchField = root.querySelector("[data-store-search]");
  const countTarget = root.querySelector("[data-store-count]");
  const sortField = root.querySelector("[data-store-sort]");
  const openCategoriesButton = root.querySelector("[data-store-open-categories]");
  const closeCategoriesButton = document.querySelector(
    "[data-store-close-categories]",
  );
  const drawerBackdrop = document.querySelector("[data-store-drawer-backdrop]");
  const drawer = document.querySelector("[data-store-drawer]");

  if (!(productTarget instanceof HTMLElement)) {
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
      short_description:
        "Official PS5 DualSense controller in Sterling Silver finish.",
      retail_price: 115,
      compare_at_price: 124,
      image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-sterling-silver-playstation-5.jpg",
      supplier_image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-sterling-silver-playstation-5.jpg",
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
      short_description:
        "Official PS5 DualSense controller in Cosmic Red finish.",
      retail_price: 109,
      compare_at_price: null,
      image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-cosmic-red-playstation-5.jpg",
      supplier_image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-cosmic-red-playstation-5.jpg",
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
      short_description:
        "Official PS5 DualSense controller in Gray Camouflage finish.",
      retail_price: 109,
      compare_at_price: null,
      image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-gray-camouflage.jpg",
      supplier_image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-gray-camouflage.jpg",
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
      image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/copy-of-dualsense-wireless-controller-playstation-5-black.jpg",
      supplier_image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/copy-of-dualsense-wireless-controller-playstation-5-black.jpg",
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
      image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-playstation-5-white.jpg",
      supplier_image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-playstation-5-white.jpg",
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
    activeParent: "all",
    query: "",
    sortBy: "popular",
    drawerOpen: false,
  };

  bindCartButtons(productTarget, () => state.products);

  const deriveCategories = (products) => {
    const map = new Map();
    products.forEach((product) => {
      const key =
        product.category_slug || product.category_id || "uncategorized";
      if (!map.has(key)) {
        map.set(key, {
          id: product.category_id || key,
          slug: product.category_slug || key,
          name: product.category_name || "Other Products",
          parent_name: product.category_parent_name || "Other Products",
          parent_slug: product.category_parent_slug || "other-products",
        });
      }
    });
    return Array.from(map.values());
  };

  const normalizeProduct = (product, categoriesMap) => {
    const category = categoriesMap.get(product.pos_category_id) || null;
    const retailPrice = Number(product.retail_price);
    const compareAtPrice = Number(product.compare_at_price);
    const hasValidComparePrice =
      Number.isFinite(compareAtPrice) && compareAtPrice > retailPrice;

    return {
      ...product,
      category_name:
        category?.name || product.category_name || "Other Products",
      category_slug:
        category?.slug || product.category_slug || "other-products",
      category_parent_name:
        category?.parent_name || product.category_parent_name || "Other Products",
      category_parent_slug:
        category?.parent_slug || product.category_parent_slug || "other-products",
      display_image: resolveProductImageUrl(product),
      retail_price: retailPrice,
      compare_at_price: hasValidComparePrice ? compareAtPrice : null,
    };
  };

  const applyDrawerState = () => {
    if (!(drawer instanceof HTMLElement) || !(drawerBackdrop instanceof HTMLElement)) {
      return;
    }
    drawer.classList.toggle("is-open", state.drawerOpen);
    drawer.setAttribute("aria-hidden", state.drawerOpen ? "false" : "true");
    openCategoriesButton?.setAttribute("aria-expanded", state.drawerOpen ? "true" : "false");
    drawerBackdrop.hidden = !state.drawerOpen;
    drawerBackdrop.classList.toggle("is-open", state.drawerOpen);
    document.body.classList.toggle("storefront-drawer-open", state.drawerOpen);
  };

  const renderCategories = () => {
    const categoryMarkup = [{ slug: "all", name: "All products" }, ...state.categories]
      .map(
        (category) => `
          <button class="storefront-category-button ${state.activeCategory === category.slug ? "is-active" : ""}" type="button" data-store-category="${escapeHtml(category.slug)}">
            ${escapeHtml(category.name)}
          </button>
        `,
      )
      .join("");

    const parentMap = new Map();
    state.categories.forEach((category) => {
      const parentSlug = category.parent_slug || "other-products";
      if (!parentMap.has(parentSlug)) {
        parentMap.set(parentSlug, {
          slug: parentSlug,
          name: category.parent_name || "Other Products",
          sort_order: Number(category.parent_sort_order) || 999,
          categories: [],
        });
      }
      parentMap.get(parentSlug).categories.push(category);
    });
    const parents = [...parentMap.values()].sort(
      (left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name),
    );
    if (state.activeParent === "all" && parents.length) {
      state.activeParent = parents[0].slug;
    }
    const activeParent = parents.find((parent) => parent.slug === state.activeParent) || parents[0] || null;

    if (categoryTarget instanceof HTMLElement) {
      categoryTarget.innerHTML = categoryMarkup;
    }
    if (drawerCategoryGroupsTarget instanceof HTMLElement) {
      drawerCategoryGroupsTarget.innerHTML = `
        <button class="storefront-category-group ${state.activeCategory === "all" ? "is-active" : ""}" type="button" data-store-category-all>
          <span>All products</span><small>${state.products.length}</small>
        </button>
        ${parents.map((parent) => {
          const productCount = state.products.filter((product) => product.category_parent_slug === parent.slug).length;
          return `
            <button class="storefront-category-group ${activeParent?.slug === parent.slug ? "is-current" : ""}" type="button" data-store-category-parent="${escapeHtml(parent.slug)}">
              <span>${escapeHtml(parent.name)}</span><small>${productCount}</small>
            </button>
          `;
        }).join("")}
      `;
    }
    if (drawerCategoryParentTitle instanceof HTMLElement) {
      drawerCategoryParentTitle.textContent = activeParent?.name || "All products";
    }
    if (drawerCategoryParentView instanceof HTMLButtonElement) {
      drawerCategoryParentView.hidden = !activeParent;
      drawerCategoryParentView.dataset.storeCategoryParentView = activeParent?.slug || "all";
      drawerCategoryParentView.textContent = activeParent ? `View all ${activeParent.name}` : "View all";
    }
    if (drawerCategoryTarget instanceof HTMLElement) {
      drawerCategoryTarget.innerHTML = activeParent
        ? activeParent.categories.map((category) => `
            <button class="storefront-category-button ${state.activeCategory === category.slug ? "is-active" : ""}" type="button" data-store-category="${escapeHtml(category.slug)}">
              <span>${escapeHtml(category.name)}</span><span aria-hidden="true">›</span>
            </button>
          `).join("")
        : "";
    }

    [categoryTarget, drawerCategoryTarget].forEach((target) => {
      if (!(target instanceof HTMLElement)) return;
      target.querySelectorAll("[data-store-category]").forEach((button) => {
        button.addEventListener("click", () => {
          state.activeCategory = button.getAttribute("data-store-category") || "all";
          state.drawerOpen = false;
          applyDrawerState();
          renderCategories();
          renderProducts();
        });
      });
    });
    drawerCategoryGroupsTarget?.querySelector("[data-store-category-all]")?.addEventListener("click", () => {
      state.activeCategory = "all";
      state.drawerOpen = false;
      applyDrawerState();
      renderCategories();
      renderProducts();
    });
    drawerCategoryGroupsTarget?.querySelectorAll("[data-store-category-parent]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeParent = button.getAttribute("data-store-category-parent") || "all";
        renderCategories();
      });
    });
    if (drawerCategoryParentView instanceof HTMLButtonElement) drawerCategoryParentView.onclick = () => {
      const parentSlug = drawerCategoryParentView.dataset.storeCategoryParentView || "all";
      state.activeCategory = parentSlug === "all" ? "all" : `parent:${parentSlug}`;
      state.drawerOpen = false;
      applyDrawerState();
      renderCategories();
      renderProducts();
    };
  };

  const renderProducts = () => {
    const query = state.query.trim().toLowerCase();
    const matchingProducts = state.products.filter((product) => {
      const inCategory =
        state.activeCategory === "all" ||
        (state.activeCategory.startsWith("parent:")
          ? product.category_parent_slug === state.activeCategory.slice(7)
          : product.category_slug === state.activeCategory);
      const haystack = [
        product.name,
        product.brand,
        product.model,
        product.short_description,
        product.category_name,
        product.category_parent_name,
      ]
        .join(" ")
        .toLowerCase();

      return inCategory && (!query || haystack.includes(query));
    });
    const visibleProducts = getCatalogDisplayProducts(matchingProducts);
    const sortedProducts = [...visibleProducts].sort((left, right) => {
      switch (state.sortBy) {
        case "newest":
          return compareProductsByLatest(left, right);
        case "discount": {
          const leftDiscount =
            Math.max(
              0,
              (Number(left.compare_at_price) || 0) -
                (Number(left.retail_price) || 0),
            ) || 0;
          const rightDiscount =
            Math.max(
              0,
              (Number(right.compare_at_price) || 0) -
                (Number(right.retail_price) || 0),
            ) || 0;
          return rightDiscount - leftDiscount || compareProductsByLatest(left, right);
        }
        case "price-asc":
          return (Number(left.retail_price) || 0) - (Number(right.retail_price) || 0);
        case "price-desc":
          return (Number(right.retail_price) || 0) - (Number(left.retail_price) || 0);
        case "name-asc":
          return String(getProductDisplayName(left) || left.name || "").localeCompare(
            String(getProductDisplayName(right) || right.name || ""),
          );
        case "name-desc":
          return String(getProductDisplayName(right) || right.name || "").localeCompare(
            String(getProductDisplayName(left) || left.name || ""),
          );
        case "popular":
        default:
          return Number(Boolean(right.is_featured)) - Number(Boolean(left.is_featured)) ||
            compareProductsByLatest(left, right);
      }
    });

    if (countTarget instanceof HTMLElement) {
      countTarget.textContent = `${sortedProducts.length} product${sortedProducts.length === 1 ? "" : "s"} visible`;
    }

    if (!sortedProducts.length) {
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

    productTarget.innerHTML = sortedProducts
      .map((product, index) => createCatalogCard(product, index))
      .join("");
  };

  const loadStorefrontData = async () => {
    const { supabaseUrl, supabaseAnonKey } = window.TECHM8_CONFIG || {};

    if (!supabaseUrl || !supabaseAnonKey) {
      state.products = fallbackProducts;
      state.categories = deriveCategories(fallbackProducts);
      setSource(
        "Starter sample data",
        "Supabase config is missing, so the page is showing the first 5 controller products locally.",
      );
      renderCategories();
      renderProducts();
      return;
    }

    const applySnapshot = (taxonomyRows, products) => {
      const categories = normalizePosCatalogTaxonomy(taxonomyRows);
      const categoriesMap = new Map(
        categories.map((category) => [category.id, category]),
      );
      const normalizedProducts = applyProductVariantData(
        products
          .map((product) => normalizeProduct(product, categoriesMap))
          .sort(compareProductsByLatest),
      );

      if (normalizedProducts.length) {
        state.products = normalizedProducts;
        state.categories = categories.filter((category) =>
          normalizedProducts.some(
            (product) => product.pos_category_id === category.id,
          ),
        );
        if (!state.categories.some((category) => category.parent_slug === state.activeParent)) {
          state.activeParent = state.categories[0]?.parent_slug || "all";
        }
      } else {
        state.products = fallbackProducts;
        state.categories = deriveCategories(fallbackProducts);
      }

      renderCategories();
      renderProducts();
    };

    const bestCachedPayload = readBestCatalogCache(
      [
        {
          key: SHOP_CATALOG_CACHE_KEY,
          maxAgeMs: SHOP_CATALOG_CACHE_TTL_MS,
        },
        {
          key: SHARED_CATALOG_CACHE_KEY,
          maxAgeMs: SHARED_CATALOG_CACHE_TTL_MS,
        },
      ],
      { allowStale: true },
    );
    if (
      bestCachedPayload &&
      Array.isArray(bestCachedPayload.products) &&
      Array.isArray(bestCachedPayload.categories)
    ) {
      applySnapshot(bestCachedPayload.categories, bestCachedPayload.products);
    }

    try {
      const headers = {
        Accept: "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      };

      const categoriesUrl = `${supabaseUrl}/rest/v1/pos_category_taxonomy?select=id,category_name,subcategory_name,category_sort,subcategory_sort,active&active=eq.true&order=category_sort.asc,subcategory_sort.asc`;
      const productsUrl = `${supabaseUrl}/rest/v1/products?select=id,sku,slug,name,brand,model,retail_price,compare_at_price,image_url,is_featured,condition_label,compatibility,category_id,pos_category_id,created_at,${PRODUCT_GROUP_CATALOG_SELECT}&is_visible=eq.true&order=created_at.desc,id.desc`;

      const [categoriesResponse, productsResponse] = await Promise.all([
        fetch(categoriesUrl, { headers, cache: "default" }),
        fetch(productsUrl, { headers, cache: "default" }),
      ]);

      if (!categoriesResponse.ok || !productsResponse.ok) {
        throw new Error(
          "The product catalog could not be loaded from Supabase.",
        );
      }

      const categories = await categoriesResponse.json();
      const products = await productsResponse.json();
      writeCatalogSessionCache(SHOP_CATALOG_CACHE_KEY, {
        categories,
        products,
      });
      applySnapshot(categories, products);
    } catch (error) {
      if (!bestCachedPayload) {
        state.products = fallbackProducts;
        state.categories = deriveCategories(fallbackProducts);
        renderCategories();
        renderProducts();
      }
    }
  };

  if (searchField instanceof HTMLInputElement) {
    let searchEventTimer = null;
    searchField.addEventListener("input", () => {
      state.query = searchField.value || "";
      renderProducts();

      // Report the settled query rather than every keystroke.
      window.clearTimeout(searchEventTimer);
      searchEventTimer = window.setTimeout(() => {
        const term = state.query.trim();
        if (term.length < 2) return;
        trackGa4Event("search", { search_term: term.toLowerCase() });
      }, 900);
    });
  }

  if (sortField instanceof HTMLSelectElement) {
    sortField.addEventListener("change", () => {
      state.sortBy = sortField.value || "popular";
      renderProducts();
    });
  }

  openCategoriesButton?.addEventListener("click", () => {
    state.drawerOpen = true;
    applyDrawerState();
    window.setTimeout(() => {
      drawerCategoryGroupsTarget?.querySelector(".is-current, .is-active, button")?.focus();
    }, 190);
  });

  closeCategoriesButton?.addEventListener("click", () => {
    state.drawerOpen = false;
    applyDrawerState();
  });

  drawerBackdrop?.addEventListener("click", () => {
    state.drawerOpen = false;
    applyDrawerState();
  });

  if (document.body instanceof HTMLElement) {
    document.body.classList.add("storefront-shop-page");
  }

  let lastScrollY = window.scrollY;
  let lastDirection = "up";
  const handleShopMobileHeader = () => {
    if (!document.body.classList.contains("storefront-shop-page")) return;
    if (window.innerWidth > 960) {
      document.body.classList.remove("shop-mobile-header-hidden");
      lastScrollY = window.scrollY;
      return;
    }
    const currentY = window.scrollY;
    const movingDown = currentY > lastScrollY + 10;
    const movingUp = currentY < lastScrollY - 10;
    if (movingDown && currentY > 120 && lastDirection !== "down") {
      document.body.classList.add("shop-mobile-header-hidden");
      lastDirection = "down";
    } else if (movingUp && lastDirection !== "up") {
      document.body.classList.remove("shop-mobile-header-hidden");
      lastDirection = "up";
    }
    lastScrollY = currentY;
  };

  window.addEventListener("scroll", handleShopMobileHeader, { passive: true });
  window.addEventListener("resize", handleShopMobileHeader);
  handleShopMobileHeader();

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
      short_description:
        "Official PS5 DualSense controller in Sterling Silver finish.",
      description:
        "Official PlayStation 5 DualSense wireless controller in Sterling Silver finish.",
      retail_price: 115,
      compare_at_price: 124,
      image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-sterling-silver-playstation-5.jpg",
      supplier_image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-sterling-silver-playstation-5.jpg",
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
      short_description:
        "Official PS5 DualSense controller in Cosmic Red finish.",
      description:
        "Official PlayStation 5 DualSense wireless controller in Cosmic Red finish.",
      retail_price: 109,
      compare_at_price: 129,
      image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-cosmic-red-playstation-5.jpg",
      supplier_image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-cosmic-red-playstation-5.jpg",
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
      short_description:
        "Official PS5 DualSense controller in Gray Camouflage finish.",
      description:
        "Official PlayStation 5 DualSense wireless controller in Gray Camouflage finish.",
      retail_price: 109,
      compare_at_price: 129,
      image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-gray-camouflage.jpg",
      supplier_image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-gray-camouflage.jpg",
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
      description:
        "Official PlayStation 5 DualSense wireless controller in Black finish.",
      retail_price: 109,
      compare_at_price: 129,
      image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/copy-of-dualsense-wireless-controller-playstation-5-black.jpg",
      supplier_image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/copy-of-dualsense-wireless-controller-playstation-5-black.jpg",
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
      description:
        "Official PlayStation 5 DualSense wireless controller in White finish.",
      retail_price: 109,
      compare_at_price: 129,
      image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-playstation-5-white.jpg",
      supplier_image_url:
        "https://fwlronvmgqzkleofriis.supabase.co/storage/v1/object/public/product-images/products/controllers/dualsense-wireless-controller-playstation-5-white.jpg",
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
      ? [
          {
            product_id: product.id,
            image_url: product.image_url,
            alt_text: product.name || "",
            sort_order: 0,
          },
        ]
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
        {
          slug: "ps5-controllers",
          name: "PS5 Controllers",
          description: "PlayStation 5 wireless controller range.",
        },
      ],
    };
  }

  const cachedPayload = readCatalogSessionCache(
    SHARED_CATALOG_CACHE_KEY,
    SHARED_CATALOG_CACHE_TTL_MS,
  );
  if (cachedPayload) {
    return cachedPayload;
  }
  if (sharedCatalogLoadPromise) {
    return sharedCatalogLoadPromise;
  }

  const headers = {
    Accept: "application/json",
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
  };

  const buildSnapshot = (products, taxonomyRows = [], productImages = []) => {
    const categories = normalizePosCatalogTaxonomy(taxonomyRows);
    const categoriesMap = new Map(
      categories.map((category) => [category.id, category]),
    );
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

    const normalizedProducts = products
      .map((product, index) => {
        const category = categoriesMap.get(product.pos_category_id) || null;
        const retailPrice = Number(product.retail_price);
        const compareAtPrice = Number(product.compare_at_price);
        const safeRetailPrice =
          Number.isFinite(retailPrice) && retailPrice > 0 ? retailPrice : 0;
        const galleryImages = Array.isArray(galleryMap.get(product.id))
          ? galleryMap
              .get(product.id)
              .slice()
              .sort(
                (left, right) =>
                  (Number(left.sort_order) || 0) -
                  (Number(right.sort_order) || 0),
              )
          : [];
        const fallbackGallery =
          product.image_url && !galleryImages.length
            ? [
                {
                  product_id: product.id,
                  image_url: product.image_url,
                  alt_text: product.name || "",
                  sort_order: 0,
                },
              ]
            : [];
        const finalGallery = galleryImages.length
          ? galleryImages
          : fallbackGallery;

        return {
          ...product,
          catalog_index: index,
          retail_price: safeRetailPrice,
          compare_at_price:
            Number.isFinite(compareAtPrice) && compareAtPrice > safeRetailPrice
              ? compareAtPrice
              : null,
          display_image:
            finalGallery[0]?.image_url || resolveProductImageUrl(product),
          gallery_images: finalGallery,
          category_slug: category?.slug || "other-products",
          category_name: category?.name || "Other Products",
          category_description: category?.description || "",
          category_parent_name: category?.parent_name || "Other Products",
          category_parent_slug: category?.parent_slug || "other-products",
        };
      })
      .sort(compareProductsByLatest);

    const derivedCategories = categories.length
      ? categories
      : Array.from(
          new Map(
            normalizedProducts.map((product) => [
              product.category_slug ||
                `category-${product.category_id || product.id}`,
              {
                id: product.category_id || product.category_slug || product.id,
                slug:
                  product.category_slug ||
                  `category-${product.category_id || product.id}`,
                name: product.category_name || "Other Products",
                description: product.category_description || "",
                sort_order: 999,
              },
            ]),
          ).values(),
        );

    const catalogProducts = normalizedProducts.length
      ? applyProductVariantData(normalizedProducts)
      : getFallbackCatalogProducts();

    return {
      products: catalogProducts,
      categories: derivedCategories.length
        ? derivedCategories
        : [
            {
              slug: "ps5-controllers",
              name: "PS5 Controllers",
              description: "PlayStation 5 wireless controller range.",
            },
          ],
    };
  };

  const fetchSnapshot = async ({
    productSelect,
    productLimit = null,
    includeImages = false,
    orderClause = "created_at.desc,id.desc",
  }) => {
    const categoriesUrl = `${supabaseUrl}/rest/v1/pos_category_taxonomy?select=id,category_name,subcategory_name,category_sort,subcategory_sort,active&active=eq.true&order=category_sort.asc,subcategory_sort.asc`;
    const limitQuery =
      Number.isFinite(productLimit) && productLimit > 0
        ? `&limit=${Math.floor(productLimit)}`
        : "";
    const productsUrl = `${supabaseUrl}/rest/v1/products?select=${productSelect}&is_visible=eq.true&order=${orderClause}${limitQuery}`;
    const productImagesUrl = includeImages
      ? `${supabaseUrl}/rest/v1/product_images?select=product_id,image_url,alt_text,sort_order&order=sort_order.asc`
      : null;

    const [categoriesResult, productsResult, productImagesResult] =
      await Promise.allSettled([
        fetch(categoriesUrl, { headers, cache: "default" }),
        fetch(productsUrl, { headers, cache: "default" }),
        productImagesUrl
          ? fetch(productImagesUrl, { headers, cache: "default" })
          : Promise.resolve(null),
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
      includeImages &&
      productImagesResult.status === "fulfilled" &&
      productImagesResult.value &&
      productImagesResult.value.ok
        ? await productImagesResult.value.json()
        : [];

    return buildSnapshot(products, categories, productImages);
  };

  try {
    sharedCatalogLoadPromise = fetchSnapshot({
      productSelect: [
        "id,sku,slug,name,brand,model,short_description,description,retail_price,compare_at_price,image_url,stock_quantity,is_featured,condition_label,compatibility,category_id,pos_category_id,created_at,updated_at,upc",
        PRODUCT_GROUP_CATALOG_SELECT,
      ].join(","),
      includeImages: true,
      orderClause: "created_at.desc,id.desc",
    });
    const payload = await sharedCatalogLoadPromise;
    writeCatalogSessionCache(SHARED_CATALOG_CACHE_KEY, payload);
    return payload;
  } catch (error) {
    const products = getFallbackCatalogProducts();
    return {
      products,
      categories: [
        {
          slug: "ps5-controllers",
          name: "PS5 Controllers",
          description: "PlayStation 5 wireless controller range.",
        },
      ],
    };
  } finally {
    sharedCatalogLoadPromise = null;
  }
}

async function fetchCatalogProductsForCartValidation(items) {
  const { supabaseUrl, supabaseAnonKey } = window.TECHM8_CONFIG || {};
  const slugs = Array.from(
    new Set(
      (Array.isArray(items) ? items : [])
        .map((item) => String(item?.slug || "").trim())
        .filter(Boolean),
    ),
  );

  if (!slugs.length) return [];
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase catalog configuration is missing.");
  }

  const headers = {
    Accept: "application/json",
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
  };
  const productUrl = new URL(`${supabaseUrl}/rest/v1/products`);
  const quotedSlugs = slugs.map(
    (slug) => `"${slug.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`,
  );
  productUrl.searchParams.set(
    "select",
    [
      "id,sku,slug,name,brand,model,short_description,retail_price,compare_at_price,image_url,is_featured,condition_label,compatibility,category_id,pos_category_id,created_at,updated_at,upc",
      PRODUCT_GROUP_CATALOG_SELECT,
    ].join(","),
  );
  productUrl.searchParams.set("is_visible", "eq.true");
  productUrl.searchParams.set("slug", `in.(${quotedSlugs.join(",")})`);

  const categoriesUrl = `${supabaseUrl}/rest/v1/pos_category_taxonomy?select=id,category_name,subcategory_name,category_sort,subcategory_sort,active&active=eq.true&order=category_sort.asc,subcategory_sort.asc`;
  const [productsResponse, categoriesResponse] = await Promise.all([
    fetch(productUrl.toString(), { headers, cache: "no-store" }),
    fetch(categoriesUrl, { headers, cache: "default" }),
  ]);

  if (!productsResponse.ok) {
    throw new Error("Cart products could not be validated.");
  }

  const products = await productsResponse.json();
  const taxonomyRows = categoriesResponse.ok ? await categoriesResponse.json() : [];
  const categories = normalizePosCatalogTaxonomy(taxonomyRows);
  const categoriesMap = new Map(
    (Array.isArray(categories) ? categories : []).map((category) => [
      category.id,
      category,
    ]),
  );

  return (Array.isArray(products) ? products : []).map((product, index) => {
    const category = categoriesMap.get(product.pos_category_id) || null;
    const retailPrice = Number(product.retail_price);
    const compareAtPrice = Number(product.compare_at_price);
    const safeRetailPrice =
      Number.isFinite(retailPrice) && retailPrice > 0 ? retailPrice : 0;

    return {
      ...product,
      catalog_index: index,
      retail_price: safeRetailPrice,
      compare_at_price:
        Number.isFinite(compareAtPrice) && compareAtPrice > safeRetailPrice
          ? compareAtPrice
          : null,
      display_image: resolveProductImageUrl(product),
      category_slug: category?.slug || "other-products",
      category_name: category?.name || "Other Products",
      category_description: category?.description || "",
      category_parent_name: category?.parent_name || "Other Products",
      category_parent_slug: category?.parent_slug || "other-products",
    };
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !state.drawerOpen) return;
    state.drawerOpen = false;
    applyDrawerState();
    openCategoriesButton?.focus();
  });
}

async function loadHomeLatestCatalogData(options = {}) {
  const preferCache = options?.preferCache !== false;
  const cachedPayload = readCatalogSessionCache(
    HOME_LATEST_CATALOG_CACHE_KEY,
    HOME_LATEST_CATALOG_CACHE_TTL_MS,
  );
  if (preferCache && cachedPayload) {
    return cachedPayload;
  }
  if (homeLatestCatalogLoadPromise) {
    return homeLatestCatalogLoadPromise;
  }

  const { supabaseUrl, supabaseAnonKey } = window.TECHM8_CONFIG || {};
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      products: getFallbackCatalogProducts(),
      categories: [],
    };
  }

  const headers = {
    Accept: "application/json",
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
  };

  try {
    const categoriesUrl = `${supabaseUrl}/rest/v1/pos_category_taxonomy?select=id,category_name,subcategory_name,category_sort,subcategory_sort,active&active=eq.true&order=category_sort.asc,subcategory_sort.asc`;
    const productsUrl = `${supabaseUrl}/rest/v1/products?select=id,sku,slug,name,brand,model,retail_price,compare_at_price,image_url,is_featured,condition_label,compatibility,category_id,pos_category_id,created_at,updated_at,upc,${PRODUCT_GROUP_CATALOG_SELECT}&is_visible=eq.true&order=created_at.desc,id.desc&limit=96`;

    homeLatestCatalogLoadPromise = Promise.all([
      fetch(categoriesUrl, { headers, cache: "default" }),
      fetch(productsUrl, { headers, cache: "default" }),
    ]);

    const [categoriesResponse, productsResponse] =
      await homeLatestCatalogLoadPromise;

    if (!productsResponse.ok) {
      throw new Error("Latest products request failed");
    }

    const taxonomyRows = categoriesResponse.ok ? await categoriesResponse.json() : [];
    const categories = normalizePosCatalogTaxonomy(taxonomyRows);
    const products = await productsResponse.json();
    const categoriesMap = new Map(
      categories.map((category) => [category.id, category]),
    );
    const normalizedProducts = applyProductVariantData(
      products
        .map((product, index) => {
          const category = categoriesMap.get(product.pos_category_id) || null;
          const retailPrice = Number(product.retail_price);
          const compareAtPrice = Number(product.compare_at_price);
          const safeRetailPrice =
            Number.isFinite(retailPrice) && retailPrice > 0 ? retailPrice : 0;

          return {
            ...product,
            catalog_index: index,
            retail_price: safeRetailPrice,
            compare_at_price:
              Number.isFinite(compareAtPrice) &&
              compareAtPrice > safeRetailPrice
                ? compareAtPrice
                : null,
            display_image: resolveProductImageUrl(product),
            gallery_images: product.image_url
              ? [
                  {
                    product_id: product.id,
                    image_url: product.image_url,
                    alt_text: product.name || "",
                    sort_order: 0,
                  },
                ]
              : [],
            category_slug: category?.slug || "other-products",
            category_name: category?.name || "Other Products",
            category_description: category?.description || "",
            category_parent_name: category?.parent_name || "Other Products",
            category_parent_slug: category?.parent_slug || "other-products",
          };
        })
        .sort(compareProductsByLatest),
    );

    const payload = {
      products: normalizedProducts.length
        ? normalizedProducts
        : getFallbackCatalogProducts(),
      categories,
    };
    writeCatalogSessionCache(HOME_LATEST_CATALOG_CACHE_KEY, payload);
    return payload;
  } catch (error) {
    return {
      products: getFallbackCatalogProducts(),
      categories: [],
    };
  } finally {
    homeLatestCatalogLoadPromise = null;
  }
}

async function fetchCatalogProductBySlug(slug) {
  const safeSlug = String(slug || "").trim();
  const { supabaseUrl, supabaseAnonKey } = window.TECHM8_CONFIG || {};
  if (!safeSlug || !supabaseUrl || !supabaseAnonKey) return null;

  const headers = {
    Accept: "application/json",
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
  };
  const productSelect = [
    "id,sku,slug,name,brand,model,short_description,description,detail_html,retail_price,compare_at_price,image_url,stock_quantity,is_featured,is_visible,condition_label,compatibility,category_id,pos_category_id,created_at,upc",
    PRODUCT_GROUP_CATALOG_SELECT,
  ].join(",");

  const productUrl = `${supabaseUrl}/rest/v1/products?select=${productSelect}&slug=eq.${encodeURIComponent(safeSlug)}&is_visible=eq.true&limit=1`;
  const productResponse = await fetch(productUrl, { headers, cache: "default" });
  if (!productResponse.ok) {
    throw new Error("Product request failed");
  }

  const productRows = await productResponse.json();
  if (!Array.isArray(productRows) || !productRows.length) {
    return null;
  }

  const product = productRows[0];
  const categoryUrl = product.pos_category_id
    ? `${supabaseUrl}/rest/v1/pos_category_taxonomy?select=id,category_name,subcategory_name,category_sort,subcategory_sort,active&id=eq.${encodeURIComponent(String(product.pos_category_id))}&active=eq.true&limit=1`
    : null;
  const imagesUrl = `${supabaseUrl}/rest/v1/product_images?select=product_id,image_url,alt_text,sort_order&product_id=eq.${encodeURIComponent(String(product.id))}&order=sort_order.asc`;

  const [categoryResult, imagesResult] = await Promise.allSettled([
    categoryUrl ? fetch(categoryUrl, { headers, cache: "default" }) : Promise.resolve(null),
    fetch(imagesUrl, { headers, cache: "default" }),
  ]);

  const categoryRows =
    categoryResult.status === "fulfilled" &&
    categoryResult.value &&
    "ok" in categoryResult.value &&
    categoryResult.value.ok
      ? await categoryResult.value.json()
      : [];
  const productImages =
    imagesResult.status === "fulfilled" && imagesResult.value.ok
      ? await imagesResult.value.json()
      : [];

  const category = normalizePosCatalogTaxonomy(categoryRows)[0] || null;
  const galleryImages = Array.isArray(productImages)
    ? productImages
        .filter((image) => image?.image_url)
        .map((image) => ({
          product_id: image.product_id,
          image_url: image.image_url,
          alt_text: image.alt_text || "",
          sort_order: Number(image.sort_order) || 0,
        }))
        .sort(
          (left, right) =>
            (Number(left.sort_order) || 0) - (Number(right.sort_order) || 0),
        )
    : [];

  const retailPrice = Number(product.retail_price);
  const compareAtPrice = Number(product.compare_at_price);
  const normalizedProduct = {
    ...product,
    catalog_index: 0,
    retail_price: Number.isFinite(retailPrice) && retailPrice > 0 ? retailPrice : 0,
    compare_at_price:
      Number.isFinite(compareAtPrice) &&
      compareAtPrice > (Number.isFinite(retailPrice) && retailPrice > 0 ? retailPrice : 0)
        ? compareAtPrice
        : null,
    display_image: galleryImages[0]?.image_url || resolveProductImageUrl(product),
    gallery_images: galleryImages.length
      ? galleryImages
      : product.image_url
        ? [
            {
              product_id: product.id,
              image_url: product.image_url,
              alt_text: product.name || "",
              sort_order: 0,
            },
          ]
        : [],
    category_slug: category?.slug || "other-products",
    category_name: category?.name || "Other Products",
    category_description: category?.description || "",
    category_parent_name: category?.parent_name || "Other Products",
    category_parent_slug: category?.parent_slug || "other-products",
  };

  return applyProductVariantData([normalizedProduct])[0] || null;
}

function renderProductDetailShell(shell, product, relatedProducts = null) {
  if (!(shell instanceof HTMLElement) || !product) return;

  const compareAtPrice = Number(product.compare_at_price) || 0;
  const retailPrice = Number(product.retail_price) || 0;
  const isCatalogVisible = product.is_visible !== false;
  const savings =
    compareAtPrice > retailPrice ? compareAtPrice - retailPrice : 0;
  const stockText = isCatalogVisible
    ? "Available for online order or store pickup"
    : "Currently unavailable";
  const productName = getProductDisplayName(product) || product.name;
  const galleryImages = getOrderedProductGalleryImages(product);
  const mainImage = galleryImages[0] || null;
  const variantOptions = Array.isArray(product.variant_options)
    ? product.variant_options
    : [];
  const hasRelatedCatalog =
    Array.isArray(relatedProducts) && relatedProducts.length > 1;
  const productGroupKey = product.variant_group_key || product.slug;
  const latestProducts = hasRelatedCatalog
    ? getLatestDisplayProducts(
        relatedProducts.filter(
          (item) => (item.variant_group_key || item.slug) !== productGroupKey,
        ),
        6,
      )
    : [];
  rememberRecentProduct(product);
  const recentlyViewedProducts = hasRelatedCatalog
    ? getRecentlyViewedProducts(relatedProducts, product.slug, 6)
    : [];
  const detailHtml = formatProductDetailHtml(product);
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
                    href="${getProductPageHref(option.slug)}"
                  >${escapeHtml(option.label)}</a>
                `,
              )
              .join("")}
          </div>
        </div>
      `
      : "";

  const relatedMarkup = hasRelatedCatalog
    ? `
      ${renderProductRailSection({
        eyebrow: "Latest products",
        title: "New arrivals in the catalog",
        linkHref: "/shop.html",
        linkLabel: "View all products",
        emptyTitle: "No newer products yet",
        emptyCopy:
          "New products will appear here automatically as they are added to Supabase.",
        products: latestProducts,
        dataAttribute: "data-product-latest",
      })}

      ${renderProductRailSection({
        eyebrow: "Recently viewed",
        title: "Products viewed on this browser",
        linkHref: `/category.html?slug=${encodeURIComponent(product.category_slug)}`,
        linkLabel: `View ${product.category_name}`,
        emptyTitle: "No recent products yet",
        emptyCopy:
          "As customers browse the catalog, recently viewed products will appear here.",
        products: recentlyViewedProducts,
        dataAttribute: "data-product-recent",
      })}
    `
    : "";

  document.title = `${productName} | TECHM8 Online Store`;
  shell.innerHTML = `
    <div class="storefront-breadcrumbs">
      <a href="/">Home</a>
      <span>/</span>
      <a href="/shop.html">Online Store</a>
      <span>/</span>
      <a href="/category.html?slug=${encodeURIComponent(product.category_slug)}">${escapeHtml(product.category_name)}</a>
      <span>/</span>
      <span>${escapeHtml(productName)}</span>
    </div>

    <section class="storefront-pdp">
      <div class="storefront-pdp__gallery">
        <div class="storefront-pdp__gallery-main">
          ${mainImage ? `<img src="${escapeHtml(mainImage.image_url)}" alt="${escapeHtml(mainImage.alt_text || product.name)}" width="900" height="900" data-pdp-main-image loading="eager" decoding="async" fetchpriority="high">` : `<div class="storefront-card__image storefront-card__image--placeholder">TECHM8</div>`}
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
                    `,
                  )
                  .join("")}
              </div>
            `
            : ""
        }
      </div>

      <div class="storefront-pdp__summary">
        <p class="eyebrow">Online store item</p>
        <div class="storefront-pdp__brand-row">
          <span class="storefront-pdp__brand">${escapeHtml(product.brand || "TECHM8")}</span>
          <span class="storefront-pdp__stock">${escapeHtml(stockText)}</span>
        </div>
        <h1>${escapeHtml(productName)}</h1>
        <p class="storefront-pdp__intro">${escapeHtml(product.description || product.short_description || "Retail catalog product.")}</p>

        <div class="storefront-pdp__price-card" data-product-price="${escapeHtml(retailPrice.toFixed(2))}" data-price-currency="AUD">
          <div class="storefront-pdp__price-top">
            ${compareAtPrice > retailPrice ? `<span class="storefront-pdp__compare">${escapeHtml(formatMoney(compareAtPrice))}</span>` : ""}
            ${savings > 0 ? `<span class="storefront-pdp__save">Save ${escapeHtml(formatMoney(savings))}</span>` : ""}
          </div>
          <div class="storefront-pdp__price-main">${escapeHtml(formatMoney(retailPrice))}</div>
        </div>
        <div class="zip-widget-slot" data-zip-product-widget data-zip-price="${escapeHtml(String(retailPrice))}" hidden></div>

        ${variantMarkup}

        ${
          isCatalogVisible
            ? `
              <div class="storefront-pdp__purchase">
                <label class="storefront-pdp__qty">
                  <span>Qty</span>
                  <input type="number" min="1" max="${escapeHtml(String(getCartItemMaxQuantity(product.slug)))}" value="1" data-product-qty>
                </label>
                <button class="button button--primary storefront-pdp__cart-button" type="button" data-product-add-cart>Add to cart</button>
                <a class="button button--ghost" href="/stores.html">Find in store</a>
              </div>
            `
            : `
              <div class="storefront-pdp__purchase">
                <p>This item is not currently available for online purchase.</p>
                <a class="button button--ghost" href="/shop.html">Browse available products</a>
              </div>
            `
        }

        <div class="storefront-pdp__highlights">
          <div class="storefront-pdp__highlight"><strong>Brand</strong><span>${escapeHtml(product.brand || "TECHM8")}</span></div>
          <div class="storefront-pdp__highlight"><strong>Category</strong><span>${escapeHtml(product.category_name)}</span></div>
        </div>
      </div>
    </section>

    <section class="storefront-pdp__detail-stack">
      <article class="storefront-pdp__panel storefront-pdp__panel--detail-html">
        <div class="section-heading section-heading--split">
          <div>
            <p class="eyebrow">Product details</p>
            <h2>Description</h2>
          </div>
        </div>
        <div class="storefront-rich-content">
          ${detailHtml}
          ${product.model ? `<p><strong>Model:</strong> ${escapeHtml(product.model)}</p>` : ""}
          ${product.sku ? `<p><strong>SKU:</strong> ${escapeHtml(product.sku)}</p>` : ""}
          ${product.condition_label ? `<p><strong>Condition:</strong> ${escapeHtml(product.condition_label)}</p>` : ""}
        </div>
      </article>
      <article class="storefront-pdp__panel">
        <div class="section-heading section-heading--split">
          <div>
            <p class="eyebrow">Buying from TECHM8</p>
            <h2>Price, availability and returns</h2>
          </div>
        </div>
        <div class="storefront-rich-content">
          <p>Prices are shown in Australian dollars. Online stock and pickup availability are checked again before checkout or collection.</p>
          <p><a href="/store-policy.html">Read the shipping, returns and warranty policy</a>.</p>
        </div>
      </article>
    </section>

    ${relatedMarkup}
  `;
  initZipMarketingAssets(shell);
}

function bindProductDetailShell(shell, product, catalogProducts = null) {
  if (!(shell instanceof HTMLElement) || !product) return;

  if (!shell.dataset.gaViewTracked) {
    const gaItem = buildGa4Item(product, 1);
    if (gaItem) {
      trackGa4Event("view_item", {
        currency: "AUD",
        value: gaItem.price,
        items: [gaItem],
      });
      shell.dataset.gaViewTracked = "true";
    }
  }

  const addButton = shell.querySelector("[data-product-add-cart]");
  const qtyField = shell.querySelector("[data-product-qty]");
  const mainImageTarget = shell.querySelector("[data-pdp-main-image]");
  const thumbnailButtons = shell.querySelectorAll("[data-pdp-thumb]");

  if (addButton instanceof HTMLButtonElement) {
    addButton.addEventListener("click", () => {
      const quantity =
        qtyField instanceof HTMLInputElement
          ? normaliseCartQuantity(product.slug, qtyField.value)
          : 1;
      addItemToCart(product, quantity);
      addButton.textContent = "Added to cart";
      window.setTimeout(() => {
        addButton.textContent = "Add to cart";
      }, 1200);
    });
  }

  if (
    mainImageTarget instanceof HTMLImageElement &&
    thumbnailButtons.length
  ) {
    thumbnailButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (!(button instanceof HTMLButtonElement)) return;
        const imageSrc = button.getAttribute("data-image-src") || "";
        const imageAlt =
          button.getAttribute("data-image-alt") || product.name || "";
        if (!imageSrc) return;
        mainImageTarget.src = imageSrc;
        mainImageTarget.alt = imageAlt;
        thumbnailButtons.forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");
      });
    });
  }

  if (Array.isArray(catalogProducts) && catalogProducts.length) {
    shell
      .querySelectorAll("[data-product-latest], [data-product-recent]")
      .forEach((target) => {
        if (target instanceof HTMLElement) {
          bindCartButtons(target, catalogProducts);
        }
      });
  }
}

function getProductGalleryImages(product) {
  if (Array.isArray(product?.gallery_images) && product.gallery_images.length) {
    return product.gallery_images
      .filter((item) => item?.image_url)
      .sort(
        (left, right) =>
          (Number(left?.sort_order) || 0) - (Number(right?.sort_order) || 0),
      );
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

const PRODUCT_NAVIGATION_CACHE_KEY = "techm8:last-product-cache:v1";

function buildProductNavigationCache(product) {
  if (!product?.slug) return "";
  const payload = {
    id: product.id ?? null,
    sku: product.sku ?? "",
    slug: product.slug,
    name: product.name ?? "",
    brand: product.brand ?? "",
    model: product.model ?? "",
    short_description: product.short_description ?? "",
    description: product.description ?? "",
    detail_html: product.detail_html ?? "",
    retail_price: Number(product.retail_price) || 0,
    compare_at_price: Number(product.compare_at_price) || null,
    image_url: product.image_url ?? "",
    display_image: product.display_image ?? "",
    stock_quantity: Number(product.stock_quantity) || 0,
    is_featured: Boolean(product.is_featured),
    is_visible: product.is_visible !== false,
    condition_label: product.condition_label ?? "",
    compatibility: product.compatibility ?? "",
    category_id: product.category_id ?? null,
    category_slug: product.category_slug ?? "other-products",
    category_name: product.category_name ?? "Other Products",
    category_description: product.category_description ?? "",
    created_at: product.created_at ?? null,
    upc: product.upc ?? "",
    product_group_id: product.product_group_id ?? null,
    product_groups: getProductGroupData(product),
    variant_name: product.variant_name ?? "",
    variant_color: product.variant_color ?? "",
    variant_group_key: product.variant_group_key ?? "",
    variant_group_value: product.variant_group_value ?? "",
    variant_display_name: product.variant_display_name ?? "",
    variant_options: Array.isArray(product.variant_options)
      ? product.variant_options.map((option) => ({
          slug: option?.slug ?? "",
          label: option?.label ?? "",
          is_active: Boolean(option?.is_active),
        }))
      : [],
    gallery_images: getOrderedProductGalleryImages(product).map((image) => ({
      image_url: image?.image_url ?? "",
      alt_text: image?.alt_text ?? "",
      sort_order: Number(image?.sort_order) || 0,
    })),
  };

  try {
    return encodeURIComponent(JSON.stringify(payload));
  } catch {
    return "";
  }
}

function rememberEncodedProductNavigationCache(encodedValue) {
  const safeValue = String(encodedValue || "").trim();
  if (!safeValue) return;
  try {
    window.sessionStorage.setItem(PRODUCT_NAVIGATION_CACHE_KEY, safeValue);
  } catch {
    // Ignore session storage failures.
  }
}

function getRememberedProductNavigationCache(slug) {
  const safeSlug = String(slug || "").trim();
  if (!safeSlug) return null;
  try {
    const encoded = window.sessionStorage.getItem(PRODUCT_NAVIGATION_CACHE_KEY);
    if (!encoded) return null;
    const parsed = JSON.parse(decodeURIComponent(encoded));
    return parsed?.slug === safeSlug ? parsed : null;
  } catch {
    return null;
  }
}

function rememberProductNavigationFromElement(target) {
  const source =
    target instanceof Element ? target.closest("[data-product-cache]") : null;
  if (!(source instanceof HTMLElement)) return;
  const encodedValue = source.getAttribute("data-product-cache");
  if (!encodedValue) return;
  rememberEncodedProductNavigationCache(encodedValue);
}

function initProductNavigationCache() {
  const handleCache = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    rememberProductNavigationFromElement(target);
  };

  document.addEventListener("pointerdown", handleCache, true);
  document.addEventListener("click", handleCache, true);
  document.addEventListener("touchstart", handleCache, {
    capture: true,
    passive: true,
  });
}

function createCatalogCard(product, index = Number.POSITIVE_INFINITY) {
  const detailUrl = getProductPageHref(product.slug);
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
  const stockLabel = "Available to order";
  const navigationCache = buildProductNavigationCache(product);
  const eagerImage = Number.isFinite(index) && index < 2;
  const highPriorityImage = Number.isFinite(index) && index === 0;
  const imageMarkup = product.display_image
    ? `<img class="storefront-card__image" src="${escapeHtml(product.display_image)}" alt="${escapeHtml(productName)}" width="640" height="640" loading="${eagerImage ? "eager" : "lazy"}" decoding="async" ${highPriorityImage ? 'fetchpriority="high"' : ""} sizes="(max-width: 380px) 92vw, (max-width: 720px) 44vw, (max-width: 1200px) 30vw, 18vw">`
    : `<div class="storefront-card__image storefront-card__image--placeholder" aria-hidden="true">TECHM8</div>`;
  const stockClass = "is-in-stock";

  return `
    <article class="storefront-card storefront-card--commerce" data-product-cache="${escapeHtml(navigationCache)}">
      <a class="storefront-card__media-link" href="${detailUrl}" data-product-cache="${escapeHtml(navigationCache)}">
        <div class="storefront-card__media">${imageMarkup}</div>
      </a>
      <div class="storefront-card__body">
        <div class="storefront-card__top">
          <a class="storefront-card__pill storefront-card__pill--link" href="${categoryUrl}">${escapeHtml(product.category_name)}</a>
          ${product.is_featured ? '<span class="storefront-card__tag">Featured</span>' : savingsPill}
        </div>
        <a class="storefront-card__title-link" href="${detailUrl}" data-product-cache="${escapeHtml(navigationCache)}">
          <h3>${escapeHtml(productName)}</h3>
        </a>
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
            ${renderVariantAwareCartAction(product, detailUrl, "storefront-card__action storefront-card__action--primary")}
          </div>
        </div>
      </div>
    </article>
  `;
}

function selectLatestHomeProducts(products, limit = 6) {
  return getLatestDisplayProducts(products, limit);
}

function buildHomeLatestPayload(sourcePayload, limit = 18) {
  if (!sourcePayload || !Array.isArray(sourcePayload.products)) {
    return null;
  }

  return {
    products: getLatestDisplayProducts(sourcePayload.products, limit),
    categories: Array.isArray(sourcePayload.categories)
      ? sourcePayload.categories
      : [],
  };
}

function createHomeFeaturedCard(product, index = 0) {
  const detailUrl = getProductPageHref(product.slug);
  const retailPrice = Number(product.retail_price) || 0;
  const compareAtPrice = Number(product.compare_at_price) || 0;
  const hasComparePrice =
    Number.isFinite(compareAtPrice) && compareAtPrice > retailPrice;
  const productName = getProductDisplayName(product) || product.name;
  const navigationCache = buildProductNavigationCache(product);
  const eagerImage = index < 2;
  const imageMarkup = product.display_image
    ? `<img src="${escapeHtml(product.display_image)}" alt="${escapeHtml(productName)}" width="640" height="640" loading="${eagerImage ? "eager" : "lazy"}" decoding="async" ${eagerImage ? 'fetchpriority="high"' : ""} sizes="(max-width: 720px) 72vw, 22vw">`
    : `<div class="home-product-card__image-placeholder" aria-hidden="true">TECHM8</div>`;

  return `
      <article class="home-product-card" data-product-card-link="${detailUrl}" data-product-cache="${escapeHtml(navigationCache)}" tabindex="0" role="link" aria-label="${escapeHtml(productName)}">
        <a class="home-product-card__media" href="${detailUrl}" data-product-cache="${escapeHtml(navigationCache)}">
          ${imageMarkup}
        </a>
        <div class="home-product-card__content">
            <a class="home-product-card__title-link" href="${detailUrl}" data-product-cache="${escapeHtml(navigationCache)}">
              <h3>${escapeHtml(productName)}</h3>
            </a>
            <div class="home-product-card__price-row">
              <strong>${escapeHtml(formatMoney(retailPrice))}</strong>
              ${hasComparePrice ? `<span class="home-product-card__compare">${escapeHtml(formatMoney(compareAtPrice))}</span>` : ""}
            </div>
          <div class="home-product-card__actions">
            ${renderVariantAwareCartAction(product, detailUrl, "home-product-card__cart-button")}
          </div>
        </div>
      </article>
    `;
}

function initHomeFeaturedProducts() {
  const grid = document.querySelector("[data-home-featured-grid]");
  const viewport = document.querySelector("[data-home-featured-viewport]");
  const prevButton = document.querySelector("[data-home-featured-prev]");
  const nextButton = document.querySelector("[data-home-featured-next]");
  if (!(grid instanceof HTMLElement) || !(viewport instanceof HTMLElement))
    return;
  const section = grid.closest(".home-products-showcase");
  let hasLoaded = false;
  const preloadLatestProductsPromise = loadHomeLatestCatalogData({
    preferCache: false,
  }).catch(() => null);

  const updateArrowState = () => {
    if (
      !(prevButton instanceof HTMLButtonElement) ||
      !(nextButton instanceof HTMLButtonElement)
    )
      return;
    const maxScrollLeft = Math.max(
      0,
      viewport.scrollWidth - viewport.clientWidth,
    );
    prevButton.disabled = viewport.scrollLeft <= 8;
    nextButton.disabled = viewport.scrollLeft >= maxScrollLeft - 8;
  };

  const scrollCarousel = (direction) => {
    const step = Math.max(viewport.clientWidth * 0.82, 260);
    viewport.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  if (prevButton instanceof HTMLButtonElement) {
    prevButton.addEventListener("click", () => scrollCarousel(-1));
  }

  if (nextButton instanceof HTMLButtonElement) {
    nextButton.addEventListener("click", () => scrollCarousel(1));
  }

  viewport.addEventListener("scroll", updateArrowState, { passive: true });
  window.addEventListener("resize", updateArrowState);

  const render = (products) => {
    const latestProducts = selectLatestHomeProducts(products, 6);
    grid.innerHTML = latestProducts.length
      ? latestProducts
          .map((product, index) => createHomeFeaturedCard(product, index))
          .join("")
      : `<article class="home-product-card home-product-card--loading"><div class="home-product-card__content"><div class="home-product-card__row"><h3>No products available yet</h3><span class="home-product-card__pill">Catalog</span></div><p class="home-product-card__summary">Add products in Supabase and the newest six items will appear here automatically.</p></div></article>`;
    bindCartButtons(grid, latestProducts);
    requestAnimationFrame(updateArrowState);
  };

  grid.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("button, a")) return;
    const card = target.closest("[data-product-card-link]");
    if (!(card instanceof HTMLElement)) return;
    const href = card.getAttribute("data-product-card-link");
    if (href) window.location.href = href;
  });

  grid.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const card = target.closest("[data-product-card-link]");
    if (!(card instanceof HTMLElement)) return;
    const href = card.getAttribute("data-product-card-link");
    if (!href) return;
    rememberProductNavigationFromElement(card);
    event.preventDefault();
    window.location.href = href;
  });

  const loadProducts = () => {
    if (hasLoaded) return;
    hasLoaded = true;
    const cachedLatestPayload = readBestCatalogCache(
      [
        {
          key: HOME_LATEST_CATALOG_CACHE_KEY,
          maxAgeMs: HOME_LATEST_CATALOG_CACHE_TTL_MS,
          transform: (payload) => payload,
        },
        {
          key: SHOP_CATALOG_CACHE_KEY,
          maxAgeMs: SHOP_CATALOG_CACHE_TTL_MS,
          transform: (payload) => buildHomeLatestPayload(payload, 18),
        },
        {
          key: SHARED_CATALOG_CACHE_KEY,
          maxAgeMs: SHARED_CATALOG_CACHE_TTL_MS,
          transform: (payload) => buildHomeLatestPayload(payload, 18),
        },
      ],
      { allowStale: true },
    );
    if (cachedLatestPayload?.products?.length) {
      render(cachedLatestPayload.products);
    }

    preloadLatestProductsPromise
      .then((payload) => {
        if (!payload?.products?.length) {
          return loadHomeLatestCatalogData({ preferCache: false });
        }
        return payload;
      })
      .then(({ products }) => {
        render(products);
      })
      .catch(() => {
        if (!cachedLatestPayload?.products?.length) {
          render(getFallbackCatalogProducts());
        }
      });
  };

  loadProducts();
}

function bindCartButtons(container, products, options = {}) {
  if (
    !(container instanceof HTMLElement) ||
    container.dataset.cartBound === "true"
  ) {
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
    const product = Array.isArray(source)
      ? source.find((item) => item.slug === slug)
      : null;
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
      productsTarget.innerHTML = `<article class="storefront-card storefront-card--empty"><div class="storefront-card__body"><span class="storefront-card__pill">Missing category</span><h3>Category not found</h3><p>Return to the online store and choose another category.</p><div class="storefront-card__actions"><a href="/shop.html">Back to online store</a></div></div></article>`;
      return;
    }

    if (titleTarget instanceof HTMLElement)
      titleTarget.textContent = category.name;
    if (descriptionTarget instanceof HTMLElement)
      descriptionTarget.textContent =
        category.description || `Browse all products in ${category.name}.`;
    if (breadcrumbTarget instanceof HTMLElement)
      breadcrumbTarget.textContent = category.name;
    if (linksTarget instanceof HTMLElement) {
      linksTarget.innerHTML = categories
        .map(
          (item) =>
            `<a class="storefront-category-link ${item.slug === slug ? "is-active" : ""}" href="/category.html?slug=${encodeURIComponent(item.slug)}">${escapeHtml(item.name)}</a>`,
        )
        .join("");
    }

    const render = () => {
      const query =
        searchField instanceof HTMLInputElement
          ? searchField.value.trim().toLowerCase()
          : "";
      const matchingProducts = products.filter((product) => {
        const haystack = [
          product.name,
          product.brand,
          product.model,
          product.short_description,
        ]
          .join(" ")
          .toLowerCase();
        return (
          product.category_slug === slug && (!query || haystack.includes(query))
        );
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
  const slug = root.dataset.productSlug || params.get("slug") || "";
  if (slug) {
    const canonicalUrl = `${getConfiguredSiteBaseUrl()}${getProductCanonicalHref(slug)}`;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!(canonical instanceof HTMLLinkElement)) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = canonicalUrl;
  }
  const prerenderedProductNode = document.querySelector(
    "script[data-prerendered-product]",
  );
  let prerenderedProduct = null;
  if (prerenderedProductNode instanceof HTMLScriptElement) {
    try {
      prerenderedProduct = JSON.parse(prerenderedProductNode.textContent || "null");
    } catch {
      prerenderedProduct = null;
    }
  }
  let initialProduct =
    prerenderedProduct || getRememberedProductNavigationCache(slug);
  let liveCatalogConfirmedMissing = false;

  const renderNotFound = () => {
    shell.innerHTML = `<article class="storefront-card storefront-card--empty"><div class="storefront-card__body"><span class="storefront-card__pill">Missing product</span><h3>Product not found</h3><p>Return to the online store and select another item.</p><div class="storefront-card__actions"><a href="/shop.html">Back to online store</a></div></div></article>`;
  };

  if (initialProduct) {
    renderProductDetailShell(shell, initialProduct);
    bindProductDetailShell(shell, initialProduct);
  }

  fetchCatalogProductBySlug(slug)
    .then((product) => {
      if (!product) {
        liveCatalogConfirmedMissing = true;
        initialProduct = null;
        try {
          window.sessionStorage.removeItem(PRODUCT_NAVIGATION_CACHE_KEY);
        } catch {
          // Ignore unavailable session storage.
        }
        renderNotFound();
        return;
      }
      initialProduct = product;
      rememberEncodedProductNavigationCache(buildProductNavigationCache(product));
      renderProductDetailShell(shell, product);
      bindProductDetailShell(shell, product);
    })
    .catch(() => null)
    .finally(() => {
      loadSharedCatalogData()
        .then(({ products }) => {
          const catalogProduct = products.find((item) => item.slug === slug);
          if (!catalogProduct) {
            if (liveCatalogConfirmedMissing || !initialProduct) {
              renderNotFound();
            }
            return;
          }

          const product = initialProduct
            ? {
                ...catalogProduct,
                ...initialProduct,
                display_name:
                  catalogProduct.display_name || initialProduct.display_name,
                variant_group_key:
                  catalogProduct.variant_group_key ||
                  initialProduct.variant_group_key,
                variant_options: catalogProduct.variant_options?.length
                  ? catalogProduct.variant_options
                  : initialProduct.variant_options,
              }
            : catalogProduct;

          renderProductDetailShell(shell, product, products);
          bindProductDetailShell(shell, product, products);
        })
        .catch(() => {
          if (!initialProduct) {
            renderNotFound();
          }
        });
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
            <a href="/shop.html">Return to online store</a>
          </div>
        </div>
      </article>
    `;
    return;
  }

  target.innerHTML = items
    .map((item) => {
      const lineTotal = (Number(item.price) || 0) * (Number(item.qty) || 0);
      return `
      <article class="storefront-cart__item">
        <a class="storefront-cart__media" href="${getProductPageHref(item.slug)}">
          ${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">` : `<div class="storefront-card__image storefront-card__image--placeholder">TECHM8</div>`}
        </a>
        <div class="storefront-cart__details">
          <div class="storefront-cart__top">
            <div>
              <p class="storefront-cart__eyebrow">${escapeHtml(item.category_name || "Store product")}</p>
              <h3><a href="${getProductPageHref(item.slug)}">${escapeHtml(item.name)}</a></h3>
            </div>
            <strong>${escapeHtml(formatMoney(lineTotal))}</strong>
          </div>
          <p class="storefront-cart__meta">${escapeHtml(item.brand || "TECHM8")} ${item.compatibility ? `· ${escapeHtml(item.compatibility)}` : ""}</p>
          <div class="storefront-cart__controls">
            <label>
              <span>Qty</span>
              <input type="number" min="1" max="${escapeHtml(String(getCartItemMaxQuantity(item.slug)))}" value="${escapeHtml(String(item.qty))}" data-cart-qty="${escapeHtml(item.slug)}">
            </label>
            <span class="storefront-cart__price">${escapeHtml(formatMoney(item.price))} each</span>
            <button class="storefront-cart__remove" type="button" data-cart-remove="${escapeHtml(item.slug)}">Remove</button>
          </div>
        </div>
      </article>
    `;
    })
    .join("");
}

function renderCartSummary(target, items, options = {}) {
  if (!(target instanceof HTMLElement)) return;

  const subtotal = getCartSubtotal(items);
  const paymentProfile = options.paymentProfile || null;
  const shippingOption = options.shippingOption || null;
  const paymentFee =
    typeof options.paymentFeeOverride === "number"
      ? options.paymentFeeOverride
      : paymentProfile
        ? calculatePaymentFee(subtotal, paymentProfile)
        : 0;
  const shippingFee =
    typeof options.shippingFeeOverride === "number"
      ? options.shippingFeeOverride
      : shippingOption
        ? calculateShippingFee(subtotal, shippingOption)
        : 0;
  const itemCount = getCartCount(items);
  const total =
    typeof options.totalOverride === "number"
      ? options.totalOverride
      : subtotal + paymentFee + shippingFee;
  const shippingLabel = shippingOption ? "Shipping" : "Store pickup";
  const shippingValue = shippingOption
    ? shippingFee > 0
      ? formatMoney(shippingFee)
      : "Free"
    : "To be confirmed";
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
      <span>${escapeHtml(shippingLabel)}</span>
      <strong>${escapeHtml(shippingValue)}</strong>
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
  const cartWidget = target.parentElement?.querySelector("[data-zip-cart-widget]");
  if (cartWidget instanceof HTMLElement) {
    cartWidget.dataset.zipPrice = String(total);
    initZipMarketingAssets(target.parentElement);
  }
}

function selectRecommendedProducts(products, cartItems, limit = 5) {
  const safeProducts = Array.isArray(products) ? products.slice() : [];
  const cartSlugs = new Set(
    (Array.isArray(cartItems) ? cartItems : [])
      .map((item) => item.slug)
      .filter(Boolean),
  );
  const cartTerms = new Set();
  const latestProducts = safeProducts
    .slice()
    .sort(
      (left, right) =>
        (Number(left.catalog_index) || 0) - (Number(right.catalog_index) || 0),
    );

  (Array.isArray(cartItems) ? cartItems : []).forEach((item) => {
    const text = [item.name, item.category_name, item.compatibility, item.brand]
      .join(" ")
      .toLowerCase();
    if (/charger|adapter|magsafe|usb-c/.test(text)) cartTerms.add("power");
    if (/controller|dualsense|playstation|xbox|nintendo/.test(text))
      cartTerms.add("gaming");
    if (/case|glass|protector|cover/.test(text)) cartTerms.add("protection");
    if (/cable/.test(text)) cartTerms.add("cable");
  });

  const scored = safeProducts
    .filter((product) => product?.slug && !cartSlugs.has(product.slug))
    .map((product) => {
      const haystack = [
        product.name,
        product.category_name,
        product.compatibility,
        product.brand,
        product.short_description,
      ]
        .join(" ")
        .toLowerCase();
      let score = 0;
      if (
        cartTerms.has("power") &&
        /charger|adapter|magsafe|usb-c|cable/.test(haystack)
      )
        score += 3;
      if (
        cartTerms.has("gaming") &&
        /controller|playstation|xbox|gaming/.test(haystack)
      )
        score += 3;
      if (
        cartTerms.has("protection") &&
        /case|protector|glass|cover|charger|cable/.test(haystack)
      )
        score += 2;
      if (cartTerms.has("cable") && /charger|adapter|usb-c|plug/.test(haystack))
        score += 2;
      if (product.is_featured) score += 1;
      return { product, score };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        Number(right.product.is_featured) - Number(left.product.is_featured),
    );

  const related = scored
    .filter((item) => item.score > 0)
    .map((item) => item.product)
    .slice(0, limit);
  if (related.length >= limit) {
    return related;
  }

  const seen = new Set(related.map((item) => item.slug));
  latestProducts.forEach((product) => {
    if (
      !product?.slug ||
      seen.has(product.slug) ||
      cartSlugs.has(product.slug) ||
      related.length >= limit
    )
      return;
    related.push(product);
    seen.add(product.slug);
  });

  return related;
}

function renderRecommendedProducts(target, products, cartItems) {
  if (!(target instanceof HTMLElement)) return;
  const recommendations = selectRecommendedProducts(products, cartItems, 6);

  target.innerHTML = recommendations.length
    ? recommendations.map((product) => createCatalogCard(product)).join("")
    : `<article class="storefront-card storefront-card--empty"><div class="storefront-card__body"><span class="storefront-card__pill">No recommendations</span><h3>No extra products to suggest yet</h3><p>New catalog items will appear here automatically.</p></div></article>`;
}

function initCartPage() {
  const root = document.querySelector("[data-cart-page]");
  if (!(root instanceof HTMLElement)) return;

  const itemsTarget = root.querySelector("[data-cart-items]");
  const summaryTarget = root.querySelector("[data-cart-summary]");
  const recommendationsTarget = root.querySelector(
    "[data-cart-recommendations]",
  );
  const checkoutButtons = root.querySelectorAll("[data-cart-checkout]");
  const freightPostcode = root.querySelector("[data-freight-postcode]");
  const freightButton = root.querySelector("[data-freight-button]");
  const freightResults = root.querySelector("[data-freight-results]");
  if (
    !(itemsTarget instanceof HTMLElement) ||
    !(summaryTarget instanceof HTMLElement)
  )
    return;
  let catalogProducts = [];

  const renderFreightEstimate = () => {
    if (
      !(freightPostcode instanceof HTMLInputElement) ||
      !(freightResults instanceof HTMLElement)
    )
      return;
    const postcode = freightPostcode.value.replace(/\D/g, "").slice(0, 4);
    freightPostcode.value = postcode;
    if (postcode.length !== 4) {
      freightResults.hidden = false;
      freightResults.innerHTML = `<p class="cart-freight__error">Enter a valid 4 digit Australian postcode.</p>`;
      return;
    }
    freightResults.hidden = false;
    freightResults.innerHTML = `
      <div class="cart-freight__row"><span>Standard Delivery</span><strong>${escapeHtml(formatMoney(15))}</strong></div>
      <div class="cart-freight__row"><span>Express Delivery</span><strong>${escapeHtml(formatMoney(18))}</strong></div>
    `;
  };

  const render = () => {
    const items = loadCart();
    renderCartLineItems(itemsTarget, items);
    renderCartSummary(summaryTarget, items);
    if (
      recommendationsTarget instanceof HTMLElement &&
      catalogProducts.length
    ) {
      renderRecommendedProducts(recommendationsTarget, catalogProducts, items);
    }
    checkoutButtons.forEach((button) => {
      if (
        button instanceof HTMLAnchorElement ||
        button instanceof HTMLButtonElement
      ) {
        button.toggleAttribute("disabled", !items.length);
        if (button instanceof HTMLAnchorElement) {
          button.setAttribute("aria-disabled", items.length ? "false" : "true");
          button.href = items.length ? "checkout.html" : "cart.html";
        }
      }
    });
  };

  checkoutButtons.forEach((button) => {
    if (
      !(button instanceof HTMLAnchorElement) &&
      !(button instanceof HTMLButtonElement)
    ) {
      return;
    }

    button.addEventListener("click", () => {
      const items = loadCart();
      if (!items.length) {
        return;
      }

      trackGa4Event("begin_checkout", {
        currency: "AUD",
        value: Number(getGa4CartValue(items).toFixed(2)),
        items: buildGa4ItemsFromCart(items),
      });
    });
  });

  if (freightButton instanceof HTMLButtonElement) {
    freightButton.addEventListener("click", renderFreightEstimate);
  }
  if (freightPostcode instanceof HTMLInputElement) {
    freightPostcode.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        renderFreightEstimate();
      }
    });
  }

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
        bindCartButtons(recommendationsTarget, () => catalogProducts, {
          confirmText: "Added",
        });
      }
      render();
    })
    .catch(() => {
      catalogProducts = getFallbackCatalogProducts();
      if (recommendationsTarget instanceof HTMLElement) {
        bindCartButtons(recommendationsTarget, () => catalogProducts, {
          confirmText: "Added",
        });
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
  const sidebarItemsTarget = root.querySelector(
    "[data-checkout-sidebar-items]",
  );
  const messageTarget = root.querySelector("[data-checkout-message]");
  const progressSteps = Array.from(
    root.querySelectorAll("[data-checkout-progress-step]"),
  );
  const paymentOptionsTarget = root.querySelector("[data-payment-options]");
  const paymentMethodField = root.querySelector("[data-payment-method]");
  const shippingOptionsTarget = root.querySelector("[data-shipping-options]");
  const shippingServiceField = root.querySelector("[data-shipping-service]");
  const storeField = root.querySelector("[data-checkout-store]");
  const warehouseOption = root.querySelector(
    "[data-checkout-warehouse-option]",
  );
  const storeDetailTarget = root.querySelector("[data-checkout-store-detail]");
  const stepTwo = root.querySelector("[data-checkout-step-two]");
  const shippingSection = root.querySelector("[data-checkout-shipping]");
  const shippingFields = Array.from(
    root.querySelectorAll("[data-checkout-shipping-field]"),
  );
  const zipBillingSection = root.querySelector("[data-zip-billing]");
  const zipBillingFields = Array.from(
    root.querySelectorAll("[data-zip-billing-field]"),
  );
  const accountSetup = root.querySelector("[data-checkout-account-setup]");
  const passwordField = root.querySelector("[data-checkout-password]");
  const passwordConfirmField = root.querySelector(
    "[data-checkout-password-confirm]",
  );
  const passwordMatchMessage = root.querySelector(
    "[data-checkout-password-match]",
  );
  const authStep = root.querySelector("[data-checkout-auth-step]");
  const authStatus = root.querySelector("[data-checkout-auth-status]");
  const authPanels = root.querySelector("[data-checkout-auth-panels]");
  const loginMessageTarget = root.querySelector(
    "[data-checkout-login-message]",
  );
  const registerMessageTarget = root.querySelector(
    "[data-checkout-register-message]",
  );
  const loginEmailField = root.querySelector("[data-checkout-login-email]");
  const loginPasswordField = root.querySelector(
    "[data-checkout-login-password]",
  );
  const loginButton = root.querySelector("[data-checkout-login-button]");
  const registerButton = root.querySelector("[data-checkout-register-button]");
  const googleButton = root.querySelector("[data-checkout-google-button]");
  const registerFirstNameField = root.querySelector(
    "[data-checkout-register-first-name]",
  );
  const registerLastNameField = root.querySelector(
    "[data-checkout-register-last-name]",
  );
  const registerPhoneField = root.querySelector(
    "[data-checkout-register-phone]",
  );
  const registerEmailField = root.querySelector(
    "[data-checkout-register-email]",
  );
  const registerPasswordField = root.querySelector(
    "[data-checkout-register-password]",
  );
  const registerPasswordConfirmField = root.querySelector(
    "[data-checkout-register-password-confirm]",
  );
  const registerPasswordMatchMessage = root.querySelector(
    "[data-checkout-register-password-match]",
  );
  const deliveryStep = root.querySelector("[data-checkout-delivery-step]");
  const deliveryContinueButton = root.querySelector(
    "[data-checkout-delivery-continue]",
  );
  const backToDeliveryButton = root.querySelector(
    "[data-checkout-back-to-delivery]",
  );
  const pickupPanel = root.querySelector("[data-checkout-pickup-panel]");
  const gatedCheckoutBlocks = Array.from(
    root.querySelectorAll("[data-checkout-gated]"),
  );
  const fulfillmentFields = Array.from(
    root.querySelectorAll("[data-checkout-fulfillment]"),
  );
  const fulfillmentCards = Array.from(
    root.querySelectorAll("[data-checkout-fulfillment-card]"),
  );
  if (
    !(form instanceof HTMLFormElement) ||
    !(summaryTarget instanceof HTMLElement) ||
    !(sidebarItemsTarget instanceof HTMLElement)
  )
    return;
  const submitButton = form.querySelector('button[type="submit"]');
  const paymentProfiles = [];
  const checkoutParams = new URLSearchParams(window.location.search);
  const paymentReturnState = String(
    checkoutParams.get("payment") || "",
  ).trim();
  const isPaymentCancelled = [
    "cancelled",
    "zip_declined",
    "zip_referred",
    "zip_cancelled",
    "zip_failed",
    "paypal_cancelled",
    "paypal_failed",
  ].includes(paymentReturnState);
  let activeAuthState = null;
  let authChecked = false;
  let checkoutStep = "auth";
  let selectedFulfillment = "pickup";
  const supabaseAnonKey = window.TECHM8_CONFIG?.supabaseAnonKey || "";

  const setCheckoutMessage = (text, tone = "error") => {
    if (!(messageTarget instanceof HTMLElement)) return;
    if (!text) {
      messageTarget.hidden = true;
      messageTarget.textContent = "";
      messageTarget.className = "booking-message";
      return;
    }
    messageTarget.hidden = false;
    messageTarget.className = `booking-message is-${tone}`;
    messageTarget.textContent = text;
  };

  const setPanelMessage = (target, text, tone = "success") => {
    if (!(target instanceof HTMLElement)) return;
    if (!text) {
      target.hidden = true;
      target.textContent = "";
      target.className = "booking-message";
      return;
    }
    target.hidden = false;
    target.className = `booking-message is-${tone}`;
    target.textContent = text;
  };

  const getFieldErrorElement = (field) => {
    if (!(field instanceof HTMLElement)) return null;
    const fieldName = String(field.getAttribute("name") || "").trim();
    if (!fieldName) return null;
    const wrapper = field.closest(
      "label, .storefront-checkout__delivery-select",
    );
    if (!(wrapper instanceof HTMLElement)) return null;

    let errorElement = wrapper.querySelector(
      `[data-field-error="${fieldName}"]`,
    );
    if (!(errorElement instanceof HTMLElement)) {
      errorElement = document.createElement("p");
      errorElement.className = "storefront-field-error";
      errorElement.hidden = true;
      errorElement.setAttribute("data-field-error", fieldName);
      wrapper.appendChild(errorElement);
    }

    return errorElement;
  };

  const clearFieldError = (field) => {
    if (
      !(
        field instanceof HTMLInputElement ||
        field instanceof HTMLSelectElement ||
        field instanceof HTMLTextAreaElement
      )
    ) {
      return;
    }
    field.classList.remove("is-invalid");
    field.removeAttribute("aria-invalid");
    field.setCustomValidity("");
    const errorElement = getFieldErrorElement(field);
    if (errorElement instanceof HTMLElement) {
      errorElement.hidden = true;
      errorElement.textContent = "";
    }
  };

  const setFieldError = (field, message) => {
    if (
      !(
        field instanceof HTMLInputElement ||
        field instanceof HTMLSelectElement ||
        field instanceof HTMLTextAreaElement
      )
    ) {
      return false;
    }
    field.classList.add("is-invalid");
    field.setAttribute("aria-invalid", "true");
    field.setCustomValidity(message);
    const errorElement = getFieldErrorElement(field);
    if (errorElement instanceof HTMLElement) {
      errorElement.hidden = false;
      errorElement.textContent = message;
    }
    return true;
  };

  const clearAllFieldErrors = () => {
    form.querySelectorAll("input, select, textarea").forEach((field) => {
      clearFieldError(field);
    });
  };

  const invalidateField = (field, message, topMessage = message) => {
    setCheckoutMessage(topMessage, "error");
    if (setFieldError(field, message) && typeof field.focus === "function") {
      field.focus();
    }
    return false;
  };

  const requireField = (field, message, topMessage = message) => {
    if (
      !(
        field instanceof HTMLInputElement ||
        field instanceof HTMLSelectElement ||
        field instanceof HTMLTextAreaElement
      )
    ) {
      return true;
    }
    if (String(field.value || "").trim()) {
      clearFieldError(field);
      return true;
    }
    return invalidateField(field, message, topMessage);
  };

  const updatePasswordPairState = (
    passwordInput,
    confirmInput,
    matchMessage,
  ) => {
    if (
      !(passwordInput instanceof HTMLInputElement) ||
      !(confirmInput instanceof HTMLInputElement)
    ) {
      return true;
    }

    const password = String(passwordInput.value || "");
    const confirmPassword = String(confirmInput.value || "");
    const passwordMeetsRule = isValidAccountPassword(password);

    if (password && !passwordMeetsRule) {
      passwordInput.classList.add("is-invalid");
      passwordInput.setAttribute("aria-invalid", "true");
      passwordInput.setCustomValidity(
        "Password must include English letters and numbers.",
      );
    } else {
      clearFieldError(passwordInput);
    }

    if (!(matchMessage instanceof HTMLElement)) {
      return passwordMeetsRule && password === confirmPassword;
    }

    matchMessage.classList.remove("is-error", "is-success");

    if (!confirmPassword) {
      matchMessage.hidden = true;
      matchMessage.textContent = "";
      clearFieldError(confirmInput);
      return passwordMeetsRule;
    }

    if (password === confirmPassword && passwordMeetsRule) {
      matchMessage.hidden = false;
      matchMessage.textContent = "Passwords match.";
      matchMessage.classList.add("is-success");
      clearFieldError(confirmInput);
      return true;
    }

    matchMessage.hidden = false;
    matchMessage.textContent =
      password === confirmPassword
        ? "Password must include English letters and numbers."
        : "Passwords do not match.";
    matchMessage.classList.add("is-error");
    confirmInput.classList.add("is-invalid");
    confirmInput.setAttribute("aria-invalid", "true");
    confirmInput.setCustomValidity(matchMessage.textContent);
    return false;
  };

  const getContactFields = () => ({
    firstNameField: form.elements.namedItem("first_name"),
    lastNameField: form.elements.namedItem("last_name"),
    phoneField: form.elements.namedItem("phone"),
    emailField: form.elements.namedItem("email"),
  });

  const setCheckoutContactFields = ({
    firstName = "",
    lastName = "",
    phone = "",
    email = "",
  } = {}) => {
    const { firstNameField, lastNameField, phoneField, emailField } =
      getContactFields();
    if (firstNameField instanceof HTMLInputElement) {
      firstNameField.value = String(firstName || "").trim();
    }
    if (lastNameField instanceof HTMLInputElement) {
      lastNameField.value = String(lastName || "").trim();
    }
    if (phoneField instanceof HTMLInputElement) {
      phoneField.value = String(phone || "").trim();
    }
    if (emailField instanceof HTMLInputElement) {
      emailField.value = String(email || "")
        .trim()
        .toLowerCase();
    }
  };

  const fillMissingCheckoutContact = () => {
    const { firstNameField, lastNameField, phoneField, emailField } =
      getContactFields();
    const profile = activeAuthState?.profile || null;
    const user = activeAuthState?.user || null;
    const { firstName, lastName } = splitProfileName(profile, user);
    const fallbackEmail = String(profile?.email || user?.email || "").trim();
    const fallbackPhone = String(
      profile?.phone || user?.user_metadata?.phone || "",
    ).trim();
    const shippingRecipientField = form.elements.namedItem("recipient_name");
    const shippingNameParts =
      shippingRecipientField instanceof HTMLInputElement
        ? String(shippingRecipientField.value || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
        : [];

    if (
      firstNameField instanceof HTMLInputElement &&
      !String(firstNameField.value || "").trim()
    ) {
      firstNameField.value = firstName || shippingNameParts[0] || "";
    }
    if (
      lastNameField instanceof HTMLInputElement &&
      !String(lastNameField.value || "").trim()
    ) {
      lastNameField.value =
        lastName || shippingNameParts.slice(1).join(" ") || "";
    }
    if (
      phoneField instanceof HTMLInputElement &&
      !String(phoneField.value || "").trim()
    ) {
      const shippingPhoneField = form.elements.namedItem("shipping_phone");
      phoneField.value =
        fallbackPhone ||
        (shippingPhoneField instanceof HTMLInputElement
          ? String(shippingPhoneField.value || "").trim()
          : "");
    }
    if (
      emailField instanceof HTMLInputElement &&
      !String(emailField.value || "").trim()
    ) {
      const shippingEmailField = form.elements.namedItem("shipping_email");
      emailField.value =
        fallbackEmail ||
        (shippingEmailField instanceof HTMLInputElement
          ? String(shippingEmailField.value || "")
              .trim()
              .toLowerCase()
          : "");
    }
  };

  const fillMissingShippingContact = () => {
    const { firstNameField, lastNameField, phoneField, emailField } =
      getContactFields();
    const recipientField = form.elements.namedItem("recipient_name");
    const shippingPhoneField = form.elements.namedItem("shipping_phone");
    const shippingEmailField = form.elements.namedItem("shipping_email");
    const fullName = [
      firstNameField instanceof HTMLInputElement ? firstNameField.value : "",
      lastNameField instanceof HTMLInputElement ? lastNameField.value : "",
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" ");

    if (
      recipientField instanceof HTMLInputElement &&
      !String(recipientField.value || "").trim()
    ) {
      recipientField.value = fullName;
    }
    if (
      shippingPhoneField instanceof HTMLInputElement &&
      !String(shippingPhoneField.value || "").trim() &&
      phoneField instanceof HTMLInputElement
    ) {
      shippingPhoneField.value = String(phoneField.value || "").trim();
    }
    if (
      shippingEmailField instanceof HTMLInputElement &&
      !String(shippingEmailField.value || "").trim() &&
      emailField instanceof HTMLInputElement
    ) {
      shippingEmailField.value = String(emailField.value || "")
        .trim()
        .toLowerCase();
    }
  };

  const fillMissingZipBillingAddress = () => {
    const profile = activeAuthState?.profile || {};
    const isDelivery = isWarehouseDispatchSelected();
    const values = {
      billing_address_line_1: isDelivery
        ? form.elements.namedItem("address_line_1")?.value
        : profile.address_line_1,
      billing_address_line_2: isDelivery
        ? form.elements.namedItem("address_line_2")?.value
        : profile.address_line_2,
      billing_suburb: isDelivery
        ? form.elements.namedItem("suburb")?.value
        : profile.suburb,
      billing_postcode: isDelivery
        ? form.elements.namedItem("postcode")?.value
        : profile.postcode,
      billing_state: isDelivery
        ? form.elements.namedItem("state")?.value
        : profile.state,
      billing_country_code: "AU",
    };

    Object.entries(values).forEach(([name, value]) => {
      const field = form.elements.namedItem(name);
      if (
        (field instanceof HTMLInputElement ||
          field instanceof HTMLSelectElement) &&
        !String(field.value || "").trim()
      ) {
        field.value = String(value || "").trim();
      }
    });
  };

  const getSelectedPaymentProfile = () => {
    const selectedCode =
      paymentMethodField instanceof HTMLInputElement
        ? String(paymentMethodField.value || "pay_in_store").trim()
        : "pay_in_store";
    return (
      paymentProfiles.find((profile) => profile.code === selectedCode) || null
    );
  };

  const getSelectedShippingOption = () => {
    const selectedCode =
      shippingServiceField instanceof HTMLInputElement
        ? String(shippingServiceField.value || "standard_auspost").trim()
        : "standard_auspost";
    return getCheckoutShippingOption(selectedCode);
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
      if (!profile || !profile.code || profile.is_enabled === false)
        return false;
      if (isWarehouseDispatch) {
        return profile.provider !== "manual";
      }
      return true;
    });
  };

  const isWarehouseDispatchSelected = () => {
    if (!(storeField instanceof HTMLSelectElement)) return false;
    return (
      selectedFulfillment === "delivery" ||
      String(storeField.value || "").trim() === "warehouse-dispatch"
    );
  };

  const syncFulfillmentState = () => {
    selectedFulfillment =
      fulfillmentFields.find(
        (field) => field instanceof HTMLInputElement && field.checked,
      )?.value || "pickup";
    const isDelivery = selectedFulfillment === "delivery";

    fulfillmentCards.forEach((card) => {
      if (!(card instanceof HTMLElement)) return;
      const input = card.querySelector("[data-checkout-fulfillment]");
      card.classList.toggle(
        "is-selected",
        input instanceof HTMLInputElement && input.checked,
      );
    });

    if (warehouseOption instanceof HTMLOptionElement) {
      warehouseOption.hidden = !isDelivery;
    }

    if (storeField instanceof HTMLSelectElement) {
      if (isDelivery) {
        storeField.value = "warehouse-dispatch";
        storeField.required = false;
      } else {
        storeField.required = true;
        if (String(storeField.value || "").trim() === "warehouse-dispatch") {
          storeField.value = "";
        }
      }
    }

    if (pickupPanel instanceof HTMLElement) {
      pickupPanel.hidden = isDelivery;
    }
  };

  const renderStoreSelectionDetail = () => {
    if (
      !(storeDetailTarget instanceof HTMLElement) ||
      !(storeField instanceof HTMLSelectElement)
    )
      return;
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
        ${detail.hours ? `<p><strong>Opening hours</strong><span>${escapeHtml(detail.hours)}</span></p>` : ""}
      </div>
      <div class="storefront-checkout__delivery-actions">
        ${detail.mapUrl ? `<a class="button button--ghost" href="${escapeHtml(detail.mapUrl)}" target="_blank" rel="noopener">Open in Maps</a>` : ""}
        ${detail.pageUrl ? `<a class="button button--secondary" href="${escapeHtml(detail.pageUrl)}">View store page</a>` : ""}
      </div>
    `;
  };

  const renderCheckoutSidebarItems = (items) => {
    if (!(sidebarItemsTarget instanceof HTMLElement)) return;
    if (!items.length) {
      sidebarItemsTarget.innerHTML = `
        <article class="storefront-summary-item storefront-summary-item--empty">
          <p>Your cart is empty.</p>
        </article>
      `;
      return;
    }

    sidebarItemsTarget.innerHTML = items
      .map((item) => {
        const lineTotal = (Number(item.price) || 0) * (Number(item.qty) || 0);
        return `
          <article class="storefront-summary-item">
            <a class="storefront-summary-item__media" href="${getProductPageHref(item.slug)}">
              ${
                item.image_url
                  ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}" loading="lazy">`
                  : `<span>TECHM8</span>`
              }
            </a>
            <div class="storefront-summary-item__body">
              <p>Stock level: <strong>In stock</strong></p>
              <h3><a href="${getProductPageHref(item.slug)}">${escapeHtml(item.name)}</a></h3>
              <div class="storefront-summary-item__meta">
                <span>QTY: ${escapeHtml(String(item.qty || 1))}</span>
                <strong>${escapeHtml(formatMoney(lineTotal))}</strong>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  };

  const syncCheckoutProgress = () => {
    const order = ["auth", "delivery", "payment"];
    const activeIndex = Math.max(0, order.indexOf(checkoutStep));
    progressSteps.forEach((step) => {
      if (!(step instanceof HTMLElement)) return;
      const stepName = String(
        step.getAttribute("data-checkout-progress-step") || "",
      );
      const stepIndex = order.indexOf(stepName);
      step.classList.toggle("is-active", stepIndex === activeIndex);
      step.classList.toggle(
        "is-complete",
        stepIndex > -1 && stepIndex < activeIndex,
      );
    });
  };

  const validateCheckoutContactDetails = ({ focus = true } = {}) => {
    const { firstNameField, lastNameField, phoneField, emailField } =
      getContactFields();
    const requiredFields = [
      [firstNameField, "Enter your first name."],
      [lastNameField, "Enter your last name."],
      [phoneField, "Enter your phone number."],
      [emailField, "Your account email is missing."],
    ];

    for (const [field, message] of requiredFields) {
      if (
        !(
          field instanceof HTMLInputElement ||
          field instanceof HTMLSelectElement ||
          field instanceof HTMLTextAreaElement
        )
      ) {
        continue;
      }
      if (!String(field.value || "").trim()) {
        if (!focus) return false;
        return invalidateField(
          field,
          message,
          "Please complete your contact details before payment.",
        );
      }
    }

    const phone =
      phoneField instanceof HTMLInputElement
        ? String(phoneField.value || "").trim()
        : "";
    if (!isValidAustralianPhone(phone)) {
      if (!focus) return false;
      return invalidateField(
        phoneField,
        "Enter a valid Australian number, for example 0412 345 678 or +61 412 345 678.",
        "Please enter a valid Australian phone number before payment.",
      );
    }

    const email =
      emailField instanceof HTMLInputElement
        ? String(emailField.value || "")
            .trim()
            .toLowerCase()
        : "";
    if (!isValidEmailAddress(email)) {
      if (!focus) return false;
      return invalidateField(
        emailField,
        "Your account email is not valid. Sign out and log in again.",
        "Your account email could not be confirmed.",
      );
    }

    return true;
  };

  const validateDeliveryStep = ({ focus = true } = {}) => {
    if (focus) {
      clearAllFieldErrors();
    }
    fillMissingCheckoutContact();
    if (!validateCheckoutContactDetails({ focus })) {
      return false;
    }
    fillMissingShippingContact();
    const storeSelectField = form.elements.namedItem("store_slug");
    const isWarehouseDispatch = isWarehouseDispatchSelected();

    if (!storeSelectField || !(storeSelectField instanceof HTMLSelectElement)) {
      return false;
    }

    if (!String(storeSelectField.value || "").trim()) {
      if (!focus) return false;
      return invalidateField(
        storeSelectField,
        "Select a pickup store or delivery option.",
        "Please select Click & Collect store or Delivery.",
      );
    }

    if (!isWarehouseDispatch) {
      return true;
    }

    const requiredShippingFields = [
      ["recipient_name", "Enter the recipient name."],
      ["address_line_1", "Enter the delivery address."],
      ["suburb", "Enter the suburb."],
      ["postcode", "Enter the 4-digit postcode."],
      ["state", "Select a state."],
    ];

    for (const [fieldName, message] of requiredShippingFields) {
      const field = form.elements.namedItem(fieldName);
      if (
        !(
          field instanceof HTMLInputElement ||
          field instanceof HTMLSelectElement ||
          field instanceof HTMLTextAreaElement
        )
      ) {
        continue;
      }
      if (!String(field.value || "").trim()) {
        if (!focus) return false;
        return invalidateField(
          field,
          message,
          "Delivery requires a complete shipping address.",
        );
      }
    }

    const postcodeField = form.elements.namedItem("postcode");
    const postcodeValue =
      postcodeField instanceof HTMLInputElement
        ? String(postcodeField.value || "").trim()
        : "";
    if (!/^\d{4}$/.test(postcodeValue)) {
      if (!focus) return false;
      return invalidateField(
        postcodeField,
        "Enter a valid 4-digit Australian postcode.",
        "Please enter a valid 4-digit Australian postcode.",
      );
    }

    const shippingPhoneField = form.elements.namedItem("shipping_phone");
    const shippingPhone =
      shippingPhoneField instanceof HTMLInputElement
        ? String(shippingPhoneField.value || "").trim()
        : "";
    if (shippingPhone && !isValidAustralianPhone(shippingPhone)) {
      if (!focus) return false;
      return invalidateField(
        shippingPhoneField,
        "Enter a valid Australian shipping phone number.",
        "Please enter a valid Australian shipping phone number.",
      );
    }

    const shippingEmailField = form.elements.namedItem("shipping_email");
    const shippingEmail =
      shippingEmailField instanceof HTMLInputElement
        ? String(shippingEmailField.value || "").trim()
        : "";
    if (shippingEmail && !isValidEmailAddress(shippingEmail)) {
      if (!focus) return false;
      return invalidateField(
        shippingEmailField,
        "Enter a valid shipping email address.",
        "Please enter a valid shipping email address.",
      );
    }

    return true;
  };

  const syncCheckoutMode = () => {
    syncFulfillmentState();
    const storeSlug =
      storeField instanceof HTMLSelectElement
        ? String(storeField.value || "").trim()
        : "";
    const isWarehouseDispatch = isWarehouseDispatchSelected();
    const isAuthenticated = Boolean(activeAuthState?.user);
    if (!authChecked || !isAuthenticated) {
      checkoutStep = "auth";
    } else if (checkoutStep === "auth") {
      checkoutStep = "delivery";
    }

    const deliveryReady = validateDeliveryStep({ focus: false });
    if (checkoutStep === "payment" && !deliveryReady) {
      checkoutStep = "delivery";
    }

    const showAuthStep = checkoutStep === "auth";
    const showDeliveryStep = isAuthenticated && checkoutStep === "delivery";
    const showStepTwo =
      isAuthenticated &&
      checkoutStep === "payment" &&
      Boolean(storeSlug) &&
      deliveryReady;
    syncCheckoutProgress();
    const visibleProfiles = getVisiblePaymentProfiles();
    let selectedProfile = getSelectedPaymentProfile();

    if (
      paymentMethodField instanceof HTMLInputElement &&
      visibleProfiles.length
    ) {
      const selectedCode = selectedProfile?.code || "";
      if (!visibleProfiles.some((profile) => profile.code === selectedCode)) {
        const fallbackProfile = isWarehouseDispatch
          ? visibleProfiles[0]
          : visibleProfiles.find(
              (profile) => profile.code === "pay_in_store",
            ) || visibleProfiles[0];
        paymentMethodField.value = fallbackProfile ? fallbackProfile.code : "";
        selectedProfile = getSelectedPaymentProfile();
      }
    }

    const showZipBilling = showStepTwo && selectedProfile?.provider === "zip";
    if (zipBillingSection instanceof HTMLElement) {
      zipBillingSection.hidden = !showZipBilling;
    }
    zipBillingFields.forEach((field) => {
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement))
        return;
      field.required =
        showZipBilling &&
        field.name !== "billing_address_line_2" &&
        field.name !== "billing_country_code";
    });
    if (showZipBilling) fillMissingZipBillingAddress();

    if (stepTwo instanceof HTMLElement) {
      stepTwo.hidden = !showStepTwo;
    }

    if (deliveryStep instanceof HTMLElement) {
      deliveryStep.hidden = !showDeliveryStep;
    }

    if (authStep instanceof HTMLElement) {
      authStep.hidden = !showAuthStep;
    }

    if (authStep instanceof HTMLElement) {
      authStep.classList.toggle("is-complete", showDeliveryStep);
    }

    if (authPanels instanceof HTMLElement) {
      authPanels.hidden = !showAuthStep;
    }

    if (authStatus instanceof HTMLElement) {
      authStatus.hidden = showAuthStep;
      if (!showAuthStep && isAuthenticated) {
        const email = String(activeAuthState?.user?.email || "").trim();
        authStatus.innerHTML = `<strong>Signed in</strong><span>${escapeHtml(email || "TECHM8 customer")}</span>`;
      } else {
        authStatus.innerHTML = "";
      }
    }

    gatedCheckoutBlocks.forEach((block) => {
      if (block instanceof HTMLElement) {
        block.hidden = !showStepTwo;
      }
    });

    const showShipping = isWarehouseDispatch;
    if (shippingSection instanceof HTMLElement) {
      shippingSection.hidden = !showShipping;
    }

    shippingFields.forEach((field) => {
      if (
        !(
          field instanceof HTMLInputElement ||
          field instanceof HTMLSelectElement ||
          field instanceof HTMLTextAreaElement
        )
      ) {
        return;
      }
      const fieldName = String(field.getAttribute("name") || "").trim();
      const isRequiredShippingField = [
        "recipient_name",
        "address_line_1",
        "suburb",
        "postcode",
        "state",
      ].includes(fieldName);
      field.required = showShipping && isRequiredShippingField;
      if (
        !showShipping &&
        field instanceof HTMLInputElement &&
        field.type !== "hidden"
      ) {
        clearFieldError(field);
      }
    });
  };

  const formatFeeRule = (profile) => {
    if (!profile) return "";
    if (profile.code === "paypal") return "No surcharge";
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
        {
          label: "Mastercard",
          className: "storefront-payment-option__badge--mc",
        },
        { label: "AMEX", className: "storefront-payment-option__badge--amex" },
        { label: "JCB", className: "storefront-payment-option__badge--jcb" },
        {
          label: "Apple Pay",
          className: "storefront-payment-option__badge--apple",
        },
        {
          label: "Google Pay",
          className: "storefront-payment-option__badge--google",
        },
        {
          label: "Link",
          className: "storefront-payment-option__badge--link",
        },
      ];
    }
    if (profile.code === "afterpay_clearpay") {
      return [
        {
          label: "Afterpay",
          className: "storefront-payment-option__badge--afterpay",
        },
      ];
    }
    if (profile.code === "zip") {
      return [
        {
          label: "zip",
          className: "storefront-payment-option__badge--zip",
        },
      ];
    }
    if (profile.code === "klarna") {
      return [
        {
          label: "Klarna",
          className: "storefront-payment-option__badge--klarna",
        },
      ];
    }
    if (profile.code === "wechat_pay") {
      return [
        {
          label: "WeChat Pay",
          className: "storefront-payment-option__badge--wechat",
        },
      ];
    }
    if (profile.code === "paypal") {
      return [
        {
          label: "PayPal",
          className: "storefront-payment-option__badge--paypal",
        },
      ];
    }
    return [
      {
        label: "In-store",
        className: "storefront-payment-option__badge--manual",
      },
    ];
  };

  const renderPaymentOptions = (subtotal) => {
    if (
      !(paymentOptionsTarget instanceof HTMLElement) ||
      !(paymentMethodField instanceof HTMLInputElement)
    )
      return;
    const visibleProfiles = getVisiblePaymentProfiles();
    const currentCode = String(paymentMethodField.value || "").trim();
    if (!visibleProfiles.some((profile) => profile.code === currentCode)) {
      const fallbackProfile =
        visibleProfiles.find((profile) => profile.code === "pay_in_store") ||
        visibleProfiles[0] ||
        null;
      paymentMethodField.value = fallbackProfile ? fallbackProfile.code : "";
    }

    paymentOptionsTarget.innerHTML = visibleProfiles
      .map((profile) => {
        const badges = getPaymentBadges(profile)
          .map((badge) => {
            return `<span class="storefront-payment-option__badge ${badge.className}">${escapeHtml(badge.label)}</span>`;
          })
          .join("");
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
          </span>
        </button>
      `;
      })
      .join("");
  };

  const renderShippingOptions = (subtotal) => {
    if (
      !(shippingOptionsTarget instanceof HTMLElement) ||
      !(shippingServiceField instanceof HTMLInputElement)
    )
      return;
    if (!isWarehouseDispatchSelected()) {
      shippingOptionsTarget.innerHTML = "";
      return;
    }

    const currentOption = getSelectedShippingOption();
    shippingOptionsTarget.innerHTML = CHECKOUT_SHIPPING_OPTIONS.map(
      (option) => {
        const fee = calculateShippingFee(subtotal, option);
        const isSelected = currentOption.code === option.code;
        return `
        <button
          class="storefront-payment-option storefront-shipping-option ${isSelected ? "is-selected" : ""}"
          type="button"
          data-shipping-option="${escapeHtml(option.code)}"
          aria-pressed="${isSelected ? "true" : "false"}"
        >
          <span class="storefront-payment-option__radio" aria-hidden="true"></span>
          <span class="storefront-payment-option__body">
            <span class="storefront-payment-option__top">
              <strong class="storefront-payment-option__title">${escapeHtml(option.label)}</strong>
              <span class="storefront-payment-option__fee">${escapeHtml(option.deliveryTime)}</span>
            </span>
            <span class="storefront-payment-option__description">Free shipping over ${escapeHtml(formatMoney(option.freeOver))}</span>
          </span>
          <span class="storefront-payment-option__estimate">
            <strong>${escapeHtml(fee > 0 ? formatMoney(fee) : "Free")}</strong>
            <span>Shipping fee</span>
          </span>
        </button>
      `;
      },
    ).join("");
  };

  const renderSuccessState = (payload) => {
    const successShippingOption = payload.shipping_service_code
      ? getCheckoutShippingOption(payload.shipping_service_code)
      : null;
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
                  <span>${escapeHtml(payload.payment_method_label || "Pay in store")}</span>
                </div>
                <div class="storefront-success__item">
                  <strong>Payment fee</strong>
                  <span>${escapeHtml(formatMoney(payload.payment_fee_amount || 0))}</span>
                </div>
                <div class="storefront-success__item">
                  <strong>Shipping</strong>
                  <span>${escapeHtml(successShippingOption ? `${successShippingOption.label} (${formatMoney(payload.shipping_fee_amount || 0)})` : "Store pickup")}</span>
                </div>
              </div>
              <div class="storefront-success__actions">
                <a class="button button--primary" href="/shop.html">Continue shopping</a>
                <a class="button button--ghost" href="/stores.html">Find a store</a>
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

    const successItemsTarget = root.querySelector(
      "[data-checkout-success-items]",
    );
    const successSummaryTarget = root.querySelector(
      "[data-checkout-success-summary]",
    );
    renderCartLineItems(successItemsTarget, payload.items || []);
    renderCartSummary(successSummaryTarget, payload.items || [], {
      paymentProfile: payload.payment_method_code
        ? paymentProfiles.find(
            (profile) => profile.code === payload.payment_method_code,
          ) || null
        : null,
      shippingOption: successShippingOption,
      paymentFeeOverride: Number(payload.payment_fee_amount ?? 0) || 0,
      shippingFeeOverride: Number(payload.shipping_fee_amount ?? 0) || 0,
      totalOverride: Number(payload.total_amount ?? 0) || 0,
    });
  };

  const render = () => {
    const items = loadCart();
    syncFulfillmentState();
    const subtotal = getCartSubtotal(items);
    const shippingOption = isWarehouseDispatchSelected()
      ? getSelectedShippingOption()
      : null;
    renderStoreSelectionDetail();
    renderPaymentOptions(subtotal);
    renderShippingOptions(subtotal);
    renderCheckoutSidebarItems(items);
    renderCartSummary(summaryTarget, items, {
      paymentProfile: getSelectedPaymentProfile(),
      shippingOption,
    });
    syncCheckoutMode();
    syncAccountSetup();
    if (items.length && !isPaymentCancelled) {
      setCheckoutMessage("");
    }
    if (submitButton instanceof HTMLButtonElement) {
      const isAuthenticated = Boolean(activeAuthState?.user);
      const hasStoreSelection =
        storeField instanceof HTMLSelectElement &&
        Boolean(String(storeField.value || "").trim());
      submitButton.disabled =
        !items.length ||
        !hasStoreSelection ||
        !isAuthenticated ||
        checkoutStep !== "payment";
      submitButton.textContent = items.length
        ? isAuthenticated
          ? getSelectedPaymentProfile()?.code === "zip"
            ? "Continue to Zip"
            : getSelectedPaymentProfile()?.provider === "paypal"
              ? "Continue to PayPal"
              : "Submit order request"
          : "Sign in before checkout"
        : "Add items before checkout";
    }
  };

  const applyAccountPrefill = async () => {
    activeAuthState = await prefillCustomerContactForm(form, {
      includeStore: true,
    });
    if (!activeAuthState) {
      activeAuthState = await getCurrentAuthState();
    }
    authChecked = true;
  };

  const syncAccountSetup = () => {
    if (accountSetup instanceof HTMLElement) {
      accountSetup.hidden = true;
    }
    if (passwordField instanceof HTMLInputElement) {
      passwordField.required = false;
      passwordField.value = "";
      passwordField.setCustomValidity("");
    }
    if (passwordConfirmField instanceof HTMLInputElement) {
      passwordConfirmField.required = false;
      passwordConfirmField.value = "";
      passwordConfirmField.setCustomValidity("");
    }
  };

  const completeCheckoutAuth = async (nextAuthState, successMessage = "") => {
    activeAuthState = nextAuthState;
    authChecked = true;
    checkoutStep = "delivery";
    await applyAccountPrefill();
    syncAccountSetup();
    setPanelMessage(loginMessageTarget, "");
    setPanelMessage(registerMessageTarget, "");
    if (successMessage) {
      setCheckoutMessage(successMessage, "success");
    }
    render();
  };

  form.addEventListener("input", (event) => {
    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      )
    ) {
      return;
    }
    clearFieldError(target);
    if (
      checkoutStep === "payment" &&
      target.hasAttribute("data-checkout-shipping-field")
    ) {
      checkoutStep = "delivery";
      render();
    }
  });

  form.addEventListener("change", (event) => {
    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      )
    ) {
      return;
    }
    clearFieldError(target);
    if (
      checkoutStep === "payment" &&
      target.hasAttribute("data-checkout-shipping-field")
    ) {
      checkoutStep = "delivery";
      render();
    }
  });

  if (
    loginButton instanceof HTMLButtonElement &&
    loginEmailField instanceof HTMLInputElement &&
    loginPasswordField instanceof HTMLInputElement
  ) {
    loginButton.addEventListener("click", async () => {
      const email = String(loginEmailField.value || "")
        .trim()
        .toLowerCase();
      const password = String(loginPasswordField.value || "");

      if (!isValidEmailAddress(email)) {
        setPanelMessage(
          loginMessageTarget,
          "Enter a valid email address.",
          "error",
        );
        loginEmailField.focus();
        return;
      }
      if (!password) {
        setPanelMessage(loginMessageTarget, "Enter your password.", "error");
        loginPasswordField.focus();
        return;
      }

      try {
        loginButton.disabled = true;
        loginButton.textContent = "Logging in...";
        setPanelMessage(loginMessageTarget, "");
        const authState = await getCurrentAuthState();
        if (!authState?.supabase) {
          throw new Error("Account login is not available right now.");
        }
        const { data, error } =
          await authState.supabase.auth.signInWithPassword({
            email,
            password,
          });
        if (error) throw error;
        trackGa4Event("login", {
          method: "email",
          context: "checkout",
        });
        await completeCheckoutAuth(
          {
            supabase: authState.supabase,
            session: data?.session || null,
            user: data?.user || null,
          },
          "Signed in. Continue with delivery and payment.",
        );
      } catch (error) {
        setPanelMessage(
          loginMessageTarget,
          getReadableAuthError(error),
          "error",
        );
      } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Log in";
      }
    });
  }

  if (
    registerPasswordField instanceof HTMLInputElement &&
    registerPasswordConfirmField instanceof HTMLInputElement
  ) {
    [registerPasswordField, registerPasswordConfirmField].forEach((input) => {
      input.addEventListener("input", () => {
        updatePasswordPairState(
          registerPasswordField,
          registerPasswordConfirmField,
          registerPasswordMatchMessage,
        );
      });
    });
  }

  if (
    passwordField instanceof HTMLInputElement &&
    passwordConfirmField instanceof HTMLInputElement
  ) {
    [passwordField, passwordConfirmField].forEach((input) => {
      input.addEventListener("input", () => {
        updatePasswordPairState(
          passwordField,
          passwordConfirmField,
          passwordMatchMessage,
        );
      });
    });
  }

  if (
    registerButton instanceof HTMLButtonElement &&
    registerFirstNameField instanceof HTMLInputElement &&
    registerLastNameField instanceof HTMLInputElement &&
    registerPhoneField instanceof HTMLInputElement &&
    registerEmailField instanceof HTMLInputElement &&
    registerPasswordField instanceof HTMLInputElement &&
    registerPasswordConfirmField instanceof HTMLInputElement
  ) {
    registerButton.addEventListener("click", async () => {
      const firstName = String(registerFirstNameField.value || "").trim();
      const lastName = String(registerLastNameField.value || "").trim();
      const phone = normalizeAustralianPhone(
        String(registerPhoneField.value || "").trim(),
      );
      const email = String(registerEmailField.value || "")
        .trim()
        .toLowerCase();
      const password = String(registerPasswordField.value || "");
      const confirmPassword = String(registerPasswordConfirmField.value || "");
      const customerName = buildProfileFullName(firstName, lastName, "");

      if (!firstName || !lastName) {
        setPanelMessage(
          registerMessageTarget,
          "Enter your first name and last name.",
          "error",
        );
        return;
      }
      if (!isValidAustralianPhone(phone)) {
        setPanelMessage(
          registerMessageTarget,
          "Enter a valid Australian phone number, for example 0412 345 678.",
          "error",
        );
        registerPhoneField.focus();
        return;
      }
      if (!isValidEmailAddress(email)) {
        setPanelMessage(
          registerMessageTarget,
          "Enter a valid email address.",
          "error",
        );
        registerEmailField.focus();
        return;
      }
      if (!password) {
        setPanelMessage(registerMessageTarget, "Create a password.", "error");
        registerPasswordField.focus();
        return;
      }
      if (!isValidAccountPassword(password)) {
        setPanelMessage(
          registerMessageTarget,
          "Password must include English letters and numbers.",
          "error",
        );
        registerPasswordField.focus();
        return;
      }
      if (password !== confirmPassword) {
        setPanelMessage(
          registerMessageTarget,
          "Passwords do not match.",
          "error",
        );
        registerPasswordConfirmField.focus();
        return;
      }

      try {
        registerButton.disabled = true;
        registerButton.textContent = "Creating...";
        setPanelMessage(registerMessageTarget, "");
        const authState = await getCurrentAuthState();
        if (!authState?.supabase) {
          throw new Error("Account registration is not available right now.");
        }
        const { data, error } = await authState.supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl(),
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: customerName,
              phone,
            },
          },
        });
        if (error) throw error;
        trackGa4Event("sign_up", {
          method: "email",
          context: "checkout",
        });

        if (!data?.session || !data?.user) {
          setPanelMessage(
            registerMessageTarget,
            "Account created. Please verify your email, then log in to continue checkout.",
            "success",
          );
          return;
        }

        setCheckoutContactFields({
          firstName,
          lastName,
          phone,
          email,
        });

        try {
          await syncCustomerProfile(authState.supabase, data.user, {
            first_name: firstName,
            last_name: lastName,
            full_name: customerName,
            phone,
            email,
          });
        } catch (profileError) {
          console.warn(
            "Checkout registration profile sync skipped:",
            profileError,
          );
        }

        await completeCheckoutAuth(
          {
            supabase: authState.supabase,
            session: data.session,
            user: data.user,
          },
          "Account created. Continue with delivery and payment.",
        );
      } catch (error) {
        setPanelMessage(
          registerMessageTarget,
          getReadableAuthError(error),
          "error",
        );
      } finally {
        registerButton.disabled = false;
        registerButton.textContent = "Create account";
      }
    });
  }

  if (googleButton instanceof HTMLButtonElement) {
    googleButton.addEventListener("click", async () => {
      try {
        setPanelMessage(registerMessageTarget, "");
        if (!activeAuthState?.supabase?.auth?.signInWithOAuth) {
          throw new Error("Supabase Google login is not ready. Please refresh and try again.");
        }
        googleButton.disabled = true;
        googleButton.classList.add("is-loading");
        trackGa4Event("login", {
          method: "google",
          context: "checkout",
        });
        const { error } = await activeAuthState.supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: new URL("/checkout.html", window.location.origin).toString(),
          },
        });
        if (error) throw error;
      } catch (error) {
        googleButton.disabled = false;
        googleButton.classList.remove("is-loading");
        setPanelMessage(registerMessageTarget, getReadableAuthError(error), "error");
      }
    });
  }

  if (deliveryContinueButton instanceof HTMLButtonElement) {
    deliveryContinueButton.addEventListener("click", () => {
      if (!activeAuthState?.user) {
        checkoutStep = "auth";
        setCheckoutMessage(
          "Please log in or create an account before choosing delivery.",
          "error",
        );
        render();
        return;
      }

      if (!validateDeliveryStep({ focus: true })) {
        return;
      }

      fillMissingCheckoutContact();
      checkoutStep = "payment";
      setCheckoutMessage("");
      render();
    });
  }

  if (backToDeliveryButton instanceof HTMLButtonElement) {
    backToDeliveryButton.addEventListener("click", () => {
      checkoutStep = "delivery";
      setCheckoutMessage("");
      render();
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAllFieldErrors();
    setCheckoutMessage("");

    let items = loadCart();
    if (!items.length) {
      setCheckoutMessage(
        "Your cart is empty. Add products before checking out.",
        "error",
      );
      return;
    }

    try {
      const cartProducts = await fetchCatalogProductsForCartValidation(items);
      let reconciliation = reconcileCartItems(items, cartProducts);

      if (reconciliation.missing.length) {
        try {
          const { products: fullCatalogProducts } =
            await loadSharedCatalogData();
          reconciliation = reconcileCartItems(items, fullCatalogProducts);
        } catch (_catalogError) {
          // Keep the targeted validation result. The server remains authoritative.
        }
      }

      if (reconciliation.changed) {
        items = reconciliation.items;
        saveCart(items);
        updateCartIndicators(items);
        render();
      }

      if (reconciliation.missing.length) {
        const missingNames = reconciliation.missing
          .map((item) => item.name || item.sku || item.slug)
          .filter(Boolean)
          .slice(0, 3)
          .join(", ");
        setCheckoutMessage(
          missingNames
            ? `Some cart items are not linked to the product database: ${missingNames}. Remove them from the cart and try again.`
            : "Some cart items are not linked to the product database. Remove them from the cart and try again.",
          "error",
        );
        return;
      }
    } catch (_error) {
      // Continue. Server-side product validation is still authoritative.
    }

    let formData = new FormData(form);
    const subtotal = getCartSubtotal(items);
    const selectedProfile = getSelectedPaymentProfile();
    activeAuthState = await getCurrentAuthState();
    if (!activeAuthState?.user) {
      setCheckoutMessage(
        "Please log in or create an account before continuing checkout.",
        "error",
      );
      authChecked = true;
      render();
      return;
    }
    fillMissingCheckoutContact();
    formData = new FormData(form);
    const firstName = String(formData.get("first_name") || "").trim();
    const lastName = String(formData.get("last_name") || "").trim();
    const customerName = buildProfileFullName(firstName, lastName, "") || "";
    const phone = normalizeAustralianPhone(
      String(formData.get("phone") || "").trim(),
    );
    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();
    let authAccessToken =
      activeAuthState?.session?.access_token || supabaseAnonKey;
    const storeSlug = String(formData.get("store_slug") || "").trim();
    const paymentMethodCode = String(
      formData.get("payment_method_code") || "pay_in_store",
    ).trim();
    const warehouseDispatch = storeSlug === "warehouse-dispatch";
    const selectedShippingOption = warehouseDispatch
      ? getSelectedShippingOption()
      : null;
    const shippingFeeAmount = selectedShippingOption
      ? calculateShippingFee(subtotal, selectedShippingOption)
      : 0;
    const paymentFeeAmount = selectedProfile
      ? calculatePaymentFee(subtotal, selectedProfile)
      : 0;
    const checkoutPassword = String(formData.get("checkout_password") || "");
    const checkoutPasswordConfirm = String(
      formData.get("checkout_password_confirm") || "",
    );
    const firstNameField = form.elements.namedItem("first_name");
    const lastNameField = form.elements.namedItem("last_name");
    const phoneField = form.elements.namedItem("phone");
    const emailField = form.elements.namedItem("email");
    const storeSelectField = form.elements.namedItem("store_slug");
    const shippingRecipientField = form.elements.namedItem("recipient_name");
    const shippingPhoneField = form.elements.namedItem("shipping_phone");
    const shippingEmailField = form.elements.namedItem("shipping_email");
    const shippingAddressField = form.elements.namedItem("address_line_1");
    const shippingSuburbField = form.elements.namedItem("suburb");
    const shippingPostcodeField = form.elements.namedItem("postcode");
    const shippingStateField = form.elements.namedItem("state");
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
    const zipBillingPayload = {
      billing_address_line_1: String(formData.get("billing_address_line_1") || "").trim(),
      billing_address_line_2: String(formData.get("billing_address_line_2") || "").trim(),
      billing_suburb: String(formData.get("billing_suburb") || "").trim(),
      billing_postcode: String(formData.get("billing_postcode") || "").trim(),
      billing_state: String(formData.get("billing_state") || "").trim().toUpperCase(),
      billing_country_code: String(formData.get("billing_country_code") || "AU").trim().toUpperCase(),
    };

    if (
      !requireField(
        firstNameField,
        "Enter your first name.",
        "First name is required.",
      )
    )
      return;
    if (
      !requireField(
        lastNameField,
        "Enter your last name.",
        "Last name is required.",
      )
    )
      return;
    if (
      !requireField(
        phoneField,
        "Enter your phone number.",
        "Phone number is required.",
      )
    )
      return;
    if (
      !requireField(
        emailField,
        "Enter your email address.",
        "Email address is required.",
      )
    )
      return;

    if (!isValidEmailAddress(email)) {
      invalidateField(
        emailField,
        "Enter a valid email address, for example name@example.com.au.",
      );
      return;
    }

    if (!isValidAustralianPhone(phone)) {
      invalidateField(
        phoneField,
        "Enter a valid Australian phone number, for example 0412 345 678 or +61 412 345 678.",
      );
      return;
    }

    if (!activeAuthState?.user) {
      if (!checkoutPassword) {
        invalidateField(
          passwordField,
          "Create a password for your TECHM8 account.",
          "Create a password to register your TECHM8 account with this order.",
        );
        return;
      }

      if (!isValidAccountPassword(checkoutPassword)) {
        invalidateField(
          passwordField,
          "Password must include English letters and numbers.",
          "Password must include English letters and numbers.",
        );
        return;
      }

      if (checkoutPassword !== checkoutPasswordConfirm) {
        invalidateField(
          passwordConfirmField,
          "Passwords do not match.",
          "Password confirmation does not match.",
        );
        return;
      }
    }

    if (!storeSlug) {
      invalidateField(
        storeSelectField,
        "Select a pickup store or dispatch point.",
        "Please select a pickup store or dispatch point.",
      );
      return;
    }

    if (paymentMethodCode === "pay_in_store" && warehouseDispatch) {
      setCheckoutMessage(
        "Pay in store can only be used with a physical pickup store.",
        "error",
      );
      return;
    }

    if (selectedProfile?.provider === "zip") {
      if (!isValidAustralianMobile(phone)) {
        invalidateField(
          phoneField,
          "Zip requires an Australian mobile number, for example 0412 345 678.",
          "Please enter a valid Australian mobile number for Zip.",
        );
        return;
      }
      const requiredZipBillingFields = [
        ["billing_address_line_1", "Enter your Zip billing address."],
        ["billing_suburb", "Enter your Zip billing suburb."],
        ["billing_postcode", "Enter your Zip billing postcode."],
        ["billing_state", "Select your Zip billing state."],
      ];
      for (const [name, message] of requiredZipBillingFields) {
        const field = form.elements.namedItem(name);
        if (
          !requireField(
            field,
            message,
            "A billing address is required for Zip.",
          )
        )
          return;
      }
      if (!/^\d{4}$/.test(zipBillingPayload.billing_postcode)) {
        invalidateField(
          form.elements.namedItem("billing_postcode"),
          "Enter a valid 4-digit Australian postcode.",
          "Please check your Zip billing postcode.",
        );
        return;
      }
      if (zipBillingPayload.billing_country_code !== "AU") {
        setCheckoutMessage(
          "Zip billing is currently available for Australian addresses only.",
          "error",
        );
        return;
      }
    }

    if (warehouseDispatch) {
      const shippingPhone = String(shippingPayload.shipping_phone || "").trim();
      const shippingEmail = String(shippingPayload.shipping_email || "")
        .trim()
        .toLowerCase();
      if (
        !requireField(
          shippingRecipientField,
          "Enter the recipient name.",
          "Warehouse Dispatch requires a full delivery address.",
        )
      )
        return;
      if (
        !requireField(
          shippingAddressField,
          "Enter the delivery address.",
          "Warehouse Dispatch requires a full delivery address.",
        )
      )
        return;
      if (
        !requireField(
          shippingSuburbField,
          "Enter the suburb.",
          "Warehouse Dispatch requires a full delivery address.",
        )
      )
        return;
      if (
        !requireField(
          shippingPostcodeField,
          "Enter the 4-digit postcode.",
          "Warehouse Dispatch requires a full delivery address.",
        )
      )
        return;
      if (
        !requireField(
          shippingStateField,
          "Select a state.",
          "Warehouse Dispatch requires a full delivery address.",
        )
      )
        return;

      if (shippingPhone && !isValidAustralianPhone(shippingPhone)) {
        invalidateField(
          shippingPhoneField,
          "Enter a valid Australian shipping phone number, for example 0412 345 678 or +61 412 345 678.",
          "Please enter a valid Australian shipping phone number.",
        );
        return;
      }

      if (shippingEmail && !isValidEmailAddress(shippingEmail)) {
        invalidateField(
          shippingEmailField,
          "Enter a valid shipping email address.",
          "Please enter a valid shipping email address.",
        );
        return;
      }

      if (!/^\d{4}$/.test(shippingPayload.postcode)) {
        invalidateField(
          shippingPostcodeField,
          "Enter a valid 4-digit Australian postcode.",
          "Please enter a valid 4-digit Australian postcode.",
        );
        return;
      }

      shippingPayload.shipping_phone = shippingPhone
        ? normalizeAustralianPhone(shippingPhone)
        : "";
      shippingPayload.shipping_email = shippingEmail;
    }

    const payload = {
      order_code: makeOrderCode(),
      customer_name: customerName,
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
      store_slug: storeSlug,
      preferred_contact_method: "phone",
      payment_method_code: paymentMethodCode,
      fulfillment_method: warehouseDispatch ? "shipping" : "pickup",
      shipping_service_code: selectedShippingOption?.code || null,
      shipping_service_name: selectedShippingOption?.label || null,
      shipping_delivery_time: selectedShippingOption?.deliveryTime || null,
      notes: String(formData.get("notes") || "").trim(),
      subtotal_amount: subtotal,
      payment_fee_amount: paymentFeeAmount,
      shipping_fee_amount: shippingFeeAmount,
      total_amount: Number(
        (subtotal + paymentFeeAmount + shippingFeeAmount).toFixed(2),
      ),
      source: "website",
      site_url: getConfiguredSiteBaseUrl(),
      auth_user_id: activeAuthState?.user?.id || null,
      items,
      created_at: new Date().toISOString(),
      ...shippingPayload,
      ...(selectedProfile?.provider === "zip" ? zipBillingPayload : {}),
    };

    const endpoint = window.TECHM8_CONFIG?.orderEndpoint || "";
    const checkoutSessionEndpoint =
      window.TECHM8_CONFIG?.checkoutSessionEndpoint || "";

    try {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
      }

      if (!activeAuthState?.user && activeAuthState?.supabase) {
        const { data: signUpData, error: signUpError } =
          await activeAuthState.supabase.auth.signUp({
            email,
            password: checkoutPassword,
            options: {
              emailRedirectTo: getAuthRedirectUrl(),
              data: {
                first_name: firstName,
                last_name: lastName,
                full_name: customerName,
                phone,
              },
            },
          });

        if (signUpError) {
          throw new Error(getReadableAuthError(signUpError));
        }
        trackGa4Event("sign_up", {
          method: "email",
          context: "checkout-submit",
        });

        activeAuthState = {
          supabase: activeAuthState.supabase,
          session: signUpData?.session || null,
          user: signUpData?.user || null,
        };
        if (!activeAuthState.session?.access_token) {
          throw new Error(
            "Please confirm your email, then sign in to continue checkout.",
          );
        }
        authAccessToken =
          activeAuthState.session.access_token;
        payload.auth_user_id = activeAuthState?.user?.id || null;
      }

      if (
        activeAuthState?.supabase &&
        activeAuthState?.user &&
        activeAuthState?.session?.access_token
      ) {
        try {
          await syncCustomerProfile(
            activeAuthState.supabase,
            activeAuthState.user,
            {
              full_name: payload.customer_name,
              first_name: payload.first_name,
              last_name: payload.last_name,
              phone: payload.phone,
              email: payload.email,
              default_store_slug: payload.store_slug,
            },
          );
        } catch (profileSyncError) {
          console.warn("Checkout profile sync skipped:", profileSyncError);
        }
      }

      trackGa4Event("add_payment_info", {
        currency: "AUD",
        value: Number(payload.total_amount || 0),
        payment_type: String(
          selectedProfile?.label ||
            selectedProfile?.code ||
            payload.payment_method_code ||
            "",
        ),
        shipping_tier: String(
          selectedShippingOption?.label ||
            (warehouseDispatch ? "Warehouse Dispatch" : "Store Pickup"),
        ),
        items: buildGa4ItemsFromCart(items),
      });

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
          throw new Error(
            result.error || "Stripe Checkout could not be started.",
          );
        }

        payload.order_code = String(result.order_code || payload.order_code);
        payload.total_amount =
          Number(result.total_amount ?? payload.total_amount) ||
          payload.total_amount;
        payload.payment_fee_amount =
          Number(result.payment_fee_amount ?? payload.payment_fee_amount) || 0;
        payload.shipping_fee_amount =
          Number(result.shipping_fee_amount ?? payload.shipping_fee_amount) || 0;
        payload.payment_method_label = String(
          result.payment_method_label ||
            selectedProfile?.label ||
            payload.payment_method_label ||
            "",
        );
        payload.stripe_checkout_session_id = String(result.session_id || "");
        saveCheckoutSuccessContext(payload);

        trackGa4Event("checkout_redirect_to_stripe", {
          payment_type: String(
            selectedProfile?.label || selectedProfile?.code || "stripe",
          ),
          shipping_tier: String(
            selectedShippingOption?.label ||
              (warehouseDispatch ? "Warehouse Dispatch" : "Store Pickup"),
          ),
        });
        window.location.href = result.checkout_url;
        return;
      }

      if (["zip", "paypal"].includes(selectedProfile?.provider) && !endpoint) {
        throw new Error(`${selectedProfile?.label || "Selected payment"} checkout is not configured yet.`);
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
        payload.store_name = String(
          result.store_name || payload.store_name || "",
        );
        payload.total_amount =
          Number(result.total_amount ?? payload.total_amount) ||
          payload.total_amount;
        payload.payment_fee_amount =
          Number(result.payment_fee_amount ?? 0) || 0;
        payload.shipping_fee_amount =
          Number(
            result.shipping_fee_amount ?? payload.shipping_fee_amount ?? 0,
          ) || 0;
        payload.shipping_service_code = String(
          result.shipping_service_code || payload.shipping_service_code || "",
        );
        payload.shipping_service_name = String(
          result.shipping_service_name || payload.shipping_service_name || "",
        );
        payload.shipping_delivery_time = String(
          result.shipping_delivery_time || payload.shipping_delivery_time || "",
        );
        payload.payment_method_code = String(
          result.payment_method_code || payload.payment_method_code || "",
        );
        payload.payment_method_label = String(
          result.payment_method_label || payload.payment_method_label || "",
        );
        if (selectedProfile?.provider === "zip") {
          if (!result.checkout_url) {
            throw new Error("Zip checkout could not be started.");
          }
          payload.zip_checkout_id = String(result.zip_checkout_id || "");
          saveCheckoutSuccessContext(payload);
          trackGa4Event("checkout_redirect_to_zip", {
            payment_type: "Zip Pay",
            shipping_tier: String(
              selectedShippingOption?.label ||
                (warehouseDispatch ? "Warehouse Dispatch" : "Store Pickup"),
            ),
          });
          window.location.href = result.checkout_url;
          return;
        }
        if (selectedProfile?.provider === "paypal") {
          if (!result.checkout_url) {
            throw new Error("PayPal checkout could not be started.");
          }
          payload.paypal_order_id = String(result.paypal_order_id || "");
          saveCheckoutSuccessContext(payload);
          trackGa4Event("checkout_redirect_to_paypal", {
            payment_type: "PayPal",
            shipping_tier: String(
              selectedShippingOption?.label ||
                (warehouseDispatch ? "Warehouse Dispatch" : "Store Pickup"),
            ),
          });
          window.location.href = result.checkout_url;
          return;
        }
      } else {
        saveLocalOrder(payload);
      }

      trackGa4Event("purchase_request_submitted", {
        transaction_id: String(payload.order_code || ""),
        currency: "AUD",
        value: Number(payload.total_amount || 0),
        payment_type: String(
          selectedProfile?.label ||
            selectedProfile?.code ||
            payload.payment_method_code ||
            "",
        ),
        shipping_tier: String(
          selectedShippingOption?.label ||
            (warehouseDispatch ? "Warehouse Dispatch" : "Store Pickup"),
        ),
        items: buildGa4ItemsFromCart(items),
      });
      clearCart();
      saveCheckoutSuccessContext(payload);

      if ((selectedProfile?.provider || "manual") === "manual") {
        const confirmationUrl = new URL(
          "checkout-success.html",
          window.location.href,
        );
        confirmationUrl.searchParams.set("order_code", payload.order_code);
        confirmationUrl.searchParams.set("mode", "pay_in_store");
        window.location.href = confirmationUrl.toString();
        return;
      }

      renderSuccessState(payload);
    } catch (error) {
      setCheckoutMessage(
        error instanceof Error ? error.message : "Checkout submission failed.",
        "error",
      );
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
        submitButton.textContent =
          selectedProfile?.code === "zip"
            ? "Continue to Zip"
            : selectedProfile?.provider === "paypal"
              ? "Continue to PayPal"
              : "Submit order request";
      }
    }
  });

  if (
    paymentOptionsTarget instanceof HTMLElement &&
    paymentMethodField instanceof HTMLInputElement
  ) {
    paymentOptionsTarget.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const option = target.closest("[data-payment-option]");
      if (!(option instanceof HTMLElement)) return;
      const code = String(
        option.getAttribute("data-payment-option") || "",
      ).trim();
      if (!code) return;
      paymentMethodField.value = code;
      render();
    });
  }

  if (
    shippingOptionsTarget instanceof HTMLElement &&
    shippingServiceField instanceof HTMLInputElement
  ) {
    shippingOptionsTarget.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const option = target.closest("[data-shipping-option]");
      if (!(option instanceof HTMLElement)) return;
      const code = String(
        option.getAttribute("data-shipping-option") || "",
      ).trim();
      if (!code) return;
      shippingServiceField.value = code;
      render();
    });
  }

  if (storeField instanceof HTMLSelectElement) {
    storeField.addEventListener("change", () => {
      if (checkoutStep === "payment") {
        checkoutStep = "delivery";
      }
      if (storeField.value) {
        trackGa4Event("select_store", {
          store_slug: storeField.value,
          context: "checkout",
        });
      }
      render();
    });
  }

  fulfillmentFields.forEach((field) => {
    if (!(field instanceof HTMLInputElement)) return;
    field.addEventListener("change", () => {
      selectedFulfillment = field.value || "pickup";
      if (checkoutStep === "payment") {
        checkoutStep = "delivery";
      }
      render();
    });
  });

  loadPaymentFeeProfiles()
    .then((profiles) => {
      const supportedProfiles = profiles.filter((profile) => {
        if (!profile || !profile.code || profile.is_enabled === false)
          return false;
        if (profile.provider === "manual") return true;
        if (profile.provider === "stripe") {
          return ["card", "afterpay_clearpay", "klarna", "zip", "wechat_pay"].includes(
            profile.code,
          );
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
            ]),
      );

      if (paymentMethodField instanceof HTMLInputElement) {
        const initialProfile =
          paymentProfiles.find((profile) => profile.code === "pay_in_store") ||
          paymentProfiles[0];
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
    const paymentReturnMessages = {
      cancelled:
        "Stripe payment was cancelled. Your cart is still here and you can try again.",
      zip_declined:
        "Zip did not approve this payment. Your cart is still here; you can try Zip again or choose another payment method.",
      zip_referred:
        "Zip needs additional review before it can approve this payment. Your cart is still here; please follow Zip's instructions or choose another payment method.",
      zip_cancelled:
        "Zip checkout was cancelled. Your cart is still here and no new charge was made.",
      zip_failed:
        "We could not confirm the Zip checkout. Your cart is still here; please try again or contact OZ TECH M8 with your order reference.",
      paypal_cancelled:
        "PayPal checkout was cancelled. Your cart is still here and no new charge was made.",
      paypal_failed:
        "We could not confirm the PayPal checkout. Your cart is still here; please try again or contact OZ TECH M8 with your order reference.",
    };
    messageTarget.textContent =
      paymentReturnMessages[paymentReturnState] ||
      "Payment was not completed. Your cart is still here and you can try again.";
  }
}

function buildCheckoutInvoiceMarkup(order) {
  const invoiceLinks = buildCustomerInvoiceLinks(order);
  const invoiceNumber = String(order?.invoice_number || order?.stripe_invoice_number || "").trim();
  const confirmationNumber = String(order?.confirmation_number || "").trim();
  const paymentMethodCode = String(order?.payment_method_code || "").trim();

  if (invoiceLinks) {
    return `
      <p class="storefront-success__invoice-note">
        ${paymentMethodCode === "pay_in_store"
          ? invoiceNumber
            ? `Order confirmation ${escapeHtml(confirmationNumber || order.order_code || "")} and invoice ${escapeHtml(invoiceNumber)} are ready. Payment is due at pickup.`
            : `Order confirmation ${escapeHtml(confirmationNumber || order.order_code || "")} is ready. Payment is due at pickup.`
          : invoiceNumber
            ? `Invoice ${escapeHtml(invoiceNumber)} is ready.`
            : "Your invoice is ready."}
      </p>
      <div class="storefront-success__actions">${invoiceLinks}</div>
    `;
  }

  if (paymentMethodCode && paymentMethodCode !== "pay_in_store") {
    return `
      <p class="storefront-success__invoice-note">
        Your paid invoice is being generated and will be emailed to your checkout address.
      </p>
      <div class="storefront-success__actions">
        <a class="button button--ghost" href="/my-orders.html">Check My Orders</a>
      </div>
    `;
  }

  return "";
}

async function refreshCheckoutInvoiceStatus(root, orderCode, storedPayload) {
  if (!(root instanceof HTMLElement) || !orderCode || orderCode === "Pending") {
    return;
  }

  const invoiceTarget = root.querySelector("[data-checkout-invoice-actions]");
  if (!(invoiceTarget instanceof HTMLElement)) return;

  try {
    const authState = await getCurrentAuthState();
    if (!authState?.supabase || !authState?.user) return;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const order = await loadCustomerOrderByCode(
        authState.supabase,
        authState.user,
        orderCode,
      );

      if (order) {
        invoiceTarget.innerHTML = buildCheckoutInvoiceMarkup(order);
        const paymentStatusTarget = root.querySelector(
          "[data-success-payment-status]",
        );
        if (paymentStatusTarget instanceof HTMLElement) {
          paymentStatusTarget.textContent = formatStatusLabel(
            order.payment_status || "pending",
          );
        }

        if (storedPayload) {
          saveCheckoutSuccessContext({ ...storedPayload, ...order });
        }

        if (
          order.invoice_number ||
          getSafeStripeInvoiceUrl(order.stripe_invoice_url) ||
          getSafeStripeInvoiceUrl(order.stripe_invoice_pdf_url)
        ) {
          return;
        }
      }

      if (attempt < 4) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, 1200 + attempt * 600),
        );
      }
    }
  } catch (error) {
    console.warn("Invoice status could not be refreshed:", error);
  }
}

function initCheckoutSuccessPage() {
  const root = document.querySelector("[data-checkout-success-page]");
  if (!(root instanceof HTMLElement)) return;

  const params = new URLSearchParams(window.location.search);
  const orderCode = params.get("order_code") || "Pending";
  const sessionId = params.get("session_id") || "";
  const mode = params.get("mode") || "";
  const storedPayload = readCheckoutSuccessContext(orderCode);

  clearCart();

  if (storedPayload) {
    const storeSlug = String(storedPayload.store_slug || "").trim();
    const storeDetail = STORE_CHECKOUT_DETAILS[storeSlug] || null;
    const isPayInStore =
      mode === "pay_in_store" ||
      String(storedPayload.payment_method_code || "").trim() === "pay_in_store";
    const transactionId = String(
      storedPayload.order_code || orderCode || "",
    ).trim();
    if (!isPayInStore && transactionId && transactionId !== "Pending") {
      const purchaseStorageKey = `techm8_ga4_purchase_${transactionId}`;
      let purchaseTracked = false;
      try {
        purchaseTracked = window.localStorage.getItem(purchaseStorageKey) === "1";
      } catch {
        purchaseTracked = false;
      }

      if (!purchaseTracked) {
        trackGa4Event("purchase", {
          transaction_id: transactionId,
          currency: "AUD",
          value: Number(storedPayload.total_amount || 0),
          tax: Number(storedPayload.gst_amount || 0),
          shipping: Number(storedPayload.shipping_fee_amount || 0),
          payment_type: String(
            storedPayload.payment_method_label ||
              storedPayload.payment_method_code ||
              "online",
          ),
          items: buildGa4ItemsFromCart(storedPayload.items || []),
        });
        try {
          window.localStorage.setItem(purchaseStorageKey, "1");
        } catch {
          // GA4 also de-duplicates ecommerce events by transaction_id.
        }
      }
    }
    const storedShippingOption = storedPayload.shipping_service_code
      ? getCheckoutShippingOption(storedPayload.shipping_service_code)
      : null;

    root.innerHTML = `
      <section class="section">
        <div class="container storefront-checkout storefront-checkout--success">
          <div class="storefront-checkout__main">
            <article class="storefront-success">
              <p class="eyebrow">${escapeHtml(isPayInStore ? "Order confirmed" : "Payment received")}</p>
              <h1>${escapeHtml(isPayInStore ? "Order request submitted" : "Payment completed successfully")}</h1>
              <p class="storefront-success__lead">Order reference: ${escapeHtml(storedPayload.order_code || orderCode)}</p>
              <div class="storefront-success__grid">
                <div class="storefront-success__item">
                  <strong>Status</strong>
                  <span data-success-payment-status>${escapeHtml(isPayInStore ? "Awaiting in-store payment" : "Paid and submitted")}</span>
                </div>
                <div class="storefront-success__item">
                  <strong>Store / dispatch point</strong>
                  <span>${escapeHtml(storeDetail?.title || storedPayload.store_name || storedPayload.store_slug || "Pending confirmation")}</span>
                </div>
                <div class="storefront-success__item">
                  <strong>Contact</strong>
                  <span>${escapeHtml(storedPayload.phone || "")}${storedPayload.email ? ` / ${escapeHtml(storedPayload.email)}` : ""}</span>
                </div>
                <div class="storefront-success__item">
                  <strong>Total</strong>
                  <span>${escapeHtml(formatMoney(storedPayload.total_amount || 0))}</span>
                </div>
                <div class="storefront-success__item">
                  <strong>Shipping</strong>
                  <span>${escapeHtml(storedShippingOption ? `${storedShippingOption.label} (${formatMoney(storedPayload.shipping_fee_amount || 0)})` : "Store pickup")}</span>
                </div>
              </div>
              <div class="storefront-success__actions">
                <a class="button button--primary" href="/shop.html">Continue shopping</a>
                ${storeDetail?.mapUrl ? `<a class="button button--ghost" href="${escapeHtml(storeDetail.mapUrl)}" target="_blank" rel="noopener">Open pickup map</a>` : `<a class="button button--ghost" href="/stores.html">Find a store</a>`}
              </div>
              <div class="storefront-success__invoice" data-checkout-invoice-actions>
                ${buildCheckoutInvoiceMarkup(storedPayload)}
              </div>
            </article>

            ${
              storeDetail
                ? `
              <article class="storefront-checkout__delivery-detail">
                <div class="storefront-checkout__delivery-detail-top">
                  <div>
                    <p class="storefront-checkout__delivery-mode">${escapeHtml(storeDetail.mode)}</p>
                    <h3>${escapeHtml(storeDetail.title)}</h3>
                  </div>
                  <span class="storefront-checkout__delivery-chip">${escapeHtml(storeDetail.mode)}</span>
                </div>
                <p class="storefront-checkout__delivery-summary">${escapeHtml(isPayInStore ? "Bring your order reference to the store and pay at collection." : storeDetail.summary)}</p>
                <div class="storefront-checkout__delivery-meta">
                  <p><strong>Address</strong><span>${escapeHtml(storeDetail.address)}</span></p>
                  ${storeDetail.phone ? `<p><strong>Phone</strong><span><a href="tel:${escapeHtml(storeDetail.phone.replace(/\s+/g, ""))}">${escapeHtml(storeDetail.phone)}</a></span></p>` : ""}
                </div>
                <div class="storefront-checkout__delivery-actions">
                  ${storeDetail.mapUrl ? `<a class="button button--ghost" href="${escapeHtml(storeDetail.mapUrl)}" target="_blank" rel="noopener">Open in Maps</a>` : ""}
                  ${storeDetail.pageUrl ? `<a class="button button--secondary" href="${escapeHtml(storeDetail.pageUrl)}">View store page</a>` : ""}
                </div>
              </article>
            `
                : ""
            }

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

    const successItemsTarget = root.querySelector(
      "[data-checkout-success-items]",
    );
    const successSummaryTarget = root.querySelector(
      "[data-checkout-success-summary]",
    );
    renderCartLineItems(successItemsTarget, storedPayload.items || []);
    renderCartSummary(successSummaryTarget, storedPayload.items || [], {
      paymentProfile: {
        code: storedPayload.payment_method_code || "pay_in_store",
        label: storedPayload.payment_method_label || "Pay in store",
        provider: isPayInStore ? "manual" : "stripe",
        fee_type: "none",
        percentage: 0,
        fixed_amount: 0,
      },
      shippingOption: storedShippingOption,
      paymentFeeOverride: Number(storedPayload.payment_fee_amount ?? 0) || 0,
      shippingFeeOverride: Number(storedPayload.shipping_fee_amount ?? 0) || 0,
      totalOverride: Number(storedPayload.total_amount ?? 0) || 0,
    });
    refreshCheckoutInvoiceStatus(root, orderCode, storedPayload);
    return;
  }

  const orderCodeTarget = root.querySelector("[data-success-order-code]");
  const sessionTarget = root.querySelector("[data-success-session-id]");
  if (orderCodeTarget instanceof HTMLElement) {
    orderCodeTarget.textContent = orderCode;
  }
  if (sessionTarget instanceof HTMLElement) {
    sessionTarget.textContent = sessionId || "Stripe session confirmed";
  }
  refreshCheckoutInvoiceStatus(root, orderCode, null);
}

function initBookingForm() {
  const form = document.querySelector("[data-booking-form]");
  if (!(form instanceof HTMLFormElement)) return;

  const supabaseAnonKey = window.TECHM8_CONFIG?.supabaseAnonKey || "";
  const bookingEndpoint =
    window.TECHM8_CONFIG?.bookingEndpoint || "api/book-repair.php";
  const isSupabaseEndpoint =
    /^https:\/\/.+\.supabase\.co\/functions\/v1\//.test(bookingEndpoint);
  let activeAuthState = null;

  const submitButton = form.querySelector("[data-booking-submit]");
  const messageBox = form.querySelector("[data-booking-message]");
  const storeField = form.elements.namedItem("store_slug");
  const modal = document.querySelector("[data-booking-modal]");
  const modalType = modal?.querySelector("[data-booking-modal-type]");
  const modalTitle = modal?.querySelector("[data-booking-modal-title]");
  const modalText = modal?.querySelector("[data-booking-modal-text]");
  const modalCloseButtons = modal?.querySelectorAll(
    "[data-booking-modal-close]",
  );

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
      modalType.textContent =
        type === "success" ? "Booking submitted" : "Submission failed";
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

  const getBookingField = (name) => form.elements.namedItem(name);
  const bookingFields = {
    repairCategory: getBookingField("repair_category"),
    storeSlug: getBookingField("store_slug"),
    deviceModel: getBookingField("device_model"),
    issueDescription: getBookingField("issue_description"),
    preferredDate: getBookingField("preferred_date"),
    preferredTime: getBookingField("preferred_time"),
    customerName: getBookingField("customer_name"),
    phone: getBookingField("phone"),
    email: getBookingField("email"),
    preferredContactMethod: getBookingField("preferred_contact_method"),
    privacyConsent: getBookingField("privacy_consent"),
  };

  const bookingTimeValues = new Set([
    "Morning time (9:00 AM - 12:00 PM)",
    "Lunch time (12:00 PM - 2:00 PM)",
    "Afternoon time (2:00 PM - 5:00 PM)",
  ]);

  const toBookingInput = (field) =>
    field instanceof HTMLInputElement ||
    field instanceof HTMLSelectElement ||
    field instanceof HTMLTextAreaElement
      ? field
      : null;

  const clearBookingFieldError = (field) => {
    const input = toBookingInput(field);
    if (!input) return;
    input.classList.remove("is-invalid");
    input.setCustomValidity("");
    const wrapper = input.closest(".booking-field, .booking-checkbox");
    wrapper?.querySelector(".booking-field__error")?.remove();
  };

  const setBookingFieldError = (field, message) => {
    const input = toBookingInput(field);
    if (!input) return false;
    clearBookingFieldError(input);
    input.classList.add("is-invalid");
    input.setCustomValidity(message);
    const wrapper = input.closest(".booking-field, .booking-checkbox");
    const error = document.createElement("small");
    error.className = "booking-field__error";
    error.textContent = message;
    wrapper?.appendChild(error);
    return true;
  };

  const clearAllBookingErrors = () => {
    form
      .querySelectorAll("input, select, textarea")
      .forEach((field) => clearBookingFieldError(field));
  };

  const getTodayIsoDate = () => {
    const today = new Date();
    return new Date(today.getTime() - today.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  };

  const isValidIsoBookingDate = (value) => {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  };

  const formatIsoDateAustralian = (value) => {
    if (!isValidIsoBookingDate(value)) return "";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  };

  const dateHelp = form.querySelector("[data-booking-date-help]");
  const dateField = toBookingInput(bookingFields.preferredDate);
  if (dateField instanceof HTMLInputElement) {
    dateField.min = getTodayIsoDate();
    dateField.lang = "en-AU";
    const updateDateHelp = () => {
      if (!(dateHelp instanceof HTMLElement)) return;
      const formatted = formatIsoDateAustralian(dateField.value);
      dateHelp.textContent = formatted
        ? `Selected date: ${formatted}`
        : "Choose a date from the calendar. Selected date is shown as DD/MM/YYYY.";
    };
    dateField.addEventListener("change", updateDateHelp);
    dateField.addEventListener("click", () => {
      try {
        dateField.showPicker?.();
      } catch (error) {
        // Some browsers only expose the native picker through the built-in icon.
      }
    });
    updateDateHelp();
  }

  const setBookingMessageList = (messages) => {
    if (!(messageBox instanceof HTMLElement)) return;
    messageBox.hidden = false;
    messageBox.className = "booking-message is-error";
    messageBox.textContent = "";
    const title = document.createElement("strong");
    title.textContent = "Please fix the following fields:";
    const list = document.createElement("ul");
    list.className = "booking-message__list";
    messages.forEach((message) => {
      const item = document.createElement("li");
      item.textContent = message;
      list.appendChild(item);
    });
    messageBox.append(title, list);
  };

  const isPastBookingDate = (isoDate) => {
    return isoDate < getTodayIsoDate();
  };

  const validateBookingForm = () => {
    clearAllBookingErrors();
    const errors = [];
    let firstInvalidField = null;

    const addError = (field, message) => {
      const input = toBookingInput(field);
      setBookingFieldError(input, message);
      if (!firstInvalidField && input) {
        firstInvalidField = input;
      }
      errors.push(message);
    };

    const requiredFields = [
      [bookingFields.repairCategory, "Repair category is required."],
      [bookingFields.storeSlug, "Store is required."],
      [bookingFields.deviceModel, "Model is required."],
      [bookingFields.issueDescription, "Issue description is required."],
      [bookingFields.preferredDate, "Preferred date is required."],
      [bookingFields.preferredTime, "Preferred time is required."],
      [bookingFields.customerName, "Your name is required."],
      [bookingFields.phone, "Phone number is required."],
      [bookingFields.email, "Email address is required."],
      [bookingFields.preferredContactMethod, "Preferred contact method is required."],
    ];

    for (const [field, message] of requiredFields) {
      const input = toBookingInput(field);
      if (!input || !String(input.value || "").trim()) {
        addError(input, message);
      }
    }

    const preferredDate = String(dateField?.value || "").trim();
    if (preferredDate && !isValidIsoBookingDate(preferredDate)) {
      addError(dateField, "Preferred date must be selected from the calendar.");
    } else if (preferredDate && isPastBookingDate(preferredDate)) {
      addError(dateField, "Preferred date cannot be in the past.");
    }

    const timeField = toBookingInput(bookingFields.preferredTime);
    const preferredTime = String(timeField?.value || "");
    if (preferredTime && !bookingTimeValues.has(preferredTime)) {
      addError(timeField, "Preferred time must be Morning time, Lunch time, or Afternoon time.");
    }

    const emailField = toBookingInput(bookingFields.email);
    const email = String(emailField?.value || "").trim();
    if (email && !isValidEmailAddress(email)) {
      addError(
        emailField,
        "Email must be a valid address, for example name@example.com.au.",
      );
    }

    const phoneField = toBookingInput(bookingFields.phone);
    const phone = String(phoneField?.value || "").trim();
    if (phone && !isValidAustralianPhone(phone)) {
      addError(
        phoneField,
        "Phone must be a valid Australian number, for example 0412 345 678 or +61 412 345 678.",
      );
    }

    const consentField =
      bookingFields.privacyConsent instanceof HTMLInputElement
        ? bookingFields.privacyConsent
        : null;
    if (!consentField?.checked) {
      addError(
        consentField,
        "Contact consent must be confirmed before submitting.",
      );
    }

    if (errors.length) {
      setBookingMessageList(errors);
      firstInvalidField?.focus();
      return { valid: false, errors };
    }

    if (phoneField) {
      phoneField.value = normalizeAustralianPhone(phoneField.value);
    }

    return { valid: true, errors: [] };
  };

  form.addEventListener("input", (event) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement
    ) {
      clearBookingFieldError(target);
    }
  });

  form.addEventListener("change", (event) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement
    ) {
      clearBookingFieldError(target);
    }
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

    const validation = validateBookingForm();
    if (!validation.valid) {
      openModal(
        "error",
        "Please complete the booking form",
        validation.errors.join(" "),
      );
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
      const authAccessToken =
        activeAuthState?.session?.access_token || supabaseAnonKey;
      const payload = Object.fromEntries(formData.entries());
      payload.brand = "";
      payload.phone = normalizeAustralianPhone(String(payload.phone || ""));
      payload.email = String(payload.email || "").trim().toLowerCase();
      payload.preferred_date = String(payload.preferred_date || "").trim();

      if (activeAuthState?.supabase && activeAuthState?.user) {
        await syncCustomerProfile(
          activeAuthState.supabase,
          activeAuthState.user,
          {
            full_name: String(payload.customer_name || "").trim(),
            phone: String(payload.phone || "").trim(),
            email: String(payload.email || "").trim(),
            default_store_slug: String(payload.store_slug || "").trim(),
          },
        );
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
            },
      );

      const raw = await response.text();
      let result;

      try {
        result = JSON.parse(raw);
      } catch (parseError) {
        throw new Error(raw || "The server returned an invalid response.");
      }

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || "Repair request could not be submitted.",
        );
      }

      trackGa4Event("repair_booking_submitted", {
        booking_code: String(result.booking_code || ""),
        repair_category: String(payload.repair_category || ""),
        store_slug: String(payload.store_slug || ""),
      });
      form.reset();

      if (storeField instanceof HTMLSelectElement && storeParam) {
        storeField.value = storeParam;
      }

      setMessage(
        "success",
        result.customer_email_sent
          ? `Repair request submitted successfully. Booking code: ${result.booking_code}. A confirmation email has been sent.`
          : `Repair request submitted successfully. Booking code: ${result.booking_code}.`,
      );
      openModal(
        "success",
        "Repair request submitted",
        `Your repair request has been submitted successfully. Booking code: ${result.booking_code}.`,
      );
      messageBox?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.message
          : "Repair request could not be submitted.";
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

function initBookingStoreFinder() {
  const root = document.querySelector("[data-booking-store-finder]");
  const form = document.querySelector("[data-booking-form]");
  if (!(root instanceof HTMLElement) || !(form instanceof HTMLFormElement)) return;

  const searchForm = root.querySelector("[data-booking-store-search-form]");
  const searchInput = root.querySelector("[data-booking-store-search]");
  const locateButton = root.querySelector("[data-booking-store-locate]");
  const statusTarget = root.querySelector("[data-booking-store-status]");
  const resultsTarget = root.querySelector("[data-booking-store-results]");
  const mapFrame = root.querySelector("[data-booking-store-map]");
  const storeField = form.elements.namedItem("store_slug");
  const storeOrder = [
    "park-ridge",
    "fairfield",
    "toowong",
    "north-lakes",
    "brassall",
  ];
  const defaultOrigin = { latitude: -27.485, longitude: 153.02 };
  let currentOrigin = null;
  let selectedSlug =
    storeField instanceof HTMLSelectElement ? String(storeField.value || "") : "";

  const knownLocations = [
    { terms: ["park ridge", "4125"], latitude: -27.6966, longitude: 153.0392 },
    { terms: ["browns plains", "4118"], latitude: -27.6627, longitude: 153.0411 },
    { terms: ["munruben"], latitude: -27.7469, longitude: 153.0304 },
    { terms: ["bethania", "4205"], latitude: -27.6883, longitude: 153.1594 },
    { terms: ["fairfield", "4103"], latitude: -27.5097, longitude: 153.0245 },
    { terms: ["annerley"], latitude: -27.5129, longitude: 153.032 },
    { terms: ["yeronga", "4104"], latitude: -27.5152, longitude: 153.0164 },
    { terms: ["toowong", "4066"], latitude: -27.4854, longitude: 152.9922 },
    { terms: ["indooroopilly", "4068"], latitude: -27.499, longitude: 152.973 },
    { terms: ["brisbane", "4000"], latitude: -27.4698, longitude: 153.0251 },
    { terms: ["north lakes", "4509"], latitude: -27.2409, longitude: 153.0189 },
    { terms: ["mango hill"], latitude: -27.2434, longitude: 153.0255 },
    { terms: ["deception bay", "4508"], latitude: -27.1937, longitude: 153.0266 },
    { terms: ["brassall", "4305"], latitude: -27.5969, longitude: 152.7471 },
    { terms: ["ipswich", "4305"], latitude: -27.6146, longitude: 152.7609 },
    { terms: ["redbank plains", "4301"], latitude: -27.6461, longitude: 152.8595 },
    { terms: ["logan", "4114"], latitude: -27.6392, longitude: 153.1094 },
  ];

  const setStatus = (message) => {
    if (statusTarget instanceof HTMLElement) {
      statusTarget.textContent = message;
    }
  };

  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const getDistanceKm = (from, to) => {
    const earthRadiusKm = 6371;
    const deltaLat = toRadians(to.latitude - from.latitude);
    const deltaLng = toRadians(to.longitude - from.longitude);
    const fromLat = toRadians(from.latitude);
    const toLat = toRadians(to.latitude);
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;
    return (
      earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
    );
  };

  const formatDistance = (distanceKm) => {
    if (!Number.isFinite(distanceKm)) return "";
    if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
    return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
  };

  const getStoreItems = (origin = currentOrigin || defaultOrigin) =>
    storeOrder
      .map((slug) => {
        const store = STORE_CHECKOUT_DETAILS[slug];
        if (!store?.coordinates) return null;
        return {
          slug,
          store,
          distanceKm: currentOrigin
            ? getDistanceKm(origin, store.coordinates)
            : Number.POSITIVE_INFINITY,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (!currentOrigin) return storeOrder.indexOf(left.slug) - storeOrder.indexOf(right.slug);
        return left.distanceKm - right.distanceKm;
      });

  const getDirectionsUrl = (store, origin = currentOrigin) => {
    const params = new URLSearchParams({
      api: "1",
      destination: store?.coordinates
        ? `${store.coordinates.latitude},${store.coordinates.longitude}`
        : String(store?.address || ""),
    });
    if (origin?.latitude && origin?.longitude) {
      params.set("origin", `${origin.latitude},${origin.longitude}`);
    }
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  };

  const getMapSrc = (store) => {
    const query = store?.address || "OZ Tech M8 Queensland Australia";
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  };

  const updateMap = (slug) => {
    const store = STORE_CHECKOUT_DETAILS[slug];
    if (mapFrame instanceof HTMLIFrameElement && store) {
      mapFrame.src = getMapSrc(store);
      mapFrame.title = `TECHM8 ${store.title} map`;
    }
  };

  const selectStore = (slug, options = {}) => {
    const store = STORE_CHECKOUT_DETAILS[slug];
    if (!store) return;
    selectedSlug = slug;
    if (storeField instanceof HTMLSelectElement) {
      storeField.value = slug;
      storeField.dispatchEvent(new Event("change", { bubbles: true }));
    }
    updateMap(slug);
    renderResults();
    if (options.announce) {
      setStatus(`${store.title} selected for this repair request.`);
    }
  };

  const renderResults = () => {
    if (!(resultsTarget instanceof HTMLElement)) return;
    const items = getStoreItems();
    resultsTarget.innerHTML = items
      .map((item, index) => {
        const isSelected = item.slug === selectedSlug;
        const distance = Number.isFinite(item.distanceKm)
          ? `<span class="booking-store-finder__distance">${escapeHtml(formatDistance(item.distanceKm))}</span>`
          : "";
        return `
          <article class="booking-store-finder__result${isSelected ? " is-selected" : ""}" data-booking-store-card="${escapeHtml(item.slug)}">
            <div class="booking-store-finder__result-top">
              <div>
                <strong>${escapeHtml(item.store.title)}</strong>
                <span>${currentOrigin ? `#${index + 1} nearest` : "TECHM8 store"}</span>
              </div>
              ${distance}
            </div>
            <p>${escapeHtml(item.store.address)}</p>
            <div class="booking-store-finder__actions">
              <button type="button" data-booking-store-select="${escapeHtml(item.slug)}">${isSelected ? "Selected" : "Set as store"}</button>
              <a href="${escapeHtml(getDirectionsUrl(item.store))}" target="_blank" rel="noopener">Directions</a>
            </div>
          </article>
        `;
      })
      .join("");
  };

  const normalizeSearch = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ");

  const findKnownLocation = (query) => {
    const normalized = normalizeSearch(query);
    if (!normalized) return null;

    const storeMatch = storeOrder
      .map((slug) => STORE_CHECKOUT_DETAILS[slug])
      .find((store) => {
        const searchable = normalizeSearch(`${store?.title || ""} ${store?.address || ""}`);
        return searchable.includes(normalized) || normalized.includes(normalizeSearch(store?.title));
      });
    if (storeMatch?.coordinates) return storeMatch.coordinates;

    const known = knownLocations
      .map((location) => {
        const bestTerm = location.terms
          .map((term) => normalizeSearch(term))
          .filter((term) => normalized.includes(term))
          .sort((left, right) => right.length - left.length)[0];
        return bestTerm ? { ...location, score: bestTerm.length } : null;
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score)[0];
    return known
      ? { latitude: known.latitude, longitude: known.longitude }
      : null;
  };

  const applyOrigin = (origin, label) => {
    currentOrigin = origin;
    const nearest = getStoreItems(origin)[0];
    if (nearest) {
      selectStore(nearest.slug);
      setStatus(`${label} Closest store: ${nearest.store.title}.`);
    }
  };

  const searchLocation = (query) => {
    const trimmed = String(query || "").trim();
    if (!trimmed) {
      setStatus("Enter a suburb, postcode or address to sort stores by distance.");
      return;
    }

    const known = findKnownLocation(trimmed);
    if (known) {
      applyOrigin(known, "Stores sorted by your search.");
      return;
    }

    setStatus("Searching for that location.");
    loadGoogleMapsApi()
      .then(
        (maps) =>
          new Promise((resolve, reject) => {
            const geocoder = new maps.Geocoder();
            geocoder.geocode(
              {
                address: trimmed,
                componentRestrictions: { country: "AU" },
                region: "au",
              },
              (results, status) => {
                const location = results?.[0]?.geometry?.location;
                if (status === "OK" && location) {
                  resolve({
                    latitude: location.lat(),
                    longitude: location.lng(),
                  });
                } else {
                  reject(new Error("Location not found."));
                }
              },
            );
          }),
      )
      .then((origin) => applyOrigin(origin, "Stores sorted by your search."))
      .catch(() => {
        setStatus(
          "That location could not be found. Try a suburb, postcode or nearby landmark.",
        );
      });
  };

  if (searchForm instanceof HTMLFormElement) {
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      searchLocation(searchInput instanceof HTMLInputElement ? searchInput.value : "");
    });
  }

  if (locateButton instanceof HTMLButtonElement) {
    locateButton.addEventListener("click", () => {
      if (!("geolocation" in navigator)) {
        setStatus("Your browser does not support location access. Search by suburb or postcode.");
        return;
      }
      locateButton.disabled = true;
      locateButton.textContent = "Finding location...";
      setStatus("Allow location access in your browser to sort stores by distance.");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          locateButton.disabled = false;
          locateButton.textContent = "Use my current location";
          applyOrigin(
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            "Stores sorted by your current location.",
          );
        },
        () => {
          locateButton.disabled = false;
          locateButton.textContent = "Use my current location";
          setStatus("Location access was not available. Search by suburb or postcode.");
        },
        {
          enableHighAccuracy: false,
          maximumAge: 300000,
          timeout: 10000,
        },
      );
    });
  }

  resultsTarget?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const selectButton = target.closest("[data-booking-store-select]");
    if (!(selectButton instanceof HTMLElement)) return;
    selectStore(selectButton.getAttribute("data-booking-store-select") || "", {
      announce: true,
    });
  });

  if (storeField instanceof HTMLSelectElement) {
    storeField.addEventListener("change", () => {
      const nextSlug = String(storeField.value || "");
      if (nextSlug && nextSlug !== selectedSlug) {
        selectedSlug = nextSlug;
        updateMap(nextSlug);
        renderResults();
      }
    });
  }

  renderResults();
  if (selectedSlug) {
    updateMap(selectedSlug);
  }
}

function initNavigation() {
  decorateMobileMenu();
  decorateStoreLocatorMenu();
  decorateMobileRepairsAccordion();
  initStoreSearch();

  const mobileInput = document.querySelector(".nav__mobile-input");
  const navMenu = document.querySelector(".nav__menu");
  const navToggle = document.querySelector(
    ".nav__toggle--open, .nav > .nav__toggle",
  );
  const navOverlay = document.querySelector(".nav__overlay");
  const navCloseToggle = document.querySelector(".nav__toggle--close");
  const navDropdowns = document.querySelectorAll(".nav__dropdown");
  const navDropdownToggles = document.querySelectorAll(".nav__dropdown-toggle");
  const navSubmenuToggles = document.querySelectorAll(".nav__submenu-toggle");
  const mobileRepairsToggles = document.querySelectorAll(
    ".nav__mobile-repairs-toggle",
  );

  const interceptMobileRepairsToggle = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const mobileRepairsToggle = target.closest(".nav__mobile-repairs-toggle");
    if (!(mobileRepairsToggle instanceof HTMLButtonElement)) return;

    handleMobileRepairsActivation(event, mobileRepairsToggle);
  };

  navMenu?.addEventListener("touchstart", interceptMobileRepairsToggle, {
    capture: true,
    passive: false,
  });
  navMenu?.addEventListener("touchend", interceptMobileRepairsToggle, {
    capture: true,
    passive: false,
  });
  navMenu?.addEventListener("pointerdown", interceptMobileRepairsToggle, true);
  navMenu?.addEventListener("pointerup", interceptMobileRepairsToggle, true);
  navMenu?.addEventListener("click", interceptMobileRepairsToggle, true);

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
    toggle.addEventListener(
      "touchstart",
      (event) => {
        event.stopPropagation();
        keepMobileMenuOpen();
      },
      { passive: true },
    );
  });

  mobileRepairsToggles.forEach((toggle) => {
    if (!(toggle instanceof HTMLButtonElement)) return;
    if (toggle.dataset.navBound === "true") return;
    toggle.dataset.navBound = "true";
    toggle.addEventListener(
      "touchstart",
      (event) => {
        event.stopPropagation();
        keepMobileMenuOpen();
      },
      { passive: true },
    );
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
    if (target.closest(".nav__mobile-repairs-toggle")) return;
    if (target.closest(".nav__mobile-repairs-panel")) return;
    if (target.closest(".nav__dropdown")) return;

    closeAllDropdowns();
    closeAllSubmenus();
  });

  window.addEventListener("resize", () => {
    document
      .querySelectorAll(".nav__dropdown--repairs.is-open")
      .forEach((dropdown) => {
        expandMobileRepairsContainer(dropdown);
      });
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
  const message = String(
    error?.message || error || "Authentication request failed.",
  );
  if (/Invalid login credentials/i.test(message))
    return "The email or password is incorrect.";
  if (/Email rate limit exceeded/i.test(message))
    return "Too many email requests were sent. Please wait and try again.";
  if (/User already registered/i.test(message))
    return "This email is already registered. Sign in first or use a different email address.";
  if (/provider is not enabled/i.test(message))
    return "This login provider is not enabled in Supabase Auth yet.";
  return message;
}

function isValidEmailAddress(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(email || "").trim());
}

function isValidAccountPassword(password) {
  const value = String(password || "");
  return /[A-Za-z]/.test(value) && /\d/.test(value);
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

function isValidAustralianMobile(phone) {
  return /^\+614\d{8}$/.test(normalizeAustralianPhone(phone));
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
    setAuthMessage(
      messageBox,
      "Supabase Auth could not be loaded on this page.",
      "error",
    );
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

  const {
    data: { session: initialSession },
  } = await supabase.auth.getSession();
  await renderSession(initialSession);

  supabase.auth.onAuthStateChange((_event, session) => {
    renderSession(session);
  });

  if (googleButton instanceof HTMLButtonElement) {
    googleButton.addEventListener("click", async () => {
      try {
        setAuthMessage(messageBox, "");
        trackGa4Event("login", {
          method: "google",
          context: "account",
        });
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
        trackGa4Event("login", {
          method: "facebook",
          context: "account",
        });
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
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        trackGa4Event("login", {
          method: "email",
          context: "account",
        });
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
      button.setAttribute(
        "aria-pressed",
        nextType === "text" ? "true" : "false",
      );
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
  const ordersPreviewTarget = root.querySelector(
    "[data-account-orders-preview]",
  );
  const repairsPreviewTarget = root.querySelector(
    "[data-account-repairs-preview]",
  );

  let supabase;

  try {
    supabase = await getSupabaseBrowserClient();
  } catch (error) {
    setAuthMessage(
      messageBox,
      "Supabase Auth could not be loaded on this page.",
      "error",
    );
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

    if (nameTarget instanceof HTMLElement)
      nameTarget.textContent = String(
        profile?.full_name || getUserDisplayName(user),
      );
    if (emailTarget instanceof HTMLElement)
      emailTarget.textContent = String(
        profile?.email || user.email || "No email",
      );
    if (phoneTarget instanceof HTMLElement)
      phoneTarget.textContent = String(
        profile?.phone || user.user_metadata?.phone || "Phone not saved",
      );
    if (statusTarget instanceof HTMLElement)
      statusTarget.textContent = verified
        ? "Signed in"
        : "Pending email verification";
    if (verifiedTarget instanceof HTMLElement) {
      verifiedTarget.textContent = verified
        ? "Email verified"
        : "Verification pending";
    }
    renderHistoryPreview(ordersPreviewTarget, orders, "orders");
    renderHistoryPreview(repairsPreviewTarget, repairs, "repairs");
  };

  const {
    data: { session: initialSession },
  } = await supabase.auth.getSession();
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
  const passwordField = registerForm.elements.namedItem("password");
  const confirmPasswordField =
    registerForm.elements.namedItem("confirm_password");
  const passwordMatchMessage = root.querySelector(
    "[data-password-match-message]",
  );

  const updateRegisterPasswordState = () => {
    if (
      !(passwordField instanceof HTMLInputElement) ||
      !(confirmPasswordField instanceof HTMLInputElement) ||
      !(passwordMatchMessage instanceof HTMLElement)
    ) {
      return true;
    }

    const password = String(passwordField.value || "");
    const confirmPassword = String(confirmPasswordField.value || "");
    const passwordMeetsRule = isValidAccountPassword(password);

    passwordField.classList.toggle(
      "is-invalid",
      Boolean(password && !passwordMeetsRule),
    );
    passwordField.setCustomValidity(
      password && !passwordMeetsRule
        ? "Password must include English letters and numbers."
        : "",
    );
    passwordMatchMessage.classList.remove(
      "auth-single__hint--error",
      "auth-single__hint--success",
    );

    if (!confirmPassword) {
      passwordMatchMessage.hidden = true;
      passwordMatchMessage.textContent = "";
      confirmPasswordField.classList.remove("is-invalid");
      confirmPasswordField.setCustomValidity("");
      return passwordMeetsRule;
    }

    if (password === confirmPassword && passwordMeetsRule) {
      passwordMatchMessage.hidden = false;
      passwordMatchMessage.textContent = "Passwords match.";
      passwordMatchMessage.classList.add("auth-single__hint--success");
      confirmPasswordField.classList.remove("is-invalid");
      confirmPasswordField.setCustomValidity("");
      return true;
    }

    passwordMatchMessage.hidden = false;
    passwordMatchMessage.textContent =
      password === confirmPassword
        ? "Password must include English letters and numbers."
        : "Passwords do not match.";
    passwordMatchMessage.classList.add("auth-single__hint--error");
    confirmPasswordField.classList.add("is-invalid");
    confirmPasswordField.setCustomValidity(passwordMatchMessage.textContent);
    return false;
  };

  if (
    passwordField instanceof HTMLInputElement &&
    confirmPasswordField instanceof HTMLInputElement
  ) {
    [passwordField, confirmPasswordField].forEach((input) => {
      input.addEventListener("input", updateRegisterPasswordState);
    });
  }

  let supabase;
  try {
    supabase = await getSupabaseBrowserClient();
  } catch (error) {
    setAuthMessage(
      messageBox,
      "Supabase Auth could not be loaded on this page.",
      "error",
    );
    return;
  }

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const fullName = String(formData.get("full_name") || "").trim();
    const phone = normalizeAustralianPhone(
      String(formData.get("phone") || "").trim(),
    );
    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirm_password") || "");

    if (!fullName || !phone || !email || !password) {
      setAuthMessage(
        messageBox,
        "Please complete all required registration fields.",
        "error",
      );
      return;
    }

    if (!isValidEmailAddress(email)) {
      setAuthMessage(
        messageBox,
        "Please enter a valid email address.",
        "error",
      );
      return;
    }

    if (!isValidAustralianPhone(phone)) {
      setAuthMessage(
        messageBox,
        "Please enter a valid Australian phone number.",
        "error",
      );
      return;
    }

    if (!isValidAccountPassword(password)) {
      setAuthMessage(
        messageBox,
        "Password must include English letters and numbers.",
        "error",
      );
      if (passwordField instanceof HTMLInputElement) passwordField.focus();
      return;
    }

    if (password !== confirmPassword) {
      setAuthMessage(
        messageBox,
        "Password confirmation does not match.",
        "error",
      );
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

      setAuthMessage(
        messageBox,
        "Registration submitted. Check your email and verify the account before signing in.",
      );
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
    setAuthMessage(
      messageBox,
      "Supabase Auth could not be loaded on this page.",
      "error",
    );
    return;
  }

  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(resetForm);
    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();

    if (!email) {
      setAuthMessage(
        messageBox,
        "Enter an email address to send a reset link.",
        "error",
      );
      return;
    }

    if (!isValidEmailAddress(email)) {
      setAuthMessage(messageBox, "Enter a valid email address.", "error");
      return;
    }

    try {
      setAuthMessage(messageBox, "");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getPasswordRecoveryRedirectUrl(),
      });
      if (error) throw error;
      setAuthMessage(
        messageBox,
        "Password reset link sent. Check your email inbox.",
      );
      resetForm.reset();
    } catch (error) {
      setAuthMessage(messageBox, getReadableAuthError(error), "error");
    }
  });
}

async function initResetPasswordPage() {
  const root = document.querySelector("[data-password-update-page]");
  if (!(root instanceof HTMLElement)) return;

  const messageBox = root.querySelector("[data-auth-message]");
  const form = root.querySelector("[data-password-update-form]");
  if (!(form instanceof HTMLFormElement)) return;

  const passwordField = form.elements.namedItem("password");
  const confirmPasswordField = form.elements.namedItem("confirm_password");
  const passwordMatchMessage = root.querySelector(
    "[data-password-match-message]",
  );

  const updatePasswordState = () => {
    if (
      !(passwordField instanceof HTMLInputElement) ||
      !(confirmPasswordField instanceof HTMLInputElement) ||
      !(passwordMatchMessage instanceof HTMLElement)
    ) {
      return true;
    }

    const password = String(passwordField.value || "");
    const confirmPassword = String(confirmPasswordField.value || "");
    const passwordMeetsRule = isValidAccountPassword(password);

    passwordField.classList.toggle(
      "is-invalid",
      Boolean(password && !passwordMeetsRule),
    );
    passwordField.setCustomValidity(
      password && !passwordMeetsRule
        ? "Password must include English letters and numbers."
        : "",
    );
    passwordMatchMessage.classList.remove(
      "auth-single__hint--error",
      "auth-single__hint--success",
    );

    if (!confirmPassword) {
      passwordMatchMessage.hidden = true;
      passwordMatchMessage.textContent = "";
      confirmPasswordField.classList.remove("is-invalid");
      confirmPasswordField.setCustomValidity("");
      return passwordMeetsRule;
    }

    if (password === confirmPassword && passwordMeetsRule) {
      passwordMatchMessage.hidden = false;
      passwordMatchMessage.textContent = "Passwords match.";
      passwordMatchMessage.classList.add("auth-single__hint--success");
      confirmPasswordField.classList.remove("is-invalid");
      confirmPasswordField.setCustomValidity("");
      return true;
    }

    passwordMatchMessage.hidden = false;
    passwordMatchMessage.textContent =
      password === confirmPassword
        ? "Password must include English letters and numbers."
        : "Passwords do not match.";
    passwordMatchMessage.classList.add("auth-single__hint--error");
    confirmPasswordField.classList.add("is-invalid");
    confirmPasswordField.setCustomValidity(passwordMatchMessage.textContent);
    return false;
  };

  if (
    passwordField instanceof HTMLInputElement &&
    confirmPasswordField instanceof HTMLInputElement
  ) {
    [passwordField, confirmPasswordField].forEach((input) => {
      input.addEventListener("input", updatePasswordState);
    });
  }

  let supabase;
  try {
    supabase = await getSupabaseBrowserClient();
  } catch (error) {
    setAuthMessage(
      messageBox,
      "Supabase Auth could not be loaded on this page.",
      "error",
    );
    return;
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setAuthMessage(
        messageBox,
        "Open this page from the reset password email link before setting a new password.",
        "error",
      );
    }
  } catch (error) {
    setAuthMessage(messageBox, getReadableAuthError(error), "error");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = String(form.elements.namedItem("password")?.value || "");
    const confirmPassword = String(
      form.elements.namedItem("confirm_password")?.value || "",
    );

    if (!isValidAccountPassword(password)) {
      setAuthMessage(
        messageBox,
        "Password must include English letters and numbers.",
        "error",
      );
      if (passwordField instanceof HTMLInputElement) passwordField.focus();
      return;
    }

    if (password !== confirmPassword) {
      setAuthMessage(messageBox, "Passwords do not match.", "error");
      if (confirmPasswordField instanceof HTMLInputElement) {
        confirmPasswordField.focus();
      }
      return;
    }

    try {
      setAuthMessage(messageBox, "");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setAuthMessage(
        messageBox,
        "Password updated successfully. Redirecting to your account...",
      );
      setTimeout(() => {
        window.location.assign(getAccountHomeUrl());
      }, 900);
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

async function initAccountSidebarSignOut() {
  const nav = document.querySelector(".account-sidebar__nav");
  if (
    !(nav instanceof HTMLElement) ||
    nav.querySelector("[data-account-sidebar-logout]")
  )
    return;

  const messageTarget = document.querySelector(
    "[data-account-details-message], [data-delivery-address-message], [data-pending-orders-message], [data-completed-orders-message], [data-repair-bookings-message], [data-warranty-returns-message], [data-account-message], [data-auth-message]",
  );
  const signOutButton = document.createElement("button");
  signOutButton.type = "button";
  signOutButton.className = "account-sidebar__link account-sidebar__signout";
  signOutButton.setAttribute("data-account-sidebar-logout", "true");
  signOutButton.textContent = "Sign out";
  nav.appendChild(signOutButton);

  let authState = null;
  try {
    authState = await getCurrentAuthState();
  } catch (error) {
    signOutButton.hidden = true;
    return;
  }

  if (!authState?.user || !authState?.supabase) {
    signOutButton.hidden = true;
    return;
  }

  signOutButton.addEventListener("click", async () => {
    signOutButton.disabled = true;
    signOutButton.textContent = "Signing out...";
    try {
      const { error } = await authState.supabase.auth.signOut();
      if (error) throw error;
      window.location.assign(getAuthRedirectUrl());
    } catch (error) {
      signOutButton.disabled = false;
      signOutButton.textContent = "Sign out";
      if (messageTarget instanceof HTMLElement) {
        setAuthMessage(messageTarget, getReadableAuthError(error), "error");
      }
    }
  });
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
  fillFormField(
    form,
    "phone",
    profile?.phone || user?.user_metadata?.phone || "",
    true,
  );
  fillFormField(form, "business_name", profile?.business_name || "", true);
  fillFormField(form, "address_line_1", profile?.address_line_1 || "", true);
  fillFormField(form, "address_line_2", profile?.address_line_2 || "", true);
  fillFormField(form, "suburb", profile?.suburb || "", true);
  fillFormField(form, "postcode", profile?.postcode || "", true);
  fillFormField(form, "state", profile?.state || "", true);
  fillFormField(
    form,
    "default_store_slug",
    profile?.default_store_slug || "",
    true,
  );
  setCheckboxField(form, "service_email_opt_in", profile?.service_email_opt_in);
  setCheckboxField(form, "marketing_opt_in", profile?.marketing_opt_in);
}

function populateDeliveryAddressForm(form, profile, user) {
  if (!(form instanceof HTMLFormElement)) return;
  const { firstName, lastName } = splitProfileName(profile, user);

  fillFormField(form, "first_name", firstName, true);
  fillFormField(form, "last_name", lastName, true);
  fillFormField(
    form,
    "phone",
    profile?.phone || user?.user_metadata?.phone || "",
    true,
  );
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
    .map((value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    )
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
    .map((value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    )
    .join(" ");
}

function isCompletedOrderRecord(record) {
  const status = String(record?.status || "")
    .trim()
    .toLowerCase();
  const fulfillmentStatus = String(record?.fulfillment_status || "")
    .trim()
    .toLowerCase();
  return (
    ["completed", "complete", "closed"].includes(status) ||
    [
      "completed",
      "fulfilled",
      "delivered",
      "collected",
      "picked_up",
      "picked up",
    ].includes(fulfillmentStatus)
  );
}

function renderAccountOrderCards(target, records, mode = "all") {
  if (!(target instanceof HTMLElement)) return;

  if (!Array.isArray(records) || !records.length) {
    target.innerHTML = `
      <article class="account-empty-card">
        <h3>${mode === "pending" ? "No pending orders" : "No completed orders"}</h3>
        <p>${
          mode === "pending"
            ? "New and in-progress orders linked to this account will appear here."
            : "Completed orders linked to this account will appear here once they are fulfilled."
        }</p>
      </article>
    `;
    return;
  }

  target.innerHTML = records
    .map(
      (record) => `
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
          ${buildCustomerInvoiceLinks(record, { primaryClass: "account-button", secondaryClass: "account-button--secondary" })}
          <a class="account-button--secondary" href="/shop.html">Browse store</a>
          <a class="account-button" href="/cart.html">${mode === "pending" ? "View cart" : "Shop again"}</a>
        </div>
      </div>
    </article>
  `,
    )
    .join("");
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

  target.innerHTML = records
    .map(
      (record) => `
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
          <a class="account-button--secondary" href="/stores.html">Find store</a>
          <a class="account-button" href="/book-repair.html">Book again</a>
        </div>
      </div>
    </article>
  `,
    )
    .join("");
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
    const profile = await loadResolvedCustomerProfile(
      authState.supabase,
      authState.user,
    );
    populateAccountDetailsForm(form, profile, authState.user);
  } catch (error) {
    setAuthMessage(
      messageTarget,
      error instanceof Error ? error.message : "Profile could not be loaded.",
      "error",
    );
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();
    const phone = normalizeAustralianPhone(
      String(formData.get("phone") || "").trim(),
    );
    const postcode = String(formData.get("postcode") || "").trim();

    if (!email || !isValidEmailAddress(email)) {
      setAuthMessage(messageTarget, "Enter a valid email address.", "error");
      return;
    }

    if (phone && !isValidAustralianPhone(phone)) {
      setAuthMessage(
        messageTarget,
        "Enter a valid Australian phone number.",
        "error",
      );
      return;
    }

    if (postcode && !/^\d{4}$/.test(postcode)) {
      setAuthMessage(
        messageTarget,
        "Post code must be a valid 4-digit Australian postcode.",
        "error",
      );
      return;
    }

    try {
      await upsertCustomerProfile(
        authState.supabase,
        authState.user,
        {
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
          default_store_slug: String(
            formData.get("default_store_slug") || "",
          ).trim(),
          service_email_opt_in: formData.get("service_email_opt_in") === "true",
          marketing_opt_in: formData.get("marketing_opt_in") === "true",
        },
        { allowLegacyFallback: false },
      );
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
    const profile = await loadResolvedCustomerProfile(
      authState.supabase,
      authState.user,
    );
    populateDeliveryAddressForm(form, profile, authState.user);
  } catch (error) {
    setAuthMessage(
      messageTarget,
      error instanceof Error
        ? error.message
        : "Saved address could not be loaded.",
      "error",
    );
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const phone = normalizeAustralianPhone(
      String(formData.get("phone") || "").trim(),
    );
    const postcode = String(formData.get("postcode") || "").trim();

    if (
      !String(formData.get("address_line_1") || "").trim() ||
      !String(formData.get("suburb") || "").trim()
    ) {
      setAuthMessage(
        messageTarget,
        "Address line 1 and suburb are required.",
        "error",
      );
      return;
    }

    if (phone && !isValidAustralianPhone(phone)) {
      setAuthMessage(
        messageTarget,
        "Enter a valid Australian phone number.",
        "error",
      );
      return;
    }

    if (!/^\d{4}$/.test(postcode)) {
      setAuthMessage(
        messageTarget,
        "Post code must be a valid 4-digit Australian postcode.",
        "error",
      );
      return;
    }

    try {
      await upsertCustomerProfile(
        authState.supabase,
        authState.user,
        {
          first_name: String(formData.get("first_name") || "").trim(),
          last_name: String(formData.get("last_name") || "").trim(),
          phone,
          business_name: String(formData.get("business_name") || "").trim(),
          address_line_1: String(formData.get("address_line_1") || "").trim(),
          address_line_2: String(formData.get("address_line_2") || "").trim(),
          suburb: String(formData.get("suburb") || "").trim(),
          postcode,
          state: String(formData.get("state") || "").trim(),
        },
        { allowLegacyFallback: false },
      );
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
    const records = await loadCustomerOrders(
      authState.supabase,
      authState.user,
      100,
    );
    const pendingRecords = records.filter(
      (record) => !isCompletedOrderRecord(record),
    );
    if (badgeTarget instanceof HTMLElement) {
      badgeTarget.textContent = String(pendingRecords.length);
    }

    const render = () => {
      const query = String(queryInput?.value || "")
        .trim()
        .toLowerCase();
      const filtered = !query
        ? pendingRecords
        : pendingRecords.filter((record) =>
            normalizeOrderSearchRecord(record).includes(query),
          );
      renderAccountOrderCards(listTarget, filtered, "pending");
      setAuthMessage(
        messageTarget,
        `Showing ${filtered.length} pending order${filtered.length === 1 ? "" : "s"}.`,
      );
    };

    render();
    queryInput?.addEventListener("input", render);
  } catch (error) {
    setAuthMessage(
      messageTarget,
      error instanceof Error
        ? error.message
        : "Pending orders could not be loaded.",
      "error",
    );
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
    const records = await loadCustomerOrders(
      authState.supabase,
      authState.user,
      100,
    );
    const completedRecords = records.filter((record) =>
      isCompletedOrderRecord(record),
    );

    const render = () => {
      const query = String(queryInput?.value || "")
        .trim()
        .toLowerCase();
      const filtered = !query
        ? completedRecords
        : completedRecords.filter((record) =>
            normalizeOrderSearchRecord(record).includes(query),
          );
      renderAccountOrderCards(listTarget, filtered, "completed");
      setAuthMessage(
        messageTarget,
        `Showing ${filtered.length} completed order${filtered.length === 1 ? "" : "s"}.`,
      );
    };

    render();
    queryInput?.addEventListener("input", render);
  } catch (error) {
    setAuthMessage(
      messageTarget,
      error instanceof Error
        ? error.message
        : "Completed orders could not be loaded.",
      "error",
    );
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
    const records = await loadCustomerRepairBookings(
      authState.supabase,
      authState.user,
      100,
    );

    const render = () => {
      const query = String(queryInput?.value || "")
        .trim()
        .toLowerCase();
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
      setAuthMessage(
        messageTarget,
        `Showing ${filtered.length} repair booking${filtered.length === 1 ? "" : "s"}.`,
      );
    };

    render();
    queryInput?.addEventListener("input", render);
    rangeSelect?.addEventListener("change", render);
  } catch (error) {
    setAuthMessage(
      messageTarget,
      error instanceof Error
        ? error.message
        : "Repair bookings could not be loaded.",
      "error",
    );
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
    setAuthMessage(
      messageTarget,
      "Warranty and return records are ready for backend connection. This page layout is in place.",
      "success",
    );
  }

  searchButton?.addEventListener("click", () => {
    const query = String(queryInput?.value || "").trim();
    if (messageTarget instanceof HTMLElement) {
      setAuthMessage(
        messageTarget,
        query
          ? `Warranty search for "${query}" is ready once the warranty table is connected.`
          : "Enter an RA number or product name to search once the warranty backend is connected.",
        query ? "success" : "error",
      );
    }
  });

  returnButton?.addEventListener("click", () => {
    window.location.assign("/store-policy.html");
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
    const records = await loadCustomerOrders(
      authState.supabase,
      authState.user,
      100,
    );
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
      messageTarget.textContent =
        error instanceof Error
          ? error.message
          : "Order history could not be loaded.";
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
    const records = await loadCustomerRepairBookings(
      authState.supabase,
      authState.user,
      100,
    );
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
      messageTarget.textContent =
        error instanceof Error
          ? error.message
          : "Repair history could not be loaded.";
    }
    renderHistoryList(listTarget, [], "repairs");
  }
}

function initPage() {
  initCookieConsentBanner();
  initGa4LinkTracking();
  initCustomerOrderDocumentDownloads();
  ensureAccountNavLink();
  ensureGlobalCartUi();
  initProductNavigationCache();
  updateCartIndicators();
  window.addEventListener("storage", () => updateCartIndicators());
  initFilters();
  initNavigation();
  initStoresLocator();
  initHomeBanner();
  initRepairCountMeter();
  initHomeFeaturedProducts();
  initStorefront();
  initCategoryPage();
  initProductDetailPage();
  initCartPage();
  initCheckoutPage();
  initCheckoutSuccessPage();
  initBookingForm();
  initBookingStoreFinder();
  initAccountPage();
  initAccountDashboardPage();
  initAccountSidebarSignOut();
  initAccountDetailsPage();
  initDeliveryAddressPage();
  initPendingOrdersPage();
  initCompletedOrdersPage();
  initRepairBookingsPage();
  initWarrantyReturnsPage();
  initRegisterPage();
  initForgotPasswordPage();
  initResetPasswordPage();
  initMyOrdersPage();
  initMyRepairsPage();
  initZipMarketingAssets();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}
