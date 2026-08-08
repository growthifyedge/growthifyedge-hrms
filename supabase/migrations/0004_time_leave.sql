-- GrowthifyEdge HRMS — Wave 2: Time & Leave
-- Tables: attendance_records, leave_types, leave_balances, leave_requests.
-- Follows Wave 1 conventions: UUID PKs, text + CHECK instead of enums,
-- organization_id everywhere, set_updated_at trigger, status archiving only.
-- Reviewer/marker columns reference public.profiles (same id as auth.users)
-- so PostgREST can embed the reviewer name.

-- ---------------------------------------------------------------------------
-- attendance_records
-- ---------------------------------------------------------------------------
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  employee_id uuid not null references public.employees (id),
  attendance_date date not null,
  status text not null
    check (status in ('present', 'late', 'absent', 'remote', 'on_leave')),
  shift text not null default 'standard'
    check (shift in ('morning', 'standard', 'evening')),
  check_in time,
  check_out time,
  notes text,
  marked_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, attendance_date),
  -- Worked hours are derived in the frontend; the database only guarantees
  -- the pair is ordered when both ends exist.
  check (check_in is null or check_out is null or check_out > check_in)
);

create index attendance_records_org_date_idx
  on public.attendance_records (organization_id, attendance_date desc);
create index attendance_records_employee_date_idx
  on public.attendance_records (employee_id, attendance_date desc);
create index attendance_records_status_idx on public.attendance_records (status);

create trigger attendance_records_updated_at
  before update on public.attendance_records
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- leave_types
-- ---------------------------------------------------------------------------
create table public.leave_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null,
  code text not null,
  default_entitlement_days integer not null default 0
    check (default_entitlement_days >= 0),
  is_paid boolean not null default true,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (organization_id, code)
);

create index leave_types_organization_idx on public.leave_types (organization_id);

create trigger leave_types_updated_at
  before update on public.leave_types
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- leave_balances — entitlement per employee/type/year.
-- Used days are derived from approved leave_requests, never stored.
-- ---------------------------------------------------------------------------
create table public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  employee_id uuid not null references public.employees (id),
  leave_type_id uuid not null references public.leave_types (id),
  year integer not null check (year between 2000 and 2100),
  entitlement_days integer not null default 0 check (entitlement_days >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, leave_type_id, year)
);

create index leave_balances_org_idx on public.leave_balances (organization_id);
create index leave_balances_employee_year_idx
  on public.leave_balances (employee_id, year);

create trigger leave_balances_updated_at
  before update on public.leave_balances
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- leave_requests
-- ---------------------------------------------------------------------------
create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  employee_id uuid not null references public.employees (id),
  leave_type_id uuid not null references public.leave_types (id),
  start_date date not null,
  end_date date not null,
  days_requested integer not null check (days_requested > 0),
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid references public.profiles (id),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index leave_requests_org_status_idx
  on public.leave_requests (organization_id, status);
create index leave_requests_employee_idx
  on public.leave_requests (employee_id, start_date desc);
create index leave_requests_dates_idx
  on public.leave_requests (start_date, end_date);

create trigger leave_requests_updated_at
  before update on public.leave_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-Level Security (reuses Wave 1 SECURITY DEFINER helpers)
--   is_hr_admin(), current_org_id(), current_employee_id(),
--   is_manager_of(uuid), can_view_employee(uuid)
-- ---------------------------------------------------------------------------
alter table public.attendance_records enable row level security;
alter table public.leave_types enable row level security;
alter table public.leave_balances enable row level security;
alter table public.leave_requests enable row level security;

-- attendance_records: HR admin manages org; manager/employee read self + reports.
create policy attendance_select on public.attendance_records
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and public.can_view_employee(employee_id)
  );

create policy attendance_insert_admin on public.attendance_records
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy attendance_update_admin on public.attendance_records
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

-- leave_types: all org members read active config; HR admin maintains it.
create policy leave_types_select on public.leave_types
  for select to authenticated
  using (organization_id = public.current_org_id());

create policy leave_types_insert_admin on public.leave_types
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy leave_types_update_admin on public.leave_types
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

-- leave_balances: HR admin manages; self + manager read.
create policy leave_balances_select on public.leave_balances
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and public.can_view_employee(employee_id)
  );

create policy leave_balances_insert_admin on public.leave_balances
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy leave_balances_update_admin on public.leave_balances
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

-- leave_requests: HR admin inserts (on behalf, always pending); self + manager
-- read. Reviews go exclusively through the review_leave_request RPC below —
-- there is intentionally NO direct update policy.
create policy leave_requests_select on public.leave_requests
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and public.can_view_employee(employee_id)
  );

create policy leave_requests_insert_admin on public.leave_requests
  for insert to authenticated
  with check (
    organization_id = public.current_org_id()
    and public.is_hr_admin()
    and status = 'pending'
  );

-- ---------------------------------------------------------------------------
-- review_leave_request — the only write path for approving/rejecting.
-- SECURITY DEFINER so it can update despite the absent UPDATE policy, with
-- all authorization enforced explicitly inside.
-- ---------------------------------------------------------------------------
create or replace function public.review_leave_request(
  p_request_id uuid,
  p_decision text,
  p_note text default null
)
returns public.leave_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_org uuid;
  v_reviewer_employee uuid;
  v_req public.leave_requests;
  v_target_manager uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select role, organization_id into v_role, v_org
  from public.profiles
  where id = v_uid and status = 'active';
  if v_role is null then
    raise exception 'No active profile for this user';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select * into v_req
  from public.leave_requests
  where id = p_request_id
  for update;
  if not found or v_req.organization_id <> v_org then
    raise exception 'Leave request not found';
  end if;

  if v_req.status <> 'pending' then
    raise exception 'Only pending requests can be reviewed';
  end if;

  if v_role = 'hr_admin' then
    null; -- same-organization already verified above
  elsif v_role = 'manager' then
    select id into v_reviewer_employee
    from public.employees
    where auth_user_id = v_uid;
    if v_reviewer_employee is null then
      raise exception 'You are not permitted to review this request';
    end if;
    if v_req.employee_id = v_reviewer_employee then
      raise exception 'You cannot review your own leave request';
    end if;
    select manager_id into v_target_manager
    from public.employees
    where id = v_req.employee_id;
    if v_target_manager is distinct from v_reviewer_employee then
      raise exception 'You are not permitted to review this request';
    end if;
  else
    raise exception 'You are not permitted to review this request';
  end if;

  update public.leave_requests
  set status = p_decision,
      reviewed_by = v_uid,
      reviewed_at = now(),
      review_note = nullif(trim(coalesce(p_note, '')), '')
  where id = p_request_id
  returning * into v_req;

  return v_req;
end;
$$;

revoke execute on function public.review_leave_request from anon, public;
grant execute on function public.review_leave_request to authenticated;
