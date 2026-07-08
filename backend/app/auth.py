from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

# Hardcoded MVP credentials (see AGENTS.md).
USERNAME = "user"
PASSWORD = "password"

router = APIRouter(prefix="/api")


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(body: LoginRequest, request: Request) -> dict:
    if body.username != USERNAME or body.password != PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    request.session["user"] = body.username
    return {"authenticated": True, "username": body.username}


@router.post("/logout")
def logout(request: Request) -> dict:
    request.session.clear()
    return {"authenticated": False}


@router.get("/me")
def me(request: Request) -> dict:
    user = request.session.get("user")
    if user:
        return {"authenticated": True, "username": user}
    return {"authenticated": False}


def require_user(request: Request) -> str:
    """Dependency for protected routes; returns the username or raises 401."""
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user
