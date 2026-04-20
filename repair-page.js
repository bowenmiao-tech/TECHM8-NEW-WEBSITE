const pageData = window.REPAIR_PAGE_DATA;

if (pageData) {
  const prefix = pageData.prefix || "../../";

  const storeDropdown = `
    <div class="nav__dropdown nav__dropdown--stores">
      <button class="nav__dropdown-toggle" type="button" data-href="${prefix}stores.html" aria-expanded="false" onclick="return toggleMainDropdown(this, event)">Stores</button>
      <div class="nav__dropdown-menu nav__dropdown-menu--stores">
        <div class="store-switcher">
          <div class="store-switcher__top">
            <strong>Stores</strong>
          </div>
          <div class="store-switcher__grid">
            <a class="store-switcher__link" href="${prefix}stores/park-ridge.html">Park Ridge</a>
            <a class="store-switcher__link" href="${prefix}stores/fairfield.html">Fairfield</a>
            <a class="store-switcher__link" href="${prefix}stores/toowong.html">Toowong</a>
            <a class="store-switcher__link" href="${prefix}stores/north-lakes.html">North Lakes</a>
            <a class="store-switcher__link" href="${prefix}stores/brassall.html">Brassall</a>
          </div>
        </div>
      </div>
    </div>
  `;

  const navDropdown = `
    <div class="nav__dropdown">
      <button class="nav__dropdown-toggle" type="button" data-href="${prefix}repairs.html" aria-expanded="false" onclick="return toggleMainDropdown(this, event)">Repairs</button>
      <div class="nav__dropdown-menu">
        <div class="store-switcher store-switcher--repairs">
          <div class="store-switcher__top">
            <strong>Repairs</strong>
          </div>
          <div class="store-switcher__grid store-switcher__grid--repairs">
            <div class="nav__dropdown-group">
              <button class="nav__submenu-toggle" type="button" aria-expanded="false" onclick="return toggleNavSubmenu(this, event)">Phones</button>
              <div class="nav__submenu-panel">
                <a href="${prefix}repair-services/phones/apple.html">Apple</a>
                <a href="${prefix}repair-services/phones/samsung.html">Samsung</a>
                <a href="${prefix}repair-services/phones/oppo.html">Oppo</a>
                <a href="${prefix}repair-services/phones/huawei.html">Huawei</a>
                <a href="${prefix}repair-services/phones/xiaomi.html">Xiaomi</a>
                <a href="${prefix}repair-services/phones/google.html">Google</a>
                <a href="${prefix}repair-services/phones/oneplus.html">OnePlus</a>
                <a href="${prefix}repair-services/phones/others.html">Others</a>
              </div>
            </div>
            <div class="nav__dropdown-group">
              <button class="nav__submenu-toggle" type="button" aria-expanded="false" onclick="return toggleNavSubmenu(this, event)">Tablets</button>
              <div class="nav__submenu-panel">
                <a href="${prefix}repair-services/tablets/apple.html">Apple</a>
                <a href="${prefix}repair-services/tablets/samsung.html">Samsung</a>
                <a href="${prefix}repair-services/tablets/other.html">Other Tablets</a>
              </div>
            </div>
            <div class="nav__dropdown-group">
              <button class="nav__submenu-toggle" type="button" aria-expanded="false" onclick="return toggleNavSubmenu(this, event)">Computers</button>
              <div class="nav__submenu-panel">
                <a href="${prefix}repair-services/computers/pc-tower.html">PC Tower</a>
                <a href="${prefix}repair-services/computers/all-in-one.html">All in One</a>
                <a href="${prefix}repair-services/computers/laptop.html">Laptop</a>
                <a href="${prefix}repair-services/computers/small-pc.html">Small PC</a>
              </div>
            </div>
            <div class="nav__dropdown-group">
              <button class="nav__submenu-toggle" type="button" aria-expanded="false" onclick="return toggleNavSubmenu(this, event)">Game Consoles</button>
              <div class="nav__submenu-panel">
                <a href="${prefix}repair-services/consoles/sony.html">Sony</a>
                <a href="${prefix}repair-services/consoles/xbox.html">Xbox</a>
                <a href="${prefix}repair-services/consoles/nintendo.html">Nintendo</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const issueCards = pageData.issues
    .map(
      (item) => `<article class="issue-card"><h3>${item.title}</h3><p>${item.text}</p></article>`
    )
    .join("");

  const extraCards = pageData.extras
    .map(
      (item) => `<article class="info-card"><h2>${item.title}</h2><p>${item.text}</p></article>`
    )
    .join("");

  const logoRoot = `${prefix}assets/repair-logos/`;

  const brandLogoMap = {
    apple: `${logoRoot}apple.png`,
    samsung: `${logoRoot}samsung.png`,
    oppo: `${logoRoot}oppo.ico`,
    huawei: `${logoRoot}huawei.png`,
    xiaomi: `${logoRoot}xiaomi.png`,
    google: `${logoRoot}google.png`,
    oneplus: `${logoRoot}oneplus.png`,
    sony: `${logoRoot}sony.png`,
    xbox: `${logoRoot}xbox.svg`,
    nintendo: `${logoRoot}nintendo.svg`,
  };

  const renderBrandVisual = (slug, name, meta) => `
    <div class="repair-brand-card repair-brand-card--${slug}">
      <div class="repair-brand-card__mark" aria-hidden="true">
        <img class="repair-brand-card__logo repair-brand-card__logo--${slug}" src="${brandLogoMap[slug]}" alt="">
      </div>
      <div class="repair-brand-card__copy">
        <strong>${name}</strong>
        <span>${meta}</span>
      </div>
    </div>
  `;

  const renderDeviceVisual = (slug, name, meta, svgMarkup) => `
    <div class="repair-device-card repair-device-card--${slug}">
      <div class="repair-device-card__icon" aria-hidden="true">${svgMarkup}</div>
      <div class="repair-device-card__copy">
        <strong>${name}</strong>
        <span>${meta}</span>
      </div>
    </div>
  `;

  const resolveRepairVisual = () => {
    const title = String(pageData.title || "").toLowerCase();

    if (title.includes("apple iphone") || title.includes("apple ipad")) {
      return renderBrandVisual("apple", "Apple", "iPhone and iPad repairs");
    }
    if (title.includes("samsung phone") || title.includes("samsung tablet")) {
      return renderBrandVisual("samsung", "Samsung", "Galaxy phone and tablet service");
    }
    if (title.includes("oppo")) {
      return renderBrandVisual("oppo", "OPPO", "Screen, battery and charging support");
    }
    if (title.includes("huawei")) {
      return renderBrandVisual("huawei", "Huawei", "Hardware diagnostics and repair");
    }
    if (title.includes("xiaomi")) {
      return renderBrandVisual("xiaomi", "Xiaomi", "Battery, screen and port service");
    }
    if (title.includes("google pixel")) {
      return renderBrandVisual("google", "Google", "Pixel repair and hardware support");
    }
    if (title.includes("oneplus")) {
      return renderBrandVisual("oneplus", "OnePlus", "Premium Android device repairs");
    }
    if (title.includes("sony console")) {
      return renderBrandVisual("sony", "PlayStation", "Console repair support");
    }
    if (title.includes("xbox")) {
      return renderBrandVisual("xbox", "Xbox", "HDMI, PSU and storage repairs");
    }
    if (title.includes("nintendo")) {
      return renderBrandVisual("nintendo", "Nintendo", "Portable and console repair support");
    }
    if (title.includes("other phone") || title.includes("other tablet")) {
      return `
        <div class="repair-brand-card repair-brand-card--other">
          <div class="repair-brand-card__mark repair-brand-card__mark--fallback" aria-hidden="true">+</div>
          <div class="repair-brand-card__copy">
            <strong>Other Brands</strong>
            <span>Supported models and general diagnostics</span>
          </div>
        </div>
      `;
    }
    if (title.includes("pc tower")) {
      return renderDeviceVisual(
        "pc-tower",
        "PC Tower",
        "Power, storage, cooling and upgrade work",
        `<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="30" y="12" width="36" height="72" rx="8"></rect>
          <circle cx="48" cy="26" r="3" fill="currentColor" stroke="none"></circle>
          <path d="M40 40h16"></path>
          <path d="M40 52h16"></path>
          <path d="M40 64h16"></path>
        </svg>`
      );
    }
    if (title.includes("all in one")) {
      return renderDeviceVisual(
        "all-in-one",
        "All in One",
        "Integrated display and desktop hardware service",
        `<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="16" y="18" width="64" height="42" rx="6"></rect>
          <path d="M48 60v10"></path>
          <path d="M34 74h28"></path>
          <rect x="22" y="24" width="52" height="30" rx="3"></rect>
        </svg>`
      );
    }
    if (title.includes("laptop")) {
      return renderDeviceVisual(
        "laptop",
        "Laptop",
        "Screen, battery, keyboard and charging repairs",
        `<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="20" y="18" width="56" height="36" rx="5"></rect>
          <path d="M12 64h72"></path>
          <path d="M24 54l-8 10"></path>
          <path d="M72 54l8 10"></path>
        </svg>`
      );
    }
    if (title.includes("small pc")) {
      return renderDeviceVisual(
        "small-pc",
        "Small PC",
        "Mini PC diagnostics, thermal service and upgrades",
        `<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="22" y="22" width="52" height="52" rx="12"></rect>
          <circle cx="38" cy="38" r="3" fill="currentColor" stroke="none"></circle>
          <path d="M46 36h18"></path>
          <path d="M46 48h18"></path>
          <path d="M34 58h28"></path>
        </svg>`
      );
    }

    return `<div class="repair-detail-panel__icon ${pageData.vectorClass}" aria-hidden="true"></div>`;
  };

  document.body.innerHTML = `
    <div class="promo-banner">
      <div class="container promo-banner__inner">
        <span>${pageData.banner}</span>
        <a href="${prefix}stores.html">Find a store</a>
      </div>
    </div>

    <header class="site-header">
      <div class="container nav">
        <a class="brand" href="${prefix}index.html">
          <img class="brand__logo" src="${prefix}assets/logo-techm8.png" alt="TECHM8 logo">
        </a>
        <input class="nav__mobile-input" type="checkbox" id="primary-menu-toggle">
        <label class="nav__toggle" for="primary-menu-toggle" aria-label="Open menu">
          <span></span><span></span><span></span>
        </label>
        <nav class="nav__menu" id="primary-menu">
          <a href="${prefix}index.html">Home</a>
          ${navDropdown}
          <a href="${prefix}products.html">Products</a>
          ${storeDropdown}
          <a href="${prefix}store-policy.html">Store Policy</a>
          <a class="nav__cart-link" href="${prefix}cart.html">
            <span class="nav__cart-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="20" r="1.35"></circle>
                <circle cx="18" cy="20" r="1.35"></circle>
                <path d="M2 3h2.2l2.4 10.2a1 1 0 0 0 .98.78h9.85a1 1 0 0 0 .98-.8L20 7H6.1"></path>
              </svg>
            </span>
            <span class="nav__cart-text">Cart</span>
            <span class="nav__cart-count" data-cart-count>0</span>
          </a>
          <a class="nav__shop-link" href="${prefix}shop.html">Online Store</a>
        </nav>
      </div>
    </header>

    <main>
      <section class="hero hero--service">
        <div class="container repair-detail-hero">
          <div>
            <p class="eyebrow">${pageData.category}</p>
            <h1>${pageData.title}</h1>
            <p class="hero__lead">${pageData.intro}</p>
            <div class="hero__actions">
              <a class="button button--primary" href="${prefix}book-repair.html">Book a repair</a>
              <a class="button button--secondary" href="${prefix}repairs.html">Back to repairs</a>
            </div>
          </div>
          <div class="repair-detail-panel">
            ${resolveRepairVisual()}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="section-heading">
            <p class="eyebrow">${pageData.issueLabel || "Common faults"}</p>
            <h2>${pageData.issueHeading}</h2>
          </div>
          <div class="repair-content-grid">
            ${issueCards}
          </div>
        </div>
      </section>

      <section class="section section--muted">
        <div class="container">
          <div class="section-heading">
            <p class="eyebrow">${pageData.extraLabel || "Why this page helps"}</p>
            <h2>${pageData.extraHeading}</h2>
          </div>
          <div class="repair-content-grid">
            ${extraCards}
          </div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="container footer footer--rich">
        <div class="footer-brand">
          <img class="footer-brand__logo" src="${prefix}assets/logo-techm8.png" alt="TECHM8 logo">
          <p>${pageData.footerText}</p>
        </div>
        <div>
          <h4>Repairs</h4>
          <a href="${prefix}repair-services/phones/apple.html">Phone Repairs</a>
          <a href="${prefix}repair-services/tablets/apple.html">Tablet Repairs</a>
          <a href="${prefix}repair-services/computers/laptop.html">Laptop Repairs</a>
          <a href="${prefix}repair-services/consoles/xbox.html">Console Repairs</a>
        </div>
        <div>
          <h4>Explore</h4>
          <a href="${prefix}repairs.html">Repairs Overview</a>
          <a href="${prefix}products.html">Products</a>
          <a href="${prefix}stores.html">Stores</a>
          <a href="${prefix}shop.html">Online Store</a>
        </div>
        <div>
          <h4>Need Help?</h4>
          <p>Choose your nearest store for repairs, product advice and walk-in support.</p>
          <a href="${prefix}stores.html">Find your nearest store</a>
          <a href="${prefix}repairs.html">View repair categories</a>
        </div>
      </div>
      <div class="container footer footer--bottom">
        <p>&copy; 2026 TECHM8. All rights reserved.</p>
        <a href="${prefix}store-policy.html">Repair Terms & Conditions</a>
      </div>
    </footer>
  `;

  const CART_STORAGE_KEY = "techm8_cart_v1";

  const loadCart = () => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const updateCartIndicators = () => {
    const items = loadCart();
    const count = items.reduce((total, item) => total + Math.max(0, Number(item.qty) || 0), 0);
    document.querySelectorAll("[data-cart-count]").forEach((target) => {
      if (!(target instanceof HTMLElement)) return;
      target.textContent = String(count);
      target.toggleAttribute("hidden", count <= 0);
      target.setAttribute("aria-hidden", count <= 0 ? "true" : "false");
    });
  };

  if (!document.querySelector("[data-floating-cart]")) {
    const floatingCart = document.createElement("a");
    floatingCart.className = "floating-cart";
    floatingCart.href = `${prefix}cart.html`;
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

  updateCartIndicators();
  window.addEventListener("storage", updateCartIndicators);
  window.addEventListener("techm8:cart-updated", updateCartIndicators);

  const isMobileNavigation = () => window.innerWidth <= 960;

  const keepMobileMenuOpen = () => {
    if (!isMobileNavigation()) return;
    setMobileMenuState(true);
  };

  const setMobileMenuState = (isOpen) => {
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
  };

  const closeAllDropdowns = (exceptDropdown) => {
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
  };

  const armDropdownNavigation = (toggle) => {
    document.querySelectorAll(".nav__dropdown-toggle").forEach((item) => {
      if (item !== toggle) {
        delete item.dataset.navReady;
      }
    });

    toggle.dataset.navReady = "true";
  };

  const closeAllSubmenus = (exceptGroup) => {
    document.querySelectorAll(".nav__dropdown-group.is-open").forEach((group) => {
      if (group === exceptGroup) return;
      group.classList.remove("is-open");
      group.querySelector(".nav__submenu-toggle")?.setAttribute("aria-expanded", "false");
    });
  };

  const closeAllMobileRepairsGroups = (exceptGroup) => {
    document.querySelectorAll(".nav__mobile-repairs-group.is-open").forEach((group) => {
      if (group === exceptGroup) return;
      group.classList.remove("is-open");
      group.querySelector(".nav__mobile-repairs-toggle")?.setAttribute("aria-expanded", "false");
    });
  };

  const openSubmenuGroup = (group) => {
    if (!(group instanceof HTMLElement)) return;
    closeAllSubmenus(group);
    group.classList.add("is-open");
    group.querySelector(".nav__submenu-toggle")?.setAttribute("aria-expanded", "true");
  };

  const decorateMobileMenu = () => {
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
  };

  const decorateMobileRepairsAccordion = () => {
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
  };

  const handleDropdownToggle = (event, dropdownToggle) => {
    event.stopPropagation();
    const dropdown = dropdownToggle.closest(".nav__dropdown");
    if (!dropdown) return;

    const destination = dropdownToggle.dataset.href || dropdownToggle.getAttribute("href");
    const alreadyOpen = dropdown.classList.contains("is-open");
    const readyToNavigate = dropdownToggle.dataset.navReady === "true";
    const isRepairsMobileAccordion =
      isMobileNavigation() && dropdown.classList.contains("nav__dropdown--repairs");

    if (!alreadyOpen || !readyToNavigate) {
      event.preventDefault();
      closeAllDropdowns(dropdown);
      dropdown.classList.add("is-open");
      dropdownToggle.setAttribute("aria-expanded", "true");
      keepMobileMenuOpen();
      if (isRepairsMobileAccordion) {
        closeAllMobileRepairsGroups();
      }
      armDropdownNavigation(dropdownToggle);
      return;
    }

    if (destination) {
      event.preventDefault();
      window.location.href = destination;
      return;
    }

    event.preventDefault();
  };

  const handleMobileRepairsToggle = (event, toggle) => {
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
  };

  const handleSubmenuToggle = (event, toggle) => {
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
  };

  window.toggleMainDropdown = (button, event) => {
    if (event) {
      handleDropdownToggle(event, button);
    }
    return false;
  };

  window.toggleRepairsMenu = window.toggleMainDropdown;

  window.toggleNavSubmenu = (button, event) => {
    if (event) {
      handleSubmenuToggle(event, button);
    }
    return false;
  };

  const initStoreSearch = () => {
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
  };

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

      const firstGroup = dropdown.querySelector(".nav__dropdown-group");
      if (firstGroup instanceof HTMLElement) {
        openSubmenuGroup(firstGroup);
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

