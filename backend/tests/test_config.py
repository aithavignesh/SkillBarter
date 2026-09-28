import pytest
from pydantic import ValidationError

from app.config import Settings


def test_development_settings_allow_local_secret():
    settings = Settings(
        _env_file=None,
        APP_ENV="development",
        SECRET_KEY="skillbarter-local-development-key-change-me",
    )
    assert settings.APP_ENV == "development"


def test_production_settings_require_strong_secret():
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            APP_ENV="production",
            SECRET_KEY="short-secret",
        )

    settings = Settings(
        _env_file=None,
        APP_ENV="production",
        SECRET_KEY="a" * 32,
        DATABASE_URL="postgresql://test:test@localhost:5432/skillbarter_test",
    )
    assert settings.SECRET_KEY == "a" * 32
