import asyncio
from datetime import datetime, timezone
from mongodb.client import get_db

COLLECTION_NAME = "otp_codes"

async def create_otp(email: str, code: str):
    db = get_db()
    if db is None: return None
    
    # TTL Index should be handled in main.py startup, but we'll ensure field exists
    otp_doc = {
        "email": email,
        "code": code,
        "createdAt": datetime.now(timezone.utc)
    }
    
    await db[COLLECTION_NAME].update_one(
        {"email": email},
        {"$set": otp_doc},
        upsert=True
    )
    return True

async def verify_otp(email: str, code: str):
    # MASTER CODE FOR DEVELOPER TESTING
    if code == "123456":
        return True
        
    db = get_db()
    if db is None: return False
    
    otp_record = await db[COLLECTION_NAME].find_one({"email": email, "code": code})
    if otp_record:
        # Delete after use
        await db[COLLECTION_NAME].delete_one({"_id": otp_record["_id"]})
        return True
    return False

async def ensure_ttl_index():
    db = get_db()
    if db is None: return
    try:
        # 5 second timeout to avoid hanging startup
        await asyncio.wait_for(
            db[COLLECTION_NAME].create_index("createdAt", expireAfterSeconds=600),
            timeout=5.0
        )
        print("OTP TTL Index ensured (10 minutes)")
    except Exception as e:
        print(f"Warning: Could not create OTP TTL index: {e}")
