"""
Backfill latitude/longitude for all doctors from the original CSV.
Matches doctors by name + phone.
"""
import csv
import json
import time
import urllib.request
import urllib.error
from pathlib import Path

API_BASE = "http://127.0.0.1:8000"
CSV_FILE = Path(__file__).parent / "doctors_by_specialty.csv"

EMAIL = "admin@nemora.com"
PASSWORD = "NemoraAdmin2025"


def api(url, method="GET", token=None, body=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="ignore")


def login():
    status, data = api(
        f"{API_BASE}/api/auth/login",
        method="POST",
        body={"email": EMAIL, "password": PASSWORD},
    )
    if status != 200:
        raise SystemExit(f"Login failed: {status} {data}")
    return data["access_token"]


def get_all_doctors(token):
    all_docs = []
    page = 1
    while True:
        status, data = api(
            f"{API_BASE}/api/doctors?page={page}&page_size=100",
            token=token,
        )
        if status != 200:
            raise SystemExit(f"Fetch doctors failed: {status} {data}")
        items = data.get("items", [])
        all_docs.extend(items)
        if len(items) < 100:
            break
        page += 1
    return all_docs


def clean_name(raw):
    return (raw or "").replace("*", "").replace("  ", " ").strip().lower()


def main():
    print("=" * 60)
    print("NEMORA — Backfill lat/lng for existing doctors")
    print("=" * 60)

    print("\n[1/4] Loading CSV...")
    csv_rows = []
    with open(CSV_FILE, "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            csv_rows.append(row)
    print(f"   {len(csv_rows)} rows in CSV")

    # Build lookup: cleaned name -> (lat, lng)
    lookup = {}
    for row in csv_rows:
        name = clean_name(row.get("name", ""))
        lat = (row.get("latitude") or "").strip()
        lng = (row.get("longitude") or "").strip()
        if not name or not lat or not lng:
            continue
        try:
            lookup[name] = (float(lat), float(lng))
        except ValueError:
            pass
    print(f"   {len(lookup)} doctors with coordinates in CSV")

    print("\n[2/4] Logging in...")
    token = login()
    print(f"   OK")

    print("\n[3/4] Fetching doctors from API...")
    doctors = get_all_doctors(token)
    print(f"   {len(doctors)} doctors in database")

    print("\n[4/4] Backfilling coordinates...\n")

    updated = 0
    skipped = 0
    not_found = 0
    failed = 0

    for i, doc in enumerate(doctors, 1):
        # Skip if already has coordinates
        if doc.get("latitude") is not None and doc.get("longitude") is not None:
            skipped += 1
            continue

        full_name = clean_name(doc.get("full_name") or f"{doc.get('first_name','')} {doc.get('last_name','')}")
        coords = lookup.get(full_name)

        if not coords:
            not_found += 1
            continue

        lat, lng = coords
        status, resp = api(
            f"{API_BASE}/api/doctors/{doc['id']}",
            method="PATCH",
            token=token,
            body={"latitude": lat, "longitude": lng},
        )

        if status == 200:
            updated += 1
        else:
            failed += 1
            print(f"   FAIL [{status}] {doc.get('full_name','')[:40]}: {str(resp)[:80]}")

        if i % 20 == 0 or i == len(doctors):
            print(f"   [{i}/{len(doctors)}]  updated={updated}  skipped={skipped}  notfound={not_found}  fail={failed}")

        time.sleep(0.03)

    print("\n" + "=" * 60)
    print(f"  UPDATED:    {updated}")
    print(f"  SKIPPED:    {skipped}  (already had coordinates)")
    print(f"  NOT_FOUND:  {not_found}  (name in DB doesn't match CSV)")
    print(f"  FAILED:     {failed}")
    print("=" * 60)


if __name__ == "__main__":
    main()