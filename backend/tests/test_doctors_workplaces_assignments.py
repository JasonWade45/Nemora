from fastapi.testclient import TestClient


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


def test_doctor_workplace_assignment_flow(client: TestClient) -> None:
    _bootstrap_org(client, "phase2-a", "admin@phase2a.com")
    admin_token = _login(client, "admin@phase2a.com")

    rep = _create_user(client, admin_token, "rep@phase2a.com", "MEDICAL_REP")

    doctor_response = client.post(
        "/api/doctors",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "first_name": "Nora",
            "last_name": "Hassan",
            "specialty": "Cardiology",
            "city": "Cairo",
            "priority": "HIGH",
            "tags": ["key-opinion-leader"],
        },
    )
    assert doctor_response.status_code == 201
    doctor = doctor_response.json()

    workplace_response = client.post(
        "/api/workplaces",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Cairo Heart Clinic",
            "facility_type": "CLINIC",
            "city": "Cairo",
            "latitude": 30.0444,
            "longitude": 31.2357,
        },
    )
    assert workplace_response.status_code == 201
    workplace = workplace_response.json()

    link_response = client.post(
        f"/api/workplaces/{workplace['id']}/doctors/{doctor['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_primary": True},
    )
    assert link_response.status_code == 201
    assert link_response.json()["linked"] is True

    assign_response = client.post(
        "/api/my-doctors",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "doctor_id": doctor["id"],
            "medical_rep_id": rep["id"],
            "priority": "URGENT",
            "notes": "Follow up this week",
            "visit_frequency_days": 7,
        },
    )
    assert assign_response.status_code == 201

    rep_token = _login(client, "rep@phase2a.com", "RepPass123")

    my_doctors = client.get("/api/my-doctors", headers={"Authorization": f"Bearer {rep_token}"})
    assert my_doctors.status_code == 200
    body = my_doctors.json()
    assert body["total"] == 1
    assert body["items"][0]["doctor_name"] == "Nora Hassan"
    assert body["items"][0]["medical_rep_id"] == rep["id"]

    doctor_workplaces = client.get(
        f"/api/doctors/{doctor['id']}/workplaces",
        headers={"Authorization": f"Bearer {rep_token}"},
    )
    assert doctor_workplaces.status_code == 200
    assert len(doctor_workplaces.json()) == 1


def test_tenant_isolation_for_doctors_and_assignments(client: TestClient) -> None:
    _bootstrap_org(client, "phase2-org-a", "admin@orga.com")
    _bootstrap_org(client, "phase2-org-b", "admin@orgb.com")

    token_a = _login(client, "admin@orga.com")
    token_b = _login(client, "admin@orgb.com")

    rep_a = _create_user(client, token_a, "rep@orga.com", "MEDICAL_REP")
    rep_b = _create_user(client, token_b, "rep@orgb.com", "MEDICAL_REP")

    doctor_b_response = client.post(
        "/api/doctors",
        headers={"Authorization": f"Bearer {token_b}"},
        json={
            "first_name": "Mina",
            "last_name": "Adel",
            "specialty": "Neurology",
        },
    )
    assert doctor_b_response.status_code == 201
    doctor_b = doctor_b_response.json()

    cross_get = client.get(
        f"/api/doctors/{doctor_b['id']}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert cross_get.status_code == 404

    cross_assign = client.post(
        "/api/my-doctors",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"doctor_id": doctor_b["id"], "medical_rep_id": rep_a["id"]},
    )
    assert cross_assign.status_code == 404

    assign_b = client.post(
        "/api/my-doctors",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"doctor_id": doctor_b["id"], "medical_rep_id": rep_b["id"]},
    )
    assert assign_b.status_code == 201
    assignment_b_id = assign_b.json()["id"]

    cross_assignment_get = client.get(
        f"/api/my-doctors/{assignment_b_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert cross_assignment_get.status_code == 404


def test_permissions_pagination_filters_and_duplicate_assignment(client: TestClient) -> None:
    _bootstrap_org(client, "phase2-c", "admin@phase2c.com")
    admin_token = _login(client, "admin@phase2c.com")
    _create_user(client, admin_token, "rep@phase2c.com", "MEDICAL_REP")
    rep_token = _login(client, "rep@phase2c.com", "RepPass123")

    rep_create_doctor = client.post(
        "/api/doctors",
        headers={"Authorization": f"Bearer {rep_token}"},
        json={"first_name": "No", "last_name": "Permission"},
    )
    assert rep_create_doctor.status_code == 403

    d1 = client.post(
        "/api/doctors",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "first_name": "Sara",
            "last_name": "Fouad",
            "specialty": "Cardiology",
            "city": "Alexandria",
        },
    )
    assert d1.status_code == 201

    d2 = client.post(
        "/api/doctors",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "first_name": "Hany",
            "last_name": "Maher",
            "specialty": "Dermatology",
            "city": "Cairo",
        },
    )
    assert d2.status_code == 201

    d3 = client.post(
        "/api/doctors",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "first_name": "Dina",
            "last_name": "Nabil",
            "specialty": "Cardiology",
            "city": "Cairo",
        },
    )
    assert d3.status_code == 201

    filtered = client.get(
        "/api/doctors",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"specialty": "Cardiology", "page": 1, "page_size": 1},
    )
    assert filtered.status_code == 200
    filtered_body = filtered.json()
    assert filtered_body["total"] == 2
    assert len(filtered_body["items"]) == 1

    rep_assign = client.post(
        "/api/my-doctors",
        headers={"Authorization": f"Bearer {rep_token}"},
        json={"doctor_id": d1.json()["id"]},
    )
    assert rep_assign.status_code == 201

    duplicate_rep_assign = client.post(
        "/api/my-doctors",
        headers={"Authorization": f"Bearer {rep_token}"},
        json={"doctor_id": d1.json()["id"]},
    )
    assert duplicate_rep_assign.status_code == 409
