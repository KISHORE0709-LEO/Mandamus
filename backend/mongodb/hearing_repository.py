from datetime import datetime, timezone
from mongodb.client import get_db

COLLECTION_NAME = "hearing_sessions"

async def create_hearing_session(hearing_data):
    db = get_db()
    if db is None: return None
    
    hearing_data["created_at"] = datetime.now(timezone.utc).isoformat()
    hearing_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db[COLLECTION_NAME].insert_one(hearing_data)
    return str(result.inserted_id)

async def get_hearing_session(hearing_id):
    db = get_db()
    if db is None: return None
    return await db[COLLECTION_NAME].find_one({"hearing_id": hearing_id})

async def update_hearing_status(hearing_id, status):
    db = get_db()
    if db is None: return None
    
    await db[COLLECTION_NAME].update_one(
        {"hearing_id": hearing_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

async def add_participant_to_session(hearing_id, participant):
    db = get_db()
    if db is None: return None
    
    participant["joined_at"] = datetime.now(timezone.utc).isoformat()
    
    await db[COLLECTION_NAME].update_one(
        {"hearing_id": hearing_id},
        {"$push": {"participants": participant}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
