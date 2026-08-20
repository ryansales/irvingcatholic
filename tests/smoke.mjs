#!/usr/bin/env node
/* Renders the real pages in a real browser. Everything on this site is drawn
   client-side from directory-data.js, so a broken template or a runtime error
   in support.js produces a blank page that no amount of file checking would
   catch — only actually loading it does.

   Run: cd tests && npm install && npm test
*/
import { readFile } from 'node:fs/promises';
import { loadDirectory } from '../scripts/lib/load-directory.mjs';
import { serveSite, launchSite, throttle, mapIdle, checkCdnVersions, cpuThrottle } from './lib/site-harness.mjs';

const { server, base } = await serveSite();

const dir = loadDirectory();
const physical = dir.resources.filter((r) => !r.online);
const online = dir.resources.filter((r) => r.online);

const failures = [];
const check = (name, condition, detail = '') => {
  if (condition) console.log(`  ok    ${name}`);
  else {
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
    failures.push(name);
  }
};

await checkCdnVersions(check);

const { browser, context, unmappedCdn } = await launchSite();

const pageErrors = [];
context.on('page', (p) => {
  p.on('pageerror', (err) => pageErrors.push(`${p.url()}: ${err.message}`));
});

const page = await context.newPage();
await throttle(context, page);
if (cpuThrottle > 1) console.log(`(CPU throttled ${cpuThrottle}x)`);

/* seo.js rewrites the head at load time, so the tags that matter are the
   rendered ones — reading the file would only show the fallbacks. */
const readHead = (target) =>
  target.evaluate(() => ({
    title: document.title,
    canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
    description: document.querySelector('meta[name="description"]')?.content ?? null,
    ogTitle: document.querySelector('meta[property="og:title"]')?.content ?? null,
    ogDescription: document.querySelector('meta[property="og:description"]')?.content ?? null,
    robots: document.querySelector('meta[name="robots"]')?.content ?? null,
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((n) => n.textContent),
  }));

const parseJsonLd = (blocks) => {
  const nodes = [];
  for (const block of blocks) {
    try {
      nodes.push(JSON.parse(block));
    } catch {
      nodes.push({ '@type': 'UNPARSEABLE' });
    }
  }
  return nodes;
};

/* ---------- homepage ---------- */
console.log('index.html');
await page.goto(`${base}/index.html`, { waitUntil: 'load' });
await page.waitForFunction(() => document.body.innerText.trim().length > 500, null, { timeout: 20000 });

const search = page.getByPlaceholder(/search/i).first();
const hasSearch = await search.waitFor({ state: 'visible', timeout: 20000 }).then(() => true, () => false);
check('search field renders', hasSearch);

/* The sidebar reports "<shown> of <total>"; every category starts switched on,
   so nothing in the data should be hidden on first paint. */
await page
  .waitForFunction((n) => document.body.textContent.includes(`${n} of ${n}`), physical.length, { timeout: 20000 })
  .catch(() => {});

const homeText = await page.innerText('body');
check('headline renders', /living map of Catholic life/i.test(homeText));
check(
  'every listing is visible on first paint',
  (await page.evaluate((n) => document.body.textContent.includes(`${n} of ${n}`), physical.length)),
  'the sidebar count line does not show every physical listing — a category may be missing from the default filter state',
);

const missingFromSidebar = physical.filter((r) => !homeText.includes(r.name));
check(
  'every physical listing appears on the homepage',
  missingFromSidebar.length === 0,
  missingFromSidebar.map((r) => r.id).join(', '),
);

const missingOnline = online.filter((r) => !homeText.includes(r.name));
check(
  'every online listing appears in the online section',
  missingOnline.length === 0,
  missingOnline.map((r) => r.id).join(', '),
);

/* Every detail page has to be reachable by a crawler from the homepage. They
   were not: the only link to a listing used to live inside Leaflet popup HTML,
   which is not in the DOM until someone clicks a pin. */
const linkedIds = await page.evaluate(() =>
  [...document.querySelectorAll('a[href*="listing.html?id="]')].map(
    (a) => new URL(a.getAttribute('href'), location.href).searchParams.get('id'),
  ),
);
const unlinked = dir.resources.filter((r) => !linkedIds.includes(r.id));
check(
  'every listing is reachable by a plain link from the homepage',
  unlinked.length === 0,
  unlinked.map((r) => r.id).join(', '),
);

const homeHead = await readHead(page);
const homeLd = parseJsonLd(homeHead.jsonLd);
const homeTypes = homeLd.map((n) => n['@type']);
check('the homepage emits structured data', homeLd.length > 0, homeTypes.join(', '));
check('the homepage structured data parses', !homeTypes.includes('UNPARSEABLE'));
check('the homepage declares itself a WebSite', homeTypes.includes('WebSite'), homeTypes.join(', '));
check('the homepage lists its listings as an ItemList', homeTypes.includes('ItemList'), homeTypes.join(', '));
check('the homepage is canonical to the site root', /^https?:\/\/[^/]+\/$/.test(homeHead.canonical ?? ''), String(homeHead.canonical));

const site = (homeHead.canonical ?? '').replace(/\/$/, '');

for (const cat of Object.values(dir.categories)) {
  check(`category filter "${cat.short}" is offered`, homeText.includes(cat.short));
}

/* Search drives the map, the sidebar, and the online section at once, so it is
   worth exercising rather than just asserting the box exists. */
if (hasSearch) {
  /* Changing the query tears the Leaflet map down and rebuilds it: 120ms of
     debounce, then ~250ms of invalidateSize/fitBounds. Let that finish between
     steps — typing the next query into a half-rebuilt map is a race, and one
     this test is not the right place to exercise. See issue #4. */
  const settle = async () => {
    await page.waitForTimeout(200); // clear the 120ms debounce so the rebuild has started
    await mapIdle(page);
  };
  await settle(); // the map is still settling from first paint
  const words = (s) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? []);
  const subject = physical[0];
  const unrelated = physical.find(
    (r) => r !== subject && ![...words(r.name)].some((w) => words(subject.name).has(w)),
  );
  await search.fill(subject.name);
  await settle();
  await page.waitForFunction((name) => document.body.textContent.includes(name), unrelated.name, {
    timeout: 5000,
  }).then(() => {}, () => {});
  const searched = await page.evaluate(() => document.body.textContent);
  check(`searching "${subject.name}" keeps it`, searched.includes(subject.name));
  check(`searching "${subject.name}" drops "${unrelated.name}"`, !searched.includes(unrelated.name));

  await search.fill('zzzznothingmatchesthis');
  await settle();
  await page.waitForFunction(() => /no listings match/i.test(document.body.textContent), null, {
    timeout: 5000,
  }).then(() => {}, () => {});
  check('a query with no results says so', /no listings match/i.test(await page.evaluate(() => document.body.textContent)));

  await search.fill('');
  await settle();
  await page.waitForFunction((n) => document.body.textContent.includes(`${n} of ${n}`), physical.length, {
    timeout: 5000,
  }).then(() => {}, () => {});
  check('clearing the search restores every listing', await page.evaluate((n) => document.body.textContent.includes(`${n} of ${n}`), physical.length));
}

const pins = await page.locator('.leaflet-marker-icon').count();
check('the map drew markers', pins > 0, `found ${pins}`);
const boundary = await page.locator('.leaflet-overlay-pane path').count();
check('the map drew the Irving boundary', boundary > 0);

/* ---------- detail pages ---------- */
console.log('listing.html');
const samples = [
  physical.find((r) => Array.isArray(r.mass) && r.mass.length),
  physical.find((r) => r.category === 'school'),
  online[0],
].filter(Boolean);

for (const r of samples) {
  await page.goto(`${base}/listing.html?id=${encodeURIComponent(r.id)}`, { waitUntil: 'load' });
  await page.waitForFunction(
    (name) => document.body.innerText.includes(name),
    r.name,
    { timeout: 20000 },
  ).catch(() => {});
  const text = await page.innerText('body');
  check(`${r.id}: name renders`, text.includes(r.name));
  if (r.address) check(`${r.id}: address renders`, text.includes(r.address.split(',')[0]));
  if (r.phone) check(`${r.id}: phone renders`, text.includes(r.phone));
  if (Array.isArray(r.mass) && r.mass.length) {
    check(`${r.id}: Mass times render`, text.includes(r.mass[0].split(',')[0]));
  }
  const backHome = await page.locator('a[href="index.html"]').count();
  check(`${r.id}: links back to the map`, backHome > 0);

  /* Every listing used to share the homepage's canonical, title, and
     description, which kept all 27 detail pages out of the index. */
  const head = await readHead(page);
  check(`${r.id}: title is its own`, head.title.includes(r.name), head.title);
  check(
    `${r.id}: canonical points at itself`,
    head.canonical === `${site}/listing.html?id=${r.id}`,
    String(head.canonical),
  );
  check(`${r.id}: has a description`, (head.description ?? '').length > 20);
  check(`${r.id}: has og:title and og:description`, !!head.ogTitle && !!head.ogDescription);

  const ld = parseJsonLd(head.jsonLd);
  check(`${r.id}: structured data parses`, ld.length > 0 && !ld.some((n) => n['@type'] === 'UNPARSEABLE'));
  check(
    `${r.id}: structured data names the listing`,
    ld.some((n) => n.name === r.name || n['@graph']?.some?.((g) => g.name === r.name)),
  );

  /* Placeholders stand in for businesses that do not exist yet; indexing them
     would put a fictional business in search results. */
  const noindexed = /noindex/i.test(head.robots ?? '');
  check(
    `${r.id}: ${r.placeholder ? 'placeholder is noindexed' : 'real listing is indexable'}`,
    noindexed === !!r.placeholder,
    `robots: ${head.robots ?? 'none'}`,
  );
}

/* An unknown ?id= must not throw — a stale share link is a normal event. */
await page.goto(`${base}/listing.html?id=no-such-listing`, { waitUntil: 'load' });
const notFoundText = await page.innerText('body');
check('unknown id degrades gracefully', notFoundText.trim().length > 0);
const notFoundHead = await readHead(page);
check(
  'unknown id is kept out of the index',
  /noindex/i.test(notFoundHead.robots ?? ''),
  `robots: ${notFoundHead.robots ?? 'none'} — it renders a real listing, so indexing it would duplicate that page`,
);

/* ---------- a shared search URL reopens the same search ---------- */
const seeded = physical[0].name.split(' ').pop();
await page.goto(`${base}/index.html?q=${encodeURIComponent(seeded)}`, { waitUntil: 'load' });
await page
  .waitForFunction((q) => document.querySelector('input[placeholder*="Search"]')?.value === q, seeded, {
    timeout: 20000,
  })
  .then(() => {}, () => {});
check(
  `?q=${seeded} seeds the search box`,
  (await page.evaluate(() => document.querySelector('input[placeholder*="Search"]')?.value ?? '')) === seeded,
);

check('no uncaught JavaScript errors', pageErrors.length === 0, pageErrors.join(' | '));
check(
  'every unpkg dependency is pinned in CDN_MAP',
  unmappedCdn.length === 0,
  [...new Set(unmappedCdn)].join(', '),
);

await browser.close();
server.close();

if (failures.length) {
  console.log(`\nsmoke test: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('\nsmoke test OK');
