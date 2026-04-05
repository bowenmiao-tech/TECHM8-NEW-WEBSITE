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
    item.querySelector(".nav__dropdown-toggle")?.setAttribute("aria-expanded", "false");
  });
}

function initNavigation() {
  const navToggle = document.querySelector(".nav__toggle");
  const navMenu = document.querySelector(".nav__menu");
  const dropdownToggles = document.querySelectorAll(".nav__dropdown-toggle");

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

function initPage() {
  initFilters();
  initNavigation();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}
