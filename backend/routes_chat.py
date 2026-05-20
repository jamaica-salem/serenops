"""AI chat assistant — rule-based fallback + multi-provider LLM support."""
import os
import uuid
from datetime import datetime, timezone, date
from typing import Optional

import httpx

from fastapi import APIRouter, Depends

from auth import get_current_user
from models import ChatIn, ChatOut

router = APIRouter(prefix="/chat", tags=["chat"])


def _parse_date(s):
    if not s:
        return None
    try:
        return date.fromisoformat(s[:10])
    except Exception:
        return None


async def _build_context(db, user_id: str) -> str:
    tasks = await db.tasks.find({"assignee_id": user_id}, {"_id": 0}).to_list(200)
    today = datetime.now(timezone.utc).date()
    lines = []
    for t in tasks[:30]:
        d = _parse_date(t.get("due_date"))
        flag = ""
        if d and d < today and t.get("status") != "done":
            flag = " [OVERDUE]"
        elif d == today:
            flag = " [DUE TODAY]"
        lines.append(
            f"- {t['title']} | status={t['status']} | priority={t['priority']} | due={t.get('due_date') or 'none'}{flag}"
        )
    return "\n".join(lines) if lines else "(no tasks assigned)"


def _rule_based_reply(message: str, tasks, today) -> str:
    msg = message.lower().strip()
    overdue = [
        t for t in tasks
        if _parse_date(t.get("due_date")) and _parse_date(t["due_date"]) < today and t.get("status") != "done"
    ]
    in_progress = [t for t in tasks if t.get("status") == "in_progress"]
    todo = [t for t in tasks if t.get("status") == "todo"]
    due_today = [t for t in tasks if _parse_date(t.get("due_date")) == today and t.get("status") != "done"]

    if any(k in msg for k in ["overdue", "late", "behind"]):
        if not overdue:
            return "You have no overdue tasks. Nice work staying on top of things."
        items = "\n".join([f"• {t['title']} (was due {t.get('due_date')})" for t in overdue[:5]])
        return f"You have {len(overdue)} overdue task(s):\n{items}"

    if any(k in msg for k in ["today", "work on", "what should i", "focus", "priority"]):
        focus = sorted(
            in_progress + due_today + todo,
            key=lambda t: (
                0 if t.get("priority") == "urgent" else 1 if t.get("priority") == "high" else 2,
                _parse_date(t.get("due_date")) or date(2999, 1, 1),
            ),
        )[:3]
        if not focus:
            return "Looks like your plate is clear. Good time to plan ahead."
        items = "\n".join([f"• {t['title']} ({t.get('priority')}, {t.get('status')})" for t in focus])
        return f"Here's what I'd focus on today:\n{items}"

    if any(k in msg for k in ["summary", "summarize", "summarise", "status", "overview"]):
        return (
            f"Here's your snapshot:\n"
            f"• Overdue: {len(overdue)}\n"
            f"• In progress: {len(in_progress)}\n"
            f"• Due today: {len(due_today)}\n"
            f"• To do: {len(todo)}"
        )

    if any(k in msg for k in ["hi", "hello", "hey"]):
        return "Hey! Ask me 'what should I work on today?', 'summarize my tasks', or 'which tasks are overdue?'"

    return (
        "I can help with: 'what should I work on today', 'summarize my tasks', "
        "'which tasks are overdue', or general questions about your work. "
        "Hook up an LLM in Settings for richer answers."
    )


async def _llm_reply(message: str, context: str, cfg: dict) -> str:
    provider = (cfg.get("provider") or "openai").lower()
    model = cfg.get("model") or {
        "openai": "gpt-5.1",
        "anthropic": "claude-sonnet-4-5-20250929",
        "gemini": "gemini-2.5-flash",
        "custom": "gpt-5.1",
    }.get(provider, "gpt-5.1")
    api_key = cfg.get("api_key") or _get_provider_api_key(provider)
    base_url = cfg.get("base_url")
    if not api_key:
        raise ValueError(f"Missing API key for provider '{provider}'")

    system = (
        "You are Panze AI, a concise, friendly project management assistant. "
        "Use the user's task list (provided below) to answer questions about priorities, "
        "deadlines, and progress. Keep replies under 120 words.\n\n"
        f"User's tasks:\n{context}"
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        if provider in ("openai", "custom"):
            endpoint = (
                f"{base_url.rstrip('/')}/chat/completions"
                if base_url else
                "https://api.openai.com/v1/chat/completions"
            )
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": message},
                ],
                "temperature": 0.2,
                "max_tokens": 220,
            }
            res = await client.post(
                endpoint,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=payload,
            )
            res.raise_for_status()
            data = res.json()
            text = (((data.get("choices") or [{}])[0].get("message") or {}).get("content") or "").strip()
        elif provider == "anthropic":
            res = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": model,
                    "max_tokens": 220,
                    "system": system,
                    "messages": [{"role": "user", "content": message}],
                },
            )
            res.raise_for_status()
            data = res.json()
            text = " ".join(
                (item.get("text") or "").strip()
                for item in (data.get("content") or [])
                if item.get("type") == "text"
            ).strip()
        elif provider == "gemini":
            endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            res = await client.post(
                endpoint,
                headers={"x-goog-api-key": api_key, "content-type": "application/json"},
                json={
                    "system_instruction": {"parts": [{"text": system}]},
                    "contents": [{"parts": [{"text": message}]}],
                },
            )
            res.raise_for_status()
            data = res.json()
            text = " ".join(
                (part.get("text") or "").strip()
                for part in ((((data.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []))
                if part.get("text")
            ).strip()
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    if not text:
        raise ValueError("LLM returned an empty response")
    return text


def _get_provider_api_key(provider: str) -> Optional[str]:
    if provider in ("openai", "custom"):
        return os.environ.get("OPENAI_API_KEY") or os.environ.get("LLM_API_KEY")
    if provider == "anthropic":
        return os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("LLM_API_KEY")
    if provider == "gemini":
        return (
            os.environ.get("GEMINI_API_KEY")
            or os.environ.get("GOOGLE_API_KEY")
            or os.environ.get("LLM_API_KEY")
        )
    return os.environ.get("LLM_API_KEY")


def _has_any_llm_key() -> bool:
    keys = (
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "GEMINI_API_KEY",
        "GOOGLE_API_KEY",
        "LLM_API_KEY",
    )
    return any(os.environ.get(key) for key in keys)


@router.post("", response_model=ChatOut)
async def chat(payload: ChatIn, user=Depends(get_current_user)):
    from server import db

    today = datetime.now(timezone.utc).date()
    user_tasks = await db.tasks.find({"assignee_id": user["id"]}, {"_id": 0}).to_list(200)

    cfg = await db.llm_configs.find_one({"user_id": user["id"]}, {"_id": 0})
    session_id = payload.session_id or str(uuid.uuid4())

    # Try LLM if configured or if provider keys are available via env vars.
    if cfg or _has_any_llm_key():
        try:
            context = await _build_context(db, user["id"])
            reply = await _llm_reply(payload.message, context, cfg or {})
            await db.chat_messages.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "session_id": session_id,
                "user_message": payload.message,
                "ai_reply": reply,
                "source": "llm",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            return ChatOut(reply=reply, session_id=session_id, source="llm")
        except Exception as e:
            # Fall through to rule-based
            print(f"[chat] LLM error, falling back: {e}")

    reply = _rule_based_reply(payload.message, user_tasks, today)
    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "session_id": session_id,
        "user_message": payload.message,
        "ai_reply": reply,
        "source": "rule_based",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return ChatOut(reply=reply, session_id=session_id, source="rule_based")
