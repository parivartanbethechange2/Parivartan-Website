"""OTP delivery. Swap in a real SMS provider by implementing send_sms() below.

To go live with Twilio Verify or MSG91:
  1. Add provider credentials to backend/.env (e.g. TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN
     / TWILIO_VERIFY_SERVICE_SID, or MSG91_AUTH_KEY / MSG91_TEMPLATE_ID).
  2. Set SMS_PROVIDER="twilio" (or "msg91") in backend/.env.
  3. Implement the matching branch inside send_sms(). Nothing else in the app changes.
"""
import logging
import os

logger = logging.getLogger(__name__)

SMS_PROVIDER = os.environ.get("SMS_PROVIDER", "dev").lower()
DEV_OTP = os.environ.get("DEV_OTP_CODE", "123456")


def is_live() -> bool:
    return SMS_PROVIDER != "dev"


def send_sms(phone: str, code: str) -> bool:
    if SMS_PROVIDER == "dev":
        logger.info(f"[DEV OTP] phone={phone} code={code}")
        return True
    # if SMS_PROVIDER == "twilio": ...  # implement here
    # if SMS_PROVIDER == "msg91": ...   # implement here
    logger.error(f"SMS provider '{SMS_PROVIDER}' is configured but not implemented.")
    return False
