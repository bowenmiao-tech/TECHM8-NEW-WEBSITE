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
      image_url: "https://static.wixstatic.com/media/ff60a8_44b8629acec14e089b265c9c134f3dcd~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg",
      supplier_image_url: "https://static.wixstatic.com/media/ff60a8_44b8629acec14e089b265c9c134f3dcd~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg",
      supplier_product_url: "https://www.techm8australia.com/product-page/dualsense-wireless-controller-sterling-silver-playstation-5",
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
      image_url: "https://static.wixstatic.com/media/ff60a8_3d6c59b7f9844dce9cddba30391438aa~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg",
      supplier_image_url: "https://static.wixstatic.com/media/ff60a8_3d6c59b7f9844dce9cddba30391438aa~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg",
      supplier_product_url: "https://www.techm8australia.com/product-page/dualsense-wireless-controller-cosmic-red-playstation-5",
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
      image_url: "https://static.wixstatic.com/media/ff60a8_e970ca83b1cb486aaae98a2172e07cbc~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg",
      supplier_image_url: "https://static.wixstatic.com/media/ff60a8_e970ca83b1cb486aaae98a2172e07cbc~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg",
      supplier_product_url: "https://www.techm8australia.com/product-page/dualsense-wireless-controller-gray-camouflage",
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
      image_url: "https://static.wixstatic.com/media/ff60a8_8b5310c0258a420ea7f0e18e943a501d~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg",
      supplier_image_url: "https://static.wixstatic.com/media/ff60a8_8b5310c0258a420ea7f0e18e943a501d~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg",
      supplier_product_url: "https://www.techm8australia.com/product-page/copy-of-dualsense-wireless-controller-playstation-5-black",
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
      image_url: "https://static.wixstatic.com/media/ff60a8_997f0a93bc8e4b9a907efb21027b37f0~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg",
      supplier_image_url: "https://static.wixstatic.com/media/ff60a8_997f0a93bc8e4b9a907efb21027b37f0~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg",
      supplier_product_url: "https://www.techm8australia.com/product-page/dualsense-wireless-controller-playstation-5-white",
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
    return {
      ...product,
      category_name: category?.name || product.category_name || "Other Products",
      category_slug: category?.slug || product.category_slug || "other-products",
      display_image: product.image_url || product.supplier_image_url || "",
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
        const comparePrice =
          Number.isFinite(Number(product.compare_at_price)) && Number(product.compare_at_price) > Number(product.retail_price)
            ? `<span class="storefront-card__compare">${escapeHtml(formatMoney(product.compare_at_price))}</span>`
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
            <div class="storefront-card__media">${imageMarkup}</div>
            <div class="storefront-card__body">
              <div class="storefront-card__top">
                <span class="storefront-card__pill">${escapeHtml(product.category_name)}</span>
                ${product.is_featured ? '<span class="storefront-card__tag">Featured</span>' : ""}
              </div>
              <h3>${escapeHtml(product.name)}</h3>
              <p>${escapeHtml(product.short_description || "Retail catalog product.")}</p>
              <div class="storefront-card__price-row">
                <strong>${escapeHtml(formatMoney(product.retail_price))}</strong>
                ${comparePrice}
              </div>
              <div class="storefront-card__meta">
                <span>${escapeHtml(product.brand || "TECHM8")}</span>
                <span>${escapeHtml(product.compatibility || "Store product")}</span>
                <span>${escapeHtml(stockLabel)}</span>
              </div>
              <div class="storefront-card__actions">
                <a href="stores.html">Find in store</a>
                ${
                  product.supplier_product_url
                    ? `<a href="${escapeHtml(product.supplier_product_url)}" target="_blank" rel="noreferrer">View source item</a>`
                    : `<a href="products.html">More details</a>`
                }
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
  initBookingForm();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}
