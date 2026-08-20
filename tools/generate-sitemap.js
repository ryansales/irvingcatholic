#!/usr/bin/env node
/* Regenerates sitemap.xml from directory-data.js.
   Run this after adding or removing a listing:  node tools/generate-sitemap.js
   It is not a build step — the committed sitemap.xml is what Netlify serves. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://irving-catholic.net';

global.window = {};
require(path.join(ROOT, 'directory-data.js'));
const data = global.window.IRVING_DIRECTORY;

// Placeholder listings are stand-ins for real businesses; keep them out of the
// index until they are replaced with real ones.
const listings = data.resources.filter(r => !r.placeholder);
const today = new Date().toISOString().slice(0, 10);

const url = (loc, priority, changefreq) =>
  `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n` +
  `    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

const body = [
  url(`${SITE}/`, '1.0', 'weekly'),
  ...listings.map(r => url(`${SITE}/listing.html?id=${r.id}`, '0.8', 'monthly'))
].join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
console.log(`sitemap.xml: ${listings.length + 1} URLs (${data.resources.length - listings.length} placeholder listing(s) skipped)`);
