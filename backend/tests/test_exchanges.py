def test_full_exchange_lifecycle_and_review(client):
    # 1. Login Arjun
    arjun_token = client.post("/api/auth/login", json={
        "email": "arjun@skillbarter.com",
        "password": "Password123!"
    }).json()["access_token"]

    # 2. Login Ravi
    ravi_token = client.post("/api/auth/login", json={
        "email": "ravi@skillbarter.com",
        "password": "Password123!"
    }).json()["access_token"]
    ravi_id = client.get("/api/users/me", headers={"Authorization": f"Bearer {ravi_token}"}).json()["id"]

    # 3. Arjun proposes exchange to Ravi
    proposal_payload = {
        "receiver_id": ravi_id,
        "requester_skill_name": "Web Development",
        "receiver_skill_name": "Plumbing",
        "proposal_message": "I can build your landing page in exchange for help fixing my kitchen sink.",
        "preferred_date": "Saturday 3 PM",
        "estimated_hours": 2.5,
        "location_area": "Madhapur / Hitech City border"
    }
    create_res = client.post("/api/exchanges", json=proposal_payload, headers={"Authorization": f"Bearer {arjun_token}"})
    assert create_res.status_code == 200
    exchange = create_res.json()
    exchange_id = exchange["id"]
    assert exchange["status"] == "PENDING"
    assert exchange["proposal_message"] == proposal_payload["proposal_message"]
    assert exchange["preferred_date"] == proposal_payload["preferred_date"]
    assert exchange["estimated_hours"] == proposal_payload["estimated_hours"]

    # 3b. Both users can use the exchange-scoped messaging channel.
    message_res = client.post("/api/messages", json={
        "receiver_id": ravi_id,
        "exchange_id": exchange_id,
        "content": "Confirmed — Saturday at 3 PM works for me."
    }, headers={"Authorization": f"Bearer {arjun_token}"})
    assert message_res.status_code == 200
    assert message_res.json()["exchange_id"] == exchange_id

    messages_res = client.get(
        f"/api/messages/{ravi_id}",
        headers={"Authorization": f"Bearer {ravi_token}"},
    )
    assert messages_res.status_code == 200
    assert any(m["content"] == "Confirmed — Saturday at 3 PM works for me." for m in messages_res.json())

    # 3c. Record the scheduled exchange milestone in the analytics collector.
    schedule_event = client.post("/api/analytics/events", json={
        "event": "exchange_schedule_saved",
        "session_id": "test-exchange-lifecycle",
        "path": "/exchanges",
        "timestamp": "2026-09-26T12:00:00+00:00",
        "properties": {"exchange_id": exchange_id, "preferred_date": proposal_payload["preferred_date"]},
    })
    assert schedule_event.status_code == 202

    # 4. Ravi accepts the proposal
    accept_res = client.patch(f"/api/exchanges/{exchange_id}/accept", headers={"Authorization": f"Bearer {ravi_token}"})
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "ACTIVE"

    # 5. The legacy start endpoint is idempotent after acceptance.
    start_res = client.patch(f"/api/exchanges/{exchange_id}/start", headers={"Authorization": f"Bearer {arjun_token}"})
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "ACTIVE"

    # 6. Arjun confirms completion
    c1 = client.patch(f"/api/exchanges/{exchange_id}/complete", headers={"Authorization": f"Bearer {arjun_token}"})
    assert c1.status_code == 200
    # Still ACTIVE until Ravi also confirms!
    assert c1.json()["status"] == "ACTIVE"
    assert c1.json()["requester_completed"] is True
    assert c1.json()["receiver_completed"] is False

    # 7. Ravi confirms completion
    c2 = client.patch(f"/api/exchanges/{exchange_id}/complete", headers={"Authorization": f"Bearer {ravi_token}"})
    assert c2.status_code == 200
    # Both confirmed -> status becomes COMPLETED!
    assert c2.json()["status"] == "COMPLETED"
    assert c2.json()["requester_completed"] is True
    assert c2.json()["receiver_completed"] is True

    completion_event = client.post("/api/analytics/events", json={
        "event": "exchange_completed",
        "session_id": "test-exchange-lifecycle",
        "path": "/exchanges",
        "timestamp": "2026-09-26T12:30:00+00:00",
        "properties": {"exchange_id": exchange_id},
    })
    assert completion_event.status_code == 202

    # 8. Arjun reviews Ravi
    review_res = client.post("/api/reviews", json={
        "exchange_id": exchange_id,
        "rating": 5,
        "reliability_score": 5,
        "skill_quality_score": 5,
        "would_exchange_again": True,
        "comment": "Ravi did a fantastic job fixing the plumbing leak! Very skilled and polite."
    }, headers={"Authorization": f"Bearer {arjun_token}"})
    assert review_res.status_code == 200
    review_data = review_res.json()
    assert review_data["rating"] == 5
    assert review_data["would_exchange_again"] is True

    # 9. Verify duplicate review is rejected
    dup_res = client.post("/api/reviews", json={
        "exchange_id": exchange_id,
        "rating": 5,
        "comment": "Trying to review again"
    }, headers={"Authorization": f"Bearer {arjun_token}"})
    assert dup_res.status_code == 400

    # 10. Verify Ravi's trust score
    trust_res = client.get(f"/api/trust/user/{ravi_id}")
    assert trust_res.status_code == 200
    trust_info = trust_res.json()
    assert trust_info["trust_score"] >= 90
    assert trust_info["reviews_count"] >= 1


def test_exchange_rejects_invalid_lifecycle_input(client):
    arjun_token = client.post("/api/auth/login", json={
        "email": "arjun@skillbarter.com", "password": "Password123!"
    }).json()["access_token"]
    ravi_token = client.post("/api/auth/login", json={
        "email": "ravi@skillbarter.com", "password": "Password123!"
    }).json()["access_token"]
    ravi_id = client.get("/api/users/me", headers={"Authorization": f"Bearer {ravi_token}"}).json()["id"]
    headers = {"Authorization": f"Bearer {arjun_token}"}

    blank = client.post("/api/exchanges", json={
        "receiver_id": ravi_id,
        "proposal_message": "   ",
        "estimated_hours": 2
    }, headers=headers)
    assert blank.status_code == 422

    invalid_hours = client.post("/api/exchanges", json={
        "receiver_id": ravi_id,
        "proposal_message": "Valid proposal",
        "estimated_hours": 0
    }, headers=headers)
    assert invalid_hours.status_code == 422

    too_many_hours = client.post("/api/exchanges", json={
        "receiver_id": ravi_id,
        "proposal_message": "Valid proposal",
        "estimated_hours": 25
    }, headers=headers)
    assert too_many_hours.status_code == 422

    too_long = client.post("/api/exchanges", json={
        "receiver_id": ravi_id,
        "proposal_message": "x" * 2001,
        "estimated_hours": 2
    }, headers=headers)
    assert too_long.status_code == 422
