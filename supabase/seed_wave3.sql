-- GrowthifyEdge HRMS — Wave 3 demo seed: Recruitment + Onboarding
-- Entirely fictional demo data. Run AFTER 0005_recruitment.sql.
-- Deterministic fixed UUIDs; rerun-safe via ON CONFLICT DO NOTHING.
-- Dates are relative to current_date so the pipeline always looks current.
--
-- Story: GE-1017 (Hana) and GE-1018 (Omar) joined recently through the now
-- closed Software Engineer opening; GE-1036 (Leila, future hire) accepted an
-- offer on the open Senior Software Engineer role. Their onboarding records
-- populate the Onboarding tab at three progress levels.

-- ---------------------------------------------------------------------------
-- Job openings (5 open + 1 closed)
-- ---------------------------------------------------------------------------
with hr as (
  select id from public.profiles
  where role = 'hr_admin' and organization_id = 'aaaa0000-0000-4000-8000-000000000001'
  order by created_at limit 1
)
insert into public.job_openings
  (id, organization_id, title, department_id, designation_id, location_id,
   hiring_manager_id, employment_type, openings_count, description, status,
   posted_at, created_by)
select v.id::uuid, 'aaaa0000-0000-4000-8000-000000000001', v.title,
       v.department_id::uuid, v.designation_id::uuid, v.location_id::uuid,
       v.hiring_manager_id::uuid, v.employment_type, v.openings, v.description,
       v.status, current_date - v.posted_ago, (select id from hr)
from (values
  ('0b000000-0000-4000-8000-000000000001', 'Senior Software Engineer',
   'dd000000-0000-4000-8000-000000000003', 'de000000-0000-4000-8000-000000000009', '10c00000-0000-4000-8000-000000000004',
   'ee000000-0000-4000-8000-000000000008', 'full_time', 2,
   'Own core product services end to end in a remote-first engineering team.', 'open', 24),
  ('0b000000-0000-4000-8000-000000000002', 'Account Executive',
   'dd000000-0000-4000-8000-000000000004', 'de000000-0000-4000-8000-000000000013', '10c00000-0000-4000-8000-000000000003',
   'ee000000-0000-4000-8000-000000000019', 'full_time', 1,
   'Drive mid-market revenue across the GCC region from our Dubai office.', 'open', 18),
  ('0b000000-0000-4000-8000-000000000003', 'Content Strategist',
   'dd000000-0000-4000-8000-000000000005', 'de000000-0000-4000-8000-000000000016', '10c00000-0000-4000-8000-000000000004',
   'ee000000-0000-4000-8000-000000000025', 'full_time', 1,
   'Shape the content engine behind our brand and demand programs.', 'open', 14),
  ('0b000000-0000-4000-8000-000000000004', 'Accountant',
   'dd000000-0000-4000-8000-000000000006', 'de000000-0000-4000-8000-000000000018', '10c00000-0000-4000-8000-000000000002',
   'ee000000-0000-4000-8000-000000000029', 'full_time', 1,
   'Keep our multi-entity books clean and audit-ready in London.', 'open', 10),
  ('0b000000-0000-4000-8000-000000000005', 'HR Specialist',
   'dd000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-000000000006', '10c00000-0000-4000-8000-000000000001',
   'ee000000-0000-4000-8000-000000000005', 'contract', 1,
   'Support people operations and onboarding at our Karachi HQ.', 'open', 7),
  ('0b000000-0000-4000-8000-000000000006', 'Software Engineer',
   'dd000000-0000-4000-8000-000000000003', 'de000000-0000-4000-8000-000000000010', '10c00000-0000-4000-8000-000000000004',
   'ee000000-0000-4000-8000-000000000008', 'full_time', 2,
   'Filled — both openings hired through this pipeline.', 'closed', 55)
) as v(id, title, department_id, designation_id, location_id, hiring_manager_id,
       employment_type, openings, description, status, posted_ago)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Candidates (27): 8 applied, 5 screening, 5 interview, 3 offer, 3 hired,
-- 3 rejected. Salary values are USD/month (display converts). Interview
-- times are relative to current_date. Sources span all five channels.
-- ---------------------------------------------------------------------------
with hr as (
  select id from public.profiles
  where role = 'hr_admin' and organization_id = 'aaaa0000-0000-4000-8000-000000000001'
  order by created_at limit 1
)
insert into public.candidates
  (id, organization_id, job_opening_id, full_name, email, phone, location_text,
   experience_years, source, expected_salary, proposed_salary, stage, notes,
   interview_at, interviewer_employee_id, interview_note, application_date,
   hired_employee_id, created_by)
select v.id::uuid, 'aaaa0000-0000-4000-8000-000000000001', v.job::uuid, v.full_name,
       v.email, v.phone, v.location_text, v.exp, v.source, v.expected, v.proposed,
       v.stage, v.notes,
       case when v.interview_in is not null
            then (current_date + v.interview_in)::timestamp + v.interview_time
       end,
       v.interviewer::uuid, v.interview_note,
       current_date - v.applied_ago, v.hired_employee::uuid, (select id from hr)
from (values
  -- ------- Job 1: Senior Software Engineer (open, 2 openings) -------
  ('ca000000-0000-4000-8000-000000000001', '0b000000-0000-4000-8000-000000000001',
   'Viktor Hansen', 'viktor.hansen@example.com', '+45-31-555-0101', 'Copenhagen, Denmark',
   7.0, 'LinkedIn', 8200, null, 'applied', 'Strong distributed-systems background.',
   null, null::interval, null, null, 3, null),
  ('ca000000-0000-4000-8000-000000000002', '0b000000-0000-4000-8000-000000000001',
   'Amina Diallo', 'amina.diallo@example.com', '+221-77-555-0102', 'Dakar, Senegal',
   6.5, 'Company Website', 7500, null, 'applied', null,
   null, null, null, null, 2, null),
  ('ca000000-0000-4000-8000-000000000003', '0b000000-0000-4000-8000-000000000001',
   'Ethan Caldwell', 'ethan.caldwell@example.com', '+1-206-555-0103', 'Seattle, USA',
   9.0, 'Recruiter', 9800, null, 'screening', 'Ex-FAANG, notice period 4 weeks.',
   null, null, null, null, 6, null),
  ('ca000000-0000-4000-8000-000000000004', '0b000000-0000-4000-8000-000000000001',
   'Priyanka Nair', 'priyanka.nair@example.com', '+91-98-5550-1044', 'Bengaluru, India',
   8.0, 'Referral', 7800, null, 'screening', 'Referred by the platform team.',
   null, null, null, null, 5, null),
  ('ca000000-0000-4000-8000-000000000005', '0b000000-0000-4000-8000-000000000001',
   'Tomás Herrera', 'tomas.herrera@example.com', '+54-11-555-0105', 'Buenos Aires, Argentina',
   7.5, 'LinkedIn', 8000, null, 'interview', 'System design round scheduled.',
   2, interval '14 hours', 'ee000000-0000-4000-8000-000000000008', 'Focus on event-driven architecture experience.', 9, null),
  ('ca000000-0000-4000-8000-000000000006', '0b000000-0000-4000-8000-000000000001',
   'Zofia Nowak', 'zofia.nowak@example.com', '+48-51-555-0106', 'Kraków, Poland',
   6.0, 'Indeed', 7200, null, 'interview', null,
   4, interval '10 hours', 'ee000000-0000-4000-8000-000000000008', 'Pairing session with the core services squad.', 8, null),
  ('ca000000-0000-4000-8000-000000000007', '0b000000-0000-4000-8000-000000000001',
   'Marcus Thompson', 'marcus.thompson@example.com', '+44-20-555-0107', 'Manchester, UK',
   8.5, 'Referral', 8600, 8400, 'offer', 'Offer extended; awaiting response.',
   -5, interval '11 hours', 'ee000000-0000-4000-8000-000000000008', 'Excellent architecture round — strong hire signal.', 16, null),
  ('ca000000-0000-4000-8000-000000000008', '0b000000-0000-4000-8000-000000000001',
   'Leila Haddad', 'leila.haddad@example.com', '+971-4-555-0108', 'Dubai, UAE',
   5.5, 'LinkedIn', 7000, 6800, 'hired', 'Accepted — joins in September.',
   -12, interval '13 hours', 'ee000000-0000-4000-8000-000000000008', 'Great product sense; unanimous yes.', 22,
   'ee000000-0000-4000-8000-000000000036'),
  ('ca000000-0000-4000-8000-000000000009', '0b000000-0000-4000-8000-000000000001',
   'Dmitri Volkov', 'dmitri.volkov@example.com', '+371-2-555-0109', 'Riga, Latvia',
   4.0, 'Indeed', 6900, null, 'rejected', 'Not enough depth in distributed systems.',
   -8, interval '15 hours', 'ee000000-0000-4000-8000-000000000008', 'Struggled with the scaling scenario.', 18, null),
  -- ------- Job 2: Account Executive (open) -------
  ('ca000000-0000-4000-8000-000000000010', '0b000000-0000-4000-8000-000000000002',
   'Gabriela Santos', 'gabriela.santos@example.com', '+55-11-555-0110', 'São Paulo, Brazil',
   5.0, 'LinkedIn', 5200, null, 'applied', null,
   null, null, null, null, 2, null),
  ('ca000000-0000-4000-8000-000000000011', '0b000000-0000-4000-8000-000000000002',
   'Karim Mansour', 'karim.mansour@example.com', '+20-10-555-0111', 'Cairo, Egypt',
   6.0, 'Referral', 5500, null, 'applied', 'Referred by the Dubai sales team.',
   null, null, null, null, 4, null),
  ('ca000000-0000-4000-8000-000000000012', '0b000000-0000-4000-8000-000000000002',
   'Elif Yilmaz', 'elif.yilmaz@example.com', '+90-53-555-0112', 'Istanbul, Türkiye',
   4.5, 'Company Website', 5000, null, 'screening', null,
   null, null, null, null, 6, null),
  ('ca000000-0000-4000-8000-000000000013', '0b000000-0000-4000-8000-000000000002',
   'Nathan Osei', 'nathan.osei@example.com', '+233-24-555-0113', 'Accra, Ghana',
   7.0, 'Recruiter', 5800, null, 'interview', 'Enterprise SaaS background.',
   3, interval '9 hours', 'ee000000-0000-4000-8000-000000000019', 'Roleplay: discovery call with a mid-market prospect.', 10, null),
  ('ca000000-0000-4000-8000-000000000014', '0b000000-0000-4000-8000-000000000002',
   'Ines Martin', 'ines.martin@example.com', '+33-6-555-0114', 'Lyon, France',
   6.5, 'LinkedIn', 5600, 5400, 'offer', 'Verbal yes; contract out for signature.',
   -4, interval '10 hours', 'ee000000-0000-4000-8000-000000000019', 'Consistently exceeded quota in current role.', 15, null),
  ('ca000000-0000-4000-8000-000000000015', '0b000000-0000-4000-8000-000000000002',
   'Ravi Patel', 'ravi.patel@example.com', '+44-79-555-0115', 'Leicester, UK',
   3.0, 'Indeed', 4800, null, 'rejected', 'Looking for a pure hunter role — not a fit.',
   null, null, null, 12, null),
  -- ------- Job 3: Content Strategist (open) -------
  ('ca000000-0000-4000-8000-000000000016', '0b000000-0000-4000-8000-000000000003',
   'Sofia Lindqvist', 'sofia.lindqvist@example.com', '+46-70-555-0116', 'Gothenburg, Sweden',
   4.0, 'Company Website', 4600, null, 'applied', null,
   null, null, null, null, 1, null),
  ('ca000000-0000-4000-8000-000000000017', '0b000000-0000-4000-8000-000000000003',
   'Andile Khumalo', 'andile.khumalo@example.com', '+27-82-555-0117', 'Johannesburg, South Africa',
   5.5, 'LinkedIn', 4800, null, 'applied', 'Strong B2B SaaS portfolio.',
   null, null, null, null, 3, null),
  ('ca000000-0000-4000-8000-000000000018', '0b000000-0000-4000-8000-000000000003',
   'Mei Ling Chua', 'meiling.chua@example.com', '+65-9-555-0118', 'Singapore',
   6.0, 'Referral', 5200, null, 'screening', null,
   null, null, null, null, 5, null),
  ('ca000000-0000-4000-8000-000000000019', '0b000000-0000-4000-8000-000000000003',
   'Lucia Moretti', 'lucia.moretti@example.com', '+39-33-555-0119', 'Milan, Italy',
   7.0, 'Recruiter', 5400, null, 'interview', 'Portfolio review scheduled.',
   1, interval '12 hours', 'ee000000-0000-4000-8000-000000000025', 'Walk through the localization campaign case study.', 8, null),
  -- ------- Job 4: Accountant (open) -------
  ('ca000000-0000-4000-8000-000000000020', '0b000000-0000-4000-8000-000000000004',
   'Oluwaseun Adeyemi', 'oluwaseun.adeyemi@example.com', '+234-80-555-0120', 'Lagos, Nigeria',
   4.5, 'Indeed', 4400, null, 'applied', null,
   null, null, null, null, 2, null),
  ('ca000000-0000-4000-8000-000000000021', '0b000000-0000-4000-8000-000000000004',
   'Hannah Weber', 'hannah.weber@example.com', '+49-151-555-0121', 'Frankfurt, Germany',
   6.0, 'LinkedIn', 5000, null, 'screening', 'IFRS and multi-entity experience.',
   null, null, null, null, 4, null),
  ('ca000000-0000-4000-8000-000000000022', '0b000000-0000-4000-8000-000000000004',
   'Diego Rojas', 'diego.rojas@example.com', '+56-9-555-0122', 'Santiago, Chile',
   5.0, 'Company Website', 4600, null, 'interview', null,
   5, interval '11 hours', 'ee000000-0000-4000-8000-000000000029', 'Technical screen: closing checklist and reconciliations.', 9, null),
  ('ca000000-0000-4000-8000-000000000023', '0b000000-0000-4000-8000-000000000004',
   'Fatoumata Keita', 'fatoumata.keita@example.com', '+223-76-555-0123', 'Bamako, Mali',
   7.5, 'Referral', 5200, 5100, 'offer', 'Final references cleared.',
   -3, interval '14 hours', 'ee000000-0000-4000-8000-000000000029', 'Meticulous — exactly what the close process needs.', 14, null),
  -- ------- Job 5: HR Specialist (open) -------
  ('ca000000-0000-4000-8000-000000000024', '0b000000-0000-4000-8000-000000000005',
   'Ayesha Siddiqui', 'ayesha.siddiqui@example.com', '+92-300-555-0124', 'Karachi, Pakistan',
   3.5, 'Company Website', 2400, null, 'applied', null,
   null, null, null, null, 1, null),
  ('ca000000-0000-4000-8000-000000000025', '0b000000-0000-4000-8000-000000000005',
   'Danish Qureshi', 'danish.qureshi@example.com', '+92-321-555-0125', 'Karachi, Pakistan',
   2.5, 'Indeed', 2200, null, 'applied', null,
   null, null, null, null, 3, null),
  ('ca000000-0000-4000-8000-000000000026', '0b000000-0000-4000-8000-000000000005',
   'Sana Farooq', 'sana.farooq@example.com', '+92-333-555-0126', 'Hyderabad, Pakistan',
   1.5, 'LinkedIn', 2000, null, 'rejected', 'Below the required experience level.',
   null, null, null, 6, null),
  -- ------- Job 6: Software Engineer (closed — both openings filled) -------
  ('ca000000-0000-4000-8000-000000000027', '0b000000-0000-4000-8000-000000000006',
   'Hana Yamamoto', 'hana.yamamoto@example.com', '+81-3-555-0127', 'Tokyo, Japan',
   3.0, 'LinkedIn', 5400, 5200, 'hired', 'Joined the core services squad.',
   -20, interval '10 hours', 'ee000000-0000-4000-8000-000000000008', 'Clean coding round; strong collaboration signals.', 45,
   'ee000000-0000-4000-8000-000000000017'),
  ('ca000000-0000-4000-8000-000000000028', '0b000000-0000-4000-8000-000000000006',
   'Omar Sheikh', 'omar.sheikh.dev@example.com', '+92-300-555-0128', 'Karachi, Pakistan',
   0.5, 'Referral', 1500, 1400, 'hired', 'Intern conversion pipeline.',
   -25, interval '9 hours', 'ee000000-0000-4000-8000-000000000008', 'Fast learner; hired into the internship program.', 50,
   'ee000000-0000-4000-8000-000000000018')
) as v(id, job, full_name, email, phone, location_text, exp, source, expected,
       proposed, stage, notes, interview_in, interview_time, interviewer,
       interview_note, applied_ago, hired_employee)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Onboarding checklists for the three ATS hires, at three progress levels:
-- GE-1018 Omar 6/6 (complete), GE-1017 Hana 3/6, GE-1036 Leila 1/6.
-- ---------------------------------------------------------------------------
with hr as (
  select id from public.profiles
  where role = 'hr_admin' and organization_id = 'aaaa0000-0000-4000-8000-000000000001'
  order by created_at limit 1
),
tasks(ord, task_key, title) as (values
  (1, 'personal_info', 'Personal information verification'),
  (2, 'documents',     'Employment documents'),
  (3, 'it_access',     'IT / system access'),
  (4, 'manager_intro', 'Manager introduction'),
  (5, 'orientation',   'Orientation'),
  (6, 'policy_ack',    'Policy acknowledgement')
),
hires(employee_id, done_count) as (values
  ('ee000000-0000-4000-8000-000000000018', 6),
  ('ee000000-0000-4000-8000-000000000017', 3),
  ('ee000000-0000-4000-8000-000000000036', 1)
)
insert into public.onboarding_tasks
  (organization_id, employee_id, task_key, title, status, completed_at, completed_by)
select
  'aaaa0000-0000-4000-8000-000000000001',
  h.employee_id::uuid,
  t.task_key,
  t.title,
  case when t.ord <= h.done_count then 'completed' else 'pending' end,
  case when t.ord <= h.done_count then now() - make_interval(days => 7 - t.ord) end,
  case when t.ord <= h.done_count then (select id from hr) end
from hires h
cross join tasks t
on conflict (employee_id, task_key) do nothing;
