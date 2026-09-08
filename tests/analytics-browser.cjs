/* eslint-disable @typescript-eslint/no-require-imports */
// Run with Playwright available (or NODE_PATH pointing to the bundled runtime).
// Synthetic pages only. Google collection requests are intercepted, never sent.
const { chromium } = require('playwright');
const ts = require('typescript');
const fs = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    const events = [];
    await page.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (/google-analytics\.com$/.test(url.hostname) && url.pathname.endsWith('/collect')) {
        const body = request.postData() || '';
        for (const line of body.split('\n')) {
          const params = new URLSearchParams(url.search + (line ? '&' + line : ''));
          events.push(Object.fromEntries(params));
        }
        return route.fulfill({ status: 204 });
      }
      if (url.hostname === 'www.fozemdestaque.com') {
        return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><title>Teste isolado</title></head><body>Teste de analytics</body></html>' });
      }
      if (url.hostname === 'www.googletagmanager.com' && url.pathname === '/gtag/js') return route.continue();
      return route.abort();
    });
    const source = ts.transpileModule(fs.readFileSync('src/lib/analytics.ts', 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    }).outputText;
    await page.goto('https://www.fozemdestaque.com/');
    await page.addScriptTag({ content: `var exports = {}; var process = {env:{}}; ${source}; window.testSyncAnalytics = exports.syncAnalytics;` });
    await page.evaluate(() => window.testSyncAnalytics('/', 'denied'));
    assert.equal(await page.locator('#foz-google-analytics').count(), 0);
    await page.evaluate(() => window.testSyncAnalytics('/', 'granted'));
    await page.waitForTimeout(4000);
    await page.evaluate(() => {
      history.pushState({}, '', '/post/teste?email=private@example.com');
      window.testSyncAnalytics('/post/teste', 'granted');
    });
    await page.waitForTimeout(2500);
    assert.equal(events.filter(event => event.en === 'page_view').length, 1, 'free-form URL parameters must not reach Analytics');
    await page.evaluate(() => {
      history.pushState({}, '', '/post/outro-teste');
      window.testSyncAnalytics('/post/outro-teste', 'granted');
      window.testSyncAnalytics('/post/outro-teste', 'granted');
    });
    await page.waitForTimeout(2500);
    assert.equal(events.filter(event => event.en === 'page_view').length, 1, 'the first return from an unsafe URL must not expose its referrer');
    await page.evaluate(() => {
      history.pushState({}, '', '/post/teste');
      window.testSyncAnalytics('/post/teste', 'granted');
    });
    await page.waitForTimeout(2500);
    const views = events.filter(event => event.en === 'page_view');
    console.log('Page views intercepted:', views.map(view => ({ id: view.tid, location: view.dl })));
    assert.equal(views.length, 2, 'one initial view plus one History API navigation');
    assert.equal(views[0].tid, 'G-NQ03Z7NBKT');
    assert.equal(views[0].dl, 'https://www.fozemdestaque.com/');
    assert.equal(views[1].dl, 'https://www.fozemdestaque.com/post/teste');
    assert.equal(JSON.stringify(events).includes('private@example.com'), false, 'private URL values must not leak through referrers or other events');
    await page.evaluate(() => {
      history.pushState({}, '', '/admin');
      window.testSyncAnalytics('/admin', 'granted');
    });
    await page.waitForTimeout(2000);
    assert.equal(events.filter(event => event.en === 'page_view').length, 2, 'admin must not be measured');
    await page.evaluate(() => window.testSyncAnalytics('/', 'denied'));
    assert.equal(await page.evaluate(() => window['ga-disable-G-NQ03Z7NBKT']), true);
    assert.equal((await page.context().cookies()).filter(cookie => cookie.name.startsWith('_ga')).length, 0);
    console.log('PASS: consent, SPA measurement without duplicates, free-form query exclusion, admin exclusion, revocation.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
