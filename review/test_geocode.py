#!/usr/bin/env python3
"""Tests for review/geocode.py, run with no network and no arguments:

    python3 review/test_geocode.py

The geocoders are replaced with stubs, so this exercises the parts that have
actually gone wrong in this project: two spellings of one address drifting
apart, a hand-placed coordinate getting overwritten by a re-run, and a failed
run blanking good data. Every case below is a bug that happened or nearly did.
"""

import contextlib
import csv
import importlib.util
import io
import os
import shutil
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

HEADER = ["Business", "Type", "Address", "Phone", "Website",
          "Suggested category", "Notes", "lat", "lng", "Geocoder", "In Irving"]

# Inside the Irving boundary; the stub geocoder walks away from here so each
# distinct address string gets its own point, the way a real one does.
BASE_LAT, BASE_LNG = 32.8600, -96.9350
IRVING = (32.8140, -96.9489)
DALLAS = (32.7767, -96.7970)

passed = failed = 0


def check(label, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"    ok   {label}")
    else:
        failed += 1
        print(f"    FAIL {label} {detail}")


def row(name, address, lat="", lng="", geocoder=""):
    return [name, "trade", address, "555-0100", "", "owned", "",
            lat, lng, geocoder, "yes" if lat else ""]


class Sandbox:
    """A throwaway copy of the repo layout geocode.py expects."""

    def __enter__(self):
        self.dir = tempfile.mkdtemp()
        os.makedirs(os.path.join(self.dir, "review"))
        shutil.copy(os.path.join(ROOT, "directory-data.js"), self.dir)
        shutil.copy(os.path.join(HERE, "geocode.py"),
                    os.path.join(self.dir, "review"))
        return self

    def __exit__(self, *exc):
        shutil.rmtree(self.dir, ignore_errors=True)

    def run(self, rows, census=None, nominatim=None):
        csv_path = os.path.join(self.dir, "review", "list-1-physical-irving.csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(HEADER)
            w.writerows(rows)
        snippet = os.path.join(self.dir, "review", "list-1-geocoded.js")
        if os.path.exists(snippet):
            os.remove(snippet)

        sys.modules.pop("geocode", None)
        spec = importlib.util.spec_from_file_location(
            "geocode", os.path.join(self.dir, "review", "geocode.py"))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.geocode_census = census or (lambda a: None)
        mod.geocode_nominatim = nominatim or (lambda a: None)

        code = 0
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                mod.main()
        except SystemExit as exc:
            code = exc.code or 0
        with open(csv_path, newline="", encoding="utf-8") as fh:
            out = list(csv.DictReader(fh))
        return out, code, os.path.exists(snippet)


def walking_census():
    """A stub that answers every distinct address string with its own point.

    This is the behaviour that caused the real bug: a street-centreline
    geocoder gave two points a few hundred metres apart for one building,
    because two rows spelled its address differently.
    """
    seen = {}

    def geocode(address):
        if address not in seen:
            n = len(seen)
            seen[address] = (BASE_LAT + 0.002 * n, BASE_LNG - 0.002 * n)
        lat, lng = seen[address]
        return lat, lng, "MATCHED " + address, "census"

    return geocode


def unreachable(address):
    raise OSError("Tunnel connection failed: 403 Forbidden")


print("address_key")
sys.path.insert(0, HERE)
from geocode import address_key, loose_key, has_directional  # noqa: E402

same = [
    ("511 E John W Carpenter Fwy, Ste 500, Irving, TX 75062",
     "511 E John Carpenter Fwy, Ste 500, Irving, TX 75062"),
    ("118 S Main St, Irving, TX 75060", "118 S Main Street, Irving, TX 75060"),
    ("4950 N O'Connor Rd, Ste 203, Irving, TX 75062",
     "4950 N OConnor Road, Irving, TX 75062"),
    ("511 E John W Carpenter Fwy #500, Irving, TX 75062",
     "511 E John W Carpenter Fwy Suite 500, Irving, TX 75062"),
]
different = [
    ("105 W 2nd St, Irving, TX 75060", "105 E 2nd St, Irving, TX 75060"),
    ("3200 N O'Connor Rd, Irving, TX 75062", "4950 N O'Connor Rd, Irving, TX 75062"),
    ("1605 W Seventh St, Irving, TX 75060", "1605 W 7th St, Irving, TX 75060"),
]
for a, b in same:
    check(f"same: {a[:34]}...", address_key(a) == address_key(b),
          f"\n         {address_key(a)!r}\n         {address_key(b)!r}")
for a, b in different:
    check(f"differ: {a[:32]}...", address_key(a) != address_key(b))
check("directional detected", has_directional(address_key("511 E John Carpenter Fwy, Irving, TX 75062")))
check("no directional detected", not has_directional(address_key("511 John Carpenter Fwy, Irving, TX 75062")))
check("loose key drops the directional",
      loose_key("511 E John Carpenter Fwy, Irving, TX 75062")
      == loose_key("511 John Carpenter Fwy, Irving, TX 75062"))

print("\none building, one pin")
with Sandbox() as box:
    out, _, _ = box.run([
        row("NIS", "511 E John W Carpenter Fwy, Ste 500, Irving, TX 75062"),
        row("Rohter", "511 E John Carpenter Fwy, Ste 500, Irving, TX 75062"),
        row("Elsewhere", "118 S Main St, Irving, TX 75060"),
    ], census=walking_census())
    check("two spellings of one address share a point",
          (out[0]["lat"], out[0]["lng"]) == (out[1]["lat"], out[1]["lng"]))
    check("the reuse is labelled", "same address" in out[1]["Geocoder"])
    check("an unrelated address is not merged", out[2]["lat"] != out[0]["lat"])

print("\na hand-placed coordinate is not overwritten")
with Sandbox() as box:
    out, _, _ = box.run([
        row("NIS", "511 E John W Carpenter Fwy, Ste 500, Irving, TX 75062",
            "32.860489", "-96.934850", "manual"),
        row("Rohter", "511 E John Carpenter Fwy, Ste 500, Irving, TX 75062"),
    ], census=walking_census())
    check("the manual row keeps its coordinate", out[0]["lat"] == "32.860489")
    check("the manual row keeps its label", out[0]["Geocoder"] == "manual")
    check("the manual value wins for the same address", out[1]["lat"] == "32.860489")

print("\na missing directional matches only when unambiguous")
with Sandbox() as box:
    out, _, _ = box.run([
        row("A", "511 E John W Carpenter Fwy #500, Irving, TX 75062"),
        row("B", "511 John W. Carpenter Fwy Suite 500, Irving, TX 75062"),
    ], census=walking_census())
    check("one candidate merges", out[0]["lat"] == out[1]["lat"])
with Sandbox() as box:
    out, _, _ = box.run([
        row("East", "105 E 2nd St, Irving, TX 75060"),
        row("West", "105 W 2nd St, Irving, TX 75060"),
        row("Bare", "105 2nd St, Irving, TX 75060"),
    ], census=walking_census())
    check("two candidates refuse to merge",
          len({out[0]["lat"], out[1]["lat"], out[2]["lat"]}) == 3)

print("\ngeocoder fallback and failure")
one = lambda pt: (lambda a: (pt[0], pt[1], "MATCHED " + a, "stub"))
with Sandbox() as box:
    out, code, snip = box.run([row("A", "118 S Main St, Irving, TX 75060")],
                              census=one(IRVING))
    check("census answers", out[0]["lat"] and code == 0 and snip)

    out, code, _ = box.run([row("A", "118 S Main St, Irving, TX 75060")],
                           census=lambda a: None, nominatim=one(IRVING))
    check("census misses, nominatim answers", out[0]["lat"] and code == 0)

    out, code, _ = box.run([row("A", "118 S Main St, Irving, TX 75060")],
                           census=unreachable, nominatim=one(IRVING))
    check("census unreachable, nominatim answers", out[0]["lat"] and code == 0)

    out, code, _ = box.run([row("A", "118 S Main St, Irving, TX 75060")],
                           census=one(DALLAS))
    check("a point outside Irving is flagged", out[0]["In Irving"] == "NO - CHECK")
    check("and the run fails", code == 1)

    out, code, snip = box.run([row("A", "118 S Main St, Irving, TX 75060")],
                              census=unreachable, nominatim=unreachable)
    check("nothing resolves, nothing is written", not out[0]["lat"] and not snip)
    check("and the run fails", code == 1)

    # The important one: a total outage must not wipe coordinates already held.
    out, code, _ = box.run([
        row("A", "118 S Main St, Irving, TX 75060", "32.813612", "-96.946118", "census"),
    ], census=unreachable, nominatim=unreachable)
    check("an outage leaves existing coordinates alone", out[0]["lat"] == "32.813612")

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
