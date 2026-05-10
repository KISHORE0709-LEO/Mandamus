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
    
    print(f"\n{'='*20} JUDICIAL OTP GENERATED {'='*20}")
    print(f"FOR EMAIL: {request.email}")
    print(f"OTP CODE : {otp_code}")
    print(f"{'='*60}\n")
    
    # Send Email synchronously to catch errors immediately
    success = email_service.send_otp_email(request.email, otp_code)
    
    if not success:
        # In development/local testing, we include the OTP in the error message if email fails
        # This prevents the user from being blocked if Resend API has issues
        return {
            "status": "partial_success", 
            "message": "Email service unavailable. OTP displayed for development purposes.",
            "dev_otp": otp_code 
        }
    
    return {"status": "success", "message": "OTP sent successfully"}

@router.post("/verify")
async def verify_otp(request: OtpVerifyRequest):
    is_valid = await otp_repository.verify_otp(request.email, request.code)
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")
    
    return {"status": "success", "message": "Identity verified"}
