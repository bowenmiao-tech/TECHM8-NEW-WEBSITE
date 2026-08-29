const TECHM8_GA4_ID = "G-7YLMGHMRDG";
const TECHM8_CONSENT_KEY = "techm8_cookie_consent_v1";
const TECHM8_CONSENT_COOKIE = "techm8_cookie_consent";

window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function gtag() {
  window.dataLayer.push(arguments);
};

let analyticsLoadPromise = null;

// Returns true when the visitor accepted analytics, false when they declined, and
// null when they have not answered the banner yet.
function readStoredConsent() {
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
    if (!item) return null;
    const consent = JSON.parse(
      decodeURIComponent(item.split("=").slice(1).join("=")),
    );
    if (consent?.version === 1) return Boolean(consent.analytics);
    return null;
  } catch (_error) {
    return null;
  }
}

// Australian privacy law uses an opt-out model for analytics cookies, so measurement
// runs until the visitor declines. Declining is honoured immediately through Google
// Consent Mode v2 rather than by refusing to load the tag, which keeps consent
// signals flowing and lets GA4 model the declined sessions.
function analyticsAllowed() {
  return readStoredConsent() !== false;
}

function consentState(granted) {
  return {
    analytics_storage: granted ? "granted" : "denied",
    // TECHM8 does not run advertising or remarketing through this property.
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  };
}

window.gtag("consent", "default", consentState(analyticsAllowed()));

function loadGoogleAnalytics() {
  if (analyticsLoadPromise) return analyticsLoadPromise;

  window.gtag("js", new Date());
  window.gtag("config", TECHM8_GA4_ID, { anonymize_ip: true });

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
  const granted = Boolean(event.detail?.consent?.analytics);
  window.gtag("consent", "update", consentState(granted));
  if (granted) loadGoogleAnalytics();
});

window.trackTechM8Event = function trackTechM8Event(name, params) {
  if (!name) return false;
  loadGoogleAnalytics();
  window.gtag("event", name, params || {});
  return true;
};

scheduleAnalyticsLoad();
