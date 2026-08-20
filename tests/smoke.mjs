#!/usr/bin/env node
/* Renders the real pages in a real browser. Everything on this site is drawn
   client-side from directory-data.js, so a broken template or a runtime error
   in support.js produces a blank page that no amount of file checking would
   catch — only actually loading it does.

   Run: cd tests && npm install && npm test
*/
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loadDirectory, repoRoot } from '../scripts/lib/load-directory.mjs';

const here = dirname(fileURLToPath(import.meta.url));

/* The pages pull React, Leaflet, and marker clustering from unpkg at runtime.
   The test serves the same versions from node_modules instead, so a CDN
   hiccup can never turn into a red build. Keep these versions in step with
   the URLs in the HTML and in support.js — an unmapped unpkg URL fails the
   test on purpose, so a new runtime dependency has to be a deliberate choice.
   Whether unpkg itself is up is a separate, scheduled check. */
const CDN_MAP = {
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js': 'react/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js': 'react-dom/umd/react-dom.production.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js': 'leaflet/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css': 'leaflet/dist/leaflet.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js': 'leaflet.markercluster/dist/leaflet.markercluster.js',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css': 'leaflet.markercluster/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css': 'leaflet.markercluster/dist/MarkerCluster.Default.css',
};

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
};

/* Serve the repo the way Netlify does: publish ".", no build, no rewrites. */
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  const file = join(repoRoot, normalize(path === '/' ? '/index.html' : path).replace(/^(\.\.[/\\])+/, ''));
  try {
    if (!(await stat(file)).isFile()) throw new Error('not a file');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

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

/* If a dependency bump moves node_modules ahead of the versions the site
   actually requests, the stand-in would quietly test the wrong code. */
for (const [url, local] of Object.entries(CDN_MAP)) {
  const wanted = url.match(/@(\d+\.\d+\.\d+)\//)?.[1];
  const pkg = local.split('/')[0];
  const installed = JSON.parse(await readFile(join(here, 'node_modules', pkg, 'package.json'), 'utf8')).version;
  check(
    `${pkg} in node_modules matches the ${wanted} the site loads`,
    installed === wanted,
    `installed ${installed} — update the unpkg URLs in the HTML and CDN_MAP together`,
  );
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

/* OpenStreetMap asks that its tile servers not be used by automation, and a
   missing tile says nothing about whether our code works. */
await context.route('**://*.tile.openstreetmap.org/**', (route) => route.abort());
await context.route('**://fonts.googleapis.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
await context.route('**://fonts.gstatic.com/**', (route) => route.abort());

const unmappedCdn = [];
await context.route('**://unpkg.com/**', async (route) => {
  const url = route.request().url();
  const local = CDN_MAP[url];
  if (!local) {
    unmappedCdn.push(url);
    return route.abort();
  }
  const file = join(here, 'node_modules', local);
  if (!existsSync(file)) {
    unmappedCdn.push(`${url} (expected ${local} in node_modules)`);
    return route.abort();
  }
  return route.fulfill({
    status: 200,
    contentType: file.endsWith('.css') ? 'text/css' : 'text/javascript',
    body: await readFile(file),
  });
});

const pageErrors = [];
context.on('page', (page) => {
  page.on('pageerror', (err) => pageErrors.push(`${page.url()}: ${err.message}`));
});

const page = await context.newPage();

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

for (const cat of Object.values(dir.categories)) {
  check(`category filter "${cat.short}" is offered`, homeText.includes(cat.short));
}

/* Search drives the map, the sidebar, and the online section at once, so it is
   worth exercising rather than just asserting the box exists. */
if (hasSearch) {
  const words = (s) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? []);
  const subject = physical[0];
  const unrelated = physical.find(
    (r) => r !== subject && ![...words(r.name)].some((w) => words(subject.name).has(w)),
  );
  await search.fill(subject.name);
  await page.waitForFunction((name) => document.body.textContent.includes(name), unrelated.name, {
    timeout: 5000,
  }).then(() => {}, () => {});
  const searched = await page.evaluate(() => document.body.textContent);
  check(`searching "${subject.name}" keeps it`, searched.includes(subject.name));
  check(`searching "${subject.name}" drops "${unrelated.name}"`, !searched.includes(unrelated.name));

  await search.fill('zzzznothingmatchesthis');
  await page.waitForFunction(() => /no listings match/i.test(document.body.textContent), null, {
    timeout: 5000,
  }).then(() => {}, () => {});
  check('a query with no results says so', /no listings match/i.test(await page.evaluate(() => document.body.textContent)));

  await search.fill('');
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
}

/* An unknown ?id= must not throw — a stale share link is a normal event. */
await page.goto(`${base}/listing.html?id=no-such-listing`, { waitUntil: 'load' });
const notFoundText = await page.innerText('body');
check('unknown id degrades gracefully', notFoundText.trim().length > 0);

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
