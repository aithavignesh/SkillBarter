import pytest
import sys
import os

# Insert backend directory in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.seed.seed_data import seed_database
from app.models.user import User

TEST_DATABASE_URL = "sqlite:///./test_skillbarter.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    # Seed
    from app.seed import seed_data
    old_engine = seed_data.engine
    old_session = seed_data.SessionLocal
    seed_data.engine = test_engine
    seed_data.SessionLocal = TestingSessionLocal
    seed_database()
    yield
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_skillbarter.db"):
        try:
            os.remove("./test_skillbarter.db")
        except Exception:
            pass

@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def client():
    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
