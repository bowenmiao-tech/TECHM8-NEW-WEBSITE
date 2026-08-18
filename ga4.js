const TECHM8_GA4_ID = "G-7YLMGHMRDG";
const TECHM8_CONSENT_KEY = "techm8_cookie_consent_v1";
const TECHM8_CONSENT_COOKIE = "techm8_cookie_consent";

window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function gtag() {
  window.dataLayer.push(arguments);
};

let analyticsLoadPromise = null;

function readAnalyticsConsent() {
  try {
    const stored = window.localStorage.getItem(TECHM8_CONSENT_KEY);
    const consent = stored ? JSON.parse(stored) : null;
    if (consent?.version === 1) return Boolean(consent.analytics);
  } catch (_error) {
    // Cookie fallback below covers unavailable browser storage.
  }

  try {
    const item = document.cookie
      .split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${TECHM8_CONSENT_COOKIE}=`));
    if (!item) return false;
    const consent = JSON.parse(
      decodeURIComponent(item.split("=").slice(1).join("=")),
    );
    return consent?.version === 1 && Boolean(consent.analytics);
  } catch (_error) {
    return false;
  }
}

function loadGoogleAnalytics() {
  if (!readAnalyticsConsent()) return Promise.resolve(false);
  if (analyticsLoadPromise) return analyticsLoadPromise;

  window.gtag("js", new Date());
  window.gtag("config", TECHM8_GA4_ID);

  analyticsLoadPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${TECHM8_GA4_ID}`;
    script.dataset.techm8Analytics = "true";
    script.addEventListener("load", () => resolve(true), { once: true });
    script.addEventListener("error", () => resolve(false), { once: true });
    document.head.appendChild(script);
  });

  return analyticsLoadPromise;
}

function scheduleAnalyticsLoad() {
  const load = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => loadGoogleAnalytics(), { timeout: 3000 });
    } else {
      window.setTimeout(() => loadGoogleAnalytics(), 1200);
    }
  };

  if (document.readyState === "complete") load();
  else window.addEventListener("load", load, { once: true });
}

window.addEventListener("techm8:cookie-consent-updated", (event) => {
  if (event.detail?.consent?.analytics) loadGoogleAnalytics();
});

window.trackTechM8Event = function trackTechM8Event(name, params) {
  if (!name || !readAnalyticsConsent()) return false;
  loadGoogleAnalytics();
  window.gtag("event", name, params || {});
  return true;
};

if (readAnalyticsConsent()) scheduleAnalyticsLoad();
