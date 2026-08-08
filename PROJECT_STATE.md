# PROJECT_STATE.md — as of 2026-08-08

## Status

- **Wave 1: COMPLETE and APPROVED.**
- **Wave 2 — Time & Leave: COMPLETE** (attendance + leave management live in
  production). Do not repeat Wave 1/2 QA unless a regression is discovered.
- **Wave 3: NOT STARTED.** The next module remains Owner/GPT controlled —
  do not begin it unprompted.

## Deployment

- **Production:** https://hrms.growthifyedge.com (custom domain attached by
  the Owner; Cloudflare DNS managed by the Owner — never modify it).
- **Cloudflare Pages:** https://growthifyedge-hrms.pages.dev
  (project `growthifyedge-hrms`; build `npm run build`, output `dist`,
  production branch `main`). Branch previews build automatically
  (verified for `feat/hrms-wave-2-time-leave`).
- **GitHub:** https://github.com/growthifyedge/growthifyedge-hrms
  (branches `main`, `feat/hrms-wave-1-foundation`, `feat/hrms-wave-2-time-leave`).
- **Production commit:** `f62bb43` — Wave 2 merged fast-forward to `main`;
  verified live (bundle contains `/time-leave`, deep link + refresh work,
  authenticated smoke test passed against production).

## Backend (Supabase, project ref wjtsmpsflwxvkhxqcfyl)

- Migrations applied: `0001_schema.sql`, `0002_rls.sql`, `0003_storage.sql`,
  **`0004_time_leave.sql`** (attendance_records, leave_types, leave_balances,
  leave_requests + RLS + `review_leave_request` RPC).
- Seeds applied: `seed.sql` (Wave 1) and **`seed_wave2.sql`** (4 leave types,
  102 leave balances, 12 leave requests, ~630 attendance rows over ~18 recent
  working days). `seed_wave2.sql` is rerun-safe (`ON CONFLICT DO NOTHING`);
  attendance/statuses are deterministic (hashtext), dates relative to run day.
- Demo users unchanged: `hr.admin@growthifyedge.com` (hr_admin, Sofia
  Andersson GE-1004), `manager@growthifyedge.com` (manager, Priya Sharma
  GE-1008, Engineering, 12 reports). Passwords only in git-ignored `.env.e2e`.
- `dashboard_demo_metrics` now backs ONLY recruitment placeholders (open
  vacancies, pipeline, non-leave pending actions). Attendance rate/trend,
  on-leave today and pending leave come from live Wave 2 tables.
- **E2E cleanup:** targeted Playwright runs create a few leave requests with
  reasons prefixed `E2E `; run `supabase/cleanup_e2e.sql` (service role) to
  purge them. Some exist from Wave 2 verification and can be purged anytime.

## Wave 2 security model (verified live)

- `review_leave_request` RPC is the ONLY write path for approvals —
  `leave_requests` has no UPDATE policy. Verified: HR admin org-wide review;
  manager direct-reports only; manager self-approval blocked; non-pending
  re-review blocked; invalid decisions rejected; manager cannot insert or
  update attendance; cross-scope reads blocked (18 REST/RPC probes passed).
- Attendance: HR admin insert/update org-wide; manager/employee read
  self + direct reports via Wave 1 `can_view_employee` helper.
- One attendance record per employee per day
  (`UNIQUE (employee_id, attendance_date)`, UI upserts and auto-detects
  existing records).

## Verified (live, Wave 2)

- 15 targeted Playwright tests green (HR admin flows, manager scoping +
  direct-report approval, mobile no-overflow) — local against live Supabase.
- Hosted: 4 preview smoke checks green (admin /time-leave with deep-link
  refresh, manager scoping, mobile attendance + leave cards); 1 production
  smoke green. 92 unit tests, typecheck, lint, build all green.

## Known notes

- Attendance rate formula: (present+late+remote)/(present+late+remote+absent);
  on_leave excluded from the denominator. Dashboard uses the latest working
  day with records, so weekend demos still show data.
- Leave balances derive used/remaining from approved requests (no counters).
  Unpaid Leave has no balance enforcement.
- Playwright full suite (~30 logins/run) can trip Supabase free-tier auth
  rate limits — run targeted specs (`npx playwright test time-leave`).
- Supabase embeds still need explicit FK hints (see `EMPLOYEE_SELECT`,
  `ATTENDANCE_SELECT`, `LEAVE_REQUEST_SELECT`).
