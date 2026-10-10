"""Cookie session helpers shared by the auth / admin / games routers.

Sessions are httpOnly cookies — never tokens in JSON bodies. The cookies are
set at login, validated against Mongo on every request, and cleared on logout.
"""

import os
from typing import Any, Optional

from fastapi import Request

from lib.db import db

COOKIE_USER = "rh_session"
COOKIE_ADMIN = "rh_admin"
USER_COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # one week
ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8  # one operator shift


def admin_passcode() -> str:
    return os.environ.get("ADMIN_PASSCODE", "HSINOM@2011")


async def user_session(request: Request) -> Optional[dict[str, Any]]:
    session_id = request.cookies.get(COOKIE_USER)
    if not session_id:
        return None
    return await db.sessions.find_one({"id": session_id}, {"_id": 0})


async def admin_session(request: Request) -> Optional[dict[str, Any]]:
    session_id = request.cookies.get(COOKIE_ADMIN)
    if not session_id:
        return None
    return await db.admin_sessions.find_one({"id": session_id}, {"_id": 0})
