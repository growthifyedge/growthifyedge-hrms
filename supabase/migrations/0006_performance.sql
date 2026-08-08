-- GrowthifyEdge HRMS — Wave 4: Performance Management
-- Tables: performance_goals, performance_cycles, performance_reviews.
-- Deliberately lightweight: flat goals (no OKR trees), one review per
-- employee per cycle, four fixed 1–5 rating dimensions, overall = average.
-- Follows project conventions: UUID PKs, text + CHECK instead of enums,
-- organization_id everywhere, set_updated_at trigger, no physical deletes.

-- ---------------------------------------------------------------------------
-- performance_goals
-- ---------------------------------------------------------------------------
create table public.performance_goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  employee_id uuid not null references public.employees (id),
  manager_employee_id uuid references public.employees (id),
  title text not null,
  description text,
  category text not null default 'performance'
    check (category in ('performance', 'development', 'project', 'leadership')),
  start_date date not null,
  target_date date not null,
  progress_percent integer not null default 0
    check (progress_percent between 0 and 100),
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed', 'cancelled')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (target_date >= start_date)
);

create index performance_goals_org_status_idx
  on public.performance_goals (organization_id, status);
create index performance_goals_employee_idx
  on public.performance_goals (employee_id, target_date);

create trigger performance_goals_updated_at
  before update on public.performance_goals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- performance_cycles
-- ---------------------------------------------------------------------------
create table public.performance_cycles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  check (end_date >= start_date)
);

create index performance_cycles_org_status_idx
  on public.performance_cycles (organization_id, status);

create trigger performance_cycles_updated_at
  before update on public.performance_cycles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- performance_reviews — one review per employee per cycle. Ratings stay
-- null while pending; the completion RPC below writes them.
-- ---------------------------------------------------------------------------
create table public.performance_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  employee_id uuid not null references public.employees (id),
  cycle_id uuid not null references public.performance_cycles (id),
  reviewer_employee_id uuid references public.employees (id),
  goal_achievement_rating smallint
    check (goal_achievement_rating between 1 and 5),
  quality_rating smallint check (quality_rating between 1 and 5),
  collaboration_rating smallint check (collaboration_rating between 1 and 5),
  initiative_rating smallint check (initiative_rating between 1 and 5),
  overall_rating numeric(2, 1) check (overall_rating between 1 and 5),
  strengths text,
  development_areas text,
  overall_comments text,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, cycle_id)
);

create index performance_reviews_org_status_idx
  on public.performance_reviews (organization_id, status);
create index performance_reviews_employee_idx
  on public.performance_reviews (employee_id);
create index performance_reviews_cycle_idx
  on public.performance_reviews (cycle_id);

create trigger performance_reviews_updated_at
  before update on public.performance_reviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-Level Security (reuses Wave 1 helpers: is_hr_admin, current_org_id,
-- current_employee_id, is_manager_of, can_view_employee)
-- ---------------------------------------------------------------------------
alter table public.performance_goals enable row level security;
alter table public.performance_cycles enable row level security;
alter table public.performance_reviews enable row level security;

-- Goals: HR admin org-wide; managers manage direct reports; everyone reads
-- their own (employee self-service ready).
create policy performance_goals_select on public.performance_goals
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and public.can_view_employee(employee_id)
  );

create policy performance_goals_insert on public.performance_goals
  for insert to authenticated
  with check (
    organization_id = public.current_org_id()
    and (public.is_hr_admin() or public.is_manager_of(employee_id))
  );

create policy performance_goals_update on public.performance_goals
  for update to authenticated
  using (
    organization_id = public.current_org_id()
    and (public.is_hr_admin() or public.is_manager_of(employee_id))
  )
  with check (
    organization_id = public.current_org_id()
    and (public.is_hr_admin() or public.is_manager_of(employee_id))
  );

-- Cycles: all org members read; HR admin maintains.
create policy performance_cycles_select on public.performance_cycles
  for select to authenticated
  using (organization_id = public.current_org_id());

create policy performance_cycles_insert_admin on public.performance_cycles
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy performance_cycles_update_admin on public.performance_cycles
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

-- Reviews: HR admin org-wide; managers see direct reports; individuals see
-- their own COMPLETED reviews only. Creation (pending shell) is allowed to
-- HR admin and the direct manager; completion goes exclusively through the
-- complete_performance_review RPC — there is intentionally NO update policy.
create policy performance_reviews_select on public.performance_reviews
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (
      public.is_hr_admin()
      or public.is_manager_of(employee_id)
      or (employee_id = public.current_employee_id() and status = 'completed')
    )
  );

create policy performance_reviews_insert on public.performance_reviews
  for insert to authenticated
  with check (
    organization_id = public.current_org_id()
    and (public.is_hr_admin() or public.is_manager_of(employee_id))
    and status = 'pending'
  );

-- ---------------------------------------------------------------------------
-- complete_performance_review — the only write path for completing reviews.
-- ---------------------------------------------------------------------------
create or replace function public.complete_performance_review(
  p_review_id uuid,
  p_goal_achievement integer,
  p_quality integer,
  p_collaboration integer,
  p_initiative integer,
  p_strengths text default null,
  p_development_areas text default null,
  p_overall_comments text default null
)
returns public.performance_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_org uuid;
  v_reviewer_employee uuid;
  v_review public.performance_reviews;
  v_target_manager uuid;
  v_overall numeric(2, 1);
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

  if p_goal_achievement not between 1 and 5
     or p_quality not between 1 and 5
     or p_collaboration not between 1 and 5
     or p_initiative not between 1 and 5 then
    raise exception 'Ratings must be between 1 and 5';
  end if;

  select * into v_review
  from public.performance_reviews
  where id = p_review_id
  for update;
  if not found or v_review.organization_id <> v_org then
    raise exception 'Review not found';
  end if;
  if v_review.status <> 'pending' then
    raise exception 'Only pending reviews can be completed';
  end if;

  select id into v_reviewer_employee
  from public.employees
  where auth_user_id = v_uid;

  if v_role = 'hr_admin' then
    null; -- same-organization already verified
  elsif v_role = 'manager' then
    if v_reviewer_employee is null then
      raise exception 'You are not permitted to complete this review';
    end if;
    if v_review.employee_id = v_reviewer_employee then
      raise exception 'You cannot review yourself';
    end if;
    select manager_id into v_target_manager
    from public.employees
    where id = v_review.employee_id;
    if v_target_manager is distinct from v_reviewer_employee then
      raise exception 'You are not permitted to complete this review';
    end if;
  else
    raise exception 'You are not permitted to complete this review';
  end if;

  v_overall := round(
    (p_goal_achievement + p_quality + p_collaboration + p_initiative) / 4.0, 1);

  update public.performance_reviews
  set goal_achievement_rating = p_goal_achievement,
      quality_rating = p_quality,
      collaboration_rating = p_collaboration,
      initiative_rating = p_initiative,
      overall_rating = v_overall,
      strengths = nullif(trim(coalesce(p_strengths, '')), ''),
      development_areas = nullif(trim(coalesce(p_development_areas, '')), ''),
      overall_comments = nullif(trim(coalesce(p_overall_comments, '')), ''),
      reviewer_employee_id = v_reviewer_employee,
      status = 'completed',
      completed_at = now()
  where id = p_review_id
  returning * into v_review;

  return v_review;
end;
$$;

revoke execute on function public.complete_performance_review from anon, public;
grant execute on function public.complete_performance_review to authenticated;
