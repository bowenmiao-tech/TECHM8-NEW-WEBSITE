window.dataLayer = window.dataLayer || [];

window.gtag = function gtag() {
  window.dataLayer.push(arguments);
};

window.gtag("js", new Date());
window.gtag("config", "G-7YLMGHMRDG");

window.trackTechM8Event = function trackTechM8Event(name, params) {
  if (!name || typeof window.gtag !== "function") {
    return false;
  }
  window.gtag("event", name, params || {});
  return true;
};
