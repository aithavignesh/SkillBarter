def test_reporting_and_blocking(client):
    arjun_token = client.post("/api/auth/login", json={
        "email": "arjun@skillbarter.com",
        "password": "Password123!"
    }).json()["access_token"]

    ananya_token = client.post("/api/auth/login", json={
        "email": "ananya@skillbarter.com",
        "password": "Password123!"
    }).json()["access_token"]
    ananya_id = client.get("/api/users/me", headers={"Authorization": f"Bearer {ananya_token}"}).json()["id"]

    # Arjun files report
    rep_res = client.post("/api/reports", json={
        "reported_user_id": ananya_id,
        "category": "Spam",
        "details": "Sent unsolicited promotional barter link"
    }, headers={"Authorization": f"Bearer {arjun_token}"})
    assert rep_res.status_code == 200
    assert rep_res.json()["status"] == "PENDING"

    # Arjun blocks Ananya
    block_res = client.post(f"/api/blocks/{ananya_id}", headers={"Authorization": f"Bearer {arjun_token}"})
    assert block_res.status_code == 200

    # Ananya should no longer appear in Arjun's nearby search
    nearby_res = client.get("/api/users/nearby", headers={"Authorization": f"Bearer {arjun_token}"})
    assert nearby_res.status_code == 200
    ids = [u["id"] for u in nearby_res.json()]
    assert ananya_id not in ids

    # Admin checks reports
    admin_token = client.post("/api/auth/login", json={
        "email": "admin@skillbarter.com",
        "password": "AdminPassword123!"
    }).json()["access_token"]

    admin_rep_res = client.get("/api/admin/reports", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_rep_res.status_code == 200
    reports = admin_rep_res.json()
    assert len(reports) > 0
