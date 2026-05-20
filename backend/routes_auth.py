"""Auth routes — register, login, logout, me."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from auth import (
    check_login_lockout, clear_login_attempts, create_access_token,
    create_refresh_token, get_current_user, hash_password, record_failed_login,
    set_auth_cookies, clear_auth_cookies, verify_password,
)
from models import LoginIn, RegisterIn, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _email_candidates(email: str):
    """Allow seamless login during brand/domain transition."""
    candidates = [email]
    if "@" not in email:
        return candidates

    local, domain = email.split("@", 1)
    if domain == "serenops.app":
        candidates.append(f"{local}@panze.app")
    elif domain == "panze.app":
        candidates.append(f"{local}@serenops.app")
    return candidates


def _user_to_out(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "role": u.get("role", "user"),
        "avatar_url": u.get("avatar_url"),
    }


@router.post("/register", response_model=UserOut)
async def register(payload: RegisterIn, response: Response):
    from server import db

    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "Email already registered")

    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": payload.name,
        "role": "user",
        "avatar_url": None,
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)

    access = create_access_token(user["id"], user["email"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return _user_to_out(user)


@router.post("/login", response_model=UserOut)
async def login(payload: LoginIn, request: Request, response: Response):
    from server import db

    email = payload.email.lower()
    await check_login_lockout(db, request, email)

    user = None
    for candidate in _email_candidates(email):
        user = await db.users.find_one({"email": candidate})
        if user:
            break
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        await record_failed_login(db, request, email)
        raise HTTPException(401, "Invalid email or password")

    await clear_login_attempts(db, request, email)
    access = create_access_token(user["id"], user["email"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return _user_to_out(user)


@router.post("/logout")
async def logout(response: Response, _user=Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@router.get("/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return _user_to_out(user)
