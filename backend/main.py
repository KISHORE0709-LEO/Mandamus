import os
import socketio
import uuid
import tempfile
import time
import logging
import json
import math
from datetime import datetime, timezone

import fitz  # PyMuPDF
import boto3

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
import asyncio
from botocore.exceptions import ClientError
from typing import List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv(override=True)

app = FastAPI()

# Load precedents_db on startup
precedents_db = []
try:
    with open("precedents_db.json", "r") as f:
        precedents_db = json.load(f)
    logger.info(f"Successfully loaded {len(precedents_db)} precedents from database.")
except Exception as e:
    logger.error(f"Could not load precedents_db.json: {e}")

# Enable CORS - allow all origins for production deployment
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
    "http://127.0.0.1:5177",
    "https://*.vercel.app",  # Allow Vercel deployments
    "https://*.netlify.app",  # Allow Netlify deployments
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for production flex
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── SOCKET.IO SIGNALING SERVER (For Virtual Hearings) ───
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio)
app.mount("/socket.io", socket_app)

# Room storage: { roomId: { socketId: { userId, role, name } } }
rooms = {}

@sio.event
async def connect(sid, environ):
    logger.info(f"SIGNALING: Client connected {sid}")

@sio.event
async def join_room(sid, data):
    room_id = data.get('roomId')
    user_id = data.get('userId')
    role = data.get('role')
    name = data.get('name')
    
    if room_id not in rooms:
        rooms[room_id] = {}
    
    # Notify others in the room
    await sio.emit('user-joined', {'socketId': sid, 'name': name, 'role': role}, room=room_id, skip_sid=sid)
    
    # Tell new user who is already there
    existing = []
    for other_sid, info in rooms[room_id].items():
        existing.append({'socketId': other_sid, 'name': info['name'], 'role': info['role']})
    
    rooms[room_id][sid] = {'userId': user_id, 'role': role, 'name': name}
    sio.enter_room(sid, room_id)
    await sio.emit('room-users', existing, to=sid)
    logger.info(f"SIGNALING: User {name} ({role}) joined room {room_id}")

@sio.event
async def offer(sid, data):
    await sio.emit('offer', {'from': sid, 'offer': data['offer']}, to=data['to'])

@sio.event
async def answer(sid, data):
    await sio.emit('answer', {'from': sid, 'answer': data['answer']}, to=data['to'])

@sio.event
async def ice_candidate(sid, data):
    await sio.emit('ice-candidate', {'from': sid, 'candidate': data['candidate']}, to=data['to'])

@sio.event
async def disconnect(sid):
    for r_id, users in rooms.items():
        if sid in users:
            await sio.emit('user-disconnected', {'socketId': sid}, room=r_id)
            del users[sid]
            break
    logger.info(f"SIGNALING: Client disconnected {sid}")


@app.get("/")
def health_check():
    return {"status": "running", "service": "mandamus-summariser"}

def get_s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION")
    )

def get_textract_client():
    return boto3.client(
        "textract",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION")
    )

def get_bedrock_client():
    return boto3.client(
        "bedrock-runtime",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION")
    )

def summarise_with_bedrock(extracted_text: str) -> dict:
    bedrock = get_bedrock_client()

    # Send more text for better accuracy — keep top (parties/header) and bottom (orders/relief)
    if len(extracted_text) > 10000:
        text_to_send = extracted_text[:7000] + "\n...[middle section truncated]...\n" + extracted_text[-3000:]
    else:
        text_to_send = extracted_text

    prompt = f"""You are a senior Indian legal analyst AI. Carefully read the court document below and return ONLY a single valid JSON object. No markdown. No backticks. No explanation. Start with {{ and end with }}.

STRICT FIELD REQUIREMENTS — every field MUST be populated from the actual document text:

1. case_id: exact case number from document (e.g. "W.P.(Crl.) 167/2012")
2. court_name: full court name (e.g. "Supreme Court of India")
3. petitioner: full name of petitioner/appellant
4. petitioner_counsel: name of petitioner's advocate if mentioned, else "Not Mentioned"
5. respondent: full name of respondent
6. respondent_counsel: name of respondent's advocate if mentioned, else "Not Mentioned"
7. filing_date: date of filing in DD-MMM-YYYY format (e.g. "15-JAN-2012"), extract from document
8. pending_duration: calculate from filing_date to today's date as "X years Y months" (e.g. "11 years 3 months")
9. plain_summary: 3-4 sentences in simple English explaining — what happened, who is fighting whom, why they are in court, and what relief is sought. Write as if explaining to a 16-year-old.
10. key_facts: array of exactly 4-6 strings — each a single factual statement from the document (technical, for lawyers)
11. ipc_sections: array of objects — extract EVERY law/section/article cited in the document. Each object: {{"section": "IPC Section 302", "description": "Punishment for murder"}}. If none explicitly cited, infer from case type and facts. NEVER return empty array.
12. core_legal_questions: array of 3-5 strings — the actual legal issues the court must decide
13. evidence: array of objects — list ONLY physical/digital evidence items mentioned: CCTV footage, call records, medical reports, witness statements, bank statements, forensic reports, photographs, seized weapons, documents. Each: {{"name": "short 2-3 word label", "type": "one of: CCTV Footage/Call Records/Witness Statement/Forensic Report/Medical Record/Financial Record/Digital Evidence/Physical Evidence/Photograph/Seized Document"}}. If no specific evidence mentioned, return [{{"name": "Case Records", "type": "Seized Document"}}, {{"name": "Petition Documents", "type": "Seized Document"}}]
14. case_type: string like "CRIMINAL_PETITION", "WRIT_PETITION", "BAIL_APPLICATION", "CIVIL_APPEAL"
15. is_undertrial: boolean — true if accused is in custody awaiting trial
16. confidence_score: number 0-100 — your confidence in the extraction accuracy
17. argument_strength: object with petitioner (number 0-100) and respondent (number 0-100) based on strength of legal position
18. procedural_path: array of up to 3 objects with date (string) and event (string) — key milestones from the document
19. case_outcome_analysis: object with: title (string, e.g. "FAVORABLE JUDGMENT"), probability_score (number 0-100), favours (string — name of party likely to win), description (2 sentences — AI prediction based on facts), key_insight (string — single most important legal insight)
20. student_mode: object with THREE fields:
    - key_facts: array of 4-5 strings — SAME facts as above but rewritten in extremely simple language, no legal jargon, as if explaining to a student who has never read a court case
    - legal_questions: array of 3-4 strings — SAME legal questions rewritten simply, like "Can a person be kept in jail without a fair trial?" instead of technical phrasing
    - outcome_explanation: single paragraph in plain English — what will likely happen, what it means for the common person, and why this case matters to society

DOCUMENT:
{text_to_send}"""

    try:
        response = bedrock.converse(
            modelId="us.amazon.nova-pro-v1:0",
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 4096, "temperature": 0.0}
        )

        result_text = response['output']['message']['content'][0]['text'].strip()

        # Strip markdown if present
        if result_text.startswith("```json"):
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif result_text.startswith("```"):
            result_text = result_text.split("```")[1].split("```")[0].strip()

        # Find JSON boundaries in case there's surrounding text
        start = result_text.find('{')
        end = result_text.rfind('}')
        if start != -1 and end != -1:
            result_text = result_text[start:end+1]

        parsed = json.loads(result_text)

        # Enforce non-empty evidence fallback
        if not parsed.get('evidence') or len(parsed.get('evidence', [])) == 0:
            parsed['evidence'] = [
                {"name": "Case Records", "type": "Seized Document"},
                {"name": "Petition Documents", "type": "Seized Document"}
            ]

        # Enforce non-empty ipc_sections fallback
        if not parsed.get('ipc_sections') or len(parsed.get('ipc_sections', [])) == 0:
            parsed['ipc_sections'] = [
                {"section": "Article 21", "description": "Protection of life and personal liberty"},
                {"section": "Article 226", "description": "Power of High Courts to issue writs"}
            ]

        # Enforce student_mode fallback
        if not parsed.get('student_mode'):
            parsed['student_mode'] = {
                "key_facts": parsed.get('key_facts', []),
                "legal_questions": parsed.get('core_legal_questions', []),
                "outcome_explanation": parsed.get('plain_summary', '')
            }

        return parsed

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from Bedrock response: {str(e)}")
        return {"error": "Failed to parse JSON response from the model."}
    except Exception as e:
        logger.error(f"Error calling Bedrock: {str(e)}")
        return {"error": f"Failed to connect to AWS Bedrock: {str(e)}"}

def extract_text_from_bytes(file_bytes: bytes) -> tuple:
    """Extract text directly from PDF bytes — no S3 round-trip needed."""
    import io
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        extracted_text = "".join(page.get_text() + "\n" for page in doc)
        doc.close()
        if len(extracted_text.strip()) >= 100:
            logger.info("Extracted text using PyMuPDF (in-memory)")
            return extracted_text.strip(), "pymupdf"
    except Exception as e:
        logger.warning(f"PyMuPDF in-memory extraction failed: {e}")

    # Scanned PDF — must use Textract (requires S3)
    return None, "needs_textract"

def extract_text_via_textract(s3_key: str) -> tuple:
    """Fallback: use Textract for scanned PDFs already uploaded to S3."""
    textract_client = get_textract_client()
    bucket_name = "mandamus-cases"

    response = textract_client.start_document_text_detection(
        DocumentLocation={'S3Object': {'Bucket': bucket_name, 'Name': s3_key}}
    )
    job_id = response['JobId']

    while True:
        job_status = textract_client.get_document_text_detection(JobId=job_id)
        status = job_status['JobStatus']
        if status in ['SUCCEEDED', 'FAILED']:
            break
        time.sleep(2)

    if status != 'SUCCEEDED':
        raise Exception("AWS Textract job failed")

    text_blocks = []
    next_token = None
    while True:
        if next_token:
            job_status = textract_client.get_document_text_detection(JobId=job_id, NextToken=next_token)
        for block in job_status.get('Blocks', []):
            if block['BlockType'] == 'LINE':
                text_blocks.append(block['Text'])
        next_token = job_status.get('NextToken')
        if not next_token:
            break

    logger.info("Extracted text using AWS Textract")
    return "\n".join(text_blocks), "textract"

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    s3_client = get_s3_client()
    bucket_name = "mandamus-cases"
    
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    s3_key = f"uploads/{unique_filename}"
    
    try:
        s3_client.upload_fileobj(
            file.file,
            bucket_name,
            s3_key,
            ExtraArgs={"ContentType": file.content_type or "application/pdf"}
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"S3 Upload failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
        
    return {
        "status": "success",
        "s3_key": s3_key,
        "original_filename": file.filename,
        "upload_timestamp": datetime.now(timezone.utc).isoformat(),
    }

@app.post("/summarise")
async def summarise_document(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
        
    file_bytes = await file.read()
    filename = file.filename
    content_type = file.content_type

    async def generate():
        import io
        start_time = time.time()
        s3_key = None
        try:
            yield json.dumps({"processing_status": "uploading"}) + "\n"

            # Step 1: Try in-memory extraction first (no S3 round-trip)
            extracted_text, extraction_method = await asyncio.to_thread(extract_text_from_bytes, file_bytes)

            yield json.dumps({"processing_status": "extracting"}) + "\n"

            if extraction_method == "needs_textract":
                # Scanned PDF: upload to S3 then run Textract
                s3_client = get_s3_client()
                unique_filename = f"{uuid.uuid4()}_{filename}"
                s3_key = f"uploads/{unique_filename}"
                await asyncio.to_thread(
                    lambda: s3_client.upload_fileobj(
                        io.BytesIO(file_bytes), "mandamus-cases", s3_key,
                        ExtraArgs={"ContentType": content_type or "application/pdf"}
                    )
                )
                extracted_text, extraction_method = await asyncio.to_thread(extract_text_via_textract, s3_key)
            else:
                # Digital PDF: upload to S3 in background (for audit trail) without blocking
                s3_client = get_s3_client()
                unique_filename = f"{uuid.uuid4()}_{filename}"
                s3_key = f"uploads/{unique_filename}"
                asyncio.create_task(asyncio.to_thread(
                    lambda: s3_client.upload_fileobj(
                        io.BytesIO(file_bytes), "mandamus-cases", s3_key,
                        ExtraArgs={"ContentType": content_type or "application/pdf"}
                    )
                ))

            yield json.dumps({"processing_status": "summarising"}) + "\n"
            bedrock_result = await asyncio.to_thread(summarise_with_bedrock, extracted_text)

            if "error" in bedrock_result:
                raise Exception(f"Bedrock Error: {bedrock_result['error']}")

            yield json.dumps({"processing_status": "structuring"}) + "\n"

            processing_time = round(time.time() - start_time, 2)
            final_response = {
                "processing_status": "complete",
                **bedrock_result,
                "s3_key": s3_key or "",
                "extraction_method": extraction_method,
                "processing_time": processing_time
            }
            yield json.dumps(final_response) + "\n"

        except Exception as e:
            yield json.dumps({"processing_status": "failed", "error": str(e)}) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")

# Generate embeddings for precedents_db using AWS Titan — cached to disk
EMBEDDINGS_CACHE = "precedents_embeddings_cache.json"
precedents_embeddings = []

def _load_or_generate_embeddings():
    global precedents_embeddings
    # Check if cache exists and matches current db
    if os.path.exists(EMBEDDINGS_CACHE):
        try:
            with open(EMBEDDINGS_CACHE, "r") as f:
                cached = json.load(f)
            if len(cached) == len(precedents_db):
                precedents_embeddings = cached
                logger.info(f"Loaded {len(cached)} embeddings from disk cache.")
                return
        except Exception:
            pass

    logger.info("Generating AWS Titan embeddings (first run — will cache to disk)...")
    bedrock_embed = boto3.client(
        "bedrock-runtime",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION")
    )
    results = []
    for c in precedents_db:
        text_to_embed = f"{c['case_name']} {c['full_text']} {' '.join(c.get('tags', []))}"
        response = bedrock_embed.invoke_model(
            body=json.dumps({"inputText": text_to_embed}),
            modelId="amazon.titan-embed-text-v2:0",
            accept="application/json",
            contentType="application/json"
        )
        embedding = json.loads(response.get('body').read()).get('embedding')
        results.append({"case": c, "embedding": embedding})
    with open(EMBEDDINGS_CACHE, "w") as f:
        json.dump(results, f)
    precedents_embeddings = results
    logger.info(f"Generated and cached {len(results)} embeddings.")

try:
    _load_or_generate_embeddings()
except Exception as e:
    logger.error(f"Failed to generate AWS embeddings: {e}")

def cosine_sim(v1, v2):
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a * a for a in v1))
    norm_b = math.sqrt(sum(b * b for b in v2))
    return dot_product / (norm_a * norm_b)

class PrecedentSearchRequest(BaseModel):
    query: str
    court_level: str
    temporal_window: str
    case_type: Optional[str] = None
    key_facts: Optional[List[str]] = None
    ipc_sections: Optional[List[str]] = None
    core_legal_questions: Optional[List[str]] = None

@app.post("/precedent/search")
async def search_precedent(request: PrecedentSearchRequest):
    try:
        bedrock = get_bedrock_client()
        
        # Construct richer query and add strict filtering instructions
        court_filter = f"STRICTLY return ONLY cases from {request.court_level} level." if request.court_level != "ALL" else ""
        time_filter = "STRICTLY return ONLY cases from the LAST 5 YEARS (2019-2025)." if request.temporal_window == "LAST_5Y" else ""
        
        rich_query = request.query
        if request.case_type or request.key_facts or request.ipc_sections or request.core_legal_questions:
            facts = " ".join(request.key_facts) if request.key_facts else ""
            laws = ", ".join(request.ipc_sections) if request.ipc_sections else ""
            questions = " ".join(request.core_legal_questions) if request.core_legal_questions else ""
            rich_query = f"Case type: {request.case_type}. Facts: {facts}. Relevant laws: {laws}. Legal questions: {questions}"

        prompt = f"""You are a senior Indian legal expert. Given this case context: {rich_query}

SEARCH FILTERS:
1. COURT LEVEL: {request.court_level} ({court_filter if court_filter else "Any level: Supreme, High Court, or District"})
2. TIME WINDOW: {request.temporal_window} ({time_filter if time_filter else "Any year"})

Return ONLY a valid JSON array of exactly 10 real Indian court cases that match the context AND follow the SEARCH FILTERS strictly. No fake cases.

For each case return:
- case_name (exact real case name)
- citation (real AIR or SCC citation)
- court (Supreme Court / High Court name)
- year (real year as number)
- outcome_summary (one sentence — what court decided)
- reason_for_match (one sentence — specifically why this matches the query case)
- ipc_sections (array of relevant IPC/CrPC/IT Act sections)
- tags (array of 3-4 legal concept tags)
- similarity_score (number 85-99)
- semantic_match (number 85-99)
- full_text_match (number 70-95)

Sort by similarity_score descending.
Return only the JSON array. No explanation. No markdown."""

        response = bedrock.converse(
            modelId="us.amazon.nova-pro-v1:0",
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 2000, "temperature": 0.0}
        )
        
        raw_text = response['output']['message']['content'][0]['text'].strip()
        
        # Clean markdown if present
        if raw_text.startswith("```json"):
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1].split("```")[0].strip()
            
        try:
            results = json.loads(raw_text)
            # Ensure case_id exists for frontend tracking
            for i, r in enumerate(results):
                r["case_id"] = f"PREC-{r.get('year', 2024)}-{i}"
            return {"results": results}
        except json.JSONDecodeError:
            logger.error(f"Failed to parse LLM response: {raw_text}")
            raise HTTPException(status_code=500, detail="Failed to parse legal intelligence output. Please retry.")

    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Cache for frequency data
precedent_frequency_cache = {}

def fetch_and_cache_frequency():
    global precedent_frequency_cache
    try:
        bedrock = get_bedrock_client()
        prompt = """Return ONLY a valid JSON object representing Indian court case volume data from 1990 to 2025 for the following courts: supreme_court, bombay_hc, delhi_hc, orissa_hc, patna_hc. Each court should have an array of 36 numbers (one per year 1990-2025) representing realistic case volume counts. Supreme Court should range 20-140, High Courts 10-80. Show realistic growth trend — low in 1990s, growing through 2000s, peak around 2022-2023, slight drop 2024-2025. Also include all_courts array which is sum of all courts per year. Return only JSON, no extra text."""
        
        response = bedrock.converse(
            modelId="us.amazon.nova-pro-v1:0",
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 2000, "temperature": 0.0}
        )
        raw_text = response['output']['message']['content'][0]['text'].strip()
        
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].split("```")[0].strip()
            
        data = json.loads(raw_text)
        precedent_frequency_cache = {
            "years": list(range(1990, 2026)),
            "courts": data
        }
        logger.info("Successfully cached precedent frequency data from AI.")
    except Exception as e:
        logger.error(f"Failed to cache frequency data: {e}. Falling back to dynamic generator.")
        # Fallback to mathematical generation
        years = list(range(1990, 2026))
        def gen(base, mult):
            return [int((base + i*i*mult) * (0.8 if y==2024 else 0.6 if y==2025 else 1.0)) for i, y in enumerate(years)]
        precedent_frequency_cache = {
            "years": years,
            "courts": {
                "supreme_court": gen(20, 0.1),
                "bombay_hc": gen(15, 0.08),
                "delhi_hc": gen(12, 0.07),
                "orissa_hc": gen(8, 0.05),
                "patna_hc": gen(10, 0.06),
                "all_courts": gen(65, 0.36)
            }
        }

# Execute cache on startup
fetch_and_cache_frequency()

@app.get("/precedent/frequency")
async def get_precedent_frequency():
    if not precedent_frequency_cache:
        fetch_and_cache_frequency()
    return precedent_frequency_cache

class DraftRequest(BaseModel):
    query: str
    selected_cases: list
    summary: dict = {}
    draft_type: str = "Petition"

class ValidateRequest(BaseModel):
    draft_sections: list
    summary: dict = {}
    selected_cases: list

@app.post("/draft/generate")
async def generate_draft(request: DraftRequest):
    try:
        bedrock = get_bedrock_client()
        
        precedents_context = ""
        for i, c in enumerate(request.selected_cases):
            reasoning = c.get('reason_for_match', '')
            precedents_context += f"{i+1}. {c.get('case_name')} ({c.get('year')}) - {c.get('citation')}\nOutcome: {c.get('outcome_summary')}\nRelevance: {reasoning}\n\n"

        summary_json = json.dumps(request.summary, indent=2)

        prompt = f"""You are a senior Indian legal advocate. Generate a formal {request.draft_type} based on the following:

CASE SUMMARY & EXTRACTED DATA:
{summary_json}

PRIMARY LEGAL QUESTION:
{request.query}

SELECTED PRECEDENTS TO APPLY:
{precedents_context}

Return ONLY a valid JSON object with a 'sections' key. Each section in the array must have:
- num (string, e.g., 'I.', 'II.')
- title (string)
- body (string, the detailed legal text)
- refs (array of strings, citations or exhibits mentioned in that section)

You MUST include these exact sections in this order, formatted properly for a {request.draft_type}:
1. Statement of Facts (drawn accurately from the CASE SUMMARY)
2. Issues Presented
3. Legal Framework (mentioning relevant IPC/CrPC/IT Act sections from the summary)
4. Arguments
5. Precedent Support (integrate the SELECTED PRECEDENTS with clear relevance reasoning)
6. Final Relief/Judgment

Keep the tone formal, academic, and highly professional. Return only the JSON, no markdown, no explanation."""

        response = bedrock.converse(
            modelId="us.amazon.nova-pro-v1:0",
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 4000, "temperature": 0.1}
        )
        
        raw_text = response['output']['message']['content'][0]['text'].strip()
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].split("```")[0].strip()
            
        data = json.loads(raw_text)
        return data

    except Exception as e:
        logger.error(f"Drafting error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/draft/validate")
async def validate_draft(request: ValidateRequest):
    try:
        bedrock = get_bedrock_client()
        
        draft_text = ""
        for s in request.draft_sections:
            draft_text += f"[{s.get('title')}]\n{s.get('body')}\n\n"

        summary_json = json.dumps(request.summary)
        cases_json = json.dumps([c.get('case_name') for c in request.selected_cases])

        prompt = f"""You are a senior legal reviewer. Evaluate this generated legal draft against the original facts and precedents.

ORIGINAL CASE SUMMARY:
{summary_json}

SELECTED PRECEDENTS:
{cases_json}

GENERATED DRAFT:
{draft_text}

Evaluate the draft and return ONLY a valid JSON object with the following structure:
{{
  "scores": {{
    "LEGAL_LOGIC": <number 0-100>,
    "PRECEDENT_MATCH": <number 0-100>,
    "FACTUAL_CONSISTENCY": <number 0-100>
  }},
  "inconsistencies": [
    <array of short strings highlighting specific factual errors or weak reasoning>
  ],
  "suggestions": [
    <array of short strings suggesting improvements or missing legal framework>
  ]
}}

Keep inconsistencies and suggestions brief and actionable (max 3 each). Return only the JSON, no markdown."""

        response = bedrock.converse(
            modelId="us.amazon.nova-pro-v1:0",
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 1000, "temperature": 0.0}
        )
        
        raw_text = response['output']['message']['content'][0]['text'].strip()
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].split("```")[0].strip()
            
        data = json.loads(raw_text)
        return data

    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class ReadinessRequest(BaseModel):
    summariser_status: str
    selected_precedents: list
    draft_status: str

@app.post("/scheduler/readiness")
async def get_readiness(request: ReadinessRequest):
    score = 0
    missing = []
    prereqs = []
    
    if request.summariser_status == "complete":
        score += 25
        prereqs.append("Summariser Complete")
    else:
        missing.append("Case parsing incomplete")
        
    if request.selected_precedents and len(request.selected_precedents) > 0:
        score += 25
        prereqs.append("Precedents Selected")
    else:
        missing.append("No precedents linked")
        
    if request.draft_status == "approved":
        score += 25
        prereqs.append("Draft Approved")
    else:
        missing.append("Draft pending approval")
        
    # Default parties confirmed for demo purposes
    score += 25
    prereqs.append("Parties Confirmed")
    
    status = "OPTIMAL" if score == 100 else "REVIEW" if score >= 50 else "CRITICAL"
    
    return {
        "score": score,
        "status": status,
        "missing_items": missing,
        "prerequisites_met": prereqs
    }

class SlotRequest(BaseModel):
    case_id: str
    case_type: str
    pending_duration: str
    is_undertrial: bool

@app.post("/scheduler/slots")
async def generate_slots(request: SlotRequest):
    try:
        bedrock = get_bedrock_client()
        today = datetime.now().strftime("%B %d, %Y")
        
        prompt = f"""You are a court scheduling AI for Indian judiciary. Given this case:
Case: {request.case_id}
Type: {request.case_type}
Pending: {request.pending_duration}
Priority: {request.is_undertrial}
Today's date: {today}

Generate exactly 3 hearing slot recommendations as JSON array.
Each slot must have:
- slot_id (PRIORITY_ALPHA, SECONDARY_BETA, TERTIARY_GAMMA)
- date (realistic future date within next 30 days, formatted as MMMM DD YYYY)
- time (realistic court time like 09:30 AM IST)
- courtroom (realistic like COURTROOM 4B or VIRTUAL CHAMBER 9)
- reason (one sentence why this slot was selected)
- is_virtual (boolean)
- has_conflict (boolean — make first slot have a conflict)
- conflict_reason (if has_conflict, explain why like counsel unavailable)
- alternative_slots (if has_conflict, array of 2 alternative date-time strings)

Return only valid JSON array. No extra text."""

        response = bedrock.converse(
            modelId="us.amazon.nova-pro-v1:0",
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 2000, "temperature": 0.2}
        )
        
        raw_text = response['output']['message']['content'][0]['text'].strip()
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].split("```")[0].strip()
            
        data = json.loads(raw_text)
        return data

    except Exception as e:
        logger.error(f"Slot generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/scheduler/calendar")
async def get_calendar():
    import calendar
    now = datetime.now()
    month_name = now.strftime("%B %Y").upper()
    
    # Generate days for the current month
    cal = calendar.monthcalendar(now.year, now.month)
    days = []
    for week in cal:
        for day in week:
            if day == 0:
                days.append({"n": "", "dim": True})
            else:
                days.append({
                    "n": day, 
                    "dim": False, 
                    "today": day == now.day
                })
                
    # Restructure into rows of 7
    rows = []
    for i in range(0, len(days), 7):
        rows.append(days[i:i+7])
        
    return {
        "current_month": month_name,
        "year": now.year,
        "days": rows
    }

@app.get("/scheduler/adjournments")
async def get_adjournments(case_id: str):
    try:
        bedrock = get_bedrock_client()
        prompt = f"""Generate a realistic adjournment history for case {case_id} with 3-4 past adjournment entries.
Each entry must have:
- date (past date formatted as MMM DD, YYYY)
- title (type of adjournment like Motion to Suppress, Standard Continuance, Service Extension)
- description (one sentence reason)
- status (GRANTED or DENIED)
Return only valid JSON array."""

        response = bedrock.converse(
            modelId="us.amazon.nova-pro-v1:0",
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 1000, "temperature": 0.4}
        )
        
        raw_text = response['output']['message']['content'][0]['text'].strip()
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].split("```")[0].strip()
            
        data = json.loads(raw_text)
        return data

    except Exception as e:
        logger.error(f"Adjournment history error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class ConfirmSlotRequest(BaseModel):
    case_id: str
    slot: dict

@app.post("/scheduler/confirm")
async def confirm_slot(request: ConfirmSlotRequest):
    try:
        # In a real app, save to database
        return {"status": "success", "message": "Slot successfully confirmed."}
    except Exception as e:
        logger.error(f"Slot confirmation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    message: str
    summary: dict = {}
    history: List[dict] = []

@app.post("/chat")
async def chat_with_legal_ai(request: ChatRequest):
    try:
        bedrock = get_bedrock_client()
        
        # Build context from summary
        summary_ctx = f"Case: {request.summary.get('caseName', 'Unknown')}\n"
        summary_ctx += f"Facts: {', '.join(request.summary.get('facts', []))}\n"
        summary_ctx += f"Legal Questions: {', '.join(request.summary.get('legalQuestions', []))}\n"
        
        # Build prompt with history
        history_str = ""
        for h in request.history[-5:]: # Last 5 exchanges
            role = "Assistant" if h['role'] == 'assistant' else "User"
            history_str += f"{role}: {h['content']}\n"
            
        prompt = f"""You are a senior Indian legal AI assistant. Use the following case context to answer the user's question accurately.
        
CASE CONTEXT:
{summary_ctx}

CONVERSATION HISTORY:
{history_str}

USER QUESTION: {request.message}

STRICT GUIDELINES:
1. Provide legally sound, professional advice based ONLY on the provided context and general Indian law (IPC, CrPC, etc.).
2. Keep the tone formal, concise, and helpful.
3. If the question is unrelated to the case or law, politely redirect.
4. Do NOT hallucinate section numbers if they are not in context or definitely part of the law.

Return ONLY the response text."""

        response = bedrock.converse(
            modelId="us.amazon.nova-pro-v1:0",
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 1000, "temperature": 0.2}
        )
        
        reply = response['output']['message']['content'][0]['text'].strip()
        return {"reply": reply}

    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class AdjournmentReqModel(BaseModel):
    case_id: str
    reason: str
    notes: Optional[str] = None
    requested_date: str

@app.post("/scheduler/adjournment")
async def request_adjournment(request: AdjournmentReqModel):
    try:
        bedrock = get_bedrock_client()
        prompt = f"""Given adjournment reason: {request.reason}
Notes: {request.notes}
Requested date: {request.requested_date}
for case: {request.case_id}
Return ONLY a JSON object with:
- approved (boolean — 70% chance true)
- new_suggested_date (string, if approved, either the requested date or a realistic alternative)
- rejection_reason (string, if not approved, why it was denied)
- formal_order_text (string, one paragraph formal court language about this adjournment decision)
Return only valid JSON object."""

        response = bedrock.converse(
            modelId="us.amazon.nova-pro-v1:0",
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 1000, "temperature": 0.7}
        )
        
        raw_text = response['output']['message']['content'][0]['text'].strip()
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].split("```")[0].strip()
            
        data = json.loads(raw_text)
        return data

    except Exception as e:
        logger.error(f"Adjournment request error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Get port from environment variable (for cloud deployment) or default to 8000
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
