def _login(client, email, password):
    response = client.post("/api/auth/login", json={
        "email": email,
        "password": password,
    })
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_admin_report_resolution_is_admin_only_and_validated(client):
    arjun_token = _login(client, "arjun@skillbarter.com", "Password123!")
    ananya_token = _login(client, "ananya@skillbarter.com", "Password123!")
    ananya_id = client.get(
        "/api/users/me",
        headers=_auth(ananya_token),
    ).json()["id"]

    report = client.post(
        "/api/reports",
        json={
            "reported_user_id": ananya_id,
            "category": "Spam",
            "details": "Test moderation report",
        },
        headers=_auth(arjun_token),
    )
    assert report.status_code == 200
    report_id = report.json()["id"]

    non_admin = client.patch(
        f"/api/admin/reports/{report_id}/resolve",
        params={"resolution_status": "RESOLVED"},
        headers=_auth(arjun_token),
    )
    assert non_admin.status_code in (401, 403)

    admin_token = _login(client, "admin@skillbarter.com", "AdminPassword123!")

    invalid_status = client.patch(
        f"/api/admin/reports/{report_id}/resolve",
        params={"resolution_status": "INVALID"},
        headers=_auth(admin_token),
    )
    assert invalid_status.status_code == 422

    blank_note = client.patch(
        f"/api/admin/reports/{report_id}/resolve",
        params={"resolution_status": "RESOLVED", "admin_note": "   "},
        headers=_auth(admin_token),
    )
    assert blank_note.status_code == 400

    resolved = client.patch(
        f"/api/admin/reports/{report_id}/resolve",
        params={
            "resolution_status": "RESOLVED",
            "admin_note": "Reviewed and resolved by moderation.",
        },
        headers=_auth(admin_token),
    )
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "RESOLVED"
    assert resolved.json()["admin_note"] == "Reviewed and resolved by moderation."

    reports = client.get(
        "/api/admin/reports",
        params={"status_filter": "RESOLVED"},
        headers=_auth(admin_token),
    )
    assert reports.status_code == 200
    matching = [item for item in reports.json() if item["id"] == report_id]
    assert len(matching) == 1
    assert matching[0]["status"] == "RESOLVED"


def test_admin_report_resolution_rejects_oversized_note(client):
    admin_token = _login(client, "admin@skillbarter.com", "AdminPassword123!")
    response = client.patch(
        "/api/admin/reports/999999/resolve",
        params={
            "resolution_status": "RESOLVED",
            "admin_note": "x" * 2001,
        },
        headers=_auth(admin_token),
    )
    assert response.status_code == 422
