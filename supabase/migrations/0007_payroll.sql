-- GrowthifyEdge HRMS — Wave 5: Payroll Overview
-- Tables: payroll_runs, payroll_entries. A deliberately simple demo model:
--   Gross = Base + Allowances,  Net = Gross - Deductions
-- No tax/statutory logic. Base pay is SNAPSHOTTED from employee_compensation
-- at run creation (normalized to monthly using the project convention:
-- monthly = x, biweekly = x*26/12, weekly = x*52/12 — mirrors toMonthlyUsd).
-- Amounts are stored in USD (display-only conversion, Wave 1 convention).
-- "paid" is a demo status only — no payment processing exists.

-- ---------------------------------------------------------------------------
-- payroll_runs (one per organization per month)
-- ---------------------------------------------------------------------------
create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  period_month date not null, -- always the first day of the month
  status text not null default 'draft' check (status in ('draft', 'finalized', 'paid')),
  employee_count integer not null default 0 check (employee_count >= 0),
  total_gross numeric(14, 2) not null default 0 check (total_gross >= 0),
  total_deductions numeric(14, 2) not null default 0 check (total_deductions >= 0),
  total_net numeric(14, 2) not null default 0 check (total_net >= 0),
  finalized_by uuid references public.profiles (id),
  finalized_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, period_month),
  check (extract(day from period_month) = 1)
);

create index payroll_runs_org_period_idx
  on public.payroll_runs (organization_id, period_month desc);

create trigger payroll_runs_updated_at
  before update on public.payroll_runs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- payroll_entries (snapshot per employee per run)
-- ---------------------------------------------------------------------------
create table public.payroll_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  payroll_run_id uuid not null references public.payroll_runs (id),
  employee_id uuid not null references public.employees (id),
  base_pay numeric(12, 2) not null default 0 check (base_pay >= 0),
  allowances numeric(12, 2) not null default 0 check (allowances >= 0),
  deductions numeric(12, 2) not null default 0 check (deductions >= 0),
  gross_pay numeric(12, 2) not null default 0 check (gross_pay >= 0),
  net_pay numeric(12, 2) not null default 0 check (net_pay >= 0),
  status text not null default 'draft' check (status in ('draft', 'finalized', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payroll_run_id, employee_id)
);

create index payroll_entries_run_idx on public.payroll_entries (payroll_run_id);
create index payroll_entries_employee_idx on public.payroll_entries (employee_id);
create index payroll_entries_org_idx on public.payroll_entries (organization_id);

create trigger payroll_entries_updated_at
  before update on public.payroll_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-Level Security. Payroll follows the Wave 1 compensation privacy rule:
-- managers see NOTHING here. Employees are RLS-ready to read their own
-- finalized/paid entries (future self-service; no UI yet).
-- ---------------------------------------------------------------------------
alter table public.payroll_runs enable row level security;
alter table public.payroll_entries enable row level security;

create policy payroll_runs_select_admin on public.payroll_runs
  for select to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin());

create policy payroll_runs_insert_admin on public.payroll_runs
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

-- Direct run updates are limited to HR admins; status transitions that
-- matter (finalize, mark paid) go through the RPCs below.
create policy payroll_runs_update_admin on public.payroll_runs
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_hr_admin())
  with check (organization_id = public.current_org_id() and public.is_hr_admin());

create policy payroll_entries_select on public.payroll_entries
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (
      public.is_hr_admin()
      or (employee_id = public.current_employee_id() and status in ('finalized', 'paid'))
    )
  );

-- HR admin may edit allowances/deductions on DRAFT entries only; the
-- with-check keeps the row in draft so status changes are RPC-only.
create policy payroll_entries_update_admin on public.payroll_entries
  for update to authenticated
  using (
    organization_id = public.current_org_id()
    and public.is_hr_admin()
    and status = 'draft'
  )
  with check (
    organization_id = public.current_org_id()
    and public.is_hr_admin()
    and status = 'draft'
  );

-- No INSERT policy on entries: rows are created only by create_payroll_run.

-- ---------------------------------------------------------------------------
-- create_payroll_run — builds a draft run with one snapshotted entry per
-- eligible employee (active-ish statuses), from current compensation.
-- ---------------------------------------------------------------------------
create or replace function public.create_payroll_run(p_period_month date)
returns public.payroll_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_period date;
  v_run public.payroll_runs;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  select organization_id into v_org
  from public.profiles
  where id = v_uid and role = 'hr_admin' and status = 'active';
  if v_org is null then
    raise exception 'Only an HR administrator can create payroll runs';
  end if;
  if p_period_month is null then
    raise exception 'Payroll month is required';
  end if;

  v_period := date_trunc('month', p_period_month)::date;

  if exists (
    select 1 from public.payroll_runs
    where organization_id = v_org and period_month = v_period
  ) then
    raise exception 'A payroll run for this month already exists';
  end if;

  insert into public.payroll_runs (organization_id, period_month, status, created_by)
  values (v_org, v_period, 'draft', v_uid)
  returning * into v_run;

  -- One entry per eligible employee, snapshotting the latest compensation
  -- normalized to monthly amounts (matches the frontend toMonthlyUsd rule).
  insert into public.payroll_entries
    (organization_id, payroll_run_id, employee_id, base_pay, allowances,
     deductions, gross_pay, net_pay, status)
  select
    v_org,
    v_run.id,
    e.id,
    round(coalesce(c.base_monthly, 0), 2),
    round(coalesce(c.allowance_monthly, 0), 2),
    round(coalesce(c.deduction_monthly, 0), 2),
    round(coalesce(c.base_monthly, 0) + coalesce(c.allowance_monthly, 0), 2),
    round(coalesce(c.base_monthly, 0) + coalesce(c.allowance_monthly, 0)
          - coalesce(c.deduction_monthly, 0), 2),
    'draft'
  from public.employees e
  left join lateral (
    select
      cc.base_salary_usd * f.factor as base_monthly,
      (cc.allowance_usd + cc.bonus_usd) * f.factor as allowance_monthly,
      cc.deduction_usd * f.factor as deduction_monthly
    from public.employee_compensation cc
    cross join lateral (
      select case cc.pay_frequency
        when 'monthly' then 1.0
        when 'biweekly' then 26.0 / 12.0
        when 'weekly' then 52.0 / 12.0
        else 1.0
      end as factor
    ) f
    where cc.employee_id = e.id
    order by cc.effective_from desc
    limit 1
  ) c on true
  where e.organization_id = v_org
    and e.status in ('active', 'on_leave', 'probation', 'notice_period');

  update public.payroll_runs r
  set employee_count = s.cnt,
      total_gross = s.gross,
      total_deductions = s.deductions,
      total_net = s.net
  from (
    select count(*) as cnt,
           coalesce(sum(gross_pay), 0) as gross,
           coalesce(sum(deductions), 0) as deductions,
           coalesce(sum(net_pay), 0) as net
    from public.payroll_entries
    where payroll_run_id = v_run.id
  ) s
  where r.id = v_run.id
  returning * into v_run;

  return v_run;
end;
$$;

-- ---------------------------------------------------------------------------
-- finalize_payroll_run — locks a draft run with server-side totals.
-- ---------------------------------------------------------------------------
create or replace function public.finalize_payroll_run(p_run_id uuid)
returns public.payroll_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_run public.payroll_runs;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  select organization_id into v_org
  from public.profiles
  where id = v_uid and role = 'hr_admin' and status = 'active';
  if v_org is null then
    raise exception 'Only an HR administrator can finalize payroll';
  end if;

  select * into v_run
  from public.payroll_runs
  where id = p_run_id
  for update;
  if not found or v_run.organization_id <> v_org then
    raise exception 'Payroll run not found';
  end if;
  if v_run.status <> 'draft' then
    raise exception 'Only draft payroll runs can be finalized';
  end if;
  if not exists (select 1 from public.payroll_entries where payroll_run_id = p_run_id) then
    raise exception 'This payroll run has no entries';
  end if;

  update public.payroll_entries
  set status = 'finalized'
  where payroll_run_id = p_run_id;

  update public.payroll_runs r
  set status = 'finalized',
      finalized_by = v_uid,
      finalized_at = now(),
      employee_count = s.cnt,
      total_gross = s.gross,
      total_deductions = s.deductions,
      total_net = s.net
  from (
    select count(*) as cnt,
           coalesce(sum(gross_pay), 0) as gross,
           coalesce(sum(deductions), 0) as deductions,
           coalesce(sum(net_pay), 0) as net
    from public.payroll_entries
    where payroll_run_id = p_run_id
  ) s
  where r.id = p_run_id
  returning * into v_run;

  return v_run;
end;
$$;

-- ---------------------------------------------------------------------------
-- mark_payroll_run_paid — demo status transition only (no payments).
-- ---------------------------------------------------------------------------
create or replace function public.mark_payroll_run_paid(p_run_id uuid)
returns public.payroll_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_run public.payroll_runs;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  select organization_id into v_org
  from public.profiles
  where id = v_uid and role = 'hr_admin' and status = 'active';
  if v_org is null then
    raise exception 'Only an HR administrator can update payroll';
  end if;

  select * into v_run
  from public.payroll_runs
  where id = p_run_id
  for update;
  if not found or v_run.organization_id <> v_org then
    raise exception 'Payroll run not found';
  end if;
  if v_run.status <> 'finalized' then
    raise exception 'Only finalized payroll runs can be marked as paid';
  end if;

  update public.payroll_entries
  set status = 'paid'
  where payroll_run_id = p_run_id;

  update public.payroll_runs
  set status = 'paid'
  where id = p_run_id
  returning * into v_run;

  return v_run;
end;
$$;

revoke execute on function public.create_payroll_run, public.finalize_payroll_run,
  public.mark_payroll_run_paid from anon, public;
grant execute on function public.create_payroll_run, public.finalize_payroll_run,
  public.mark_payroll_run_paid to authenticated;
