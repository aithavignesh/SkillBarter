def _login(client, email, password):
    response = client.post("/api/auth/login", json={
        "email": email,
        "password": password,
    })
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_non_admin_cannot_change_monetization_entitlements(client):
    user_token = _login(client, "arjun@skillbarter.com", "Password123!")

    response = client.patch(
        "/api/users/me/monetization",
        json={"premium": True, "credits": 9999, "priority_matching": True},
        headers=_auth(user_token),
    )

    assert response.status_code in (401, 403)

    me = client.get("/api/users/me", headers=_auth(user_token))
    assert me.status_code == 200
    assert me.json()["premium"] is False
    assert me.json()["priority_matching"] is False


def test_admin_can_update_monetization_entitlements(client):
    admin_token = _login(client, "admin@skillbarter.com", "AdminPassword123!")

    response = client.patch(
        "/api/users/me/monetization",
        json={"credits": 150},
        headers=_auth(admin_token),
    )

    assert response.status_code == 200
    assert response.json()["credits"] == 150
