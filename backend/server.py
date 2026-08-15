import hashlib
import logging
import os
import random
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

import requests
from dotenv import load_dotenv
from fastapi import (APIRouter, Cookie, Depends, FastAPI, File, Form, Header,
                     HTTPException, Query, Request, Response, UploadFile)
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response as StarResponse

import sms
from receipts import build_receipt_pdf

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "parivartan"

RAZORPAY_KEY_ID = (os.environ.get("RAZORPAY_KEY_ID") or "").strip()
RAZORPAY_KEY_SECRET = (os.environ.get("RAZORPAY_KEY_SECRET") or "").strip()
RAZORPAY_WEBHOOK_SECRET = (os.environ.get("RAZORPAY_WEBHOOK_SECRET") or "").strip()
PAYMENTS_LIVE = bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)

razor_client = None
if PAYMENTS_LIVE:
    import razorpay

    razor_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

LOGO_PATH = str(Path(__file__).parent.parent / "frontend" / "public" / "logo-512.png")

MEMBERSHIP_FEES = {"annual": 50000, "patron": 500000, "life": 1100000}
MEMBERSHIP_NAMES = {"annual": "Annual Member", "patron": "Patron Member", "life": "Life Member"}
MIN_DONATION = 2000  # ₹20 in paise
MAX_DONATION = 1000000  # ₹10,000 in paise

app = FastAPI(title="Parivartan API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

storage_key = None


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def nid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


# ---------------- Models ----------------
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    auth_method: str = "google"
    role: str = "member"
    phone: Optional[str] = None
    membership_tier: Optional[str] = None
    membership_status: str = "none"
    membership_no: Optional[str] = None
    notify_email: bool = True
    notify_events: bool = True
    notify_newsletter: bool = False
    created_at: str


class SessionIn(BaseModel):
    session_id: str


class Prefs(BaseModel):
    notify_email: bool
    notify_events: bool
    notify_newsletter: bool


class VolunteerIn(BaseModel):
    name: str
    email: EmailStr
    phone: str
    city: str
    skills: str
    availability: str
    interest_area: str
    message: Optional[str] = ""


class MembershipIn(BaseModel):
    tier: str
    name: str
    email: EmailStr
    phone: str
    city: str


class BlogIn(BaseModel):
    title: str
    slug: Optional[str] = None
    category: str
    excerpt: str
    body: str
    tags: List[str] = []
    cover: Optional[str] = None
    author: str = "Parivartan Team"
    published: bool = True


class EventIn(BaseModel):
    title: str
    date: str
    time: str = ""
    location: str
    district: str = ""
    kind: str = "Seminar"
    description: str
    capacity: int = 100
    cover: Optional[str] = None


class CampaignUpdate(BaseModel):
    raised: Optional[float] = None
    goal: Optional[float] = None
    status: Optional[str] = None
    trees_planted: Optional[int] = None


class SubscribeIn(BaseModel):
    email: EmailStr


class DonationIn(BaseModel):
    amount: int = Field(..., description="Amount in paise")
    campaign_id: Optional[str] = None
    donor_name: str
    donor_email: EmailStr
    donor_phone: Optional[str] = ""
    donor_pan: Optional[str] = ""
    message: Optional[str] = ""


class MembershipCheckoutIn(BaseModel):
    tier: str
    donor_name: str
    donor_email: EmailStr
    donor_phone: str
    city: Optional[str] = ""
    donor_pan: Optional[str] = ""


class PaymentConfirmIn(BaseModel):
    payment_id: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None


class OtpRequestIn(BaseModel):
    phone: str


class OtpVerifyIn(BaseModel):
    phone: str
    code: str
    name: Optional[str] = None


# ---------------- Auth helpers ----------------
async def get_user_optional(
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
) -> Optional[User]:
    token = session_token
    if not token and authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
    if not token:
        return None
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        return None
    expires_at = sess["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    doc = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    return User(**doc) if doc else None


async def require_user(user: Optional[User] = Depends(get_user_optional)) -> User:
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


async def require_admin(user: User = Depends(require_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------------- Auth routes ----------------
@api_router.post("/auth/session")
async def create_session(payload: SessionIn, response: Response):
    r = requests.get(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": payload.session_id},
        timeout=30,
    )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    d = r.json()
    email = d["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        update = {"name": d.get("name") or existing["name"], "picture": d.get("picture")}
        if email.lower() in ADMIN_EMAILS and existing.get("role") != "admin":
            update["role"] = "admin"
        await db.users.update_one({"user_id": user_id}, {"$set": update})
    else:
        user_id = nid("user")
        await db.users.insert_one(
            {
                "user_id": user_id,
                "email": email,
                "name": d.get("name") or email.split("@")[0],
                "picture": d.get("picture"),
                "auth_method": "google",
                "role": "admin" if email.lower() in ADMIN_EMAILS else "member",
                "phone": None,
                "membership_tier": None,
                "membership_status": "none",
                "membership_no": None,
                "notify_email": True,
                "notify_events": True,
                "notify_newsletter": False,
                "created_at": now_iso(),
            }
        )
    token = d["session_token"]
    await db.user_sessions.insert_one(
        {
            "user_id": user_id,
            "session_token": token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": now_iso(),
        }
    )
    response.set_cookie(
        "session_token", token, httponly=True, secure=True, samesite="none", path="/", max_age=7 * 24 * 3600
    )
    doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return User(**doc)


@api_router.get("/auth/me", response_model=User)
async def me(user: User = Depends(require_user)):
    return user


@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(default=None)):
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie("session_token", path="/", secure=True, samesite="none")
    return {"ok": True}


@api_router.put("/auth/preferences", response_model=User)
async def set_prefs(prefs: Prefs, user: User = Depends(require_user)):
    await db.users.update_one({"user_id": user.user_id}, {"$set": prefs.model_dump()})
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return User(**doc)


def _set_session_cookie(response: Response, token: str):
    response.set_cookie(
        "session_token", token, httponly=True, secure=True, samesite="none", path="/", max_age=7 * 24 * 3600
    )


def _hash_otp(phone: str, code: str) -> str:
    return hashlib.sha256(f"{phone}:{code}:{APP_NAME}".encode()).hexdigest()


@api_router.post("/auth/phone/request-otp")
async def request_otp(payload: OtpRequestIn):
    phone = "".join(ch for ch in payload.phone if ch.isdigit())[-10:]
    if len(phone) != 10:
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit mobile number")

    window_start = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    recent = await db.otp_codes.count_documents({"phone": phone, "created_at": {"$gte": window_start}})
    if recent >= 3:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Please try again in 10 minutes.")

    code = f"{random.randint(0, 999999):06d}" if sms.is_live() else sms.DEV_OTP
    await db.otp_codes.update_many({"phone": phone, "consumed": False}, {"$set": {"consumed": True}})
    await db.otp_codes.insert_one(
        {
            "id": nid("otp"),
            "phone": phone,
            "code_hash": _hash_otp(phone, code),
            "attempts": 0,
            "consumed": False,
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
            "created_at": now_iso(),
        }
    )
    sms.send_sms(phone, code)
    return {
        "ok": True,
        "phone": phone,
        "sms_live": sms.is_live(),
        "dev_code": None if sms.is_live() else code,
        "message": "OTP sent" if sms.is_live() else "SMS provider not connected — use the development code shown.",
    }


@api_router.post("/auth/phone/verify")
async def verify_otp(payload: OtpVerifyIn, response: Response):
    phone = "".join(ch for ch in payload.phone if ch.isdigit())[-10:]
    rec = await db.otp_codes.find_one({"phone": phone, "consumed": False}, {"_id": 0}, sort=[("created_at", -1)])
    if not rec:
        raise HTTPException(status_code=400, detail="Request a new OTP")
    if datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired. Request a new one.")
    if rec["attempts"] >= 5:
        raise HTTPException(status_code=429, detail="Too many wrong attempts. Request a new OTP.")
    if rec["code_hash"] != _hash_otp(phone, payload.code.strip()):
        await db.otp_codes.update_one({"id": rec["id"]}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Incorrect OTP")

    await db.otp_codes.update_one({"id": rec["id"]}, {"$set": {"consumed": True}})

    existing = await db.users.find_one({"phone": phone}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
    else:
        user_id = nid("user")
        await db.users.insert_one(
            {
                "user_id": user_id,
                "email": f"{phone}@phone.parivartan.local",
                "name": payload.name or f"Member {phone[-4:]}",
                "picture": None,
                "auth_method": "phone",
                "role": "member",
                "phone": phone,
                "membership_tier": None,
                "membership_status": "none",
                "membership_no": None,
                "notify_email": True,
                "notify_events": True,
                "notify_newsletter": False,
                "created_at": now_iso(),
            }
        )

    token = f"ph_{secrets.token_urlsafe(32)}"
    await db.user_sessions.insert_one(
        {
            "user_id": user_id,
            "session_token": token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": now_iso(),
        }
    )
    _set_session_cookie(response, token)
    doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return User(**doc)


# ---------------- Public content ----------------
@api_router.get("/stats")
async def stats():
    doc = await db.site_stats.find_one({"key": "impact"}, {"_id": 0})
    return doc["values"] if doc else {}


@api_router.get("/campaigns")
async def list_campaigns():
    return await db.campaigns.find({}, {"_id": 0}).sort("order", 1).to_list(100)


@api_router.get("/blog")
async def list_blog(category: Optional[str] = None, q: Optional[str] = None, tag: Optional[str] = None):
    query = {"published": True}
    if category and category != "All":
        query["category"] = category
    if tag:
        query["tags"] = tag
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"excerpt": {"$regex": q, "$options": "i"}},
            {"body": {"$regex": q, "$options": "i"}},
        ]
    return await db.blog_posts.find(query, {"_id": 0}).sort("date", -1).to_list(200)


@api_router.get("/blog/{slug}")
async def get_post(slug: str):
    doc = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Post not found")
    return doc


@api_router.get("/events")
async def list_events(user: Optional[User] = Depends(get_user_optional)):
    events = await db.events.find({}, {"_id": 0}).sort("date", 1).to_list(200)
    my = set()
    if user:
        rsvps = await db.rsvps.find({"user_id": user.user_id}, {"_id": 0}).to_list(500)
        my = {r["event_id"] for r in rsvps}
    for e in events:
        e["rsvp_count"] = await db.rsvps.count_documents({"event_id": e["id"]})
        e["is_rsvped"] = e["id"] in my
    return events


@api_router.post("/events/{event_id}/rsvp")
async def rsvp(event_id: str, user: User = Depends(require_user)):
    ev = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    existing = await db.rsvps.find_one({"event_id": event_id, "user_id": user.user_id}, {"_id": 0})
    if existing:
        await db.rsvps.delete_one({"event_id": event_id, "user_id": user.user_id})
        return {"is_rsvped": False}
    await db.rsvps.insert_one(
        {
            "id": nid("rsvp"),
            "event_id": event_id,
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "created_at": now_iso(),
        }
    )
    return {"is_rsvped": True}


@api_router.get("/my/rsvps")
async def my_rsvps(user: User = Depends(require_user)):
    rs = await db.rsvps.find({"user_id": user.user_id}, {"_id": 0}).to_list(200)
    out = []
    for r in rs:
        ev = await db.events.find_one({"id": r["event_id"]}, {"_id": 0})
        if ev:
            out.append(ev)
    return out


@api_router.post("/subscribe")
async def subscribe(payload: SubscribeIn):
    existing = await db.subscribers.find_one({"email": payload.email}, {"_id": 0})
    if not existing:
        await db.subscribers.insert_one(
            {"id": nid("sub"), "email": payload.email, "active": True, "created_at": now_iso()}
        )
    return {"ok": True, "message": "Subscribed to Parivartan alerts."}


# ---------------- Forms ----------------
@api_router.post("/volunteers")
async def create_volunteer(payload: VolunteerIn):
    doc = payload.model_dump()
    doc.update({"id": nid("vol"), "status": "new", "created_at": now_iso()})
    await db.volunteers.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


@api_router.post("/membership/apply")
async def apply_membership(payload: MembershipIn, user: Optional[User] = Depends(get_user_optional)):
    doc = payload.model_dump()
    doc.update(
        {
            "id": nid("mem"),
            "user_id": user.user_id if user else None,
            "membership_no": f"PBTC-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:5].upper()}",
            "payment_status": "pending",
            "created_at": now_iso(),
        }
    )
    await db.membership_applications.insert_one(doc)
    if user:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"membership_tier": payload.tier, "membership_status": "pending", "membership_no": doc["membership_no"]}},
        )
    return {"ok": True, "membership_no": doc["membership_no"], "payment_status": "pending"}


@api_router.post("/issues")
async def create_issue(
    category: str = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    village: str = Form(""),
    district: str = Form(""),
    reporter_name: str = Form(""),
    reporter_phone: str = Form(""),
    latitude: Optional[str] = Form(None),
    longitude: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    user: Optional[User] = Depends(get_user_optional),
):
    photo_path = None
    if photo and photo.filename:
        data = await photo.read()
        if len(data) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")
        ext = photo.filename.rsplit(".", 1)[-1].lower() if "." in photo.filename else "bin"
        if ext not in {"jpg", "jpeg", "png", "webp", "gif", "pdf"}:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        owner = user.user_id if user else "anonymous"
        path = f"{APP_NAME}/issues/{owner}/{uuid.uuid4()}.{ext}"
        try:
            result = put_object(path, data, photo.content_type or "application/octet-stream")
            photo_path = result["path"]
            await db.files.insert_one(
                {
                    "id": nid("file"),
                    "storage_path": photo_path,
                    "original_filename": photo.filename,
                    "content_type": photo.content_type,
                    "size": result.get("size", len(data)),
                    "is_deleted": False,
                    "created_at": now_iso(),
                }
            )
        except Exception as exc:
            logger.error(f"Upload failed: {exc}")
            raise HTTPException(status_code=502, detail="Photo upload failed")

    ref = f"PH-{datetime.now(timezone.utc).strftime('%y%m')}-{uuid.uuid4().hex[:5].upper()}"
    doc = {
        "id": nid("issue"),
        "ref": ref,
        "category": category,
        "title": title,
        "description": description,
        "village": village,
        "district": district,
        "reporter_name": reporter_name or (user.name if user else "Anonymous"),
        "reporter_phone": reporter_phone,
        "reporter_email": user.email if user else None,
        "user_id": user.user_id if user else None,
        "latitude": float(latitude) if latitude else None,
        "longitude": float(longitude) if longitude else None,
        "photo_path": photo_path,
        "status": "received",
        "created_at": now_iso(),
    }
    await db.issues.insert_one(doc)
    return {"ok": True, "ref": ref, "id": doc["id"]}


@api_router.get("/my/issues")
async def my_issues(user: User = Depends(require_user)):
    return await db.issues.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api_router.get("/files/{path:path}")
async def download_file(path: str, user: User = Depends(require_admin)):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = get_object(path)
    return StarResponse(content=data, media_type=record.get("content_type") or content_type)


async def _next_receipt_no() -> str:
    now = datetime.now(timezone.utc)
    fy = now.year if now.month >= 4 else now.year - 1
    key = f"receipt:{fy}"
    doc = await db.counters.find_one_and_update(
        {"key": key}, {"$inc": {"value": 1}}, upsert=True, return_document=True
    )
    seq = (doc or {}).get("value", 1)
    return f"PBTC/80G/{fy}-{str(fy + 1)[-2:]}/{seq:04d}"


async def _create_payment(kind: str, amount: int, meta: dict, user: Optional[User]) -> dict:
    if kind == "donation" and (amount < MIN_DONATION or amount > MAX_DONATION):
        raise HTTPException(status_code=400, detail=f"Amount must be between ₹{MIN_DONATION // 100} and ₹{MAX_DONATION // 100}")
    doc = {
        "id": nid("pay"),
        "kind": kind,
        "amount": amount,
        "currency": "INR",
        "status": "created",
        "provider": "razorpay" if PAYMENTS_LIVE else "simulated",
        "user_id": user.user_id if user else None,
        "order_id": None,
        "payment_ref": None,
        "receipt_id": None,
        "created_at": now_iso(),
        **meta,
    }
    if PAYMENTS_LIVE:
        order = razor_client.order.create(
            {"amount": amount, "currency": "INR", "payment_capture": 1, "receipt": doc["id"][:40]}
        )
        doc["order_id"] = order["id"]
    await db.payments.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def _issue_receipt(payment: dict) -> dict:
    if payment.get("receipt_id"):
        existing = await db.receipts.find_one({"id": payment["receipt_id"]}, {"_id": 0})
        if existing:
            return existing
    label = (
        f"{MEMBERSHIP_NAMES.get(payment.get('tier'), 'Membership')} fee"
        if payment["kind"] == "membership"
        else "Donation — " + (payment.get("campaign_title") or "General Fund")
    )
    receipt = {
        "id": nid("rcpt"),
        "receipt_no": await _next_receipt_no(),
        "payment_id": payment["id"],
        "user_id": payment.get("user_id"),
        "amount": payment["amount"],
        "donor_name": payment.get("donor_name", "-"),
        "donor_email": payment.get("donor_email", "-"),
        "donor_phone": payment.get("donor_phone", ""),
        "donor_pan": payment.get("donor_pan", ""),
        "purpose_label": label,
        "payment_ref": payment.get("payment_ref") or payment["id"],
        "payment_mode": "Razorpay (Online)" if payment["provider"] == "razorpay" else "Simulated (test)",
        "simulated": payment["provider"] != "razorpay",
        "issued_at": now_iso(),
    }
    await db.receipts.insert_one(receipt)
    receipt.pop("_id", None)
    await db.payments.update_one({"id": payment["id"]}, {"$set": {"receipt_id": receipt["id"]}})
    return receipt


async def _complete_payment(payment: dict, payment_ref: str) -> dict:
    await db.payments.update_one(
        {"id": payment["id"]},
        {"$set": {"status": "paid", "payment_ref": payment_ref, "paid_at": now_iso()}},
    )
    payment = {**payment, "status": "paid", "payment_ref": payment_ref}

    if payment["kind"] == "donation" and payment.get("campaign_id"):
        await db.campaigns.update_one(
            {"id": payment["campaign_id"]}, {"$inc": {"raised": round(payment["amount"] / 100, 2)}}
        )
    if payment["kind"] == "membership":
        update = {
            "membership_tier": payment.get("tier"),
            "membership_status": "active",
            "membership_no": payment.get("membership_no"),
        }
        if payment.get("user_id"):
            await db.users.update_one({"user_id": payment["user_id"]}, {"$set": update})
        await db.membership_applications.update_one(
            {"payment_id": payment["id"]}, {"$set": {"payment_status": "paid"}}
        )

    receipt = await _issue_receipt(payment)
    return receipt


@api_router.get("/payments/config")
async def payments_config():
    return {
        "live": PAYMENTS_LIVE,
        "provider": "razorpay" if PAYMENTS_LIVE else "simulated",
        "key_id": RAZORPAY_KEY_ID if PAYMENTS_LIVE else None,
        "min_amount": MIN_DONATION,
        "max_amount": MAX_DONATION,
        "presets": [50000, 100000, 250000, 500000],
        "membership_fees": MEMBERSHIP_FEES,
    }


@api_router.post("/donations/create")
async def create_donation(payload: DonationIn, user: Optional[User] = Depends(get_user_optional)):
    campaign_title = None
    if payload.campaign_id:
        camp = await db.campaigns.find_one({"id": payload.campaign_id}, {"_id": 0})
        if not camp:
            raise HTTPException(status_code=404, detail="Campaign not found")
        campaign_title = camp["title"]
    doc = await _create_payment(
        "donation",
        payload.amount,
        {
            "campaign_id": payload.campaign_id,
            "campaign_title": campaign_title,
            "donor_name": payload.donor_name,
            "donor_email": payload.donor_email,
            "donor_phone": payload.donor_phone,
            "donor_pan": payload.donor_pan,
            "message": payload.message,
        },
        user,
    )
    return {
        "payment_id": doc["id"],
        "amount": doc["amount"],
        "order_id": doc["order_id"],
        "provider": doc["provider"],
        "key_id": RAZORPAY_KEY_ID if PAYMENTS_LIVE else None,
    }


@api_router.post("/membership/checkout")
async def membership_checkout(payload: MembershipCheckoutIn, user: Optional[User] = Depends(get_user_optional)):
    if payload.tier not in MEMBERSHIP_FEES:
        raise HTTPException(status_code=400, detail="Unknown membership tier")
    membership_no = f"PBTC-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:5].upper()}"
    doc = await _create_payment(
        "membership",
        MEMBERSHIP_FEES[payload.tier],
        {
            "tier": payload.tier,
            "membership_no": membership_no,
            "donor_name": payload.donor_name,
            "donor_email": payload.donor_email,
            "donor_phone": payload.donor_phone,
            "donor_pan": payload.donor_pan,
            "city": payload.city,
        },
        user,
    )
    await db.membership_applications.insert_one(
        {
            "id": nid("mem"),
            "payment_id": doc["id"],
            "user_id": user.user_id if user else None,
            "tier": payload.tier,
            "name": payload.donor_name,
            "email": payload.donor_email,
            "phone": payload.donor_phone,
            "city": payload.city or "",
            "membership_no": membership_no,
            "payment_status": "pending",
            "created_at": now_iso(),
        }
    )
    return {
        "payment_id": doc["id"],
        "amount": doc["amount"],
        "order_id": doc["order_id"],
        "provider": doc["provider"],
        "key_id": RAZORPAY_KEY_ID if PAYMENTS_LIVE else None,
        "membership_no": membership_no,
    }


@api_router.post("/payments/confirm")
async def confirm_payment(payload: PaymentConfirmIn, user: Optional[User] = Depends(get_user_optional)):
    payment = await db.payments.find_one({"id": payload.payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment["status"] == "paid":
        receipt = await db.receipts.find_one({"payment_id": payment["id"]}, {"_id": 0})
        return {"ok": True, "receipt": receipt}

    if payment["provider"] == "razorpay":
        if not (payload.razorpay_order_id and payload.razorpay_payment_id and payload.razorpay_signature):
            raise HTTPException(status_code=400, detail="Missing Razorpay confirmation fields")
        try:
            razor_client.utility.verify_payment_signature(
                {
                    "razorpay_order_id": payload.razorpay_order_id,
                    "razorpay_payment_id": payload.razorpay_payment_id,
                    "razorpay_signature": payload.razorpay_signature,
                }
            )
        except Exception:
            await db.payments.update_one({"id": payment["id"]}, {"$set": {"status": "failed"}})
            raise HTTPException(status_code=400, detail="Payment signature verification failed")
        ref = payload.razorpay_payment_id
    else:
        ref = f"SIMULATED-{uuid.uuid4().hex[:10].upper()}"

    receipt = await _complete_payment(payment, ref)
    return {"ok": True, "receipt": receipt}


@api_router.get("/my/receipts")
async def my_receipts(user: User = Depends(require_user)):
    return await db.receipts.find({"user_id": user.user_id}, {"_id": 0}).sort("issued_at", -1).to_list(500)


@api_router.get("/receipts/{receipt_id}/pdf")
async def receipt_pdf(receipt_id: str, user: User = Depends(require_user)):
    rec = await db.receipts.find_one({"id": receipt_id}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=404, detail="Receipt not found")
    if rec.get("user_id") != user.user_id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your receipt")
    pdf = build_receipt_pdf(rec, LOGO_PATH)
    return StarResponse(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="80G-{rec["receipt_no"].replace("/", "-")}.pdf"'},
    )


@api_router.get("/media/{path:path}")
async def public_media(path: str):
    record = await db.files.find_one({"storage_path": path, "is_public": True, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = get_object(path)
    return StarResponse(
        content=data,
        media_type=record.get("content_type") or content_type,
        headers={"Cache-Control": "public, max-age=31536000"},
    )


# ---------------- Admin ----------------
@api_router.post("/admin/uploads")
async def admin_upload(file: UploadFile = File(...), user: User = Depends(require_admin)):
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if ext not in {"jpg", "jpeg", "png", "webp", "gif"}:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP or GIF images are allowed")
    path = f"{APP_NAME}/media/{uuid.uuid4()}.{ext}"
    try:
        result = put_object(path, data, file.content_type or "image/jpeg")
    except Exception as exc:
        logger.error(f"Media upload failed: {exc}")
        raise HTTPException(status_code=502, detail="Upload failed")
    await db.files.insert_one(
        {
            "id": nid("file"),
            "storage_path": result["path"],
            "original_filename": file.filename,
            "content_type": file.content_type,
            "size": result.get("size", len(data)),
            "is_public": True,
            "is_deleted": False,
            "uploaded_by": user.user_id,
            "created_at": now_iso(),
        }
    )
    return {"ok": True, "path": result["path"], "url": f"/api/media/{result['path']}"}


@api_router.get("/admin/donations")
async def admin_donations(user: User = Depends(require_admin)):
    return await db.payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.get("/admin/receipts")
async def admin_receipts(user: User = Depends(require_admin)):
    return await db.receipts.find({}, {"_id": 0}).sort("issued_at", -1).to_list(500)


@api_router.get("/admin/summary")
async def admin_summary(user: User = Depends(require_admin)):
    return {
        "issues": await db.issues.count_documents({}),
        "issues_open": await db.issues.count_documents({"status": {"$ne": "resolved"}}),
        "volunteers": await db.volunteers.count_documents({}),
        "members": await db.membership_applications.count_documents({}),
        "posts": await db.blog_posts.count_documents({}),
        "events": await db.events.count_documents({}),
        "rsvps": await db.rsvps.count_documents({}),
        "subscribers": await db.subscribers.count_documents({"active": True}),
        "users": await db.users.count_documents({}),
        "donations_paid": await db.payments.count_documents({"kind": "donation", "status": "paid"}),
        "receipts": await db.receipts.count_documents({}),
        "amount_raised": sum(
            p["amount"] for p in await db.payments.find({"status": "paid"}, {"_id": 0, "amount": 1}).to_list(2000)
        )
        / 100,
        "payments_live": PAYMENTS_LIVE,
    }


@api_router.get("/admin/issues")
async def admin_issues(user: User = Depends(require_admin)):
    return await db.issues.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.patch("/admin/issues/{issue_id}")
async def update_issue(issue_id: str, status: str = Query(...), user: User = Depends(require_admin)):
    res = await db.issues.update_one({"id": issue_id}, {"$set": {"status": status, "updated_at": now_iso()}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Issue not found")
    return {"ok": True}


@api_router.get("/admin/volunteers")
async def admin_volunteers(user: User = Depends(require_admin)):
    return await db.volunteers.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.get("/admin/members")
async def admin_members(user: User = Depends(require_admin)):
    return await db.membership_applications.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.get("/admin/subscribers")
async def admin_subs(user: User = Depends(require_admin)):
    return await db.subscribers.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.get("/admin/blog")
async def admin_blog(user: User = Depends(require_admin)):
    return await db.blog_posts.find({}, {"_id": 0}).sort("date", -1).to_list(500)


def slugify(s: str) -> str:
    return "-".join("".join(c.lower() if c.isalnum() else " " for c in s).split())[:80]


@api_router.post("/admin/blog")
async def create_post(payload: BlogIn, user: User = Depends(require_admin)):
    doc = payload.model_dump()
    doc["slug"] = doc.get("slug") or slugify(payload.title)
    if await db.blog_posts.find_one({"slug": doc["slug"]}):
        doc["slug"] = f"{doc['slug']}-{uuid.uuid4().hex[:4]}"
    doc.update({"id": nid("post"), "date": now_iso(), "created_at": now_iso()})
    await db.blog_posts.insert_one(doc)
    return {"ok": True, "slug": doc["slug"]}


@api_router.put("/admin/blog/{post_id}")
async def update_post(post_id: str, payload: BlogIn, user: User = Depends(require_admin)):
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    data.pop("slug", None)
    res = await db.blog_posts.update_one({"id": post_id}, {"$set": data})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"ok": True}


@api_router.delete("/admin/blog/{post_id}")
async def delete_post(post_id: str, user: User = Depends(require_admin)):
    res = await db.blog_posts.delete_one({"id": post_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"ok": True}


@api_router.post("/admin/events")
async def create_event(payload: EventIn, user: User = Depends(require_admin)):
    doc = payload.model_dump()
    doc.update({"id": nid("evt"), "created_at": now_iso()})
    await db.events.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


@api_router.put("/admin/events/{event_id}")
async def update_event(event_id: str, payload: EventIn, user: User = Depends(require_admin)):
    res = await db.events.update_one({"id": event_id}, {"$set": payload.model_dump()})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"ok": True}


@api_router.delete("/admin/events/{event_id}")
async def delete_event(event_id: str, user: User = Depends(require_admin)):
    res = await db.events.delete_one({"id": event_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.rsvps.delete_many({"event_id": event_id})
    return {"ok": True}


@api_router.get("/admin/events/{event_id}/rsvps")
async def event_rsvps(event_id: str, user: User = Depends(require_admin)):
    return await db.rsvps.find({"event_id": event_id}, {"_id": 0}).to_list(500)


@api_router.patch("/admin/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, payload: CampaignUpdate, user: User = Depends(require_admin)):
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not data:
        return {"ok": True}
    res = await db.campaigns.update_one({"id": campaign_id}, {"$set": data})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"ok": True}


@api_router.get("/")
async def root():
    return {"service": "Parivartan Be The Change API", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

SEED_CAMPAIGNS = [
    {
        "id": "camp_ugepi",
        "order": 1,
        "code": "UGEPI",
        "title": "Uttarakhand Green & Empowerment Proactive Initiative",
        "summary": "A 3-year flagship programme (2026–2028) planting 50,000 native trees across 50–100 hectares, forming 20 SHGs for 200 women, and running environmental clubs for 4,000 children in Nainital, Udham Singh Nagar, Dehradun and Haridwar.",
        "cover": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=1600&q=80",
        "goal": 21500000,
        "raised": 4300000,
        "status": "active",
        "period": "2026 – 2028",
        "districts": ["Nainital", "Udham Singh Nagar", "Dehradun", "Haridwar"],
        "trees_planted": 0,
        "trees_target": 50000,
        "flagship": True,
    },
    {
        "id": "camp_saplings",
        "order": 2,
        "code": "GREEN-TERAI",
        "title": "Green Terai Plantation Drive",
        "summary": "Community plantation of native species on degraded common land around Kashipur, with two-year survival monitoring by local youth groups.",
        "cover": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1600&q=80",
        "goal": 1200000,
        "raised": 780000,
        "status": "active",
        "period": "Ongoing",
        "districts": ["Udham Singh Nagar"],
        "trees_planted": 18000,
        "trees_target": 25000,
        "flagship": False,
    },
    {
        "id": "camp_shg",
        "order": 3,
        "code": "SAKHI-SHG",
        "title": "Sakhi SHG Skill & Livelihood Camps",
        "summary": "Skill camps in tailoring, food processing and nursery management, followed by SHG formation and market linkage support with NRLM.",
        "cover": "https://images.unsplash.com/photo-1587538018365-2a1f8b544c08?w=1600&q=80",
        "goal": 900000,
        "raised": 415000,
        "status": "active",
        "period": "Ongoing",
        "districts": ["Udham Singh Nagar", "Nainital"],
        "trees_planted": 0,
        "trees_target": 0,
        "flagship": False,
    },
    {
        "id": "camp_school",
        "order": 4,
        "code": "PATHSHALA",
        "title": "Parivartan Free School",
        "summary": "A free community school that educated 650+ children between 2016 and 2021. Its curriculum now feeds our environmental clubs and remedial learning centres.",
        "cover": "https://images.unsplash.com/photo-1692269725980-495f94b9d7a4?w=1600&q=80",
        "goal": 0,
        "raised": 0,
        "status": "completed",
        "period": "2016 – 2021",
        "districts": ["Udham Singh Nagar"],
        "trees_planted": 0,
        "trees_target": 0,
        "flagship": False,
    },
]

SEED_POSTS = [
    {
        "title": "UGEPI: why we are planting 50,000 native trees, not 50,000 trees",
        "category": "Afforestation",
        "excerpt": "Species choice decides whether a plantation becomes a forest or a graveyard of saplings. Here is how we selected native species for the Terai belt.",
        "tags": ["UGEPI", "Native Species", "Terai"],
        "cover": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=1400&q=80",
        "body": "When we began plantation work in 2021, survival — not sapling count — became our only honest metric.\n\nUGEPI (2026–2028) commits to 50,000 native trees on 50–100 hectares across Nainital, Udham Singh Nagar, Dehradun and Haridwar. Every sapling in the plan is a species that already belongs to the Terai and Bhabar ecology: sal, jamun, bel, amla, kachnar, semal.\n\nNative species need less irrigation, survive the first monsoon without shade nets, and support pollinators that exotic ornamentals never will. They also give villagers a reason to protect the grove — fruit, fodder, medicine.\n\nThe ₹2.15 crore budget is deliberately front-loaded: ₹90 lakh in Year 1 for nursery infrastructure, pitting and site preparation, ₹73 lakh in Year 2 for plantation and SHG mobilisation, ₹52 lakh in Year 3 for maintenance, replacement planting and monitoring.",
    },
    {
        "title": "450 women, 20 SHGs: what the skill camps actually changed",
        "category": "Women's Empowerment",
        "excerpt": "Training alone does not create income. Market linkage does. A field note from our SHG camps in Udham Singh Nagar.",
        "tags": ["SHG", "NRLM", "Livelihood"],
        "cover": "https://images.unsplash.com/photo-1587538018365-2a1f8b544c08?w=1400&q=80",
        "body": "600+ women have been trained by Parivartan since 2021, and 450+ came through our SHG skill camps specifically.\n\nThe first two cohorts taught us something uncomfortable: a certificate does nothing on its own. Women who completed tailoring modules had skills but no buyer, no working capital and no bank linkage.\n\nSo the model changed. Every camp now ends with three things — an SHG registered, a bank account opened, and at least one confirmed buyer or aggregator introduced through NRLM.\n\nUnder UGEPI we will form 20 SHGs covering 200 women, with nursery management as a paid livelihood: the project itself becomes their first customer.",
    },
    {
        "title": "From a village school to 4,000 children in environmental clubs",
        "category": "Child Education",
        "excerpt": "The Parivartan free school ran from 2016 to 2021 and taught 650+ children. Here is what we carried forward from it.",
        "tags": ["Education", "Eco Clubs", "Children"],
        "cover": "https://images.unsplash.com/photo-1692269725980-495f94b9d7a4?w=1400&q=80",
        "body": "Before Parivartan was registered as a society, it was a single room in Missarwala with a blackboard.\n\nBetween 2016 and 2021 that free school reached 650+ children — first-generation learners whose parents worked as daily-wage farm labour. When the school closed in 2021, we shifted from replacement schooling to access support and enrichment.\n\nUGEPI's environmental clubs will reach 4,000 children across four districts. Each club adopts a plantation plot, maintains a seed bank and runs a monsoon survival survey — real data, collected by children, used in our reporting.",
    },
    {
        "title": "25 health camps later: what rural preventive care really needs",
        "category": "Health",
        "excerpt": "Anaemia, dental neglect and untreated hypertension dominate our camp data. Screening is cheap; follow-up is not.",
        "tags": ["Health Camps", "Hygiene"],
        "cover": "https://images.unsplash.com/photo-1587538018365-2a1f8b544c08?w=1400&q=80",
        "body": "Across 25+ free health camps we have reached 3,200+ families in and around Kashipur.\n\nThe same three findings repeat: anaemia in adolescent girls, complete absence of dental care, and hypertension discovered for the first time at our own BP counter.\n\nScreening costs very little. Follow-up is the expensive part, and it is where most camp-based models quietly fail. Our current approach is to hand every flagged case to a named SHG member who tracks the referral for 90 days.",
    },
    {
        "title": "Reading our compliance: 12A, 80G, CSR-1 and NGO Darpan explained",
        "category": "Transparency",
        "excerpt": "What each registration actually means for you as a donor or CSR partner — in plain language.",
        "tags": ["80G", "CSR", "Transparency"],
        "cover": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1400&q=80",
        "body": "Parivartan 'Be The Change' Social Welfare Society is registered under the Registrar of Societies, Uttarakhand — Reg. No. UK0670872022009004.\n\n12A (AAFTP3547EE20231) means our income is exempt from tax as a charitable entity. 80G under the same number means your donation is deductible in your own return.\n\nCSR-1 (CSR00056512) is the Ministry of Corporate Affairs registration that makes us eligible to receive corporate CSR funds — without it, a company legally cannot route CSR spend to us.\n\nNGO Darpan (UA/2023/0342800) is our NITI Aayog unique ID, required for most government grant portals. Our PAN is AAFTP3547E.",
    },
    {
        "title": "Community Helpmate: turning a photo into a field visit",
        "category": "Community",
        "excerpt": "Our new reporting tool lets any villager flag a women's safety, education-access or environmental issue with a geotagged photo.",
        "tags": ["Helpmate", "Reporting"],
        "cover": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=1400&q=80",
        "body": "Most problems we solve were reported by someone walking into our office in Missarwala.\n\nCommunity Helpmate moves that to a form. A report carries a category — Women Safety / Hygiene, Child Education Access, or Environmental Hazard — a description, an optional photo and, if the reporter allows it, exact coordinates.\n\nGeotagging matters more than it sounds. A pile of dumped industrial waste described as 'near the canal' is unfindable; the same report with coordinates becomes a site visit the following week.\n\nEvery submission gets a reference number so the reporter can follow up.",
    },
]

SEED_EVENTS = [
    {
        "title": "UGEPI Launch Seminar & Partner Convening",
        "date": "2026-07-18",
        "time": "10:30 AM",
        "location": "Kashipur Community Hall, Udham Singh Nagar",
        "district": "Udham Singh Nagar",
        "kind": "Seminar",
        "capacity": 200,
        "description": "Formal launch of the 3-year UGEPI programme with NRLM officials, CSR partners and SHG representatives. Budget, plantation sites and monitoring framework will be presented.",
        "cover": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=1200&q=80",
    },
    {
        "title": "Monsoon Plantation Drive — Missarwala Grove",
        "date": "2026-07-26",
        "time": "6:30 AM",
        "location": "Vill. Missarwala, P.O. Kunda, Kashipur",
        "district": "Udham Singh Nagar",
        "kind": "Plantation Drive",
        "capacity": 150,
        "description": "Volunteer plantation of native saplings. Tools, saplings and breakfast provided. Wear full sleeves and closed shoes.",
        "cover": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&q=80",
    },
    {
        "title": "Sakhi SHG Skill Camp — Tailoring & Food Processing",
        "date": "2026-08-08",
        "time": "11:00 AM",
        "location": "Panchayat Bhawan, Kunda",
        "district": "Udham Singh Nagar",
        "kind": "Skill Camp",
        "capacity": 60,
        "description": "Five-day residential-style skill camp for women, ending with SHG registration and bank linkage support.",
        "cover": "https://images.unsplash.com/photo-1587538018365-2a1f8b544c08?w=1200&q=80",
    },
    {
        "title": "Free Health & Hygiene Camp",
        "date": "2026-08-23",
        "time": "9:00 AM",
        "location": "Govt. Primary School, Kunda",
        "district": "Udham Singh Nagar",
        "kind": "Health Camp",
        "capacity": 400,
        "description": "General physician, dental and anaemia screening with free medicines. Hygiene kits distributed to adolescent girls.",
        "cover": "https://images.unsplash.com/photo-1587538018365-2a1f8b544c08?w=1200&q=80",
    },
    {
        "title": "Eco-Club Teachers' Orientation — Nainital",
        "date": "2026-09-12",
        "time": "12:00 PM",
        "location": "Nainital District Institute",
        "district": "Nainital",
        "kind": "Workshop",
        "capacity": 80,
        "description": "Orientation for school teachers on running environmental clubs, seed banks and monsoon survival surveys with children.",
        "cover": "https://images.unsplash.com/photo-1692269725980-495f94b9d7a4?w=1200&q=80",
    },
]


@app.on_event("startup")
async def startup():
    await db.otp_codes.create_index("phone")
    await db.payments.create_index("id")
    await db.receipts.create_index("user_id")
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as exc:
        logger.error(f"Storage init failed: {exc}")

    if await db.campaigns.count_documents({}) == 0:
        await db.campaigns.insert_many([dict(c) for c in SEED_CAMPAIGNS])
        logger.info("Seeded campaigns")

    if await db.blog_posts.count_documents({}) == 0:
        docs = []
        for i, p in enumerate(SEED_POSTS):
            d = dict(p)
            d.update(
                {
                    "id": nid("post"),
                    "slug": slugify(p["title"]),
                    "author": "Parivartan Team",
                    "published": True,
                    "date": (datetime.now(timezone.utc) - timedelta(days=7 * i + 3)).isoformat(),
                    "created_at": now_iso(),
                }
            )
            docs.append(d)
        await db.blog_posts.insert_many(docs)
        logger.info("Seeded blog posts")

    if await db.events.count_documents({}) == 0:
        await db.events.insert_many([{**e, "id": nid("evt"), "created_at": now_iso()} for e in SEED_EVENTS])
        logger.info("Seeded events")

    await db.site_stats.update_one(
        {"key": "impact"},
        {
            "$set": {
                "key": "impact",
                "values": {
                    "trees": 18000,
                    "women": 600,
                    "children": 650,
                    "camps": 25,
                    "families": 3200,
                    "shg": 450,
                },
                "updated_at": now_iso(),
            }
        },
        upsert=True,
    )


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
