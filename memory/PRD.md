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
- Payments (Phase 4): donation gateway on Campaigns + membership fee checkout on Join — needs the user to pick
  Stripe or Razorpay. Blocks 80G receipts.
### P1
- Dashboard depth (Phase 5): server-side PDF membership ID + 80G receipt generation, receipt archive.
- Resend email automation: journal alerts, RSVP confirmations, event reminders.
- Phone (OTP) login as a second auth method (`auth_method` field already extensible).
### P2
- Admin image uploads for blog/event covers (currently URL fields).
- Impact counters editable from admin instead of the seeded `site_stats` document.
- TTL index on `user_sessions.expires_at`; stream large file downloads.
- Public issue status lookup by reference number for anonymous reporters.

## Next tasks
1. Confirm payment provider → implement Phase 4 (donations + membership checkout, both on one integration).
2. Phase 5: PDF receipts/ID + Resend email automation.
3. Phone OTP auth, then admin cover-image uploads.
