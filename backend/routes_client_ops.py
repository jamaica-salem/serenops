"""Client operations routes: invoices, payments, contracts, revisions, handover, maintenance, timeline, templates."""
import uuid
from datetime import datetime, timezone, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from models import (
    ContractIn,
    ContractOut,
    ContractUpdate,
    FileLinkIn,
    FileLinkOut,
    FileLinkUpdate,
    HandoverItemIn,
    HandoverItemOut,
    HandoverItemUpdate,
    InvoiceIn,
    InvoiceOut,
    InvoiceUpdate,
    MaintenancePlanIn,
    MaintenancePlanOut,
    MaintenancePlanUpdate,
    PaymentIn,
    PaymentOut,
    ProposalIn,
    ProposalOut,
    ProposalUpdate,
    RevisionIn,
    RevisionOut,
    RevisionUpdate,
    TemplateIn,
    TemplateOut,
    TemplateUpdate,
    TimelineEventIn,
    TimelineEventOut,
)

router = APIRouter(tags=["client-ops"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _today() -> date:
    return datetime.now(timezone.utc).date()


def _parse_date(s: Optional[str]):
    if not s:
        return None
    try:
        return date.fromisoformat(s[:10])
    except Exception:
        return None


async def _add_timeline_event(db, *, client_id: str, owner_id: str, event_type: str, title: str, details: str = "", occurred_at: Optional[str] = None):
    now = _now()
    await db.timeline_events.insert_one(
        {
            "id": str(uuid.uuid4()),
            "client_id": client_id,
            "event_type": event_type,
            "title": title,
            "details": details,
            "occurred_at": occurred_at or now,
            "created_at": now,
            "owner_id": owner_id,
        }
    )


def _compute_invoice_fields(doc: dict):
    line_items = doc.get("line_items") or []
    subtotal = round(sum(float(i.get("quantity", 0)) * float(i.get("rate", 0)) for i in line_items), 2)
    discount = round(float(doc.get("discount") or 0), 2)
    tax_fees = round(float(doc.get("tax_fees") or 0), 2)
    amount_paid = round(float(doc.get("amount_paid") or 0), 2)
    total = round(max(0.0, subtotal - discount + tax_fees), 2)
    balance_due = round(max(0.0, total - amount_paid), 2)

    requested_status = doc.get("status") or "draft"
    status = requested_status
    if requested_status != "cancelled":
        due = _parse_date(doc.get("due_date"))
        if balance_due <= 0 and total > 0:
            status = "paid"
        elif amount_paid > 0 and balance_due > 0:
            status = "partially_paid"
        elif due and due < _today() and requested_status in ("draft", "sent", "overdue"):
            status = "overdue"
        elif requested_status not in ("draft", "sent", "overdue", "partially_paid", "paid"):
            status = "draft"

    doc["subtotal"] = subtotal
    doc["discount"] = discount
    doc["tax_fees"] = tax_fees
    doc["total"] = total
    doc["amount_paid"] = amount_paid
    doc["balance_due"] = balance_due
    doc["status"] = status


def _default_handover_items(client_id: str):
    now = _now()
    items = [
        "Final files delivered",
        "Website deployed",
        "Admin credentials transferred",
        "Training videos sent",
        "Final invoice paid",
        "Backup created",
        "Documentation sent",
        "Client approval received",
        "Testimonial requested",
        "Maintenance offered",
    ]
    return [
        {
            "id": str(uuid.uuid4()),
            "client_id": client_id,
            "title": item,
            "notes": "",
            "completed": False,
            "created_at": now,
            "updated_at": now,
        }
        for item in items
    ]


def _default_templates(owner_id: str):
    now = _now()
    rows = [
        (
            "Onboarding Checklist Template",
            "onboarding_checklist",
            "Confirm project goals\nCollect target audience details\nCollect website/admin access\nConfirm communication preferences",
        ),
        (
            "Website Project Checklist",
            "website_project_checklist",
            "Homepage wireframe approved\nCore pages drafted\nQA on mobile\nLaunch checklist completed",
        ),
        (
            "VA Client Checklist",
            "va_client_checklist",
            "Task SOP shared\nCalendar access provided\nReporting cadence agreed\nEscalation process documented",
        ),
        (
            "Proposal Template",
            "proposal_template",
            "Project title:\nScope of work:\nDeliverables:\nTimeline:\nPricing:\nPayment terms:\nRevision limits:",
        ),
        (
            "Contract Template",
            "contract_template",
            "Scope of work:\nDeliverables:\nPayment terms:\nTimeline:\nRevision policy:\nCancellation policy:\nConfidentiality clause:",
        ),
        (
            "Invoice Template",
            "invoice_template",
            "Line item:\nQuantity:\nRate:\nDiscount:\nTax/fees:\nPayment method:\nNotes:",
        ),
        (
            "Handover Checklist",
            "handover_checklist",
            "Final files delivered\nWebsite deployed\nAdmin credentials transferred\nDocumentation sent\nClient approval received",
        ),
        (
            "Maintenance Checklist",
            "maintenance_checklist",
            "Monthly backup completed\nPlugin/theme updates applied\nPerformance check done\nSecurity scan completed",
        ),
    ]
    return [
        {
            "id": str(uuid.uuid4()),
            "name": name,
            "template_type": ttype,
            "content": content,
            "is_default": True,
            "created_at": now,
            "updated_at": now,
            "owner_id": owner_id,
        }
        for name, ttype, content in rows
    ]


# ---------- Invoices ----------
@router.get("/invoices", response_model=List[InvoiceOut])
async def list_invoices(client_id: Optional[str] = None, user=Depends(get_current_user)):
    from server import db

    q = {}
    if client_id:
        q["client_id"] = client_id
    return await db.invoices.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("/invoices", response_model=InvoiceOut)
async def create_invoice(payload: InvoiceIn, user=Depends(get_current_user)):
    from server import db

    client = await db.clients.find_one({"id": payload.client_id}, {"_id": 1})
    if not client:
        raise HTTPException(404, "Client not found")

    now = _now()
    doc = payload.model_dump()
    doc.update(
        {
            "id": str(uuid.uuid4()),
            "created_at": now,
            "updated_at": now,
            "owner_id": user["id"],
        }
    )
    _compute_invoice_fields(doc)
    await db.invoices.insert_one(doc)

    if doc["status"] in ("sent", "overdue"):
        await _add_timeline_event(
            db,
            client_id=doc["client_id"],
            owner_id=user["id"],
            event_type="invoice_sent",
            title=f"Invoice {doc['invoice_number']} sent",
            details=f"Total: {doc['total']}",
        )

    doc.pop("_id", None)
    return doc


@router.patch("/invoices/{invoice_id}", response_model=InvoiceOut)
async def update_invoice(invoice_id: str, payload: InvoiceUpdate, user=Depends(get_current_user)):
    from server import db

    existing = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Invoice not found")

    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    next_doc = {**existing, **patch, "updated_at": _now()}
    _compute_invoice_fields(next_doc)

    await db.invoices.update_one({"id": invoice_id}, {"$set": next_doc})

    if existing.get("status") != next_doc.get("status") and next_doc.get("status") in ("sent", "overdue"):
        await _add_timeline_event(
            db,
            client_id=next_doc["client_id"],
            owner_id=user["id"],
            event_type="invoice_sent",
            title=f"Invoice {next_doc['invoice_number']} updated to {next_doc['status']}",
            details=f"Balance due: {next_doc['balance_due']}",
        )

    return next_doc


@router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, user=Depends(get_current_user)):
    from server import db

    res = await db.invoices.delete_one({"id": invoice_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Invoice not found")
    await db.payments.delete_many({"invoice_id": invoice_id})
    return {"ok": True}


# ---------- Proposals ----------
@router.get("/proposals", response_model=List[ProposalOut])
async def list_proposals(client_id: Optional[str] = None, user=Depends(get_current_user)):
    from server import db

    q = {}
    if client_id:
        q["client_id"] = client_id
    return await db.proposals.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("/proposals", response_model=ProposalOut)
async def create_proposal(payload: ProposalIn, user=Depends(get_current_user)):
    from server import db

    client = await db.clients.find_one({"id": payload.client_id}, {"_id": 1})
    if not client:
        raise HTTPException(404, "Client not found")

    now = _now()
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_at": now, "updated_at": now, "owner_id": user["id"]})
    await db.proposals.insert_one(doc)

    if doc.get("status") == "sent":
        await _add_timeline_event(
            db,
            client_id=doc["client_id"],
            owner_id=user["id"],
            event_type="proposal_sent",
            title=f"Proposal sent: {doc['project_title']}",
            details=doc.get("pricing") or "",
        )

    doc.pop("_id", None)
    return doc


@router.patch("/proposals/{proposal_id}", response_model=ProposalOut)
async def update_proposal(proposal_id: str, payload: ProposalUpdate, user=Depends(get_current_user)):
    from server import db

    existing = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Proposal not found")

    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    next_doc = {**existing, **patch, "updated_at": _now()}
    await db.proposals.update_one({"id": proposal_id}, {"$set": next_doc})

    if existing.get("status") != next_doc.get("status") and next_doc.get("status") == "sent":
        await _add_timeline_event(
            db,
            client_id=next_doc["client_id"],
            owner_id=user["id"],
            event_type="proposal_sent",
            title=f"Proposal sent: {next_doc['project_title']}",
            details=next_doc.get("pricing") or "",
        )

    return next_doc


@router.delete("/proposals/{proposal_id}")
async def delete_proposal(proposal_id: str, user=Depends(get_current_user)):
    from server import db

    res = await db.proposals.delete_one({"id": proposal_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Proposal not found")
    return {"ok": True}


# ---------- Payments ----------
@router.get("/payments", response_model=List[PaymentOut])
async def list_payments(client_id: Optional[str] = None, user=Depends(get_current_user)):
    from server import db

    q = {}
    if client_id:
        q["client_id"] = client_id
    return await db.payments.find(q, {"_id": 0}).sort("payment_date", -1).to_list(500)


@router.post("/payments", response_model=PaymentOut)
async def create_payment(payload: PaymentIn, user=Depends(get_current_user)):
    from server import db

    if float(payload.amount or 0) <= 0:
        raise HTTPException(400, "Payment amount must be greater than 0")

    inv = await db.invoices.find_one({"id": payload.invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if inv["client_id"] != payload.client_id:
        raise HTTPException(400, "Invoice does not belong to the selected client")

    new_amount_paid = round(float(inv.get("amount_paid") or 0) + float(payload.amount or 0), 2)
    inv["amount_paid"] = new_amount_paid
    inv["updated_at"] = _now()
    _compute_invoice_fields(inv)

    await db.invoices.update_one({"id": inv["id"]}, {"$set": inv})

    now = _now()
    pay = payload.model_dump()
    pay.update(
        {
            "id": str(uuid.uuid4()),
            "remaining_balance": inv["balance_due"],
            "created_at": now,
            "owner_id": user["id"],
        }
    )
    await db.payments.insert_one(pay)

    await _add_timeline_event(
        db,
        client_id=payload.client_id,
        owner_id=user["id"],
        event_type="payment_received",
        title=f"Payment received for {inv['invoice_number']}",
        details=f"Amount: {payload.amount}. Remaining: {inv['balance_due']}",
        occurred_at=payload.payment_date,
    )

    return pay


# ---------- Contracts ----------
@router.get("/contracts", response_model=List[ContractOut])
async def list_contracts(client_id: Optional[str] = None, user=Depends(get_current_user)):
    from server import db

    q = {}
    if client_id:
        q["client_id"] = client_id
    return await db.contracts.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("/contracts", response_model=ContractOut)
async def create_contract(payload: ContractIn, user=Depends(get_current_user)):
    from server import db

    client = await db.clients.find_one({"id": payload.client_id}, {"_id": 1})
    if not client:
        raise HTTPException(404, "Client not found")

    now = _now()
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_at": now, "updated_at": now, "owner_id": user["id"]})
    await db.contracts.insert_one(doc)

    if doc["status"] in ("sent", "signed"):
        await _add_timeline_event(
            db,
            client_id=doc["client_id"],
            owner_id=user["id"],
            event_type="contract_signed" if doc["status"] == "signed" else "manual",
            title=f"Contract {doc['status']}: {doc['title']}",
            details=doc.get("payment_terms") or "",
        )

    doc.pop("_id", None)
    return doc


@router.patch("/contracts/{contract_id}", response_model=ContractOut)
async def update_contract(contract_id: str, payload: ContractUpdate, user=Depends(get_current_user)):
    from server import db

    existing = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Contract not found")

    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    next_doc = {**existing, **patch, "updated_at": _now()}
    await db.contracts.update_one({"id": contract_id}, {"$set": next_doc})

    if existing.get("status") != next_doc.get("status") and next_doc.get("status") == "signed":
        await _add_timeline_event(
            db,
            client_id=next_doc["client_id"],
            owner_id=user["id"],
            event_type="contract_signed",
            title=f"Contract signed: {next_doc['title']}",
            details=next_doc.get("scope_of_work") or "",
        )

    return next_doc


@router.delete("/contracts/{contract_id}")
async def delete_contract(contract_id: str, user=Depends(get_current_user)):
    from server import db

    res = await db.contracts.delete_one({"id": contract_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Contract not found")
    return {"ok": True}


# ---------- Revisions ----------
@router.get("/revisions", response_model=List[RevisionOut])
async def list_revisions(client_id: Optional[str] = None, project_id: Optional[str] = None, user=Depends(get_current_user)):
    from server import db

    q = {}
    if client_id:
        q["client_id"] = client_id
    if project_id:
        q["project_id"] = project_id
    return await db.revisions.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("/revisions", response_model=RevisionOut)
async def create_revision(payload: RevisionIn, user=Depends(get_current_user)):
    from server import db

    client = await db.clients.find_one({"id": payload.client_id}, {"_id": 1})
    if not client:
        raise HTTPException(404, "Client not found")

    now = _now()
    doc = payload.model_dump()
    doc.update(
        {
            "id": str(uuid.uuid4()),
            "date_requested": doc.get("date_requested") or now[:10],
            "created_at": now,
            "updated_at": now,
            "owner_id": user["id"],
        }
    )
    await db.revisions.insert_one(doc)

    await _add_timeline_event(
        db,
        client_id=doc["client_id"],
        owner_id=user["id"],
        event_type="revision_requested",
        title=f"Revision requested: {doc['request_title']}",
        details=doc.get("description") or "",
        occurred_at=doc.get("date_requested"),
    )

    doc.pop("_id", None)
    return doc


@router.patch("/revisions/{revision_id}", response_model=RevisionOut)
async def update_revision(revision_id: str, payload: RevisionUpdate, user=Depends(get_current_user)):
    from server import db

    existing = await db.revisions.find_one({"id": revision_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Revision not found")

    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    next_doc = {**existing, **patch, "updated_at": _now()}
    await db.revisions.update_one({"id": revision_id}, {"$set": next_doc})

    if existing.get("status") != next_doc.get("status") and next_doc.get("status") in ("done", "approved"):
        await _add_timeline_event(
            db,
            client_id=next_doc["client_id"],
            owner_id=user["id"],
            event_type="revision_completed",
            title=f"Revision completed: {next_doc['request_title']}",
            details=next_doc.get("status"),
            occurred_at=next_doc.get("date_completed") or _now(),
        )

    return next_doc


@router.delete("/revisions/{revision_id}")
async def delete_revision(revision_id: str, user=Depends(get_current_user)):
    from server import db

    res = await db.revisions.delete_one({"id": revision_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Revision not found")
    return {"ok": True}


# ---------- Handover ----------
@router.get("/clients/{client_id}/handover", response_model=List[HandoverItemOut])
async def list_handover_items(client_id: str, user=Depends(get_current_user)):
    from server import db

    client = await db.clients.find_one({"id": client_id}, {"_id": 1})
    if not client:
        raise HTTPException(404, "Client not found")

    items = await db.handover_items.find({"client_id": client_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
    if not items:
        defaults = _default_handover_items(client_id)
        await db.handover_items.insert_many(defaults)
        return defaults
    return items


@router.post("/clients/{client_id}/handover", response_model=HandoverItemOut)
async def create_handover_item(client_id: str, payload: HandoverItemIn, user=Depends(get_current_user)):
    from server import db

    client = await db.clients.find_one({"id": client_id}, {"_id": 1})
    if not client:
        raise HTTPException(404, "Client not found")

    now = _now()
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "client_id": client_id, "created_at": now, "updated_at": now})
    await db.handover_items.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/clients/{client_id}/handover/{item_id}", response_model=HandoverItemOut)
async def update_handover_item(client_id: str, item_id: str, payload: HandoverItemUpdate, user=Depends(get_current_user)):
    from server import db

    existing = await db.handover_items.find_one({"id": item_id, "client_id": client_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Handover item not found")

    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    next_doc = {**existing, **patch, "updated_at": _now()}
    await db.handover_items.update_one({"id": item_id, "client_id": client_id}, {"$set": next_doc})

    if not existing.get("completed") and next_doc.get("completed"):
        await _add_timeline_event(
            db,
            client_id=client_id,
            owner_id=user["id"],
            event_type="project_handover",
            title=f"Handover item completed: {next_doc['title']}",
            details=next_doc.get("notes") or "",
        )

    return next_doc


@router.delete("/clients/{client_id}/handover/{item_id}")
async def delete_handover_item(client_id: str, item_id: str, user=Depends(get_current_user)):
    from server import db

    res = await db.handover_items.delete_one({"id": item_id, "client_id": client_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Handover item not found")
    return {"ok": True}


# ---------- Maintenance ----------
@router.get("/maintenance-plans", response_model=List[MaintenancePlanOut])
async def list_maintenance_plans(
    client_id: Optional[str] = None,
    project_id: Optional[str] = None,
    user=Depends(get_current_user),
):
    from server import db

    q = {}
    if client_id:
        q["client_id"] = client_id
    if project_id:
        q["project_id"] = project_id
    return await db.maintenance_plans.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("/maintenance-plans", response_model=MaintenancePlanOut)
async def create_maintenance_plan(payload: MaintenancePlanIn, user=Depends(get_current_user)):
    from server import db

    client = await db.clients.find_one({"id": payload.client_id}, {"_id": 1})
    if not client:
        raise HTTPException(404, "Client not found")

    if payload.project_id:
        project = await db.projects.find_one({"id": payload.project_id}, {"_id": 0, "client_id": 1})
        if not project:
            raise HTTPException(404, "Project not found")
        if project.get("client_id") != payload.client_id:
            raise HTTPException(400, "Project does not belong to the selected client")

    now = _now()
    doc = payload.model_dump()
    doc.update(
        {"id": str(uuid.uuid4()), "created_at": now, "updated_at": now, "owner_id": user["id"]}
    )
    await db.maintenance_plans.insert_one(doc)

    if doc.get("status") == "active":
        await _add_timeline_event(
            db,
            client_id=doc["client_id"],
            owner_id=user["id"],
            event_type="maintenance_started",
            title=f"Maintenance started: {doc['plan_name']}",
            details=doc.get("notes") or "",
            occurred_at=doc.get("start_date") or now,
        )

    doc.pop("_id", None)
    return doc


@router.patch("/maintenance-plans/{plan_id}", response_model=MaintenancePlanOut)
async def update_maintenance_plan(plan_id: str, payload: MaintenancePlanUpdate, user=Depends(get_current_user)):
    from server import db

    existing = await db.maintenance_plans.find_one({"id": plan_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Maintenance plan not found")

    patch = {k: v for k, v in payload.model_dump().items() if v is not None}

    if patch.get("project_id"):
        project = await db.projects.find_one({"id": patch["project_id"]}, {"_id": 0, "client_id": 1})
        if not project:
            raise HTTPException(404, "Project not found")
        if project.get("client_id") != existing.get("client_id"):
            raise HTTPException(400, "Project does not belong to the selected client")

    next_doc = {**existing, **patch, "updated_at": _now()}
    await db.maintenance_plans.update_one({"id": plan_id}, {"$set": next_doc})

    if existing.get("status") != next_doc.get("status") and next_doc.get("status") == "active":
        await _add_timeline_event(
            db,
            client_id=next_doc["client_id"],
            owner_id=user["id"],
            event_type="maintenance_started",
            title=f"Maintenance activated: {next_doc['plan_name']}",
            details=next_doc.get("notes") or "",
        )

    return next_doc


@router.delete("/maintenance-plans/{plan_id}")
async def delete_maintenance_plan(plan_id: str, user=Depends(get_current_user)):
    from server import db

    res = await db.maintenance_plans.delete_one({"id": plan_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Maintenance plan not found")
    return {"ok": True}


# ---------- Files & Links ----------
@router.get("/file-links", response_model=List[FileLinkOut])
async def list_file_links(client_id: Optional[str] = None, project_id: Optional[str] = None, user=Depends(get_current_user)):
    from server import db

    q = {}
    if client_id:
        q["client_id"] = client_id
    if project_id:
        q["project_id"] = project_id
    return await db.file_links.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("/file-links", response_model=FileLinkOut)
async def create_file_link(payload: FileLinkIn, user=Depends(get_current_user)):
    from server import db

    client = await db.clients.find_one({"id": payload.client_id}, {"_id": 1})
    if not client:
        raise HTTPException(404, "Client not found")

    if payload.project_id:
        project = await db.projects.find_one({"id": payload.project_id}, {"_id": 0, "client_id": 1})
        if not project:
            raise HTTPException(404, "Project not found")
        if project.get("client_id") != payload.client_id:
            raise HTTPException(400, "Project does not belong to the selected client")

    now = _now()
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_at": now, "updated_at": now, "owner_id": user["id"]})
    await db.file_links.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/file-links/{file_link_id}", response_model=FileLinkOut)
async def update_file_link(file_link_id: str, payload: FileLinkUpdate, user=Depends(get_current_user)):
    from server import db

    existing = await db.file_links.find_one({"id": file_link_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "File link not found")

    patch = {k: v for k, v in payload.model_dump().items() if v is not None}

    if patch.get("project_id"):
        project = await db.projects.find_one({"id": patch["project_id"]}, {"_id": 0, "client_id": 1})
        if not project:
            raise HTTPException(404, "Project not found")
        if project.get("client_id") != existing.get("client_id"):
            raise HTTPException(400, "Project does not belong to the file link client")

    next_doc = {**existing, **patch, "updated_at": _now()}
    await db.file_links.update_one({"id": file_link_id}, {"$set": next_doc})
    return next_doc


@router.delete("/file-links/{file_link_id}")
async def delete_file_link(file_link_id: str, user=Depends(get_current_user)):
    from server import db

    res = await db.file_links.delete_one({"id": file_link_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "File link not found")
    return {"ok": True}


# ---------- Timeline ----------
@router.get("/timeline-events", response_model=List[TimelineEventOut])
async def list_timeline_events(client_id: Optional[str] = None, user=Depends(get_current_user)):
    from server import db

    q = {}
    if client_id:
        q["client_id"] = client_id
    return await db.timeline_events.find(q, {"_id": 0}).sort("occurred_at", -1).to_list(500)


@router.post("/timeline-events", response_model=TimelineEventOut)
async def create_timeline_event(payload: TimelineEventIn, user=Depends(get_current_user)):
    from server import db

    client = await db.clients.find_one({"id": payload.client_id}, {"_id": 1})
    if not client:
        raise HTTPException(404, "Client not found")

    now = _now()
    doc = payload.model_dump()
    doc.update(
        {
            "id": str(uuid.uuid4()),
            "occurred_at": doc.get("occurred_at") or now,
            "created_at": now,
            "owner_id": user["id"],
        }
    )
    await db.timeline_events.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---------- Templates ----------
@router.get("/templates", response_model=List[TemplateOut])
async def list_templates(template_type: Optional[str] = None, user=Depends(get_current_user)):
    from server import db

    q = {}
    if template_type:
        q["template_type"] = template_type

    items = await db.templates.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    if items or template_type:
        return items

    defaults = _default_templates(user["id"])
    await db.templates.insert_many(defaults)
    return defaults


@router.post("/templates", response_model=TemplateOut)
async def create_template(payload: TemplateIn, user=Depends(get_current_user)):
    from server import db

    now = _now()
    doc = payload.model_dump()
    doc.update(
        {"id": str(uuid.uuid4()), "created_at": now, "updated_at": now, "owner_id": user["id"]}
    )
    await db.templates.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/templates/{template_id}", response_model=TemplateOut)
async def update_template(template_id: str, payload: TemplateUpdate, user=Depends(get_current_user)):
    from server import db

    existing = await db.templates.find_one({"id": template_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Template not found")

    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    next_doc = {**existing, **patch, "updated_at": _now()}
    await db.templates.update_one({"id": template_id}, {"$set": next_doc})
    return next_doc


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, user=Depends(get_current_user)):
    from server import db

    res = await db.templates.delete_one({"id": template_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Template not found")
    return {"ok": True}
