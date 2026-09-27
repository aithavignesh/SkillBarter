def _login(client, email):
    return client.post("/api/auth/login", json={"email": email, "password": "Password123!"}).json()["access_token"]


def test_blocked_users_cannot_create_exchange_or_read_messages(client):
    arjun_token = _login(client, "arjun@skillbarter.com")
    ravi_token = _login(client, "ravi@skillbarter.com")
    ravi_id = client.get("/api/users/me", headers={"Authorization": f"Bearer {ravi_token}"}).json()["id"]

    block = client.post(f"/api/blocks/{ravi_id}", headers={"Authorization": f"Bearer {arjun_token}"})
    assert block.status_code == 200

    exchange = client.post("/api/exchanges", json={
        "receiver_id": ravi_id,
        "proposal_message": "Safety boundary check",
        "estimated_hours": 2,
    }, headers={"Authorization": f"Bearer {arjun_token}"})
    assert exchange.status_code == 403

    messages = client.get(f"/api/messages/{ravi_id}", headers={"Authorization": f"Bearer {arjun_token}"})
    assert messages.status_code == 403
