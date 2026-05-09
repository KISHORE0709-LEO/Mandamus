from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from mongodb import hearing_repository, transcript_repository, context_repository
from services import hearing_summary_service

router = APIRouter(prefix="/virtual-hearing", tags=["Virtual Hearing"])

class HearingSession(BaseModel):
    hearing_id: str
    case_id: str
    judge_email: str
    hearing_date: str
    room_id: str
    status: str = "scheduled"
    participants: List[dict] = []

class Utterance(BaseModel):
    timestamp: str
    speaker_role: str
    speaker_name: str
    text: str

@router.post("/sessions")
async def create_session(session: HearingSession):
    session_id = await hearing_repository.create_hearing_session(session.dict())
    # Initialize transcript doc
    await transcript_repository.init_transcript(session.hearing_id, session.case_id, session.judge_email)
    return {"status": "success", "session_id": session_id}

@router.get("/sessions/{hearing_id}")
async def get_session(hearing_id: str):
    session = await hearing_repository.get_hearing_session(hearing_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    # MongoDB returns _id as ObjectId, convert to string
    session["_id"] = str(session["_id"])
    return session

@router.post("/sessions/{hearing_id}/transcript")
async def append_transcript(hearing_id: str, utterance: Utterance):
    await transcript_repository.append_transcript_utterance(hearing_id, utterance.dict())
    return {"status": "success"}

@router.post("/sessions/{hearing_id}/complete")
async def complete_hearing(hearing_id: str, background_tasks: BackgroundTasks):
    await hearing_repository.update_hearing_status(hearing_id, "completed")
    await transcript_repository.complete_transcript(hearing_id)
    
    # Trigger AI Intelligence Pipeline in background
    background_tasks.add_task(hearing_summary_service.generate_hearing_intelligence, hearing_id)
    
    return {"status": "success", "message": "Hearing completed and AI pipeline triggered."}

@router.get("/case-context/{case_id}")
async def get_context(case_id: str):
    context = await context_repository.get_case_context(case_id)
    if not context:
        return {"case_id": case_id, "hearing_summaries": [], "message": "No context found"}
    context["_id"] = str(context["_id"])
    return context
