from fastapi.testclient import TestClient

from app.providers.maps.base import ExternalPlace
from app.providers.maps.overpass import OverpassMapsProvider
from app.schemas.nearby import NearbyType


def _bootstrap_org(client: TestClient, slug: str, admin_email: str) -> dict:
    response = client.post(
        "/api/organizations",
        json={
            "organization_name": f"Org {slug}",
            "organization_slug": slug,
            "admin_full_name": "Admin User",
            "admin_email": admin_email,
            "admin_password": "StrongPass123",
        },
    )
    assert response.status_code == 201
    return response.json()


def _login(client: TestClient, email: str, password: str = "StrongPass123") -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def _create_user(client: TestClient, token: str, email: str, role: str, password: str = "RepPass123") -> dict:
    response = client.post(
        "/api/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "email": email,
            "full_name": email.split("@")[0].replace(".", " ").title(),
            "role": role,
            "password": password,
        },
    )
    assert response.status_code == 201
    return response.json()


def _create_doctor(client: TestClient, token: str, first_name: str, last_name: str, specialty: str) -> dict:
    response = client.post(
        "/api/doctors",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "first_name": first_name,
            "last_name": last_name,
            "specialty": specialty,
            "priority": "HIGH",
        },
    )
    assert response.status_code == 201
    return response.json()


def _create_workplace(
    client: TestClient,
    token: str,
    *,
    name: str,
    facility_type: str,
    latitude: float,
    longitude: float,
) -> dict:
    response = client.post(
        "/api/workplaces",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": name,
            "facility_type": facility_type,
            "latitude": latitude,
            "longitude": longitude,
            "city": "Cairo",
        },
    )
    assert response.status_code == 201
    return response.json()


def _link_doctor_workplace(client: TestClient, token: str, doctor_id: str, workplace_id: str) -> None:
    response = client.post(
        f"/api/workplaces/{workplace_id}/doctors/{doctor_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_primary": True},
    )
    assert response.status_code == 201


def test_nearby_doctor_search_uses_tenant_isolation(client: TestClient) -> None:
    _bootstrap_org(client, "nearby-org-a", "admin@nearbya.com")
    _bootstrap_org(client, "nearby-org-b", "admin@nearbyb.com")

    token_a = _login(client, "admin@nearbya.com")
    token_b = _login(client, "admin@nearbyb.com")

    rep_a = _create_user(client, token_a, "rep@nearbya.com", "MEDICAL_REP")
    rep_token_a = _login(client, "rep@nearbya.com", "RepPass123")

    doctor_a = _create_doctor(client, token_a, "Nora", "A", "Cardiology")
    doctor_b = _create_doctor(client, token_b, "Mina", "B", "Cardiology")

    workplace_a = _create_workplace(
        client,
        token_a,
        name="Clinic A",
        facility_type="CLINIC",
        latitude=30.0444,
        longitude=31.2357,
    )
    workplace_b = _create_workplace(
        client,
        token_b,
        name="Clinic B",
        facility_type="CLINIC",
        latitude=30.0450,
        longitude=31.2350,
    )

    _link_doctor_workplace(client, token_a, doctor_a["id"], workplace_a["id"])
    _link_doctor_workplace(client, token_b, doctor_b["id"], workplace_b["id"])

    assign_response = client.post(
        "/api/my-doctors",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"doctor_id": doctor_a["id"], "medical_rep_id": rep_a["id"]},
    )
    assert assign_response.status_code == 201

    nearby_response = client.get(
        "/api/nearby",
        headers={"Authorization": f"Bearer {rep_token_a}"},
        params={
            "type": "doctor",
            "lat": 30.0440,
            "lng": 31.2350,
            "radius": 2000,
            "limit": 20,
        },
    )

    assert nearby_response.status_code == 200
    body = nearby_response.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == doctor_a["id"]
    assert body["items"][0]["source"] == "internal"
    assert body["items"][0]["category"] == "doctor"
    assert body["items"][0]["distance_meters"] >= 0


def test_nearby_facility_type_filter(client: TestClient) -> None:
    _bootstrap_org(client, "nearby-facility", "admin@nearbyfacility.com")
    token = _login(client, "admin@nearbyfacility.com")

    _create_workplace(
        client,
        token,
        name="Main Hospital",
        facility_type="HOSPITAL",
        latitude=30.0400,
        longitude=31.2300,
    )
    _create_workplace(
        client,
        token,
        name="Downtown Pharmacy",
        facility_type="PHARMACY",
        latitude=30.0410,
        longitude=31.2310,
    )

    hospital_response = client.get(
        "/api/nearby",
        headers={"Authorization": f"Bearer {token}"},
        params={"type": "hospital", "lat": 30.0400, "lng": 31.2300, "radius": 3000},
    )
    assert hospital_response.status_code == 200
    hospital_items = hospital_response.json()["items"]
    assert len(hospital_items) == 1
    assert hospital_items[0]["name"] == "Main Hospital"
    assert hospital_items[0]["category"] == "hospital"

    pharmacy_response = client.get(
        "/api/nearby",
        headers={"Authorization": f"Bearer {token}"},
        params={"type": "pharmacy", "lat": 30.0400, "lng": 31.2300, "radius": 3000},
    )
    assert pharmacy_response.status_code == 200
    pharmacy_items = pharmacy_response.json()["items"]
    assert len(pharmacy_items) == 1
    assert pharmacy_items[0]["name"] == "Downtown Pharmacy"
    assert pharmacy_items[0]["category"] == "pharmacy"


def test_osm_import_permissions_and_cached_external_search(client: TestClient, monkeypatch) -> None:
    _bootstrap_org(client, "nearby-osm", "admin@nearbyosm.com")
    admin_token = _login(client, "admin@nearbyosm.com")

    _create_user(client, admin_token, "rep@nearbyosm.com", "MEDICAL_REP")
    rep_token = _login(client, "rep@nearbyosm.com", "RepPass123")

    forbidden_import = client.post(
        "/api/nearby/import-osm",
        headers={"Authorization": f"Bearer {rep_token}"},
        json={"lat": 30.05, "lng": 31.24, "radius_meters": 4000, "categories": ["pharmacy"]},
    )
    assert forbidden_import.status_code == 403

    def _fake_search(
        self: OverpassMapsProvider,
        *,
        lat: float,
        lng: float,
        radius_meters: int,
        categories: list[NearbyType],
    ) -> list[ExternalPlace]:
        return [
            ExternalPlace(
                source="OSM",
                osm_id="12345",
                osm_type="node",
                category=NearbyType.PHARMACY,
                name="OSM Test Pharmacy",
                latitude=30.0502,
                longitude=31.2402,
                address="Test Street",
                city="Cairo",
                state="Cairo Governorate",
                zip_code="11511",
                phone="+20-100-000-0000",
                website="https://example.org/pharmacy",
                opening_hours="Mo-Su 09:00-22:00",
                raw_payload="{}",
            )
        ]

    monkeypatch.setattr(OverpassMapsProvider, "search_healthcare_places", _fake_search)

    import_response = client.post(
        "/api/nearby/import-osm",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"lat": 30.05, "lng": 31.24, "radius_meters": 4000, "categories": ["pharmacy"]},
    )
    assert import_response.status_code == 200
    import_body = import_response.json()
    assert import_body["imported"] == 1

    nearby_external = client.get(
        "/api/nearby",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={
            "type": "pharmacy",
            "lat": 30.05,
            "lng": 31.24,
            "radius": 5000,
            "include_external": True,
        },
    )
    assert nearby_external.status_code == 200
    items = nearby_external.json()["items"]
    assert len(items) >= 1
    assert items[0]["source"] == "osm"
    assert items[0]["osm_id"] == "12345"
