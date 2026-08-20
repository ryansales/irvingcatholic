# ICON list assessment — August 2026

Source: `ICON.csv` (ICON member recommendation list), 80 data rows = 74 distinct businesses after
collapsing duplicates. Compared against `directory-data.js` (27 listings currently on
irving-catholic.net).

**Headline: none of the ICON businesses are currently on the site.** Every entry below is new.
The three "online" listings already in `directory-data.js` (Sweet Lucia's Cakes, Guadalupe Handmade
Rosaries, Fiat Family Photography) are still the `EXAMPLE ONLINE LISTING` placeholders, so the
no-storefront section is effectively empty too.

## Where the second pass landed

| Bucket | Count |
|---|---|
| Brick & mortar in Irving — map pins | 10 |
| No storefront — named businesses (working set) | 21 |
| No storefront — individuals (held) | 24 |
| Discarded (outside Irving) | 14 |
| Removed | 5 |
| **Total distinct businesses** | **74** |

Decisions applied in this revision:

- All ten map listings are categorized `owned` (Catholic Owned) rather than `business` — none of them
  sell a Catholic product.
- **VDP Partners** and **Sullivan Chimney Sweep** moved to the no-storefront list with their addresses
  withheld; they run out of a residence.
- **Baker Tree Service** and **EFI Irrigation** publish their addresses on their own websites
  (confirmed), so both are mapped.
- **A Guaranteed Home Appliance** (Bill Kurtz) removed — Google lists it as permanently closed.
- The four held businesses (Lorraine Marie Photography, Hope Sipe Photography, Mount Carmel Cleaners,
  Tiny Saints) removed.
- The no-storefront list is split in two: 21 businesses trading under a name (the working set) and
  24 individuals trading under their own name (held, not dropped).

80 CSV rows collapse to 74 businesses: Texas Mercy Clinic appears 3× (Catholic Doctor, Doctor, Urgent
Care), and Joe Morris, Enrique Man, Bebe Bloch, and Laurie DePauw each appear 2×.

---

## List 1 — Brick & mortar inside Irving city limits (10)

All ten go in the main map area with category `owned`. `lat`/`lng` still to be filled in — see
**Geocoding** below.

| # | Business | Trade | Address | Phone |
|---|---|---|---|---|
| 1 | **Texas Mercy Clinic** (Dr. Lance Hoover, MD) | Catholic doctor; pain & headache, primary care, urgent care | 4950 N O'Connor Rd, Ste 203, Irving, TX 75062 | (469) 984-0311 |
| 2 | **Dr. Neville Fernandes, MD** | Gastroenterology (Texas Digestive Disease Consultants) | 6750 N MacArthur Blvd, Ste 207, Irving, TX 75039 | (972) 637-8480 |
| 3 | **Ohlenforst & Ward Orthodontics** | Orthodontist | 3200 N O'Connor Rd, Irving, TX 75062 | (972) 257-3200 |
| 4 | **Dallas Pelvic Health** (Dr. Chelsea Harkins, PT, DPT) | Pelvic floor physical therapy | 114 E John Carpenter Fwy, Ste 130, Irving, TX 75062 | (469) 476-0915 |
| 5 | **Neuro Integration Services** (Eileen Kainer) | NIS therapy | 511 E John W Carpenter Fwy, Ste 500, Irving, TX 75062 | (361) 648-7767 |
| 6 | **James Sears Massage** | Massage therapy | 105 W 2nd St, Irving, TX 75060 | (214) 907-5009 |
| 7 | **John Klassen Co.** (Klassen Plumbing) | Plumber | 118 S Main St, Irving, TX 75060 | (972) 259-9600 |
| 8 | **Rohter & Company** (Inez Hannegan) | Real estate brokerage | 511 E John Carpenter Fwy, Ste 500, Irving, TX 75062 | (972) 214-8756 |
| 9 | **Baker Tree Service** (James Baker) | Tree trimming & stump grinding | 526 Campana Ct, Irving, TX 75061 | (972) 986-7791 |
| 10 | **EFI — Environmentally Focused Irrigation** (Eddie Herrera) | Sprinkler repair & installation | 1605 W Seventh St, Irving, TX 75060 | (918) 517-5028 |

Both website-published addresses were re-confirmed: Baker Tree Service lists 526 Campana Ct (with
`bts2005@verizon.net`) and EFI lists 1605 W Seventh St on their own sites.

Rows 5 and 8 share 511 E John W Carpenter Fwy, Ste 500 with Beatitudes and the SVdP office already
in `directory-data.js`. All four now sit at **32.860489, -96.934850**, confirmed against Google Maps.

That took a correction. The Census geocoder returned two points 263 m apart for the one building,
because the two rows spell the street differently — "John W Carpenter" against "John Carpenter" —
and a street-centreline geocoder follows the spelling. Separately, the coordinate the site already
carried for Beatitudes and SVdP, `32.884692, -96.949608`, was one of the approximate placeholders
the README warns about: it sits **3 km** from the real building. Both existing listings have been
moved to the confirmed coordinate.

Two rows in `list-1-physical-irving.csv` now read `manual` in the `Geocoder` column. That is a
convention `geocode.py` respects: a `manual` row is never re-geocoded, and its coordinate is what
every other row at the same address gets. Hand-checked pins survive a re-run.

### Geocoding

I could not geocode from this session. The egress policy blocks every geocoding host —
the US Census geocoder, Nominatim, Photon, Geoapify, ArcGIS, the City of Irving GIS server, and
OpenStreetMap itself all return 403 at the proxy; `maps.googleapis.com` is reachable but rejects
keyless requests. Web search is not a substitute: it returned nothing for six of the nine addresses
and unverifiable numbers for the rest, and a wrong pin on a live map is worse than a missing one.

So the geocoding runs on GitHub Actions instead — no local machine, no terminal, all browser:

1. Open the repo on github.com and click the **Actions** tab.
2. Pick **Geocode List 1 addresses** in the left sidebar.
3. Click **Run workflow**, leave the branch on `main`, and press the green **Run workflow** button.
4. When it finishes, open the run and click **Open the pull request** in the run summary. Let the
   checks go green and merge it.

The runner has normal internet access, so it geocodes all ten addresses (US Census geocoder first,
Nominatim as fallback — both free, neither needs a key) and puts two files on a branch of its own:

- `review/list-1-physical-irving.csv` — now with `lat`, `lng`, which geocoder answered, and an
  `In Irving` column
- `review/list-1-geocoded.js` — the ten listing objects, ready to paste into the `resources` array
  in `directory-data.js`

**Why step 4 exists.** The repository rules require every change to `main` to arrive through a pull
request with its required checks green, so the job cannot push its results to `main` — the first run
was rejected with *"Changes must be made through a pull request."* The results go to their own
branch instead, and the run summary links straight to the pull request form for it.

The link is deliberate rather than the job opening the pull request itself. A pull request created
with the workflow's own `GITHUB_TOKEN` does not start CI, so the two required checks would sit
unstarted and it could never be merged. Clicking the link takes one second and CI runs normally.

Every result is checked against the 201-point municipal boundary already in `directory-data.js` and
flagged `NO - CHECK` if it lands outside. That check is tested and working: all 24 existing Irving
listings pass it, and Coppell, Dallas, Fort Worth, Flower Mound, and the DFW Airport centroid are all
correctly rejected. If an address misses or lands outside the boundary, whatever did resolve is still
pushed and the run summary warns, naming what to look at. The results are also attached to the run as
a `geocode-results` artifact, so a rejected push can never lose them again.

The script itself is `review/geocode.py` if you ever do want to run it directly, and
`review/test_geocode.py` covers it — 26 assertions, no network needed:

```
python3 review/test_geocode.py
```

It exercises the failures this project actually hit: two spellings of one address drifting apart, a
hand-placed coordinate being overwritten by a re-run, a failed run blanking coordinates it already
had, plus the geocoder fallback chain and the boundary flag. The branch-and-push half of the
workflow was rehearsed separately against a local clone, including a re-run overwriting its own
branch.

Address-level sanity in the meantime: all ten sit in core Irving ZIPs — 75039, 75060, 75061, 75062 —
none in the ambiguous Coppell and Dallas fringes of 75063 or 75038.

---

## List 2A — Named businesses, no storefront (21)

Home-based, mobile, or online-only, and trading under a business name. **These are the ones we're
working with.** Entries marked *held* had no verifiable location and are kept pending better
information.

### Food
| Business | Type | Contact | Notes |
|---|---|---|---|
| Saint Honoré Bread Company | Sourdough bakery | (202) 262-7433 · @sainthonoreirving | Cottage bakery in Nichols Park — verified Irving. Christian Lenczowski. |
| Bascom Bread Co. | Bakery | margesmillie17@gmail.com · 406-438-5973 | Margaret Smillie. Fresh-milled flour, sourdough, sweets. ICON member. |
| Zita's TX Bakeshop | Italian cookies, cakes | bakesy.shop/b/zitas-tx-bakeshop · 410-271-3960 | Janes Petres. Pickup in Irving. ICON member. |

### Home & trades
| Business | Type | Contact |
|---|---|---|
| ProJoe Construction (Joseph Klassen) | Handyman | 913-749-6821 |
| Sullivan Chimney Sweep (Luke Sullivan) | Chimney sweep, fireplace, dryer vents | 817-914-4898 · sullivanchimneysweep.com — address withheld |
| PB Landscaping, LLC (Peter Butler) | Landscaping, tree, irrigation | pb-landscaping.com · 214-502-7837 — verified Irving-based |
| Mid-Cities Shed Company (Aaron Alonso) | Sheds | mcshedco.com · (817) 612-6134 — location unverified, held |
| GF Ranch and Repair (Erik Maki) | Small engine repair | 321-234-2293 — location unverified, held |

### Auto
| Business | Type | Contact |
|---|---|---|
| EMP Auto (Eric Palmer) | Mechanic | 817-705-8112 · eric.empauto@gmail.com — no shop address found |

### Catholic goods & gifts
| Business | Type | Contact |
|---|---|---|
| Angelico Design Co. (Avory Hissock) | Baby & sacrament gifts, printables | ICON member owned |
| Beauty of Truth Designs (Lindsay Brennan) | Catholic gifts, custom artwork | beautyoftruthdesigns.com |
| Catholic by Design (Anne Palmer) | Catholic gifts | catholicbydesign.etsy.com |
| Conversion Starters | Evangelization apparel | conversionstarters.com |
| St. Lawrence Grill Works (Dorianne & Matt Hull) | Hand-forged grill tools | stlawrencegrillworks.com · doriannehull@gmail.com |
| Matris Apothecary (Brianna Harrison) | Tallow soaps, creams, salves | brianna.bell@wyomingcatholic.edu — no website |
| Mary Malone Ware | Pottery | marymaloneware.etsy.com |
| Purple Lamb Fiber Arts (Carla Hanson) | Hand-dyed yarn | purplelambfiberarts.com — "North Texas", held |

### Lessons
| Business | Type | Contact |
|---|---|---|
| Studio Ars Angeli (Anna Dougherty) | Violin lessons | see CSV link — availability only until late July, worth re-confirming |

### Professional & other
| Business | Type | Contact |
|---|---|---|
| VDP Partners LLC (Damien Van der Putten, PA) | Insurance / public adjuster | 817-501-8780 · vdppartners.com — address withheld |
| Love For Sunday Floral Co. | Silk wedding flowers | loveforsundayco.com — ships to your door, location unverified |
| Bin There Dump That (Sylvia & Valentas Zhukas) | Dumpster rental | szhukas5@gmail.com — Dallas-metro franchise serving Irving, held |

---

## List 2B — Individuals, held (24)

People offering a service under their own name, with no business name to list. **On hold — not being
worked for now.** Nothing is wrong with any of these; they are parked, not dropped.

| Person | Service | Contact |
|---|---|---|
| Joe Morris | Carpenter / handyman | 469-880-5980 · 817-673-2163 (two rows on the sheet, one person) |
| Enrique Man | Handyman / HVAC | 469-834-6383 (two rows on the sheet, one person) |
| Bob Ottaviano | Handyman | 214-766-7973 |
| Joe Figenshue | Handyman | (214) 458-3224 |
| Cristian Kercher | HVAC | 682-384-2350 |
| Hank Tritchka | Gutters | 469-449-4997 |
| Matt Pierce | Painter | 602-768-0920 |
| Sebastian Kercher | Power washing | 817-357-7508 |
| Rafe Butler | Power washing & soft washing | 817-932-5432 · rbutlerwashing@gmail.com |
| Moris Neri | Yardwork, hauling, cleanouts | realrugby@proton.me · 945-247-9534 |
| Martha Villafuerte | Cleaning | 682-465-5674 |
| Vinny di Lucca | Car detailing | (208) 316-8219 — UD student |
| Mulvaney Boys | Car detailing | mulvaney1999@protonmail.com — mobile, comes to you |
| Laurie DePauw | Piano/voice teacher; Spelling to Communicate | 314-913-4672 · lauriesings1@yahoo.com |
| Bebe Bloch (Carlson) | Vocalist & pianist; teacher | bebeblochmusic.com · 703-244-1192 |
| Matthew Denny | Piano teacher | 818-862-0622 · mdenny@udallas.edu |
| Max Wilson | Piano teacher | (972) 626-4059 — in-home lessons in and around Irving |
| Grace Denny | Violin lessons | 972-655-6706 — lifeguards for City of Irving |
| Gaby Peters | Swim lessons | countryrose04@gmail.com |
| Adrian Montes | Tennis lessons | 361-933-6520 |
| Adrienne Wright | Wedding planner | 214-284-5475 |
| Laura Sercer | Florist | (404) 538-1097 |
| Marianna Muller | Licensed travel agent | delladventures.com/marianna — works under the Dell Adventures agency |
| Dominic Dougherty | Financial advisor | 214-790-2878 — cell only |

### The judgment calls

Six entries could have gone either way. Flagging them so you can flip any of them:

| Entry | Called it | Why |
|---|---|---|
| Sullivan Chimney Sweep | Named | Surname-based, but a registered business with its own website and 158 Yelp reviews. |
| Mary Malone Ware | Named | A shop brand built on her name, trading on Etsy under that name. |
| EMP Auto | Named | A real trading name, even though the business has no web presence at all. |
| Mulvaney Boys | Individual | A family nickname on the sheet, not a registered business name. |
| Marianna Muller | Individual | The brand is Dell Adventures, a host agency; she is an agent under it, and she is the ICON member. |
| Bebe Bloch (Carlson) | Individual | Has a website, but it is a personal performer/teacher page, not a business identity. |

---

## Removed (5)

| Business | Why |
|---|---|
| A Guaranteed Home Appliance (Bill Kurtz) | Google lists the business as permanently closed. |
| Lorraine Marie Photography | Held bucket cleared. |
| Hope Sipe Photography | Held bucket cleared. |
| Mount Carmel Cleaners (Yassi & Michael Longoria) | Held bucket cleared. |
| Tiny Saints / catholic.store (Jessica Thornton) | Held bucket cleared. |

---

## Discarded — physical location outside Irving (14)

| Business | Type | Confirmed location |
|---|---|---|
| WholeLife Authentic Care (Dr. Alison Collins) | Family medicine | 1000 Bonnie Brae Ave, **Fort Worth** 76111 |
| Dr. Cole Kricken, DC | Chiropractor | 4001 McEwen Rd, Ste 100, **Dallas** 75244 |
| A Good Path Christian Counseling (Josh Cordonnier) | Counseling | 600 Denton Tap Rd, Ste 100, **Coppell** 75019 (address given in the CSV itself) |
| Siena Counseling (Jennifer Bishop Milano) | Counseling | Based in **Connecticut**; Texas is telehealth-only |
| Calvin's Climate | HVAC | 2811 Justin Rd, **Flower Mound** 75028 |
| Absolute Painting, Inc. (Wes Stafish) | Painter | 7210 Virginia Pkwy, **McKinney** 75071 |
| Providence Roofing & Restoration | Roofing | DFW contractor; records in **Denton** and **DeSoto**, none in Irving |
| Texas Pecan Company | Candy/pecans | 2850 Satsuma Dr, **Dallas** 75229 |
| The Blonde Bakeshop (Betsy de los Santos) | Wedding cakes | **Keller**, TX |
| Mother & Unborn Baby Care | Pregnancy assistance | 3264 Lackland Rd, **Fort Worth** 76116 |
| White Rose Women's Center | Pregnancy assistance | 4313 N Central Expy, **Dallas** 75205 (plus 8499 Greenville Ave) |
| 360 Integrated Financial (Daniel Hamlet) | Financial advisor | Business presence in **Fairmont, Minnesota**; UD alum advising remotely |
| David Ross, Broker-Realtor | Realtor | Dallas-area broker; brokerage record in **Allen**, TX — no Irving office |
| My Catholic Doctor | Virtual primary/specialty care | National telehealth practice, no Irving location |

---

## The copy pass — what is sourced, and what is still open

All ten listings are now in `directory-data.js` with a `blurb` and a `description`, written from each
business's own site, its chamber and directory records, and its social pages. Where a fact could not
be sourced it was left out, and optional fields were left blank rather than filled in with guesses:
seven of the ten have no `hours`, and Klassen Plumbing has no `website` because none was found.

Four things surfaced during the research that need your call.

| Question | What was found |
|---|---|
| **Dr. Ohlenforst has retired** | The practice's own site says he founded it, served Irving for decades, and is now retired; it is led by Dr. Nick Ward, who grew up in Irving. The listing is renamed **Ward Orthodontics** (id `ward-orthodontics`) since that is what it trades as now. The ICON sheet recommends Dr. Ohlenforst by name, so the recommendation may want revisiting. |
| **Texas Mercy has two addresses** | Texas Mercy Headache and Pain sits at 4950 N O'Connor Ste 203 — the ICON sheet's address, and the one pinned. Texas Mercy Medical Clinic is listed at 4925 N O'Connor Ste 105-A, across the street, verified as recently as July 2026. Both name Dr. Lance Hoover. Worth one call to confirm which door patients use. |
| **Klassen Plumbing has three addresses** | 118 S Main St (pinned), 125 S Jefferson St, and 716 Knight Ln all appear in current directory records under the same phone number. The description avoids naming a street for that reason. |
| **Eileen Kainer or Eileen King?** | The ICON sheet says Kainer; the practice's own pages and two directories say "Eileen King, RN, BSN". Rather than pick, the Neuro Integration Services description names no practitioner. |

Two smaller notes. The Neuro Integration Services description explains NIS as what its practitioners
do rather than asserting that it works — the site should not be making clinical claims on a
listing's behalf. And Rohter & Company's "best in Irving" awards are attributed as local *Best of*
awards, which is what the sources actually support.

## What's left before List 1 goes live

1. ~~Paste the listings into `directory-data.js`~~ — done, with coordinates and copy.
2. ~~Write a `blurb` and a `description` for each~~ — done; see the copy pass above.
3. Answer the four open questions in the table above.
4. Confirm each business wants to be listed — especially the four medical practices, which did not
   submit themselves. Nothing here was submitted by the businesses.
5. Replace the three `EXAMPLE ONLINE LISTING` placeholders as the first real no-storefront entries land.

## Files

| File | What it is |
|---|---|
| `icon-assessment.md` | This document |
| `icon-assessment.html` | The published review page |
| `list-1-physical-irving.csv` | The 10 map listings, with empty `lat`/`lng` columns for the script to fill |
| `list-2a-online-named-businesses.csv` | The 21 named no-storefront businesses — the working set |
| `list-2b-online-individuals-held.csv` | The 24 individuals, parked for now |
| `geocode.py` | Geocodes List 1 and boundary-checks every result |
| `test_geocode.py` | 26 assertions covering `geocode.py`, no network needed |
| `list-1-geocoded.js` | Paste-ready listing objects — created by the first workflow run |
| `../.github/workflows/geocode.yml` | Runs the geocoder from the GitHub Actions tab |
| `ICON-source.csv` | The original sheet, unmodified |
