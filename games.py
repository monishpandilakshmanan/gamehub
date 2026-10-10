"""Game catalog + per-session task progress.

The four games are the owner's provided thumbnails displayed in REVERSE order
of how they were supplied (given: jjs, dragon-egg, rivals, blox-fruits).
Task progress: +2% every 5 real-time minutes since the task started,
calculated server-side so the clock is always the pod's, never the browser's.
"""

import uuid

from fastapi import APIRouter, HTTPException, Request

from lib.db import db
from lib.sessions import user_session
from models.schemas import (
    ClaimRequest,
    ClaimResult,
    GameWithTask,
    StartTaskRequest,
    TaskInfo,
    utc_aware,
    utc_now,
)

router = APIRouter(tags=["games"])

STEP_SECONDS = 5 * 60
STEP_PERCENT = 2
MAX_PERCENT = 100

GAMES: list[dict] = [
    {
        "id": "blox-fruits",
        "title": "Blox Fruits",
        "thumbnail": "/games/bloxfruits.webp",
        "task_name": "Sail to the Third Sea & awaken a Mythical Devil Fruit",
        "reward": "3,000 Robux Voucher",
        "difficulty": "Grandmaster",
        "category": "Open World MMO",
    },
    {
        "id": "rivals",
        "title": "Rivals — Tactical Sniper",
        "thumbnail": "/games/rivals.jpg",
        "task_name": "Land 20 headshots in Ranked Elimination",
        "reward": "1,800 Robux Voucher",
        "difficulty": "Tactical",
        "category": "Competitive FPS",
    },
    {
        "id": "dragon-egg",
        "title": "Dragon Egg Hatchery",
        "thumbnail": "/games/dragon-egg.jpg",
        "task_name": "Hatch the Legendary Celestial Dragon & feed it 50 gems",
        "reward": "2,200 Robux Voucher",
        "difficulty": "Legendary",
        "category": "Pet Fantasy",
    },
    {
        "id": "jjs",
        "title": "Anime Lightning Fighter",
        "thumbnail": "/games/jjs.jpg",
        "task_name": "Survive 5 boss raids & awaken the Lightning Katana",
        "reward": "1,500 Robux Voucher",
        "difficulty": "Master",
        "category": "Action RPG",
    },
]

GAME_IDS = {g["id"] for g in GAMES}


def compute_percent(started_at) -> int:
    started = utc_aware(started_at)
    elapsed = (utc_now() - started).total_seconds()
    steps = int(elapsed // STEP_SECONDS)
    return max(0, min(MAX_PERCENT, steps * STEP_PERCENT))


async def require_user(request: Request) -> dict:
    session = await user_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="login required")
    return session


def task_info(doc: dict) -> TaskInfo:
    return TaskInfo(
        game_id=doc["game_id"],
        percent=compute_percent(doc["started_at"]),
        started_at=utc_aware(doc["started_at"]),
        claimed=doc.get("claimed", False),
        promo_code=doc.get("promo_code"),
    )


@router.get("/games", response_model=list[GameWithTask])
async def list_games(request: Request):
    games = [GameWithTask(**g) for g in GAMES]
    session = await user_session(request)
    if not session:
        return games
    docs = await db.tasks.find({"session_id": session["id"]}, {"_id": 0}).to_list(100)
    by_game = {doc["game_id"]: task_info(doc) for doc in docs}
    for game in games:
        if game.id in by_game:
            game.task = by_game[game.id]
    return games


@router.get("/tasks", response_model=list[TaskInfo])
async def list_tasks(request: Request):
    session = await require_user(request)
    docs = await db.tasks.find({"session_id": session["id"]}, {"_id": 0}).to_list(100)
    return [task_info(doc) for doc in docs]


@router.post("/tasks/start", response_model=TaskInfo)
async def start_task(payload: StartTaskRequest, request: Request):
    session = await require_user(request)
    if payload.game_id not in GAME_IDS:
        raise HTTPException(status_code=404, detail="unknown game")
    doc = await db.tasks.find_one({"session_id": session["id"], "game_id": payload.game_id})
    if not doc:
        doc = {
            "id": str(uuid.uuid4()),
            "session_id": session["id"],
            "username": session.get("username", ""),
            "game_id": payload.game_id,
            "started_at": utc_now(),
            "claimed": False,
            "promo_code": None,
            "claimed_at": None,
        }
        await db.tasks.insert_one(doc)
    return task_info(doc)


@router.post("/tasks/claim", response_model=ClaimResult)
async def claim_task(payload: ClaimRequest, request: Request):
    session = await require_user(request)
    if payload.game_id not in GAME_IDS:
        raise HTTPException(status_code=404, detail="unknown game")
    doc = await db.tasks.find_one({"session_id": session["id"], "game_id": payload.game_id})
    if not doc:
        raise HTTPException(status_code=404, detail="task not started")
    percent = compute_percent(doc["started_at"])
    if percent < MAX_PERCENT:
        raise HTTPException(
            status_code=400, detail=f"task only {percent}% complete — keep going"
        )
    promo_code = doc.get("promo_code")
    if not promo_code:
        promo_code = f"RHUB-{uuid.uuid4().hex[:4].upper()}-{uuid.uuid4().hex[:4].upper()}"
        await db.tasks.update_one(
            {"_id": doc["_id"]},
            {"$set": {"claimed": True, "claimed_at": utc_now(), "promo_code": promo_code}},
        )
    return ClaimResult(game_id=payload.game_id, promo_code=promo_code, percent=percent)
