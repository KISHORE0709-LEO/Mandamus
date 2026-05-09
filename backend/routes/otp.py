from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import random
from mongodb import otp_repository
from services import email_service

router = APIRouter(prefix="/virtual-hearing/otp", tags=["Verification"])

class OtpRequest(BaseModel):
    email: str

class OtpVerifyRequest(BaseModel):
    email: str
    code: str

@router.post("/send")
async def send_otp(request: OtpRequest, background_tasks: BackgroundTasks):
    print(f"OTP REQUEST RECEIVED FOR: {request.email}")
    otp_code = "".join([str(random.randint(0, 9)) for _ in range(6)])
    
    # Save to MongoDB
    await otp_repository.create_otp(request.email, otp_code)
    
    # Send Email synchronously to catch errors immediately
    success = email_service.send_otp_email(request.email, otp_code)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email. Check if your SMTP credentials are correct.")
    
    return {"status": "success", "message": "OTP sent successfully"}

@router.post("/verify")
async def verify_otp(request: OtpVerifyRequest):
    is_valid = await otp_repository.verify_otp(request.email, request.code)
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")
    
    return {"status": "success", "message": "Identity verified"}
