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
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_bootstrap_and_login(client: TestClient) -> None:
    _bootstrap_org(client, "alpha-org", "admin@alpha.com")

    token = _login(client, "admin@alpha.com")
    me_response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert me_response.status_code == 200
    assert me_response.json()["email"] == "admin@alpha.com"
    assert me_response.json()["role"] == "ADMIN"


def test_admin_can_create_user_and_manager_cannot(client: TestClient) -> None:
    _bootstrap_org(client, "beta-org", "admin@beta.com")
    admin_token = _login(client, "admin@beta.com")

    create_user_response = client.post(
        "/api/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "email": "manager@beta.com",
            "full_name": "Manager Beta",
            "role": "MANAGER",
            "password": "ManagerPass123",
        },
    )
    assert create_user_response.status_code == 201

    manager_token = _login(client, "manager@beta.com", "ManagerPass123")

    forbidden_response = client.post(
        "/api/users",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={
            "email": "rep@beta.com",
            "full_name": "Rep Beta",
            "role": "MEDICAL_REP",
            "password": "RepPass123",
        },
    )
    assert forbidden_response.status_code == 403


def test_tenant_isolation_blocks_cross_org_access(client: TestClient) -> None:
    _bootstrap_org(client, "org-a", "admin@orga.com")
    _bootstrap_org(client, "org-b", "admin@orgb.com")

    token_a = _login(client, "admin@orga.com")
    token_b = _login(client, "admin@orgb.com")

    created_in_b = client.post(
        "/api/users",
        headers={"Authorization": f"Bearer {token_b}"},
        json={
            "email": "rep@orgb.com",
            "full_name": "Org B Rep",
            "role": "MEDICAL_REP",
            "password": "RepOrgB123",
        },
    )
    assert created_in_b.status_code == 201
    user_b_id = created_in_b.json()["id"]

    cross_access = client.get(
        f"/api/users/{user_b_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert cross_access.status_code == 404
