def _login(client, email):
    return client.post("/api/auth/login", json={
        "email": email,
        "password": "Password123!"
    }).json()["access_token"]


def test_search_excludes_users_who_block_current_user(client):
    arjun_token = _login(client, "arjun@skillbarter.com")
    ananya_token = _login(client, "ananya@skillbarter.com")

    ananya_id = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {ananya_token}"}
    ).json()["id"]

    block_res = client.post(
        f"/api/blocks/{arjun_token and ananya_id}",
        headers={"Authorization": f"Bearer {ananya_token}"}
    )
    assert block_res.status_code == 200

    search_res = client.get(
        "/api/search?q=",
        headers={"Authorization": f"Bearer {arjun_token}"}
    )
    assert search_res.status_code == 200
    people_ids = [person["id"] for person in search_res.json()["people"]]
    assert ananya_id not in people_ids


def test_search_still_returns_unblocked_users(client):
    arjun_token = _login(client, "arjun@skillbarter.com")
    search_res = client.get(
        "/api/search?q=",
        headers={"Authorization": f"Bearer {arjun_token}"}
    )
    assert search_res.status_code == 200
    assert isinstance(search_res.json()["people"], list)
