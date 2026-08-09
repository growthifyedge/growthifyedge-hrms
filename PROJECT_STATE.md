# PROJECT_STATE.md — final state, last updated 2026-08-09

## PROJECT STATUS: COMPLETE / PRODUCTION / PORTFOLIO READY / ARCHIVED

The application contains **no unfinished development wave** and no open
development phase. Do not start new work without explicit Owner/GPT
instructions.

## Production references

- **Production:** https://hrms.growthifyedge.com
- **Face Attendance portfolio demo:**
  https://hrms.growthifyedge.com/time-leave?attendanceDemo=1
  (HR Admin only, hidden simulator — see `docs/FACE_ATTENDANCE_DEMO.md`)
- **Cloudflare Pages:** https://growthifyedge-hrms.pages.dev
- **GitHub:** https://github.com/growthifyedge/growthifyedge-hrms
- Production branch `main`; build `npm run build` → `dist`; SPA fallback
  `public/_redirects`; automatic branch previews (28-char alias limit).

## Completed development history

- **Wave 1 — Foundation:** People + Dashboard + Settings, auth, RLS,
  documents, currency system.
- **Wave 2 — Time & Leave:** attendance + leave with approval RPC.
- **Wave 3 — Recruitment + Onboarding:** jobs, pipeline, hire RPC,
  onboarding checklists.
- **Wave 4 — Performance Management:** goals, cycles, reviews with
  completion RPC.
- **Wave 5 — Payroll Overview:** runs/entries, snapshot math,
  finalize/paid RPCs, HR-admin only.
- **Wave 6 — Analytics + Final Portfolio Polish:** consolidated live
  analytics, final navigation, placeholder removal.
- **Post-archive improvements:** Forgot Password, Reset Password with
  PASSWORD_RECOVERY-gated route security, Settings → Security → Change
  Password, private Owner/Security account architecture, premium global
  custom cursor, Face Attendance Demo simulator + biometric integration
  concept documentation.

## Final primary modules (all live)

1. Dashboard (live KPIs across all modules)
2. People
3. Time & Leave
4. Recruitment (+ Onboarding tab)
5. Performance
6. Payroll (HR admin only)
7. Analytics (HR admin only)
8. Settings (incl. Security → Change Password)

Connected functionality: employee profiles (overview, employment,
attendance, leave, performance, payroll, documents tabs) ·
departments/designations/locations · employee documents (private
bucket, signed URLs) · attendance · leave management + leave balances ·
simulated Face Attendance Demo · recruitment pipeline · job openings ·
candidate hiring (transactional) · onboarding checklists · performance
goals · review cycles · performance ratings (4 dimensions, fixed
bands) · payroll runs + entries (snapshotted, lockable) ·
multi-currency display (USD base) · workforce analytics · password
recovery + change password · private Owner security account ·
role-based access (hr_admin / manager / employee-ready) · Supabase
RLS · responsive/mobile UX · global custom cursor.

## Database state (Supabase project ref wjtsmpsflwxvkhxqcfyl)

Migrations applied, in order:

1. `0001_schema.sql` — core schema (12 tables)
2. `0002_rls.sql` — RLS helpers + Wave 1 policies
3. `0003_storage.sql` — private employee-documents bucket
4. `0004_time_leave.sql` — attendance/leave + review_leave_request RPC
5. `0005_recruitment.sql` — jobs/candidates/onboarding + hire_candidate RPC
6. `0006_performance.sql` — goals/cycles/reviews + complete_performance_review RPC
7. `0007_payroll.sql` — runs/entries + create/finalize/mark-paid RPCs

Seeds applied (all rerun-safe, date-relative where useful): `seed.sql`,
`seed_wave2.sql`, `seed_wave3.sql`, `seed_wave4.sql`, `seed_wave5.sql`.
Maintenance: `cleanup_e2e.sql` (service role) purges all E2E/demo
artifacts, including Face Attendance simulator rows, without touching
seeded demo data.

Notes: Wave 6 Analytics required NO migration (reads existing data).
The Face Attendance Demo required NO migration (notes-field marker).
The auth UX/security fixes required NO business-data migration.
`dashboard_demo_metrics` remains in the DB but is unused by the app.

## Authentication / security architecture (final)

- Public demo HR admin `hr.admin@growthifyedge.com` (`hr_admin`) and
  demo manager `manager@growthifyedge.com` (`manager`); passwords are
  never stored in the repo (git-ignored `.env.e2e` for local E2E;
  rotation via `scripts/rotate-demo-passwords.mjs`).
- Private Owner/Security account `growthifyedge@gmail.com` — `hr_admin`
  via profiles/RLS, real recovery inbox, NOT an employee, no
  `employees` row, hidden from all UI and metrics. Runbook:
  `docs/OWNER_ACCOUNT.md`.
- `/reset-password` is gated by the genuine `PASSWORD_RECOVERY` event
  (`src/lib/passwordRecovery.ts`); direct/forged/expired access shows
  "Reset link invalid or expired". `/forgot-password` gives a neutral
  response. Signed-in changes: Settings → Security.
- RLS everywhere; six SECURITY DEFINER RPCs are the only privileged
  write paths; 65+ live security probes passed across the waves.
- Roles: hr_admin (full org) · manager (self + direct reports;
  view-only outside goal/review management; NO compensation, payroll,
  or org analytics) · employee (self-service-ready policies, no UI).

## Test state

- 160 Vitest unit tests green; typecheck, lint, production build green.
- Targeted Playwright specs per area (`auth`, `auth-password`,
  `people`, `documents`, `routing`, `time-leave`, `recruitment`,
  `performance`, `payroll`, `analytics`, `cursor`, `face-demo`).
  Run **targeted specs only** — the full suite can trip Supabase
  free-tier auth rate limits.

## Backups

- `E:\growthifyedge-hrms-final-archive.zip` — final archive of the
  current production state (tracked files only; no node_modules, no
  secrets). Size + SHA-256 recorded in the final handoff report.
- Older: `E:\growthifyedge-hrms-final-backup.zip` (pre-dates the
  post-archive auth/cursor/face-demo changes).
