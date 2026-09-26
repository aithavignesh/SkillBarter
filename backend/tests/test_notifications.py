from app.models.notification import Notification


def login(client, email):
    response = client.post("/api/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    assert response.status_code == 200
    return response.json()["access_token"]


def test_notifications_are_user_scoped_and_read_actions_are_authorized(client, db):
    arjun_token = login(client, "arjun@skillbarter.com")
    ravi_token = login(client, "ravi@skillbarter.com")
    arjun_id = client.get("/api/users/me", headers={"Authorization": f"Bearer {arjun_token}"}).json()["id"]
    ravi_id = client.get("/api/users/me", headers={"Authorization": f"Bearer {ravi_token}"}).json()["id"]

    arjun_notification = Notification(
        user_id=arjun_id,
        type="TEST",
        title="Arjun notification",
        message="Private notification",
    )
    ravi_notification = Notification(
        user_id=ravi_id,
        type="TEST",
        title="Ravi notification",
        message="Private notification",
    )
    db.add_all([arjun_notification, ravi_notification])
    db.commit()
    db.refresh(arjun_notification)
    db.refresh(ravi_notification)

    response = client.get(
        "/api/notifications",
        headers={"Authorization": f"Bearer {arjun_token}"}
    )
    assert response.status_code == 200
    ids = [item["id"] for item in response.json()]
    assert arjun_notification.id in ids
    assert ravi_notification.id not in ids

    forbidden = client.patch(
        f"/api/notifications/{ravi_notification.id}/read",
        headers={"Authorization": f"Bearer {arjun_token}"}
    )
    assert forbidden.status_code == 404

    before = client.get(
        "/api/notifications/unread-count",
        headers={"Authorization": f"Bearer {arjun_token}"}
    )
    assert before.status_code == 200
    before_count = before.json()["unread_count"]

    mark = client.patch(
        f"/api/notifications/{arjun_notification.id}/read",
        headers={"Authorization": f"Bearer {arjun_token}"}
    )
    assert mark.status_code == 200

    unread = client.get(
        "/api/notifications/unread-count",
        headers={"Authorization": f"Bearer {arjun_token}"}
    )
    assert unread.status_code == 200
    assert unread.json()["unread_count"] == max(0, before_count - 1)


def test_read_all_only_affects_current_user(client, db):
    arjun_token = login(client, "arjun@skillbarter.com")
    ravi_token = login(client, "ravi@skillbarter.com")
    arjun_id = client.get("/api/users/me", headers={"Authorization": f"Bearer {arjun_token}"}).json()["id"]
    ravi_id = client.get("/api/users/me", headers={"Authorization": f"Bearer {ravi_token}"}).json()["id"]

    arjun_notification = Notification(
        user_id=arjun_id,
        type="TEST",
        title="Arjun unread",
        message="Private",
        is_read=False,
    )
    ravi_notification = Notification(
        user_id=ravi_id,
        type="TEST",
        title="Ravi unread",
        message="Private",
        is_read=False,
    )
    db.add_all([arjun_notification, ravi_notification])
    db.commit()

    response = client.patch(
        "/api/notifications/read-all",
        headers={"Authorization": f"Bearer {arjun_token}"}
    )
    assert response.status_code == 200

    db.refresh(arjun_notification)
    db.refresh(ravi_notification)
    assert arjun_notification.is_read is True
    assert ravi_notification.is_read is False
