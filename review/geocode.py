#!/usr/bin/env python3
"""Geocode the List 1 addresses and check each result against the Irving city limits.

Run this from the repo root on a machine with normal internet access:

    python3 review/geocode.py

It geocodes every address in review/list-1-physical-irving.csv, verifies the
result falls inside the municipal boundary stored in directory-data.js, writes
the coordinates back into the CSV, and prints listing objects ready to paste
into the `resources` array.

Two geocoders are tried in order, both free and keyless:
  1. US Census Bureau geocoder  (authoritative for US street addresses)
  2. OpenStreetMap Nominatim    (fallback; rate limited to 1 request/second)

Nothing here needs an API key. If a geocoder is unreachable the script says so
rather than guessing — a wrong pin is worse than a missing one.
"""

import csv
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_JS = os.path.join(ROOT, "directory-data.js")
CSV_PATH = os.path.join(ROOT, "review", "list-1-physical-irving.csv")
USER_AGENT = "irving-catholic-directory/1.0 (+https://irving-catholic.net)"


# --------------------------------------------------------------------------
# Irving boundary
# --------------------------------------------------------------------------

def load_boundary(path=DATA_JS):
    """Pull the irvingBoundary [[lat, lng], ...] array out of directory-data.js."""
    with open(path, encoding="utf-8") as fh:
        src = fh.read()
    start = src.index("irvingBoundary:")
    open_bracket = src.index("[", start)
    depth = 0
    for i in range(open_bracket, len(src)):
        if src[i] == "[":
            depth += 1
        elif src[i] == "]":
            depth -= 1
            if depth == 0:
                block = src[open_bracket:i + 1]
                break
    else:
        raise ValueError("irvingBoundary array never closes")
    pairs = re.findall(r"\[\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\]", block)
    return [(float(a), float(b)) for a, b in pairs]


def inside(lat, lng, polygon):
    """Ray-casting point-in-polygon. polygon is a list of (lat, lng)."""
    hit = False
    n = len(polygon)
    for i in range(n):
        y1, x1 = polygon[i]
        y2, x2 = polygon[(i + 1) % n]
        if (y1 > lat) != (y2 > lat):
            x_cross = x1 + (lat - y1) * (x2 - x1) / (y2 - y1)
            if lng < x_cross:
                hit = not hit
    return hit


# --------------------------------------------------------------------------
# Geocoders
# --------------------------------------------------------------------------

def _get(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def geocode_census(address):
    url = (
        "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?"
        + urllib.parse.urlencode(
            {
                "address": address,
                "benchmark": "Public_AR_Current",
                "format": "json",
            }
        )
    )
    matches = _get(url).get("result", {}).get("addressMatches", [])
    if not matches:
        return None
    c = matches[0]["coordinates"]
    return round(c["y"], 6), round(c["x"], 6), matches[0]["matchedAddress"], "census"


def geocode_nominatim(address):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
        {"q": address, "format": "json", "limit": 1, "countrycodes": "us"}
    )
    hits = _get(url)
    time.sleep(1.1)  # Nominatim asks for max 1 request per second
    if not hits:
        return None
    h = hits[0]
    return round(float(h["lat"]), 6), round(float(h["lon"]), 6), h["display_name"], "nominatim"


def geocode(address):
    errors = []
    for fn in (geocode_census, geocode_nominatim):
        try:
            result = fn(address)
            if result:
                return result, None
        except Exception as exc:  # unreachable host, timeout, bad payload
            errors.append(f"{fn.__name__}: {exc}")
    return None, "; ".join(errors) if errors else "no match from either geocoder"


# --------------------------------------------------------------------------

def slug(name):
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return re.sub(r"-+", "-", s)


def main():
    boundary = load_boundary()
    print(f"Irving boundary: {len(boundary)} points\n")

    with open(CSV_PATH, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))

    failures = []
    for row in rows:
        address = row["Address"]
        result, err = geocode(address)
        if not result:
            failures.append((row["Business"], err))
            print(f"  MISS  {row['Business']}\n        {address}\n        {err}")
            continue
        lat, lng, matched, source = result
        row["lat"], row["lng"] = f"{lat}", f"{lng}"
        row["Geocoder"] = source
        ok = inside(lat, lng, boundary)
        row["In Irving"] = "yes" if ok else "NO - CHECK"
        flag = "ok " if ok else "OUTSIDE BOUNDARY"
        print(f"  {flag}  {row['Business']}\n        {lat}, {lng}  ({source})\n        matched: {matched}")
        if not ok:
            failures.append((row["Business"], "geocoded outside the Irving boundary"))

    fields = list(rows[0].keys())
    for extra in ("lat", "lng", "Geocoder", "In Irving"):
        if extra not in fields:
            fields.append(extra)
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    print(f"\nWrote coordinates back into {os.path.relpath(CSV_PATH, ROOT)}")

    print("\n--- paste into the `resources` array in directory-data.js ---\n")
    for row in rows:
        if not row.get("lat"):
            continue
        print(
            json.dumps(
                {
                    "id": slug(row["Business"]),
                    "name": row["Business"],
                    "category": row["Suggested category"] or "owned",
                    "address": row["Address"],
                    "lat": float(row["lat"]),
                    "lng": float(row["lng"]),
                    "blurb": "TODO one line for the card and map popup",
                    "description": "TODO paragraph for the detail page",
                    "phone": row["Phone"],
                    "website": row["Website"],
                    "hours": "",
                    "heroPhoto": None,
                    "photoCredit": None,
                    "gallery": [],
                },
                indent=2,
            )
            + ","
        )

    if failures:
        print("\nNeeds a look:")
        for name, why in failures:
            print(f"  - {name}: {why}")
        sys.exit(1)


if __name__ == "__main__":
    main()
