-- GrowthifyEdge HRMS — Wave 1 Row-Level Security
-- RLS is the primary authorization boundary. Helper functions are
-- SECURITY DEFINER so policies never recurse into RLS-protected tables.

-- ---------------------------------------------------------------------------
-- Helper functions (owned by postgres; bypass RLS internally)
-- ---------------------------------------------------------------------------

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_hr_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'hr_admin' and status = 'active'
       from public.profiles where id = auth.uid()),
    false);
$$;

-- Employee row linked to the signed-in auth user (null when unlinked).
create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.employees where auth_user_id = auth.uid();
$$;

-- True when the signed-in user manages the given employee (direct reports).
create or replace function public.is_manager_of(target_employee uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees e
    where e.id = target_employee
      and e.manager_id = public.current_employee_id()
  );
$$;

-- Visible employee scope for the signed-in user:
-- hr_admin -> all org employees; manager/employee -> self + direct reports.
create or replace function public.can_view_employee(target_employee uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_hr_admin()
    and exists (
      select 1 from public.employees e
      where e.id = target_employee
        and e.organization_id = public.current_org_id())
    or target_employee = public.current_employee_id()
    or public.is_manager_of(target_employee);
$$;

revoke execute on function public.current_org_id, public.current_role_name,
  public.is_hr_admin, public.current_employee_id, public.is_manager_of,
  public.can_view_employee from anon;

-- ---------------------------------------------------------------------------
-- Enable RLS on every application table
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.designations enable row level security;
alter table public.work_locations enable row level security;
alter table public.employees enable row level security;
alter table public.employee_compensation enable row level security;
alter table public.employee_emergency_contacts enable row level security;
alter table public.employee_documents enable row level security;
alter table public.announcements enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.dashboard_demo_metrics enable row level security;

-- ---------------------------------------------------------------------------
-- organizations: members read their org; HR admin edits it. No deletes.
-- ---------------------------------------------------------------------------
create policy organizations_select on public.organizations
  for select to authenticated
  using (id = public.current_org_id());

create policy organizations_update on public.organizations
  for update to authenticated
  using (id = public.current_org_id() and public.is_hr_admin())
  with check (id = public.current_org_id() and public.is_hr_admin());

-- ---------------------------------------------------------------------------
-- profiles: users read their own profile; HR admin reads org profiles.
-- ---------------------------------------------------------------------------
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin());

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

-- ---------------------------------------------------------------------------
-- Lookup tables (departments, designations, work_locations):
-- all org members read; HR admin writes. No deletes (status archiving only).
-- ---------------------------------------------------------------------------
create policy departments_select on public.departments
  for select to authenticated
  using (organization_id = public.current_org_id());

create policy departments_insert on public.departments
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy departments_update on public.departments
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy designations_select on public.designations
  for select to authenticated
  using (organization_id = public.current_org_id());

create policy designations_insert on public.designations
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy designations_update on public.designations
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy work_locations_select on public.work_locations
  for select to authenticated
  using (organization_id = public.current_org_id());

create policy work_locations_insert on public.work_locations
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy work_locations_update on public.work_locations
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

-- ---------------------------------------------------------------------------
-- employees:
--   HR admin: select/insert/update within org.
--   Manager/employee: select self + direct reports only. No deletes.
-- ---------------------------------------------------------------------------
create policy employees_select_admin on public.employees
  for select to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin());

create policy employees_select_self_and_reports on public.employees
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (id = public.current_employee_id() or manager_id = public.current_employee_id())
  );

create policy employees_insert_admin on public.employees
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy employees_update_admin on public.employees
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

-- ---------------------------------------------------------------------------
-- employee_compensation: HR admin manages; employees read their own.
-- Managers intentionally cannot read reports' compensation (privacy default).
-- ---------------------------------------------------------------------------
create policy compensation_select_admin on public.employee_compensation
  for select to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin());

create policy compensation_select_self on public.employee_compensation
  for select to authenticated
  using (employee_id = public.current_employee_id());

create policy compensation_insert_admin on public.employee_compensation
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy compensation_update_admin on public.employee_compensation
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

-- ---------------------------------------------------------------------------
-- employee_emergency_contacts: HR admin manages; self + manager read.
-- ---------------------------------------------------------------------------
create policy emergency_contacts_select on public.employee_emergency_contacts
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and public.can_view_employee(employee_id)
  );

create policy emergency_contacts_insert_admin on public.employee_emergency_contacts
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy emergency_contacts_update_admin on public.employee_emergency_contacts
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

-- ---------------------------------------------------------------------------
-- employee_documents: HR admin manages; self + manager read metadata.
-- ---------------------------------------------------------------------------
create policy documents_select on public.employee_documents
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and public.can_view_employee(employee_id)
  );

create policy documents_insert_admin on public.employee_documents
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy documents_update_admin on public.employee_documents
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

-- ---------------------------------------------------------------------------
-- announcements: org members read published; HR admin manages all.
-- ---------------------------------------------------------------------------
create policy announcements_select_published on public.announcements
  for select to authenticated
  using (organization_id = public.current_org_id() and status = 'published');

create policy announcements_select_admin on public.announcements
  for select to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin());

create policy announcements_insert_admin on public.announcements
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy announcements_update_admin on public.announcements
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

-- ---------------------------------------------------------------------------
-- exchange_rates: org members read; only HR admin edits. USD stays 1.
-- ---------------------------------------------------------------------------
create policy exchange_rates_select on public.exchange_rates
  for select to authenticated
  using (organization_id = public.current_org_id());

create policy exchange_rates_insert_admin on public.exchange_rates
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy exchange_rates_update_admin on public.exchange_rates
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (
    organization_id = public.current_org_id()
    and public.is_hr_admin()
    and (currency_code <> 'USD' or rate_from_usd = 1)
  );

-- ---------------------------------------------------------------------------
-- dashboard_demo_metrics: org members read; HR admin writes.
-- ---------------------------------------------------------------------------
create policy demo_metrics_select on public.dashboard_demo_metrics
  for select to authenticated
  using (organization_id = public.current_org_id());

create policy demo_metrics_insert_admin on public.dashboard_demo_metrics
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy demo_metrics_update_admin on public.dashboard_demo_metrics
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (organization_id = public.current_org_id() and public.is_hr_admin());
