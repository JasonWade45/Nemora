"""Test the full rep visit flow."""
import requests

BASE = "http://127.0.0.1:8000"
REP_EMAIL = "Mahmoud@nemora.com"
REP_PASSWORD = "RepPass2025!"


def main():
    # 1) Login as rep
    print("=" * 60)
    print("1) Login as rep (Mahmoud)")
    print("=" * 60)
    r = requests.post(
        f"{BASE}/api/auth/login",
        json={"email": REP_EMAIL, "password": REP_PASSWORD},
        timeout=10,
    )
    print(f"Status: {r.status_code}")
    if r.status_code != 200:
        print(f"Body: {r.text}")
        return
    token = r.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Token OK")

    # 2) Who am I?
    print()
    print("=" * 60)
    print("2) GET /api/auth/me")
    print("=" * 60)
    r = requests.get(f"{BASE}/api/auth/me", headers=headers, timeout=10)
    me = r.json()
    print(f"  email={me.get('email')}, role={me.get('role')}")

    # 3) Get a doctor to visit
    print()
    print("=" * 60)
    print("3) Pick a doctor")
    print("=" * 60)
    r = requests.get(f"{BASE}/api/doctors?page_size=1", headers=headers, timeout=10)
    data = r.json()
    doctor = data["items"][0]
    doctor_id = doctor["id"]
    print(f"  Doctor: {doctor.get('full_name')}")
    print(f"  Specialty: {doctor.get('specialty')}")
    print(f"  Lat/Lng: {doctor.get('latitude')}, {doctor.get('longitude')}")

    # 4) Create visit
    print()
    print("=" * 60)
    print("4) POST /api/visits")
    print("=" * 60)
    r = requests.post(
        f"{BASE}/api/visits",
        headers=headers,
        json={"doctor_id": doctor_id, "visit_purpose": "DETAILING"},
        timeout=10,
    )
    print(f"Status: {r.status_code}")
    if r.status_code != 201:
        print(f"Body: {r.text}")
        return
    visit = r.json()
    visit_id = visit["id"]
    print(f"  Visit created: {visit_id}")
    print(f"  Status: {visit['status']}")

    # 5) Check-in near the doctor
    print()
    print("=" * 60)
    print("5) POST /api/visits/{id}/check-in (near doctor)")
    print("=" * 60)
    r = requests.post(
        f"{BASE}/api/visits/{visit_id}/check-in",
        headers=headers,
        json={
            "latitude": doctor["latitude"],
            "longitude": doctor["longitude"],
            "accuracy": 5.0,
        },
        timeout=10,
    )
    print(f"Status: {r.status_code}")
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text
    if isinstance(body, dict):
        print(f"  status={body.get('status')}")
        print(f"  is_verified={body.get('is_verified')}")
        print(f"  distance_from_doctor={body.get('distance_from_doctor')}")
        print(f"  checked_in_at={body.get('checked_in_at')}")
    else:
        print(f"  Body: {body}")

    # 6) Check-out
    print()
    print("=" * 60)
    print("6) POST /api/visits/{id}/check-out")
    print("=" * 60)
    r = requests.post(
        f"{BASE}/api/visits/{visit_id}/check-out",
        headers=headers,
        json={
            "latitude": doctor["latitude"],
            "longitude": doctor["longitude"],
            "accuracy": 5.0,
            "notes": "زيارة تجريبية",
            "doctor_response": "INTERESTED",
        },
        timeout=10,
    )
    print(f"Status: {r.status_code}")
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text
    if isinstance(body, dict):
        print(f"  status={body.get('status')}")
        print(f"  duration_minutes={body.get('duration_minutes')}")
        print(f"  doctor_response={body.get('doctor_response')}")
    else:
        print(f"  Body: {body}")

    # 7) Final — list visits
    print()
    print("=" * 60)
    print("7) GET /api/visits (final)")
    print("=" * 60)
    r = requests.get(f"{BASE}/api/visits", headers=headers, timeout=10)
    print(f"Status: {r.status_code}")
    data = r.json()
    print(f"  Total: {data.get('total')}")

    print()
    print("=" * 60)
    print("DONE ✅" if r.status_code == 200 else "DONE ⚠️")
    print("=" * 60)


if __name__ == "__main__":
    main()