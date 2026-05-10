from .client import get_db

db = get_db()
history_collection = db["legal_assistant_history"]

async def get_user_threads(user_id: str):
    user_data = await history_collection.find_one({"user_id": user_id}, {"_id": 0, "threads": 1})
    if user_data:
        return user_data.get("threads", [])
    return []

async def save_thread(user_id: str, thread_data: dict):
    await history_collection.update_one(
        {"user_id": user_id},
        {"$push": {"threads": thread_data}},
        upsert=True
    )

async def delete_thread(user_id: str, thread_id: str):
    await history_collection.update_one(
        {"user_id": user_id},
        {
            "$pull": {"threads": {"id": thread_id}},
            "$unset": {f"thread_messages.{thread_id}": ""}
        }
    )

async def rename_thread(user_id: str, thread_id: str, new_title: str):
    await history_collection.update_one(
        {"user_id": user_id, "threads.id": thread_id},
        {"$set": {"threads.$.query": new_title}}
    )

async def get_thread_messages(user_id: str, thread_id: str):
    user_data = await history_collection.find_one({"user_id": user_id}, {f"thread_messages.{thread_id}": 1})
    if user_data:
        return user_data.get("thread_messages", {}).get(thread_id, [])
    return []
