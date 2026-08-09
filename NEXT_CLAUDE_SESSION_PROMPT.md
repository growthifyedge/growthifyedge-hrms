# Prompt for the next Claude session

**GrowthifyEdge HRMS — COMPLETE / PRODUCTION / PORTFOLIO READY / ARCHIVED.**

This project is finished and live at https://hrms.growthifyedge.com.
There is no open development phase and no planned next wave. This file
exists so a brand-new Claude conversation can recover full context from
the folder alone.

If you are resuming in this folder:

1. **Read, in order:**
   - `CLAUDE.md` — permanent rules, roles, architecture, security model
   - `PROJECT_STATE.md` — exact final production/module/database state
   - this file
   - `docs/OWNER_ACCOUNT.md` — private Owner/Security account design

2. Run `git status`, check the current branch and the latest `main`
   commit (`git log --oneline -5`).

3. **Do NOT modify code immediately.** Do not deploy, do not re-run
   historical QA suites, do not touch DNS, Cloudflare, or Supabase
   settings.

4. Report back a short summary of your understanding of:
   - project architecture (React/Vite/TS SPA + Supabase + Cloudflare Pages)
   - production state and URLs
   - module state (all eight modules complete; no unfinished wave)
   - authentication/security architecture (RLS + profiles.role, RPC-only
     privileged writes, PASSWORD_RECOVERY-gated reset route)
   - the private Owner account design (hr_admin profile, no employees
     row, hidden from UI/metrics)
   - the Face Attendance Demo simulator (hidden, HR-admin-only,
     no biometrics — `docs/FACE_ATTENDANCE_DEMO.md`)
   - deployment architecture (Git-based Cloudflare Pages from `main`)

5. **Wait for explicit Owner/GPT instructions** before any change.
   Likely future requests are small: demo-data refreshes, genuine
   regression fixes, or portfolio material support — each needs an
   explicit prompt.

6. Do NOT automatically start another module, wave, or refactor.
