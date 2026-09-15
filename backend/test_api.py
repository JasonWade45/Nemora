"""Test full visit flow with authentication."""
import requests
from datetime import datetime, timezone

BASE = "http://127.0.0.1:8000"

def main():
    # 1) Login
    print("=" * 60)
    print("1) Login as admin@nemora.com")
    print("=" * 60)
    r = requests.post(
        f"{BASE}/api/auth/login",
        json={"email": "admin@nemora.com", "password": "NemoraAdmin2025"},
        timeout=10,
    )
    print(f"Status: {r.status_code}")
    if r.status_code != 200:
        print(f"Body: {r.text}")
        return
    data = r.json()
    token = data.get("access_token")
    print(f"Token received: {token[:30]}...")

    headers = {"Authorization": f"Bearer {token}"}

    # 2) GET /api/auth/me
    print()
    print("=" * 60)
    print("2) GET /api/auth/me")
    print("=" * 60)
    r = requests.get(f"{BASE}/api/auth/me", headers=headers, timeout=10)
    print(f"Status: {r.status_code}")
    print(f"Body: {r.text[:400]}")

    # 3) List doctors
    print()
    print("=" * 60)
    print("3) GET /api/doctors")
    print("=" * 60)
    r = requests.get(f"{BASE}/api/doctors?page_size=3", headers=headers, timeout=10)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print(f"Total doctors: {data.get('total')}")
        items = data.get("items", [])
        print(f"First 3 items:")
        for d in items[:3]:
            print(f"  - id={d.get('id')}, name={d.get('full_name')}, spec={d.get('specialty')}")
        first_doctor_id = items[0].get("id") if items else None
    else:
        print(f"Body: {r.text[:400]}")
        return

    # 4) List visits (should be empty)
    print()
    print("=" * 60)
    print("4) GET /api/visits (should be empty)")
    print("=" * 60)
    r = requests.get(f"{BASE}/api/visits", headers=headers, timeout=10)
    print(f"Status: {r.status_code}")
    print(f"Body: {r.text[:300]}")

    # 5) Create visit as admin
    print()
    print("=" * 60)
    print("5) POST /api/visits (create)")
    print("=" * 60)
    if not first_doctor_id:
        print("SKIP - no doctor id")
        return
    r = requests.post(
        f"{BASE}/api/visits",
        headers=headers,
        json={
            "doctor_id": first_doctor_id,
            "visit_purpose": "DETAILING",
        },
        timeout=10,
    )
    print(f"Status: {r.status_code}")
    print(f"Body: {r.text[:500]}")

    if r.status_code == 201:
        visit = r.json()
        visit_id = visit.get("id")
        print(f"\nCreated visit id: {visit_id}")

        # 6) Check-in
        print()
        print("=" * 60)
        print("6) POST /api/visits/{id}/check-in")
        print("=" * 60)
        r = requests.post(
            f"{BASE}/api/visits/{visit_id}/check-in",
            headers=headers,
            json={"latitude": 31.2137, "longitude": 29.9449, "accuracy": 10.0},
            timeout=10,
        )
        print(f"Status: {r.status_code}")
        print(f"Body: {r.text[:500]}")

        # 7) Check-out
        if r.status_code == 200:
            print()
            print("=" * 60)
            print("7) POST /api/visits/{id}/check-out")
            print("=" * 60)
            r = requests.post(
                f"{BASE}/api/visits/{visit_id}/check-out",
                headers=headers,
                json={
                    "latitude": 31.2137,
                    "longitude": 29.9449,
                    "accuracy": 10.0,
                    "notes": "Test visit",
                    "doctor_response": "INTERESTED",
                },
                timeout=10,
            )
            print(f"Status: {r.status_code}")
            print(f"Body: {r.text[:500]}")

    print()
    print("=" * 60)
    print("DONE")
    print("=" * 60)

if __name__ == "__main__":
    main()