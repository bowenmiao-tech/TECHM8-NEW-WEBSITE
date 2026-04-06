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
            <a class="store-switcher__link" href="${prefix}stores/brassall.html">Brassall</a>
            <a class="store-switcher__link" href="${prefix}stores/fairfield.html">Fairfield</a>
            <a class="store-switcher__link" href="${prefix}stores/north-lakes.html">North Lakes</a>
            <a class="store-switcher__link" href="${prefix}stores/park-ridge.html">Park Ridge</a>
            <a class="store-switcher__link" href="${prefix}stores/toowong.html">Toowong</a>
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
              <button class="nav__submenu-toggle" type="button" aria-expanded="false" onclick="return toggleNavSubmenu(this, event)"><span class="nav__submenu-copy"><span class="nav__submenu-label">Phones</span><span class="nav__submenu-meta">Apple, Samsung, Oppo, Huawei, Xiaomi, Google, OnePlus and more</span></span></button>
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
              <button class="nav__submenu-toggle" type="button" aria-expanded="false" onclick="return toggleNavSubmenu(this, event)"><span class="nav__submenu-copy"><span class="nav__submenu-label">Tablets</span><span class="nav__submenu-meta">Apple, Samsung and other tablet brands</span></span></button>
              <div class="nav__submenu-panel">
                <a href="${prefix}repair-services/tablets/apple.html">Apple</a>
                <a href="${prefix}repair-services/tablets/samsung.html">Samsung</a>
                <a href="${prefix}repair-services/tablets/other.html">Other Tablets</a>
              </div>
            </div>
            <div class="nav__dropdown-group">
              <button class="nav__submenu-toggle" type="button" aria-expanded="false" onclick="return toggleNavSubmenu(this, event)"><span class="nav__submenu-copy"><span class="nav__submenu-label">Computers</span><span class="nav__submenu-meta">PC Tower, All in One, Laptop and Small PC</span></span></button>
              <div class="nav__submenu-panel">
                <a href="${prefix}repair-services/computers/pc-tower.html">PC Tower</a>
                <a href="${prefix}repair-services/computers/all-in-one.html">All in One</a>
                <a href="${prefix}repair-services/computers/laptop.html">Laptop</a>
                <a href="${prefix}repair-services/computers/small-pc.html">Small PC</a>
              </div>
            </div>
            <div class="nav__dropdown-group">
              <button class="nav__submenu-toggle" type="button" aria-expanded="false" onclick="return toggleNavSubmenu(this, event)"><span class="nav__submenu-copy"><span class="nav__submenu-label">Game Consoles</span><span class="nav__submenu-meta">Sony, Xbox and Nintendo repairs</span></span></button>
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
              <a class="button button--primary" href="${prefix}stores.html">Book via store</a>
              <a class="button button--secondary" href="${prefix}repairs.html">Back to repairs</a>
            </div>
          </div>
          <div class="repair-detail-panel">
            <div class="repair-detail-panel__icon ${pageData.vectorClass}"></div>
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
          <h4>Stay Updated</h4>
          <p>Use this area later for newsletter signup, offers, local store news or new product releases.</p>
          <div class="footer-subscribe">
            <input type="email" placeholder="Email">
            <button type="button">Subscribe</button>
          </div>
          <div class="footer-socials">
            <a href="#" aria-label="Facebook">f</a>
            <a href="#" aria-label="Instagram">ig</a>
            <span>Stay Connected</span>
          </div>
        </div>
      </div>
      <div class="container footer footer--bottom">
        <p>Copyright © 2026 TECHM8. All rights reserved.</p>
        <a href="${prefix}store-policy.html">Repair Terms & Conditions</a>
      </div>
    </footer>
  `;

  const isMobileNavigation = () => window.innerWidth <= 960;

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

  const decorateMobileMenu = () => {
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
  };

  const handleDropdownToggle = (event, dropdownToggle) => {
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
  };

  const handleSubmenuToggle = (event, toggle) => {
    event.preventDefault();
    event.stopPropagation();

    const group = toggle.closest(".nav__dropdown-group");
    if (!group) return false;

    const isOpen = group.classList.contains("is-open");
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
