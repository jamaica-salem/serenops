"""Per-user LLM configuration."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from auth import get_current_user
from models import LLMConfigIn, LLMConfigOut

router = APIRouter(prefix="/llm-config", tags=["llm"])


@router.get("", response_model=LLMConfigOut)
async def get_config(user=Depends(get_current_user)):
    from server import db
    cfg = await db.llm_configs.find_one({"user_id": user["id"]}, {"_id": 0})
    if not cfg:
        return LLMConfigOut(provider="openai", model="gpt-5.1", has_custom_key=False)
    return LLMConfigOut(
        provider=cfg.get("provider", "openai"),
        model=cfg.get("model", "gpt-5.1"),
        has_custom_key=bool(cfg.get("api_key")),
        base_url=cfg.get("base_url"),
    )


@router.put("", response_model=LLMConfigOut)
async def update_config(payload: LLMConfigIn, user=Depends(get_current_user)):
    from server import db
    doc = {
        "user_id": user["id"],
        "provider": payload.provider,
        "model": payload.model,
        "api_key": payload.api_key or None,
        "base_url": payload.base_url or None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.llm_configs.update_one({"user_id": user["id"]}, {"$set": doc}, upsert=True)
    return LLMConfigOut(
        provider=doc["provider"],
        model=doc["model"],
        has_custom_key=bool(doc["api_key"]),
        base_url=doc["base_url"],
    )
