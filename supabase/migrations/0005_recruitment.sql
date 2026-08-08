-- GrowthifyEdge HRMS — Wave 3: Recruitment + Onboarding
-- Tables: job_openings, candidates, onboarding_tasks.
-- One candidate record = one job application (showcase simplification).
-- Follows project conventions: UUID PKs, text + CHECK instead of enums,
-- organization_id everywhere, set_updated_at trigger, no physical deletes
-- from the app. Salary fields are stored in USD (display-only conversion).

-- ---------------------------------------------------------------------------
-- job_openings
-- ---------------------------------------------------------------------------
create table public.job_openings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  title text not null,
  department_id uuid references public.departments (id),
  designation_id uuid references public.designations (id),
  location_id uuid references public.work_locations (id),
  hiring_manager_id uuid references public.employees (id),
  employment_type text not null default 'full_time'
    check (employment_type in ('full_time', 'part_time', 'contract', 'internship')),
  openings_count integer not null default 1 check (openings_count > 0),
  description text,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  posted_at date not null default current_date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_openings_org_status_idx on public.job_openings (organization_id, status);
create index job_openings_department_idx on public.job_openings (department_id);
create index job_openings_hiring_manager_idx on public.job_openings (hiring_manager_id);

create trigger job_openings_updated_at
  before update on public.job_openings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- candidates (one row = one application; lightweight interview fields inline)
-- ---------------------------------------------------------------------------
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  job_opening_id uuid not null references public.job_openings (id),
  full_name text not null,
  email text not null,
  phone text,
  location_text text,
  experience_years numeric(4, 1) check (experience_years >= 0),
  source text not null default 'Company Website'
    check (source in ('LinkedIn', 'Referral', 'Company Website', 'Indeed', 'Recruiter')),
  expected_salary numeric(12, 2) check (expected_salary >= 0),
  proposed_salary numeric(12, 2) check (proposed_salary >= 0),
  stage text not null default 'applied'
    check (stage in ('applied', 'screening', 'interview', 'offer', 'hired', 'rejected')),
  notes text,
  interview_at timestamptz,
  interviewer_employee_id uuid references public.employees (id),
  interview_note text,
  application_date date not null default current_date,
  hired_employee_id uuid references public.employees (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_opening_id, email)
);

create index candidates_org_stage_idx on public.candidates (organization_id, stage);
create index candidates_job_idx on public.candidates (job_opening_id);
create index candidates_interview_idx on public.candidates (interview_at);
create unique index candidates_hired_employee_uidx
  on public.candidates (hired_employee_id) where hired_employee_id is not null;

create trigger candidates_updated_at
  before update on public.candidates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- onboarding_tasks (fixed six-task checklist per hired employee)
-- ---------------------------------------------------------------------------
create table public.onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  employee_id uuid not null references public.employees (id),
  task_key text not null,
  title text not null,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  completed_at timestamptz,
  completed_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, task_key)
);

create index onboarding_tasks_org_idx on public.onboarding_tasks (organization_id);
create index onboarding_tasks_employee_idx on public.onboarding_tasks (employee_id);

create trigger onboarding_tasks_updated_at
  before update on public.onboarding_tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helper: is the signed-in user the hiring manager of the given job?
-- SECURITY DEFINER (Wave 1 convention) so policies never recurse.
-- ---------------------------------------------------------------------------
create or replace function public.is_hiring_manager_for(target_job uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.job_openings j
    where j.id = target_job
      and j.hiring_manager_id = public.current_employee_id()
  );
$$;

revoke execute on function public.is_hiring_manager_for from anon;

-- ---------------------------------------------------------------------------
-- Row-Level Security (HR admin manages; manager is view-only and scoped)
-- ---------------------------------------------------------------------------
alter table public.job_openings enable row level security;
alter table public.candidates enable row level security;
alter table public.onboarding_tasks enable row level security;

-- job_openings: HR admin sees everything; others see open jobs plus any job
-- where they are the hiring manager. Writes are HR admin only.
create policy job_openings_select on public.job_openings
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (
      public.is_hr_admin()
      or status = 'open'
      or hiring_manager_id = public.current_employee_id()
    )
  );

create policy job_openings_insert_admin on public.job_openings
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy job_openings_update_admin on public.job_openings
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

-- candidates: HR admin org-wide; hiring managers read candidates of their
-- own jobs only. Writes (including stage changes) are HR admin only; hiring
-- itself goes through the hire_candidate RPC below.
create policy candidates_select on public.candidates
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (public.is_hr_admin() or public.is_hiring_manager_for(job_opening_id))
  );

create policy candidates_insert_admin on public.candidates
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy candidates_update_admin on public.candidates
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

-- onboarding_tasks: HR admin manages; managers (and future employee UIs)
-- read tasks for people they can already view (Wave 1 helper).
create policy onboarding_tasks_select on public.onboarding_tasks
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and public.can_view_employee(employee_id)
  );

create policy onboarding_tasks_insert_admin on public.onboarding_tasks
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy onboarding_tasks_update_admin on public.onboarding_tasks
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

-- ---------------------------------------------------------------------------
-- hire_candidate — the single transactional path from candidate to employee.
-- Creates the employee (+ starter compensation row), links and stages the
-- candidate, and opens the six default onboarding tasks. SECURITY DEFINER
-- with explicit HR-admin + same-organization checks.
-- ---------------------------------------------------------------------------
create or replace function public.hire_candidate(
  p_candidate_id uuid,
  p_employee_code text,
  p_joining_date date,
  p_employment_type text,
  p_manager_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_cand public.candidates;
  v_job public.job_openings;
  v_first text;
  v_last text;
  v_employee_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select organization_id into v_org
  from public.profiles
  where id = v_uid and role = 'hr_admin' and status = 'active';
  if v_org is null then
    raise exception 'Only an HR administrator can hire candidates';
  end if;

  if p_employment_type not in ('full_time', 'part_time', 'contract', 'intern') then
    raise exception 'Invalid employment type';
  end if;
  if p_employee_code is null or length(trim(p_employee_code)) < 2 then
    raise exception 'Employee code is required';
  end if;
  if p_joining_date is null then
    raise exception 'Joining date is required';
  end if;

  select * into v_cand
  from public.candidates
  where id = p_candidate_id
  for update;
  if not found or v_cand.organization_id <> v_org then
    raise exception 'Candidate not found';
  end if;
  if v_cand.stage = 'hired' or v_cand.hired_employee_id is not null then
    raise exception 'This candidate has already been hired';
  end if;

  select * into v_job from public.job_openings where id = v_cand.job_opening_id;

  if p_manager_id is not null then
    perform 1 from public.employees
    where id = p_manager_id and organization_id = v_org;
    if not found then
      raise exception 'Manager not found';
    end if;
  end if;

  -- Simple, predictable name split: first word / remainder.
  v_first := split_part(trim(v_cand.full_name), ' ', 1);
  v_last := nullif(trim(substr(trim(v_cand.full_name), length(v_first) + 1)), '');

  insert into public.employees
    (organization_id, employee_code, first_name, last_name, work_email,
     phone, city, department_id, designation_id, manager_id,
     employment_type, work_location_id, joining_date, status, created_by)
  values
    (v_org, upper(trim(p_employee_code)), v_first, coalesce(v_last, v_first),
     lower(v_cand.email), v_cand.phone, v_cand.location_text,
     v_job.department_id, v_job.designation_id, p_manager_id,
     p_employment_type, v_job.location_id, p_joining_date,
     case when p_joining_date > current_date then 'future_hire' else 'probation' end,
     v_uid)
  returning id into v_employee_id;

  -- Starter compensation row (project convention: every employee has one;
  -- USD, monthly). Uses the agreed offer when present.
  insert into public.employee_compensation
    (organization_id, employee_id, base_salary_usd, pay_frequency, effective_from)
  values
    (v_org, v_employee_id,
     coalesce(v_cand.proposed_salary, v_cand.expected_salary, 0),
     'monthly', p_joining_date);

  update public.candidates
  set stage = 'hired',
      hired_employee_id = v_employee_id
  where id = p_candidate_id;

  insert into public.onboarding_tasks (organization_id, employee_id, task_key, title)
  values
    (v_org, v_employee_id, 'personal_info', 'Personal information verification'),
    (v_org, v_employee_id, 'documents',     'Employment documents'),
    (v_org, v_employee_id, 'it_access',     'IT / system access'),
    (v_org, v_employee_id, 'manager_intro', 'Manager introduction'),
    (v_org, v_employee_id, 'orientation',   'Orientation'),
    (v_org, v_employee_id, 'policy_ack',    'Policy acknowledgement');

  return jsonb_build_object(
    'employee_id', v_employee_id,
    'candidate_id', p_candidate_id
  );
end;
$$;

revoke execute on function public.hire_candidate from anon, public;
grant execute on function public.hire_candidate to authenticated;
