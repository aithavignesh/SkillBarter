from pydantic import ValidationError

def login(client, email):
    response = client.post("/api/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    assert response.status_code == 200
    return response.json()["access_token"]


def me(client, token):
    response = client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    return response.json()


def test_send_message_accepts_valid_message(client):
    arjun_token = login(client, "arjun@skillbarter.com")
    ravi_token = login(client, "ravi@skillbarter.com")
    ravi_id = me(client, ravi_token)["id"]

    response = client.post(
        "/api/messages",
        json={"receiver_id": ravi_id, "content": "Hello Ravi"},
        headers={"Authorization": f"Bearer {arjun_token}"}
    )

    assert response.status_code == 200
    assert response.json()["content"] == "Hello Ravi"


def test_send_message_rejects_empty_or_oversized_content(client):
    arjun_token = login(client, "arjun@skillbarter.com")
    ravi_token = login(client, "ravi@skillbarter.com")
    ravi_id = me(client, ravi_token)["id"]
    headers = {"Authorization": f"Bearer {arjun_token}"}

    empty_response = client.post(
        "/api/messages",
        json={"receiver_id": ravi_id, "content": ""},
        headers=headers
    )
    assert empty_response.status_code == 422

    oversized_response = client.post(
        "/api/messages",
        json={"receiver_id": ravi_id, "content": "x" * 2001},
        headers=headers
    )
    assert oversized_response.status_code == 422


def test_send_message_rejects_exchange_for_non_participant(client):
    arjun_token = login(client, "arjun@skillbarter.com")
    ravi_token = login(client, "ravi@skillbarter.com")
    arjun_id = me(client, arjun_token)["id"]
    ravi_id = me(client, ravi_token)["id"]

    proposal = client.post(
        "/api/exchanges",
        json={
            "receiver_id": ravi_id,
            "requester_skill_name": "Web Development",
            "receiver_skill_name": "Plumbing",
            "proposal_message": "Let's exchange skills.",
            "preferred_date": "Saturday 3 PM",
            "estimated_hours": 2,
            "location_area": "Madhapur"
        },
        headers={"Authorization": f"Bearer {arjun_token}"}
    )
    assert proposal.status_code == 200
    exchange_id = proposal.json()["id"]

    # Ravi is not a participant in a different exchange.
    # Use a third seeded account so the authorization check is exercised.
    third_token = login(client, "priya@skillbarter.com")
    response = client.post(
        "/api/messages",
        json={
            "receiver_id": arjun_id,
            "content": "Unauthorized exchange message",
            "exchange_id": exchange_id
        },
        headers={"Authorization": f"Bearer {third_token}"}
    )

    assert response.status_code == 403


def test_send_message_rejects_exchange_recipient_mismatch(client):
    arjun_token = login(client, "arjun@skillbarter.com")
    ravi_token = login(client, "ravi@skillbarter.com")
    arjun_id = me(client, arjun_token)["id"]
    ravi_id = me(client, ravi_token)["id"]

    proposal = client.post(
        "/api/exchanges",
        json={
            "receiver_id": ravi_id,
            "requester_skill_name": "Web Development",
            "receiver_skill_name": "Plumbing",
            "proposal_message": "Let's exchange skills.",
            "preferred_date": "Saturday 3 PM",
            "estimated_hours": 2,
            "location_area": "Madhapur"
        },
        headers={"Authorization": f"Bearer {arjun_token}"}
    )
    assert proposal.status_code == 200
    exchange_id = proposal.json()["id"]

    # Arjun is a valid participant, but cannot attach the exchange to another recipient.
    response = client.post(
        "/api/messages",
        json={
            "receiver_id": arjun_id,
            "content": "Wrong recipient",
            "exchange_id": exchange_id
        },
        headers={"Authorization": f"Bearer {ravi_token}"}
    )

    assert response.status_code == 400
