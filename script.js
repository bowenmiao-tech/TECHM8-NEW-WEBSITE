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

function toggleMainMenu(button) {
  const nav = button.closest(".nav");
  const navMenu = nav?.querySelector(".nav__menu");
  const mobileInput = nav?.querySelector(".nav__mobile-input");
  if (!navMenu) return;

  if (mobileInput) {
    mobileInput.checked = !mobileInput.checked;
  }

  const isOpen = navMenu.classList.toggle("is-open");
  button.setAttribute("aria-expanded", String(isOpen));
}

window.toggleMainMenu = toggleMainMenu;

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
  const mobileInput = document.querySelector(".nav__mobile-input");
  const navMenu = document.querySelector(".nav__menu");
  const navToggle = document.querySelector(".nav__toggle");
  const dropdownToggles = document.querySelectorAll(".nav__dropdown-toggle");

  if (mobileInput && navMenu) {
    mobileInput.addEventListener("change", () => {
      const isOpen = mobileInput.checked;
      navMenu.classList.toggle("is-open", isOpen);
      navToggle?.setAttribute("aria-expanded", String(isOpen));
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

    const navToggle = target.closest(".nav__toggle");
    if (navToggle) {
      toggleMainMenu(navToggle);
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
