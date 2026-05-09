from datetime import datetime, timezone
from mongodb.client import get_db

COLLECTION_NAME = "hearing_summaries"

async def save_hearing_summary(summary_data):
    db = get_db()
    if db is None: return None
    
    summary_data["generated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db[COLLECTION_NAME].update_one(
        {"hearing_id": summary_data["hearing_id"]},
        {"$set": summary_data},
        upsert=True
    )

async def get_latest_summary_for_case(case_id):
    db = get_db()
    if db is None: return None
    
    return await db[COLLECTION_NAME].find_one(
        {"case_id": case_id},
        sort=[("generated_at", -1)]
    )
