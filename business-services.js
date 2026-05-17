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
  const seoServices = (pageData.seoServices || [])
    .map((service) => `<li>${service}</li>`)
    .join("");
  const locationTags = (pageData.locations || [])
    .map((location) => `<span>${location}</span>`)
    .join("");
  const relatedLinks = (pageData.relatedLinks || [])
    .map(
      (link) =>
        `<a class="business-seo-link" href="${linkUrl(link.href)}">${link.label}</a>`,
    )
    .join("");
  const faqItems = (pageData.faqs || [])
    .map(
      (faq) => `
        <article class="business-faq-item">
          <h3>${faq.question}</h3>
          <p>${faq.answer}</p>
        </article>`,
    )
    .join("");
  const ndisIntro = pageData.isNdisPage
    ? `
      <section class="section section--muted business-ndis-strip">
        <div class="container business-ndis-strip__inner">
          <div>
            <p class="eyebrow">Partnership</p>
            <h2>Delivered with Proud Support Services</h2>
            <p>TECHM8 works with Proud Support Services to provide practical technology support for NDIS-related enquiries. Proud Support Services can support the participant pathway while TECHM8 handles electronic device repairs, setup and technical troubleshooting.</p>
          </div>
          <a class="button button--secondary" href="https://proudsupportservices.com.au/" target="_blank" rel="noopener">Visit Proud Support Services</a>
        </div>
      </section>`
    : "";
  const ndisSeoSection =
    pageData.isNdisPage && (seoServices || locationTags || relatedLinks)
      ? `
      <section class="section business-seo-section">
        <div class="container business-seo-layout">
          <div class="business-seo-main">
            <p class="eyebrow">NDIS technology support Brisbane</p>
            <h2>${pageData.seoHeading}</h2>
            <p>${pageData.seoLead}</p>
            ${seoServices ? `<ul class="business-seo-list">${seoServices}</ul>` : ""}
          </div>
          <aside class="business-seo-aside">
            ${
              locationTags
                ? `<div class="business-seo-card"><h3>${pageData.locationHeading || "Service areas"}</h3><div class="business-seo-tags">${locationTags}</div></div>`
                : ""
            }
            ${
              relatedLinks
                ? `<div class="business-seo-card"><h3>${pageData.relatedHeading || "Related services"}</h3><div class="business-seo-links">${relatedLinks}</div></div>`
                : ""
            }
          </aside>
        </div>
      </section>`
      : "";
  const ndisFundingNote = pageData.isNdisPage
    ? `
      <section class="section business-ndis-note">
        <div class="container">
          <div class="booking-card">
            <p class="eyebrow">NDIS assistive technology</p>
            <h2>Repairs, maintenance and practical technology help</h2>
            <p>NDIS guidance recognises repairs and maintenance for assistive technology. For electronic devices, TECHM8 can help clarify the device issue, provide practical repair or setup support, and prepare details that may assist participants, nominees, support coordinators or plan managers.</p>
            <div class="business-ndis-note__grid">
              <span>Device diagnosis</span>
              <span>Repair quotes</span>
              <span>Software setup</span>
              <span>On-site support</span>
              <span>Accessibility settings</span>
              <span>Follow-up contact</span>
            </div>
          </div>
        </div>
      </section>`
    : "";
  const ndisFaqSection =
    pageData.isNdisPage && faqItems
      ? `
      <section class="section business-faq-section" id="ndis-faq">
        <div class="container">
          <div class="section-heading">
            <p class="eyebrow">Questions</p>
            <h2>${pageData.faqHeading || "Frequently asked questions"}</h2>
          </div>
          <div class="business-faq-grid">${faqItems}</div>
        </div>
      </section>`
      : "";
  const ndisForm = pageData.isNdisPage
    ? `
      <section class="section section--muted" id="ndis-enquiry">
        <div class="container booking-layout business-ndis-enquiry">
          <div class="booking-card">
            <div class="section-heading section-heading--compact">
              <p class="eyebrow">Submit an enquiry</p>
              <h2>Request NDIS technology support</h2>
              <p>Leave the participant, coordinator or family contact details. TECHM8 will review the request and contact you directly.</p>
            </div>
            <form class="booking-form" data-ndis-enquiry-form novalidate>
              <div class="booking-message" data-ndis-enquiry-message hidden></div>
              <div class="booking-form__grid">
                <label class="booking-field"><span>Your name</span><input type="text" name="customer_name" required autocomplete="name" placeholder="Full name"></label>
                <label class="booking-field"><span>Your role</span><select name="contact_role" required><option value="">Select role</option><option>NDIS participant</option><option>Family member or nominee</option><option>Support coordinator</option><option>Plan manager</option><option>Support worker</option><option>Other</option></select></label>
                <label class="booking-field"><span>Phone</span><input type="tel" name="phone" required inputmode="tel" autocomplete="tel" placeholder="0412 345 678"></label>
                <label class="booking-field"><span>Email</span><input type="email" name="email" required inputmode="email" autocomplete="email" placeholder="name@example.com.au"></label>
                <label class="booking-field"><span>Preferred contact</span><select name="preferred_contact_method" required><option value="phone">Phone</option><option value="email">Email</option><option value="sms">SMS</option></select></label>
                <label class="booking-field"><span>Support location</span><input type="text" name="support_location" placeholder="Suburb or service area"></label>
                <label class="booking-field"><span>Device type</span><select name="device_type" required><option value="">Select device type</option><option>Mobile phone</option><option>Tablet or iPad</option><option>Laptop or computer</option><option>Printer, router or Wi-Fi</option><option>Assistive technology device</option><option>Software or app support</option><option>Other electronic device</option></select></label>
                <label class="booking-field"><span>Support type</span><select name="support_type" required><option value="">Select support type</option><option>On-site device inspection</option><option>Phone or tablet repair</option><option>Computer system check</option><option>Software installation</option><option>Accessibility settings setup</option><option>Data transfer or account setup</option><option>Wi-Fi, printer or connected device support</option><option>Quote or invoice request</option></select></label>
                <label class="booking-field booking-field--full"><span>Tell us what support is needed</span><textarea name="support_details" rows="6" required placeholder="Example: participant needs help setting up a new iPad, installing communication apps, transferring data, checking Wi-Fi and setting accessibility options."></textarea></label>
              </div>
              <label class="booking-checkbox"><input type="checkbox" name="privacy_consent" value="yes" required><span>I agree that TECHM8 may contact me about this NDIS technology support enquiry.</span></label>
              <div class="booking-form__actions"><button class="button button--primary" type="submit" data-ndis-enquiry-submit>Submit enquiry</button><a class="button button--secondary" href="tel:0452488710">Call TECHM8</a></div>
            </form>
          </div>
          <aside class="booking-sidebar">
            <div class="booking-sidebar__card">
              <h3>Suitable enquiry examples</h3>
              <ul>
                <li>Phone, tablet or laptop repair for a participant</li>
                <li>Home visit to check a computer, printer or Wi-Fi issue</li>
                <li>Software, app, email or accessibility setup</li>
                <li>Device setup after purchase or replacement</li>
                <li>Quote details for a coordinator or plan manager</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>`
    : "";

  const appRoot =
    document.querySelector("[data-business-service-root]") || document.body;
  const heroIconClass = pageData.heroIconClass || "vector-laptop";
  const heroIconLabel = pageData.heroIconLabel
    ? `<span>${pageData.heroIconLabel}</span>`
    : "";

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
            <div class="repair-detail-panel__icon ${heroIconClass}" aria-hidden="true">${heroIconLabel}</div>
          </div>
        </div>
      </section>
      ${ndisIntro}
      <section class="section">
        <div class="container">
          <div class="section-heading">
            <p class="eyebrow">${pageData.cardEyebrow || "Support options"}</p>
            <h2>${pageData.cardHeading}</h2>
          </div>
          <div class="repair-content-grid">${cards}</div>
        </div>
      </section>
      ${ndisSeoSection}
      ${ndisFundingNote}
      <section class="section section--muted">
        <div class="container">
          <div class="section-heading">
            <p class="eyebrow">${pageData.stepEyebrow || "How it works"}</p>
            <h2>${pageData.stepHeading}</h2>
          </div>
          <div class="repair-content-grid">${steps}</div>
        </div>
      </section>
      ${ndisFaqSection}
      ${ndisForm}
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

  const enquiryForm = document.querySelector("[data-ndis-enquiry-form]");
  if (enquiryForm instanceof HTMLFormElement) {
    const messageBox = enquiryForm.querySelector("[data-ndis-enquiry-message]");
    const submitButton = enquiryForm.querySelector("[data-ndis-enquiry-submit]");
    const setMessage = (type, text) => {
      if (!(messageBox instanceof HTMLElement)) return;
      messageBox.hidden = false;
      messageBox.className = `booking-message is-${type}`;
      messageBox.textContent = text;
    };
    enquiryForm.addEventListener("input", (event) => {
      if (event.target instanceof HTMLElement) {
        event.target.classList.remove("is-invalid");
      }
    });
    enquiryForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const requiredFields = enquiryForm.querySelectorAll("[required]");
      let firstInvalid = null;
      requiredFields.forEach((field) => {
        if (
          field instanceof HTMLInputElement ||
          field instanceof HTMLSelectElement ||
          field instanceof HTMLTextAreaElement
        ) {
          const isCheckbox = field instanceof HTMLInputElement && field.type === "checkbox";
          const invalid = isCheckbox ? !field.checked : !String(field.value || "").trim();
          field.classList.toggle("is-invalid", invalid);
          if (invalid && !firstInvalid) firstInvalid = field;
        }
      });
      if (firstInvalid) {
        setMessage("error", "Please complete all required fields before submitting.");
        firstInvalid.focus();
        return;
      }
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
      }
      try {
        const response = await fetch(linkUrl("api/ndis-enquiry.php"), {
          method: "POST",
          headers: { Accept: "application/json" },
          body: new FormData(enquiryForm),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Enquiry could not be submitted.");
        }
        enquiryForm.reset();
        setMessage("success", result.message || "Your enquiry has been submitted. TECHM8 will contact you shortly.");
      } catch (error) {
        setMessage("error", error instanceof Error ? error.message : "Enquiry could not be submitted.");
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
          submitButton.textContent = "Submit enquiry";
        }
      }
    });
  }
}
