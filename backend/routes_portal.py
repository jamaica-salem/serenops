"""Public client portal and portal link management."""
import secrets
import uuid
from datetime import datetime, timezone, date
from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import get_current_user
from models import (
    PortalLinkIn,
    PortalLinkOut,
    PortalLinkUpdate,
    ContractOut,
    ProposalOut,
    InvoiceOut,
    PaymentOut,
    ClientOut,
    ProjectOut,
    TaskOut,
    TimelineEventOut,
)

router = APIRouter(tags=["portal"])


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


def _parse_dt(s: Optional[str]):
    if not s:
        return None
    try:
        return datetime.fromisoformat(s)
    except Exception:
        return None


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


async def _get_portal_link(db, token: str) -> dict:
    link = await db.portal_links.find_one({"token": token}, {"_id": 0})
    if not link or link.get("revoked"):
        raise HTTPException(404, "Portal link not found")
    expires_at = _parse_dt(link.get("expires_at"))
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(410, "Portal link expired")
    return link


def _check_scope(link: dict, *, contract_id: Optional[str] = None, proposal_id: Optional[str] = None, invoice_id: Optional[str] = None):
    if contract_id and link.get("contract_id") and link["contract_id"] != contract_id:
        raise HTTPException(403, "Contract not allowed for this portal link")
    if proposal_id and link.get("proposal_id") and link["proposal_id"] != proposal_id:
        raise HTTPException(403, "Proposal not allowed for this portal link")
    if invoice_id and link.get("invoice_id") and link["invoice_id"] != invoice_id:
        raise HTTPException(403, "Invoice not allowed for this portal link")


# ---------- Portal link management (authenticated) ----------
@router.get("/portal-links", response_model=List[PortalLinkOut])
async def list_portal_links(
    client_id: Optional[str] = None,
    contract_id: Optional[str] = None,
    proposal_id: Optional[str] = None,
    invoice_id: Optional[str] = None,
    user=Depends(get_current_user),
):
    from server import db

    q = {"owner_id": user["id"]}
    if client_id:
        q["client_id"] = client_id
    if contract_id:
        q["contract_id"] = contract_id
    if proposal_id:
        q["proposal_id"] = proposal_id
    if invoice_id:
        q["invoice_id"] = invoice_id
    return await db.portal_links.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)


@router.post("/portal-links", response_model=PortalLinkOut)
async def create_portal_link(payload: PortalLinkIn, user=Depends(get_current_user)):
    from server import db

    client = await db.clients.find_one({"id": payload.client_id}, {"_id": 1})
    if not client:
        raise HTTPException(404, "Client not found")

    if payload.contract_id:
        contract = await db.contracts.find_one({"id": payload.contract_id}, {"_id": 0, "client_id": 1})
        if not contract:
            raise HTTPException(404, "Contract not found")
        if contract.get("client_id") != payload.client_id:
            raise HTTPException(400, "Contract does not belong to the selected client")

    if payload.proposal_id:
        proposal = await db.proposals.find_one({"id": payload.proposal_id}, {"_id": 0, "client_id": 1})
        if not proposal:
            raise HTTPException(404, "Proposal not found")
        if proposal.get("client_id") != payload.client_id:
            raise HTTPException(400, "Proposal does not belong to the selected client")

    if payload.invoice_id:
        invoice = await db.invoices.find_one({"id": payload.invoice_id}, {"_id": 0, "client_id": 1})
        if not invoice:
            raise HTTPException(404, "Invoice not found")
        if invoice.get("client_id") != payload.client_id:
            raise HTTPException(400, "Invoice does not belong to the selected client")

    now = _now()
    doc = payload.model_dump()
    doc.update(
        {
            "id": str(uuid.uuid4()),
            "token": secrets.token_urlsafe(24),
            "revoked": False,
            "created_at": now,
            "owner_id": user["id"],
        }
    )
    await db.portal_links.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/portal-links/{link_id}", response_model=PortalLinkOut)
async def update_portal_link(link_id: str, payload: PortalLinkUpdate, user=Depends(get_current_user)):
    from server import db

    existing = await db.portal_links.find_one({"id": link_id, "owner_id": user["id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Portal link not found")

    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    next_doc = {**existing, **patch}
    await db.portal_links.update_one({"id": link_id}, {"$set": next_doc})
    return next_doc


# ---------- Public portal ----------
class PortalContractSignIn(BaseModel):
    signer_name: str = Field(min_length=1)
    signature_type: Optional[Literal["typed", "uploaded"]] = "typed"
    signature_value: Optional[str] = ""


class PortalProposalDecisionIn(BaseModel):
    status: Literal["approved", "rejected"]
    notes: Optional[str] = ""


class PortalInvoicePayIn(BaseModel):
    amount: float = Field(gt=0)
    payment_date: Optional[str] = None
    method: Optional[str] = "Bank Transfer"
    reference_number: Optional[str] = ""
    notes: Optional[str] = ""
    status: Optional[str] = "recorded"


class PortalFeedbackIn(BaseModel):
    message: str = Field(min_length=1)
    rating: Optional[int] = Field(default=None, ge=1, le=5)


@router.get("/portal/{token}")
async def get_portal_payload(token: str):
    from server import db

    link = await _get_portal_link(db, token)
    client = await db.clients.find_one({"id": link["client_id"]}, {"_id": 0})
    if not client:
        raise HTTPException(404, "Client not found")

    contract_q = {"client_id": link["client_id"]}
    if link.get("contract_id"):
        contract_q["id"] = link["contract_id"]
    proposal_q = {"client_id": link["client_id"]}
    if link.get("proposal_id"):
        proposal_q["id"] = link["proposal_id"]
    invoice_q = {"client_id": link["client_id"]}
    if link.get("invoice_id"):
        invoice_q["id"] = link["invoice_id"]

    contracts = await db.contracts.find(contract_q, {"_id": 0}).sort("created_at", -1).to_list(100)
    proposals = await db.proposals.find(proposal_q, {"_id": 0}).sort("created_at", -1).to_list(100)
    invoices = await db.invoices.find(invoice_q, {"_id": 0}).sort("created_at", -1).to_list(200)
    payments = await db.payments.find({"client_id": link["client_id"]}, {"_id": 0}).sort("payment_date", -1).to_list(200)
    projects = await db.projects.find({"client_id": link["client_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    tasks = await db.tasks.find({"client_id": link["client_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    timeline = await db.timeline_events.find({"client_id": link["client_id"]}, {"_id": 0}).sort("occurred_at", -1).to_list(200)

    return {
        "portal": link,
        "client": client,
        "contracts": contracts,
        "proposals": proposals,
        "invoices": invoices,
        "payments": payments,
        "projects": projects,
        "tasks": tasks,
        "timeline_events": timeline,
    }


@router.post("/portal/{token}/contracts/{contract_id}/sign", response_model=ContractOut)
async def sign_contract(token: str, contract_id: str, payload: PortalContractSignIn):
    from server import db

    link = await _get_portal_link(db, token)
    _check_scope(link, contract_id=contract_id)

    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(404, "Contract not found")
    if contract.get("client_id") != link["client_id"]:
        raise HTTPException(403, "Contract does not belong to portal client")

    signature_value = payload.signature_value or payload.signer_name
    now = _now()
    next_doc = {
        **contract,
        "status": "signed",
        "signed_by": payload.signer_name,
        "signed_at": now,
        "signature_type": payload.signature_type or "typed",
        "signature_value": signature_value,
        "updated_at": now,
    }
    await db.contracts.update_one({"id": contract_id}, {"$set": next_doc})

    await _add_timeline_event(
        db,
        client_id=next_doc["client_id"],
        owner_id=link["owner_id"],
        event_type="contract_signed",
        title=f"Contract signed: {next_doc['title']}",
        details=f"Signed by {payload.signer_name}",
    )

    return next_doc


@router.post("/portal/{token}/proposals/{proposal_id}/decision", response_model=ProposalOut)
async def decide_proposal(token: str, proposal_id: str, payload: PortalProposalDecisionIn):
    from server import db

    link = await _get_portal_link(db, token)
    _check_scope(link, proposal_id=proposal_id)

    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    if proposal.get("client_id") != link["client_id"]:
        raise HTTPException(403, "Proposal does not belong to portal client")

    notes = proposal.get("notes") or ""
    if payload.notes:
        notes = (notes + "\n" if notes else "") + f"Client note: {payload.notes}"

    next_doc = {**proposal, "status": payload.status, "notes": notes, "updated_at": _now()}
    await db.proposals.update_one({"id": proposal_id}, {"$set": next_doc})

    await _add_timeline_event(
        db,
        client_id=next_doc["client_id"],
        owner_id=link["owner_id"],
        event_type="manual",
        title=f"Proposal {payload.status}: {next_doc['project_title']}",
        details=payload.notes or "",
    )

    return next_doc


@router.post("/portal/{token}/invoices/{invoice_id}/pay", response_model=PaymentOut)
async def pay_invoice(token: str, invoice_id: str, payload: PortalInvoicePayIn):
    from server import db

    link = await _get_portal_link(db, token)
    _check_scope(link, invoice_id=invoice_id)

    inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if inv.get("client_id") != link["client_id"]:
        raise HTTPException(403, "Invoice does not belong to portal client")

    if float(payload.amount or 0) <= 0:
        raise HTTPException(400, "Payment amount must be greater than 0")

    new_amount_paid = round(float(inv.get("amount_paid") or 0) + float(payload.amount or 0), 2)
    inv["amount_paid"] = new_amount_paid
    inv["updated_at"] = _now()
    _compute_invoice_fields(inv)

    await db.invoices.update_one({"id": inv["id"]}, {"$set": inv})

    now = _now()
    pay = {
        "id": str(uuid.uuid4()),
        "client_id": link["client_id"],
        "invoice_id": invoice_id,
        "project_id": inv.get("project_id"),
        "payment_date": payload.payment_date or now[:10],
        "amount": float(payload.amount),
        "method": payload.method or "Bank Transfer",
        "reference_number": payload.reference_number or "",
        "notes": payload.notes or "",
        "status": payload.status or "recorded",
        "remaining_balance": inv["balance_due"],
        "created_at": now,
        "owner_id": link["owner_id"],
    }
    await db.payments.insert_one(pay)

    await _add_timeline_event(
        db,
        client_id=link["client_id"],
        owner_id=link["owner_id"],
        event_type="payment_received",
        title=f"Payment received for {inv['invoice_number']}",
        details=f"Amount: {payload.amount}. Remaining: {inv['balance_due']}",
        occurred_at=payload.payment_date,
    )

    return pay


@router.post("/portal/{token}/feedback")
async def portal_feedback(token: str, payload: PortalFeedbackIn):
    from server import db

    link = await _get_portal_link(db, token)
    if not link.get("allow_feedback", True):
        raise HTTPException(403, "Feedback is disabled for this portal link")

    rating_note = f"Rating: {payload.rating}" if payload.rating else ""
    details = payload.message
    if rating_note:
        details = f"{rating_note}\n{details}"

    await _add_timeline_event(
        db,
        client_id=link["client_id"],
        owner_id=link["owner_id"],
        event_type="client_feedback",
        title="Client feedback received",
        details=details,
    )

    return {"ok": True}
