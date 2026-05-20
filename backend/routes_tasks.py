"""Task CRUD routes."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from auth import get_current_user
from models import TaskIn, TaskOut, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("", response_model=List[TaskOut])
async def list_tasks(
    user=Depends(get_current_user),
    status: Optional[str] = None,
    assignee: Optional[str] = Query(None, description="'me' or user id"),
    project_id: Optional[str] = None,
    client_id: Optional[str] = None,
):
    from server import db

    query = {}
    if status:
        query["status"] = status
    if project_id:
        query["project_id"] = project_id
    if client_id:
        query["client_id"] = client_id
    if assignee == "me":
        query["assignee_id"] = user["id"]
    elif assignee:
        query["assignee_id"] = assignee

    tasks = await db.tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return tasks


@router.post("", response_model=TaskOut)
async def create_task(payload: TaskIn, user=Depends(get_current_user)):
    from server import db

    task = payload.model_dump()
    if task.get("project_id") and not task.get("client_id"):
        proj = await db.projects.find_one({"id": task["project_id"]}, {"_id": 0, "client_id": 1})
        if proj and proj.get("client_id"):
            task["client_id"] = proj["client_id"]
    task.update({
        "id": str(uuid.uuid4()),
        "creator_id": user["id"],
        "assignee_id": task.get("assignee_id") or user["id"],
        "created_at": _now(),
        "updated_at": _now(),
    })
    await db.tasks.insert_one(task)
    task.pop("_id", None)
    return task


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: str, user=Depends(get_current_user)):
    from server import db

    t = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Task not found")
    return t


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(task_id: str, payload: TaskUpdate, user=Depends(get_current_user)):
    from server import db

    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if update.get("project_id") and "client_id" not in update:
        proj = await db.projects.find_one({"id": update["project_id"]}, {"_id": 0, "client_id": 1})
        if proj and proj.get("client_id"):
            update["client_id"] = proj["client_id"]
    update["updated_at"] = _now()
    res = await db.tasks.update_one({"id": task_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Task not found")
    t = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return t


@router.delete("/{task_id}")
async def delete_task(task_id: str, user=Depends(get_current_user)):
    from server import db

    res = await db.tasks.delete_one({"id": task_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Task not found")
    return {"ok": True}
