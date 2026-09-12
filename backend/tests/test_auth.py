def test_login_success(client):
    response = client.post("/api/auth/login", json={
        "email": "arjun@skillbarter.com",
        "password": "Password123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["email"] == "arjun@skillbarter.com"
    assert data["full_name"] == "Arjun Sharma"

def test_login_invalid_password(client):
    response = client.post("/api/auth/login", json={
        "email": "arjun@skillbarter.com",
        "password": "WrongPassword!"
    })
    assert response.status_code == 401

def test_register_new_user(client):
    response = client.post("/api/auth/register", json={
        "email": "neha@skillbarter.com",
        "password": "Password123!",
        "full_name": "Neha Patel",
        "address_display": "Kondapur, Hyderabad",
        "primary_skill": "Baking",
        "primary_category": "Cooking"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "neha@skillbarter.com"
    assert "access_token" in data

def test_get_me_profile(client):
    login_res = client.post("/api/auth/login", json={
        "email": "arjun@skillbarter.com",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    
    res = client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    me = res.json()
    assert me["full_name"] == "Arjun Sharma"
    assert len(me["skills"]) > 0
    assert me["trust_score"] >= 80.0
