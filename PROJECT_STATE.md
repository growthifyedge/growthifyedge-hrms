# PROJECT_STATE.md — as of 2026-08-09

## PROJECT STATUS: COMPLETE / PRODUCTION / ARCHIVED

## Post-archive maintenance log

- **2026-08-09 — Reset-route security fix + private Owner account**
  (commit `595d39e`, live): `/reset-password` now renders its form ONLY
  after a genuine supabase-js `PASSWORD_RECOVERY` event (listener attached
  at client creation in `src/lib/passwordRecovery.ts`; in-memory flag,
  cleared after use). Direct visits, normal signed-in sessions and
  expired/forged links show "Reset link invalid or expired" instead —
  verified directly against production. Signed-in users change passwords
  in Settings → Security. A private Owner/Security account
  (`growthifyedge@gmail.com`, real mailbox, `hr_admin` profile, **no
  employees row**, hidden from all UI/metrics) is documented in
  `docs/OWNER_ACCOUNT.md` — Owner creates the Auth user in the dashboard
  and runs the rerun-safe profile SQL there. Demo identities unchanged;
  `scripts/rotate-demo-passwords.mjs` remains their recovery path.

- **2026-08-09 — Auth password UX** (commit `0dabbe1`, live): login
  "Forgot password?" link + updated invalid-login message;
  `/forgot-password` (resetPasswordForEmail, neutral confirmation);
  `/reset-password` (recovery-session updateUser, 8+ chars with letter +
  number, expired-link handling); Settings → Security change-password
  (authenticated updateUser — installed supabase-js has no
  current-password parameter). Demo identities have no mailboxes:
  `scripts/rotate-demo-passwords.mjs` remains their administrative
  recovery path (no bypass exists). **Owner dashboard check:** Supabase →
  Authentication → URL Configuration must include
  `https://hrms.growthifyedge.com/reset-password` in the Redirect URLs
  allow-list, or reset links will land on the site root.

- **Wave 1 — Foundation: COMPLETE** (people, documents, dashboard, auth, RLS)
- **Wave 2 — Time & Leave: COMPLETE**
- **Wave 3 — Recruitment + Onboarding: COMPLETE**
- **Wave 4 — Performance Management: COMPLETE**
- **Wave 5 — Payroll Overview: COMPLETE**
- **Wave 6 — Analytics + Final Polish: COMPLETE**
- **No open development phase.** Do not start new work without explicit
  Owner/GPT instructions.

## Deployment (final)

- **Production:** https://hrms.growthifyedge.com (Owner-managed custom
  domain + Cloudflare DNS — never modify).
- **Cloudflare Pages:** https://growthifyedge-hrms.pages.dev
  (project `growthifyedge-hrms`; build `npm run build`, output `dist`,
  production branch `main`; SPA fallback via `public/_redirects`;
  automatic branch previews — note aliases truncate at 28 characters).
- **GitHub:** https://github.com/growthifyedge/growthifyedge-hrms
- **Final production commit:** `0dabbe1` (Wave 6 archive at `c26516a`
  plus the post-archive auth UX maintenance; verified live).

## Final module list

Dashboard (live KPIs across all modules) · People (directory, profiles,
documents) · Time & Leave (attendance + leave with approval RPC) ·
Recruitment (jobs, pipeline, hire RPC) + Onboarding (six-task checklists) ·
Performance (goals, cycles, four-dimension reviews with completion RPC) ·
Payroll (runs/entries, snapshot math, finalize/paid RPCs, HR-admin only) ·
Analytics (consolidated live analytics, HR-admin only) · Settings
(org, departments, designations, locations, exchange rates).

## Architecture (final)

- **Frontend:** React 19 + Vite 7 + TypeScript + Tailwind CSS 4 + React
  Router 7 static SPA; @tanstack/react-query, react-hook-form + zod,
  recharts, lucide-react, date-fns. No SSR, no workers, no paid services.
- **Backend:** Supabase Free (project ref `wjtsmpsflwxvkhxqcfyl`) —
  PostgreSQL, email/password auth, private `employee-documents` bucket.
- **Migrations:** `0001_schema` … `0007_payroll` (all applied). Seeds:
  `seed.sql` + `seed_wave2` … `seed_wave5` (all applied, rerun-safe).
  `dashboard_demo_metrics` remains in the DB but the app no longer reads
  it (kept — no migration just to drop it).

## Security model (final, all verified live)

- RLS is the authorization boundary on every table; Wave 1 SECURITY
  DEFINER helpers (`is_hr_admin`, `current_org_id`, `current_employee_id`,
  `is_manager_of`, `can_view_employee`, `is_hiring_manager_for`).
- Roles: `hr_admin` (full org), `manager` (self + direct reports;
  view-only outside Time & Leave goal/review management; NO compensation,
  payroll, or org analytics), `employee` (self-service-ready policies,
  no UI).
- Privileged writes go through SECURITY DEFINER RPCs only:
  `review_leave_request`, `hire_candidate`, `complete_performance_review`,
  `create_payroll_run`, `finalize_payroll_run`, `mark_payroll_run_paid`.
- Money stored in USD; display-only conversion via `exchange_rates`.
- 65+ live REST/RPC security probes passed across Waves 2–5; Wave 6
  role-restriction verified in hosted tests.

## Test state (final)

- 146 unit tests (Vitest) green; typecheck, lint, production build green.
- Targeted Playwright per wave (auth/people/documents/routing from Wave 1;
  time-leave, recruitment, performance, payroll, analytics) — run
  **targeted specs only**; the full suite can trip Supabase free-tier auth
  rate limits.
- Demo users: `hr.admin@growthifyedge.com` (hr_admin),
  `manager@growthifyedge.com` (manager, Priya Sharma GE-1008). Passwords
  git-ignored in `.env.e2e`.

## Housekeeping

- `supabase/cleanup_e2e.sql` (service role) purges all E2E artifacts
  across waves (E2E-prefixed records, `E2E-*` employees, payroll runs
  dated 2030+). Run once after any targeted E2E session; never touches
  seeded demo data. Wave 6 analytics tests are read-only (no cleanup).
- Local backup: `growthifyedge-hrms-final-backup.zip` (see final report
  for path/checksum). `.env.local` / `.env.e2e` remain git-ignored; only
  `.env.example` is tracked.
