"""
Minimal JWT auth, OFF by default (AUTH_ENABLED=false) so it never blocks
development or your demo. Flip it on for production by setting
AUTH_ENABLED=true in the environment -- every router below already depends
on `require_auth`, so no other code changes are needed.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Header
from jose import jwt, JWTError
from pydantic import BaseModel

from app import config

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


# Hardcoded demo users -- replace with a real users table before production
DEMO_USERS = {
    "analyst": "analyst123",
    "ciso": "ciso123",
}


@router.post("/login")
def login(req: LoginRequest):
    if DEMO_USERS.get(req.username) != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    expire = datetime.now(timezone.utc) + timedelta(hours=8)
    token = jwt.encode(
        {"sub": req.username, "exp": expire},
        config.JWT_SECRET,
        algorithm=config.JWT_ALGORITHM,
    )
    return {"access_token": token, "token_type": "bearer"}


def require_auth(authorization: str | None = Header(None)):
    """Dependency to attach to protected routes. No-op if AUTH_ENABLED=false."""
    if not config.AUTH_ENABLED:
        return None
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
        return payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
