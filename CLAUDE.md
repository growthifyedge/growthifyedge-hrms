# CLAUDE.md — GrowthifyEdge HRMS

Read this and `PROJECT_STATE.md` before touching anything.

## PROJECT STATUS: COMPLETE / PRODUCTION / ARCHIVED

All six development waves are finished, verified and live in production
(https://hrms.growthifyedge.com). There is **no open development phase** —
do not start new work without explicit Owner/GPT instructions. Final
modules: Dashboard, People, Time & Leave, Recruitment + Onboarding,
Performance, Payroll, Analytics, Settings.

## Project identity

**GrowthifyEdge HRMS & Employee Management Platform** — a premium **portfolio /
client-showcase** application (Upwork, Fiverr, LinkedIn, YouTube demos, client
meetings). It is *not* a paid SaaS. Never call it "AI HRMS" or "Enterprise
HRMS"; no AI functionality is approved.

## Team roles (fixed)

- **Muhammad Junaid** — Owner, Product Owner, final decision-maker.
- **GPT** — Product Strategist, Architect, BA, UX Consultant, QA Lead, PM.
- **Claude** — Developer and technical implementer. Implement only approved
  requirements; do not independently add modules, change workflows, replace
  the stack, or start a later wave.

## Governing rules

1. **Showcase-first:** maximum visual/business impact with minimum development
   time. Premium look ("Executive Light": light neutrals, white surfaces, navy
   `#0f2440` sidebar, single blue accent), calm and professional. Do not
   overengineer.
2. **Free-tier only:** no paid APIs, templates, fonts, AI, hosting, or
   subscriptions. Everything must run on Cloudflare Pages Free + Supabase Free.
3. **Do not expand scope.** When a detail is unspecified, choose the simplest
   professional solution, document it, and continue. Stop only for genuine
   blockers (missing access, destructive prod operation, paid requirement,
   requirement conflict, unresolvable security risk).

## Approved architecture

- **Frontend:** React 19 + Vite 7 + TypeScript + Tailwind CSS 4 + React Router 7
  — a static SPA. No SSR, no Next.js, **no Vercel anything**, no custom
  servers, no Cloudflare Workers business logic.
- **Data/auth/storage:** Supabase (PostgreSQL, Auth email/password, private
  Storage bucket `employee-documents`, RLS).
- **Libraries:** @supabase/supabase-js, @tanstack/react-query, react-hook-form
  + zod, recharts, lucide-react, date-fns. Tests: Vitest + Testing Library +
  Playwright.
- **Hosting:** Cloudflare Pages, Git-based deploys. Build `npm run build`,
  output `dist`, production branch `main`, SPA fallback via `public/_redirects`.

## Security rules

- **RLS is the authorization boundary** — never rely on hidden UI. Policies in
  `supabase/migrations/0002_rls.sql` (helpers are SECURITY DEFINER to avoid
  recursion); storage policies in `0003_storage.sql`.
- Roles: `hr_admin` (full org), `manager` (self + direct reports; **no
  compensation access**, no settings), `employee` (policies ready, UI deferred).
- All money stored in **USD**; display-only conversion via `exchange_rates`
  (demo rates). USD rate locked to 1 by policy.
- **Never** put the service-role key in frontend code/env, commit any secret,
  or print credentials. `.env.local` / `.env.e2e` are git-ignored; only
  `.env.example` is tracked. No physical deletes of employees — status
  archiving only.
- Supabase PostgREST embeds require explicit FK hints (two relationships exist
  between employees and departments); see `EMPLOYEE_SELECT` in
  `src/hooks/useEmployees.ts`.

## Working conventions

- Structure: `src/components` (ui/layout), `src/contexts` (auth, currency,
  toast), `src/features` (route modules), `src/hooks` (React Query),
  `src/lib`, `supabase/` (migrations + seed), `e2e/`, `docs/`.
- Verify with: `npm run typecheck`, `npm run lint`, `npm test`,
  `npm run build`. Playwright integration tests need `E2E_*` vars from
  `.env.e2e` — run **targeted specs**, not repeated full suites (free-tier
  auth rate-limits burst sign-ins).
- Docs: `docs/SUPABASE_SETUP.md`, `docs/CLOUDFLARE_DEPLOYMENT.md`.
