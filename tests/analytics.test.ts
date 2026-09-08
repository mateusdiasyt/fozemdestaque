import test from "node:test";
import assert from "node:assert/strict";
import { GA_ID, analyticsPageLocation, isAnalyticsHost, isAnalyticsQueryAllowed, isPublicAnalyticsPath, syncAnalytics } from "../src/lib/analytics";

test("somente domínios oficiais e páginas públicas", () => {
  assert.equal(isAnalyticsHost("www.fozemdestaque.com"), true);
  assert.equal(isAnalyticsHost("fozemdestaque.com"), true);
  for (const host of ["localhost", "72.61.27.102", "fozemdestaque.vercel.app", "evilfozemdestaque.com"]) {
    assert.equal(isAnalyticsHost(host), false);
  }
  for (const path of ["/", "/post/artigo", "/categoria/agenda", "/busca", "/contatos"]) assert.equal(isPublicAnalyticsPath(path), true);
  for (const path of ["/admin", "/admin/posts", "/api/posts", "/login", "/post/a/b"]) assert.equal(isPublicAnalyticsPath(path), false);
  assert.equal(analyticsPageLocation("/busca?q=email@example.com#privado"), "https://www.fozemdestaque.com/busca");
  assert.equal(isAnalyticsQueryAllowed("?q=nome", ""), false);
  assert.equal(isAnalyticsQueryAllowed("?email=private@example.com", ""), false);
  assert.equal(isAnalyticsQueryAllowed("?utm_source=facebook&utm_campaign=noticias", ""), true);
  assert.equal(isAnalyticsQueryAllowed("?utm_campaign=private@example.com", ""), false);
  assert.equal(isAnalyticsQueryAllowed("", "#dados"), false);
});

test("consentimento, inicialização única, navegação, admin e revogação", () => {
  const scripts: { id: string; src: string }[] = [];
  const browser: {
    location: { hostname: string; search: string; hash: string; href: string };
    dataLayer?: IArguments[];
    __fozAnalytics?: { active: boolean };
    [key: string]: unknown;
  } = { location: { hostname: "www.fozemdestaque.com", search: "", hash: "", href: "https://www.fozemdestaque.com/" } };
  Object.assign(globalThis, {
    window: browser,
    document: {
      cookie: "",
      getElementById: (id: string) => scripts.find(script => script.id === id),
      createElement: () => ({}),
      head: { appendChild: (script: { id: string; src: string }) => scripts.push(script) },
    },
  });
  syncAnalytics("/", "unknown");
  syncAnalytics("/", "denied");
  assert.equal(scripts.length, 0);
  assert.equal(browser[`ga-disable-${GA_ID}`], true);
  syncAnalytics("/", "granted");
  syncAnalytics("/", "granted");
  syncAnalytics("/post/artigo", "granted");
  const calls = browser.dataLayer!.map((call: IArguments) => Array.from(call));
  assert.equal(scripts.length, 1);
  assert.match(scripts[0].src, /G-NQ03Z7NBKT/);
  assert.equal(calls.filter((call: unknown[]) => call[0] === "config").length, 1);
  assert.equal(calls.filter((call: unknown[]) => call[0] === "event").length, 0);
  assert.equal(calls.at(-1)[1].page_location, "https://www.fozemdestaque.com/post/artigo");
  syncAnalytics("/admin", "granted");
  assert.equal(browser[`ga-disable-${GA_ID}`], true);
  syncAnalytics("/", "granted");
  assert.equal(browser[`ga-disable-${GA_ID}`], false);
  syncAnalytics("/", "denied");
  assert.equal(browser[`ga-disable-${GA_ID}`], true);
  assert.equal(browser.__fozAnalytics!.active, false);
  browser.location.hostname = "localhost";
  syncAnalytics("/", "granted");
  assert.equal(browser[`ga-disable-${GA_ID}`], true);
});
