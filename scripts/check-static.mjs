#!/usr/bin/env node
/* Checks the static site itself: that every local file a page references is
   actually in the repo (Netlify publishes site/ verbatim, so a missing file is
   a 404 in production), and that the two deployed pages still carry the meta
   tags and scripts they need.

   Two roots, and the difference matters. site/ is the deploy — a reference
   from a page there must resolve inside it, because nothing above it is
   reachable by a visitor. design/ holds the .dc.html design sources, which
   are checked for broken links and for the <helmet> rule but never ship, so
   their references resolve against the repo instead.

   Run: node scripts/check-static.mjs
*/
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadDirectory, createReport, repoRoot, siteRoot } from './lib/load-directory.mjs';

const designRoot = join(repoRoot, 'design');

/* The pages that actually ship. The *.dc.html design sources are checked for
   broken links and the <helmet> rule too, but they are not held to the
   meta-tag rules and they are not deployed. */
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

/* Every page to check, tagged with the root its relative links resolve against
   and whether it ships. */
const pages = [
  ...readdirSync(siteRoot)
    .filter((f) => f.endsWith('.html'))
    .map((name) => ({ name, label: `site/${name}`, root: siteRoot, deployed: true })),
  ...(existsSync(designRoot) ? readdirSync(designRoot) : [])
    .filter((f) => f.endsWith('.html'))
    .map((name) => ({ name, label: `design/${name}`, root: designRoot, deployed: false })),
];

const sitePages = pages.filter((p) => p.deployed);
if (!sitePages.length) report.error('site/', 'no HTML files found — nothing would deploy');

/* ---------- local references resolve ---------- */
const ATTR = /\b(?:href|src)\s*=\s*"([^"]*)"/gi;
/* Comments can contain markup that looks like tags — including the note in the
   page head that explains this very rule. */
const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');
const isExternal = (u) => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(u);
const isTemplated = (u) => u.includes('{{') || u.includes("' +") || u.includes('${');

let checkedRefs = 0;
let deadAnchors = 0;

for (const { label, name, root, deployed } of pages) {
  const html = readFileSync(join(root, name), 'utf8');
  for (const [, raw] of html.matchAll(ATTR)) {
    const url = raw.trim();
    if (!url || isExternal(url) || isTemplated(url)) continue;
    if (url === '#') {
      deadAnchors += 1;
      continue;
    }
    if (url.startsWith('#')) continue; // in-page anchor
    const clean = decodeURIComponent(url.split('#')[0].split('?')[0]);
    if (!clean) continue;
    checkedRefs += 1;

    /* A root-relative URL is resolved by the browser against the deploy root,
       which is siteRoot — never the repo. A relative one is resolved against
       the page's own folder. */
    const target = clean.startsWith('/')
      ? join(siteRoot, clean.slice(1))
      : join(root, clean);

    if (!existsSync(target)) {
      report.error(label, `references "${url}" which does not exist in the repo`);
      continue;
    }
    /* A deployed page may only reach inside the deploy. A "../" that escapes
       site/ resolves in the checkout but 404s in production, where nothing
       above the publish root is served. */
    if (deployed && !join(target).startsWith(siteRoot)) {
      report.error(label, `references "${url}", which is outside site/ — it would 404 in production`);
    }
  }
}
if (deadAnchors) {
  report.warn('footer links', `${deadAnchors} href="#" placeholder link(s) still have no destination`);
}

/* ---------- the deployed pages are still wired up ---------- */
for (const page of DEPLOYED_PAGES) {
  if (!existsSync(join(siteRoot, page))) {
    report.error(`site/${page}`, 'is missing — this page is deployed');
    continue;
  }
  const html = readFileSync(join(siteRoot, page), 'utf8');
  const positions = REQUIRED_SCRIPTS.map((script) => {
    const at = html.search(new RegExp(`<script[^>]*src="\\.?/?${script.replace('.', '\\.')}"`, 'i'));
    if (at === -1) report.error(`site/${page}`, `does not load ${script} — the page would render empty`);
    return at;
  });
  for (let i = 1; i < positions.length; i += 1) {
    if (positions[i - 1] !== -1 && positions[i] !== -1 && positions[i] < positions[i - 1]) {
      report.error(`site/${page}`, `loads ${REQUIRED_SCRIPTS[i]} before ${REQUIRED_SCRIPTS[i - 1]} — order matters`);
    }
  }
  for (const { name, test } of REQUIRED_META) {
    if (!test(html)) report.error(`site/${page}`, `missing or too short: ${name}`);
  }
}

/* ---------- nothing executable inside <helmet> ---------- */
/* support.js copies <helmet> children into <head>. For a <script src> the
   browser has *already* run it while parsing the body, so the copy is a second
   execution: leaflet.js re-runs, replaces window.L with a fresh Leaflet, and
   the markercluster plugin attached to the old one disappears. That was issue
   #4. Libraries belong in the real <head>. */
for (const { label, name, root } of pages) {
  const helmet = stripComments(readFileSync(join(root, name), 'utf8')).match(/<helmet[\s>][\s\S]*?<\/helmet\s*>/i)?.[0];
  if (!helmet) continue;
  for (const [, src] of helmet.matchAll(/<script[^>]*\bsrc="([^"]+)"/gi)) {
    report.error(label, `loads ${src} from inside <helmet> — it will execute twice; move it to <head> (issue #4)`);
  }
}

/* ---------- no page loads the same script twice ---------- */
for (const { label, name, root } of pages) {
  const counts = new Map();
  for (const [, src] of stripComments(readFileSync(join(root, name), 'utf8')).matchAll(/<script[^>]*\bsrc="([^"]+)"/gi)) {
    const key = src.replace(/^\.?\//, '');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [src, n] of counts) {
    if (n > 1) report.error(label, `loads ${src} ${n} times — it will execute ${n} times`);
  }
}

/* ---------- the hand-run sitemap still matches the data ---------- */
const sitemapPath = join(siteRoot, 'sitemap.xml');
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

/* ---------- no design-time asset reaches a deployed page ---------- */
/* image-slot.js is a 65KB drag-and-drop editor that renders a static <img>
   once window.omelette is absent, and it fetches a .image-slots.state.json
   sidecar that is gitignored — a 404 on every visit. It belongs to the design
   sources only. index.html is regenerated from Home.dc.html by hand, so
   without this check a regeneration silently drags it back into the deploy
   (same failure mode as the <helmet> rule above). */
const DESIGN_ONLY_SCRIPTS = ['image-slot.js'];
for (const { label, name, root } of pages.filter((p) => p.deployed)) {
  const html = readFileSync(join(root, name), 'utf8');
  for (const script of DESIGN_ONLY_SCRIPTS) {
    const pattern = new RegExp(`<script[^>]*\\bsrc="[^"]*${script.replace('.', '\\.')}"`, 'i');
    if (pattern.test(stripComments(html))) {
      report.error(label, `loads ${script}, which is design-time only — use a plain <img> in the shipping page`);
    }
  }
  if (/<image-slot[\s>]/i.test(stripComments(html))) {
    report.error(label, '<image-slot> is design-time only — the shipping page should use a plain <img>');
  }
}

/* ---------- hosting config ---------- */
const netlifyToml = join(repoRoot, 'netlify.toml');
if (!existsSync(netlifyToml)) {
  report.error('netlify.toml', 'is missing — Netlify would fall back to its defaults');
} else {
  const toml = readFileSync(netlifyToml, 'utf8');
  const publish = toml.match(/publish\s*=\s*"([^"]*)"/)?.[1];
  if (publish !== 'site') {
    report.error(
      'netlify.toml',
      `publishes "${publish ?? '(unset)'}" — it must publish "site", or the docs, checks, and design sources deploy too`,
    );
  }
}

/* robots.txt and sitemap.xml are only reachable from the deploy root. */
const robots = join(siteRoot, 'robots.txt');
if (!existsSync(robots)) {
  report.error('site/robots.txt', 'is missing — it must sit at the deploy root to be served at /robots.txt');
} else {
  const sitemap = readFileSync(robots, 'utf8').match(/^Sitemap:\s*\S*?\/([^/\s]+)$/im);
  if (sitemap && !existsSync(join(siteRoot, sitemap[1]))) {
    report.warn('robots.txt', `points at /${sitemap[1]}, which is not in site/`);
  }
}

report.finish(
  `static site OK — ${sitePages.length} deployed page(s), ${pages.length - sitePages.length} design source(s), ` +
  `${checkedRefs} local references resolved`,
);
