# Private Owner / Security Account

A private Owner identity (`growthifyedge@gmail.com`, a real mailbox) with
full HR-Admin-equivalent access through the existing profile/RLS model.
It is intentionally **not** an employee and never appears in the app UI.

## Design

- Auth user + `profiles` row only (`role = 'hr_admin'`, `status = 'active'`,
  existing GrowthifyEdge organization). **No `employees` row** — so it can
  never affect headcount, attendance, leave, recruitment, performance,
  payroll entries or analytics.
- Authorization comes exclusively from the existing trusted
  profile/RLS architecture (`is_hr_admin()` etc.). No email-string
  checks, no new role, no frontend changes, no hard-coded email.
- The Owner signs in through the normal login form by typing the email
  manually; the Demo Access panel continues to list only the two demo
  identities. Forgot Password works normally because the mailbox is real.
- Demo identities (`hr.admin@` / `manager@growthifyedge.com`) are
  unchanged; their administrative recovery remains
  `scripts/rotate-demo-passwords.mjs` (local, env-driven, never in the
  browser).

## One-time creation (Owner, Supabase Dashboard)

1. **Create the Auth user** — Supabase Dashboard → Authentication →
   Users → **Add user** → *Create new user*:
   - Email: `growthifyedge@gmail.com`
   - Password: choose privately (never share it, never paste it in chat)
   - Enable **Auto Confirm User** (or confirm via the email it sends)
2. **Create the linked profile** — SQL Editor, run (rerun-safe, no UUID
   paste needed):

```sql
insert into public.profiles (id, organization_id, full_name, email, role, status)
select u.id,
       'aaaa0000-0000-4000-8000-000000000001',
       'GrowthifyEdge Owner',
       'growthifyedge@gmail.com',
       'hr_admin',
       'active'
from auth.users u
where lower(u.email) = 'growthifyedge@gmail.com'
on conflict (id) do nothing;

-- Verification: role/status correct and employee_links must be 0.
select p.full_name, p.role, p.status,
       (select count(*) from public.employees e where e.auth_user_id = p.id) as employee_links
from public.profiles p
where p.email = 'growthifyedge@gmail.com';
```

3. Sign in at https://hrms.growthifyedge.com with the new credentials.
   Expected: full HR Admin workspace; "My profile" absent from the
   account menu (no employee record); Total Employees and every other
   metric unchanged.

Do **not** create an `employees` row for this account.
