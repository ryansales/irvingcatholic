#!/usr/bin/env node
/* Checks every outbound URL the site depends on: each listing's website plus
   the CDN assets the pages load. Directories rot — parishes move hosts and
   small businesses let domains lapse — so this runs on a schedule rather than
   on every pull request, where a flaky third-party host would block a merge.

   Run: node scripts/check-external-links.mjs [--report out.md]
*/
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadDirectory, repoRoot } from './lib/load-directory.mjs';

const TIMEOUT_MS = 20000;
const CONCURRENCY = 6;
const UA = 'Mozilla/5.0 (compatible; irving-catholic-linkcheck/1.0; +https://irving-catholic.net/)';

/* Hosts that answer a bot with a challenge rather than the truth. Reported
   separately so a Cloudflare page never masquerades as a dead listing. */
const INCONCLUSIVE = new Set([401, 403, 405, 406, 429, 999]);

const reportPath = (() => {
  const i = process.argv.indexOf('--report');
  return i !== -1 ? process.argv[i + 1] : null;
})();

const dir = loadDirectory();

const targets = new Map(); // url -> [labels]
const add = (url, label) => {
  if (!targets.has(url)) targets.set(url, []);
  targets.get(url).push(label);
};

for (const r of dir.resources) {
  if (r.placeholder === true) continue; // example listings carry example domains
  if (typeof r.website === 'string' && r.website.trim()) {
    add(`https://${r.website.trim().replace(/^\/+/, '')}`, `${r.name} (${r.id})`);
  }
}
for (const file of readdirSync(repoRoot).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(join(repoRoot, file), 'utf8');
  for (const [tag] of html.matchAll(/<(?:link|script)\b[^>]*>/gi)) {
    /* preconnect/dns-prefetch point at bare origins that answer 404 by design */
    if (/rel\s*=\s*"(?:preconnect|dns-prefetch)"/i.test(tag)) continue;
    const url = tag.match(/\b(?:href|src)\s*=\s*"(https:\/\/[^"{]+)"/i)?.[1];
    if (url) add(url, `${file} asset`);
  }
}

async function probe(url) {
  for (const method of ['HEAD', 'GET']) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': UA, accept: '*/*' },
      });
      if (res.ok) return { ok: true, status: res.status, finalUrl: res.url };
      if (method === 'HEAD' && (INCONCLUSIVE.has(res.status) || res.status >= 500)) continue;
      return { ok: false, status: res.status, finalUrl: res.url };
    } catch (err) {
      if (method === 'GET') {
        return { ok: false, status: 0, error: err.name === 'AbortError' ? 'timed out' : String(err.cause?.code ?? err.message) };
      }
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, status: 0, error: 'unreachable' };
}

const entries = [...targets.entries()];
const results = [];
let cursor = 0;
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, entries.length) }, async () => {
    while (cursor < entries.length) {
      const [url, labels] = entries[cursor++];
      results.push({ url, labels, ...(await probe(url)) });
    }
  }),
);
results.sort((a, b) => a.url.localeCompare(b.url));

const dead = results.filter((r) => !r.ok && !INCONCLUSIVE.has(r.status));
const unverified = results.filter((r) => !r.ok && INCONCLUSIVE.has(r.status));

const describe = (r) => `\`${r.url}\` — ${r.error ?? `HTTP ${r.status}`} — ${r.labels.join(', ')}`;

const lines = [];
lines.push(`Checked ${results.length} outbound URLs: ${results.length - dead.length - unverified.length} OK, ${dead.length} failing, ${unverified.length} inconclusive.`);
if (dead.length) {
  lines.push('', '### Failing', ...dead.map((r) => `- ${describe(r)}`));
}
if (unverified.length) {
  lines.push('', '### Inconclusive (bot protection — verify by hand)', ...unverified.map((r) => `- ${describe(r)}`));
}
const body = lines.join('\n');

console.log(body);
if (reportPath) writeFileSync(reportPath, body);
process.exit(dead.length ? 1 : 0);
