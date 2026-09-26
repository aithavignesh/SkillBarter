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


def test_report_rejects_unknown_user_and_unauthorized_exchange(client):
    arjun_token = client.post("/api/auth/login", json={
        "email": "arjun@skillbarter.com",
        "password": "Password123!"
    }).json()["access_token"]
    ravi_token = client.post("/api/auth/login", json={
        "email": "ravi@skillbarter.com",
        "password": "Password123!"
    }).json()["access_token"]
    priya_token = client.post("/api/auth/login", json={
        "email": "priya@skillbarter.com",
        "password": "Password123!"
    }).json()["access_token"]

    unknown = client.post("/api/reports", json={
        "reported_user_id": 999999,
        "category": "Spam",
        "details": "Unknown account"
    }, headers={"Authorization": f"Bearer {arjun_token}"})
    assert unknown.status_code == 404

    ravi_id = client.get("/api/users/me", headers={"Authorization": f"Bearer {ravi_token}"}).json()["id"]
    proposal = client.post("/api/exchanges", json={
        "receiver_id": ravi_id,
        "requester_skill_name": "Web Development",
        "receiver_skill_name": "Plumbing",
        "proposal_message": "Safety test exchange",
        "preferred_date": "Saturday",
        "estimated_hours": 1,
        "location_area": "Madhapur"
    }, headers={"Authorization": f"Bearer {arjun_token}"})
    assert proposal.status_code == 200
    exchange_id = proposal.json()["id"]

    unauthorized = client.post("/api/reports", json={
        "reported_user_id": ravi_id,
        "reported_exchange_id": exchange_id,
        "category": "Unsafe behavior",
        "details": "Unauthorized report attempt"
    }, headers={"Authorization": f"Bearer {priya_token}"})
    assert unauthorized.status_code == 403


def test_block_rejects_unknown_user(client):
    arjun_token = client.post("/api/auth/login", json={
        "email": "arjun@skillbarter.com",
        "password": "Password123!"
    }).json()["access_token"]

    response = client.post(
        "/api/blocks/999999",
        headers={"Authorization": f"Bearer {arjun_token}"}
    )
    assert response.status_code == 404


def test_report_rejects_blank_details(client):
    arjun_token = client.post("/api/auth/login", json={
        "email": "arjun@skillbarter.com",
        "password": "Password123!"
    }).json()["access_token"]

    response = client.post("/api/reports", json={
        "reported_user_id": 2,
        "category": "Spam",
        "details": "   "
    }, headers={"Authorization": f"Bearer {arjun_token}"})
    assert response.status_code == 422
