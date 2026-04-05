const filterButtons = document.querySelectorAll("[data-filter]");
const productCards = document.querySelectorAll(".product-card");
const navToggle = document.querySelector(".nav__toggle");
const navMenu = document.querySelector(".nav__menu");
const dropdownToggles = document.querySelectorAll(".nav__dropdown-toggle");

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

    document.querySelectorAll(".nav__dropdown.is-open").forEach((item) => {
      if (item !== dropdown) {
        item.classList.remove("is-open");
        item.querySelector(".nav__dropdown-toggle")?.setAttribute("aria-expanded", "false");
      }
    });

    const alreadyOpen = dropdown.classList.contains("is-open");

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

  if (target.closest(".nav__dropdown")) return;

  document.querySelectorAll(".nav__dropdown.is-open").forEach((item) => {
    item.classList.remove("is-open");
    item.querySelector(".nav__dropdown-toggle")?.setAttribute("aria-expanded", "false");
  });
});
