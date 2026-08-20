"""Seed admin user, demo user, projects, tasks, meetings, clients, invoices, proposals, etc."""
import os
import uuid
from datetime import datetime, timezone, timedelta

from auth import hash_password, verify_password


def _iso(dt: datetime) -> str:
    return dt.isoformat()


async def seed_users(db):
    now = datetime.now(timezone.utc)

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@serenops.app")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    demo_email = os.environ.get("DEMO_USER_EMAIL", "demo@serenops.app")
    demo_password = os.environ.get("DEMO_USER_PASSWORD", "demo123")

    avatars = [
        "https://images.unsplash.com/photo-1758518729459-235dcaadc611?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdCUyMHNtaWxpbmclMjBmYWNlfGVufDB8fHx8MTc3NzQyNzEzMXww&ixlib=rb-4.1.0&q=85",
        "https://images.unsplash.com/photo-1651684215020-f7a5b6610f23?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdCUyMHNtaWxpbmclMjBmYWNlfGVufDB8fHx8MTc3NzQyNzEzMXww&ixlib=rb-4.1.0&q=85",
        "https://images.unsplash.com/photo-1770058428154-9eee8a6a1fbb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdCUyMHNtaWxpbmclMjBmYWNlfGVufDB8fHx8MTc3NzQyNzEzMXww&ixlib=rb-4.1.0&q=85",
        "https://images.pexels.com/photos/5308640/pexels-photo-5308640.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    ]

    async def upsert_user(email, password, name, role, avatar):
        existing = await db.users.find_one({"email": email})
        if not existing:
            user = {
                "id": str(uuid.uuid4()),
                "email": email,
                "name": name,
                "role": role,
                "avatar_url": avatar,
                "password_hash": hash_password(password),
                "created_at": _iso(now),
            }
            await db.users.insert_one(user)
            return user
        if not verify_password(password, existing.get("password_hash", "")):
            await db.users.update_one(
                {"email": email}, {"$set": {"password_hash": hash_password(password)}}
            )
        return existing

    admin = await upsert_user(admin_email, admin_password, "Alex Morgan", "admin", avatars[0])
    demo = await upsert_user(demo_email, demo_password, "Jamie Rivera", "user", avatars[1])

    if admin_email.endswith("@serenops.app"):
        await upsert_user("admin@panze.app", admin_password, "Alex Morgan", "admin", avatars[0])
    if demo_email.endswith("@serenops.app"):
        await upsert_user("demo@panze.app", demo_password, "Jamie Rivera", "user", avatars[1])

    teammates = [
        ("jacob.martinez@serenops.app", "Jacob Martinez", avatars[2]),
        ("luke.bell@serenops.app", "Luke Bell", avatars[3]),
        ("connor.mitchell@serenops.app", "Connor Mitchell", avatars[0]),
    ]
    teammate_users = []
    for email, name, av in teammates:
        u = await upsert_user(email, "team123", name, "user", av)
        teammate_users.append(u)

    return admin, demo, teammate_users


async def clear_sample_data(db):
    """Clear all sample data collections."""
    collections = [
        "clients",
        "projects",
        "tasks",
        "invoices",
        "proposals",
        "contracts",
        "payments",
        "revisions",
        "file_links",
        "handover_items",
        "onboarding_items",
        "maintenance_plans",
        "timeline_events",
        "meetings",
    ]
    counts = {}
    for col in collections:
        res = await db[col].delete_many({})
        counts[col] = res.deleted_count
    return counts


async def load_sample_data(db, owner_id: str):
    """Seed comprehensive sample data into database."""
    await clear_sample_data(db)

    now_dt = datetime.now(timezone.utc)
    now = _iso(now_dt)
    today = now_dt.date()

    # 1. Clients
    c1_id = str(uuid.uuid4())
    c2_id = str(uuid.uuid4())
    c3_id = str(uuid.uuid4())
    c4_id = str(uuid.uuid4())

    clients = [
        {
            "id": c1_id,
            "name": "Acme Studios",
            "company_name": "Acme Media Group",
            "email": "contact@acmestudios.com",
            "phone": "+1 (555) 234-5678",
            "status": "active",
            "source": "referral",
            "notes": "Key branding & website client",
            "owner_id": owner_id,
            "created_at": _iso(now_dt - timedelta(days=30)),
            "updated_at": now,
        },
        {
            "id": c2_id,
            "name": "Apex Digital",
            "company_name": "Apex Solutions Inc",
            "email": "hello@apexdigital.co",
            "phone": "+1 (555) 876-5432",
            "status": "active",
            "source": "website",
            "notes": "Mobile app companion project",
            "owner_id": owner_id,
            "created_at": _iso(now_dt - timedelta(days=20)),
            "updated_at": now,
        },
        {
            "id": c3_id,
            "name": "Nova Health",
            "company_name": "Nova Wellness Ltd",
            "email": "info@novahealth.org",
            "phone": "+1 (555) 345-6789",
            "status": "lead",
            "source": "inbound",
            "notes": "In discussion for internal analytics portal",
            "owner_id": owner_id,
            "created_at": _iso(now_dt - timedelta(days=10)),
            "updated_at": now,
        },
        {
            "id": c4_id,
            "name": "Pinnacle Tech",
            "company_name": "Pinnacle Systems",
            "email": "partners@pinnacle.io",
            "phone": "+1 (555) 901-2345",
            "status": "completed",
            "source": "linkedin",
            "notes": "DevOps & GitHub Sync project completed",
            "owner_id": owner_id,
            "created_at": _iso(now_dt - timedelta(days=60)),
            "updated_at": now,
        },
    ]
    await db.clients.insert_many(clients)

    # 2. Projects
    p1_id = str(uuid.uuid4())
    p2_id = str(uuid.uuid4())
    p3_id = str(uuid.uuid4())
    p4_id = str(uuid.uuid4())

    projects = [
        {
            "id": p1_id,
            "name": "BrightBridge Website",
            "description": "Marketing site refresh & CMS migration",
            "color": "#EA580C",
            "status": "in_progress",
            "client_id": c1_id,
            "owner_id": owner_id,
            "created_at": _iso(now_dt - timedelta(days=25)),
            "updated_at": now,
        },
        {
            "id": p2_id,
            "name": "9TDesign Mobile App",
            "description": "iOS & Android companion prototype",
            "color": "#3B82F6",
            "status": "in_progress",
            "client_id": c2_id,
            "owner_id": owner_id,
            "created_at": _iso(now_dt - timedelta(days=18)),
            "updated_at": now,
        },
        {
            "id": p3_id,
            "name": "Horizon Dashboard",
            "description": "Internal analytics & telemetry dashboard",
            "color": "#10B981",
            "status": "planning",
            "client_id": c3_id,
            "owner_id": owner_id,
            "created_at": _iso(now_dt - timedelta(days=8)),
            "updated_at": now,
        },
        {
            "id": p4_id,
            "name": "GitHub Sync Pipeline",
            "description": "Dev assets sync & automation",
            "color": "#8B5CF6",
            "status": "completed",
            "client_id": c4_id,
            "owner_id": owner_id,
            "created_at": _iso(now_dt - timedelta(days=55)),
            "updated_at": now,
        },
    ]
    await db.projects.insert_many(projects)

    # 3. Tasks
    tasks = [
        {
            "id": str(uuid.uuid4()),
            "title": "Design framer website with modern templates",
            "description": "BrightBridge marketing landing page design",
            "status": "in_progress",
            "priority": "high",
            "due_date": (today + timedelta(days=1)).isoformat(),
            "project_id": p1_id,
            "client_id": c1_id,
            "assignee_id": owner_id,
            "creator_id": owner_id,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Fix navbar overflow on mobile screens",
            "description": "Critical UI bug on small viewport sizes",
            "status": "in_progress",
            "priority": "urgent",
            "due_date": (today - timedelta(days=1)).isoformat(),
            "project_id": p1_id,
            "client_id": c1_id,
            "assignee_id": owner_id,
            "creator_id": owner_id,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Mobile App Prototype ready for testing",
            "description": "Prepare Figma prototype for user testing",
            "status": "todo",
            "priority": "high",
            "due_date": (today + timedelta(days=3)).isoformat(),
            "project_id": p2_id,
            "client_id": c2_id,
            "assignee_id": owner_id,
            "creator_id": owner_id,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Dashboard Design layout review",
            "description": "Finalize card grid and chart components",
            "status": "todo",
            "priority": "medium",
            "due_date": (today + timedelta(days=5)).isoformat(),
            "project_id": p3_id,
            "client_id": c3_id,
            "assignee_id": owner_id,
            "creator_id": owner_id,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": str(uuid.uuid4()),
            "title": "API contract for tasks endpoint",
            "description": "Document OpenAPI schema & REST routes",
            "status": "done",
            "priority": "medium",
            "due_date": (today - timedelta(days=4)).isoformat(),
            "project_id": p3_id,
            "client_id": c3_id,
            "assignee_id": owner_id,
            "creator_id": owner_id,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Launch checklist QA verification",
            "description": "Pre-launch cross browser check",
            "status": "done",
            "priority": "low",
            "due_date": (today - timedelta(days=10)).isoformat(),
            "project_id": p4_id,
            "client_id": c4_id,
            "assignee_id": owner_id,
            "creator_id": owner_id,
            "created_at": now,
            "updated_at": now,
        },
    ]
    await db.tasks.insert_many(tasks)

    # 4. Proposals
    prop1_id = str(uuid.uuid4())
    prop2_id = str(uuid.uuid4())
    proposals = [
        {
            "id": prop1_id,
            "client_id": c1_id,
            "project_title": "BrightBridge Website Redesign & Brand Refresh",
            "scope_of_work": "Complete UI/UX overhaul, responsive template development, CMS setup, and SEO optimization.",
            "deliverables": "Figma design system, React landing pages, CMS integration.",
            "pricing": "$12,500 USD",
            "status": "accepted",
            "sent_date": (today - timedelta(days=28)).isoformat(),
            "valid_until": (today + timedelta(days=14)).isoformat(),
            "notes": "Accepted by client on May 5th.",
            "created_at": now,
            "updated_at": now,
            "owner_id": owner_id,
        },
        {
            "id": prop2_id,
            "client_id": c2_id,
            "project_title": "Apex Companion Mobile App MVP",
            "scope_of_work": "Cross-platform mobile application prototype, user authentication, and backend API integration.",
            "deliverables": "iOS/Android app bundle, API specs, admin dashboard.",
            "pricing": "$18,000 USD",
            "status": "sent",
            "sent_date": (today - timedelta(days=12)).isoformat(),
            "valid_until": (today + timedelta(days=18)).isoformat(),
            "notes": "Sent to client team for review.",
            "created_at": now,
            "updated_at": now,
            "owner_id": owner_id,
        },
    ]
    await db.proposals.insert_many(proposals)

    # 5. Contracts
    contract1_id = str(uuid.uuid4())
    contracts = [
        {
            "id": contract1_id,
            "client_id": c1_id,
            "title": "Master Services Agreement - Acme Studios",
            "scope_of_work": "Design & development services for BrightBridge Website Refresh.",
            "payment_terms": "50% upfront deposit ($6,250), 50% upon project completion ($6,250).",
            "status": "signed",
            "effective_date": (today - timedelta(days=25)).isoformat(),
            "created_at": now,
            "updated_at": now,
            "owner_id": owner_id,
        }
    ]
    await db.contracts.insert_many(contracts)

    # 6. Invoices & Payments
    inv1_id = str(uuid.uuid4())
    inv2_id = str(uuid.uuid4())
    inv3_id = str(uuid.uuid4())

    inv1 = {
        "id": inv1_id,
        "invoice_number": "INV-2026-001",
        "client_id": c1_id,
        "project_id": p1_id,
        "issue_date": (today - timedelta(days=24)).isoformat(),
        "due_date": (today - timedelta(days=10)).isoformat(),
        "currency": "USD",
        "line_items": [{"description": "50% Upfront Deposit - Website Redesign", "quantity": 1, "rate": 6250.0}],
        "subtotal": 6250.0,
        "discount": 0.0,
        "tax_fees": 0.0,
        "total": 6250.0,
        "amount_paid": 6250.0,
        "balance_due": 0.0,
        "status": "paid",
        "notes": "Thank you for your business!",
        "created_at": now,
        "updated_at": now,
        "owner_id": owner_id,
    }

    inv2 = {
        "id": inv2_id,
        "invoice_number": "INV-2026-002",
        "client_id": c1_id,
        "project_id": p1_id,
        "issue_date": (today - timedelta(days=5)).isoformat(),
        "due_date": (today + timedelta(days=15)).isoformat(),
        "currency": "USD",
        "line_items": [{"description": "Final Milestone Payment - Website Delivery", "quantity": 1, "rate": 6250.0}],
        "subtotal": 6250.0,
        "discount": 0.0,
        "tax_fees": 0.0,
        "total": 6250.0,
        "amount_paid": 0.0,
        "balance_due": 6250.0,
        "status": "sent",
        "notes": "Due upon final launch.",
        "created_at": now,
        "updated_at": now,
        "owner_id": owner_id,
    }

    inv3 = {
        "id": inv3_id,
        "invoice_number": "INV-2026-003",
        "client_id": c2_id,
        "project_id": p2_id,
        "issue_date": (today - timedelta(days=35)).isoformat(),
        "due_date": (today - timedelta(days=5)).isoformat(),
        "currency": "USD",
        "line_items": [{"description": "Mobile App Prototype & Wireframes", "quantity": 1, "rate": 4500.0}],
        "subtotal": 4500.0,
        "discount": 0.0,
        "tax_fees": 0.0,
        "total": 4500.0,
        "amount_paid": 0.0,
        "balance_due": 4500.0,
        "status": "overdue",
        "notes": "Please process payment as soon as possible.",
        "created_at": now,
        "updated_at": now,
        "owner_id": owner_id,
    }
    await db.invoices.insert_many([inv1, inv2, inv3])

    payment1 = {
        "id": str(uuid.uuid4()),
        "client_id": c1_id,
        "invoice_id": inv1_id,
        "project_id": p1_id,
        "payment_date": (today - timedelta(days=20)).isoformat(),
        "amount": 6250.0,
        "method": "stripe",
        "reference_number": "ch_3N1xYZ2eZvKYlo2C",
        "notes": "Stripe online payment received",
        "status": "recorded",
        "remaining_balance": 0.0,
        "created_at": now,
        "owner_id": owner_id,
    }
    await db.payments.insert_one(payment1)

    # 7. Revisions
    revisions = [
        {
            "id": str(uuid.uuid4()),
            "client_id": c1_id,
            "project_id": p1_id,
            "request_title": "Hero CTA alignment & font weight update",
            "description": "Increase primary button size and adjust hero banner typography.",
            "status": "in_progress",
            "date_requested": (today - timedelta(days=2)).isoformat(),
            "created_at": now,
            "updated_at": now,
            "owner_id": owner_id,
        },
        {
            "id": str(uuid.uuid4()),
            "client_id": c2_id,
            "project_id": p2_id,
            "request_title": "Color scheme adjustments for dark mode on mobile",
            "description": "Ensure high contrast on dark mode background cards.",
            "status": "requested",
            "date_requested": (today - timedelta(days=1)).isoformat(),
            "created_at": now,
            "updated_at": now,
            "owner_id": owner_id,
        },
    ]
    await db.revisions.insert_many(revisions)

    # 8. Maintenance Plans
    maintenance = [
        {
            "id": str(uuid.uuid4()),
            "client_id": c4_id,
            "project_id": p4_id,
            "plan_name": "Standard Maintenance & Security SLA",
            "monthly_fee": 450.0,
            "start_date": (today - timedelta(days=40)).isoformat(),
            "status": "active",
            "notes": "Includes monthly server patch & backup verification.",
            "created_at": now,
            "updated_at": now,
            "owner_id": owner_id,
        }
    ]
    await db.maintenance_plans.insert_many(maintenance)

    # 9. Onboarding & Handover
    from routes_clients import _default_onboarding_items
    from routes_client_ops import _default_handover_items

    for cid in [c1_id, c2_id, c3_id, c4_id]:
        await db.onboarding_items.insert_many(_default_onboarding_items(cid))
        await db.handover_items.insert_many(_default_handover_items(cid))

    # 10. Meetings
    meetings = [
        {"id": str(uuid.uuid4()), "title": "BrightBridge Design Sync", "platform": "Google Meet", "starts_at": _iso(now_dt + timedelta(hours=3)), "project_id": p1_id},
        {"id": str(uuid.uuid4()), "title": "Apex Mobile App Demo", "platform": "Zoom", "starts_at": _iso(now_dt + timedelta(days=1, hours=4)), "project_id": p2_id},
    ]
    await db.meetings.insert_many(meetings)

    # 11. Timeline Events
    timeline_events = [
        {"id": str(uuid.uuid4()), "client_id": c1_id, "event_type": "client_created", "title": "Client onboarded: Acme Studios", "details": "Acme Media Group", "occurred_at": (today - timedelta(days=30)).isoformat(), "created_at": now, "owner_id": owner_id},
        {"id": str(uuid.uuid4()), "client_id": c1_id, "event_type": "contract_signed", "title": "Contract signed: Master Services Agreement", "details": "50% upfront deposit", "occurred_at": (today - timedelta(days=25)).isoformat(), "created_at": now, "owner_id": owner_id},
        {"id": str(uuid.uuid4()), "client_id": c1_id, "event_type": "payment_received", "title": "Payment received for INV-2026-001", "details": "$6,250.00 via Stripe", "occurred_at": (today - timedelta(days=20)).isoformat(), "created_at": now, "owner_id": owner_id},
    ]
    await db.timeline_events.insert_many(timeline_events)

    return {
        "clients": len(clients),
        "projects": len(projects),
        "tasks": len(tasks),
        "proposals": len(proposals),
        "contracts": len(contracts),
        "invoices": 3,
        "payments": 1,
        "revisions": len(revisions),
        "maintenance": len(maintenance),
    }


async def run_seed(db):
    admin, demo, teammates = await seed_users(db)
    if await db.projects.count_documents({}) == 0:
        await load_sample_data(db, demo["id"])
