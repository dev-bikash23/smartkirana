import os
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

from jose import jwt, JWTError
import bcrypt
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer

# ---------------------------------------------------------------------------
# Config — override with environment variables in production
# ---------------------------------------------------------------------------
SECRET_KEY = os.environ.get("SECRET_KEY", "smartkirana-super-secret-jwt-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30   # 30 days — users stay logged in

SMTP_USER     = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# OTP helpers
# ---------------------------------------------------------------------------

def generate_otp() -> str:
    """Generate a secure 6-digit one-time password."""
    return str(random.randint(100000, 999999))


def send_otp_email(to_email: str, name: str, otp: str) -> bool:
    """
    Send OTP verification email via Gmail SMTP.

    Environment variables required on Render:
        SMTP_USER     = your Gmail address  (e.g. yourshop@gmail.com)
        SMTP_PASSWORD = Gmail App Password  (16-char, no spaces)

    If env vars are not set (local dev), the OTP is printed to the server
    console instead of being emailed — so you can still test the flow.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        # ── Dev mode: print OTP to console ──────────────────────────────
        print(f"\n{'=' * 52}")
        print(f"  [DEV MODE] OTP Email — NOT sent (SMTP not configured)")
        print(f"  To      : {to_email}")
        print(f"  OTP Code: {otp}")
        print(f"  (Valid for 10 minutes)")
        print(f"{'=' * 52}\n")
        return True  # Treat as success so the flow continues

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"SmartKirana — Verify Your Email: {otp}"
        msg["From"]    = f"SmartKirana <{SMTP_USER}>"
        msg["To"]      = to_email

        html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#F4F3FF;">
  <div style="max-width:520px;margin:32px auto;padding:0 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6C63FF,#4F46E5);border-radius:20px 20px 0 0;padding:28px 32px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">📦</div>
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 4px;">SmartKirana</h1>
      <p style="color:rgba(255,255,255,0.75);font-size:12px;margin:0;">AI-Powered Grocery Intelligence</p>
    </div>

    <!-- Body -->
    <div style="background:#fff;padding:32px;border-left:1px solid #E8EDFF;border-right:1px solid #E8EDFF;">
      <h2 style="color:#1A1433;font-size:18px;font-weight:700;margin:0 0 10px;">Hello, {name}! 👋</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Thanks for signing up! Use the verification code below to complete your SmartKirana registration.
        This code expires in <strong>10 minutes</strong>.
      </p>

      <!-- OTP Box -->
      <div style="background:linear-gradient(135deg,#F4F3FF,#EAE8FF);border:2px solid rgba(108,99,255,0.22);border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
        <p style="color:#9990CC;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">Your Verification Code</p>
        <p style="color:#6C63FF;font-size:48px;font-weight:900;letter-spacing:14px;margin:0;font-family:'Courier New',monospace;">{otp}</p>
        <p style="color:#9990CC;font-size:11px;margin:12px 0 0;">⏱&nbsp; Expires in 10 minutes</p>
      </div>

      <p style="color:#94A3B8;font-size:12px;margin:0;">
        If you didn't create a SmartKirana account, you can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#F8F7FF;border-radius:0 0 20px 20px;border:1px solid #E8EDFF;border-top:none;padding:16px 32px;text-align:center;">
      <p style="color:#C4BFEE;font-size:11px;margin:0;">© 2026 SmartKirana &nbsp;·&nbsp; Secure Authentication</p>
    </div>

  </div>
</body>
</html>
"""
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to_email, msg.as_string())

        print(f"[EMAIL] OTP sent to {to_email}")
        return True

    except Exception as exc:
        print(f"[EMAIL ERROR] Failed to send to {to_email}: {exc}")
        return False
