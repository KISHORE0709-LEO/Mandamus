import os
import json
import asyncio
from typing import List
from mongodb import transcript_repository, summary_repository, context_repository
import boto3

def get_bedrock_client():
    return boto3.client(
        "bedrock-runtime",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION")
    )

async def generate_hearing_intelligence(hearing_id: str):
    # 1. Fetch transcript from MongoDB
    transcript_doc = await transcript_repository.get_transcript(hearing_id)
    if not transcript_doc or not transcript_doc.get("transcript"):
        return {"error": "Transcript not found or empty"}

    case_id = transcript_doc["case_id"]
    transcript_text = "\n".join([f"[{u['timestamp']}] {u['speaker_name']} ({u['speaker_role']}): {u['text']}" for u in transcript_doc["transcript"]])

    # 2. Prepare prompt for Bedrock Nova Pro
    prompt = f"""You are a Legal Intelligence AI for the Mandamus Virtual Court. 
    Analyze the following hearing transcript and generate a structured intelligence summary.
    
    TRANSCRIPT:
    {transcript_text}
    
    Return ONLY JSON format:
    {{
        "hearing_id": "{hearing_id}",
        "case_id": "{case_id}",
        "summary": "Concise 3-5 sentence summary of the hearing proceedings.",
        "key_points": ["Point 1", "Point 2"],
        "judge_observations": ["Observation 1"],
        "important_arguments": ["Argument 1"],
        "participants_present": ["Name (Role)"],
        "legal_implications": "Brief legal analysis of today's outcome."
    }}"""

    # 3. Call Bedrock Nova Pro
    try:
        bedrock = get_bedrock_client()
        body = json.dumps({
            "inferenceConfig": {"max_new_tokens": 2000, "temperature": 0.1},
            "messages": [{"role": "user", "content": [{"text": prompt}]}]
        })
        
        response = await asyncio.to_thread(
            bedrock.invoke_model,
            body=body,
            modelId="amazon.nova-pro-v1:0",
            accept="application/json",
            contentType="application/json"
        )
        
        resp_body = json.loads(response.get('body').read())
        resp_text = resp_body['output']['message']['content'][0]['text'].strip()
        
        # Clean JSON
        if "```json" in resp_text:
            resp_text = resp_text.split("```json")[1].split("```")[0].strip()
        
        summary_data = json.loads(resp_text)
        
        # 4. Save summary to MongoDB
        await summary_repository.save_hearing_summary(summary_data)
        
        # 5. Update Case Context Memory
        await context_repository.update_case_context(case_id, summary_data)
        
        return summary_data
        
    except Exception as e:
        print(f"ERROR in hearing summary: {str(e)}")
        # FALLBACK: Ensure MongoDB collections are populated even if AWS fails
        fallback_data = {
            "hearing_id": hearing_id,
            "case_id": case_id,
            "summary": f"System fallback summary. AWS AI generation failed.",
            "key_points": ["Review transcript manually."],
            "judge_observations": ["System error occurred during inference."],
            "important_arguments": [],
            "participants_present": [],
            "legal_implications": "Requires manual review."
        }
        try:
            await summary_repository.save_hearing_summary(fallback_data)
            await context_repository.update_case_context(case_id, fallback_data)
        except Exception as nested_e:
            print(f"Failed to write fallback to MongoDB: {nested_e}")
            
        return {"error": str(e), "fallback": fallback_data}
