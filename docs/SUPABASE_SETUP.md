# Supabase Setup — GrowthifyEdge HRMS (Wave 1)

Complete, ordered setup guide for a free-tier Supabase project.

## 1. Create the project

1. Sign in at <https://supabase.com> (free tier).
2. **New project** → name `growthifyedge-hrms`, choose a strong database password
   (store it in a password manager — it is never used by the frontend).
3. Pick the region closest to your demo audience.

## 2. Apply migrations

Open **SQL Editor** and run each file in order (paste contents, Run):

1. `supabase/migrations/0001_schema.sql` — tables, constraints, indexes, triggers
2. `supabase/migrations/0002_rls.sql` — helper functions + RLS policies
3. `supabase/migrations/0003_storage.sql` — private `employee-documents` bucket + storage policies

(If you use the Supabase CLI instead: `supabase db push` with these files in
`supabase/migrations/`.)

## 3. Apply seed data

Run `supabase/seed.sql` in the SQL Editor. It is idempotent — running it again
does not create duplicates. It creates:

- 1 organization, 6 departments, 18 designations, 4 work locations
- 36 fictional employees (multiple statuses and employment types)
- Compensation for all employees, 15 emergency contacts
- 15 document metadata records, 4 announcements
- Exchange rates (USD/PKR/GBP/EUR) and one dashboard demo-metrics row

> Note: the 15 seeded document rows are **metadata only** — their underlying
> files are not present in Storage, so "View" on them returns a friendly error.
> Documents uploaded through the app are fully viewable.

## 4. Create demo users

**Authentication → Users → Add user → Create new user** (check *Auto Confirm User*):

| Role | Email | Password |
| --- | --- | --- |
| HR Administrator | `hr.admin@growthifyedge.com` | choose a demo-only password |
| Manager | `manager@growthifyedge.com` | choose a demo-only password |

Use throwaway demo passwords — never a personal or production password. The
password is intentionally **not** committed to source control; share it with
reviewers through your normal private channel and/or add it to the login screen
copy later if the Owner approves.

## 5. Link auth users to profiles and employee records

Run in the SQL Editor (replace nothing — it looks up the users by email):

```sql
-- HR Administrator profile
insert into public.profiles (id, organization_id, full_name, email, role)
select u.id, 'aaaa0000-0000-4000-8000-000000000001', 'Sofia Andersson',
       u.email, 'hr_admin'
from auth.users u
where u.email = 'hr.admin@growthifyedge.com'
on conflict (id) do update set role = 'hr_admin';

-- Link the HR admin to the HR Director employee record
update public.employees
set auth_user_id = (select id from auth.users where email = 'hr.admin@growthifyedge.com')
where id = 'ee000000-0000-4000-8000-000000000004';

-- Manager profile (Priya Sharma, Engineering Manager — has 10 direct reports)
insert into public.profiles (id, organization_id, full_name, email, role)
select u.id, 'aaaa0000-0000-4000-8000-000000000001', 'Priya Sharma',
       u.email, 'manager'
from auth.users u
where u.email = 'manager@growthifyedge.com'
on conflict (id) do update set role = 'manager';

-- Link the manager to the Engineering Manager employee record
update public.employees
set auth_user_id = (select id from auth.users where email = 'manager@growthifyedge.com')
where id = 'ee000000-0000-4000-8000-000000000008';
```

## 6. Configure auth URLs

**Authentication → URL Configuration**:

- **Site URL:** `http://localhost:5173` during development; switch to
  `https://hrms.growthifyedge.com` at production launch.
- **Redirect URLs** — add all of:
  - `http://localhost:5173/**`
  - `https://*.<your-pages-project>.pages.dev/**` (Cloudflare preview deployments)
  - `https://hrms.growthifyedge.com/**` (production, when launched)

## 7. Get the frontend keys

**Project Settings → API**:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon / public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`

Copy `.env.example` to `.env` and fill both in. The anon key is safe in the
browser because every table and the storage bucket are protected by RLS.
**Never** put the `service_role` key, database password or any secret key into
frontend env files or Cloudflare Pages variables.

## 8. Verify RLS

Quick manual checks after signing in to the app:

1. Sign in as the **manager** → People shows only Priya + her direct reports;
   `/settings` shows "Access restricted"; no Add Employee button.
2. Test direct database operations as the manager (RLS must block them even
   though the UI hides the buttons). Use the SQL Editor's **Impersonate user**
   feature (select the manager user), then run:
   ```sql
   -- All of these must affect 0 rows or raise an RLS error:
   update public.exchange_rates set rate_from_usd = 999 where currency_code = 'PKR';
   insert into public.employees (organization_id, employee_code, first_name, last_name, work_email, joining_date)
     values ('aaaa0000-0000-4000-8000-000000000001', 'GE-XXXX', 'Not', 'Allowed', 'na@x.com', '2026-01-01');
   update public.organizations set name = 'Hacked';
   select count(*) from public.employees;      -- must be small (self + reports), not 36
   select count(*) from public.employee_compensation; -- must exclude reports' pay
   ```
3. Sign in as the **HR admin** → full directory (36), Settings editable.

## 9. Safely updating seed data

Edit `supabase/seed.sql` and re-run it — fixed UUIDs + `ON CONFLICT DO NOTHING`
make it safe. To change an existing row, write an explicit `UPDATE` statement
instead of editing the insert (inserts do not overwrite existing rows).
Never delete employees — set `status = 'inactive'`.
