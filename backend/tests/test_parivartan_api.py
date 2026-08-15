"""Parivartan backend API tests."""
import io
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://green-empower.preview.emergentagent.com").rstrip("/")
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


# ---------- Public content ----------
class TestPublic:
    def test_root(self, s):
        r = s.get(f"{API}/")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_stats(self, s):
        r = s.get(f"{API}/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ("trees", "women", "children", "camps", "families", "shg"):
            assert k in d

    def test_campaigns(self, s):
        r = s.get(f"{API}/campaigns")
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) >= 4
        assert any(c["code"] == "UGEPI" for c in arr)

    def test_blog_list(self, s):
        r = s.get(f"{API}/blog")
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_blog_filter_category(self, s):
        r = s.get(f"{API}/blog", params={"category": "Transparency"})
        assert r.status_code == 200
        assert all(p["category"] == "Transparency" for p in r.json())

    def test_blog_filter_search(self, s):
        r = s.get(f"{API}/blog", params={"q": "UGEPI"})
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_blog_filter_tag(self, s):
        r = s.get(f"{API}/blog", params={"tag": "80G"})
        assert r.status_code == 200
        assert all("80G" in p["tags"] for p in r.json())

    def test_blog_get_slug(self, s):
        posts = s.get(f"{API}/blog").json()
        slug = posts[0]["slug"]
        r = s.get(f"{API}/blog/{slug}")
        assert r.status_code == 200
        assert r.json()["slug"] == slug

    def test_blog_404(self, s):
        r = s.get(f"{API}/blog/nonexistent-slug-xyz")
        assert r.status_code == 404

    def test_events(self, s):
        r = s.get(f"{API}/events")
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) >= 5
        for e in arr:
            assert "rsvp_count" in e
            assert "is_rsvped" in e


# ---------- Forms ----------
class TestForms:
    def test_volunteer(self, s):
        r = s.post(f"{API}/volunteers", json={
            "name": "TEST_Vol", "email": "testvol@example.com", "phone": "9999999999",
            "city": "Kashipur", "skills": "Tree planting", "availability": "Weekends",
            "interest_area": "Afforestation", "message": "Happy to help"
        })
        assert r.status_code == 200
        assert r.json()["ok"] is True
        assert "id" in r.json()

    def test_volunteer_invalid_email(self, s):
        r = s.post(f"{API}/volunteers", json={
            "name": "x", "email": "notanemail", "phone": "9", "city": "x",
            "skills": "x", "availability": "x", "interest_area": "x"
        })
        assert r.status_code == 422

    def test_membership_apply(self, s):
        r = s.post(f"{API}/membership/apply", json={
            "tier": "annual", "name": "TEST_Member", "email": "testmem@example.com",
            "phone": "9999999999", "city": "Kashipur"
        })
        assert r.status_code == 200
        d = r.json()
        assert d["membership_no"].startswith("PBTC-")
        assert d["payment_status"] == "pending"

    def test_subscribe(self, s):
        r = s.post(f"{API}/subscribe", json={"email": "testsub@example.com"})
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_issue_text_only(self, s):
        data = {
            "category": "Environmental Hazard", "title": "TEST Issue text",
            "description": "A test issue with no photo", "village": "V", "district": "Nainital",
            "reporter_name": "Anon", "reporter_phone": "9",
        }
        r = s.post(f"{API}/issues", data=data)
        assert r.status_code == 200
        assert r.json()["ref"].startswith("PH-")

    def test_issue_with_geo(self, s):
        data = {
            "category": "Women Safety", "title": "TEST Issue geo",
            "description": "with coords", "latitude": "29.2183", "longitude": "78.9569",
        }
        r = s.post(f"{API}/issues", data=data)
        assert r.status_code == 200
        assert r.json()["ref"].startswith("PH-")

    def test_issue_with_photo(self, s):
        # 1x1 PNG
        png = bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
            "89000000094944415478da6300010000000500017c9ca07f0000000049454e44ae426082"
        )
        files = {"photo": ("t.png", io.BytesIO(png), "image/png")}
        data = {"category": "Environmental Hazard", "title": "TEST Photo issue",
                "description": "with photo"}
        r = s.post(f"{API}/issues", data=data, files=files)
        assert r.status_code == 200, r.text
        assert r.json()["ref"].startswith("PH-")

    def test_issue_unsupported_ext(self, s):
        files = {"photo": ("evil.exe", io.BytesIO(b"MZbinary"), "application/octet-stream")}
        data = {"category": "x", "title": "t", "description": "d"}
        r = s.post(f"{API}/issues", data=data, files=files)
        assert r.status_code == 400

    def test_issue_too_large(self, s):
        big = b"0" * (11 * 1024 * 1024)
        files = {"photo": ("big.jpg", io.BytesIO(big), "image/jpeg")}
        data = {"category": "x", "title": "t", "description": "d"}
        r = s.post(f"{API}/issues", data=data, files=files)
        assert r.status_code == 400


# ---------- Auth ----------
class TestAuth:
    def test_me_unauth(self, s):
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_admin(self, s, admin_h):
        r = s.get(f"{API}/auth/me", headers=admin_h)
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_me_member(self, s, member_h):
        r = s.get(f"{API}/auth/me", headers=member_h)
        assert r.status_code == 200
        assert r.json()["role"] == "member"

    def test_prefs_update(self, s, member_h):
        r = s.put(f"{API}/auth/preferences", headers=member_h,
                  json={"notify_email": False, "notify_events": True, "notify_newsletter": True})
        assert r.status_code == 200
        d = r.json()
        assert d["notify_email"] is False
        assert d["notify_newsletter"] is True
        # Reset
        s.put(f"{API}/auth/preferences", headers=member_h,
              json={"notify_email": True, "notify_events": True, "notify_newsletter": False})


# ---------- RSVP ----------
class TestRSVP:
    def test_rsvp_unauth(self, s):
        events = s.get(f"{API}/events").json()
        r = s.post(f"{API}/events/{events[0]['id']}/rsvp")
        assert r.status_code == 401

    def test_rsvp_toggle(self, s, member_h):
        events = s.get(f"{API}/events", headers=member_h).json()
        eid = events[0]["id"]
        before = events[0]["rsvp_count"]
        r1 = s.post(f"{API}/events/{eid}/rsvp", headers=member_h)
        assert r1.status_code == 200
        state1 = r1.json()["is_rsvped"]
        # toggle back
        r2 = s.post(f"{API}/events/{eid}/rsvp", headers=member_h)
        assert r2.status_code == 200
        assert r2.json()["is_rsvped"] != state1

    def test_my_rsvps(self, s, member_h):
        r = s.get(f"{API}/my/rsvps", headers=member_h)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Admin gating ----------
class TestAdminGating:
    endpoints = [
        ("GET", "/admin/summary"), ("GET", "/admin/issues"), ("GET", "/admin/volunteers"),
        ("GET", "/admin/members"), ("GET", "/admin/blog"), ("GET", "/admin/subscribers"),
    ]

    @pytest.mark.parametrize("method,path", endpoints)
    def test_unauth_401(self, s, method, path):
        r = s.request(method, f"{API}{path}")
        assert r.status_code == 401

    @pytest.mark.parametrize("method,path", endpoints)
    def test_member_403(self, s, member_h, method, path):
        r = s.request(method, f"{API}{path}", headers=member_h)
        assert r.status_code == 403


# ---------- Admin CRUD ----------
class TestAdminCRUD:
    def test_summary(self, s, admin_h):
        r = s.get(f"{API}/admin/summary", headers=admin_h)
        assert r.status_code == 200
        for k in ("issues", "volunteers", "members", "posts", "events", "rsvps", "subscribers", "users"):
            assert k in r.json()

    def test_blog_crud(self, s, admin_h):
        create = s.post(f"{API}/admin/blog", headers=admin_h, json={
            "title": "TEST Post CRUD", "category": "Community",
            "excerpt": "e", "body": "b", "tags": ["test"], "published": True
        })
        assert create.status_code == 200
        slug = create.json()["slug"]
        # find id
        posts = s.get(f"{API}/admin/blog", headers=admin_h).json()
        p = next(x for x in posts if x["slug"] == slug)
        pid = p["id"]
        # verify public
        r = s.get(f"{API}/blog/{slug}")
        assert r.status_code == 200
        # update
        up = s.put(f"{API}/admin/blog/{pid}", headers=admin_h, json={
            "title": "TEST Post CRUD Updated", "category": "Community",
            "excerpt": "e2", "body": "b2", "tags": ["test"], "published": True
        })
        assert up.status_code == 200
        # delete
        de = s.delete(f"{API}/admin/blog/{pid}", headers=admin_h)
        assert de.status_code == 200
        assert s.get(f"{API}/blog/{slug}").status_code == 404

    def test_event_crud(self, s, admin_h):
        create = s.post(f"{API}/admin/events", headers=admin_h, json={
            "title": "TEST Event", "date": "2026-12-01", "time": "10:00",
            "location": "L", "district": "Nainital", "kind": "Workshop",
            "description": "desc", "capacity": 50
        })
        assert create.status_code == 200
        eid = create.json()["id"]
        up = s.put(f"{API}/admin/events/{eid}", headers=admin_h, json={
            "title": "TEST Event Updated", "date": "2026-12-02", "time": "11:00",
            "location": "L2", "district": "Nainital", "kind": "Workshop",
            "description": "d2", "capacity": 60
        })
        assert up.status_code == 200
        de = s.delete(f"{API}/admin/events/{eid}", headers=admin_h)
        assert de.status_code == 200

    def test_campaign_update(self, s, admin_h):
        r = s.patch(f"{API}/admin/campaigns/camp_saplings", headers=admin_h,
                    json={"raised": 800000, "trees_planted": 18500})
        assert r.status_code == 200
        camps = s.get(f"{API}/campaigns").json()
        c = next(x for x in camps if x["id"] == "camp_saplings")
        assert c["raised"] == 800000
        assert c["trees_planted"] == 18500

    def test_issue_status_update(self, s, admin_h):
        # Create an issue first
        r = s.post(f"{API}/issues", data={
            "category": "Env", "title": "TEST admin status", "description": "d"
        })
        # Get id via admin
        issues = s.get(f"{API}/admin/issues", headers=admin_h).json()
        iid = issues[0]["id"]
        upd = s.patch(f"{API}/admin/issues/{iid}?status=in_progress", headers=admin_h)
        assert upd.status_code == 200

    def test_admin_lists(self, s, admin_h):
        for path in ["/admin/issues", "/admin/volunteers", "/admin/members", "/admin/subscribers"]:
            r = s.get(f"{API}{path}", headers=admin_h)
            assert r.status_code == 200
            assert isinstance(r.json(), list)
