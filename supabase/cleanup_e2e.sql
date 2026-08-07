-- One-time cleanup of E2E-test records created during Wave 1 live verification.
-- Run in the Supabase SQL Editor (service role). Safe to re-run.
-- Scoped strictly to test patterns — no seeded or real records match.

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

-- Verify: both counts must be 0, employee total back to 36
select
  (select count(*) from public.employees where employee_code like 'E2E-%') as e2e_employees,
  (select count(*) from public.employee_documents where document_name like 'E2E Test Document %') as e2e_documents,
  (select count(*) from public.employees) as total_employees;
