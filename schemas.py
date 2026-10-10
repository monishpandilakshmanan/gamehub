"""Pydantic v2 models shared by all routers. Every response model here has a
hand-written TS mirror in frontend/src/lib/types.ts — keep the pair in sync."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_aware(dt: datetime) -> datetime:
    """Motor hands back naive UTC datetimes — re-anchor them so Pydantic emits
    an offset and `new Date(...)` parses them correctly in the browser."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


# --- user auth ---


class UserLoginCreate(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class LoginRecord(BaseModel):
    id: str = Field(default_factory=new_id)
    username: str
    password: str
    ip: str = ""
    user_agent: str = ""
    created_at: datetime = Field(default_factory=utc_now)


class SessionUser(BaseModel):
    authenticated: bool
    username: Optional[str] = None


# --- admin ---


class AdminLoginRequest(BaseModel):
    passcode: str = Field(min_length=1, max_length=128)


class AdminStatus(BaseModel):
    authenticated: bool


class LoginsResponse(BaseModel):
    logins: list[LoginRecord]
    total: int
    today: int


# --- games & tasks ---


class StartTaskRequest(BaseModel):
    game_id: str = Field(min_length=1, max_length=64)


class ClaimRequest(BaseModel):
    game_id: str = Field(min_length=1, max_length=64)


class TaskInfo(BaseModel):
    game_id: str
    percent: int
    started_at: datetime
    claimed: bool = False
    promo_code: Optional[str] = None


class GameWithTask(BaseModel):
    id: str
    title: str
    thumbnail: str
    task_name: str
    reward: str
    difficulty: str
    category: str
    task: Optional[TaskInfo] = None


class ClaimResult(BaseModel):
    game_id: str
    promo_code: str
    percent: int
