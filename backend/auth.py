"""JWT + bcrypt auth helpers."""
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import HTTPException, Request, Response

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MIN = 60 * 24  # 1 day
REFRESH_TOKEN_DAYS = 7

# Brute-force protection
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def _cookie_secure() -> bool:
    return os.environ.get("COOKIE_SECURE", "false").lower() == "true"


def _cookie_samesite() -> str:
    # "lax" by default; for cross-site cookies in production use "none" + secure=True
    return os.environ.get("COOKIE_SAMESITE", "lax").lower()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MIN),
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS),
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    secure = _cookie_secure()
    samesite = _cookie_samesite()
    response.set_cookie(
        "access_token", access, httponly=True, secure=secure, samesite=samesite,
        max_age=ACCESS_TOKEN_MIN * 60, path="/",
    )
    response.set_cookie(
        "refresh_token", refresh, httponly=True, secure=secure, samesite=samesite,
        max_age=REFRESH_TOKEN_DAYS * 86400, path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


def _extract_token(request: Request) -> Optional[str]:
    token = request.cookies.get("access_token")
    if token:
        return token
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return None


async def get_current_user(request: Request):
    """FastAPI dependency. Returns the user dict (no password)."""
    from server import db  # late import to avoid cycles

    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------- Brute-force protection ----------

def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def check_login_lockout(db, request: Request, email: str):
    """Raise 429 if too many recent failures from this ip+email pair."""
    ident = f"{_client_ip(request)}:{email}"
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=LOCKOUT_MINUTES)
    record = await db.login_attempts.find_one({"identifier": ident})
    if not record:
        return
    # purge stale failures
    fails = [t for t in record.get("failures", []) if datetime.fromisoformat(t) > cutoff]
    if len(fails) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. Try again in {LOCKOUT_MINUTES} minutes.",
        )
    if len(fails) != len(record.get("failures", [])):
        await db.login_attempts.update_one({"identifier": ident}, {"$set": {"failures": fails}})


async def record_failed_login(db, request: Request, email: str):
    ident = f"{_client_ip(request)}:{email}"
    now = datetime.now(timezone.utc).isoformat()
    await db.login_attempts.update_one(
        {"identifier": ident},
        {"$push": {"failures": now}, "$setOnInsert": {"identifier": ident}},
        upsert=True,
    )


async def clear_login_attempts(db, request: Request, email: str):
    ident = f"{_client_ip(request)}:{email}"
    await db.login_attempts.delete_one({"identifier": ident})
