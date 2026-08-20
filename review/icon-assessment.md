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
| No storefront | 45 |
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

Rows 5 and 8 share 511 E John W Carpenter Fwy, Ste 500 — the same building as Beatitudes and the
SVdP office already in `directory-data.js`, which sit at **32.884692, -96.949608**. Those two can
reuse that coordinate directly.

### Geocoding

I could not geocode from this session. The egress policy blocks every geocoding host —
the US Census geocoder, Nominatim, Photon, Geoapify, ArcGIS, the City of Irving GIS server, and
OpenStreetMap itself all return 403 at the proxy; `maps.googleapis.com` is reachable but rejects
keyless requests. Web search is not a substitute: it returned nothing for six of the nine addresses
and unverifiable numbers for the rest, and a wrong pin on a live map is worse than a missing one.

So the geocoding is packaged as a script instead — `review/geocode.py`. Run it from the repo root on
any machine with normal internet:

```
python3 review/geocode.py
```

It geocodes every address in `review/list-1-physical-irving.csv` (US Census geocoder first,
Nominatim as fallback — both free, neither needs a key), writes the coordinates back into that CSV,
and prints listing objects ready to paste into the `resources` array.

Every result is checked against the 201-point municipal boundary already in `directory-data.js` and
flagged `NO - CHECK` if it lands outside. That check is tested and working: all 24 existing Irving
listings pass it, and Coppell, Dallas, Fort Worth, Flower Mound, and the DFW Airport centroid are all
correctly rejected. If a geocoder is unreachable the script reports the miss and exits non-zero
rather than guessing.

Address-level sanity in the meantime: all ten sit in core Irving ZIPs — 75039, 75060, 75061, 75062 —
none in the ambiguous Coppell and Dallas fringes of 75063 or 75038.

---

## List 2 — No storefront (45)

Home-based, mobile, or online-only. Each is either verified Irving-based or ICON member-owned with
nothing in the record placing it outside Irving. Entries marked *held* had no verifiable location at
all and are kept pending better information.

### Food
| Business | Type | Contact | Notes |
|---|---|---|---|
| Saint Honoré Bread Company | Sourdough bakery | (202) 262-7433 · @sainthonoreirving | Cottage bakery in Nichols Park — verified Irving. Christian Lenczowski. |
| Bascom Bread Co. (Margaret Smillie) | Bakery | margesmillie17@gmail.com · 406-438-5973 | Fresh-milled flour, sourdough, sweets. ICON member. |
| Zita's TX Bakeshop (Janes Petres) | Italian cookies, cakes | bakesy.shop/b/zitas-tx-bakeshop · 410-271-3960 | Pickup in Irving. ICON member. |

### Home & trades
| Business | Type | Contact |
|---|---|---|
| Joe Morris | Carpenter / handyman | 469-880-5980 · 817-673-2163 (two rows on the sheet, one person) |
| Enrique Man | Handyman / HVAC | 469-834-6383 (two rows on the sheet, one person) |
| ProJoe Construction (Joseph Klassen) | Handyman | 913-749-6821 |
| Bob Ottaviano | Handyman | 214-766-7973 |
| Joe Figenshue | Handyman | (214) 458-3224 |
| **Sullivan Chimney Sweep** (Luke Sullivan) | Chimney sweep, fireplace, dryer vents | 817-914-4898 · sullivanchimneysweep.com — address withheld |
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
| Laurie DePauw | Piano/voice teacher; Spelling to Communicate | 314-913-4672 · lauriesings1@yahoo.com (two rows, one person) |
| Bebe Bloch (Carlson) | Vocalist & pianist; teacher | bebeblochmusic.com · 703-244-1192 (two rows, one person) |
| Matthew Denny | Piano teacher | 818-862-0622 · mdenny@udallas.edu |
| Max Wilson | Piano teacher | (972) 626-4059 — in-home lessons in and around Irving |
| Studio Ars Angeli (Anna Dougherty) | Violin lessons | see CSV link — availability only until late July, worth re-confirming |
| Grace Denny | Violin lessons | 972-655-6706 — lifeguards for City of Irving |
| Gaby Peters | Swim lessons | countryrose04@gmail.com |
| Adrian Montes | Tennis lessons | 361-933-6520 |

### Events, professional & other
| Business | Type | Contact |
|---|---|---|
| **VDP Partners LLC** (Damien Van der Putten, PA) | Insurance / public adjuster | 817-501-8780 · vdppartners.com — address withheld |
| Adrienne Wright | Wedding planner | 214-284-5475 |
| Love For Sunday Floral Co. | Silk wedding flowers | loveforsundayco.com — ships to your door, location unverified |
| Laura Sercer | Florist | (404) 538-1097 |
| Marianna Muller / Dell Adventures | Licensed travel agent | delladventures.com/marianna |
| Dominic Dougherty | Financial advisor | 214-790-2878 — cell only |
| Bin There Dump That (Sylvia & Valentas Zhukas) | Dumpster rental | szhukas5@gmail.com — Dallas-metro franchise serving Irving, held |

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

## What's left before List 1 goes live

1. Run `python3 review/geocode.py` and paste the resulting objects into `resources`
   in `directory-data.js`. Rows 5 and 8 can reuse 32.884692, -96.949608.
2. Write a one-line `blurb` and a short `description` for each. The ICON comments are good raw
   material and several are directly quotable.
3. Confirm each business wants to be listed — especially the four medical practices, which did not
   submit themselves.
4. Replace the three `EXAMPLE ONLINE LISTING` placeholders as the first real no-storefront entries land.

## Files

| File | What it is |
|---|---|
| `icon-assessment.md` | This document |
| `icon-assessment.html` | The published review page |
| `list-1-physical-irving.csv` | The 10 map listings, with empty `lat`/`lng` columns for the script to fill |
| `list-2-online-no-storefront.csv` | The 45 no-storefront listings |
| `geocode.py` | Geocodes List 1 and boundary-checks every result |
| `ICON-source.csv` | The original sheet, unmodified |
