"""Read-only user listing for assignee dropdowns."""
from typing import List

from fastapi import APIRouter, Depends

from auth import get_current_user
from models import UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[UserOut])
async def list_users(_user=Depends(get_current_user)):
    from server import db
    users = await db.users.find(
        {}, {"_id": 0, "password_hash": 0, "created_at": 0}
    ).sort("name", 1).to_list(500)
    return users
