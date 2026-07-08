import os

# Use a throwaway in-memory DB for the module engine; board tests override get_db.
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import get_db
from app.main import app
from app.models import Base

CREDS = {"username": "user", "password": "password"}


def _make_engine(path):
    engine = create_engine(
        f"sqlite:///{path}", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture
def raw_client(tmp_path):
    engine = _make_engine(tmp_path / "test.db")
    TestingSession = sessionmaker(bind=engine, autoflush=False)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture
def client(raw_client):
    raw_client.post("/api/login", json=CREDS)
    return raw_client


@pytest.fixture
def db_session(tmp_path):
    engine = _make_engine(tmp_path / "svc.db")
    TestingSession = sessionmaker(bind=engine, autoflush=False)
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()
