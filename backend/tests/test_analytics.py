from datetime import datetime, timedelta, timezone

from app.models.analytics import AnalyticsEvent


def test_capture_analytics_event(client, db):
    payload = {
        "event": "onboarding_completed",
        "session_id": "test-session-analytics",
        "path": "/onboarding",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "properties": {"source": "beta", "step": 4},
    }

    response = client.post("/api/analytics/events", json=payload)

    assert response.status_code == 202
    assert response.json() == {"accepted": True}

    event = db.query(AnalyticsEvent).filter(
        AnalyticsEvent.session_id == "test-session-analytics"
    ).first()
    assert event is not None
    assert event.event == "onboarding_completed"


def test_reject_unsupported_analytics_event(client):
    response = client.post("/api/analytics/events", json={
        "event": "password_exposed",
        "session_id": "test-session-invalid",
        "path": "/",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "properties": {},
    })

    assert response.status_code == 400


def test_kpi_endpoint_requires_admin(client):
    response = client.get("/api/analytics/kpi")
    assert response.status_code in (401, 403)


def test_kpi_endpoint_returns_funnel(client):
    login = client.post("/api/auth/login", json={
        "email": "admin@skillbarter.com",
        "password": "Password123!"
    })

    if login.status_code != 200:
        return

    token = login.json()["access_token"]
    response = client.get(
        "/api/analytics/kpi?days=7",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["window_days"] == 7
    assert "funnel" in data
    assert "events" in data
    assert len(data["funnel"]) > 0
