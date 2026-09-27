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


def test_blocked_users_cannot_continue_existing_exchange_actions(client):
    arjun_token = _login(client, "arjun@skillbarter.com")
    ravi_token = _login(client, "ravi@skillbarter.com")
    arjun_headers = {"Authorization": f"Bearer {arjun_token}"}
    ravi_headers = {"Authorization": f"Bearer {ravi_token}"}
    ravi_id = client.get("/api/users/me", headers=ravi_headers).json()["id"]

    pending = client.post(
        "/api/exchanges",
        json={"receiver_id": ravi_id, "proposal_message": "Pending safety check", "estimated_hours": 2},
        headers=arjun_headers,
    )
    assert pending.status_code == 200
    pending_id = pending.json()["id"]

    active = client.post(
        "/api/exchanges",
        json={"receiver_id": ravi_id, "proposal_message": "Active safety check", "estimated_hours": 2},
        headers=arjun_headers,
    )
    assert active.status_code == 200
    active_id = active.json()["id"]
    accepted = client.patch(f"/api/exchanges/{active_id}/accept", headers=ravi_headers)
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "ACTIVE"

    block = client.post(f"/api/blocks/{ravi_id}", headers=arjun_headers)
    assert block.status_code == 200

    assert client.patch(f"/api/exchanges/{pending_id}/accept", headers=ravi_headers).status_code == 403
    assert client.patch(
        f"/api/exchanges/{pending_id}/counter",
        json={"counter_message": "Blocked counter attempt"},
        headers=ravi_headers,
    ).status_code == 403
    assert client.patch(f"/api/exchanges/{pending_id}/reject", headers=ravi_headers).status_code == 403

    assert client.patch(f"/api/exchanges/{active_id}/start", headers=arjun_headers).status_code == 403
    assert client.patch(f"/api/exchanges/{active_id}/complete", headers=arjun_headers).status_code == 403
    assert client.patch(
        f"/api/exchanges/{active_id}/cancel",
        json={"cancellation_reason": "Blocked cancellation attempt"},
        headers=arjun_headers,
    ).status_code == 403
