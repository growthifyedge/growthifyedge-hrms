# PROJECT_STATE.md — as of 2026-08-08

## Status

- **Wave 1 — Foundation: COMPLETE and APPROVED.**
- **Wave 2 — Time & Leave: COMPLETE** (live in production).
- **Wave 3 — Recruitment + Onboarding: COMPLETE** (live in production).
- **Wave 4 — Performance Management: COMPLETE** (live in production).
- **Wave 5: NOT STARTED.** The next module (remaining deferred nav items:
  Payroll, Analytics) is Owner/GPT controlled — do not begin it unprompted.
  Do not re-run Wave 1–4 QA unless a regression is discovered.

## Deployment

- **Production:** https://hrms.growthifyedge.com (custom domain attached by
  the Owner; Cloudflare DNS managed by the Owner — never modify it).
- **Cloudflare Pages:** https://growthifyedge-hrms.pages.dev
  (project `growthifyedge-hrms`; build `npm run build`, output `dist`,
  production branch `main`). Branch previews build automatically.
- **GitHub:** https://github.com/growthifyedge/growthifyedge-hrms
  (branches `main` + one feature branch per wave).
- **Production commit:** `5ef6477` — Wave 4 merged fast-forward to `main`;
  verified live (Wave 4 bundle served, `/performance` deep link 200,
  authenticated smoke test passed against production).

## Backend (Supabase, project ref wjtsmpsflwxvkhxqcfyl)

- Migrations applied: `0001_schema.sql` … `0005_recruitment.sql`,
  **`0006_performance.sql`** (performance_goals, performance_cycles,
  performance_reviews + RLS + `complete_performance_review` RPC).
- Seeds applied: `seed.sql`, `seed_wave2.sql`, `seed_wave3.sql`,
  **`seed_wave4.sql`** (3 cycles — Q1 closed / Mid-Year active,
  date-relative / Annual draft; 38 goals; 16 reviews with 3 pending in the
  active cycle). All seeds rerun-safe (`ON CONFLICT DO NOTHING`).
- Demo users unchanged: `hr.admin@growthifyedge.com` (hr_admin),
  `manager@growthifyedge.com` (manager, Priya Sharma GE-1008).
- `dashboard_demo_metrics` remains unused by the app (harmless leftover).
- **E2E cleanup:** targeted runs create "E2E"-prefixed records across
  waves (leave requests, jobs/candidates + `E2E-*` employees, goals,
  cycles + their reviews). `supabase/cleanup_e2e.sql` (service role)
  purges all of them; safe to re-run whenever convenient.

## Wave 4 security model (verified live)

- `complete_performance_review` RPC is the only completion path —
  `performance_reviews` has no UPDATE policy. Server-side overall rating
  (average of 4 dimensions, one decimal), reviewer + timestamp recorded.
  Verified live (19 probes): anonymous blocked; manager scoped to
  self + direct reports for goals/reviews; manager cannot create/update
  unrelated goals, complete unrelated reviews, review themselves, or
  bypass the RPC; ratings outside 1–5 rejected; completed reviews cannot
  be re-completed.
- Goals: HR admin org-wide; managers create/edit direct-report goals
  (insert/update policies use `is_manager_of`); individuals read their own
  (self-service ready). Individuals read own COMPLETED reviews only.
- One review per employee per cycle (`UNIQUE (employee_id, cycle_id)`).

## Verified (live, Wave 4)

- 10 targeted Playwright tests green (admin: page/stats, goal create +
  progress update, seeded reviews + distribution, cycle + review creation
  and completion with 4.5 rating check, profile Performance tab, dashboard
  reviews-due; manager: scoping, direct-report goal management,
  direct-report review completion; mobile: no horizontal overflow).
- Hosted: 5 preview smoke checks green; 1 production smoke green.
- 128 unit tests, typecheck, lint, build all green.

## Known notes

- Rating model is fixed: four 1–5 dimensions, overall = average, bands
  4.5+ Exceptional / 3.5+ Exceeds / 2.5+ Meets / 1.5+ Needs Improvement /
  below Unsatisfactory. No weighted or configurable scoring by design.
- Review flow: New Review creates a pending shell (admin or direct
  manager); completion happens in the review drawer via the RPC.
- Goals are flat (no OKR trees); completed goals must be at 100%.
- Playwright: run targeted specs only (`npx playwright test performance`,
  `recruitment`, `time-leave`) — full suite can trip free-tier auth rate
  limits. Success toasts overlay drawer footer buttons in bottom-right;
  specs dismiss them explicitly before footer clicks.
- Supabase embeds need explicit FK hints (see the *_SELECT constants in
  src/hooks).
