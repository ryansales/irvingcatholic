#!/usr/bin/env node
/* Checks the static site itself: that every local file a page references is
   actually in the repo (Netlify publishes "." verbatim, so a missing file is a
   404 in production), and that the two deployed pages still carry the meta tags
   and scripts they need.

   Run: node scripts/check-static.mjs
*/
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadDirectory, createReport, repoRoot } from './lib/load-directory.mjs';

/* The pages that actually ship. The *.dc.html design sources are checked for
   broken links too — Netlify publishes the whole directory — but they are not
   held to the meta-tag rules. */
const DEPLOYED_PAGES = ['index.html', 'listing.html'];

/* Indexable pages that are not listings, so they are not derivable from the
   data. Must stay in step with STATIC_PAGES in tools/generate-sitemap.js —
   if the two drift, the sitemap check below fails and says so. */
const STATIC_PAGES = ['suggest.html', 'update.html', 'contact.html'];

/* Load order is load-bearing: seo.js reads the directory and rewrites the head
   before support.js paints. */
const REQUIRED_SCRIPTS = ['directory-data.js', 'seo.js', 'support.js'];

/* Only the tags that must be in the file. Canonical and the social tags are
   set per listing by seo.js at runtime, so they are asserted on the rendered
   head in tests/smoke.mjs instead — a static check here would just be wrong. */
const REQUIRED_META = [
  { name: 'title', test: (html) => /<title>[^<]{10,}<\/title>/i.test(html) },
  { name: 'meta description', test: (html) => /<meta\s+name="description"\s+content="[^"]{20,}"/i.test(html) },
  { name: 'og:type', test: (html) => /<meta\s+property="og:type"/i.test(html) },
];

const report = createReport('static site');
const htmlFiles = readdirSync(repoRoot).filter((f) => f.endsWith('.html'));

if (!htmlFiles.length) report.error('repo', 'no HTML files found');

/* ---------- local references resolve ---------- */
const ATTR = /\b(?:href|src)\s*=\s*"([^"]*)"/gi;
const isExternal = (u) => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(u);
const isTemplated = (u) => u.includes('{{') || u.includes("' +") || u.includes('${');

let checkedRefs = 0;
let deadAnchors = 0;

for (const file of htmlFiles) {
  const html = readFileSync(join(repoRoot, file), 'utf8');
  for (const [, raw] of html.matchAll(ATTR)) {
    const url = raw.trim();
    if (!url || isExternal(url) || isTemplated(url)) continue;
    if (url === '#') {
      deadAnchors += 1;
      continue;
    }
    if (url.startsWith('#')) continue; // in-page anchor
    const path = decodeURIComponent(url.split('#')[0].split('?')[0]).replace(/^\.?\//, '');
    if (!path) continue;
    checkedRefs += 1;
    if (!existsSync(join(repoRoot, path))) {
      report.error(file, `references "${url}" which does not exist in the repo`);
    }
  }
}
if (deadAnchors) {
  report.warn('footer links', `${deadAnchors} href="#" placeholder link(s) still have no destination`);
}

/* ---------- the deployed pages are still wired up ---------- */
for (const page of DEPLOYED_PAGES) {
  if (!existsSync(join(repoRoot, page))) {
    report.error(page, 'is missing — this page is deployed');
    continue;
  }
  const html = readFileSync(join(repoRoot, page), 'utf8');
  const positions = REQUIRED_SCRIPTS.map((script) => {
    const at = html.search(new RegExp(`<script[^>]*src="\\.?/?${script.replace('.', '\\.')}"`, 'i'));
    if (at === -1) report.error(page, `does not load ${script} — the page would render empty`);
    return at;
  });
  for (let i = 1; i < positions.length; i += 1) {
    if (positions[i - 1] !== -1 && positions[i] !== -1 && positions[i] < positions[i - 1]) {
      report.error(page, `loads ${REQUIRED_SCRIPTS[i]} before ${REQUIRED_SCRIPTS[i - 1]} — order matters`);
    }
  }
  for (const { name, test } of REQUIRED_META) {
    if (!test(html)) report.error(page, `missing or too short: ${name}`);
  }
}

/* ---------- the hand-run sitemap still matches the data ---------- */
const sitemapPath = join(repoRoot, 'sitemap.xml');
if (!existsSync(sitemapPath)) {
  report.error('sitemap.xml', 'is missing — robots.txt points at it');
} else {
  const listed = new Set(
    [...readFileSync(sitemapPath, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]),
  );
  const site = [...listed][0]?.match(/^https?:\/\/[^/]+/)?.[0] ?? 'https://irving-catholic.net';
  const expected = new Set([
    `${site}/`,
    ...STATIC_PAGES.map((p) => `${site}/${p}`),
    ...loadDirectory().resources.filter((r) => !r.placeholder).map((r) => `${site}/listing.html?id=${r.id}`),
  ]);
  for (const loc of expected) {
    if (!listed.has(loc)) report.error('sitemap.xml', `does not list ${loc} — run node tools/generate-sitemap.js`);
  }
  for (const loc of listed) {
    if (!expected.has(loc)) report.error('sitemap.xml', `lists ${loc}, which is not a live listing — run node tools/generate-sitemap.js`);
  }
}

/* ---------- hosting config ---------- */
const netlifyToml = join(repoRoot, 'netlify.toml');
if (!existsSync(netlifyToml)) {
  report.error('netlify.toml', 'is missing — Netlify would fall back to its defaults');
} else if (!/publish\s*=\s*"\."/.test(readFileSync(netlifyToml, 'utf8'))) {
  report.error('netlify.toml', 'no longer publishes the repo root');
}

const robots = join(repoRoot, 'robots.txt');
if (existsSync(robots)) {
  const sitemap = readFileSync(robots, 'utf8').match(/^Sitemap:\s*\S*?\/([^/\s]+)$/im);
  if (sitemap && !existsSync(join(repoRoot, sitemap[1]))) {
    report.warn('robots.txt', `points at /${sitemap[1]}, which is not in the repo`);
  }
}

report.finish(`static site OK — ${htmlFiles.length} pages, ${checkedRefs} local references resolved`);
