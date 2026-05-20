"""Dashboard summary + meetings + open tickets."""
from datetime import datetime, timezone, date
from typing import List

from fastapi import APIRouter, Depends

from auth import get_current_user
from models import DashboardSummary, MeetingOut

router = APIRouter(tags=["dashboard"])


def _parse_date(s):
    if not s:
        return None
    try:
        return date.fromisoformat(s[:10])
    except Exception:
        return None


@router.get("/dashboard/summary", response_model=DashboardSummary)
async def dashboard_summary(user=Depends(get_current_user)):
    from server import db

    tasks = await db.tasks.find({}, {"_id": 0}).to_list(1000)
    clients = await db.clients.find({}, {"_id": 0}).to_list(1000)
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(1000)
    proposals = await db.proposals.find({}, {"_id": 0}).to_list(1000)
    contracts = await db.contracts.find({}, {"_id": 0}).to_list(1000)
    revisions = await db.revisions.find({}, {"_id": 0}).to_list(1000)
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    today = datetime.now(timezone.utc).date()

    counts = {"in_progress": 0, "done": 0, "todo": 0, "backlog": 0, "overdue": 0}
    for t in tasks:
        s = t.get("status", "todo")
        if s in counts:
            counts[s] += 1
        d = _parse_date(t.get("due_date"))
        if d and d < today and s != "done":
            counts["overdue"] += 1

    insights = []
    my_tasks = [t for t in tasks if t.get("assignee_id") == user["id"]]
    my_overdue = sum(
        1 for t in my_tasks
        if _parse_date(t.get("due_date")) and _parse_date(t["due_date"]) < today and t.get("status") != "done"
    )
    my_in_progress = sum(1 for t in my_tasks if t.get("status") == "in_progress")
    my_due_today = sum(
        1 for t in my_tasks
        if _parse_date(t.get("due_date")) == today and t.get("status") != "done"
    )

    if my_overdue:
        insights.append(f"You have {my_overdue} overdue task{'s' if my_overdue != 1 else ''}.")
    if my_in_progress >= 3:
        insights.append(f"You're juggling {my_in_progress} tasks in progress — consider focusing on top 2.")
    if my_due_today:
        insights.append(f"{my_due_today} task{'s' if my_due_today != 1 else ''} due today.")
    if not insights:
        insights.append("All clear! No urgent attention needed today.")
    if counts["backlog"] > 5:
        insights.append(f"Backlog growing: {counts['backlog']} items waiting.")

    active_clients = sum(1 for c in clients if c.get("status") in ("active", "onboarding", "waiting_for_client", "maintenance"))
    leads = sum(1 for c in clients if c.get("status") == "lead")
    pending_proposals = sum(1 for p in proposals if p.get("status") in ("draft", "sent"))
    pending_invoices = sum(1 for i in invoices if i.get("status") in ("sent", "partially_paid", "overdue"))
    pending_contracts = sum(1 for c in contracts if c.get("status") in ("draft", "sent"))
    projects_in_progress = sum(1 for p in projects if p.get("status") == "in_progress")
    revisions_pending = sum(1 for r in revisions if r.get("status") in ("requested", "in_progress"))
    payments_due = sum(1 for i in invoices if float(i.get("balance_due") or 0) > 0 and i.get("status") != "cancelled")

    upcoming_task_deadlines = sum(
        1 for t in tasks
        if _parse_date(t.get("due_date")) and 0 <= (_parse_date(t.get("due_date")) - today).days <= 7 and t.get("status") != "done"
    )
    upcoming_invoice_deadlines = sum(
        1 for i in invoices
        if _parse_date(i.get("due_date")) and 0 <= (_parse_date(i.get("due_date")) - today).days <= 7 and i.get("status") in ("sent", "partially_paid", "overdue")
    )
    upcoming_deadlines = upcoming_task_deadlines + upcoming_invoice_deadlines

    clients_needing_follow_up = 0
    for c in clients:
        if c.get("status") not in ("lead", "active", "onboarding", "waiting_for_client", "maintenance"):
            continue
        last_contacted = _parse_date(c.get("last_contacted_at")) or _parse_date(c.get("created_at"))
        if last_contacted and (today - last_contacted).days >= 14:
            clients_needing_follow_up += 1

    return DashboardSummary(
        total_tasks=len(tasks),
        overdue=counts["overdue"],
        in_progress=counts["in_progress"],
        completed=counts["done"],
        backlog=counts["backlog"],
        not_started=counts["todo"],
        total_clients=len(clients),
        active_clients=active_clients,
        leads=leads,
        pending_proposals=pending_proposals,
        pending_invoices=pending_invoices,
        pending_contracts=pending_contracts,
        projects_in_progress=projects_in_progress,
        revisions_pending=revisions_pending,
        payments_due=payments_due,
        upcoming_deadlines=upcoming_deadlines,
        clients_needing_follow_up=clients_needing_follow_up,
        ai_insights=insights[:4],
    )


@router.get("/meetings", response_model=List[MeetingOut])
async def list_meetings(user=Depends(get_current_user)):
    from server import db
    items = await db.meetings.find({}, {"_id": 0}).sort("starts_at", 1).to_list(50)
    return items
