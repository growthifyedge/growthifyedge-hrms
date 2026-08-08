-- GrowthifyEdge HRMS — Wave 5 demo seed: Payroll Overview
-- Entirely fictional demo data. Run AFTER 0007_payroll.sql.
-- Three runs relative to the current month:
--   two months ago  -> paid
--   last month      -> finalized
--   current month   -> draft
-- Entries derive from live employee_compensation (same monthly rule as the
-- create_payroll_run RPC) with small deterministic hashtext() variation in
-- allowances/deductions. Rerun-safe: ON CONFLICT DO NOTHING everywhere.
-- Note: fixed run UUIDs mean a rerun in a LATER month keeps the original
-- months rather than shifting them (same behavior as earlier wave seeds).

-- ---------------------------------------------------------------------------
-- Runs (totals are backfilled after entries below)
-- ---------------------------------------------------------------------------
with hr as (
  select id from public.profiles
  where role = 'hr_admin' and organization_id = 'aaaa0000-0000-4000-8000-000000000001'
  order by created_at limit 1
)
insert into public.payroll_runs
  (id, organization_id, period_month, status, finalized_by, finalized_at, created_by)
select v.id::uuid, 'aaaa0000-0000-4000-8000-000000000001',
       (date_trunc('month', current_date) - v.months_ago * interval '1 month')::date,
       v.status,
       case when v.status <> 'draft' then (select id from hr) end,
       case when v.status <> 'draft'
            then date_trunc('month', current_date) - v.months_ago * interval '1 month'
                 + interval '26 days' end,
       (select id from hr)
from (values
  ('ba5e0000-0000-4000-8000-000000000001', 2, 'paid'),
  ('ba5e0000-0000-4000-8000-000000000002', 1, 'finalized'),
  ('ba5e0000-0000-4000-8000-000000000003', 0, 'draft')
) as v(id, months_ago, status)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Entries: one per eligible employee per run, snapshotted from the latest
-- compensation row, normalized to monthly (monthly=x, biweekly=x*26/12,
-- weekly=x*52/12). Small deterministic variation keeps months realistic.
-- ---------------------------------------------------------------------------
insert into public.payroll_entries
  (organization_id, payroll_run_id, employee_id, base_pay, allowances,
   deductions, gross_pay, net_pay, status)
select
  e.organization_id,
  r.id,
  e.id,
  calc.base_pay,
  calc.allowances,
  calc.deductions,
  round(calc.base_pay + calc.allowances, 2),
  round(calc.base_pay + calc.allowances - calc.deductions, 2),
  r.status
from public.payroll_runs r
join public.employees e
  on e.organization_id = r.organization_id
 and e.status in ('active', 'on_leave', 'probation', 'notice_period')
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
cross join lateral (
  select abs(hashtext(e.id::text || r.id::text)) as v
) h
cross join lateral (
  select
    round(coalesce(c.base_monthly, 0), 2) as base_pay,
    -- small deterministic monthly variation: 0–120 extra allowance,
    -- 0–60 extra deduction (kept modest so totals stay credible)
    round(coalesce(c.allowance_monthly, 0) + (h.v % 5) * 30.0, 2) as allowances,
    round(coalesce(c.deduction_monthly, 0) + (h.v % 3) * 30.0, 2) as deductions
) calc
where r.id in (
  'ba5e0000-0000-4000-8000-000000000001',
  'ba5e0000-0000-4000-8000-000000000002',
  'ba5e0000-0000-4000-8000-000000000003'
)
on conflict (payroll_run_id, employee_id) do nothing;

-- ---------------------------------------------------------------------------
-- Backfill run totals from their entries.
-- ---------------------------------------------------------------------------
update public.payroll_runs r
set employee_count = s.cnt,
    total_gross = s.gross,
    total_deductions = s.deductions,
    total_net = s.net
from (
  select payroll_run_id,
         count(*) as cnt,
         coalesce(sum(gross_pay), 0) as gross,
         coalesce(sum(deductions), 0) as deductions,
         coalesce(sum(net_pay), 0) as net
  from public.payroll_entries
  group by payroll_run_id
) s
where r.id = s.payroll_run_id
  and r.id in (
    'ba5e0000-0000-4000-8000-000000000001',
    'ba5e0000-0000-4000-8000-000000000002',
    'ba5e0000-0000-4000-8000-000000000003'
  );
