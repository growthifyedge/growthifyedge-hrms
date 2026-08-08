# PROJECT_STATE.md — as of 2026-08-08

## Status

- **Wave 1 — Foundation: COMPLETE and APPROVED.**
- **Wave 2 — Time & Leave: COMPLETE** (live in production).
- **Wave 3 — Recruitment + Onboarding: COMPLETE** (live in production).
- **Wave 4: NOT STARTED.** The next module remains Owner/GPT controlled —
  do not begin it unprompted. Do not re-run Wave 1–3 QA unless a regression
  is discovered.

## Deployment

- **Production:** https://hrms.growthifyedge.com (custom domain attached by
  the Owner; Cloudflare DNS managed by the Owner — never modify it).
- **Cloudflare Pages:** https://growthifyedge-hrms.pages.dev
  (project `growthifyedge-hrms`; build `npm run build`, output `dist`,
  production branch `main`). Branch previews build automatically.
- **GitHub:** https://github.com/growthifyedge/growthifyedge-hrms
  (branches `main` + one feature branch per wave).
- **Production commit:** `f01159c` — Wave 3 merged fast-forward to `main`;
  verified live (Wave 3 bundle served, `/recruitment` deep link 200,
  authenticated smoke test passed against production).

## Backend (Supabase, project ref wjtsmpsflwxvkhxqcfyl)

- Migrations applied: `0001_schema.sql`, `0002_rls.sql`, `0003_storage.sql`,
  `0004_time_leave.sql`, **`0005_recruitment.sql`** (job_openings,
  candidates, onboarding_tasks + RLS + `hire_candidate` RPC +
  `is_hiring_manager_for` helper).
- Seeds applied: `seed.sql`, `seed_wave2.sql`, **`seed_wave3.sql`**
  (6 jobs — 5 open / 1 closed, 28 candidates across all six stages,
  onboarding checklists for the three ATS hires at 6/6, 3/6, 1/6). All
  seeds are rerun-safe (`ON CONFLICT DO NOTHING`) and date-relative.
- Demo users unchanged: `hr.admin@growthifyedge.com` (hr_admin),
  `manager@growthifyedge.com` (manager, Priya Sharma GE-1008 — also the
  hiring manager of both Engineering job openings). Passwords only in
  git-ignored `.env.e2e`.
- `dashboard_demo_metrics` is now **unused by the app** (kept in the DB
  only as a harmless leftover; drop in a future cleanup migration if ever
  convenient).
- **E2E cleanup:** targeted runs create "E2E"-prefixed records (leave
  requests, one draft job, one hired candidate + employee `E2E-*` with
  onboarding). Run `supabase/cleanup_e2e.sql` (service role) to purge all
  of them; it is safe to re-run.

## Wave 3 security model (verified live)

- `hire_candidate` RPC is the only hire path: HR-admin-only, same-org,
  blocks double-hire (also enforced by a partial unique index on
  candidates.hired_employee_id), creates employee + starter compensation +
  links candidate + six onboarding tasks transactionally.
- Managers are strictly view-only: open jobs + jobs they hire for,
  candidates of their own jobs only, onboarding of direct reports only.
  16 live probes passed (anon blocked, manager writes blocked, double-hire
  blocked, scoping verified).
- Attendance/leave (Wave 2) security unchanged: `review_leave_request`
  RPC is the only approval path.

## Verified (live, Wave 3)

- 12 targeted Playwright tests green (admin: jobs CRUD, pipeline board,
  add candidate, stage moves with interview/offer capture, hire →
  employee profile, onboarding task completion, live dashboard; manager:
  read-only scoping; mobile: no horizontal overflow).
- Hosted: 5 preview smoke checks green; 1 production smoke green.
- 111 unit tests, typecheck, lint, build all green.

## Known notes

- Candidate pipeline is click-driven (stage moves in the candidate
  drawer) — intentionally no drag-and-drop.
- One candidate row = one job application; interview details live on the
  candidate record (no separate interview table).
- Salary fields (expected/proposed) are stored in USD; display converts
  via the global currency system.
- Playwright: run targeted specs only (`npx playwright test recruitment`,
  `time-leave`) — the full suite can trip free-tier auth rate limits.
- Supabase embeds need explicit FK hints (see `EMPLOYEE_SELECT`,
  `ATTENDANCE_SELECT`, `LEAVE_REQUEST_SELECT`, `JOB_SELECT`,
  `CANDIDATE_SELECT`).
