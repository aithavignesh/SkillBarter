from pydantic import ValidationError
import pytest

from app.schemas.user import UserUpdate


def test_user_update_accepts_valid_profile_values():
    payload = UserUpdate(
        full_name="Arjun Kumar",
        headline="Python Mentor",
        bio="I help students learn Python.",
        address_display="Hyderabad",
        exchange_radius_km=25,
        latitude=17.385,
        longitude=78.486,
    )
    assert payload.full_name == "Arjun Kumar"
    assert payload.exchange_radius_km == 25


@pytest.mark.parametrize(
    "kwargs",
    [
        {"full_name": "   "},
        {"headline": "   "},
        {"availability": "   "},
        {"primary_intent": "   "},
        {"location_visibility": "   "},
    ],
)
def test_user_update_rejects_blank_text(kwargs):
    with pytest.raises(ValidationError):
        UserUpdate(**kwargs)


@pytest.mark.parametrize(
    "kwargs",
    [
        {"full_name": "x" * 151},
        {"bio": "x" * 2001},
        {"headline": "x" * 201},
        {"address_display": "x" * 201},
        {"avatar_url": "x" * 501},
        {"availability": "x" * 101},
    ],
)
def test_user_update_rejects_oversized_text(kwargs):
    with pytest.raises(ValidationError):
        UserUpdate(**kwargs)


@pytest.mark.parametrize(
    "kwargs",
    [
        {"latitude": 90.1},
        {"latitude": -90.1},
        {"longitude": 180.1},
        {"longitude": -180.1},
        {"exchange_radius_km": 0},
        {"exchange_radius_km": 100.1},
    ],
)
def test_user_update_rejects_invalid_location_values(kwargs):
    with pytest.raises(ValidationError):
        UserUpdate(**kwargs)
