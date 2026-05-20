"""Project routes."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from models import ProjectIn, ProjectOut, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=List[ProjectOut])
async def list_projects(client_id: Optional[str] = None, user=Depends(get_current_user)):
    from server import db
    query = {}
    if client_id:
        query["client_id"] = client_id
    return await db.projects.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("", response_model=ProjectOut)
async def create_project(payload: ProjectIn, user=Depends(get_current_user)):
    from server import db
    proj = payload.model_dump()
    proj.update({
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.projects.insert_one(proj)
    proj.pop("_id", None)
    return proj


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(project_id: str, payload: ProjectUpdate, user=Depends(get_current_user)):
    from server import db
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        item = await db.projects.find_one({"id": project_id}, {"_id": 0})
        if not item:
            raise HTTPException(404, "Project not found")
        return item
    res = await db.projects.update_one({"id": project_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Project not found")
    item = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return item


@router.delete("/{project_id}")
async def delete_project(project_id: str, user=Depends(get_current_user)):
    from server import db
    res = await db.projects.delete_one({"id": project_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Project not found")
    await db.tasks.update_many({"project_id": project_id}, {"$set": {"project_id": None}})
    await db.file_links.update_many({"project_id": project_id}, {"$set": {"project_id": None}})
    await db.revisions.update_many({"project_id": project_id}, {"$set": {"project_id": None}})
    return {"ok": True}
