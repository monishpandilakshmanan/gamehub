"""User auth: capture username/password into the admin-visible logins table
and keep an httpOnly session cookie for the games/tasks area."""

from fastapi import APIRouter, HTTPException, Request, Response

from lib.db import db
from lib.sessions import COOKIE_USER, USER_COOKIE_MAX_AGE, user_session
from models.schemas import LoginRecord, SessionUser, UserLoginCreate, new_id, utc_now

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=SessionUser)
async def login(payload: UserLoginCreate, request: Request, response: Response):
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=422, detail="username cannot be empty")

    now = utc_now()
    record = LoginRecord(
        username=username,
        password=payload.password,
        ip=request.client.host if request.client else "unknown",
        user_agent=(request.headers.get("user-agent") or "")[:200],
        created_at=now,
    )
    session_id = new_id()
    await db.logins.insert_one(record.model_dump())
    await db.sessions.insert_one({"id": session_id, "username": username, "created_at": now})
    response.set_cookie(
        COOKIE_USER,
        session_id,
        httponly=True,
        samesite="lax",
        max_age=USER_COOKIE_MAX_AGE,
        path="/",
    )
    return SessionUser(authenticated=True, username=username)


@router.get("/me", response_model=SessionUser)
async def me(request: Request):
    session = await user_session(request)
    if session:
        return SessionUser(authenticated=True, username=session.get("username"))
    return SessionUser(authenticated=False, username=None)


@router.post("/logout", response_model=SessionUser)
async def logout(request: Request, response: Response):
    session_id = request.cookies.get(COOKIE_USER)
    if session_id:
        await db.sessions.delete_one({"id": session_id})
    response.delete_cookie(COOKIE_USER, path="/")
    return SessionUser(authenticated=False, username=None)
