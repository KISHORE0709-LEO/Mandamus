from .client import get_db
import uuid
from datetime import datetime, timezone

def get_reports_collection():
    db = get_db()
    if db is None:
        raise Exception("Database not initialized. Call connect_to_mongo() first.")
    return db["silent_justice_reports"]

async def create_report(report_data: dict):
    collection = get_reports_collection()
    case_id = f"SJ-{uuid.uuid4().hex[:8].upper()}"
    report_data.update({
        "case_id": case_id,
        "status": "Submitted",
        "date": datetime.now(timezone.utc).isoformat(),
        "files": [],
        "evidence_analysis": []
    })
    await collection.insert_one(report_data)
    return case_id

async def get_report_by_id(case_id: str):
    collection = get_reports_collection()
    return await collection.find_one({"case_id": case_id}, {"_id": 0})

async def get_all_reports():
    collection = get_reports_collection()
    cursor = collection.find({}, {"_id": 0})
    return await cursor.to_list(length=100)

async def update_report_status(case_id: str, status: str):
    collection = get_reports_collection()
    await collection.update_one(
        {"case_id": case_id},
        {"$set": {"status": status}}
    )
    return await get_report_by_id(case_id)

async def add_evidence_file(case_id: str, file_info: dict):
    collection = get_reports_collection()
    await collection.update_one(
        {"case_id": case_id},
        {"$push": {"files": file_info}}
    )

async def add_evidence_analysis(case_id: str, analysis_data: dict):
    collection = get_reports_collection()
    await collection.update_one(
        {"case_id": case_id},
        {"$push": {"evidence_analysis": analysis_data}}
    )
