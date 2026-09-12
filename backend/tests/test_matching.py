def test_nearby_discovery(client):
    login_res = client.post("/api/auth/login", json={
        "email": "arjun@skillbarter.com",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    
    res = client.get("/api/users/nearby?radius_km=10", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    nearby = res.json()
    assert len(nearby) > 0
    # Ravi should be in nearby list (~1.8 km)
    names = [u["full_name"] for u in nearby]
    assert "Ravi Kumar" in names
    ravi = next(u for u in nearby if u["full_name"] == "Ravi Kumar")
    assert ravi["distance_km"] < 5.0
    assert "1." in ravi["distance_display"] or "km" in ravi["distance_display"]

def test_reciprocal_skill_matching(client):
    # Arjun Sharma should get Ravi Kumar as top match (Web Dev <-> Plumbing)
    login_res = client.post("/api/auth/login", json={
        "email": "arjun@skillbarter.com",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]

    res = client.get("/api/matches", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    matches = res.json()
    assert len(matches) > 0

    top_match = matches[0]
    assert top_match["candidate"]["full_name"] == "Ravi Kumar"
    assert top_match["is_reciprocal"] is True
    assert top_match["match_score"] >= 90
    assert len(top_match["reasons"]) > 0
    assert any("Direct 2-way" in r for r in top_match["reasons"])
