#!/usr/bin/env node
/* Checks the static site itself: that every local file a page references is
   actually in the repo (Netlify publishes "." verbatim, so a missing file is a
   404 in production), and that the two deployed pages still carry the meta tags
   and scripts they need.

   Run: node scripts/check-static.mjs
*/
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createReport, repoRoot } from './lib/load-directory.mjs';

/* The pages that actually ship. The *.dc.html design sources are checked for
   broken links too — Netlify publishes the whole directory — but they are not
   held to the meta-tag rules. */
const DEPLOYED_PAGES = ['index.html', 'listing.html'];
const REQUIRED_SCRIPTS = ['support.js', 'directory-data.js'];
const REQUIRED_META = [
  { name: 'title', test: (html) => /<title>[^<]{10,}<\/title>/i.test(html) },
  { name: 'meta description', test: (html) => /<meta\s+name="description"\s+content="[^"]{20,}"/i.test(html) },
  { name: 'canonical link', test: (html) => /<link\s+rel="canonical"\s+href="https:\/\/[^"]+"/i.test(html) },
  { name: 'og:title', test: (html) => /<meta\s+property="og:title"/i.test(html) },
  { name: 'og:description', test: (html) => /<meta\s+property="og:description"/i.test(html) },
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
  for (const script of REQUIRED_SCRIPTS) {
    if (!html.includes(script)) {
      report.error(page, `does not load ${script} — the page would render empty`);
    }
  }
  for (const { name, test } of REQUIRED_META) {
    if (!test(html)) report.error(page, `missing or too short: ${name}`);
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
