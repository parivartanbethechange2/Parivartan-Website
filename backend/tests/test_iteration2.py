"""Parivartan iteration-2 backend tests: payments, receipts, uploads, phone OTP."""
import io
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://green-empower.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_TOKEN = "test_admin_session_token_fixed"
MEMBER_TOKEN = "test_member_session_token_fixed"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def admin_h():
    return {"Authorization": f"Bearer {ADMIN_TOKEN}"}


@pytest.fixture(scope="session")
def member_h():
    return {"Authorization": f"Bearer {MEMBER_TOKEN}"}


# ---------- Payments config ----------
class TestPaymentsConfig:
    def test_config(self, s):
        r = s.get(f"{API}/payments/config")
        assert r.status_code == 200
        d = r.json()
        assert d["live"] is False
        assert d["provider"] == "simulated"
        assert d["min_amount"] == 2000
        assert d["max_amount"] == 1000000
        assert d["presets"] == [50000, 100000, 250000, 500000]
        assert d["membership_fees"]["annual"] == 50000
        assert d["membership_fees"]["patron"] == 500000
        assert d["membership_fees"]["life"] == 1100000


# ---------- Donation flow ----------
class TestDonation:
    def test_amount_too_low(self, s):
        r = s.post(f"{API}/donations/create", json={
            "amount": 1000, "donor_name": "TEST", "donor_email": "t@test.com",
            "donor_phone": "9999999999",
        })
        assert r.status_code == 400

    def test_amount_too_high(self, s):
        r = s.post(f"{API}/donations/create", json={
            "amount": 1000001, "donor_name": "TEST", "donor_email": "t@test.com",
            "donor_phone": "9999999999",
        })
        assert r.status_code == 400

    def test_donation_to_campaign_increments_raised(self, s, member_h):
        # Get campaign 'before' raised
        camps = s.get(f"{API}/campaigns").json()
        camp = camps[0]
        cid = camp["id"]
        before = camp["raised"]

        r = s.post(f"{API}/donations/create", headers=member_h, json={
            "amount": 50000, "campaign_id": cid,
            "donor_name": "TEST Donor", "donor_email": "TEST_donor@example.com",
            "donor_phone": "9999999999", "donor_pan": "ABCDE1234F",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["provider"] == "simulated"
        assert d["amount"] == 50000
        pid = d["payment_id"]

        conf = s.post(f"{API}/payments/confirm", headers=member_h, json={"payment_id": pid})
        assert conf.status_code == 200, conf.text
        rec = conf.json()["receipt"]
        assert rec["receipt_no"].startswith("PBTC/80G/")
        assert rec["simulated"] is True
        assert rec["amount"] == 50000

        camps2 = s.get(f"{API}/campaigns").json()
        after = next(c for c in camps2 if c["id"] == cid)["raised"]
        assert after >= before + 500  # amount is in paise (50000/100 = 500 rupees)

    def test_general_fund_donation(self, s):
        r = s.post(f"{API}/donations/create", json={
            "amount": 50000, "donor_name": "TEST Anon",
            "donor_email": "TEST_anon@example.com", "donor_phone": "9999999999",
        })
        assert r.status_code == 200
        pid = r.json()["payment_id"]
        conf = s.post(f"{API}/payments/confirm", json={"payment_id": pid})
        assert conf.status_code == 200
        rec = conf.json()["receipt"]
        assert rec["receipt_no"].startswith("PBTC/80G/")

    def test_confirm_idempotent(self, s, member_h):
        # Create + confirm + confirm again
        r = s.post(f"{API}/donations/create", headers=member_h, json={
            "amount": 50000, "donor_name": "TEST", "donor_email": "t@t.com",
            "donor_phone": "9",
        })
        pid = r.json()["payment_id"]
        c1 = s.post(f"{API}/payments/confirm", headers=member_h, json={"payment_id": pid})
        c2 = s.post(f"{API}/payments/confirm", headers=member_h, json={"payment_id": pid})
        assert c1.status_code == 200 and c2.status_code == 200
        assert c1.json()["receipt"]["id"] == c2.json()["receipt"]["id"]


# ---------- Membership checkout ----------
class TestMembership:
    def test_annual_checkout(self, s):
        r = s.post(f"{API}/membership/checkout", json={
            "tier": "annual", "donor_name": "TEST Mem", "donor_email": "TEST_m@x.com",
            "donor_phone": "9999999999", "city": "Kashipur",
        })
        assert r.status_code == 200
        d = r.json()
        assert d["amount"] == 50000
        assert d["membership_no"].startswith("PBTC-")

    def test_life_checkout_and_status_active_for_user(self, s, member_h):
        r = s.post(f"{API}/membership/checkout", headers=member_h, json={
            "tier": "life", "donor_name": "TEST Life",
            "donor_email": "TEST_life@x.com", "donor_phone": "9999999999",
            "city": "Kashipur",
        })
        assert r.status_code == 200
        d = r.json()
        assert d["amount"] == 1100000
        pid = d["payment_id"]
        mno = d["membership_no"]
        conf = s.post(f"{API}/payments/confirm", headers=member_h, json={"payment_id": pid})
        assert conf.status_code == 200
        me = s.get(f"{API}/auth/me", headers=member_h).json()
        assert me["membership_tier"] == "life"
        assert me["membership_status"] == "active"
        assert me["membership_no"] == mno

    def test_bad_tier(self, s):
        r = s.post(f"{API}/membership/checkout", json={
            "tier": "gold", "donor_name": "x", "donor_email": "x@x.com",
            "donor_phone": "9",
        })
        assert r.status_code == 400


# ---------- Receipts / PDF ----------
@pytest.fixture(scope="class")
def member_receipt(s, member_h):
    """Create a fresh donation + receipt for the member to use in PDF tests."""
    r = s.post(f"{API}/donations/create", headers=member_h, json={
        "amount": 50000, "donor_name": "TEST PDF Donor",
        "donor_email": "TEST_pdf@example.com", "donor_phone": "9999999999",
    })
    pid = r.json()["payment_id"]
    conf = s.post(f"{API}/payments/confirm", headers=member_h, json={"payment_id": pid})
    return conf.json()["receipt"]


class TestReceipts:
    def test_my_receipts_lists(self, s, member_h, member_receipt):
        r = s.get(f"{API}/my/receipts", headers=member_h)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list) and len(arr) >= 1
        assert any(x["id"] == member_receipt["id"] for x in arr)

    def test_my_receipts_unauth(self, s):
        r = s.get(f"{API}/my/receipts")
        assert r.status_code == 401

    def test_pdf_owner(self, s, member_h, member_receipt):
        r = s.get(f"{API}/receipts/{member_receipt['id']}/pdf", headers=member_h)
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("application/pdf")
        assert r.content.startswith(b"%PDF")
        assert len(r.content) > 500

    def test_pdf_admin_can_download_any(self, s, admin_h, member_receipt):
        r = s.get(f"{API}/receipts/{member_receipt['id']}/pdf", headers=admin_h)
        assert r.status_code == 200
        assert r.content.startswith(b"%PDF")

    def test_pdf_unauth(self, s, member_receipt):
        r = s.get(f"{API}/receipts/{member_receipt['id']}/pdf")
        assert r.status_code == 401

    def test_pdf_404(self, s, member_h):
        r = s.get(f"{API}/receipts/nonexistent/pdf", headers=member_h)
        assert r.status_code == 404

    def test_pdf_forbidden_for_other_user(self, s, member_receipt):
        """A different logged-in user must NOT be able to download someone else's receipt."""
        # Create a fresh phone-auth user
        phone = "98761" + str(uuid.uuid4().int)[:5]
        sess = requests.Session()
        sess.post(f"{API}/auth/phone/request-otp", json={"phone": phone})
        time.sleep(0.2)
        r = sess.post(f"{API}/auth/phone/verify", json={"phone": phone, "code": "123456"})
        assert r.status_code == 200, r.text
        token = r.cookies.get("session_token")
        assert token
        h = {"Authorization": f"Bearer {token}"}
        r2 = requests.get(f"{API}/receipts/{member_receipt['id']}/pdf", headers=h)
        assert r2.status_code == 403


# ---------- Admin uploads + public media ----------
PNG_BYTES = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
    "89000000094944415478da6300010000000500017c9ca07f0000000049454e44ae426082"
)


class TestAdminUploads:
    def test_upload_unauth(self, s):
        r = s.post(f"{API}/admin/uploads", files={"file": ("t.png", PNG_BYTES, "image/png")})
        assert r.status_code == 401

    def test_upload_member_forbidden(self, s, member_h):
        r = s.post(f"{API}/admin/uploads", headers=member_h,
                   files={"file": ("t.png", PNG_BYTES, "image/png")})
        assert r.status_code == 403

    def test_upload_admin_ok_and_public_media(self, s, admin_h):
        r = s.post(f"{API}/admin/uploads", headers=admin_h,
                   files={"file": ("t.png", PNG_BYTES, "image/png")})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] and d["path"] and d["url"].startswith("/api/media/")
        # Fetch via /api/media with NO auth
        media_url = f"{BASE_URL}{d['url']}"
        r2 = requests.get(media_url)
        assert r2.status_code == 200
        assert r2.headers["content-type"].startswith("image/")
        assert len(r2.content) > 0

    def test_upload_reject_non_image(self, s, admin_h):
        r = s.post(f"{API}/admin/uploads", headers=admin_h,
                   files={"file": ("evil.exe", b"MZbin", "application/octet-stream")})
        assert r.status_code == 400

    def test_upload_reject_too_large(self, s, admin_h):
        big = b"0" * (11 * 1024 * 1024)
        r = s.post(f"{API}/admin/uploads", headers=admin_h,
                   files={"file": ("big.jpg", big, "image/jpeg")})
        assert r.status_code == 400


# ---------- Phone OTP ----------
class TestPhoneOtp:
    def test_request_otp_returns_dev_code(self, s):
        phone = "9876500001"
        r = s.post(f"{API}/auth/phone/request-otp", json={"phone": phone})
        assert r.status_code == 200
        d = r.json()
        assert d["sms_live"] is False
        assert d["dev_code"] == "123456"

    def test_verify_wrong_code(self, s):
        phone = "9876500002"
        s.post(f"{API}/auth/phone/request-otp", json={"phone": phone})
        r = s.post(f"{API}/auth/phone/verify", json={"phone": phone, "code": "000000"})
        assert r.status_code == 400

    def test_verify_correct_code_creates_user(self):
        # use fresh session so set-cookie doesn't leak into other tests
        sess = requests.Session()
        phone = "98765" + str(uuid.uuid4().int)[:5]
        sess.post(f"{API}/auth/phone/request-otp", json={"phone": phone})
        time.sleep(0.2)
        r = sess.post(f"{API}/auth/phone/verify", json={
            "phone": phone, "code": "123456", "name": "TEST Phone User"
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["auth_method"] == "phone"
        assert d["phone"] == phone

    def test_verify_consumed_code_reuse(self):
        sess = requests.Session()
        phone = "98766" + str(uuid.uuid4().int)[:5]
        sess.post(f"{API}/auth/phone/request-otp", json={"phone": phone})
        sess.post(f"{API}/auth/phone/verify", json={"phone": phone, "code": "123456"})
        # Second time same code — should fail because consumed
        r = sess.post(f"{API}/auth/phone/verify", json={"phone": phone, "code": "123456"})
        assert r.status_code == 400

    def test_invalid_phone(self, s):
        r = s.post(f"{API}/auth/phone/request-otp", json={"phone": "123"})
        assert r.status_code in (400, 422)

    def test_rate_limit_after_3(self, s):
        phone = "9876500099"
        for _ in range(3):
            r = s.post(f"{API}/auth/phone/request-otp", json={"phone": phone})
            assert r.status_code == 200
        r = s.post(f"{API}/auth/phone/request-otp", json={"phone": phone})
        assert r.status_code == 429


# ---------- Admin donations listing ----------
class TestAdminDonations:
    def test_donations_list_admin(self, s, admin_h):
        r = s.get(f"{API}/admin/donations", headers=admin_h)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_donations_forbidden_member(self, s, member_h):
        r = s.get(f"{API}/admin/donations", headers=member_h)
        assert r.status_code == 403
