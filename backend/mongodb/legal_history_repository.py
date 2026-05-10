from .client import get_db

def get_history_collection():
    db = get_db()
    if db is None:
        raise Exception("Database not initialized. Call connect_to_mongo() first.")
    return db["legal_assistant_history"]

async def get_user_threads(user_id: str):
    collection = get_history_collection()
    user_data = await collection.find_one({"user_id": user_id}, {"_id": 0, "threads": 1})
    if user_data:
        return user_data.get("threads", [])
    return []

async def save_full_history(user_id: str, thread_id: str, thread_data: dict, messages: list = None):
    collection = get_history_collection()
    
    # 1. Update Thread Metadata in the 'threads' list
    await collection.update_one(
        {"user_id": user_id},
        {"$pull": {"threads": {"id": thread_id}}},
        upsert=True
    )
    
    await collection.update_one(
        {"user_id": user_id},
        {"$push": {"threads": {"$each": [thread_data], "$position": 0, "$slice": 25}}}
    )
    
    # 2. Update Thread Messages
    if messages:
        await collection.update_one(
            {"user_id": user_id},
            {"$set": {f"thread_messages.{thread_id}": messages}}
        )

async def delete_thread(user_id: str, thread_id: str):
    collection = get_history_collection()
    await collection.update_one(
        {"user_id": user_id},
        {
            "$pull": {"threads": {"id": thread_id}},
            "$unset": {f"thread_messages.{thread_id}": ""}
        }
    )

async def rename_thread(user_id: str, thread_id: str, new_title: str):
    collection = get_history_collection()
    await collection.update_one(
        {"user_id": user_id, "threads.id": thread_id},
        {"$set": {"threads.$.query": new_title}}
    )

async def get_thread_messages(user_id: str, thread_id: str):
    collection = get_history_collection()
    user_data = await collection.find_one({"user_id": user_id}, {f"thread_messages.{thread_id}": 1})
    if user_data:
        return user_data.get("thread_messages", {}).get(thread_id, [])
    return []
