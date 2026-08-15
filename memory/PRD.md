# PRD — Parivartan 'Be The Change' Social Welfare Society

## Original problem statement
Build a fully functional, visually striking, scroll-driven (scrollytelling) website for Parivartan 'Be The Change'
Social Welfare Society — an Uttarakhand NGO (Reg. No. UK0670872022009004) working on afforestation, women's
empowerment and child education. 8 routes: Home, About, Campaigns, Membership & Volunteering, Community Helpmate,
Blogs & News, Seminars & Events, User Dashboard. Warm nature-inspired palette, premium not templated.
Plan approved by the user: build Phases 1 (frontend), 2 (auth), 3 (forms/uploads) and 6 (admin/CMS) now.
Phases 4 (payments) and 5 (dashboard depth / email automation) deferred — admin panel prioritised before payments.

## Architecture
- Frontend: React (CRA + craco), react-router-dom, framer-motion, lenis smooth scroll, react-fast-marquee,
  Tailwind + shadcn/ui, sonner toasts. Design tokens in `src/index.css` (sand / sage / forest / clay / ink).
- Static NGO content (source of truth numbers) in `src/data/content.js`.
- Backend: FastAPI single module `backend/server.py`, all routes under `/api`, MongoDB via motor.
- Auth: Emergent-managed Google OAuth → `POST /api/auth/session`, httpOnly `session_token` cookie (7 days),
  role field on user; admin role auto-granted to emails in `ADMIN_EMAILS`.
- Files: Emergent object storage (`parivartan/issues/{owner}/{uuid}.{ext}`), metadata in `files` collection,
  admin-only download proxy `GET /api/files/{path}`.
- Collections: users, user_sessions, campaigns, blog_posts, events, rsvps, issues, volunteers,
  membership_applications, subscribers, files, site_stats. Seeded on startup (idempotent).

## User personas
1. **Donor / CSR officer** — needs proof of compliance (12A/80G, CSR-1, NGO Darpan) and live campaign progress.
2. **Volunteer** — wants to sign up with skills, location and availability, and RSVP to drives.
3. **Villager / community reporter** — files a geotagged, photo-backed issue and tracks it by reference number.
4. **Member** — holds a digital membership ID, manages notification preferences, sees RSVPs and reports.
5. **Parivartan staff (admin)** — publishes articles, manages events, updates campaign progress, triages reports.

## Core requirements (static)
- Real content only: founded 2021; Vill. Missarwala, P.O. Kunda, Kashipur, Udham Singh Nagar, UK – 244713;
  PAN AAFTP3547E; NGO Darpan UA/2023/0342800; CSR-1 CSR00056512; 12A/80G AAFTP3547EE20231.
- Track record: 18,000+ trees, 600+ women trained, 650+ children educated (school 2016–2021), 25+ health camps,
  3,200+ families reached, 450+ women via SHG camps.
- UGEPI: 2026–2028, ₹2.15 Cr (Y1 ₹90L / Y2 ₹73L / Y3 ₹52L), 50,000 native trees on 50–100 ha, 20 SHGs / 200 women,
  eco-clubs for 4,000 children across Nainital, Udham Singh Nagar, Dehradun, Haridwar.
- Team: Poonam Manjharia (Founder & President), Rupali M. (Co-Founder & Secretary), Ram Mehrotra & Anil Sood
  (Patrons), Anamika Gayen (Head, Mumbai Wing). Partners: NRLM, India Glycols, Root Skills™.
- Scroll-driven experience: pinned hero morphing into the impact band, parallax imagery, count-up stats,
  stacking campaign cards, sticky month headers, reading-progress bar on articles.

## Implemented (June 2026)

### Iteration 2 — logo, payments, receipts, phone login, uploads
- Real Parivartan logo wired into the desktop header, mobile menu, footer, membership ID card, admin header,
  auth modal, favicon and apple-touch icon (`public/parivartan-logo.png`, `logo-512.png`, `favicon.png` —
  white background removed and trimmed). Page title and meta description updated.
- **Donations + membership payments**: `DonateModal` handles both. Presets ₹500/₹1,000/₹2,500/₹5,000, custom
  amount ₹20–₹10,000 (the cap does not apply to membership fees). Razorpay is the chosen provider; keys are not
  configured yet, so `/api/payments/config` reports `live: false` and payments complete in **simulated** mode.
  Adding `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` to `backend/.env` switches on the real checkout with
  signature verification — no other code change needed. A paid donation increments the campaign's raised amount.
- **80G receipts**: reportlab PDF (`backend/receipts.py`) with org header, logo, compliance block, amount in
  words and a signatory line. Numbered `PBTC/80G/{FY}/{seq}` from an atomic counter. Issued automatically on
  payment confirmation, listed at `/api/my/receipts`, downloadable from the dashboard archive and the admin
  Donations tab. Owner-or-admin access control. Simulated receipts are stamped as not a valid tax document.
- **Phone + OTP login**: `/api/auth/phone/request-otp` and `/verify`, SHA-256 hashed codes, 5-minute expiry,
  max 5 wrong attempts, max 3 requests per number per 10 minutes. Uses the same session cookie as Google login;
  `auth_method` is set to `phone`. OTP delivery lives in `backend/sms.py` — in `dev` mode the code is `123456`
  and no SMS is sent; swapping in Twilio/MSG91 means implementing one function and setting `SMS_PROVIDER`.
- **Admin cover-image uploads**: `POST /api/admin/uploads` (admin only, images ≤10 MB) to object storage, served
  publicly via `GET /api/media/{path}`. `CoverField` in the blog and event modals gives upload + preview + clear,
  with the URL field kept as a fallback.
- Admin additions: Donations tab (payments, status, receipt downloads, simulated-mode banner) and new
  "Amount raised" / "Receipts issued" KPIs.
- Testing agent iteration 2: 71/73 backend tests passing on submission; the 3 reported bugs (life-tier fee cap,
  ineffective OTP rate limit, 422-vs-400 on short phone) were fixed and re-verified.

### Iteration 1 — site, auth, forms, admin
- All 8 routes + `/blog/:slug` + `/admin`; scroll system, mobile nav, footer with compliance block.
- Home: 3-slide pinned hero with auto-rotation, count-up impact band (6 metrics from `/api/stats`),
  news marquee, mission pillars, UGEPI spotlight with budget bars, compliance strip, CTA band.
- About: vision/mission with parallax, Legal & Transparency Hub (5 badges + 80G card), 5 team cards,
  partner marquee, gallery.
- Campaigns: scroll-stacking active campaign cards with live progress bars from Mongo, UGEPI budget section,
  past projects + gallery. "Fund This Cause" shows a coming-soon toast (payments deferred).
- Join: 3 membership tiers + registration (issues a PBTC membership number, `payment_status: pending`),
  full volunteer form (skills, location, availability, interest area).
- Report-Issue: 3 categories, browser geolocation geotag, photo/PDF upload to object storage (10 MB cap,
  extension validation), instant PH- reference number.
- Blog: debounced search, category chips, tag filter, featured + grid, article page with reading progress,
  email-alert subscribe toggle (stores subscriber; no email sent yet).
- Events: kind filter, month grouping with sticky headers, one-click RSVP toggle gated on sign-in, live counts.
- Dashboard: Google sign-in gate, profile + auth-method display, printable digital membership ID card,
  80G receipt archive placeholder, 3 notification preference toggles (persisted), RSVP list, own issue reports.
- Admin: role-gated (403/401 enforced server-side), 7 tabs — Overview KPIs, Issues (status workflow, map link,
  photo link), Blog CRUD, Events CRUD, Campaign progress inline editing, Volunteers, Members.
- Verified by testing agent: 44/44 backend tests pass, all 9 routes render with no console errors,
  mobile 390px has no horizontal overflow.

## Backlog
### P0 (next)
- Add Razorpay keys and flip payments from simulated to live (code path already built and verified).
### P1
- Connect an SMS provider (Twilio Verify / MSG91) so phone OTPs are actually delivered — implement `send_sms`
  in `backend/sms.py` and set `SMS_PROVIDER`.
- Resend email automation: journal alerts, RSVP confirmations, event reminders, receipt emails.
- Email the 80G receipt PDF to the donor automatically on payment.
### P2
- Split `pages/Admin.jsx` into modules per tab.
- Impact counters editable from admin instead of the seeded `site_stats` document.
- TTL index on `user_sessions.expires_at` and `otp_codes.expires_at`; stream large media downloads.
- Public issue status lookup by reference number for anonymous reporters.
- Store campaign `raised` in paise to remove the paise/rupee unit mix.

## Next tasks
1. Collect Razorpay Key ID + Secret → set live payments.
2. SMS provider for real OTP delivery.
3. Email automation (Resend) including receipt delivery.
