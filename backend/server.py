"""SerenOps — AI-first Project Management API (Jira-lite)."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging

from fastapi import FastAPI, APIRouter
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware

import routes_auth
import routes_chat
import routes_clients
import routes_client_ops
import routes_dashboard
import routes_llm
import routes_notifications
import routes_projects
import routes_tasks
import routes_users
import routes_portal
import routes_sample_data
from seed import run_seed

# ---------- Mongo ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------- App ----------
app = FastAPI(title="SerenOps API", version="1.0.0")
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"app": "serenops", "status": "ok"}


# Mount sub-routers
api_router.include_router(routes_auth.router)
api_router.include_router(routes_users.router)
api_router.include_router(routes_tasks.router)
api_router.include_router(routes_projects.router)
api_router.include_router(routes_clients.router)
api_router.include_router(routes_client_ops.router)
api_router.include_router(routes_notifications.router)
api_router.include_router(routes_dashboard.router)
api_router.include_router(routes_llm.router)
api_router.include_router(routes_chat.router)
api_router.include_router(routes_portal.router)
api_router.include_router(routes_sample_data.router)

app.include_router(api_router)

# CORS for local development + cookie auth.
cors_origins_raw = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
cors_origins = [x.strip() for x in cors_origins_raw.split(",") if x.strip()]
if "*" in cors_origins:
    # Credentials + wildcard origin do not work in browsers.
    cors_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.tasks.create_index("assignee_id")
    await db.tasks.create_index("project_id")
    await db.tasks.create_index("client_id")
    await db.projects.create_index("client_id")
    await db.clients.create_index("status")
    await db.onboarding_items.create_index("client_id")
    await db.invoices.create_index("client_id")
    await db.invoices.create_index("status")
    await db.proposals.create_index("client_id")
    await db.proposals.create_index("status")
    await db.contracts.create_index("client_id")
    await db.contracts.create_index("status")
    await db.file_links.create_index("client_id")
    await db.file_links.create_index("project_id")
    await db.revisions.create_index("client_id")
    await db.revisions.create_index("project_id")
    await db.payments.create_index("client_id")
    await db.payments.create_index("invoice_id")
    await db.handover_items.create_index("client_id")
    await db.maintenance_plans.create_index("client_id")
    await db.maintenance_plans.create_index("project_id")
    await db.maintenance_plans.create_index("status")
    await db.timeline_events.create_index("client_id")
    await db.timeline_events.create_index("occurred_at")
    await db.templates.create_index("template_type")
    await db.templates.create_index("is_default")
    await db.portal_links.create_index("token", unique=True)
    await db.portal_links.create_index("client_id")
    await db.portal_links.create_index("revoked")
    await db.llm_configs.create_index("user_id", unique=True)
    await db.login_attempts.create_index("identifier", unique=True)
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    try:
        await run_seed(db)
        logger.info("Seed complete.")
    except Exception as e:
        logger.exception("Seed failed: %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
