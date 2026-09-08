export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-NQ03Z7NBKT";
export const ANALYTICS_CONSENT_KEY = "foz-analytics-consent-v1";
export type AnalyticsConsent = "granted" | "denied" | "unknown";

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  __fozAnalytics?: { active: boolean; url: string; blockedUrl?: string };
};

export function isAnalyticsHost(hostname: string) {
  return hostname === "www.fozemdestaque.com" || hostname === "fozemdestaque.com";
}

export function isPublicAnalyticsPath(pathname: string) {
  return /^(?:\/$|\/(?:post|categoria)\/[^/]+\/?$|\/(?:busca|contatos|nossa-historia|produtos-servicos|divulgue-seu-aniversario)\/?$)/.test(pathname);
}

export function analyticsPageLocation(pathname: string) {
  return `https://www.fozemdestaque.com${pathname.split(/[?#]/, 1)[0]}`;
}

export function isAnalyticsQueryAllowed(search: string, hash: string) {
  if (hash) return false;
  // Enhanced measurement reads the browser URL itself on SPA navigation.
  // Reject free-form/search parameters rather than relying on page_location
  // overrides to redact Google's automatically generated events.
  const campaignKeys = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_content", "utm_term"]);
  const clickKeys = new Set(["gclid", "dclid", "fbclid", "gbraid", "wbraid"]);
  for (const [key, value] of new URLSearchParams(search)) {
    if (campaignKeys.has(key) && /^[a-z][a-z0-9_-]{0,99}$/i.test(value)) continue;
    if (clickKeys.has(key) && /^[a-z0-9_-]{10,500}$/i.test(value)) continue;
    return false;
  }
  return true;
}

function clearAnalyticsCookies() {
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.trim().split("=", 1)[0];
    if (name !== "_ga" && name !== `_ga_${GA_ID.replace(/^G-/, "")}`) continue;
    for (const domain of ["", "; domain=fozemdestaque.com", "; domain=www.fozemdestaque.com"]) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain}; SameSite=Lax; Secure`;
    }
  }
}

// Google enhanced measurement handles History API page views. Do not also emit
// manual page_view events here: that would count Next.js navigations twice.
export function syncAnalytics(pathname: string, consent: AnalyticsConsent) {
  const browser = window as AnalyticsWindow;
  const currentUrl = window.location.href;
  const previousUrl = browser.__fozAnalytics?.url;
  const previous = previousUrl ? new URL(previousUrl) : null;
  // Google's history event can include the previous URL as page_referrer.
  // After an excluded URL, skip the first subsequent navigation too.
  const previousIsSafe = !previous || (isPublicAnalyticsPath(previous.pathname)
    && isAnalyticsQueryAllowed(previous.search, previous.hash));
  if (browser.__fozAnalytics && !previousIsSafe) browser.__fozAnalytics.blockedUrl = currentUrl;
  const enabled = consent === "granted" && isAnalyticsHost(window.location.hostname)
    && isPublicAnalyticsPath(pathname)
    && isAnalyticsQueryAllowed(window.location.search, window.location.hash)
    && previousIsSafe && browser.__fozAnalytics?.blockedUrl !== currentUrl;
  (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = !enabled;

  if (!enabled) {
    if (browser.__fozAnalytics?.active) {
      browser.gtag?.("consent", "update", { analytics_storage: "denied" });
      browser.__fozAnalytics.active = false;
    }
    if (consent === "denied") clearAnalyticsCookies();
    if (browser.__fozAnalytics) browser.__fozAnalytics.url = currentUrl;
    return;
  }

  browser.dataLayer ||= [];
  // gtag's command queue expects an Arguments object, as in Google's snippet.
  // eslint-disable-next-line prefer-rest-params
  browser.gtag ||= function () { browser.dataLayer!.push(arguments); };
  const gtag = browser.gtag;
  const page = {
    page_location: analyticsPageLocation(pathname),
    page_title: "Foz em Destaque",
    // Never forward search terms, query strings or form data in the referrer.
    page_referrer: "",
  };
  gtag("set", page);

  if (!browser.__fozAnalytics) {
    gtag("consent", "default", {
      analytics_storage: "denied", ad_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied",
    });
    gtag("js", new Date());
    browser.__fozAnalytics = { active: false, url: currentUrl };
  }

  if (!browser.__fozAnalytics.active) {
    gtag("consent", "update", { analytics_storage: "granted" });
    gtag("config", GA_ID, {
      ...page,
      // A history event will produce the view when returning from an excluded
      // route. Consent granted on the same page needs its own initial view.
      send_page_view: !previousUrl || previousUrl === currentUrl,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_flags: "SameSite=Lax;Secure",
    });
    browser.__fozAnalytics.active = true;
  }
  browser.__fozAnalytics.url = currentUrl;

  if (!document.getElementById("foz-google-analytics")) {
    const script = document.createElement("script");
    script.id = "foz-google-analytics";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    document.head.appendChild(script);
  }
}
