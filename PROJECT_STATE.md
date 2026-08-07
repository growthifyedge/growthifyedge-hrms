# PROJECT_STATE.md — as of 2026-08-08

## Status

- **Wave 1: COMPLETE and APPROVED** (GPT architecture/QA approval given).
- **Wave 2: NOT STARTED.** Next approved work area: **Wave 2 — Time & Leave**,
  pending the Owner/GPT implementation prompt. Do not begin it unprompted.
- Do **not** repeat Wave 1 QA unless a regression is discovered.

## Deployment

- **Production:** https://hrms.growthifyedge.com (custom domain attached by
  the Owner; Cloudflare DNS managed by the Owner — never modify it).
- **Cloudflare Pages:** https://growthifyedge-hrms.pages.dev
  (project `growthifyedge-hrms`; build `npm run build`, output `dist`,
  production branch `main`).
- **GitHub:** https://github.com/growthifyedge/growthifyedge-hrms
  (branches `main` and `feat/hrms-wave-1-foundation`).
- **Production commit:** `60665f2` — includes the premium login-page polish.
  Note: at handoff time the Cloudflare *automatic deployment* toggle had been
  off; the Owner re-enables/triggers builds from the dashboard. Verify what is
  live by comparing the asset hash in the page source with `dist/`.

## Backend (Supabase, project ref wjtsmpsflwxvkhxqcfyl)

- Migrations applied: `0001_schema.sql` (12 tables, constraints, indexes,
  triggers), `0002_rls.sql` (helpers + policies), `0003_storage.sql` (private
  `employee-documents` bucket + policies). Seed applied (`seed.sql`):
  1 org, 6 departments, 18 designations, 4 locations, 36 employees,
  compensation, contacts, 15 sample documents (metadata-only → UI shows a
  disabled "Sample record" badge), 4 announcements, exchange rates,
  dashboard demo metrics. E2E leftovers cleaned via `cleanup_e2e.sql`.
- **Demo users configured and linked** (auth UUIDs stable):
  - `hr.admin@growthifyedge.com` → role `hr_admin`, linked to Sofia Andersson
    (GE-1004).
  - `manager@growthifyedge.com` → role `manager`, linked to Priya Sharma
    (GE-1008, Engineering, 12 direct reports).
  - Passwords rotated by the Owner; they live only in git-ignored `.env.e2e`.
- `dashboard_demo_metrics` is TEMPORARY showcase data for deferred modules
  (attendance/leave/recruitment) — replace with real queries in later waves.

## Verified (live)

- Production + preview: HR admin and manager login, dashboard live data,
  People directory/profiles/add/edit, duplicate rejection, documents
  upload/signed-URL view, currency switching (USD/PKR/GBP/EUR), settings,
  manager scoping (13 visible employees, no compensation, Settings denied),
  SPA deep links + refresh, desktop/tablet/mobile layouts.
- RLS verified by direct REST probes for all three trust levels.
- Local checks green at `60665f2`: typecheck, lint, 63 unit tests, build;
  full Playwright suite last ran green at the Wave 1 sign-off commit.

## Known notes

- Dashboard "Total Employees" intentionally excludes `inactive` (archived)
  employees — labeled "Current workforce, excluding archived".
- Playwright full suite (~30 logins/run) can trip Supabase free-tier auth
  rate limits if repeated back-to-back — run targeted specs.
- `scripts/rotate-demo-passwords.mjs` = env-driven demo password rotation
  (service-role key never stored); `scripts/` may hold similar one-off tools.
