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
      display_image: product.image_url || product.supplier_image_url || "",
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

    productTarget.innerHTML = visibleProducts
      .map((product) => {
        const hasComparePrice =
          Number.isFinite(Number(product.compare_at_price)) && Number(product.compare_at_price) > Number(product.retail_price);
        const comparePrice = hasComparePrice
          ? `<span class="storefront-card__compare">${escapeHtml(formatMoney(product.compare_at_price))}</span>`
          : "";
        const savingsAmount = hasComparePrice
          ? Number(product.compare_at_price) - Number(product.retail_price)
          : 0;
        const savingsPill = hasComparePrice
          ? `<span class="storefront-card__saving">Save ${escapeHtml(formatMoney(savingsAmount))}</span>`
          : "";
        const stockLabel =
          Number(product.stock_quantity) > 0
            ? `${escapeHtml(String(product.stock_quantity))} in network stock`
            : "Stock to be updated";
      const imageMarkup = product.display_image
          ? `<img class="storefront-card__image" src="${escapeHtml(product.display_image)}" alt="${escapeHtml(product.name)}" loading="lazy">`
          : `<div class="storefront-card__image storefront-card__image--placeholder" aria-hidden="true">TECHM8</div>`;
        const detailUrl = `product.html?slug=${encodeURIComponent(product.slug)}`;
        const categoryUrl = `category.html?slug=${encodeURIComponent(product.category_slug)}`;

        return `
          <article class="storefront-card">
            <a class="storefront-card__media-link" href="${detailUrl}">
              <div class="storefront-card__media">${imageMarkup}</div>
            </a>
            <div class="storefront-card__body">
              <div class="storefront-card__top">
                <a class="storefront-card__pill storefront-card__pill--link" href="${categoryUrl}">${escapeHtml(product.category_name)}</a>
                ${product.is_featured ? '<span class="storefront-card__tag">Featured</span>' : ""}
              </div>
              <a class="storefront-card__title-link" href="${detailUrl}">
                <h3>${escapeHtml(product.name)}</h3>
              </a>
              <p>${escapeHtml(product.short_description || "Retail catalog product.")}</p>
              <div class="storefront-card__price-row">
                ${comparePrice}
                <strong>${escapeHtml(formatMoney(product.retail_price))}</strong>
                ${savingsPill}
              </div>
              <div class="storefront-card__meta">
                <span>${escapeHtml(product.brand || "TECHM8")}</span>
                <span>${escapeHtml(product.compatibility || "Store product")}</span>
                <span>${escapeHtml(stockLabel)}</span>
              </div>
              <div class="storefront-card__actions">
                <a href="${detailUrl}">View details</a>
                <a href="stores.html">Find in store</a>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
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
      const productsUrl = `${supabaseUrl}/rest/v1/products?select=id,sku,slug,name,brand,model,short_description,retail_price,compare_at_price,image_url,supplier_image_url,supplier_product_url,stock_quantity,is_featured,condition_label,compatibility,category_id&is_visible=eq.true&order=created_at.desc`;

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
    const productsUrl = `${supabaseUrl}/rest/v1/products?select=id,sku,slug,name,brand,model,short_description,description,retail_price,compare_at_price,image_url,supplier_image_url,stock_quantity,is_featured,condition_label,compatibility,category_id&is_visible=eq.true&order=created_at.desc`;
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
      return {
        ...product,
        retail_price: retailPrice,
        compare_at_price:
          Number.isFinite(compareAtPrice) && compareAtPrice > retailPrice
            ? compareAtPrice
            : Math.ceil(retailPrice * 1.18),
        display_image: product.image_url || product.supplier_image_url || "",
        category_slug: category?.slug || "other-products",
        category_name: category?.name || "Other Products",
        category_description: category?.description || "",
      };
    });

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
  const comparePrice =
    Number.isFinite(Number(product.compare_at_price)) && Number(product.compare_at_price) > Number(product.retail_price)
      ? `<span class="storefront-card__compare">${escapeHtml(formatMoney(product.compare_at_price))}</span>`
      : "";
  const savingsAmount =
    Number.isFinite(Number(product.compare_at_price)) && Number(product.compare_at_price) > Number(product.retail_price)
      ? Number(product.compare_at_price) - Number(product.retail_price)
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

  return `
    <article class="storefront-card">
      <a class="storefront-card__media-link" href="${detailUrl}">
        <div class="storefront-card__media">${imageMarkup}</div>
      </a>
      <div class="storefront-card__body">
        <div class="storefront-card__top">
          <a class="storefront-card__pill storefront-card__pill--link" href="${categoryUrl}">${escapeHtml(product.category_name)}</a>
          ${product.is_featured ? '<span class="storefront-card__tag">Featured</span>' : ""}
        </div>
        <a class="storefront-card__title-link" href="${detailUrl}">
          <h3>${escapeHtml(product.name)}</h3>
        </a>
        <p>${escapeHtml(product.short_description || "Retail catalog product.")}</p>
        <div class="storefront-card__price-row">
          ${comparePrice}
          <strong>${escapeHtml(formatMoney(product.retail_price))}</strong>
          ${savingsPill}
        </div>
        <div class="storefront-card__meta">
          <span>${escapeHtml(product.brand || "TECHM8")}</span>
          <span>${escapeHtml(product.compatibility || "Store product")}</span>
          <span>${escapeHtml(stockLabel)}</span>
        </div>
        <div class="storefront-card__actions">
          <a href="${detailUrl}">View details</a>
          <a href="stores.html">Find in store</a>
        </div>
      </div>
    </article>
  `;
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

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug") || "";

  loadSharedCatalogData().then(({ products }) => {
    const product = products.find((item) => item.slug === slug);
    const titleTarget = root.querySelector("[data-product-title]");
    const categoryTarget = root.querySelector("[data-product-category]");
    const descriptionTarget = root.querySelector("[data-product-description]");
    const imageTarget = root.querySelector("[data-product-image]");
    const priceTarget = root.querySelector("[data-product-price]");
    const compareTarget = root.querySelector("[data-product-compare]");
    const savingsTarget = root.querySelector("[data-product-saving]");
    const stockTarget = root.querySelector("[data-product-stock]");
    const metaTarget = root.querySelector("[data-product-meta]");
    const breadcrumbTarget = root.querySelector("[data-product-breadcrumb]");
    const relatedTarget = root.querySelector("[data-product-related]");

    if (!product || !(titleTarget instanceof HTMLElement) || !(relatedTarget instanceof HTMLElement)) {
      if (relatedTarget instanceof HTMLElement) {
        relatedTarget.innerHTML = `<article class="storefront-card storefront-card--empty"><div class="storefront-card__body"><span class="storefront-card__pill">Missing product</span><h3>Product not found</h3><p>Return to the online store and select another item.</p></div></article>`;
      }
      return;
    }

    document.title = `${product.name} | TECHM8 Online Store`;
    titleTarget.textContent = product.name;
    if (categoryTarget instanceof HTMLElement) categoryTarget.innerHTML = `<a href="category.html?slug=${encodeURIComponent(product.category_slug)}">${escapeHtml(product.category_name)}</a>`;
    if (descriptionTarget instanceof HTMLElement) descriptionTarget.textContent = product.description || product.short_description || "";
    if (imageTarget instanceof HTMLElement) imageTarget.innerHTML = `<img src="${escapeHtml(product.display_image)}" alt="${escapeHtml(product.name)}">`;
    if (priceTarget instanceof HTMLElement) priceTarget.textContent = formatMoney(product.retail_price);
    if (compareTarget instanceof HTMLElement) compareTarget.textContent = formatMoney(product.compare_at_price);
    if (savingsTarget instanceof HTMLElement) savingsTarget.textContent = `Save ${formatMoney(Number(product.compare_at_price) - Number(product.retail_price))}`;
    if (stockTarget instanceof HTMLElement) stockTarget.textContent = Number(product.stock_quantity) > 0 ? `${product.stock_quantity} in network stock` : "Stock to be updated";
    if (breadcrumbTarget instanceof HTMLElement) breadcrumbTarget.textContent = product.name;
    if (metaTarget instanceof HTMLElement) {
      metaTarget.innerHTML = `
        <div class="storefront-detail__meta-item"><span>Brand</span><strong>${escapeHtml(product.brand || "TECHM8")}</strong></div>
        <div class="storefront-detail__meta-item"><span>Model</span><strong>${escapeHtml(product.model || "Store product")}</strong></div>
        <div class="storefront-detail__meta-item"><span>Category</span><strong>${escapeHtml(product.category_name)}</strong></div>
        <div class="storefront-detail__meta-item"><span>Compatibility</span><strong>${escapeHtml(product.compatibility || "General use")}</strong></div>
      `;
    }

    const relatedProducts = products.filter((item) => item.category_slug === product.category_slug && item.slug !== product.slug).slice(0, 4);
    relatedTarget.innerHTML = relatedProducts.length
      ? relatedProducts.map((item) => createCatalogCard(item)).join("")
      : `<article class="storefront-card storefront-card--empty"><div class="storefront-card__body"><span class="storefront-card__pill">No related items</span><h3>No more products in this category yet</h3><p>More items can be added from the database later.</p></div></article>`;
  });
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
  initFilters();
  initNavigation();
  initHomeBanner();
  initStorefront();
  initCategoryPage();
  initProductDetailPage();
  initBookingForm();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}
