-- Cleanup of E2E-test records created during live verification (Waves 1–2).
-- Run in the Supabase SQL Editor (service role). Safe to re-run.
-- Scoped strictly to test patterns — no seeded or real records match.

-- Wave 2: leave requests created by targeted E2E runs (reasons are always
-- prefixed "E2E"); seeded demo requests never use that prefix.
delete from public.leave_requests
where reason like 'E2E %';

-- Wave 4: performance artifacts. Reviews in E2E cycles first (FK), then
-- the cycles and any E2E-titled goals.
delete from public.performance_reviews
where cycle_id in (
  select id from public.performance_cycles where name like 'E2E %'
);

delete from public.performance_cycles
where name like 'E2E %';

delete from public.performance_goals
where title like 'E2E %';

-- Wave 3: recruitment artifacts. Candidates first (their hired_employee_id
-- references the E2E employees removed below), then E2E job openings and
-- the onboarding checklists of E2E-hired employees.
delete from public.candidates
where email like 'e2e.%' or full_name like 'E2E %';

delete from public.job_openings
where title like 'E2E %';

delete from public.onboarding_tasks
where employee_id in (
  select id from public.employees where employee_code like 'E2E-%'
);

-- E2E-uploaded document metadata (their storage objects are already removed)
delete from public.employee_documents
where document_name like 'E2E Test Document %';

-- Compensation rows belonging to E2E bot employees
delete from public.employee_compensation
where employee_id in (
  select id from public.employees where employee_code like 'E2E-%'
);

-- E2E bot employees themselves
delete from public.employees
where employee_code like 'E2E-%';

-- Verify: all counts must be 0, employee total back to 36
select
  (select count(*) from public.employees where employee_code like 'E2E-%') as e2e_employees,
  (select count(*) from public.employee_documents where document_name like 'E2E Test Document %') as e2e_documents,
  (select count(*) from public.leave_requests where reason like 'E2E %') as e2e_leave_requests,
  (select count(*) from public.candidates where email like 'e2e.%' or full_name like 'E2E %') as e2e_candidates,
  (select count(*) from public.job_openings where title like 'E2E %') as e2e_jobs,
  (select count(*) from public.performance_cycles where name like 'E2E %') as e2e_cycles,
  (select count(*) from public.performance_goals where title like 'E2E %') as e2e_goals,
  (select count(*) from public.employees) as total_employees;
