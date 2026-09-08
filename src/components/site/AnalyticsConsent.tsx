"use client";

import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ANALYTICS_CONSENT_KEY, type AnalyticsConsent, isAnalyticsHost,
  isPublicAnalyticsPath, syncAnalytics,
} from "@/lib/analytics";

const CHANGE_EVENT = "foz-analytics-consent-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getConsent(): AnalyticsConsent {
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : "unknown";
  } catch { return "unknown"; }
}

export function AnalyticsConsent() {
  const pathname = usePathname() || "/";
  const search = useSearchParams()?.toString() || "";
  const stored = useSyncExternalStore(subscribe, getConsent, () => "unknown" as const);
  const production = useSyncExternalStore(subscribe,
    () => isAnalyticsHost(window.location.hostname), () => false);
  const [sessionChoice, setSessionChoice] = useState<AnalyticsConsent | null>(null);
  const [editing, setEditing] = useState(false);
  const consent = sessionChoice ?? stored;
  const publicPage = isPublicAnalyticsPath(pathname);

  useLayoutEffect(() => {
    syncAnalytics(pathname, consent);
    const syncLocation = () => syncAnalytics(window.location.pathname, consent);
    window.addEventListener("hashchange", syncLocation);
    window.addEventListener("popstate", syncLocation);
    return () => {
      window.removeEventListener("hashchange", syncLocation);
      window.removeEventListener("popstate", syncLocation);
    };
  }, [pathname, search, consent]);

  function choose(value: "granted" | "denied") {
    // Disable immediately on revocation, before the next React render.
    syncAnalytics(pathname, value);
    try {
      window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
      setSessionChoice(null);
    } catch { setSessionChoice(value); }
    window.dispatchEvent(new Event(CHANGE_EVENT));
    setEditing(false);
  }

  if (!production || !publicPage) return null;

  return (
    <>
      <button type="button" onClick={() => setEditing(true)}
        className="fixed bottom-3 left-3 z-40 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
        Cookies de estatística
      </button>
      {(consent === "unknown" || editing) && (
        <section aria-label="Preferências de cookies de estatística"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl sm:inset-x-6 sm:bottom-6">
          <h2 className="text-base font-semibold">Sua privacidade</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Com sua autorização, usamos o Google Analytics para entender quais páginas
            são visitadas e melhorar o portal. Você pode recusar os cookies de estatística
            e continuar navegando normalmente, ou mudar sua escolha a qualquer momento.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => choose("denied")}
              className="min-h-11 flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
              Recusar estatísticas
            </button>
            <button type="button" onClick={() => choose("granted")}
              className="min-h-11 flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Aceitar estatísticas
            </button>
          </div>
        </section>
      )}
    </>
  );
}
