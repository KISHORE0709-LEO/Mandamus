import resend
import os

def send_otp_email(to_email, otp_code):
    api_key = os.getenv("RESEND_API_KEY")
    
    if not api_key:
        print("\n" + "="*50)
        print(f"RESEND API KEY MISSING. FALLBACK TO DEBUG CONSOLE.")
        print(f"DEBUG OTP FOR: {to_email}")
        print(f"CODE: {otp_code}")
        print("="*50 + "\n")
        return True

    try:
        resend.api_key = api_key

        params = {
            "from": "Mandamus OTP <onboarding@resend.dev>",
            "to": [to_email],
            "subject": "Mandamus Virtual Court - Identity Verification OTP",
            "html": f"""
            <html>
            <body style="font-family: 'Inter', Arial, sans-serif; background-color: #000; color: #fff; padding: 40px;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #111; padding: 40px; border-radius: 12px; border: 1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #e02020; margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;">MANDAMUS</h1>
                        <p style="color: #666; font-size: 12px; margin-top: 5px;">JUDICIAL INTELLIGENCE LOBBY</p>
                    </div>
                    
                    <p style="font-size: 16px; color: #ccc; line-height: 1.6; text-align: center;">
                        To complete your identity verification for the scheduled virtual hearing, please use the following one-time password:
                    </p>
                    
                    <div style="font-size: 42px; font-weight: 800; color: #fff; text-align: center; letter-spacing: 10px; margin: 40px 0; padding: 25px; background: rgba(224, 32, 32, 0.05); border: 1px solid rgba(224, 32, 32, 0.2); border-radius: 8px;">
                        {otp_code}
                    </div>
                    
                    <p style="font-size: 13px; color: #666; text-align: center; margin-bottom: 0;">
                        This code will expire in 10 minutes.<br/>
                        If you did not request this, please ignore this email.
                    </p>
                </div>
            </body>
            </html>
            """
        }

        email = resend.Emails.send(params)
        print(f"Resend Email Sent: {email}")
        return True
    except Exception as e:
        print(f"Resend Error: {e}")
        # Fallback to console
        print(f"OTP FALLBACK FOR {to_email}: {otp_code}")
        return False
