const pageData = window.BUSINESS_SERVICE_PAGE_DATA;

if (pageData) {
  const prefix = pageData.prefix || "";
  const businessLinks = [
    ["NDIS Services", "business-services/ndis-technology-support.html"],
    ["School Services", "business-services/school-device-repair.html"],
    ["On-site Tech Services", "business-services/on-site-tech-services.html"],
    [
      "Business IT &amp; Device Support",
      "business-services/business-it-device-support.html",
    ],
  ];
  const serviceLinks = [
    [
      "NDIS Technology Support &amp; Device Repairs Brisbane",
      "business-services/ndis-technology-support.html",
    ],
    [
      "School Device Repair Program Brisbane",
      "business-services/school-device-repair.html",
    ],
    ["On-site Tech Services", "business-services/on-site-tech-services.html"],
    [
      "Business IT &amp; Device Support Brisbane",
      "business-services/business-it-device-support.html",
    ],
  ];

  const linkUrl = (url) => `${prefix}${url}`;
  const repairMenu = `
    <div class="nav__dropdown">
      <button class="nav__dropdown-toggle" type="button" data-href="${linkUrl("repairs.html")}" aria-expanded="false" onclick="return toggleMainDropdown(this, event);">Repairs</button>
      <div class="nav__dropdown-menu">
        <div class="store-switcher store-switcher--repairs">
          <div class="store-switcher__top"><strong>Repairs</strong></div>
          <div class="store-switcher__grid store-switcher__grid--repairs">
            <div class="nav__dropdown-group">
              <button class="nav__submenu-toggle" type="button" aria-expanded="false" onclick="return toggleNavSubmenu(this, event);">Phones</button>
              <div class="nav__submenu-panel">
                <a href="${linkUrl("repair-services/phones/apple.html")}">Apple</a>
                <a href="${linkUrl("repair-services/phones/samsung.html")}">Samsung</a>
                <a href="${linkUrl("repair-services/phones/oppo.html")}">Oppo</a>
                <a href="${linkUrl("repair-services/phones/huawei.html")}">Huawei</a>
                <a href="${linkUrl("repair-services/phones/xiaomi.html")}">Xiaomi</a>
                <a href="${linkUrl("repair-services/phones/google.html")}">Google</a>
                <a href="${linkUrl("repair-services/phones/oneplus.html")}">OnePlus</a>
                <a href="${linkUrl("repair-services/phones/others.html")}">Others</a>
              </div>
            </div>
            <div class="nav__dropdown-group">
              <button class="nav__submenu-toggle" type="button" aria-expanded="false" onclick="return toggleNavSubmenu(this, event);">Tablets</button>
              <div class="nav__submenu-panel">
                <a href="${linkUrl("repair-services/tablets/apple.html")}">Apple</a>
                <a href="${linkUrl("repair-services/tablets/samsung.html")}">Samsung</a>
                <a href="${linkUrl("repair-services/tablets/other.html")}">Other Tablets</a>
              </div>
            </div>
            <div class="nav__dropdown-group">
              <button class="nav__submenu-toggle" type="button" aria-expanded="false" onclick="return toggleNavSubmenu(this, event);">Computers</button>
              <div class="nav__submenu-panel">
                <a href="${linkUrl("repair-services/computers/pc-tower.html")}">PC Tower</a>
                <a href="${linkUrl("repair-services/computers/all-in-one.html")}">All in One</a>
                <a href="${linkUrl("repair-services/computers/laptop.html")}">Laptop</a>
                <a href="${linkUrl("repair-services/computers/small-pc.html")}">Small PC</a>
              </div>
            </div>
            <div class="nav__dropdown-group">
              <button class="nav__submenu-toggle" type="button" aria-expanded="false" onclick="return toggleNavSubmenu(this, event);">Game Consoles</button>
              <div class="nav__submenu-panel">
                <a href="${linkUrl("repair-services/consoles/sony.html")}">Sony</a>
                <a href="${linkUrl("repair-services/consoles/xbox.html")}">Xbox</a>
                <a href="${linkUrl("repair-services/consoles/nintendo.html")}">Nintendo</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  const storeMenu = `
    <div class="nav__dropdown nav__dropdown--stores">
      <button class="nav__dropdown-toggle" type="button" data-href="${linkUrl("stores.html")}" aria-expanded="false" onclick="return toggleMainDropdown(this, event);">Stores</button>
      <div class="nav__dropdown-menu nav__dropdown-menu--stores">
        <div class="store-switcher">
          <div class="store-switcher__top"><strong>Stores</strong></div>
          <div class="store-switcher__grid">
            <a class="store-switcher__link" href="${linkUrl("stores/park-ridge.html")}">Park Ridge</a>
            <a class="store-switcher__link" href="${linkUrl("stores/fairfield.html")}">Fairfield</a>
            <a class="store-switcher__link" href="${linkUrl("stores/toowong.html")}">Toowong</a>
            <a class="store-switcher__link" href="${linkUrl("stores/north-lakes.html")}">North Lakes</a>
            <a class="store-switcher__link" href="${linkUrl("stores/brassall.html")}">Brassall</a>
          </div>
        </div>
      </div>
    </div>`;
  const businessMenu = businessLinks
    .map(
      ([label, url]) =>
        `<a class="store-switcher__link" href="${linkUrl(url)}">${label}</a>`,
    )
    .join("");
  const serviceFooterLinks = serviceLinks
    .map(([label, url]) => `<a href="${linkUrl(url)}">${label}</a>`)
    .join("");
  const cards = (pageData.cards || [])
    .map(
      (card) => `
        <article class="repair-card">
          <h3>${card.title}</h3>
          <p>${card.text}</p>
        </article>`,
    )
    .join("");
  const steps = (pageData.steps || [])
    .map(
      (step) => `
        <article class="repair-card">
          <h3>${step.title}</h3>
          <p>${step.text}</p>
        </article>`,
    )
    .join("");

  const appRoot =
    document.querySelector("[data-business-service-root]") || document.body;

  appRoot.innerHTML = `
    <div class="promo-banner">
      <div class="container promo-banner__inner">
        <span>Fast repairs, quality parts and accessories for phones, tablets, computers, laptops and game consoles.</span>
        <a href="${linkUrl("repairs.html")}">Explore repair services</a>
      </div>
    </div>
    <header class="site-header">
      <div class="container nav">
        <a class="brand" href="${linkUrl("index.html")}" aria-label="TECHM8 home">
          <img class="brand__logo" src="${linkUrl("assets/logo-techm8.png")}" alt="TECHM8 logo">
        </a>
        <input class="nav__mobile-input" type="checkbox" id="primary-menu-toggle">
        <label class="nav__toggle" for="primary-menu-toggle" aria-label="Open menu"><span></span><span></span><span></span></label>
        <nav class="nav__menu" id="primary-menu">
          <a href="${linkUrl("index.html")}">Home</a>
          ${repairMenu}
          <a href="${linkUrl("products.html")}">Products</a>
          ${storeMenu}
          <div class="nav__dropdown nav__dropdown--business">
            <button class="nav__dropdown-toggle" type="button" data-href="${linkUrl("business-services.html")}" aria-expanded="false" onclick="return toggleMainDropdown(this, event);">Business Services</button>
            <div class="nav__dropdown-menu nav__dropdown-menu--business">
              <div class="store-switcher">
                <div class="store-switcher__top"><strong>Business Services</strong></div>
                <div class="store-switcher__grid">${businessMenu}</div>
              </div>
            </div>
          </div>
          <a class="nav__shop-link" href="${linkUrl("shop.html")}">Online Store</a>
        </nav>
      </div>
    </header>
    <main>
      <section class="hero hero--service">
        <div class="container repair-detail-hero">
          <div>
            <p class="eyebrow">${pageData.eyebrow}</p>
            <h1>${pageData.h1}</h1>
            <p class="hero__lead">${pageData.lead}</p>
            <div class="hero__actions">
              <a class="button button--primary" href="${linkUrl(pageData.primaryHref || "book-repair.html")}">${pageData.primaryCta || "Book a repair"}</a>
              <a class="button button--secondary" href="${linkUrl("stores.html")}">Find a store</a>
            </div>
          </div>
          <div class="repair-detail-panel">
            <div class="repair-detail-panel__icon vector-laptop" aria-hidden="true"></div>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="container">
          <div class="section-heading">
            <p class="eyebrow">${pageData.cardEyebrow || "Support options"}</p>
            <h2>${pageData.cardHeading}</h2>
          </div>
          <div class="repair-content-grid">${cards}</div>
        </div>
      </section>
      <section class="section section--muted">
        <div class="container">
          <div class="section-heading">
            <p class="eyebrow">${pageData.stepEyebrow || "How it works"}</p>
            <h2>${pageData.stepHeading}</h2>
          </div>
          <div class="repair-content-grid">${steps}</div>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <div class="container footer footer--rich">
        <div class="footer-brand">
          <img class="footer-brand__logo" src="${linkUrl("assets/logo-techm8.png")}" alt="TECHM8 logo">
          <p>TECHM8 supports repairs, products and practical technology help for homes, schools and businesses.</p>
        </div>
        <div>
          <h4>Services</h4>
          <a href="${linkUrl("repair-services/phones/apple.html")}">Phone Repairs</a>
          <a href="${linkUrl("repair-services/tablets/apple.html")}">Tablet Repairs</a>
          <a href="${linkUrl("repair-services/computers/laptop.html")}">Laptop Repairs</a>
          <a href="${linkUrl("repair-services/consoles/xbox.html")}">Console Repairs</a>
          ${serviceFooterLinks}
        </div>
        <div>
          <h4>Explore</h4>
          <a href="${linkUrl("repairs.html")}">Repairs Overview</a>
          <a href="${linkUrl("products.html")}">Products</a>
          <a href="${linkUrl("stores.html")}">Stores</a>
          <a href="${linkUrl("shop.html")}">Online Store</a>
        </div>
        <div>
          <h4>Need Help?</h4>
          <p>Choose your nearest store for repairs, product advice and walk-in support.</p>
          <a href="${linkUrl("stores.html")}">Find your nearest store</a>
          <a href="${linkUrl("book-repair.html")}">Book a repair</a>
        </div>
      </div>
      <div class="container footer footer--bottom">
        <p>&copy; 2026 TECHM8. All rights reserved.</p>
        <a href="${linkUrl("store-policy.html")}">Repair Terms &amp; Conditions</a>
      </div>
    </footer>
  `;
}
