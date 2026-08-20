"""Sample Data routes for seeding and clearing demo data."""
from fastapi import APIRouter, Depends
from auth import get_current_user
from seed import load_sample_data, clear_sample_data

router = APIRouter(prefix="/sample-data", tags=["sample-data"])


@router.post("/load")
async def api_load_sample_data(user=Depends(get_current_user)):
    from server import db

    counts = await load_sample_data(db, owner_id=user["id"])
    return {"ok": True, "message": "Sample data loaded successfully.", "counts": counts}


@router.delete("/clear")
async def api_clear_sample_data(user=Depends(get_current_user)):
    from server import db

    counts = await clear_sample_data(db)
    return {"ok": True, "message": "Sample data removed successfully.", "cleared": counts}
