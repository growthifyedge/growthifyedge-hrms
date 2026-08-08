# PROJECT_STATE.md — as of 2026-08-08

## Status

- **Wave 1 — Foundation: COMPLETE and APPROVED.**
- **Wave 2 — Time & Leave: COMPLETE** (live in production).
- **Wave 3 — Recruitment + Onboarding: COMPLETE** (live in production).
- **Wave 4 — Performance Management: COMPLETE** (live in production).
- **Wave 5 — Payroll Overview: COMPLETE** (live in production).
- **Wave 6: NOT STARTED.** Analytics is the only deferred nav item left.
  The next module is Owner/GPT controlled — do not begin it unprompted.
  Do not re-run Wave 1–5 QA unless a regression is discovered.

## Deployment

- **Production:** https://hrms.growthifyedge.com (custom domain attached by
  the Owner; Cloudflare DNS managed by the Owner — never modify it).
- **Cloudflare Pages:** https://growthifyedge-hrms.pages.dev
  (project `growthifyedge-hrms`; build `npm run build`, output `dist`,
  production branch `main`). Branch previews build automatically.
- **GitHub:** https://github.com/growthifyedge/growthifyedge-hrms
  (branches `main` + one feature branch per wave).
- **Production commit:** `8b0096f` — Wave 5 merged fast-forward to `main`;
  verified live (Wave 5 bundle served, `/payroll` deep link 200,
  authenticated smoke test passed against production).

## Backend (Supabase, project ref wjtsmpsflwxvkhxqcfyl)

- Migrations applied: `0001_schema.sql` … `0006_performance.sql`,
  **`0007_payroll.sql`** (payroll_runs + payroll_entries, strict RLS,
  RPCs: `create_payroll_run`, `finalize_payroll_run`,
  `mark_payroll_run_paid`).
- Seeds applied: `seed.sql`, `seed_wave2.sql` … `seed_wave4.sql`,
  **`seed_wave5.sql`** (3 date-relative runs: two months ago paid, last
  month finalized, current month draft; entries snapshot live
  compensation). All seeds rerun-safe.
- Demo users unchanged: `hr.admin@growthifyedge.com` (hr_admin),
  `manager@growthifyedge.com` (manager, Priya Sharma GE-1008).
- `dashboard_demo_metrics` remains unused by the app (harmless leftover).
- **E2E cleanup:** run `supabase/cleanup_e2e.sql` (service role) once at
  convenience — it purges all "E2E"-prefixed artifacts across waves plus
  Wave 5 test payroll runs (period 2030+; seeded runs never match).

## Wave 5 model + security (verified live)

- Demo payroll math only: Gross = Base + Allowances, Net = Gross −
  Deductions. Monthly base derives from compensation via the project rule
  (monthly = x, biweekly = x·26/12, weekly = x·52/12) and is SNAPSHOTTED
  into entries at run creation — later compensation edits never change
  history. "Paid" is a status label only; no payment processing exists.
- One run per org/month; entries unique per run/employee; entry INSERTs
  have no RLS policy (RPC-only); entry updates are draft-only even for
  HR admin — finalization locks everything at the DB level.
- 15 live probes passed: anonymous fully blocked; **managers read no runs
  and no other employees' entries** (payroll follows the Wave 1
  compensation privacy rule; as employees they may read their OWN
  finalized/paid entries — the intended self-service-ready policy);
  manager RPC calls rejected; duplicate month blocked; non-draft
  finalization blocked; paid entries locked even for admin.
- `/payroll` route + nav are HR-admin only; manager deep link hits
  Access Restricted.

## Verified (live, Wave 5)

- 10 targeted Playwright tests green (admin: page/cards/seeded runs,
  entries, currency switch conversion, full create → edit draft →
  finalize → locked lifecycle, profile payroll snapshot, dashboard KPI;
  manager: no nav, blocked route, hidden compensation/payroll on
  profiles; mobile: no horizontal overflow).
- Hosted: 5 preview smoke checks green; 1 production smoke green.
- 138 unit tests, typecheck, lint, build all green.

## Known notes

- Payroll summary cards and the dashboard KPI ignore future-dated runs by
  design (E2E runs use 2030+ months and never distort the demo).
- The dashboard "Monthly Payroll" KPI shows the latest non-draft run
  (falls back to the latest draft); "Payroll by Department" chart remains
  a compensation-derived estimate.
- Playwright: run targeted specs only (`npx playwright test payroll`,
  `performance`, `recruitment`, `time-leave`) — the full suite can trip
  free-tier auth rate limits.
- Supabase embeds need explicit FK hints (see the *_SELECT constants in
  src/hooks).
