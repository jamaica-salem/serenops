"""Client + onboarding routes."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from auth import get_current_user
from models import (
    ClientIn,
    ClientOut,
    ClientUpdate,
    OnboardingItemIn,
    OnboardingItemOut,
    OnboardingItemUpdate,
)

router = APIRouter(prefix="/clients", tags=["clients"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _default_onboarding_items(client_id: str):
    now = _now()
    defaults = [
        ("Confirm project goals", "project_goals"),
        ("Collect target audience details", "intake_questionnaire"),
        ("Confirm communication preferences", "communication"),
        ("Confirm client timezone", "communication"),
        ("Website admin access", "required_access"),
        ("Hosting access", "required_access"),
        ("Domain access", "required_access"),
        ("Google Drive access", "required_access"),
        ("Canva access", "required_access"),
        ("Meta Business Suite access", "required_access"),
        ("Gmail access", "required_access"),
        ("WordPress or Shopify access", "required_access"),
        ("Brand assets received", "brand_assets"),
        ("Tools/accounts needed list finalized", "tools_accounts"),
    ]
    return [
        {
            "id": str(uuid.uuid4()),
            "client_id": client_id,
            "title": title,
            "category": category,
            "notes": "",
            "completed": False,
            "created_at": now,
            "updated_at": now,
        }
        for title, category in defaults
    ]


@router.get("", response_model=List[ClientOut])
async def list_clients(
    user=Depends(get_current_user),
    status: Optional[str] = None,
    q: Optional[str] = Query(None, description="name/company/email search"),
):
    from server import db

    query = {}
    if status:
        query["status"] = status
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"company_name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    return await db.clients.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("", response_model=ClientOut)
async def create_client(payload: ClientIn, user=Depends(get_current_user)):
    from server import db

    now = _now()
    doc = payload.model_dump()
    doc.update(
        {
            "id": str(uuid.uuid4()),
            "owner_id": user["id"],
            "created_at": now,
            "updated_at": now,
        }
    )
    await db.clients.insert_one(doc)

    # Seed onboarding template for MVP to speed up ops setup per client.
    await db.onboarding_items.insert_many(_default_onboarding_items(doc["id"]))
    await db.timeline_events.insert_one(
        {
            "id": str(uuid.uuid4()),
            "client_id": doc["id"],
            "event_type": "client_created",
            "title": f"Client created: {doc['name']}",
            "details": doc.get("company_name") or "",
            "occurred_at": now,
            "created_at": now,
            "owner_id": user["id"],
        }
    )

    doc.pop("_id", None)
    return doc


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(client_id: str, user=Depends(get_current_user)):
    from server import db

    item = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Client not found")
    return item


@router.patch("/{client_id}", response_model=ClientOut)
async def update_client(client_id: str, payload: ClientUpdate, user=Depends(get_current_user)):
    from server import db

    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    patch["updated_at"] = _now()

    res = await db.clients.update_one({"id": client_id}, {"$set": patch})
    if res.matched_count == 0:
        raise HTTPException(404, "Client not found")

    updated = await db.clients.find_one({"id": client_id}, {"_id": 0})
    return updated


@router.delete("/{client_id}")
async def delete_client(client_id: str, user=Depends(get_current_user)):
    from server import db

    res = await db.clients.delete_one({"id": client_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Client not found")

    # Keep projects/tasks but detach client relation.
    await db.projects.update_many({"client_id": client_id}, {"$set": {"client_id": None}})
    await db.tasks.update_many({"client_id": client_id}, {"$set": {"client_id": None}})
    await db.onboarding_items.delete_many({"client_id": client_id})
    await db.invoices.delete_many({"client_id": client_id})
    await db.proposals.delete_many({"client_id": client_id})
    await db.contracts.delete_many({"client_id": client_id})
    await db.file_links.delete_many({"client_id": client_id})
    await db.payments.delete_many({"client_id": client_id})
    await db.revisions.delete_many({"client_id": client_id})
    await db.handover_items.delete_many({"client_id": client_id})
    await db.maintenance_plans.delete_many({"client_id": client_id})
    await db.timeline_events.delete_many({"client_id": client_id})
    return {"ok": True}


@router.get("/{client_id}/onboarding", response_model=List[OnboardingItemOut])
async def list_onboarding_items(client_id: str, user=Depends(get_current_user)):
    from server import db

    items = await db.onboarding_items.find({"client_id": client_id}, {"_id": 0}).sort("created_at", 1).to_list(300)
    return items


@router.post("/{client_id}/onboarding", response_model=OnboardingItemOut)
async def create_onboarding_item(client_id: str, payload: OnboardingItemIn, user=Depends(get_current_user)):
    from server import db

    client = await db.clients.find_one({"id": client_id}, {"_id": 1})
    if not client:
        raise HTTPException(404, "Client not found")

    now = _now()
    doc = payload.model_dump()
    doc.update(
        {
            "id": str(uuid.uuid4()),
            "client_id": client_id,
            "created_at": now,
            "updated_at": now,
        }
    )
    await db.onboarding_items.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/{client_id}/onboarding/{item_id}", response_model=OnboardingItemOut)
async def update_onboarding_item(
    client_id: str,
    item_id: str,
    payload: OnboardingItemUpdate,
    user=Depends(get_current_user),
):
    from server import db

    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    patch["updated_at"] = _now()

    res = await db.onboarding_items.update_one(
        {"id": item_id, "client_id": client_id},
        {"$set": patch},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Onboarding item not found")

    item = await db.onboarding_items.find_one({"id": item_id, "client_id": client_id}, {"_id": 0})
    return item


@router.delete("/{client_id}/onboarding/{item_id}")
async def delete_onboarding_item(client_id: str, item_id: str, user=Depends(get_current_user)):
    from server import db

    res = await db.onboarding_items.delete_one({"id": item_id, "client_id": client_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Onboarding item not found")
    return {"ok": True}


@router.get("/{client_id}/workspace-summary")
async def client_workspace_summary(client_id: str, user=Depends(get_current_user)):
    from server import db

    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(404, "Client not found")

    projects_count = await db.projects.count_documents({"client_id": client_id})
    open_tasks_count = await db.tasks.count_documents(
        {"client_id": client_id, "status": {"$nin": ["done"]}}
    )
    overdue_tasks_count = await db.tasks.count_documents(
        {
            "client_id": client_id,
            "status": {"$nin": ["done"]},
            "due_date": {"$lt": datetime.now(timezone.utc).date().isoformat()},
        }
    )
    onboarding_total = await db.onboarding_items.count_documents({"client_id": client_id})
    onboarding_done = await db.onboarding_items.count_documents(
        {"client_id": client_id, "completed": True}
    )
    pending_invoices = await db.invoices.count_documents(
        {"client_id": client_id, "status": {"$in": ["sent", "partially_paid", "overdue"]}}
    )
    pending_proposals = await db.proposals.count_documents(
        {"client_id": client_id, "status": {"$in": ["draft", "sent"]}}
    )
    pending_contracts = await db.contracts.count_documents(
        {"client_id": client_id, "status": {"$in": ["draft", "sent"]}}
    )
    revisions_pending = await db.revisions.count_documents(
        {"client_id": client_id, "status": {"$in": ["requested", "in_progress"]}}
    )
    handover_total = await db.handover_items.count_documents({"client_id": client_id})
    handover_done = await db.handover_items.count_documents({"client_id": client_id, "completed": True})
    maintenance_total = await db.maintenance_plans.count_documents({"client_id": client_id})
    maintenance_active = await db.maintenance_plans.count_documents(
        {"client_id": client_id, "status": "active"}
    )

    return {
        "client": client,
        "projects_count": projects_count,
        "open_tasks_count": open_tasks_count,
        "overdue_tasks_count": overdue_tasks_count,
        "onboarding_total": onboarding_total,
        "onboarding_done": onboarding_done,
        "pending_invoices": pending_invoices,
        "pending_proposals": pending_proposals,
        "pending_contracts": pending_contracts,
        "revisions_pending": revisions_pending,
        "handover_total": handover_total,
        "handover_done": handover_done,
        "maintenance_total": maintenance_total,
        "maintenance_active": maintenance_active,
    }
