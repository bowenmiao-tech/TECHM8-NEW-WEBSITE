const pageData = window.REPAIR_PAGE_DATA;

if (pageData) {
  const prefix = pageData.prefix || "../../";

  const navDropdown = `
    <div class="nav__dropdown">
      <a class="nav__dropdown-toggle" href="${prefix}repairs.html" aria-expanded="false">Repairs</a>
      <div class="nav__dropdown-menu">
        <div class="nav__dropdown-group">
          <strong>Phones</strong>
          <a href="${prefix}repair-services/phones/apple.html">Apple</a>
          <a href="${prefix}repair-services/phones/samsung.html">Samsung</a>
          <a href="${prefix}repair-services/phones/oppo.html">Oppo</a>
          <a href="${prefix}repair-services/phones/huawei.html">Huawei</a>
          <a href="${prefix}repair-services/phones/xiaomi.html">Xiaomi</a>
          <a href="${prefix}repair-services/phones/google.html">Google</a>
          <a href="${prefix}repair-services/phones/oneplus.html">OnePlus</a>
          <a href="${prefix}repair-services/phones/others.html">Others</a>
        </div>
        <div class="nav__dropdown-group">
          <strong>Tablets</strong>
          <a href="${prefix}repair-services/tablets/apple.html">Apple</a>
          <a href="${prefix}repair-services/tablets/samsung.html">Samsung</a>
          <a href="${prefix}repair-services/tablets/other.html">Other Tablets</a>
        </div>
        <div class="nav__dropdown-group">
          <strong>Computers</strong>
          <a href="${prefix}repair-services/computers/pc-tower.html">PC Tower</a>
          <a href="${prefix}repair-services/computers/all-in-one.html">All in One</a>
          <a href="${prefix}repair-services/computers/laptop.html">Laptop</a>
          <a href="${prefix}repair-services/computers/small-pc.html">Small PC</a>
        </div>
        <div class="nav__dropdown-group">
          <strong>Game Consoles</strong>
          <a href="${prefix}repair-services/consoles/sony.html">Sony</a>
          <a href="${prefix}repair-services/consoles/xbox.html">Xbox</a>
          <a href="${prefix}repair-services/consoles/nintendo.html">Nintendo</a>
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
        <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="primary-menu" aria-label="Open menu">
          <span></span><span></span><span></span>
        </button>
        <nav class="nav__menu" id="primary-menu">
          <a href="${prefix}index.html">Home</a>
          ${navDropdown}
          <a href="${prefix}products.html">Products</a>
          <a href="${prefix}stores.html">Stores</a>
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

  const navToggle = document.querySelector(".nav__toggle");
  const navMenu = document.querySelector(".nav__menu");
  const dropdownToggles = document.querySelectorAll(".nav__dropdown-toggle");

  const closeAllDropdowns = (exceptDropdown) => {
    document.querySelectorAll(".nav__dropdown.is-open").forEach((item) => {
      if (item === exceptDropdown) return;
      item.classList.remove("is-open");
      item.querySelector(".nav__dropdown-toggle")?.setAttribute("aria-expanded", "false");
    });
  };

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  dropdownToggles.forEach((toggle) => {
    toggle.addEventListener("click", (event) => {
      const dropdown = toggle.closest(".nav__dropdown");
      if (!dropdown) return;

      const alreadyOpen = dropdown.classList.contains("is-open");
      closeAllDropdowns(dropdown);

      if (!alreadyOpen) {
        event.preventDefault();
        dropdown.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        return;
      }

      toggle.setAttribute("aria-expanded", "true");
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest(".nav__dropdown") || target.closest(".nav__toggle")) return;

    closeAllDropdowns();
  });
}
