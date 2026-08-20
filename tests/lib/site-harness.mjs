/* Shared browser harness: serves the repo the way Netlify does and stands in
   for the CDNs the pages load at runtime, so both the smoke test and the map
   regression test drive the real site under identical, hermetic conditions.
*/
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { siteRoot } from '../../scripts/lib/load-directory.mjs';

const here = join(dirname(fileURLToPath(import.meta.url)), '..');

/* The pages pull React, Leaflet, and marker clustering from unpkg at runtime.
   These serve the same versions from node_modules instead, so a CDN hiccup can
   never turn into a red build. Keep them in step with the URLs in the HTML and
   in support.js — an unmapped unpkg URL fails on purpose, so a new runtime
   dependency has to be a deliberate choice. Whether unpkg itself is up is a
   separate, scheduled check. */
export const CDN_MAP = {
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
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
};

/* Serve site/ the way Netlify does: publish "site", no build, no rewrites.
   Nothing above the publish root is reachable, which is exactly the point. */
export async function serveSite() {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(req.url.split('?')[0]);
    const file = join(siteRoot, normalize(path === '/' ? '/index.html' : path).replace(/^(\.\.[/\\])+/, ''));
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
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

/* Every version in CDN_MAP must match what the pages actually request; a
   dependency bump that moves node_modules ahead would otherwise quietly test
   code the site does not run. */
export async function checkCdnVersions(report) {
  for (const [url, local] of Object.entries(CDN_MAP)) {
    const wanted = url.match(/@(\d+\.\d+\.\d+)\//)?.[1];
    const pkg = local.split('/')[0];
    const installed = JSON.parse(await readFile(join(here, 'node_modules', pkg, 'package.json'), 'utf8')).version;
    report(
      `${pkg} in node_modules matches the ${wanted} the site loads`,
      installed === wanted,
      `installed ${installed} — update the unpkg URLs in the HTML and CDN_MAP together`,
    );
  }
}

/* A shared CI runner is several times slower than a laptop, and this site has
   timing-sensitive map code. Pass a rate > 1 to reproduce that locally. */
export const cpuThrottle = Number(process.env.SMOKE_CPU_THROTTLE || 1);

export async function launchSite({ viewport = { width: 1440, height: 1000 } } = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport });
  const unmappedCdn = [];

  /* Map tiles say nothing about whether our code works, and hammering a public
     tile server from CI is rude. */
  await context.route('**://*.basemaps.cartocdn.com/**', (route) => route.abort());
  await context.route('**://*.tile.openstreetmap.org/**', (route) => route.abort());
  await context.route('**://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await context.route('**://fonts.gstatic.com/**', (route) => route.abort());

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

  return { browser, context, unmappedCdn };
}

export async function throttle(context, page) {
  if (cpuThrottle <= 1) return;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle });
}

/* buildMap() schedules an invalidateSize + fitBounds 250ms after the map
   appears, and fitBounds animates. Rather than guess how long that takes on a
   given machine, wait for the map container to go quiet and stay quiet. */
export async function mapIdle(page) {
  await page
    .waitForFunction(() => !!document.querySelector('#homeMapHost .leaflet-container'), null, { timeout: 20000 })
    .catch(() => {});
  await page.evaluate(() => { window.__mapQuietSince = 0; });
  await page
    .waitForFunction(
      () => {
        const el = document.querySelector('#homeMapHost .leaflet-container');
        if (!el) return false;
        if (el.classList.contains('leaflet-zoom-anim')) { window.__mapQuietSince = 0; return false; }
        if (!window.__mapQuietSince) { window.__mapQuietSince = Date.now(); return false; }
        return Date.now() - window.__mapQuietSince > 800;
      },
      null,
      { timeout: 20000, polling: 100 },
    )
    .catch(() => {});
}
