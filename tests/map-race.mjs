#!/usr/bin/env node
/* Regression test for issue #4: changing the filter while the map is busy.

   Two defects met here. The pages loaded Leaflet and markercluster from inside
   <helmet>, which runs them twice — once as the browser parses them in the
   body, once when support.js copies them into <head> — and the second run of
   leaflet.js replaced window.L with a fresh Leaflet that no longer carried the
   markercluster plugin. Separately, every filter change destroyed and rebuilt
   the whole map, pulling DOM out from under animations still in flight.

   Both are timing-dependent and neither reproduces at full laptop speed, so
   this runs with the CPU throttled. SMOKE_CPU_THROTTLE overrides the rate.

   Run: cd tests && npm run test:map
*/
import { serveSite, launchSite, throttle, mapIdle, cpuThrottle } from './lib/site-harness.mjs';

const RATE = cpuThrottle > 1 ? cpuThrottle : 4;
process.env.SMOKE_CPU_THROTTLE = String(RATE);

const { server, base } = await serveSite();
const { browser, context } = await launchSite();

const failures = [];
const check = (name, condition, detail = '') => {
  if (condition) console.log(`  ok    ${name}`);
  else {
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
    failures.push(name);
  }
};

/* Ways to make the map busy right before the filter changes. */
const busy = {
  // Nothing: the fitBounds that buildMap schedules 250ms in is animating on its own.
  async load(page) {
    await page.getByPlaceholder(/search/i).first().waitFor({ state: 'visible', timeout: 30000 });
  },
  async zoom(page) {
    await mapIdle(page);
    await page.locator('.leaflet-control-zoom-in').click();
  },
  async cluster(page) {
    await mapIdle(page);
    await page.locator('.marker-cluster').first().click();
  },
};

/* Ways a reader changes the filter. */
const change = {
  async type(page) {
    await page.getByPlaceholder(/search/i).first().fill('St. Luke');
  },
  async typefast(page) {
    const box = page.getByPlaceholder(/search/i).first();
    for (const ch of 'Cistercian') {
      await box.press(ch);
      await page.waitForTimeout(35);
    }
  },
  async chips(page) {
    const chips = page.locator('.ic-sidebar button');
    const n = Math.min(4, await chips.count());
    for (let i = 0; i < n; i += 1) {
      await chips.nth(i).click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(40);
    }
  },
};

/* The gaps that used to fail. 120ms is the debounce itself, so a change landing
   there is the worst case. */
const GAPS = [30, 120];

console.log(`map race (CPU throttled ${RATE}x)`);

for (const [busyName, makeBusy] of Object.entries(busy)) {
  for (const [changeName, makeChange] of Object.entries(change)) {
    for (const gap of GAPS) {
      const page = await context.newPage();
      await throttle(context, page);
      const errors = [];
      page.on('pageerror', (err) => errors.push((err.stack || err.message).split('\n').slice(0, 2).join(' | ')));
      await page.goto(`${base}/index.html`, { waitUntil: 'load' });
      try {
        await makeBusy(page);
        await page.waitForTimeout(gap);
        await makeChange(page);
        await page.waitForTimeout(2000);
      } catch (err) {
        errors.push(`driver: ${err.message.split('\n')[0]}`);
      }
      check(
        `${busyName} + ${changeName} at ${gap}ms throws nothing`,
        errors.length === 0,
        [...new Set(errors)][0] || '',
      );
      await page.close();
    }
  }
}

/* The libraries must load exactly once. A <script src> inside <helmet> is the
   way this breaks: the browser runs it in the body, then support.js copies it
   into <head> and it runs again, and the second run of leaflet.js drops the
   markercluster plugin off window.L. */
{
  const page = await context.newPage();
  await throttle(context, page);
  await page.goto(`${base}/index.html`, { waitUntil: 'load' });
  await mapIdle(page);
  const state = await page.evaluate(() => {
    const srcs = [...document.querySelectorAll('script[src]')].map((s) => s.src);
    const counted = {};
    for (const src of srcs) counted[src] = (counted[src] || 0) + 1;
    return {
      duplicates: Object.entries(counted).filter(([, n]) => n > 1).map(([src]) => src.split('/').slice(-1)[0]),
      hasPlugin: typeof window.L?.markerClusterGroup === 'function',
      hasClusterClass: !!window.L?.MarkerCluster,
    };
  });
  check('no library is loaded twice', state.duplicates.length === 0, state.duplicates.join(', '));
  check('the markercluster plugin is still attached to window.L', state.hasPlugin && state.hasClusterClass);
  await page.close();
}

/* Filtering has to actually reach the map — a swap that silently does nothing
   would pass every check above. */
{
  const page = await context.newPage();
  await throttle(context, page);
  await page.goto(`${base}/index.html`, { waitUntil: 'load' });
  await mapIdle(page);
  const countPins = () => page.evaluate(() =>
    document.querySelectorAll('#homeMapHost .leaflet-marker-icon').length);
  const before = await countPins();
  await page.getByPlaceholder(/search/i).first().fill('Cistercian');
  await mapIdle(page);
  const filtered = await countPins();
  check('filtering changes what is on the map', filtered > 0 && filtered < before, `${before} -> ${filtered}`);

  /* The old full rebuild threw the reader's view away on every keystroke. */
  await page.locator('.leaflet-control-zoom-in').click();
  await mapIdle(page);
  const zoomed = await page.evaluate(() =>
    document.querySelector('#homeMapHost .leaflet-container')?.style.transform || '');
  await page.getByPlaceholder(/search/i).first().fill('Cistercian Prep');
  await mapIdle(page);
  const after = await countPins();
  check('filtering after a zoom still updates the map', after > 0, `${after} pins`);
  void zoomed;
  await page.close();
}

await browser.close();
server.close();

if (failures.length) {
  console.log(`\nmap race: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('\nmap race OK');
