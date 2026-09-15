"""
Import doctors from doctors_by_specialty.csv into NEMORA via API.
Splits name into first_name/last_name. Handles errors gracefully.
"""
import csv
import json
import time
import urllib.request
import urllib.error
from pathlib import Path

API_BASE = "http://127.0.0.1:8000"
CSV_FILE = Path(__file__).parent / "doctors_by_specialty.csv"
ERROR_LOG = Path(__file__).parent / "import_errors.csv"

EMAIL = "admin@nemora.com"
PASSWORD = "NemoraAdmin2025"


def login():
    data = json.dumps({"email": EMAIL, "password": PASSWORD}).encode()
    req = urllib.request.Request(
        f"{API_BASE}/api/auth/login",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())["access_token"]


def clean_name(raw):
    return (raw or "").replace("*", "").replace("  ", " ").strip()


def split_name(full):
    parts = clean_name(full).split()
    if not parts:
        return "Unknown", "Unknown"
    if len(parts) == 1:
        return parts[0], "-"
    return parts[0], " ".join(parts[1:])


def create_doctor(token, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{API_BASE}/api/doctors",
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        try:
            body = json.loads(body)
        except Exception:
            pass
        return e.code, body
    except Exception as e:
        return 0, {"error": str(e)}


def main():
    print("=" * 60)
    print("NEMORA — Doctor Import Script")
    print("=" * 60)

    print("\n[1/3] Logging in...")
    try:
        token = login()
        print(f"   OK — token: {token[:25]}...")
    except Exception as e:
        print(f"   FAILED to login: {e}")
        return

    print("\n[2/3] Loading CSV...")
    rows = []
    with open(CSV_FILE, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    print(f"   OK — {len(rows)} doctors to import")

    print(f"\n[3/3] Importing... (this may take a few minutes)\n")

    success = 0
    duplicate = 0
    failed = 0
    errors = []

    for i, row in enumerate(rows, 1):
        raw_name = clean_name(row.get("name", ""))
        if not raw_name:
            continue

        first, last = split_name(raw_name)
        phone = (row.get("phone", "") or "").strip()
        if phone.startswith("+20"):
            phone = "0" + phone[3:]

        specialty = (row.get("specialty", "") or "").strip()
        address = (row.get("address", "") or "").strip()

        # Try to parse lat/lng
        lat = row.get("latitude", "").strip()
        lng = row.get("longitude", "").strip()

        payload = {
            "first_name": first[:100] or "Unknown",
            "last_name": last[:100] or "-",
            "full_name": raw_name[:255],
            "specialty": specialty[:120] or None,
            "phone": phone[:50] or None,
            "address": address[:255] or None,
            "city": "الإسكندرية",
            "state": "الإسكندرية",
            "notes": f"OSM/GMaps import — {row.get('source_url','')[:200]}" if row.get('source_url') else None,
            "status": "ACTIVE",
            "priority": "MEDIUM",
        }

        # Add lat/lng if present — API may ignore if unsupported
        if lat and lng:
            try:
                payload["latitude"] = float(lat)
                payload["longitude"] = float(lng)
            except ValueError:
                pass

        status, resp = create_doctor(token, payload)

        if status in (200, 201):
            success += 1
        elif status == 409:
            duplicate += 1
        else:
            failed += 1
            errors.append({
                "name": raw_name,
                "status": status,
                "error": json.dumps(resp, ensure_ascii=False)[:300],
            })

        if i % 10 == 0 or i == len(rows):
            print(f"   [{i}/{len(rows)}]  success={success}  dup={duplicate}  fail={failed}")

        # Small delay to not hammer the API
        time.sleep(0.05)

    print("\n" + "=" * 60)
    print(f"  SUCCESS:    {success}")
    print(f"  DUPLICATE:  {duplicate}")
    print(f"  FAILED:     {failed}")
    print("=" * 60)

    if errors:
        with open(ERROR_LOG, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=["name", "status", "error"])
            w.writeheader()
            for e in errors:
                w.writerow(e)
        print(f"\nFirst 5 errors:")
        for e in errors[:5]:
            print(f"  - {e['name']}: [{e['status']}] {e['error'][:120]}")
        print(f"\nFull error log: {ERROR_LOG}")


if __name__ == "__main__":
    main()