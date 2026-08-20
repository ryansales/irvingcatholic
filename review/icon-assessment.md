# ICON list assessment — August 2026

Source: `ICON.csv` (ICON member recommendation list), 80 data rows = 74 distinct businesses after collapsing duplicates.
Compared against `directory-data.js` (27 listings currently on irving-catholic.net).

**Headline: none of the ICON businesses are currently on the site.** Every entry below is new.
The three "online" listings already in `directory-data.js` (Sweet Lucia's Cakes, Guadalupe Handmade
Rosaries, Fiat Family Photography) are still the `EXAMPLE ONLINE LISTING` placeholders, so the
no-storefront section is effectively empty too.

## How each entry was sorted

1. **Brick & mortar in Irving** — a public, visitable address that sits inside the City of Irving
   municipal boundary. These get a map pin.
2. **Irving address, but residential** — the business is registered at an Irving house, not a
   storefront. Judgment call for you (see the note in that section).
3. **No storefront** — home-based, mobile, or online-only; no address to map. These go in the
   "Irving businesses without a storefront" section.
4. **Hold** — the business's address of record is outside Irving, but the CSV marks it ICON
   member-owned, so the owner may well live in Irving. One question each resolves these.
5. **Discarded** — confirmed physical location outside Irving city limits.

Addresses were checked by web search (chamber listings, Yelp/YellowPages, BBB, practice sites).
I could not run a geocoder in this environment — the network policy blocks Nominatim — so lat/lng
for the new pins still has to be filled in before they go live. Every Irving address below is in a
core Irving ZIP (75060/75061/75062/75039), well inside the city boundary polygon; none sit in the
ambiguous Coppell/Dallas fringes of 75063 or 75038.

---

## List 1 — Brick & mortar inside Irving city limits (8)

Ready for the main map area. `lat`/`lng` still needed.

| # | Business | Category in CSV | Address | Phone | Notes |
|---|---|---|---|---|---|
| 1 | **Texas Mercy Clinic** (Dr. Lance Hoover, MD) | Catholic Doctor / Pain & Headache / Urgent Care | 4950 N O'Connor Rd, Ste 203, Irving, TX 75062 | (469) 984-0311 | Appears three times in the CSV (Catholic Doctor, Doctor, Urgent Care) — one listing. Recommended by Dunikoski, Omvig, Rohter, Herrera, Dougherty. |
| 2 | **Dr. Neville Fernandes, MD** (Texas Digestive Disease Consultants) | Gastroenterologist | 6750 N MacArthur Blvd, Ste 207, Irving, TX 75039 | (972) 637-8480 | Faithful Catholic, attends St. Ann — per Laura Omvig. |
| 3 | **Ohlenforst & Ward Orthodontics** (Dr. Patrick M. Ohlenforst) | Orthodontist | 3200 N O'Connor Rd, Irving, TX 75062 | (972) 257-3200 | Irving Chamber member; office confirmed active 2026. CSV had no contact info. |
| 4 | **Dallas Pelvic Health** (Dr. Chelsea Harkins, PT, DPT) | Pelvic floor therapy | 114 E John Carpenter Fwy, Ste 130, Irving, TX 75062 | (469) 476-0915 (CSV lists 832-964-4738) | Owner-operated pelvic PT clinic; prenatal/postpartum focus. |
| 5 | **Neuro Integration Services** (Eileen Kainer) | NIS therapy | 511 E John W Carpenter Fwy, Ste 500, Irving, TX 75062 | (361) 648-7767 | Irving Chamber member. Same building as Beatitudes and SVdP, already on the site. |
| 6 | **James Sears Massage** | Massage | 105 W 2nd St, Irving, TX 75060 | (214) 907-5009 | By appointment; downtown Irving studio. Licensed 17+ yrs. Many ICON recommendations. |
| 7 | **John Klassen Co.** (Klassen Plumbing) | Plumber | 118 S Main St, Irving, TX 75060 | (972) 259-9600 | Longstanding downtown Irving plumbing shop. |
| 8 | **Rohter & Company** (Inez Hannegan, realtor) | Realtor | 511 E John Carpenter Fwy, Ste 500, Irving, TX 75062 | (972) 214-8756 | Brokerage office. Listing could be the brokerage with Inez as the ICON contact. |

**Suggested categories:** all eight fit `owned` (Catholic Owned) rather than `business` — none sell a
Catholic product. Your call on Texas Mercy Clinic, which markets itself explicitly as a faithful
Catholic practice and could arguably be `business`.

---

## List 1b — Irving address, but it's a house (5) — your call

These are real Irving businesses with a publicly listed Irving address, but the address is a
residence, not a walk-in location. Mapping them publishes a member's home address.
**Recommendation: put them in the no-storefront section** unless the owner asks to be mapped.

| Business | Type | Listed address | Phone |
|---|---|---|---|
| **VDP Partners LLC** (Damien Van der Putten) | Insurance adjuster | 1310 Elby St, Irving, TX 75061 | 817-501-8780 |
| **Baker Tree Service** (James Baker) | Tree trimming | 526 Campana Ct, Irving, TX 75061 | (972) 986-7791 |
| **Sullivan Chimney Sweep** (Luke Sullivan) | Chimney sweep | 925 Turtle Cv, Irving, TX 75060 | 817-914-4898 |
| **EFI — Environmentally Focused Irrigation** (Eddie Herrera) | Sprinkler repair | 1605 W Seventh St, Irving, TX 75060 | 972-215-7644 |
| **A Guaranteed Home Appliance** (Bill Kurtz) | Appliance repair | 608 Dover Rd, Irving, TX 75060 | 972-253-3693 |

Note on Bill Kurtz: the business address is Irving, but his own profile lists Carrollton. Mobile
service either way.

---

## List 2 — No storefront (43)

Home-based, mobile, or online-only. All either verified Irving-based or ICON member-owned with
nothing placing them outside Irving.

### Food
| Business | Type | Contact | Notes |
|---|---|---|---|
| Saint Honoré Bread Company | Sourdough bakery | (202) 262-7433 (Christian Lenczowski) · @sainthonoreirving | Cottage bakery in the Nichols Park neighborhood of Irving. Verified Irving. |
| Bascom Bread Co. (Margaret Smillie) | Bakery | margesmillie17@gmail.com · 406-438-5973 | Fresh-milled flour, sourdough, cookies. ICON member. |
| Zita's TX Bakeshop (Janes Petres) | Italian cookies, cakes | bakesy.shop/b/zitas-tx-bakeshop · 410-271-3960 | Pickup in Irving. |

### Home & trades
| Business | Type | Contact |
|---|---|---|
| Joe Morris | Carpenter / handyman | 469-880-5980 · 817-673-2163 (CSV lists both numbers) |
| Enrique Man | Handyman / HVAC | 469-834-6383 |
| ProJoe Construction (Joseph Klassen) | Handyman | 913-749-6821 |
| Bob Ottaviano | Handyman | 214-766-7973 |
| Joe Figenshue | Handyman | (214) 458-3224 |
| Cristian Kercher | HVAC | 682-384-2350 |
| Hank Tritchka | Gutters | 469-449-4997 |
| Matt Pierce | Painter | 602-768-0920 |
| Sebastian Kercher | Power washing | 817-357-7508 |
| Rafe Butler | Power washing & soft washing | 817-932-5432 · rbutlerwashing@gmail.com |
| PB Landscaping, LLC (Peter Butler) | Landscaping, tree, irrigation | pb-landscaping.com · 214-502-7837 — verified Irving-based |
| Moris Neri | Yardwork, hauling, cleanouts | realrugby@proton.me · 945-247-9534 |
| Mid-Cities Shed Company (Aaron Alonso) | Sheds | mcshedco.com · (817) 612-6134 — location unverified, held |
| GF Ranch and Repair (Erik Maki) | Small engine repair | 321-234-2293 — location unverified, held |
| Martha Villafuerte | Cleaning | 682-465-5674 |

### Auto
| Business | Type | Contact |
|---|---|---|
| EMP Auto (Eric Palmer) | Mechanic | 817-705-8112 · eric.empauto@gmail.com — no shop address found |
| Vinny di Lucca | Car detailing | (208) 316-8219 — UD student |
| Mulvaney Boys | Car detailing | mulvaney1999@protonmail.com — mobile, comes to you |

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

### Music & lessons
| Business | Type | Contact |
|---|---|---|
| Laurie DePauw | Piano/voice teacher; also Spelling to Communicate | 314-913-4672 · lauriesings1@yahoo.com |
| Bebe Bloch (Carlson) | Vocalist, pianist, piano/voice teacher | bebeblochmusic.com · 703-244-1192 |
| Matthew Denny | Piano teacher | mdenny@udallas.edu · 818-862-0622 |
| Max Wilson | Piano teacher (in-home, in and around Irving) | maximiliankolbewilson@gmail.com · (972) 626-4059 |
| Studio Ars Angeli (Anna Dougherty) | Violin lessons | Canva site (see CSV) — limited availability |
| Grace Denny | Violin lessons | 972-655-6706 — lifeguards for City of Irving |
| Gaby Peters | Swim lessons | countryrose04@gmail.com |
| Adrian Montes | Tennis lessons | 361-933-6520 |

### Events, professional & other
| Business | Type | Contact |
|---|---|---|
| Adrienne Wright | Wedding planner | 214-284-5475 |
| Love For Sunday Floral Co. | Silk wedding flowers | loveforsundayco.com — ships to your door, location unverified |
| Laura Sercer | Florist | (404) 538-1097 |
| Marianna Muller / Dell Adventures | Licensed travel agent | delladventures.com/marianna |
| Dominic Dougherty | Financial advisor | 214-790-2878 — cell only |
| Bin There Dump That (Sylvia & Valentas Zhukas) | Dumpster rental | szhukas5@gmail.com — Dallas-metro franchise serving Irving, held |

---

## List 3 — Hold, one question each (4)

Marked ICON member-owned in the CSV, but the business address of record is outside Irving. The
member may live in Irving and simply register the business elsewhere — worth asking before
publishing or dropping.

| Business | What the search found | Question to ask |
|---|---|---|
| **Lorraine Marie Photography** | Corporate address on file: 4120 County Road 211, Gainesville, TX 76240. Self-describes as DFW-based. | Does Lorraine live in Irving? |
| **Hope Sipe Photography** | Listed Fort Worth / Bedford. Self-describes as a DFW Catholic photographer. | Does Hope live in Irving? |
| **Mount Carmel Cleaners** (Yassi & Michael Longoria) | Business listings put it in Dallas 75238; website mountcarmelcleaners.com. | Do the Longorias live in Irving, and do they serve Irving? |
| **Tiny Saints / catholic.store** (Jessica Thornton) | Tiny Saints LLC is registered in Winter Garden, FL. Jessica is listed as an ICON member co-owner. | Is Jessica local, and does she want the Irving listing? |

---

## List 4 — Discarded, physical location outside Irving (14)

| Business | Type | Confirmed location |
|---|---|---|
| WholeLife Authentic Care (Dr. Alison Collins) | Family medicine | 1000 Bonnie Brae Ave, **Fort Worth** 76111 |
| Dr. Cole Kricken, DC | Chiropractor | 4001 McEwen Rd, Ste 100, **Dallas** 75244 |
| A Good Path Christian Counseling (Josh Cordonnier) | Counseling | 600 Denton Tap Rd, Ste 100, **Coppell** 75019 (address given in the CSV itself) |
| Siena Counseling (Jennifer Bishop Milano) | Counseling | Based in **Connecticut**; licensed for Texas telehealth only |
| Calvin's Climate | HVAC | 2811 Justin Rd, **Flower Mound** 75028 |
| Absolute Painting, Inc. (Wes Stafish) | Painter | 7210 Virginia Pkwy, **McKinney** 75071 |
| Providence Roofing & Restoration | Roofing | DFW contractor; BBB/chamber records in **Denton** and **DeSoto**, none in Irving |
| Texas Pecan Company | Candy/pecans | 2850 Satsuma Dr, **Dallas** 75229 |
| The Blonde Bakeshop (Betsy de los Santos) | Wedding cakes | **Keller**, TX |
| Mother & Unborn Baby Care | Pregnancy assistance | 3264 Lackland Rd, **Fort Worth** 76116 |
| White Rose Women's Center | Pregnancy assistance | 4313 N Central Expy, **Dallas** 75205 (plus 8499 Greenville Ave, Dallas) |
| 360 Integrated Financial (Daniel Hamlet) | Financial advisor | Business presence is **Fairmont, Minnesota**; UD alum, advises remotely |
| David Ross, Broker-Realtor | Realtor | Dallas-area broker; brokerage record in **Allen**, TX — no Irving office |
| My Catholic Doctor | Virtual primary/specialty care | National telehealth practice, no Irving location; the ICON contact is an employee, not the owner |

David Ross and My Catholic Doctor are the softer two of the fourteen — they are "no Irving location"
rather than "confirmed somewhere else." Move either into List 2 if you want them kept.

---

## Row-count reconciliation

| Bucket | Count |
|---|---|
| Brick & mortar in Irving | 8 |
| Irving address but residential | 5 |
| No storefront | 43 |
| Hold — needs one question | 4 |
| Discarded | 14 |
| **Total distinct businesses** | **74** |

80 CSV rows collapse to 74 businesses: Texas Mercy Clinic appears 3× (Catholic Doctor, Doctor,
Urgent Care), and Joe Morris, Enrique Man, Bebe Bloch, and Laurie DePauw each appear 2×.

## Before any of List 1 goes live

- Geocode the eight addresses and add `lat`/`lng` (the site drops any listing without them from the map).
- Write a one-line `blurb` and a short `description` for each — the ICON comments in the CSV are good
  raw material and several are quotable.
- Confirm each business actually wants to be listed, especially the medical practices, which did not
  submit themselves.
