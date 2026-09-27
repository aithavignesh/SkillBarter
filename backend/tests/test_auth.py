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

def test_demo_switch_requires_authentication(client):
    response = client.post("/api/auth/demo-switch/1")
    assert response.status_code == 401

def test_demo_switch_denies_non_admin(client):
    login_res = client.post("/api/auth/login", json={
        "email": "arjun@skillbarter.com",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]

    response = client.post(
        "/api/auth/demo-switch/1",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403

def test_demo_switch_allows_admin(client, db):
    from app.models.user import User
    from app.services.auth import create_access_token

    admin = db.query(User).filter(User.email == "arjun@skillbarter.com").first()
    target = db.query(User).filter(User.email != "arjun@skillbarter.com").first()
    assert admin is not None
    assert target is not None

    admin.is_admin = True
    db.commit()

    token = create_access_token(data={"sub": str(admin.id)})
    response = client.post(
        f"/api/auth/demo-switch/{target.id}",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == target.id
    assert data["email"] == target.email
    assert data["access_token"]

def test_demo_switch_missing_user(client, db):
    from app.models.user import User
    from app.services.auth import create_access_token

    admin = db.query(User).filter(User.email == "arjun@skillbarter.com").first()
    assert admin is not None
    admin.is_admin = True
    db.commit()

    token = create_access_token(data={"sub": str(admin.id)})
    response = client.post(
        "/api/auth/demo-switch/999999",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404
