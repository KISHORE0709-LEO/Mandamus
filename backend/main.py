import os
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

# Enable CORS for localhost:5173
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    
    system_prompt = (
        "You are a legal document analyser for Indian courts. "
        "Extract information and return ONLY a valid JSON object with no extra text, no markdown, no backticks. "
        "Fields required: case_id (string), court_name (string), petitioner (string), petitioner_counsel (string), "
        "respondent (string), respondent_counsel (string), filing_date (string), pending_duration (string), "
        "key_facts (array of 3-5 strings), ipc_sections (array of objects with section and description fields), "
        "core_legal_questions (array of strings), evidence (array of strings), case_type (string like CRIMINAL_PETITION), "
        "is_undertrial (boolean), confidence_score (number between 0-100), "
        "argument_strength (object with petitioner and respondent numeric values 0-100), "
        "procedural_path (array of up to 3 objects with date and event strings), "
        "case_outcome_analysis (object with title, probability_score number, description string, and key_insight string), "
        "student_mode (object with key_facts array of simple strings, legal_questions array of simple strings, and outcome_explanation simple string)."
    )
    
    try:
        response = bedrock.converse(
            modelId="us.amazon.nova-pro-v1:0",
            messages=[
                {
                    "role": "user",
                    "content": [{"text": f"System Guidelines: {system_prompt}\n\nDocument Text:\n{extracted_text}"}]
                }
            ],
            inferenceConfig={"maxTokens": 4096}
        )
        
        result_text = response['output']['message']['content'][0]['text']
        
        # Clean up any potential markdown formatting
        if result_text.startswith("```json"):
            result_text = result_text.replace("```json\n", "").replace("\n```", "")
        elif result_text.startswith("```"):
            result_text = result_text.replace("```\n", "").replace("\n```", "")
            
        return json.loads(result_text.strip())
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from Bedrock response: {str(e)}")
        return {"error": "Failed to parse JSON response from the model."}
    except Exception as e:
        logger.error(f"Error calling Bedrock: {str(e)}")
        return {"error": f"Failed to connect to AWS Bedrock: {str(e)}"}

def extract_text(s3_key: str) -> str:
    s3_client = get_s3_client()
    bucket_name = "mandamus-cases"
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        temp_path = tmp_file.name
    
    try:
        # Download from S3
        s3_client.download_file(bucket_name, s3_key, temp_path)
        
        # Try PyMuPDF
        extracted_text = ""
        try:
            doc = fitz.open(temp_path)
            for page in doc:
                extracted_text += page.get_text() + "\n"
            doc.close()
        except Exception as e:
            logger.warning(f"PyMuPDF extraction failed: {e}")
            
        if len(extracted_text.strip()) >= 100:
            logger.info("Extracted text using PyMuPDF")
            return extracted_text.strip(), "pymupdf"
            
        # Fall back to AWS Textract
        logger.info("Falling back to AWS Textract")
        textract_client = get_textract_client()
        
        response = textract_client.start_document_text_detection(
            DocumentLocation={
                'S3Object': {
                    'Bucket': bucket_name,
                    'Name': s3_key
                }
            }
        )
        
        job_id = response['JobId']
        
        # Poll for completion
        while True:
            job_status = textract_client.get_document_text_detection(JobId=job_id)
            status = job_status['JobStatus']
            
            if status in ['SUCCEEDED', 'FAILED']:
                break
            
            time.sleep(2)
            
        if status == 'SUCCEEDED':
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
                    
            extracted_text = "\n".join(text_blocks)
            logger.info("Extracted text using AWS Textract")
            return extracted_text, "textract"
        else:
            raise Exception("AWS Textract job failed")
            
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

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
        start_time = time.time()
        try:
            yield json.dumps({"processing_status": "uploading"}) + "\n"
            
            s3_client = get_s3_client()
            bucket_name = "mandamus-cases"
            unique_filename = f"{uuid.uuid4()}_{filename}"
            s3_key = f"uploads/{unique_filename}"
            
            def upload():
                import io
                s3_client.upload_fileobj(
                    io.BytesIO(file_bytes),
                    bucket_name,
                    s3_key,
                    ExtraArgs={"ContentType": content_type or "application/pdf"}
                )
            await asyncio.to_thread(upload)
            
            yield json.dumps({"processing_status": "extracting"}) + "\n"
            extracted_text, extraction_method = await asyncio.to_thread(extract_text, s3_key)
            
            yield json.dumps({"processing_status": "summarising"}) + "\n"
            bedrock_result = await asyncio.to_thread(summarise_with_bedrock, extracted_text)
            
            if "error" in bedrock_result:
                raise Exception(f"Bedrock Error: {bedrock_result['error']}")
                
            yield json.dumps({"processing_status": "structuring"}) + "\n"
            
            processing_time = round(time.time() - start_time, 2)
            final_response = {
                "processing_status": "complete",
                **bedrock_result,
                "s3_key": s3_key,
                "extraction_method": extraction_method,
                "processing_time": processing_time
            }
            yield json.dumps(final_response) + "\n"
            
        except Exception as e:
            yield json.dumps({"processing_status": "failed", "error": str(e)}) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")

# Generate embeddings for precedents_db using AWS Titan
precedents_embeddings = []
try:
    bedrock_embed = boto3.client(
        "bedrock-runtime",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION")
    )
    logger.info("Generating AWS Titan embeddings for precedents database...")
    for c in precedents_db:
        text_to_embed = f"{c['case_name']} {c['full_text']} {' '.join(c.get('tags', []))}"
        response = bedrock_embed.invoke_model(
            body=json.dumps({"inputText": text_to_embed}),
            modelId="amazon.titan-embed-text-v2:0",
            accept="application/json",
            contentType="application/json"
        )
        response_body = json.loads(response.get('body').read())
        embedding = response_body.get('embedding')
        precedents_embeddings.append({"case": c, "embedding": embedding})
    logger.info("Successfully generated embeddings for all cases.")
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
        
        # Construct richer query if structured data is provided
        rich_query = request.query
        if request.case_type or request.key_facts or request.ipc_sections or request.core_legal_questions:
            facts = " ".join(request.key_facts) if request.key_facts else ""
            laws = ", ".join(request.ipc_sections) if request.ipc_sections else ""
            questions = " ".join(request.core_legal_questions) if request.core_legal_questions else ""
            rich_query = f"Case type: {request.case_type}. Facts: {facts}. Relevant laws: {laws}. Legal questions: {questions}"

        prompt = f"""You are a senior Indian legal expert with knowledge of all Supreme Court and High Court judgments. Given this case summary: {rich_query}

Return ONLY a valid JSON array of exactly 5 real Indian court cases most legally similar to this case. No fake cases. Only real judgments that exist.

For each case return:
- case_name (exact real case name)
- citation (real AIR or SCC citation)
- court (Supreme Court / High Court name)
- year (real year as number)
- outcome_summary (one sentence — what court decided)
- reason_for_match (one sentence — specifically why this matches the query case — mention shared IPC sections, similar facts, or matching legal concepts)
- ipc_sections (array of relevant IPC/CrPC/IT Act sections)
- tags (array of 3-4 legal concept tags in uppercase like ASSET_DIVERSION, FIDUCIARY_BREACH)
- similarity_score (number 85-99, assign higher score to closer matches)
- semantic_match (number 85-99)
- full_text_match (number 70-95)

Sort by similarity_score descending.
Return only the JSON array. No explanation. No markdown. No backticks."""

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
        record = {
            "case_id": request.case_id,
            "slot": request.slot,
            "confirmed_at": datetime.now(timezone.utc).isoformat()
        }
        
        file_path = "confirmed_hearings.json"
        existing = []
        if os.path.exists(file_path):
            with open(file_path, "r") as f:
                existing = json.load(f)
                
        existing.append(record)
        
        with open(file_path, "w") as f:
            json.dump(existing, f, indent=2)
            
        return {"status": "success", "message": "Slot successfully confirmed and saved."}
    except Exception as e:
        logger.error(f"Slot confirmation error: {str(e)}")
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
    # Run the server on port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
