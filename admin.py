"""Admin console backend: passcode gate, captured logins table, source-zip."""

import hmac
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import FileResponse

from lib.db import db
from lib.dates import today_iso
from lib.sessions import (
    ADMIN_COOKIE_MAX_AGE,
    COOKIE_ADMIN,
    admin_passcode,
    admin_session,
)
from models.schemas import (
    AdminLoginRequest,
    AdminStatus,
    LoginRecord,
    LoginsResponse,
    new_id,
    utc_aware,
    utc_now,
)

router = APIRouter(prefix="/admin", tags=["admin"])

ZIP_PATH = Path(__file__).resolve().parent.parent / "assets" / "rewardshub-source-code.zip"


async def require_admin(request: Request) -> None:
    if not await admin_session(request):
        raise HTTPException(status_code=401, detail="admin authentication required")


@router.post("/login", response_model=AdminStatus)
async def admin_login(payload: AdminLoginRequest, response: Response):
    if not hmac.compare_digest(payload.passcode.strip(), admin_passcode()):
        raise HTTPException(status_code=401, detail="ACCESS DENIED — invalid passcode")
    session_id = new_id()
    await db.admin_sessions.insert_one({"id": session_id, "created_at": utc_now()})
    response.set_cookie(
        COOKIE_ADMIN,
        session_id,
        httponly=True,
        samesite="lax",
        max_age=ADMIN_COOKIE_MAX_AGE,
        path="/",
    )
    return AdminStatus(authenticated=True)


@router.get("/session", response_model=AdminStatus)
async def admin_session_status(request: Request):
    return AdminStatus(authenticated=bool(await admin_session(request)))


@router.post("/logout", response_model=AdminStatus)
async def admin_logout(request: Request, response: Response):
    session_id = request.cookies.get(COOKIE_ADMIN)
    if session_id:
        await db.admin_sessions.delete_one({"id": session_id})
    response.delete_cookie(COOKIE_ADMIN, path="/")
    return AdminStatus(authenticated=False)


@router.get("/logins", response_model=LoginsResponse)
async def list_logins(request: Request):
    await require_admin(request)
    docs = await db.logins.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    records = [
        LoginRecord(**{**doc, "created_at": utc_aware(doc["created_at"])}) for doc in docs
    ]
    today = today_iso()
    return LoginsResponse(
        logins=records,
        total=len(records),
        today=sum(1 for r in records if r.created_at.strftime("%Y-%m-%d") == today),
    )


@router.delete("/logins/{record_id}")
async def delete_login(record_id: str, request: Request):
    await require_admin(request)
    result = await db.logins.delete_one({"id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="login record not found")
    return {"deleted": True}


@router.get("/download-source-zip")
async def download_source_zip(request: Request):
    await require_admin(request)
    if not ZIP_PATH.exists():
        raise HTTPException(status_code=404, detail="source archive not generated yet")
    return FileResponse(
        ZIP_PATH,
        media_type="application/zip",
        filename="rewardshub-source-code.zip",
    )
