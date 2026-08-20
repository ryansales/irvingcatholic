# Handoff: Irving Catholic directory (irving-catholic.net)

## Overview
A public directory of Catholic life in Irving, Texas: parishes, schools, seminaries and religious
houses, ministries, and Catholic-owned or Catholic-serving businesses. The homepage is a real
street map (Leaflet + OpenStreetMap) with category filters, a global search, a scrolling sidebar
list, and a separate section for Irving businesses that have no storefront. Every listing has its
own detail page with hours, Mass times, contact info, and a location map.

Live domain: **irving-catholic.net** (Netlify, DNS on Netlify nameservers, domain registered at
Dreamhost). Repo: **ryansales/irvingcatholic**, branch `main`.

## IMPORTANT: this is not a design mock
Unlike a typical design handoff, **these HTML files are the shipping site**. They have no build
step and deploy as-is. Do not reimplement them in React/Vue unless the project owner explicitly
asks for a rewrite — the correct default is to keep editing these files. A framework rewrite would
add a build step and lose the "edit one JSON file to add a listing" property that the owner relies
on.

They are not, however, dependency-free at runtime: `support.js` loads **React 18 and ReactDOM from
unpkg** and renders the pages client-side, and both pages load **Leaflet** from unpkg as well. If
unpkg is unreachable the pages render completely blank — there is no server-rendered fallback. See
Known gaps.

Fidelity: **high** — final colors, type, spacing, and copy.


## Repo layout (what is deployed)
Files sit at the repo root; Netlify publishes `.` with no build command.

| File | Role |
| --- | --- |
| `index.html` | Homepage: intro, search, map, sidebar list, online-only section, footer |
| `listing.html` | Detail page for any listing; reads `?id=<slug>` |
| `directory-data.js` | **Single source of truth** for all listings, categories, and the Irving boundary |
| `support.js` | Small runtime that renders the templated markup in the two HTML files. Do not hand-edit |
| `image-slot.js` | Drag-and-drop image placeholder component (used for the intro band image) |
| `images/blessed-virgin.jpg` | Devotional engraving behind the intro copy (public domain) |
| `seo.js` | Per-page title / description / canonical / OG + Twitter tags and JSON-LD, built from `directory-data.js` at load time. Loads in `<head>` before `support.js` |
| `sitemap.xml` | Generated — run `node tools/generate-sitemap.js` after adding or removing a listing |
| `tools/generate-sitemap.js` | Regenerates `sitemap.xml`. Run by hand; **not** a build step |
| `favicon.svg` | Brand-red rounded square with the ✦ mark |
| `todo.md` | SEO work queue — open suggestions in priority order, plus what already shipped |
| `netlify.toml` | `publish = "."`, a 301 from `www` to the bare domain, `X-Robots-Tag: noindex` on the design-source files and README, and a long cache on `/images/*` |
| `robots.txt` | Allows all except the design-source files, README, and `/tools/`; points at `sitemap.xml` |

The design-source versions of the two pages are `Home.dc.html` and `Resource Detail.dc.html`
(included in this bundle for reference). `index.html` / `listing.html` are those files with the
detail-page URL changed from `Resource%20Detail.dc.html?id=` to `listing.html?id=` and real
`<title>`/meta tags added.

## The data file
`directory-data.js` assigns one global: `window.IRVING_DIRECTORY`.

```js
{
  center: [32.8612, -96.9531],        // University of Dallas — map center
  radiusMiles: 3,                      // zone around center
  irvingBoundary: [[lat, lng], ...],   // 201-point simplified City of Irving municipal boundary,
                                       // from the city's Municipal_Boundary.geojson (7,057 pts)
  categories: { <key>: { label, short, color, desc } },
  resources: [ <listing>, ... ]
}
```

### Categories (the color system — every pin, badge, and button derives from these)
| Key | Label | Short | Color |
| --- | --- | --- | --- |
| `church` | Churches & Parishes | Church | `#BF4A3C` |
| `school` | Schools & Universities | School | `#3F5A8C` |
| `religious` | Orders & Seminaries | Religious | `#8A5A7A` |
| `business` | Catholic Businesses | Business | `#C2882E` |
| `ministry` | Ministries & Non-profits | Ministry | `#6E8B4E` |
| `owned` | Catholic Owned | Catholic Owned | `#2F7D8C` |

`business` vs `owned` is a deliberate distinction the owner cares about: **Catholic Businesses**
provide a Catholic product or service (icons, books, sacramentals); **Catholic Owned** is any
business — mechanic, café, shop — proudly owned by a local Catholic, Catholic product or not.

### Listing shape
```js
{
  id: "st-luke-catholic-church",   // slug; becomes the detail URL ?id=
  name: "St. Luke Catholic Church",
  category: "church",              // must match a categories key
  address: "202 S MacArthur Blvd, Irving, TX 75060",
  lat: 32.813686, lng: -96.959062, // omit for online-only listings
  blurb: "One line, shown on the card and map popup.",
  description: "Paragraph shown on the detail page.",
  phone: "(972) 259-3222",
  website: "stlukeirving.org",     // no protocol; the page adds https://
  hours: "Office Mon-Fri 9am-5pm",
  mass: ["Sat Vigil 5:30pm", ...], // optional; churches only
  heroPhoto: null,                 // path or URL; null renders the fallback
  photoCredit: null,
  gallery: []
}
```

Online-only listings add `online: true`, drop `lat`/`lng`/`address`, and may carry
`instagram`, `facebook`, `etsy`, or `website`. They render in the "Irving businesses without a
storefront" section below the map instead of getting a pin.

**Adding a listing is a one-file edit**: append an object to `resources`. The map, sidebar,
counts, search index, filters, detail page, structured data, and social tags all pick it up
automatically. No build step. The one manual follow-up is `node tools/generate-sitemap.js`,
which rewrites the committed `sitemap.xml`.

A listing carrying `placeholder: true` is treated as not-yet-real: it is left out of `sitemap.xml`
and its detail page is served `noindex`. Drop the flag when a real business replaces it.

Current contents: **27 listings** — 6 churches, 6 schools, 3 religious/seminaries, 5 ministries,
3 Catholic businesses, 4 Catholic owned; 3 of those are online-only and are clearly marked
`EXAMPLE ONLINE LISTING` in their descriptions (placeholders to be replaced with real businesses).

## Checks (CI)
Because there is no build step, nothing catches a bad edit between the commit and the live site —
so the checks do it. They run on every pull request and every push to `main` (`.github/workflows/ci.yml`),
and they need no dependencies beyond Node 22 except for the browser test.

```sh
node scripts/validate-data.mjs     # directory-data.js is sane
node scripts/check-static.mjs      # pages, local references, hosting config
cd tests && npm install && npm test  # renders the real pages in Chromium
```

| Check | What it protects |
| --- | --- |
| `node --check` on every JS file | A syntax error in `directory-data.js` blanks the entire site |
| `scripts/validate-data.mjs` | Duplicate slugs, unknown categories, missing fields, `https://` creeping into `website`, photo paths that do not exist, coordinates outside Irving, online listings carrying map pins |
| `scripts/check-static.mjs` | Local `href`/`src` that point at files not in the repo, a page that stopped loading `directory-data.js` / `seo.js` / `support.js` or loading them out of order, missing fallback title/description, `netlify.toml` no longer publishing `.`, and **a `sitemap.xml` that has drifted from the data** — the one manual step, so the one most likely to be forgotten |
| `tests/smoke.mjs` | The part only a browser can see: pages actually render, every listing appears and is reachable by a plain link, search filters/clears and `?q=` reopens it, map pins and the boundary draw, detail pages show name/address/phone/Mass times, each carries its own title/canonical/OG tags and parseable JSON-LD, placeholders and unknown `?id=` are `noindex`, no uncaught errors |
| `.github/workflows/link-check.yml` | Weekly: every listing website and CDN asset still resolves. Files one issue, updates it in place, closes it when clean. Deliberately not on pull requests — a parish's host having a bad morning should not block a merge |

The smoke test serves React, ReactDOM, and Leaflet from `tests/node_modules` instead of unpkg, so
CI never depends on a CDN. Those versions are pinned to exactly what the pages request; if they
drift apart the test fails and tells you to move both together.

The three example online listings are reported as a warning, not an error — they ship on purpose
until real businesses replace them.

Because `seo.js` writes the head at runtime, the tags that matter are asserted on the *rendered*
page in the smoke test, not on the file. Checking the file would only ever see the fallbacks.

## Design tokens
**Colors**
- Page background `#F4EFE5`; card/panel white `#FFFFFF`; warm off-white `#FBF8F1`
- Ink `#2B2620` (headings); body `#4D463C`; secondary `#6B6356`; muted `#8A8073`; faint `#A99A83`
- Rules and borders `#E2DBCC`, `#DDD3C1`, `#F0EBE1`; warm border `#CBB8A0`
- Accent (brand red) `#BF4A3C`; soft accent rule `#D9A99A`
- Category colors as tabled above; the teal `#2F7D8C` doubles as the online-section accent

**Typography**
- Display/serif: **Newsreader** (Google), weights 300–600. H1 46px/1.12, weight 400
- UI/sans: **Hanken Grotesk** (Google), weights 400–800
- Body 17px/1.72; card titles ~15px; meta and captions 11–13.5px
- Eyebrow label: 11px, weight 700, `letter-spacing: .2em`, uppercase, accent red, flanked by 20×1.5px rules

**Shape and depth**
- Radii: 999px (pills, search), 16px (cards), 12px (buttons, thumbs), 50% (avatars)
- Shadows are low and warm, e.g. `0 4px 14px rgba(20,70,80,.07)`
- Max content width 1220px; intro column 720px; body copy column 600px

## Homepage anatomy (top to bottom)
1. **Intro** — eyebrow "Irving Catholic", H1 "A living map of Catholic life in Irving, Texas",
   one paragraph, then the search pill. Behind it, a full-width band holds the devotional engraving:
   an `<image-slot>` at `opacity:.72` with `mix-blend-mode:multiply`, masked to an oval
   (`radial-gradient(ellipse 19% 34% at 50% 26%, #000 20%, transparent 78%)`) so the core sits
   behind the headline and the paragraph stays on clean cream, plus a cream scrim gradient over it.
   **Contrast constraint:** the paragraph is `#4D463C` specifically to clear WCAG AA (4.5:1) over
   that image. If the vignette moves down or gets stronger, re-check contrast on the paragraph.
   The intro `<section>` is `pointer-events:none` (with `pointer-events:auto` restored on the
   search input and clear button) so the image slot underneath stays droppable.
2. **Map** — Leaflet with OSM tiles, marker clustering (campuses overlap), the Irving boundary
   drawn as a dashed polygon, category filter chips, and pan-locked to the zone. Popups near the
   map edge auto-pan into full view. Each popup carries name, category badge, blurb, address, and a
   category-colored "View details" button linking to `listing.html?id=`.
3. **Sidebar list** — the same filtered/searched set as the map, scrollable, count line at the bottom.
4. **Online section** (`#online`) — "Irving businesses without a storefront", teal-accented cards.
5. **Footer** — "Irving Catholic" wordmark (no logo), one-line description, and three
   **non-functional** links: Suggest a listing, Update your information, Contact us (all `href="#"`).

Search filters map, sidebar, and online section simultaneously, matching name, category, and blurb.

## Known gaps / the actual work queue
In roughly the owner's priority order:
1. **Photos.** Every `heroPhoto` is `null`, so detail pages show a "Photo coming soon" box. Plan is
   to request images from the parishes and schools directly and shoot exteriors otherwise. Worth
   building a better photoless fallback — a category-colored card with the listing's initial —
   since new listings will always start without a photo.
2. **Featured supporters.** A framework exists in the design explorations (category colors, pin
   treatments, detail-page variants) but **nothing is implemented** — no `featured` key in the data.
   The owner has not yet chosen a direction. Do not build this until they do.
3. **Footer links are dead.** "Suggest a listing" and "Contact us" need real destinations —
   Netlify Forms is the natural fit given the hosting.
4. ~~**No sitemap.**~~ Done — `sitemap.xml` is generated by `tools/generate-sitemap.js`.
   **Re-run it whenever you add or remove a listing**, or the new page will not be submitted.
5. ~~**Per-listing social meta.**~~ Partly done — `seo.js` sets per-listing title, description,
   canonical, OG and Twitter tags at load time. Google renders JS and will see them; **crawlers
   that do not run JS (Facebook, LinkedIn, Slack, iMessage, Bing's raw fetch) still will not**.
   Fixing that for real needs a prerender step emitting one static file per listing — see the
   SEO review for the tradeoff.
6. **Mobile.** A first responsive pass has landed (`@media` blocks in the `<helmet>` `<style>` of
   both pages): the map/sidebar split stacks below 900px, the detail grid stacks below 820px, and
   neither page scrolls horizontally at 390px. Still **not tested on real devices** — verify the
   map's touch panning and the intro band before calling it done.
7. **Coordinates.** Owner-supplied and marked approximate in the data file's header comment;
   worth verifying against the real campuses.
8. **Catholic Owned listings** are being gathered manually by the owner and will arrive as data edits.
9. **unpkg is a single point of failure.** React, ReactDOM, and Leaflet are all fetched from
   unpkg at page load and everything is rendered client-side, so an unpkg outage — or a visitor
   on a network that blocks it — gets a blank page, not a degraded one. Vendoring those four
   files into the repo and pointing the tags at local paths would remove the dependency without
   introducing a build step. The weekly link check watches unpkg but cannot prevent the outage.

## Assets
- `images/blessed-virgin.jpg` — 418×512 engraving of Saint Mary the Blessed Virgin, public domain,
  supplied by the owner. Used only as the intro band.
- No icon set; the few glyphs in the UI are text characters.
- Fonts load from Google Fonts; Leaflet and Leaflet.markercluster load from unpkg. Nothing is bundled.

## Files in this bundle
- `index.html`, `listing.html` — the deployed pages
- `directory-data.js`, `support.js`, `seo.js`, `image-slot.js`, `images/blessed-virgin.jpg`
- `netlify.toml`, `robots.txt`, `sitemap.xml`, `favicon.svg`, `tools/generate-sitemap.js`
- `Home.dc.html`, `Resource Detail.dc.html` — design-source versions of the two pages
- `scripts/`, `tests/`, `.github/` — the checks described above. None of it is served: Netlify
  publishes the repo root, and the test harness keeps its `package.json` inside `tests/` on
  purpose so that Netlify does not start installing dependencies on every deploy.
