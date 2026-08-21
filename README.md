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


## Repo layout
The repo is split by one rule: **`site/` is the deploy, everything else is not.** Netlify
publishes `site/` with no build command, so a visitor can reach exactly what is in that folder and
nothing above it. Notes, checks, raw research, and the design sources sit outside it and are
therefore unreachable by default — no `robots.txt` entry or `X-Robots-Tag` header needed to hide
them.

```
site/       the deployed site — this is the web root
design/     .dc.html design sources + image-slot.js  (never deployed)
docs/       todo.md and future notes                 (never deployed)
scripts/    data and static checks (CI)              (never deployed)
tests/      browser tests                            (never deployed)
tools/      generate-sitemap.js, process-photos.mjs  (never deployed)
review/     raw research lists behind the listings   (never deployed)
README.md, netlify.toml, .github/
```

### `site/` — what ships
| File | Role |
| --- | --- |
| `index.html` | Homepage: intro, search, map, sidebar list, online-only section, footer |
| `listing.html` | Detail page for any listing; reads `?id=<slug>` |
| `directory-data.js` | **Single source of truth** for all listings, categories, and the Irving boundary |
| `support.js` | Small runtime that renders the templated markup in the two HTML files. Do not hand-edit |
| `images/blessed-virgin.jpg` | Devotional engraving behind the intro copy (public domain) |
| `images/church-of-the-incarnation-*.jpg` | Hero + 3 gallery photos for that listing, supplied by the owner |
| `contact.html` | Contact form → Netlify Forms (`contact`) |
| `suggest.html` | Suggest-a-listing form → Netlify Forms (`suggest-a-listing`) |
| `update.html` | Update-a-listing form → Netlify Forms (`update-a-listing`) |
| `thanks.html` | Shared success page for all three forms |
| `forms.css` | Shared styles for the four pages above |
| `forms.js` | Shared behaviour: validation, slug, Irving check, pin picker, JSON builder |
| `seo.js` | Per-page title / description / canonical / OG + Twitter tags and JSON-LD, built from `directory-data.js` at load time. Loads in `<head>` before `support.js` |
| `sitemap.xml` | Generated — run `node tools/generate-sitemap.js` after adding or removing a listing |
| `robots.txt` | Allows everything and points at `sitemap.xml`. It has nothing to hide any more: what is not in `site/` is not on the internet |
| `favicon.svg` | Brand-red rounded square with the ✦ mark |

Because `site/` is the web root, a root-relative URL like `/favicon.svg` resolves to
`site/favicon.svg`. A page in `site/` must never reference `../` — that resolves fine in a
checkout and 404s in production, so `scripts/check-static.mjs` fails the build on it.

### Outside the deploy
| Path | Role |
| --- | --- |
| `design/Home.dc.html`, `design/Resource Detail.dc.html` | Design-source versions of the two pages. They load the real `../site/directory-data.js` and `../site/support.js`, so they render live data |
| `design/image-slot.js` | Drag-and-drop image placeholder used by the design sources. **Design-time only** — see below |
| `docs/todo.md` | SEO work queue — open suggestions in priority order, plus what already shipped |
| `netlify.toml` | `publish = "site"` and a 301 from `www` to the bare domain. That is nearly all it needs to say now |
| `tools/generate-sitemap.js` | Regenerates `site/sitemap.xml`. Run by hand; **not** a build step |
| `tools/process-photos.mjs` | Resizes owner-supplied photos into `site/images/`. Run by hand; **not** a build step |
| `tools/package.json` | `sharp`, for the line above. Deliberately **not** at the repo root — a root `package.json` would make Netlify start installing dependencies on every deploy |

**`image-slot.js` must not come back into a deployed page.** It is a 65KB drag-and-drop editor
whose whole point is design-time editing. In production `window.omelette` is absent, so it renders
the image read-only — 65KB of custom element to draw one static `<img>`, plus a `fetch()` for a
`.image-slots.state.json` sidecar that is gitignored and therefore 404s on every single homepage
load. It also puts the art inside a shadow root, where crawlers and the browser's preload scanner
cannot see it. `site/index.html` uses a plain `<img>` instead; `design/Home.dc.html` keeps the slot,
because that is where dragging an image in is the point. `scripts/check-static.mjs` fails the build
if either `image-slot.js` or an `<image-slot>` element appears in a deployed page — regenerating
`index.html` from the design source would otherwise drag it back in silently, exactly like the
`<helmet>` rule below.

**Script tags belong in `<head>`, never inside `<helmet>`.** support.js copies
`<helmet>` children into the head, but the browser has already run any
`<script src>` there while parsing the body — so it executes twice. The second
run of `leaflet.js` replaces `window.L` with a fresh Leaflet and the
markercluster plugin attached to the old one vanishes, which throws and silently
stops the map filtering (issue #4). `scripts/check-static.mjs` fails the build if
a script appears inside `<helmet>` in any page here, the `.dc.html` design
sources included — regenerating a deployed page from one would otherwise
reintroduce this.

The design-source versions of the two pages are `design/Home.dc.html` and
`design/Resource Detail.dc.html`. `site/index.html` / `site/listing.html` are those files with
three deliberate changes: the detail-page URL goes from `Resource%20Detail.dc.html?id=` to
`listing.html?id=`, real `<title>`/meta tags are added, and the `<image-slot>` intro band becomes a
plain `<img>`. `check-static.mjs` enforces the last two, so a regeneration cannot quietly undo
them.

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

### Adding photos to a listing
`heroPhoto` and `gallery` are the only fields that need a file on disk rather than a string, so
they are the only ones with a step in front of the edit. `tools/process-photos.mjs` does that step:

```
cd tools && npm install                    # once — installs sharp, gitignored
node tools/process-photos.mjs --id church-of-the-incarnation \
  banner.jpg interior.jpg font.jpg elevation.jpg
```

First path is the hero, the next three are the gallery. It writes `site/images/<id>-hero.jpg` and
`<id>-1.jpg`…`-3.jpg`, then prints the exact `heroPhoto`/`gallery` lines to paste into the listing.
Sizes come from what `listing.html` actually paints, at 2x:

| | Stored size | Why |
| --- | --- | --- |
| Hero | 1600×900 | The band is ~984×340 (2.89:1), but `heroPhoto` is also what `seo.js` hands to `og:image`, and 1600×900 clears Facebook's 1200×630 floor |
| Gallery | 800×600 | Tiles are `aspect-ratio:4/3` at ~200×150 in the 624px main column |

Two things worth knowing before choosing a crop:

- **The browser crops the hero again.** The stored file is 16:9; the band it fills is 2.89:1. Only
  the middle ~61% of the image's height survives on a desktop detail page, so the subject needs to
  sit near the vertical centre — a crucifix at the very top of the frame will be cut off.
- **Portraits lose a lot.** A phone portrait squeezed into a 4:3 tile drops most of its height.
  Append `:top`, `:bottom`, `:left`, `:right` or `:attention` to a path to steer that crop —
  `interior.jpg:top` — instead of accepting the centre.

The script bakes in EXIF orientation (so phone portraits do not land sideways) and strips all
metadata on the way out — these are photographs of identifiable people in a parish, and camera
GPS should not ship with them. It refuses to write anything unless every source reads cleanly, so
a typo in the fourth path cannot leave a listing two-thirds updated.

`scripts/validate-data.mjs` fails if a `heroPhoto` or `gallery` entry points at a file that is not
in the repo, so run it after the edit.

Current contents: **27 listings** — 6 churches, 6 schools, 3 religious/seminaries, 5 ministries,
3 Catholic businesses, 4 Catholic owned; 3 of those are online-only and are clearly marked
`EXAMPLE ONLINE LISTING` in their descriptions (placeholders to be replaced with real businesses).

## The form pages
`contact.html`, `suggest.html`, and `update.html` are **plain static HTML** — no `<x-dc>`, no
`support.js`, no DC runtime. That is deliberate: Netlify's form parser reads the deployed markup at
deploy time and only registers `<form>`s and fields it can see there, so nothing on these pages may
be created at runtime. They share `forms.css` and `forms.js` and reuse the same tokens, so they
read as part of the same site.

**Three Netlify forms**, all posting natively (never via `fetch`, which would drop the file
uploads) and all redirecting to `thanks.html?sent=…`:

| Form name | Page | Notes |
| --- | --- | --- |
| `contact` | `contact.html` | Name, email, topic, message, one optional attachment |
| `suggest-a-listing` | `suggest.html` | Every field in the listing shape, + 4 photos |
| `update-a-listing` | `update.html` | Prefilled from `directory-data.js`, submits a diff |

Each form carries a `bot-field` honeypot and a hidden `Paste-ready JSON` input.

### The point: paste-ready submissions
On submit, `forms.js` validates, then writes a **complete listing object** into the hidden
`Paste-ready JSON` field, keyed and ordered exactly like the entries in `directory-data.js`. The
notification email therefore arrives with a block that drops straight into the `resources` array —
slug already generated, website stripped of its protocol, Instagram normalised to `@handle`, Mass
times split into an array. `update.html` goes further and sends a `What changed` field listing each
edit as `was:` / `now:`, plus the full edited object with untouched keys (`heroPhoto`, `gallery`,
`placeholder`) preserved.

### "Only Irving" is enforced geometrically
`suggest.html` embeds a Leaflet pin picker that draws `irvingBoundary` from `directory-data.js` and
ray-casts the dropped pin against it. A pin outside the city limits blocks submission — so `lat`/`lng`
arrive exact and verified rather than needing to be geocoded later. Address lookup uses OpenStreetMap's
Nominatim (one request per button press, with manual pin-dropping as the fallback). Online/home-based
listings have no pin, so they're checked against the Irving ZIP list in `forms.js` instead.

### Two paths through the suggest form
Step 1 branches on **physical vs online/home-based**, matching the two kinds of listing the site
already renders — the physical path asks for address, pin, and hours; the online path asks for a
(private) Irving ZIP, ordering note, and socials. Separately, both the suggest page and the contact
page offer **email as an alternative**: a copy-and-paste checklist plus a `mailto:` button that
carries over anything already typed, so a submission with photos attached is equally welcome.

### Photos
Each form takes one **banner** photo (16:9, becomes `heroPhoto`) and up to **three** smaller ones
(4:3, become `gallery[0..2]`) — matching exactly what `listing.html` renders. Drag-and-drop with
thumbnail previews, capped at 5 MB per file, with the email route offered for anything larger.

Submissions arrive at whatever size the sender's phone produced, so they are resized before they
are committed — see [Adding photos to a listing](#adding-photos-to-a-listing).

### One-time setup outside this repo
Netlify Forms notifications are configured in the Netlify UI, not in `netlify.toml`. For submissions
to reach an inbox: **app.netlify.com → irvingcatholic → Forms → Form notifications → Add
notification → Email notification**, once per form, sending to `ryan@salesfamily.net`. Until that is
done, submissions are still captured — they just sit in the Forms tab instead of arriving by email.
The free plan allows 100 submissions/month.

## Checks (CI)
Because there is no build step, nothing catches a bad edit between the commit and the live site —
so the checks do it. They run on every pull request and every push to `main` (`.github/workflows/ci.yml`),
and they need no dependencies beyond Node 22 except for the browser test.

```sh
node scripts/validate-data.mjs        # directory-data.js is sane
node scripts/check-static.mjs         # pages, local references, hosting config
cd tests && npm install
npm test                              # renders the real pages in Chromium
npm run test:map                      # the map, with the CPU throttled
```

`SMOKE_CPU_THROTTLE=4 npm test` slows the browser to roughly a shared CI runner.
Worth using on anything that touches the map: issue #4 was invisible at full
laptop speed and failed reliably at 4x.

| Check | What it protects |
| --- | --- |
| `node --check` on every JS file | A syntax error in `directory-data.js` blanks the entire site |
| `scripts/validate-data.mjs` | Duplicate slugs, unknown categories, missing fields, `https://` creeping into `website`, photo paths that do not exist, coordinates outside Irving, online listings carrying map pins |
| `scripts/check-static.mjs` | Local `href`/`src` that point at files not in the repo, **a deployed page reaching outside `site/`** (resolves in a checkout, 404s in production), **`image-slot.js` or `<image-slot>` back in a deployed page**, a page that stopped loading `directory-data.js` / `seo.js` / `support.js` or loading them out of order, missing fallback title/description, `netlify.toml` no longer publishing `site`, and **a `sitemap.xml` that has drifted from the data** — the one manual step, so the one most likely to be forgotten |
| `tests/smoke.mjs` | The part only a browser can see: pages actually render, every listing appears and is reachable by a plain link, search filters/clears and `?q=` reopens it, map pins and the boundary draw, detail pages show name/address/phone/Mass times, each carries its own title/canonical/OG tags and parseable JSON-LD, placeholders and unknown `?id=` are `noindex`, no uncaught errors |
| `tests/map-race.mjs` | Issue #4: changing the filter while the map is animating. Runs with the CPU throttled, because none of it reproduces at laptop speed |
| `.github/workflows/link-check.yml` | Weekly: every listing website and CDN asset still resolves. Files one issue, updates it in place, closes it when clean. Deliberately not on pull requests — a parish's host having a bad morning should not block a merge |

The smoke test serves React, ReactDOM, and Leaflet from `tests/node_modules` instead of unpkg, so
CI never depends on a CDN. Those versions are pinned to exactly what the pages request; if they
drift apart the test fails and tells you to move both together.

The three example online listings are reported as a warning, not an error — they ship on purpose
until real businesses replace them.

Because `seo.js` writes the head at runtime, the tags that matter are asserted on the *rendered*
page in the smoke test, not on the file. Checking the file would only ever see the fallbacks.

`SMOKE_CPU_THROTTLE=4 npm test` runs the browser test with the CPU slowed to roughly what a shared
CI runner gives you. Worth using before pushing anything that touches the map: this site has
timing-sensitive map code, and a laptop is fast enough to hide it (issue #4 passed locally at full
speed and failed on CI twice).

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
5. **Footer** — "Irving Catholic" wordmark (no logo), one-line description, and three links:
   Suggest a listing (`suggest.html`), Update your information (`update.html`), Contact us
   (`contact.html`).

Search filters map, sidebar, and online section simultaneously, matching name, category, and blurb.

`listing.html` ends with an "Is anything here out of date?" strip — a category-coloured **Suggest an
edit** button linking to `update.html?id=<slug>` (which loads that listing prefilled) plus a Contact
us button — followed by the same footer as the homepage. Both mirrored into
`Resource Detail.dc.html`; the `updateHref` value comes from `renderVals()`.

## Known gaps / the actual work queue
In roughly the owner's priority order:
1. **Photos.** `church-of-the-incarnation` is the first listing with real photos; every other
   `heroPhoto` is still `null`, so those detail pages show a "Photo coming soon" box. Plan is to
   request images from the parishes and schools directly and shoot exteriors otherwise. The
   resizing half of that is a solved step — `tools/process-photos.mjs`, see
   [Adding photos to a listing](#adding-photos-to-a-listing) — so what is left is sourcing. Worth
   building a better photoless fallback — a category-colored card with the listing's initial —
   since new listings will always start without a photo.
2. **Featured supporters.** A framework exists in the design explorations (category colors, pin
   treatments, detail-page variants) but **nothing is implemented** — no `featured` key in the data.
   The owner has not yet chosen a direction. Do not build this until they do.
3. ~~**Footer links are dead.**~~ Done — all three now point at real Netlify Forms pages (see
   "The form pages"). Remaining: turn on email notifications in the Netlify UI, one per form.
4. ~~**No sitemap.**~~ Done — `sitemap.xml` is generated by `tools/generate-sitemap.js`.
   **Re-run it whenever you add or remove a listing**, or the new page will not be submitted.
5. ~~**Per-listing social meta.**~~ Partly done — `seo.js` sets per-listing title, description,
   canonical, OG and Twitter tags at load time. Google renders JS and will see them; **crawlers
   that do not run JS (Facebook, LinkedIn, Slack, iMessage, Bing's raw fetch) still will not**.
   Fixing that for real needs a prerender step emitting one static file per listing — see the
   SEO review for the tradeoff.
6. **Mobile.** A first responsive pass has landed (`@media` blocks in the `<helmet>` `<style>` of
   both pages): the map/sidebar split stacks below 900px, the detail grid stacks below 820px, and
   neither page scrolls horizontally at 390px. The form pages carry their own breakpoints in
   `forms.css`. Still **not tested on real devices** — verify the map's touch panning, the intro
   band, and the suggest page's pin picker before calling it done.
7. **Coordinates.** Owner-supplied and marked approximate in the data file's header comment;
   worth verifying against the real campuses.
8. **Catholic Owned listings** are being gathered manually by the owner and will arrive as data edits.
9. **unpkg is a single point of failure.** React, ReactDOM, and Leaflet are all fetched from
   unpkg at page load and everything is rendered client-side, so an unpkg outage — or a visitor
   on a network that blocks it — gets a blank page, not a degraded one. Vendoring those four
   files into the repo and pointing the tags at local paths would remove the dependency without
   introducing a build step. The weekly link check watches unpkg but cannot prevent the outage.

## Assets
- `site/images/blessed-virgin.jpg` — 418×512 engraving of Saint Mary the Blessed Virgin, public
  domain, supplied by the owner. Used only as the intro band, as a plain `<img>` with
  `object-fit: contain` inside a masked, `multiply`-blended wrapper.
- `site/images/<listing-id>-hero.jpg` (1600×900) and `<listing-id>-1..3.jpg` (800×600) — listing
  photos, produced by `tools/process-photos.mjs` from originals the owner or the parish supplied.
  Metadata is stripped; the originals are not kept in the repo.
- No icon set; the few glyphs in the UI are text characters.
- Fonts load from Google Fonts; Leaflet and Leaflet.markercluster load from unpkg. Nothing is bundled.

## Files in this bundle
Deployed (`site/`):
- `index.html`, `listing.html` — the two main pages
- `contact.html`, `suggest.html`, `update.html`, `thanks.html` — the form pages
- `forms.css`, `forms.js` — shared by the four form pages
- `directory-data.js`, `support.js`, `seo.js`, `images/`
- `robots.txt`, `sitemap.xml`, `favicon.svg`

Not deployed:
- `tools/generate-sitemap.js`, `tools/process-photos.mjs`, `tools/package.json` — maintainer
  scripts, both run by hand
- `design/Home.dc.html`, `design/Resource Detail.dc.html`, `design/image-slot.js` — design sources
- `docs/todo.md` — the SEO work queue
- `review/` — the raw research lists the listings were built from. Some of it is contact
  information for people who are deliberately **not** in the directory, which is a good reason for
  it to sit outside the deploy
- `scripts/`, `tests/`, `tools/`, `.github/` — the checks described above, plus the sitemap
  generator
- `netlify.toml`, `README.md`

None of the second group is served: Netlify publishes `site/`, so anything above it is simply not
addressable. The test harness also keeps its `package.json` inside `tests/` so Netlify never starts
installing dependencies on a deploy.
