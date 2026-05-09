from datetime import datetime, timezone
from mongodb.client import get_db

COLLECTION_NAME = "case_context_memory"

async def update_case_context(case_id, summary_data):
    db = get_db()
    if db is None: return None
    
    update_doc = {
        "$push": {
            "hearing_summaries": {
                "hearing_id": summary_data["hearing_id"],
                "summary": summary_data["summary"],
                "date": datetime.now(timezone.utc).isoformat()
            },
            "important_arguments": {"$each": summary_data.get("important_arguments", [])}
        },
        "$set": {
            "context_updated_at": datetime.now(timezone.utc).isoformat()
        }
    }
    
    await db[COLLECTION_NAME].update_one(
        {"case_id": case_id},
        update_doc,
        upsert=True
    )

async def get_case_context(case_id):
    db = get_db()
    if db is None: return None
    return await db[COLLECTION_NAME].find_one({"case_id": case_id})
