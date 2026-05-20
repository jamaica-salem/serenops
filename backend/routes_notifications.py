"""Persisted, smart rule-based notifications."""
import uuid
from datetime import datetime, timezone, date
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from models import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _parse_date(s):
    if not s:
        return None
    try:
        return date.fromisoformat(s[:10])
    except Exception:
        return None


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


async def _generate_for_user(db, user_id: str):
    """Create new notifications based on current tasks state. Idempotent.

    Each task gets at most one open 'overdue' or 'due_soon' notification at a time.
    Plus one global 'ai_alert' if the user has 3+ overdue.
    """
    today = datetime.now(timezone.utc).date()
    tasks = await db.tasks.find({"assignee_id": user_id}, {"_id": 0}).to_list(500)

    overdue_count = 0
    for t in tasks:
        d = _parse_date(t.get("due_date"))
        if not d or t.get("status") == "done":
            continue
        delta = (d - today).days
        kind = None
        title = None
        msg = None
        if delta < 0:
            kind = "overdue"
            overdue_count += 1
            title = f"Overdue: {t['title']}"
            msg = f"Was due {abs(delta)} day(s) ago"
        elif delta <= 2:
            kind = "due_soon"
            title = f"Due soon: {t['title']}"
            msg = "Due today" if delta == 0 else f"Due in {delta} day(s)"
        if not kind:
            continue

        existing = await db.notifications.find_one(
            {"user_id": user_id, "task_id": t["id"], "type": kind}
        )
        if existing:
            # Update message if changed (e.g., delta grows)
            if existing.get("message") != msg:
                await db.notifications.update_one(
                    {"id": existing["id"]}, {"$set": {"message": msg, "title": title}}
                )
            continue

        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": kind,
            "title": title,
            "message": msg,
            "task_id": t["id"],
            "read": False,
            "created_at": _now_iso(),
        })

    # AI rollup
    ai_existing = await db.notifications.find_one(
        {"user_id": user_id, "type": "ai_alert", "read": False}
    )
    if overdue_count >= 3 and not ai_existing:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "ai_alert",
            "title": "AI: You're falling behind",
            "message": f"{overdue_count} tasks are overdue. Consider rescheduling or delegating.",
            "task_id": None,
            "read": False,
            "created_at": _now_iso(),
        })

    # Auto-resolve obsolete: notifications whose task is now done or due_date moved
    open_notifs = await db.notifications.find(
        {"user_id": user_id, "type": {"$in": ["overdue", "due_soon"]}, "read": False}
    ).to_list(500)
    for n in open_notifs:
        task = next((t for t in tasks if t["id"] == n.get("task_id")), None)
        if not task:
            await db.notifications.delete_one({"id": n["id"]})
            continue
        if task.get("status") == "done":
            await db.notifications.delete_one({"id": n["id"]})
            continue
        d = _parse_date(task.get("due_date"))
        if not d:
            continue
        delta = (d - today).days
        if n["type"] == "overdue" and delta >= 0:
            await db.notifications.delete_one({"id": n["id"]})
        elif n["type"] == "due_soon" and (delta < 0 or delta > 2):
            await db.notifications.delete_one({"id": n["id"]})


@router.get("", response_model=List[NotificationOut])
async def list_notifications(user=Depends(get_current_user)):
    from server import db
    await _generate_for_user(db, user["id"])
    items = await db.notifications.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return items


@router.patch("/{notif_id}/read")
async def mark_read(notif_id: str, user=Depends(get_current_user)):
    from server import db
    res = await db.notifications.update_one(
        {"id": notif_id, "user_id": user["id"]}, {"$set": {"read": True}}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Notification not found")
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(user=Depends(get_current_user)):
    from server import db
    res = await db.notifications.update_many(
        {"user_id": user["id"], "read": False}, {"$set": {"read": True}}
    )
    return {"ok": True, "count": res.modified_count}


@router.delete("/{notif_id}")
async def delete_notification(notif_id: str, user=Depends(get_current_user)):
    from server import db
    res = await db.notifications.delete_one({"id": notif_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Notification not found")
    return {"ok": True}
