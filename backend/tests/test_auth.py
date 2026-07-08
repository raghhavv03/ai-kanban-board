from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from starlette.middleware.sessions import SessionMiddleware

from app.auth import require_user, router
from app.main import app

CREDS = {"username": "user", "password": "password"}


def test_me_is_false_before_login():
    client = TestClient(app)
    assert client.get("/api/me").json() == {"authenticated": False}


def test_login_logout_flow():
    client = TestClient(app)

    login = client.post("/api/login", json=CREDS)
    assert login.status_code == 200
    assert login.json() == {"authenticated": True, "username": "user"}

    assert client.get("/api/me").json() == {"authenticated": True, "username": "user"}

    client.post("/api/logout")
    assert client.get("/api/me").json() == {"authenticated": False}


def test_login_with_invalid_credentials():
    client = TestClient(app)
    res = client.post("/api/login", json={"username": "user", "password": "wrong"})
    assert res.status_code == 401
    assert client.get("/api/me").json() == {"authenticated": False}


def _protected_app() -> FastAPI:
    test_app = FastAPI()
    test_app.add_middleware(SessionMiddleware, secret_key="test")
    test_app.include_router(router)

    @test_app.get("/api/protected")
    def protected(user: str = Depends(require_user)) -> dict:
        return {"user": user}

    return test_app


def test_require_user_blocks_anonymous_and_allows_authenticated():
    client = TestClient(_protected_app())

    assert client.get("/api/protected").status_code == 401

    client.post("/api/login", json=CREDS)
    res = client.get("/api/protected")
    assert res.status_code == 200
    assert res.json() == {"user": "user"}
