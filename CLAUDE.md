# CLAUDE.md — GrowthifyEdge HRMS

Permanent technical instructions for any future Claude session.
Read this, `PROJECT_STATE.md`, `NEXT_CLAUDE_SESSION_PROMPT.md` and
`docs/OWNER_ACCOUNT.md` before touching anything.

## PROJECT STATUS: COMPLETE / PRODUCTION / PORTFOLIO READY / ARCHIVED

All six development waves plus post-archive improvements are finished,
verified and live. There is **no open development phase**. Do not start
new work, add modules, or refactor without explicit Owner/GPT
instructions.

## Project purpose

**GrowthifyEdge HRMS & Employee Management Platform** — a premium
portfolio/showcase application demonstrating a modern integrated HR
management system (Upwork, Fiverr, LinkedIn, YouTube demos, client
meetings). It is *not* a paid SaaS. No AI functionality is included or
approved; never label it "AI HRMS".

## Team roles (fixed)

- **Owner:** Muhammad Junaid / GrowthifyEdge — final product and
  business decision maker.
- **GPT:** Solution Architect / BA / PM / QA / prompt engineer.
- **Claude:** Implementation engineer. Implements only approved
  requirements; must not independently expand scope, add modules, or
  start new development.

## Final architecture

- **Frontend:** React 19 + Vite 7 + TypeScript + Tailwind CSS 4 +
  React Router 7 — static SPA (no SSR, no Next.js, no Vercel, no custom
  servers, no Cloudflare Workers business logic).
- **Libraries:** @supabase/supabase-js, @tanstack/react-query,
  react-hook-form + zod, recharts, lucide-react, date-fns.
  Tests: Vitest + Testing Library + Playwright.
- **Database/Auth/Storage:** Supabase Free (project ref
  `wjtsmpsflwxvkhxqcfyl`) — PostgreSQL, email/password auth, private
  `employee-documents` bucket.
- **Authorization:** Supabase RLS + trusted `profiles.role` model
  (`hr_admin`, `manager`, `employee`).
- **Hosting:** Cloudflare Pages, Git-based deploys from `main`
  (build `npm run build`, output `dist`, SPA fallback via
  `public/_redirects`; branch previews auto-build — aliases truncate at
  28 characters).
- **Production:** https://hrms.growthifyedge.com (Owner-managed domain
  and DNS — never modify).
- **Provider URL:** https://growthifyedge-hrms.pages.dev
- **Repository:** https://github.com/growthifyedge/growthifyedge-hrms

## Cloudflare rules

Free-tier architecture only. No Vercel dependency, no Node-only
production dependency, no unnecessary Worker backend. Any future
addition must remain Cloudflare Pages-compatible.

## Security rules (do not weaken)

- **RLS is the primary authorization boundary** — never rely on hidden
  UI. Helpers are SECURITY DEFINER (`is_hr_admin`, `current_org_id`,
  `current_employee_id`, `is_manager_of`, `can_view_employee`,
  `is_hiring_manager_for`). Privileged writes go only through SECURITY
  DEFINER RPCs: `review_leave_request`, `hire_candidate`,
  `complete_performance_review`, `create_payroll_run`,
  `finalize_payroll_run`, `mark_payroll_run_paid`.
- Never expose the Supabase service-role key in frontend code or env.
  Never commit passwords or secrets. `.env.local` / `.env.e2e` stay
  git-ignored; only `.env.example` is tracked.
- Demo credentials are never stored in the repository. Demo password
  rotation stays local/admin-only (`scripts/rotate-demo-passwords.mjs`).
  There is deliberately NO browser administrative reset bypass.
- Money is stored in USD; display-only conversion via `exchange_rates`
  (USD rate locked to 1). No physical deletes of employees — status
  archiving only.
- Supabase PostgREST embeds require explicit FK hints (see the
  `*_SELECT` constants in `src/hooks`).

## Authentication model (final)

| Identity | Role | Purpose |
| --- | --- | --- |
| `hr.admin@growthifyedge.com` | `hr_admin` | Public demo HR admin for reviewers. Password never stored in repo. |
| `manager@growthifyedge.com` | `manager` | Public demo manager (team-scoped). Password never stored in repo. |
| `growthifyedge@gmail.com` | `hr_admin` (profiles/RLS) | **Private Owner / Security Owner.** Real inbox → real Forgot Password recovery. |

Owner account rules: NOT an employee, has NO `employees` row, never
appears in People/Demo Access/any UI, never affects any employee count
or metric, and its email is never hard-coded in frontend components.
Runbook: `docs/OWNER_ACCOUNT.md`.

## Password recovery security (do not weaken in refactors)

- `/forgot-password` → `supabase.auth.resetPasswordForEmail` with
  production callback `https://hrms.growthifyedge.com/reset-password`
  (must remain on the Supabase redirect allow-list). Response is
  neutral — never reveals whether an account exists.
- `/reset-password` shows the new-password form ONLY after a genuine
  supabase-js `PASSWORD_RECOVERY` event for the current page load
  (gate: `src/lib/passwordRecovery.ts`, listener attached at client
  creation in `src/lib/supabase.ts`). Direct visits, normal signed-in
  sessions, and forged/expired recovery URLs must always show
  "Reset link invalid or expired".
- Normal signed-in users change passwords via **Settings → Security**.

## Face Attendance Demo (portfolio simulator)

Hidden URL: `https://hrms.growthifyedge.com/time-leave?attendanceDemo=1`
(HR Admin only; managers/employees never see it). It is a SIMULATOR:
no physical biometric hardware, no webcam, no camera permission, no
face-recognition API, no biometric processing, and no biometric
template/image storage or tables. It reuses `attendance_records` via
the authenticated client; simulator rows carry the internal notes
marker `[DEMO_FACE_TERMINAL]` (never rendered raw — the UI derives a
"Face Terminal" badge). Normal `/time-leave` is unchanged. Details:
`docs/FACE_ATTENDANCE_DEMO.md`.

Future real integration concept: compatible biometric hardware →
vendor API/SDK connector → secure attendance integration layer → HRMS
attendance. The vendor/device performs verification; HRMS receives
attendance events only. Never store client fingerprints or face
templates in the HRMS without a separately reviewed requirement.

## Custom cursor

`src/components/ui/CustomCursor.tsx` is the single global desktop
cursor system (dot + ring): fine-pointer devices only, respects
`prefers-reduced-motion`, falls back to native cursors on touch/mobile,
preserves native text/select/disabled cursors, zero dependencies.
Never duplicate cursor logic inside individual screens.

## Working conventions

- Structure: `src/components` (ui/layout), `src/contexts`,
  `src/features` (route modules), `src/hooks`, `src/lib`, `supabase/`
  (migrations + seeds), `e2e/`, `docs/`, `scripts/`.
- Verify with `npm run typecheck`, `npm run lint`, `npm test`,
  `npm run build`. Playwright needs `E2E_*` vars from `.env.e2e`; run
  **targeted specs only** (free-tier auth rate-limits burst sign-ins).
- E2E artifacts are always "E2E"-marked; `supabase/cleanup_e2e.sql`
  (service role) purges them without touching seeded demo data.
- Docs: `docs/SUPABASE_SETUP.md`, `docs/CLOUDFLARE_DEPLOYMENT.md`,
  `docs/OWNER_ACCOUNT.md`, `docs/FACE_ATTENDANCE_DEMO.md`.
