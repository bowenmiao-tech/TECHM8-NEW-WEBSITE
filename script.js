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

function decorateMobileMenu() {
  const nav = document.querySelector(".nav");
  const navMenu = nav?.querySelector(".nav__menu");
  const mobileInput = nav?.querySelector(".nav__mobile-input");
  const openToggle = nav?.querySelector(".nav__toggle");
  const brand = nav?.querySelector(".brand");

  if (!nav || !navMenu || !mobileInput || !openToggle || !brand) return;

  if (!nav.querySelector(".nav__overlay")) {
    const overlay = document.createElement("label");
    overlay.className = "nav__overlay";
    overlay.setAttribute("for", mobileInput.id);
    overlay.setAttribute("aria-label", "Close menu");
    openToggle.insertAdjacentElement("afterend", overlay);
  }

  if (!navMenu.querySelector(".nav__menu-header")) {
    const menuHeader = document.createElement("div");
    menuHeader.className = "nav__menu-header";

    const brandClone = brand.cloneNode(true);
    brandClone.classList.add("brand--menu");

    const closeToggle = document.createElement("label");
    closeToggle.className = "nav__toggle nav__toggle--close";
    closeToggle.setAttribute("for", mobileInput.id);
    closeToggle.setAttribute("aria-label", "Close menu");
    closeToggle.innerHTML = "<span></span><span></span>";

    menuHeader.append(brandClone, closeToggle);
    navMenu.prepend(menuHeader);
  }
}

function handleDropdownToggle(event, dropdownToggle) {
  const dropdown = dropdownToggle.closest(".nav__dropdown");
  if (!dropdown) return;

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

function handleSubmenuToggle(event, toggle) {
  event.preventDefault();
  event.stopPropagation();

  const group = toggle.closest(".nav__dropdown-group");
  if (!group) return false;

  const isOpen = group.classList.contains("is-open");
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
    if (menu.querySelector(".nav__cart-link")) return;

    const cartLink = document.createElement("a");
    cartLink.className = "nav__cart-link";
    cartLink.href = "cart.html";
    cartLink.innerHTML = 'Cart <span class="nav__cart-count" data-cart-count>0</span>';

    const shopLink = menu.querySelector(".nav__shop-link");
    if (shopLink?.parentNode === menu) {
      menu.insertBefore(cartLink, shopLink);
    } else {
      menu.appendChild(cartLink);
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
    image_url: product.display_image || product.image_url || "",
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
      display_image: product.image_url || "",
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
    const visibleProducts = state.products.filter((product) => {
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
      const productsUrl = `${supabaseUrl}/rest/v1/products?select=id,sku,slug,name,brand,model,short_description,retail_price,compare_at_price,image_url,stock_quantity,is_featured,condition_label,compatibility,category_id&is_visible=eq.true&order=created_at.desc`;

      const [categoriesResponse, productsResponse] = await Promise.all([
        fetch(categoriesUrl, { headers }),
        fetch(productsUrl, { headers }),
      ]);

      if (!categoriesResponse.ok || !productsResponse.ok) {
        throw new Error("The product catalog could not be loaded from Supabase.");
      }

      const categories = await categoriesResponse.json();
      const products = await productsResponse.json();
      const categoriesMap = new Map(categories.map((category) => [category.id, category]));
      const normalizedProducts = products
        .map((product) => normalizeProduct(product, categoriesMap))
        .sort((left, right) => Number(right.is_featured) - Number(left.is_featured) || left.name.localeCompare(right.name));

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
  return [
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
  ];
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
    const productsUrl = `${supabaseUrl}/rest/v1/products?select=id,sku,slug,name,brand,model,short_description,description,retail_price,compare_at_price,image_url,stock_quantity,is_featured,condition_label,compatibility,category_id&is_visible=eq.true&order=created_at.desc`;
    const [categoriesResponse, productsResponse] = await Promise.all([
      fetch(categoriesUrl, { headers }),
      fetch(productsUrl, { headers }),
    ]);

    if (!categoriesResponse.ok || !productsResponse.ok) {
      throw new Error("Catalog request failed");
    }

    const categories = await categoriesResponse.json();
    const products = await productsResponse.json();
    const categoriesMap = new Map(categories.map((category) => [category.id, category]));
    const normalizedProducts = products.map((product) => {
      const category = categoriesMap.get(product.category_id) || null;
      const retailPrice = Number(product.retail_price);
      const compareAtPrice = Number(product.compare_at_price);
      const safeRetailPrice = Number.isFinite(retailPrice) && retailPrice > 0 ? retailPrice : 0;
      return {
        ...product,
        retail_price: safeRetailPrice,
        compare_at_price:
          Number.isFinite(compareAtPrice) && compareAtPrice > safeRetailPrice
            ? compareAtPrice
            : Math.ceil(safeRetailPrice * 1.18),
        display_image: product.image_url || "",
        category_slug: category?.slug || "other-products",
        category_name: category?.name || "Other Products",
        category_description: category?.description || "",
      };
    }).sort((left, right) => Number(right.is_featured) - Number(left.is_featured) || left.name.localeCompare(right.name));

    return {
      products: normalizedProducts.length ? normalizedProducts : getFallbackCatalogProducts(),
      categories: categories.length
        ? categories
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

function createCatalogCard(product) {
  const detailUrl = `product.html?slug=${encodeURIComponent(product.slug)}`;
  const categoryUrl = `category.html?slug=${encodeURIComponent(product.category_slug)}`;
  const retailPrice = Number(product.retail_price) || 0;
  const compareAtPrice = Number(product.compare_at_price) || 0;
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
    ? `<img class="storefront-card__image" src="${escapeHtml(product.display_image)}" alt="${escapeHtml(product.name)}" loading="lazy">`
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
          <h3>${escapeHtml(product.name)}</h3>
        </a>
        <p class="storefront-card__summary">${escapeHtml(product.short_description || "Retail catalog product.")}</p>
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
      const visibleProducts = products.filter((product) => {
        const haystack = [product.name, product.brand, product.model, product.short_description].join(" ").toLowerCase();
        return product.category_slug === slug && (!query || haystack.includes(query));
      });

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
    const relatedProducts = products
      .filter((item) => item.category_slug === product.category_slug && item.slug !== product.slug)
      .slice(0, 4);

    document.title = `${product.name} | TECHM8 Online Store`;
    shell.innerHTML = `
      <div class="storefront-breadcrumbs">
        <a href="index.html">Home</a>
        <span>/</span>
        <a href="shop.html">Online Store</a>
        <span>/</span>
        <a href="category.html?slug=${encodeURIComponent(product.category_slug)}">${escapeHtml(product.category_name)}</a>
        <span>/</span>
        <span>${escapeHtml(product.name)}</span>
      </div>

      <section class="storefront-pdp">
        <div class="storefront-pdp__gallery">
          <div class="storefront-pdp__gallery-main">
            ${product.display_image ? `<img src="${escapeHtml(product.display_image)}" alt="${escapeHtml(product.name)}">` : `<div class="storefront-card__image storefront-card__image--placeholder">TECHM8</div>`}
          </div>
          <div class="storefront-pdp__gallery-note">
            <strong>Official product image</strong>
            <span>Stored in Supabase and linked to the live catalog.</span>
          </div>
        </div>

        <div class="storefront-pdp__summary">
          <p class="eyebrow">Online store item</p>
          <div class="storefront-pdp__brand-row">
            <span class="storefront-pdp__brand">${escapeHtml(product.brand || "TECHM8")}</span>
            <span class="storefront-pdp__stock">${escapeHtml(stockText)}</span>
          </div>
          <h1>${escapeHtml(product.name)}</h1>
          <p class="storefront-pdp__intro">${escapeHtml(product.description || product.short_description || "Retail catalog product.")}</p>

          <div class="storefront-pdp__price-card">
            <div class="storefront-pdp__price-top">
              ${compareAtPrice > retailPrice ? `<span class="storefront-pdp__compare">${escapeHtml(formatMoney(compareAtPrice))}</span>` : ""}
              ${savings > 0 ? `<span class="storefront-pdp__save">Save ${escapeHtml(formatMoney(savings))}</span>` : ""}
            </div>
            <div class="storefront-pdp__price-main">${escapeHtml(formatMoney(retailPrice))}</div>
            <p class="storefront-pdp__price-note">Final in-store pricing and stock can be confirmed by your nearest TECHM8 location.</p>
          </div>

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
            <div class="storefront-pdp__highlight"><strong>Compatibility</strong><span>${escapeHtml(product.compatibility || "General use")}</span></div>
            <div class="storefront-pdp__highlight"><strong>SKU</strong><span>${escapeHtml(product.sku || "To be assigned")}</span></div>
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

function initCartPage() {
  const root = document.querySelector("[data-cart-page]");
  if (!(root instanceof HTMLElement)) return;

  const itemsTarget = root.querySelector("[data-cart-items]");
  const summaryTarget = root.querySelector("[data-cart-summary]");
  const checkoutButtons = root.querySelectorAll("[data-cart-checkout]");
  if (!(itemsTarget instanceof HTMLElement) || !(summaryTarget instanceof HTMLElement)) return;

  const render = () => {
    const items = loadCart();
    renderCartLineItems(itemsTarget, items);
    renderCartSummary(summaryTarget, items);
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
  if (!(form instanceof HTMLFormElement) || !(summaryTarget instanceof HTMLElement) || !(itemsTarget instanceof HTMLElement)) return;
  const submitButton = form.querySelector('button[type="submit"]');
  const paymentProfiles = [];
  const checkoutParams = new URLSearchParams(window.location.search);
  const isPaymentCancelled = checkoutParams.get("payment") === "cancelled";

  const getSelectedPaymentProfile = () => {
    const selectedCode =
      paymentMethodField instanceof HTMLInputElement
        ? String(paymentMethodField.value || "pay_in_store").trim()
        : "pay_in_store";
    return paymentProfiles.find((profile) => profile.code === selectedCode) || null;
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

    paymentOptionsTarget.innerHTML = paymentProfiles.map((profile) => {
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
    renderPaymentOptions(subtotal);
    renderCartLineItems(itemsTarget, items);
    renderCartSummary(summaryTarget, items, {
      paymentProfile: getSelectedPaymentProfile(),
    });
    renderPaymentNote();
    if (messageTarget instanceof HTMLElement && items.length && !isPaymentCancelled) {
      messageTarget.hidden = true;
      messageTarget.textContent = "";
      messageTarget.className = "booking-message";
    }
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = !items.length;
      submitButton.textContent = items.length ? "Submit order request" : "Add items before checkout";
    }
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
    const payload = {
      order_code: makeOrderCode(),
      customer_name: String(formData.get("customer_name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      store_slug: String(formData.get("store_slug") || "").trim(),
      preferred_contact_method: String(formData.get("preferred_contact_method") || "phone").trim(),
      payment_method_code: String(formData.get("payment_method_code") || "pay_in_store").trim(),
      fulfillment_method: "pickup",
      notes: String(formData.get("notes") || "").trim(),
      subtotal_amount: subtotal,
      total_amount: subtotal,
      source: "website",
      site_url: window.location.origin,
      items,
      created_at: new Date().toISOString(),
    };

    const endpoint = window.TECHM8_CONFIG?.orderEndpoint || "";
    const checkoutSessionEndpoint = window.TECHM8_CONFIG?.checkoutSessionEndpoint || "";
    const supabaseAnonKey = window.TECHM8_CONFIG?.supabaseAnonKey || "";

    try {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
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
            Authorization: `Bearer ${supabaseAnonKey}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
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
            Authorization: `Bearer ${supabaseAnonKey}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
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
      const response = await fetch(
        bookingEndpoint,
        isSupabaseEndpoint
          ? {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseAnonKey}`,
                apikey: supabaseAnonKey,
              },
              body: JSON.stringify(Object.fromEntries(formData.entries())),
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
  initStoreSearch();

  const mobileInput = document.querySelector(".nav__mobile-input");
  const navMenu = document.querySelector(".nav__menu");
  const navToggle = document.querySelector(".nav__toggle--open, .nav__toggle");
  const navDropdowns = document.querySelectorAll(".nav__dropdown");

  if (mobileInput && navMenu) {
    mobileInput.addEventListener("change", () => {
      const isOpen = mobileInput.checked;
      navMenu.classList.toggle("is-open", isOpen);
      navToggle?.setAttribute("aria-expanded", String(isOpen));
      if (!isOpen) {
        closeAllDropdowns();
        closeAllSubmenus();
      }
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

function initPage() {
  ensureGlobalCartUi();
  updateCartIndicators();
  window.addEventListener("storage", () => updateCartIndicators());
  initFilters();
  initNavigation();
  initHomeBanner();
  initStorefront();
  initCategoryPage();
  initProductDetailPage();
  initCartPage();
  initCheckoutPage();
  initCheckoutSuccessPage();
  initBookingForm();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}
