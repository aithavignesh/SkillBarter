def _login(client, email, password):
    response = client.post("/api/auth/login", json={
        "email": email,
        "password": password,
    })
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_connection_rejects_blocked_users_both_directions(client):
    arjun = _login(client, "arjun@skillbarter.com", "Password123!")
    ananya = _login(client, "ananya@skillbarter.com", "Password123!")

    ananya_id = client.get("/api/users/me", headers=_auth(ananya)).json()["id"]

    block = client.post(
        f"/api/blocks/{ananya_id}",
        headers=_auth(arjun),
    )
    assert block.status_code == 200

    connection = client.post(
        f"/api/connections/{ananya_id}",
        headers=_auth(arjun),
    )
    assert connection.status_code == 403

    suggestions = client.get(
        "/api/connections/suggestions",
        headers=_auth(ananya),
    )
    assert suggestions.status_code == 200
    assert all(item["id"] != client.get("/api/users/me", headers=_auth(arjun)).json()["id"]
               for item in suggestions.json())
