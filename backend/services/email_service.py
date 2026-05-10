import resend
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_via_smtp(to_email, subject, html_content):
    smtp_user = os.getenv("SMTP_EMAIL")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    
    if not smtp_user or not smtp_pass:
        print("SMTP Fallback failed: Credentials missing.")
        return False
        
    try:
        msg = MIMEMultipart()
        msg['From'] = f"Mandamus Judicial <{smtp_user}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_content, 'html'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        print(f"SMTP Fallback success: Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"SMTP Fallback Error: {e}")
        return False

def send_otp_email(to_email, otp_code):
    api_key = os.getenv("RESEND_API_KEY")
    html = f"""
    <html>
    <body style="font-family: 'Inter', Arial, sans-serif; background-color: #000; color: #fff; padding: 40px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #111; padding: 40px; border-radius: 12px; border: 1px solid #333;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #e02020; margin: 0; font-size: 24px; letter-spacing: 2px;">MANDAMUS</h1>
            </div>
            <p style="font-size: 16px; color: #ccc; text-align: center;">Identity verification OTP:</p>
            <div style="font-size: 42px; font-weight: 800; color: #fff; text-align: center; letter-spacing: 10px; margin: 40px 0;">
                {otp_code}
            </div>
        </div>
    </body>
    </html>
    """
    
    # Try Resend First
    if api_key:
        try:
            resend.api_key = api_key
            resend.Emails.send({
                "from": "Mandamus OTP <onboarding@resend.dev>",
                "to": [to_email],
                "subject": "Mandamus Verification Code",
                "html": html
            })
            print(f"Resend success: OTP sent to {to_email}")
            return True
        except Exception as e:
            print(f"Resend failed, trying SMTP: {e}")
    
    # Fallback to SMTP
    return send_via_smtp(to_email, "Mandamus Verification Code", html)

def send_hearing_invite(to_email, case_name, scheduled_time, join_url):
    api_key = os.getenv("RESEND_API_KEY")
    html = f"""
    <html>
    <body style="font-family: 'Inter', Arial, sans-serif; background-color: #000; color: #fff; padding: 40px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #111; padding: 50px; border-radius: 16px; border: 1px solid #333;">
            <h1 style="color: #fff; margin: 10px 0; font-size: 28px;">Virtual Hearing Invitation</h1>
            <p style="color: #fff; font-size: 18px; margin: 20px 0;">{case_name}</p>
            <p style="color: #ccc; margin-bottom: 40px;">Time: {scheduled_time}</p>
            <a href="{join_url}" style="background-color: #e02020; color: #fff; padding: 18px 45px; border-radius: 4px; text-decoration: none;">Secure Join</a>
        </div>
    </body>
    </html>
    """
    
    # Try Resend First
    if api_key:
        try:
            resend.api_key = api_key
            resend.Emails.send({
                "from": "Mandamus Judicial <court@resend.dev>",
                "to": [to_email],
                "subject": f"Hearing Invitation: {case_name}",
                "html": html
            })
            print(f"Resend success: Invite sent to {to_email}")
            return True
        except Exception as e:
            print(f"Resend failed, trying SMTP: {e}")
            
    # Fallback to SMTP
    return send_via_smtp(to_email, f"Hearing Invitation: {case_name}", html)
