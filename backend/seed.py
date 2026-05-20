"""Seed admin user, demo user, projects, tasks, meetings on startup."""
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
        # rotate password if changed in env
        if not verify_password(password, existing.get("password_hash", "")):
            await db.users.update_one(
                {"email": email}, {"$set": {"password_hash": hash_password(password)}}
            )
        return existing

    admin = await upsert_user(admin_email, admin_password, "Alex Morgan", "admin", avatars[0])
    demo = await upsert_user(demo_email, demo_password, "Jamie Rivera", "user", avatars[1])

    # Backward-compatibility: keep legacy Panze demo/admin accounts available.
    if admin_email.endswith("@serenops.app"):
        await upsert_user("admin@panze.app", admin_password, "Alex Morgan", "admin", avatars[0])
    if demo_email.endswith("@serenops.app"):
        await upsert_user("demo@panze.app", demo_password, "Jamie Rivera", "user", avatars[1])

    # Extra teammates for assignees / tickets
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


async def seed_projects(db, owner_id):
    if await db.projects.count_documents({}) > 0:
        return
    now = _iso(datetime.now(timezone.utc))
    projects = [
        {"id": str(uuid.uuid4()), "name": "BrightBridge Website", "description": "Marketing site refresh", "color": "#EA580C", "owner_id": owner_id, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "9TDesign Mobile App", "description": "iOS / Android prototype", "color": "#3B82F6", "owner_id": owner_id, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Horizon Dashboard", "description": "Internal analytics dashboard", "color": "#10B981", "owner_id": owner_id, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "GitHub Sync", "description": "Dev files & images sync pipeline", "color": "#8B5CF6", "owner_id": owner_id, "created_at": now},
    ]
    await db.projects.insert_many(projects)


async def seed_tasks(db, demo_id, teammates):
    if await db.tasks.count_documents({}) > 0:
        return
    projects = await db.projects.find({}, {"_id": 0}).to_list(20)
    proj = {p["name"]: p["id"] for p in projects}

    today = datetime.now(timezone.utc)
    members = [demo_id] + [t["id"] for t in teammates]

    def t(title, desc, status, prio, days_offset, pname, assignee):
        due = (today + timedelta(days=days_offset)).date().isoformat()
        return {
            "id": str(uuid.uuid4()),
            "title": title,
            "description": desc,
            "status": status,
            "priority": prio,
            "due_date": due,
            "project_id": proj.get(pname),
            "assignee_id": assignee,
            "creator_id": demo_id,
            "created_at": _iso(today),
            "updated_at": _iso(today),
        }

    tasks = [
        t("Design framer website with modern templates", "BrightBridge marketing landing", "in_progress", "high", 0, "BrightBridge Website", demo_id),
        t("Upload Dev Files & Images to GitHub", "Collaborate with developers on the SaaS project", "in_progress", "medium", 1, "GitHub Sync", members[1]),
        t("Mobile App Prototype ready for testing", "Prepare prototype for user testing this week", "todo", "high", 2, "9TDesign Mobile App", members[2]),
        t("Dashboard Design comfortable with Vision Pro", "Design a dashboard layout", "todo", "medium", 0, "Horizon Dashboard", demo_id),
        t("Fix navbar overflow on mobile", "Critical UI bug on small screens", "in_progress", "urgent", -2, "BrightBridge Website", members[3]),
        t("API contract for tasks endpoint", "Document REST contracts", "done", "medium", -5, "Horizon Dashboard", demo_id),
        t("User research: Onboarding flow", "5 sessions, async survey", "in_progress", "medium", 4, "9TDesign Mobile App", members[1]),
        t("Backlog: Notifications redesign", "Move from email-first to in-app", "backlog", "low", 14, "Horizon Dashboard", members[2]),
        t("Backlog: Add SSO support", "SAML + Okta", "backlog", "low", 30, "GitHub Sync", demo_id),
        t("Overdue: Update privacy policy", "GDPR review", "todo", "high", -3, "BrightBridge Website", demo_id),
        t("Done: Launch checklist v1", "Pre-launch QA", "done", "low", -10, "BrightBridge Website", demo_id),
        t("Done: Brand color audit", "Pass WCAG AA", "done", "low", -8, "9TDesign Mobile App", members[3]),
    ]
    await db.tasks.insert_many(tasks)


async def seed_meetings(db):
    if await db.meetings.count_documents({}) > 0:
        return
    now = datetime.now(timezone.utc)
    items = [
        {"id": str(uuid.uuid4()), "title": "App Project Sync", "platform": "Meet", "starts_at": _iso(now + timedelta(hours=3)), "project_id": None},
        {"id": str(uuid.uuid4()), "title": "User Research Review", "platform": "Zoom", "starts_at": _iso(now + timedelta(hours=5)), "project_id": None},
        {"id": str(uuid.uuid4()), "title": "Design Critique", "platform": "Meet", "starts_at": _iso(now + timedelta(days=1, hours=2)), "project_id": None},
    ]
    await db.meetings.insert_many(items)


async def run_seed(db):
    admin, demo, teammates = await seed_users(db)
    await seed_projects(db, demo["id"])
    await seed_tasks(db, demo["id"], teammates)
    await seed_meetings(db)
