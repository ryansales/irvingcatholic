#!/usr/bin/env node
/* Validates directory-data.js — the single source of truth for the site.
   Adding a listing is a one-file edit with no build step, so this script is
   the only thing standing between a typo and a broken map in production.

   Run: node scripts/validate-data.mjs
*/
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadDirectory, createReport, siteRoot } from './lib/load-directory.mjs';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const HOSTISH = /^[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_KEYS = ['website', 'instagram', 'facebook', 'etsy', 'email', 'phone'];
const BLURB_MAX = 160; // longer than this and the sidebar card grows a scrollbar

const report = createReport('directory-data.js');
const dir = loadDirectory();

/* ---------- top level ---------- */
const isLatLng = (p) =>
  Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number' && Number.isFinite(n));

if (!isLatLng(dir.center)) report.error('center', 'must be a [lat, lng] pair of numbers');
if (!(typeof dir.radiusMiles === 'number' && dir.radiusMiles > 0)) {
  report.error('radiusMiles', 'must be a positive number');
}
if (!Array.isArray(dir.irvingBoundary) || dir.irvingBoundary.length < 3) {
  report.error('irvingBoundary', 'must be a polygon of at least 3 [lat, lng] pairs');
} else {
  const bad = dir.irvingBoundary.findIndex((p) => !isLatLng(p));
  if (bad !== -1) report.error(`irvingBoundary[${bad}]`, 'is not a [lat, lng] pair of numbers');
}

/* ---------- categories ---------- */
const categoryKeys = Object.keys(dir.categories ?? {});
if (!categoryKeys.length) report.error('categories', 'is empty');
for (const [key, cat] of Object.entries(dir.categories ?? {})) {
  const where = `categories.${key}`;
  if (!SLUG.test(key)) report.error(where, 'key must be a lowercase slug');
  for (const field of ['label', 'short', 'desc']) {
    if (typeof cat?.[field] !== 'string' || !cat[field].trim()) {
      report.error(where, `missing ${field}`);
    }
  }
  if (!HEX.test(cat?.color ?? '')) report.error(where, `color must be #RRGGBB, got ${cat?.color}`);
}

/* ---------- resources ---------- */
const resources = dir.resources;
if (!Array.isArray(resources) || !resources.length) {
  report.error('resources', 'must be a non-empty array');
  report.finish('');
}

/* Bounding box of the municipal boundary, with a small margin. A listing
   outside it is almost always a sign flip or a transposed digit. */
const lats = dir.irvingBoundary.map((p) => p[0]);
const lngs = dir.irvingBoundary.map((p) => p[1]);
const box = {
  minLat: Math.min(...lats) - 0.05,
  maxLat: Math.max(...lats) + 0.05,
  minLng: Math.min(...lngs) - 0.05,
  maxLng: Math.max(...lngs) + 0.05,
};

/* Ray casting — used only to warn, since some listings legitimately sit just
   outside the city line while still serving Irving. */
function insideBoundary(lat, lng) {
  const poly = dir.irvingBoundary;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const seenIds = new Map();
const seenNames = new Map();
let placeholders = 0;

for (const [index, r] of resources.entries()) {
  const where = `resources[${index}] ${r?.id ?? '(no id)'}`;

  if (typeof r?.id !== 'string' || !SLUG.test(r.id)) {
    report.error(where, 'id must be a lowercase slug (a-z, 0-9, single hyphens) — it is the URL');
  } else if (seenIds.has(r.id)) {
    report.error(where, `duplicate id, already used by resources[${seenIds.get(r.id)}]`);
  } else {
    seenIds.set(r.id, index);
  }

  for (const field of ['name', 'blurb', 'description']) {
    if (typeof r?.[field] !== 'string' || !r[field].trim()) report.error(where, `missing ${field}`);
  }
  if (typeof r?.name === 'string') {
    const key = r.name.trim().toLowerCase();
    if (seenNames.has(key)) report.warn(where, `same name as resources[${seenNames.get(key)}]`);
    else seenNames.set(key, index);
  }
  if (typeof r?.blurb === 'string' && r.blurb.length > BLURB_MAX) {
    report.warn(where, `blurb is ${r.blurb.length} chars; keep it under ${BLURB_MAX}`);
  }

  if (!categoryKeys.includes(r?.category)) {
    report.error(where, `category "${r?.category}" is not one of: ${categoryKeys.join(', ')}`);
  }

  if (r?.website != null) {
    if (typeof r.website !== 'string') report.error(where, 'website must be a string');
    else if (/^[a-z]+:\/\//i.test(r.website)) {
      report.error(where, `website must omit the protocol — use "${r.website.replace(/^[a-z]+:\/\//i, '')}"`);
    } else if (r.website && !HOSTISH.test(r.website)) {
      report.error(where, `website "${r.website}" does not look like a domain`);
    }
  }
  if (r?.email && !EMAIL.test(r.email)) report.error(where, `email "${r.email}" is not valid`);
  if (r?.instagram && !r.instagram.startsWith('@')) {
    report.error(where, `instagram "${r.instagram}" must start with @`);
  }

  if (r?.mass != null) {
    if (!Array.isArray(r.mass) || !r.mass.length || r.mass.some((m) => typeof m !== 'string' || !m.trim())) {
      report.error(where, 'mass must be a non-empty array of non-empty strings');
    }
    if (r.category !== 'church' && r.category !== 'religious') {
      report.warn(where, `mass times on a "${r.category}" listing — expected church or religious`);
    }
  }

  if (r?.gallery != null && !Array.isArray(r.gallery)) report.error(where, 'gallery must be an array');
  for (const [i, photo] of [
    ...(r?.heroPhoto ? [['heroPhoto', r.heroPhoto]] : []),
    ...(Array.isArray(r?.gallery) ? r.gallery.map((g, n) => [`gallery[${n}]`, g]) : []),
  ].entries()) {
    const [field, value] = photo;
    void i;
    if (typeof value !== 'string' || !value.trim()) {
      report.error(where, `${field} must be a path, a URL, or null`);
    } else if (!/^https?:\/\//i.test(value) && !existsSync(join(siteRoot, value.replace(/^\.?\//, '')))) {
      report.error(where, `${field} "${value}" does not exist in the repo`);
    }
  }

  if (r?.online === true) {
    if (r.lat != null || r.lng != null) {
      report.error(where, 'online listings must not carry lat/lng — they get no map pin');
    }
    if (r.address) report.error(where, 'online listings must not carry an address');
    if (!CONTACT_KEYS.some((k) => r[k])) {
      report.error(where, `online listing has no way to reach it (one of: ${CONTACT_KEYS.join(', ')})`);
    }
  } else {
    if (typeof r?.address !== 'string' || !r.address.trim()) {
      report.error(where, 'missing address (set online: true for listings with no storefront)');
    }
    const hasCoords = typeof r?.lat === 'number' && typeof r?.lng === 'number';
    if (!hasCoords) {
      report.error(where, 'missing numeric lat/lng — it would be absent from the map');
    } else if (
      r.lat < box.minLat || r.lat > box.maxLat ||
      r.lng < box.minLng || r.lng > box.maxLng
    ) {
      report.error(where, `lat/lng ${r.lat},${r.lng} is outside the Irving area — check for a sign flip`);
    } else if (!insideBoundary(r.lat, r.lng)) {
      report.warn(where, `lat/lng ${r.lat},${r.lng} falls outside the Irving city boundary`);
    }
  }

  if (r?.placeholder === true || /EXAMPLE/i.test(r?.description ?? '')) placeholders += 1;
}

if (placeholders) {
  report.warn('resources', `${placeholders} listing(s) are still example placeholders`);
}

report.finish(`directory-data.js OK — ${resources.length} listings, ${categoryKeys.length} categories`);
