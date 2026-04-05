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
}

function armDropdownNavigation(toggle) {
  document.querySelectorAll(".nav__dropdown-toggle").forEach((item) => {
    if (item !== toggle) {
      delete item.dataset.navReady;
    }
  });

  toggle.dataset.navReady = "true";
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

  const isMobileView = window.innerWidth <= 960;
  const destination = dropdownToggle.getAttribute("href");
  const alreadyOpen = dropdown.classList.contains("is-open");
  const readyToNavigate = dropdownToggle.dataset.navReady === "true";
  closeAllDropdowns(dropdown);

  if (!alreadyOpen || !readyToNavigate) {
    event.preventDefault();
    dropdown.classList.add("is-open");
    dropdownToggle.setAttribute("aria-expanded", "true");
    armDropdownNavigation(dropdownToggle);
    return;
  }

  if (isMobileView && destination) {
    event.preventDefault();
    window.location.href = destination;
    return;
  }

  delete dropdownToggle.dataset.navReady;
  dropdownToggle.setAttribute("aria-expanded", "true");
}

function initNavigation() {
  decorateMobileMenu();

  const mobileInput = document.querySelector(".nav__mobile-input");
  const navMenu = document.querySelector(".nav__menu");
  const navToggle = document.querySelector(".nav__toggle");
  const dropdownToggles = document.querySelectorAll(".nav__dropdown-toggle");

  if (mobileInput && navMenu) {
    mobileInput.addEventListener("change", () => {
      const isOpen = mobileInput.checked;
      navMenu.classList.toggle("is-open", isOpen);
      navToggle?.setAttribute("aria-expanded", String(isOpen));
      if (!isOpen) {
        closeAllDropdowns();
      }
    });
  }

  dropdownToggles.forEach((dropdownToggle) => {
    dropdownToggle.addEventListener("click", (event) => {
      handleDropdownToggle(event, dropdownToggle);
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest(".nav__toggle")) {
      return;
    }

    if (target.closest(".nav__dropdown-toggle")) return;

    if (target.closest(".nav__dropdown")) return;

    closeAllDropdowns();
  });
}

function initPage() {
  initFilters();
  initNavigation();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}
