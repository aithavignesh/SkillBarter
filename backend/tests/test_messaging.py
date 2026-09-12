def test_messaging_between_users(client):
    arjun_token = client.post("/api/auth/login", json={
        "email": "arjun@skillbarter.com",
        "password": "Password123!"
    }).json()["access_token"]

    ravi_token = client.post("/api/auth/login", json={
        "email": "ravi@skillbarter.com",
        "password": "Password123!"
    }).json()["access_token"]
    ravi_id = client.get("/api/users/me", headers={"Authorization": f"Bearer {ravi_token}"}).json()["id"]

    # Arjun sends message to Ravi
    send_res = client.post("/api/messages", json={
        "receiver_id": ravi_id,
        "content": "Are you available Saturday around 4 PM for the kitchen sink?"
    }, headers={"Authorization": f"Bearer {arjun_token}"})
    assert send_res.status_code == 200
    msg = send_res.json()
    assert msg["content"] == "Are you available Saturday around 4 PM for the kitchen sink?"

    # Ravi views conversation
    arjun_id = client.get("/api/users/me", headers={"Authorization": f"Bearer {arjun_token}"}).json()["id"]
    conv_res = client.get(f"/api/messages/{arjun_id}", headers={"Authorization": f"Bearer {ravi_token}"})
    assert conv_res.status_code == 200
    messages = conv_res.json()
    assert len(messages) > 0
    assert any("4 PM" in m["content"] for m in messages)
