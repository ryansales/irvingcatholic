# SEO todo

Findings from the SEO pass on `claude/website-seo-review-rifqdn`. Everything under
**Shipped** is already in the branch; everything under **Open** is a suggestion,
ordered by impact.

Context that shapes all of it: the site is static, dependency-free, and rendered
entirely in the browser by `support.js` after React loads from unpkg. That one
fact is behind most of what follows.

---

## Open

### 1. Prerender one static file per listing
**Impact: high. Effort: medium.**

The whole page renders only after two blocking scripts load from unpkg. Google
runs JavaScript and will see the pages, but nothing else does:

- Facebook, LinkedIn, Slack, iMessage and X do not execute JS. They read the raw
  HTML, find no `og:` tags, and preview your links as blank. `seo.js` cannot fix
  this — it *is* JavaScript.
- Bing's raw fetch and most AI crawlers are in the same position.
- It is a single point of failure. When unpkg was unreachable during testing,
  both pages served literal `{{ name }}` text to the browser. Every visitor and
  every crawler sees that during a CDN outage.

The fix is a small generator that reads `directory-data.js` and emits one static
HTML file per listing with the real title, description, canonical, `og:` tags,
JSON-LD and the listing's text already in the markup — the interactive app still
boots on top. `tools/generate-sitemap.js` is the same shape and a reasonable
starting point.

This does add a step the project has so far avoided. Two ways to keep the
"edit one file to add a listing" property intact:

- Run the generator by hand alongside `generate-sitemap.js` and commit the
  output. No build step, one more command.
- Or add `command = "node tools/prerender.js"` to `netlify.toml` so Netlify runs
  it on deploy. Adding a listing stays a one-file edit; the build is invisible.

The second is probably right, despite the README's stance against a build step —
the objection there is to a *framework rewrite*, not to a 60-line generator.

Worth doing at the same time: give the prerendered pages clean URLs
(`/listing/st-luke-catholic-church/` instead of `?id=`). Query-string URLs are
indexable but read poorly in results and in shares.

### 2. Build category and topic landing pages
**Impact: high. Effort: medium.**

The site has two templates and no page aimed at a search phrase. The queries
this directory should own are all unclaimed:

- "mass times irving tx"
- "latin mass irving" / "traditional latin mass dallas"
- "catholic churches in irving texas"
- "catholic schools irving tx"
- "spanish mass irving"

A page per category and per high-intent topic — real headings, real prose, the
matching listings linked — is what ranks for those. The data to build them is
already in `directory-data.js`. This pairs naturally with item 1, since the same
generator can emit them.

Mass times in particular are worth a dedicated page. It is the single most
searched Catholic local query and you hold better data than most parish sites.

### 3. Add parseable hours and Mass times to the data
**Impact: medium-high. Effort: low-medium.**

`seo.js` deliberately does **not** publish `openingHours` or Mass times as
structured data. The current values are free text:

```
"hours": "Office Mon-Fri 9am-5pm, Sat 9am-1pm"
"mass":  ["Sat Vigil 5:30pm, 7pm Espanol", ...]
```

schema.org wants `"Mo-Fr 09:00-17:00"`, and a valid `Event` needs a real
`startDate`. Publishing unparseable values earns Search Console errors rather
than rich results, so leaving them out is the correct default — but it leaves
value on the table.

Add machine-readable fields next to the display strings, e.g.:

```js
hours: "Office Mon-Fri 9am-5pm, Sat 9am-1pm",       // shown to people
hoursSpec: ["Mo-Fr 09:00-17:00", "Sa 09:00-13:00"], // shown to crawlers
```

Then `seo.js` can emit `openingHoursSpecification` and proper Mass `Event` /
`eventSchedule` nodes. Do not try to parse the existing strings automatically
across 27 listings — some will parse wrong, and wrong structured data is worse
than none.

### 4. Photos
**Impact: medium. Effort: high — it is legwork, not code.**

Every `heroPhoto` is `null`, so all 27 listings share one public-domain engraving
as their `og:image`. Consequences: identical social previews, nothing in image
search, and detail pages that look unfinished to both visitors and quality
raters.

Already the top item in the README's work queue. Two SEO notes to fold in when
photos start arriving: name the files descriptively
(`st-luke-catholic-church-exterior.jpg`, not `IMG_4821.jpg`), and set real `alt`
text on the detail-page hero.

### 5. Verify the coordinates
**Impact: medium. Effort: low.**

`directory-data.js` marks the lat/lng values approximate and says to confirm them
before launch. They are now published as `geo` in structured data, so an error is
more consequential than it was — it can put a parish on the wrong block in
results that consume the markup.

### 6. Performance / Core Web Vitals
**Impact: medium. Effort: low.**

LCP is gated behind a third-party round trip: nothing renders until
`react` and `react-dom` arrive from unpkg. Options, cheapest first:

- `<link rel="preload">` the two React URLs so they start earlier.
- Self-host them. Removes the third-party dependency and the outage mode in
  item 1. Two files, no build step.
- `<link rel="preconnect">` to `unpkg.com` if you keep the CDN. There is already
  one for Google Fonts.

Item 1 helps here too — prerendered HTML paints before React arrives.

### 7. Custom 404 page
**Impact: low. Effort: low.**

There is no `404.html`, so Netlify serves its default. A branded 404 that links
back to the map keeps a mistyped or stale URL from being a dead end.

Related: `listing.html?id=<unknown>` currently renders the *first* listing rather
than an error. `seo.js` marks that case `noindex`, which stops it polluting the
index, but the real fix is an honest "listing not found" state.

### 8. Search Console
**Impact: medium. Effort: low. Do this right after the branch deploys.**

- Verify the property and submit `https://irving-catholic.net/sitemap.xml`.
- Use URL Inspection on two or three listing pages to confirm Google now sees
  the per-listing canonical and title rather than the homepage's.
- Watch Coverage for a week. The 27 detail pages should move into "Indexed."
- Check the Rich Results test on a parish page to confirm the `CatholicChurch`
  markup validates.

Also worth doing off-site: a Google Business Profile and citations in Catholic
directories. Local rankings lean on those more than on-page work.

### 9. Footer links
**Being built out by the owner — noted here only for the SEO angle.**

When "Suggest a listing", "Update your information" and "Contact us" land, point
them at real URLs rather than `href="#"`. They become indexable pages and useful
internal links, and a working "suggest a listing" route is also how the directory
grows — which is itself the best long-term SEO for a site like this.

### 10. Minor
- `directory-data.js` is loaded twice on both pages — once in `<head>` for
  `seo.js`, once in the `<helmet>` block for `support.js`. It is idempotent and
  the second request is served from cache, so this costs almost nothing. Tidy it
  only if the `<helmet>` load ordering turns out not to matter.
- The mobile pass is verified in headless Chromium at 390px but **not on real
  devices**. Check touch panning on the map and the intro band's masked image
  before considering it done.

---

## Shipped in this branch

Recorded so it does not get re-litigated.

**The detail pages could not be indexed at all.** Three independent causes:

1. `listing.html` declared `<link rel="canonical" href="https://irving-catholic.net/">`.
   Every listing told Google it was a duplicate of the homepage.
2. All 27 shared one title (`Irving Catholic`) and one description.
3. Nothing linked to 24 of them. The only `<a>` to a listing lived inside the
   Leaflet popup HTML string, which is not in the DOM until a marker is clicked.
   The sidebar cards were `onClick` divs.

Fixes:

- **`seo.js`** — per-listing title, description, canonical, OG and Twitter tags
  from `directory-data.js`, plus JSON-LD: `CatholicChurch` / `School` /
  `PlaceOfWorship` / `LocalBusiness` / `NGO` by category with `PostalAddress`,
  `geo` and `BreadcrumbList`, and `WebSite` + `ItemList` on the homepage.
- **Sidebar listing names are now real links** — all 27 detail pages are
  reachable by a crawler. Click behaviour on the rest of the card is unchanged.
- **`sitemap.xml`** generated by `tools/generate-sitemap.js`. Run it by hand
  after adding or removing a listing.
- **Placeholder listings excluded.** The three `EXAMPLE ONLINE LISTING` entries
  were about to be indexed as real Irving businesses. They are now left out of
  the sitemap and served `noindex`, as is an unknown `?id=`.
- **Bug: the `owned` category was missing from the default filter state**, so
  BirthPointe and Porter's Army & Navy were hidden on load and the counter read
  "22 of 24". All six categories now start active.
- **Mobile.** The map split forced 674px of layout into a 390px viewport and the
  detail grid 706px. Both stack now; neither page scrolls horizontally at 390px.
- **`?q=`** seeds and reflects the search, so the schema.org `SearchAction`
  points at a URL that works and a search is shareable.
- `lang="en"`, a favicon, a richer homepage title and description, and
  `X-Robots-Tag: noindex` on `Home.dc.html`, `Resource Detail.dc.html` and
  `README.md` — `publish = "."` makes those live URLs duplicating the real pages.

Verified in headless Chromium at 390px and 1440px: correct per-listing metadata,
valid JSON-LD, 27 crawlable links, no console errors.
