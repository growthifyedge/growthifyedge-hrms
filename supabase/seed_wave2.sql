-- GrowthifyEdge HRMS — Wave 2 demo seed: Time & Leave
-- Entirely fictional demo data. Run AFTER 0004_time_leave.sql (and Wave 1 seed).
--
-- Deterministic: statuses/times derive from hashtext() of stable UUIDs — no
-- random(). Dates are relative to current_date so the demo always shows
-- recent activity.
--
-- Rerun-safe: every insert is ON CONFLICT DO NOTHING. Note that leave
-- requests use fixed UUIDs, so a rerun on a later day keeps the original
-- dated rows rather than shifting them; attendance fills in any new
-- working days that have appeared since the last run.

-- ---------------------------------------------------------------------------
-- Leave types (4)
-- ---------------------------------------------------------------------------
insert into public.leave_types
  (id, organization_id, name, code, default_entitlement_days, is_paid, status)
values
  ('1eaf0000-0000-4000-8000-000000000001', 'aaaa0000-0000-4000-8000-000000000001', 'Annual Leave', 'ANNUAL', 20, true,  'active'),
  ('1eaf0000-0000-4000-8000-000000000002', 'aaaa0000-0000-4000-8000-000000000001', 'Sick Leave',   'SICK',   10, true,  'active'),
  ('1eaf0000-0000-4000-8000-000000000003', 'aaaa0000-0000-4000-8000-000000000001', 'Casual Leave', 'CASUAL',  6, true,  'active'),
  ('1eaf0000-0000-4000-8000-000000000004', 'aaaa0000-0000-4000-8000-000000000001', 'Unpaid Leave', 'UNPAID',  0, false, 'active')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Leave balances — current year entitlement for every current employee
-- (excludes archived and future hires) for each PAID leave type.
-- Used/remaining are derived from approved leave_requests at query time.
-- ---------------------------------------------------------------------------
insert into public.leave_balances
  (organization_id, employee_id, leave_type_id, year, entitlement_days)
select
  e.organization_id,
  e.id,
  lt.id,
  extract(year from current_date)::int,
  lt.default_entitlement_days
from public.employees e
cross join public.leave_types lt
where e.organization_id = 'aaaa0000-0000-4000-8000-000000000001'
  and e.status not in ('inactive', 'future_hire')
  and lt.is_paid
on conflict (employee_id, leave_type_id, year) do nothing;

-- ---------------------------------------------------------------------------
-- Leave requests (12): 4 pending, 6 approved, 2 rejected.
-- The three employees whose Wave 1 status is on_leave (GE-1014 Tariq,
-- GE-1024 Diego, GE-1033 Nadia) hold approved requests covering today, so
-- "On Leave Today" is consistent everywhere.
-- Reviewer/submitter = the demo HR admin profile when present.
-- ---------------------------------------------------------------------------
with hr as (
  select id from public.profiles
  where role = 'hr_admin'
    and organization_id = 'aaaa0000-0000-4000-8000-000000000001'
  order by created_at
  limit 1
)
insert into public.leave_requests
  (id, organization_id, employee_id, leave_type_id, start_date, end_date,
   days_requested, reason, status, submitted_by, reviewed_by, reviewed_at, review_note)
select v.id::uuid, 'aaaa0000-0000-4000-8000-000000000001', v.employee_id::uuid, v.leave_type_id::uuid,
       v.start_date, v.end_date, v.days, v.reason, v.status,
       (select id from hr),
       case when v.status <> 'pending' then (select id from hr) end,
       case when v.status <> 'pending' then now() - make_interval(days => v.reviewed_ago) end,
       v.review_note
from (values
  -- approved, covering today (matches on_leave employee statuses)
  ('1e0e0000-0000-4000-8000-000000000001', 'ee000000-0000-4000-8000-000000000014', '1eaf0000-0000-4000-8000-000000000001',
   current_date - 2,  current_date + 2,  5,  'Family visit to Lahore',               'approved', 4,  'Enjoy the break.'),
  ('1e0e0000-0000-4000-8000-000000000002', 'ee000000-0000-4000-8000-000000000024', '1eaf0000-0000-4000-8000-000000000004',
   current_date - 6,  current_date + 4,  11, 'Extended personal travel',             'approved', 8,  null),
  ('1e0e0000-0000-4000-8000-000000000003', 'ee000000-0000-4000-8000-000000000033', '1eaf0000-0000-4000-8000-000000000002',
   current_date - 1,  current_date + 1,  3,  'Medical recovery after minor surgery', 'approved', 2,  'Get well soon.'),
  -- approved, in the recent past
  ('1e0e0000-0000-4000-8000-000000000004', 'ee000000-0000-4000-8000-000000000006', '1eaf0000-0000-4000-8000-000000000002',
   current_date - 12, current_date - 11, 2,  'Flu and fever',                        'approved', 12, null),
  ('1e0e0000-0000-4000-8000-000000000005', 'ee000000-0000-4000-8000-000000000010', '1eaf0000-0000-4000-8000-000000000001',
   current_date - 20, current_date - 16, 5,  'Annual family holiday',                'approved', 21, null),
  ('1e0e0000-0000-4000-8000-000000000006', 'ee000000-0000-4000-8000-000000000019', '1eaf0000-0000-4000-8000-000000000003',
   current_date - 8,  current_date - 8,  1,  'Personal errand day',                  'approved', 9,  null),
  -- pending (GE-1009 and GE-1011 report to the demo manager Priya Sharma)
  ('1e0e0000-0000-4000-8000-000000000007', 'ee000000-0000-4000-8000-000000000009', '1eaf0000-0000-4000-8000-000000000001',
   current_date + 7,  current_date + 11, 5,  'Wedding in the family',                'pending',  0,  null),
  ('1e0e0000-0000-4000-8000-000000000008', 'ee000000-0000-4000-8000-000000000011', '1eaf0000-0000-4000-8000-000000000003',
   current_date + 3,  current_date + 4,  2,  'House move',                           'pending',  0,  null),
  ('1e0e0000-0000-4000-8000-000000000009', 'ee000000-0000-4000-8000-000000000020', '1eaf0000-0000-4000-8000-000000000001',
   current_date + 10, current_date + 14, 5,  'Trip to see parents',                  'pending',  0,  null),
  ('1e0e0000-0000-4000-8000-000000000010', 'ee000000-0000-4000-8000-000000000026', '1eaf0000-0000-4000-8000-000000000001',
   current_date + 14, current_date + 18, 5,  'Hiking holiday in Bavaria',            'pending',  0,  null),
  -- rejected
  ('1e0e0000-0000-4000-8000-000000000011', 'ee000000-0000-4000-8000-000000000012', '1eaf0000-0000-4000-8000-000000000003',
   current_date + 5,  current_date + 6,  2,  'Short city break',                     'rejected', 3,  'Overlaps the release freeze — please pick another week.'),
  ('1e0e0000-0000-4000-8000-000000000012', 'ee000000-0000-4000-8000-000000000023', '1eaf0000-0000-4000-8000-000000000001',
   current_date - 4,  current_date - 3,  2,  'Family event',                         'rejected', 5,  'Team coverage too thin that week.')
) as v(id, employee_id, leave_type_id, start_date, end_date, days, reason, status, reviewed_ago, review_note)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Attendance — every working day (Mon–Fri) in the last 26 calendar days
-- (~18 working days) for every current employee, from their joining date.
-- Status mix is deterministic per employee/day: mostly present, some late
-- and remote, few absent; on_leave whenever an approved leave request
-- covers that day.
-- ---------------------------------------------------------------------------
insert into public.attendance_records
  (organization_id, employee_id, attendance_date, status, shift,
   check_in, check_out, marked_by)
select
  e.organization_id,
  e.id,
  d.day,
  st.status,
  case abs(hashtext(e.id::text)) % 10
    when 7 then 'morning'
    when 3 then 'evening'
    else 'standard'
  end,
  case
    when st.status in ('present', 'remote') then time '08:40' + make_interval(mins => h.v % 25)
    when st.status = 'late'                 then time '09:20' + make_interval(mins => h.v % 35)
    else null
  end,
  case
    when st.status in ('present', 'remote', 'late') then
      (case
         when st.status in ('present', 'remote') then time '08:40' + make_interval(mins => h.v % 25)
         else time '09:20' + make_interval(mins => h.v % 35)
       end) + make_interval(hours => 8, mins => h.v % 50)
    else null
  end,
  (select id from public.profiles
   where role = 'hr_admin'
     and organization_id = 'aaaa0000-0000-4000-8000-000000000001'
   order by created_at limit 1)
from public.employees e
cross join lateral (
  select gs::date as day
  from generate_series(current_date - 25, current_date, interval '1 day') gs
  where extract(isodow from gs) < 6
) d
cross join lateral (select abs(hashtext(e.id::text || d.day::text)) as v) h
cross join lateral (
  select case
    when exists (
      select 1 from public.leave_requests lr
      where lr.employee_id = e.id
        and lr.status = 'approved'
        and d.day between lr.start_date and lr.end_date
    ) then 'on_leave'
    when h.v % 100 < 5  then 'absent'
    when h.v % 100 < 15 then 'late'
    when h.v % 100 < 28 then 'remote'
    else 'present'
  end as status
) st
where e.organization_id = 'aaaa0000-0000-4000-8000-000000000001'
  and e.status not in ('inactive', 'future_hire')
  and d.day >= e.joining_date
on conflict (employee_id, attendance_date) do nothing;
