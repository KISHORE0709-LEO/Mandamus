from datetime import datetime, timezone
from mongodb.client import get_db

COLLECTION_NAME = "hearing_transcripts"

async def init_transcript(hearing_id, case_id, judge_email):
    db = get_db()
    if db is None: return None
    
    doc = {
        "hearing_id": hearing_id,
        "case_id": case_id,
        "judge_email": judge_email,
        "status": "in_progress",
        "transcript": [],
        "language": "english",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db[COLLECTION_NAME].update_one(
        {"hearing_id": hearing_id},
        {"$setOnInsert": doc},
        upsert=True
    )

async def append_transcript_utterance(hearing_id, utterance):
    db = get_db()
    if db is None: return None
    
    # utterance: { timestamp, speaker_role, speaker_name, text }
    await db[COLLECTION_NAME].update_one(
        {"hearing_id": hearing_id},
        {
            "$push": {"transcript": utterance},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )

async def get_transcript(hearing_id):
    db = get_db()
    if db is None: return None
    return await db[COLLECTION_NAME].find_one({"hearing_id": hearing_id})

async def complete_transcript(hearing_id):
    db = get_db()
    if db is None: return None
    
    await db[COLLECTION_NAME].update_one(
        {"hearing_id": hearing_id},
        {"$set": {"status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
