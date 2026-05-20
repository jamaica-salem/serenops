"""Backend regression tests for SerenOps (Jira-lite AI PM)."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@serenops.app"
DEMO_PASSWORD = "demo123"
ADMIN_EMAIL = "admin@serenops.app"
ADMIN_PASSWORD = "admin123"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def demo_session(session):
    """Login as demo user and return session with cookies."""
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return session


def create_test_client(session, prefix):
    payload = {
        "name": f"{prefix} Client",
        "company_name": f"{prefix} Co",
        "email": f"{prefix.lower()}@example.com",
        "status": "active",
        "source": "manual",
    }
    r = session.post(f"{API}/clients", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


def create_test_project(session, client_id, prefix):
    payload = {
        "name": f"{prefix} Project",
        "description": "Test project",
        "client_id": client_id,
        "color": "#EA580C",
        "status": "planned",
    }
    r = session.post(f"{API}/projects", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


def create_test_invoice(session, client_id, project_id, prefix):
    payload = {
        "invoice_number": f"INV-{prefix}",
        "client_id": client_id,
        "project_id": project_id,
        "issue_date": "2026-05-20",
        "due_date": "2026-05-27",
        "currency": "USD",
        "line_items": [
            {"description": "Service fee", "quantity": 1, "rate": 250},
        ],
        "discount": 0,
        "tax_fees": 0,
        "amount_paid": 0,
        "payment_method": "",
        "notes": "",
        "status": "sent",
    }
    r = session.post(f"{API}/invoices", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- Health ----------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        assert data.get("app") == "serenops"


# ---------- Auth ----------
class TestAuth:
    def test_login_demo(self, session):
        r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == DEMO_EMAIL
        assert data["name"]
        assert "id" in data
        # cookies must be set httpOnly
        assert "access_token" in r.cookies
        assert "refresh_token" in r.cookies

    def test_login_admin(self, session):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200, r.text
        assert r.json()["role"] == "admin"

    def test_login_invalid(self, session):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_with_cookie(self, demo_session):
        r = demo_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == DEMO_EMAIL

    def test_me_without_auth(self, session):
        s = requests.Session()
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_register_and_logout(self):
        s = requests.Session()
        email = f"test_{uuid.uuid4().hex[:8]}@serenops.app"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "Test User"})
        assert r.status_code == 200, r.text
        assert r.json()["email"] == email
        # logout
        r2 = s.post(f"{API}/auth/logout")
        assert r2.status_code == 200
        # me should fail (cookies cleared)
        r3 = s.get(f"{API}/auth/me")
        assert r3.status_code == 401

    def test_register_duplicate(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/register", json={"email": DEMO_EMAIL, "password": "pass1234", "name": "Demo Dup"})
        assert r.status_code == 409


# ---------- Tasks ----------
class TestTasks:
    def test_list_tasks(self, demo_session):
        r = demo_session.get(f"{API}/tasks")
        assert r.status_code == 200
        tasks = r.json()
        assert isinstance(tasks, list)
        assert len(tasks) > 0

    def test_list_tasks_filter_assignee_me(self, demo_session):
        r = demo_session.get(f"{API}/tasks", params={"assignee": "me"})
        assert r.status_code == 200
        tasks = r.json()
        assert isinstance(tasks, list)
        assert len(tasks) > 0

    def test_list_tasks_filter_status(self, demo_session):
        r = demo_session.get(f"{API}/tasks", params={"status": "in_progress"})
        assert r.status_code == 200
        for t in r.json():
            assert t["status"] == "in_progress"

    def test_create_update_delete_task(self, demo_session):
        # Create
        payload = {
            "title": "TEST_Task_Backend",
            "description": "Created by backend test",
            "status": "todo",
            "priority": "high",
        }
        r = demo_session.post(f"{API}/tasks", json=payload)
        assert r.status_code == 200, r.text
        task = r.json()
        tid = task["id"]
        assert task["title"] == payload["title"]
        assert task["status"] == "todo"

        # Verify GET
        r = demo_session.get(f"{API}/tasks/{tid}")
        assert r.status_code == 200
        assert r.json()["title"] == payload["title"]

        # Update status
        r = demo_session.patch(f"{API}/tasks/{tid}", json={"status": "in_progress"})
        assert r.status_code == 200
        assert r.json()["status"] == "in_progress"

        # Verify update persisted
        r = demo_session.get(f"{API}/tasks/{tid}")
        assert r.json()["status"] == "in_progress"

        # Delete
        r = demo_session.delete(f"{API}/tasks/{tid}")
        assert r.status_code == 200

        # Verify gone
        r = demo_session.get(f"{API}/tasks/{tid}")
        assert r.status_code == 404


# ---------- Projects ----------
class TestProjects:
    def test_list_projects(self, demo_session):
        r = demo_session.get(f"{API}/projects")
        assert r.status_code == 200
        projects = r.json()
        assert isinstance(projects, list)
        assert len(projects) > 0

    def test_create_and_delete_project(self, demo_session):
        payload = {"name": "TEST_Project_Backend", "description": "test", "color": "#EA580C"}
        r = demo_session.post(f"{API}/projects", json=payload)
        assert r.status_code == 200, r.text
        proj = r.json()
        pid = proj["id"]
        assert proj["name"] == payload["name"]

        # List should contain it
        r = demo_session.get(f"{API}/projects")
        ids = [p["id"] for p in r.json()]
        assert pid in ids

        # Delete
        r = demo_session.delete(f"{API}/projects/{pid}")
        assert r.status_code == 200

        # Deleting non-existent
        r = demo_session.delete(f"{API}/projects/{pid}")
        assert r.status_code == 404


# ---------- Contracts ----------
class TestContracts:
    def test_contract_round_trip_and_filter(self, demo_session):
        prefix = f"contract_{uuid.uuid4().hex[:8]}"
        client = create_test_client(demo_session, prefix)

        try:
            create_payload = {
                "client_id": client["id"],
                "title": f"{prefix} Agreement",
                "service_provider_details": "Freelance operations support",
                "scope_of_work": "Weekly client management and delivery coordination.",
                "deliverables": ["Weekly reports", "Inbox management"],
                "payment_terms": "Net 7",
                "timeline": "4 weeks",
                "revision_policy": "Two rounds",
                "cancellation_policy": "7-day notice",
                "late_payment_clause": "5% late fee",
                "ownership_rights": "Client owns final assets",
                "confidentiality_clause": "Standard NDA applies",
                "signature_section": "Signed electronically",
                "notes": "Test contract",
                "status": "draft",
            }
            r = demo_session.post(f"{API}/contracts", json=create_payload)
            assert r.status_code == 200, r.text
            contract = r.json()
            contract_id = contract["id"]

            r = demo_session.get(f"{API}/contracts/{contract_id}")
            assert r.status_code == 200, r.text
            fetched = r.json()
            assert fetched["title"] == create_payload["title"]
            assert fetched["deliverables"] == create_payload["deliverables"]

            r = demo_session.patch(f"{API}/contracts/{contract_id}", json={"status": "signed", "notes": "Updated"})
            assert r.status_code == 200, r.text
            updated = r.json()
            assert updated["status"] == "signed"
            assert updated["notes"] == "Updated"

            r = demo_session.get(f"{API}/contracts", params={"client_id": client["id"]})
            assert r.status_code == 200, r.text
            ids = [item["id"] for item in r.json()]
            assert contract_id in ids

            r = demo_session.delete(f"{API}/contracts/{contract_id}")
            assert r.status_code == 200, r.text

            r = demo_session.get(f"{API}/contracts/{contract_id}")
            assert r.status_code == 404
        finally:
            demo_session.delete(f"{API}/clients/{client['id']}")


# ---------- Payments ----------
class TestPayments:
    def test_payment_records_invoice_context_and_filters(self, demo_session):
        prefix = f"payment_{uuid.uuid4().hex[:8]}"
        client = create_test_client(demo_session, prefix)
        project = create_test_project(demo_session, client["id"], prefix)
        invoice = create_test_invoice(demo_session, client["id"], project["id"], prefix)

        try:
            payment_payload = {
                "client_id": client["id"],
                "invoice_id": invoice["id"],
                "payment_date": "2026-05-20",
                "amount": 100,
                "method": "Bank Transfer",
                "reference_number": "REF-12345",
                "notes": "Partial payment recorded",
                "status": "recorded",
            }
            r = demo_session.post(f"{API}/payments", json=payment_payload)
            assert r.status_code == 200, r.text
            payment = r.json()
            assert payment["project_id"] == project["id"]
            assert payment["remaining_balance"] == 150
            assert payment["reference_number"] == payment_payload["reference_number"]

            r = demo_session.get(f"{API}/invoices/{invoice['id']}")
            assert r.status_code == 200, r.text
            refreshed_invoice = r.json()
            assert refreshed_invoice["amount_paid"] == 100
            assert refreshed_invoice["balance_due"] == 150

            r = demo_session.get(f"{API}/payments", params={"client_id": client["id"]})
            assert r.status_code == 200, r.text
            assert any(item["id"] == payment["id"] for item in r.json())

            r = demo_session.get(f"{API}/payments", params={"project_id": project["id"]})
            assert r.status_code == 200, r.text
            assert any(item["id"] == payment["id"] for item in r.json())

            r = demo_session.get(f"{API}/payments", params={"status": "recorded"})
            assert r.status_code == 200, r.text
            assert any(item["id"] == payment["id"] for item in r.json())
        finally:
            demo_session.delete(f"{API}/clients/{client['id']}")
            demo_session.delete(f"{API}/projects/{project['id']}")


# ---------- Notifications ----------
class TestNotifications:
    def test_list_notifications(self, demo_session):
        r = demo_session.get(f"{API}/notifications")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # Demo seed has overdue + due-soon tasks
        if items:
            n = items[0]
            assert "type" in n and "title" in n


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard_summary(self, demo_session):
        r = demo_session.get(f"{API}/dashboard/summary")
        assert r.status_code == 200
        data = r.json()
        for k in ["total_tasks", "overdue", "in_progress", "completed", "backlog", "not_started", "ai_insights"]:
            assert k in data
        assert isinstance(data["ai_insights"], list)
        assert len(data["ai_insights"]) >= 1
        assert data["total_tasks"] > 0

    def test_meetings(self, demo_session):
        r = demo_session.get(f"{API}/meetings")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 1


# ---------- LLM Config ----------
class TestLLMConfig:
    def test_get_default_config(self, demo_session):
        r = demo_session.get(f"{API}/llm-config")
        assert r.status_code == 200
        data = r.json()
        assert data["provider"] in ("openai", "anthropic", "gemini", "custom")
        assert "model" in data
        assert "has_custom_key" in data

    def test_update_config(self, demo_session):
        payload = {"provider": "openai", "model": "gpt-5.1", "api_key": "", "base_url": ""}
        r = demo_session.put(f"{API}/llm-config", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["provider"] == "openai"
        assert data["model"] == "gpt-5.1"


# ---------- Chat ----------
class TestChat:
    def test_chat_basic(self, demo_session):
        r = demo_session.post(f"{API}/chat", json={"message": "summarize my tasks"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "reply" in data and len(data["reply"]) > 0
        assert "session_id" in data
        assert data["source"] in ("llm", "rule_based")

    def test_chat_session_persistence(self, demo_session):
        r1 = demo_session.post(f"{API}/chat", json={"message": "hi"})
        sid = r1.json()["session_id"]
        r2 = demo_session.post(f"{API}/chat", json={"message": "thanks", "session_id": sid})
        assert r2.status_code == 200
        assert r2.json()["session_id"] == sid


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
