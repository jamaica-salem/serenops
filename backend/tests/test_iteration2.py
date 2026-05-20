"""Iteration 2 backend tests — users, persisted notifications, brute-force lockout."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@serenops.app"
DEMO_PASSWORD = "demo123"


# ---------- Fixtures ----------
@pytest.fixture
def fresh_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def demo_session(fresh_session):
    r = fresh_session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert r.status_code == 200, f"login failed: {r.text}"
    return fresh_session


# ---------- /api/users ----------
class TestUsers:
    def test_users_requires_auth(self, fresh_session):
        r = fresh_session.get(f"{API}/users")
        assert r.status_code == 401

    def test_users_list(self, demo_session):
        r = demo_session.get(f"{API}/users")
        assert r.status_code == 200, r.text
        users = r.json()
        assert isinstance(users, list)
        assert len(users) >= 2  # admin + demo + teammates
        # No password_hash should be returned
        for u in users:
            assert "password_hash" not in u
            assert "id" in u and "email" in u and "name" in u
        emails = [u["email"] for u in users]
        assert DEMO_EMAIL in emails


# ---------- Notifications persistence ----------
class TestNotificationsPersistence:
    def test_notifications_have_stable_ids(self, demo_session):
        r1 = demo_session.get(f"{API}/notifications")
        assert r1.status_code == 200
        items1 = r1.json()
        ids1 = sorted([n["id"] for n in items1])

        time.sleep(0.5)
        r2 = demo_session.get(f"{API}/notifications")
        assert r2.status_code == 200
        items2 = r2.json()
        ids2 = sorted([n["id"] for n in items2])

        assert ids1 == ids2, f"Notification ids changed across calls: {ids1} vs {ids2}"
        # Each item must have read flag
        for n in items2:
            assert "read" in n
            assert "id" in n and "type" in n

    def test_mark_single_read(self, demo_session):
        r = demo_session.get(f"{API}/notifications")
        items = r.json()
        # Find one that's currently unread
        unread = [n for n in items if not n.get("read")]
        if not unread:
            pytest.skip("No unread notifications available to mark read")
        nid = unread[0]["id"]

        r2 = demo_session.patch(f"{API}/notifications/{nid}/read")
        assert r2.status_code == 200, r2.text

        r3 = demo_session.get(f"{API}/notifications")
        match = next((n for n in r3.json() if n["id"] == nid), None)
        assert match is not None
        assert match["read"] is True

    def test_mark_read_404(self, demo_session):
        r = demo_session.patch(f"{API}/notifications/{uuid.uuid4()}/read")
        assert r.status_code == 404

    def test_mark_all_read(self, demo_session):
        r = demo_session.post(f"{API}/notifications/read-all")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "count" in data

        r2 = demo_session.get(f"{API}/notifications")
        for n in r2.json():
            assert n["read"] is True

    def test_delete_notification(self, demo_session):
        r = demo_session.get(f"{API}/notifications")
        items = r.json()
        if not items:
            pytest.skip("No notifications available to delete")
        nid = items[0]["id"]

        r2 = demo_session.delete(f"{API}/notifications/{nid}")
        assert r2.status_code == 200

        # second delete should 404
        r3 = demo_session.delete(f"{API}/notifications/{nid}")
        assert r3.status_code == 404

        r4 = demo_session.get(f"{API}/notifications")
        ids = [n["id"] for n in r4.json()]
        # If task still triggers regeneration, a NEW id may be regenerated for same task.
        # We only assert the original id is gone.
        assert nid not in ids


# ---------- Brute-force lockout ----------
class TestBruteForceLockout:
    def test_lockout_after_5_fails(self, fresh_session):
        # Use a unique email so we don't lock the real demo account for other tests
        bad_email = f"bf_{uuid.uuid4().hex[:8]}@serenops.app"
        # 5 fails - all should be 401 (user not found OR wrong pwd)
        for i in range(5):
            r = fresh_session.post(f"{API}/auth/login", json={"email": bad_email, "password": "wrong"})
            assert r.status_code == 401, f"attempt {i+1} expected 401 got {r.status_code}: {r.text}"
        # 6th attempt should be 429
        r = fresh_session.post(f"{API}/auth/login", json={"email": bad_email, "password": "wrong"})
        assert r.status_code == 429, f"expected 429 got {r.status_code}: {r.text}"
        body = r.json()
        # detail should mention lockout / try again
        detail = (body.get("detail") or "").lower()
        assert "try again" in detail or "lock" in detail or "too many" in detail

    def test_successful_login_resets_counter(self, fresh_session):
        # 4 fails (under threshold)
        for i in range(4):
            r = fresh_session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"})
            assert r.status_code == 401
        # Successful login should clear
        r = fresh_session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        assert r.status_code == 200
        # Now 4 more fails should be allowed (counter was reset)
        for i in range(4):
            r = fresh_session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"})
            assert r.status_code == 401, f"attempt {i+1} after reset expected 401 got {r.status_code}"
        # 5th additional fail = total counter at 5 -> 6th would be 429; we stop here to not lock demo
        # Cleanup: do a successful login to reset
        r = fresh_session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        assert r.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
