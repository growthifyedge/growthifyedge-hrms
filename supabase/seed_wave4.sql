-- GrowthifyEdge HRMS — Wave 4 demo seed: Performance Management
-- Entirely fictional demo data. Run AFTER 0006_performance.sql.
-- Deterministic fixed UUIDs; rerun-safe via ON CONFLICT DO NOTHING.
-- The Mid-Year cycle is date-relative so the demo always has an active
-- cycle with pending reviews ("Reviews Due").

-- ---------------------------------------------------------------------------
-- Review cycles (closed / active / draft)
-- ---------------------------------------------------------------------------
with hr as (
  select id from public.profiles
  where role = 'hr_admin' and organization_id = 'aaaa0000-0000-4000-8000-000000000001'
  order by created_at limit 1
)
insert into public.performance_cycles
  (id, organization_id, name, start_date, end_date, status, created_by)
select v.id::uuid, 'aaaa0000-0000-4000-8000-000000000001', v.name,
       v.start_date, v.end_date, v.status, (select id from hr)
from (values
  ('cccc0000-0000-4000-8000-000000000001', 'Q1 2026 Performance Review',
   date '2026-01-05', date '2026-03-31', 'closed'),
  ('cccc0000-0000-4000-8000-000000000002', 'Mid-Year 2026 Review',
   current_date - 30, current_date + 30, 'active'),
  ('cccc0000-0000-4000-8000-000000000003', 'Annual 2026 Review',
   date '2026-11-02', date '2026-12-18', 'draft')
) as v(id, name, start_date, end_date, status)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Goals (38) — department-appropriate, manager taken from the employee's
-- current manager. Progress mix: in progress, completed, a few not started
-- and cancelled. Dates are relative to current_date.
-- ---------------------------------------------------------------------------
with hr as (
  select id from public.profiles
  where role = 'hr_admin' and organization_id = 'aaaa0000-0000-4000-8000-000000000001'
  order by created_at limit 1
)
insert into public.performance_goals
  (id, organization_id, employee_id, manager_employee_id, title, description,
   category, start_date, target_date, progress_percent, status, created_by)
select v.id::uuid, 'aaaa0000-0000-4000-8000-000000000001', v.emp::uuid,
       (select manager_id from public.employees e where e.id = v.emp::uuid),
       v.title, v.description, v.category,
       current_date - v.started_ago, current_date + v.due_in,
       v.progress, v.status, (select id from hr)
from (values
  -- Engineering (reports of Priya Sharma GE-1008)
  ('f0a10000-0000-4000-8000-000000000001', 'ee000000-0000-4000-8000-000000000009',
   'Cut API p95 latency by 30%', 'Profile and optimize the three slowest core endpoints.',
   'performance', 55, 35, 65, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000002', 'ee000000-0000-4000-8000-000000000009',
   'Mentor two junior engineers', 'Weekly pairing sessions and quarterly growth check-ins.',
   'leadership', 80, 60, 40, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000003', 'ee000000-0000-4000-8000-000000000010',
   'Launch client reporting dashboard', 'Ship the self-serve reporting module to all accounts.',
   'project', 70, 20, 85, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000004', 'ee000000-0000-4000-8000-000000000010',
   'Complete advanced React certification', 'Finish the certification course and share learnings.',
   'development', 95, -10, 100, 'completed'),
  ('f0a10000-0000-4000-8000-000000000005', 'ee000000-0000-4000-8000-000000000011',
   'Automate regression test suite', 'Raise automated coverage of critical flows to 80%.',
   'project', 60, 40, 55, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000006', 'ee000000-0000-4000-8000-000000000012',
   'Reduce build pipeline time by half', 'Parallelize CI stages and cache dependencies.',
   'performance', 45, 25, 70, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000007', 'ee000000-0000-4000-8000-000000000013',
   'Ship mobile-responsive settings module', 'Close the remaining responsive gaps in Settings.',
   'project', 50, 15, 90, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000008', 'ee000000-0000-4000-8000-000000000014',
   'Document core services architecture', 'Produce onboarding-ready service documentation.',
   'development', 100, -20, 100, 'completed'),
  ('f0a10000-0000-4000-8000-000000000009', 'ee000000-0000-4000-8000-000000000015',
   'Raise end-to-end test stability to 99%', 'Eliminate the flakiest specs and add retries where safe.',
   'performance', 65, 30, 45, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000010', 'ee000000-0000-4000-8000-000000000016',
   'Deliver load-testing framework', 'Stand up k6-based load tests for the top five endpoints.',
   'project', 40, 50, 25, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000011', 'ee000000-0000-4000-8000-000000000017',
   'Complete onboarding learning path', 'Finish the new-hire engineering curriculum.',
   'development', 12, 45, 30, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000012', 'ee000000-0000-4000-8000-000000000018',
   'Build internal CLI tooling', 'Small quality-of-life tooling for the platform team.',
   'project', 20, 70, 0, 'not_started'),
  ('f0a10000-0000-4000-8000-000000000013', 'ee000000-0000-4000-8000-000000000008',
   'Grow engineering leads bench', 'Prepare two senior engineers for lead responsibilities.',
   'leadership', 90, 90, 35, 'in_progress'),
  -- Sales (reports of Isabella Rossi GE-1019)
  ('f0a10000-0000-4000-8000-000000000014', 'ee000000-0000-4000-8000-000000000020',
   'Increase quarterly sales conversion to 28%', 'Tighten discovery-to-demo handoff and follow-ups.',
   'performance', 55, 35, 60, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000015', 'ee000000-0000-4000-8000-000000000020',
   'Win three enterprise logos in GCC', 'Focused pipeline on UAE and Saudi mid-enterprise.',
   'project', 75, 55, 33, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000016', 'ee000000-0000-4000-8000-000000000021',
   'Grow EU pipeline by 40%', 'Outbound program for France and DACH.',
   'performance', 60, 30, 75, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000017', 'ee000000-0000-4000-8000-000000000022',
   'Launch partner referral motion', 'Recruit and enable five referral partners in India.',
   'project', 85, -5, 100, 'completed'),
  ('f0a10000-0000-4000-8000-000000000018', 'ee000000-0000-4000-8000-000000000023',
   'Complete consultative selling course', 'Certification plus roleplay sign-off.',
   'development', 30, 60, 10, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000019', 'ee000000-0000-4000-8000-000000000019',
   'Stand up sales enablement library', 'Central battlecards, decks and call recordings.',
   'leadership', 70, 40, 50, 'in_progress'),
  -- Marketing (reports of Zainab Malik GE-1025)
  ('f0a10000-0000-4000-8000-000000000020', 'ee000000-0000-4000-8000-000000000026',
   'Deliver Q3 campaign plan', 'Full-funnel plan across paid, content and lifecycle.',
   'project', 50, 20, 80, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000021', 'ee000000-0000-4000-8000-000000000027',
   'Grow organic traffic by 25%', 'Technical SEO fixes plus two content clusters.',
   'performance', 65, 45, 55, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000022', 'ee000000-0000-4000-8000-000000000028',
   'Refresh brand asset library', 'Update templates, imagery and social kits.',
   'project', 40, 10, 95, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000023', 'ee000000-0000-4000-8000-000000000025',
   'Launch marketing analytics stack', 'Attribution dashboards for campaign ROI.',
   'leadership', 55, 65, 20, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000024', 'ee000000-0000-4000-8000-000000000026',
   'Podcast pilot season', 'Deprioritized after channel review.',
   'project', 100, 30, 15, 'cancelled'),
  -- Finance (reports of Sarah Goldstein GE-1029)
  ('f0a10000-0000-4000-8000-000000000025', 'ee000000-0000-4000-8000-000000000030',
   'Reduce reconciliation errors to <0.5%', 'Tighten close checklist and add automated checks.',
   'performance', 70, 25, 68, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000026', 'ee000000-0000-4000-8000-000000000031',
   'Automate monthly close reporting', 'Cut close reporting time from 5 days to 2.',
   'project', 60, 35, 50, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000027', 'ee000000-0000-4000-8000-000000000032',
   'Complete IFRS refresher certification', 'Multi-entity consolidation focus.',
   'development', 90, -15, 100, 'completed'),
  ('f0a10000-0000-4000-8000-000000000028', 'ee000000-0000-4000-8000-000000000029',
   'Roll out budget-owner training', 'Quarterly budget literacy sessions for team leads.',
   'leadership', 35, 55, 15, 'in_progress'),
  -- HR (reports of Sofia Andersson GE-1004 / Bilal Ahmed GE-1005)
  ('f0a10000-0000-4000-8000-000000000029', 'ee000000-0000-4000-8000-000000000005',
   'Improve employee onboarding experience', 'Raise 30-day new-hire satisfaction to 4.5/5.',
   'performance', 75, 45, 60, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000030', 'ee000000-0000-4000-8000-000000000006',
   'Digitize employee document workflows', 'Move remaining paper processes into the HRMS.',
   'project', 55, 25, 85, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000031', 'ee000000-0000-4000-8000-000000000033',
   'Complete HR analytics course', 'People-analytics fundamentals certification.',
   'development', 45, 40, 35, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000032', 'ee000000-0000-4000-8000-000000000004',
   'Launch quarterly engagement pulse', 'Lightweight pulse survey with exec readout.',
   'leadership', 60, 30, 70, 'in_progress'),
  -- Executive / cross-functional
  ('f0a10000-0000-4000-8000-000000000033', 'ee000000-0000-4000-8000-000000000002',
   'Open Dubai expansion plan', 'Operating plan for the GCC growth push.',
   'project', 80, 70, 45, 'in_progress'),
  ('f0a10000-0000-4000-8000-000000000034', 'ee000000-0000-4000-8000-000000000003',
   'Streamline executive reporting pack', 'Single monthly pack replacing four ad-hoc reports.',
   'project', 50, 20, 100, 'completed'),
  ('f0a10000-0000-4000-8000-000000000035', 'ee000000-0000-4000-8000-000000000024',
   'Improve customer response time to <2h', 'Intern project on support triage tooling.',
   'performance', 65, 50, 0, 'not_started'),
  ('f0a10000-0000-4000-8000-000000000036', 'ee000000-0000-4000-8000-000000000034',
   'Regional account handover plan', 'Wound down after notice period started.',
   'performance', 85, 15, 25, 'cancelled'),
  ('f0a10000-0000-4000-8000-000000000037', 'ee000000-0000-4000-8000-000000000021',
   'Shadow enterprise negotiation track', 'Development rotation with the sales director.',
   'development', 25, 65, 5, 'not_started'),
  ('f0a10000-0000-4000-8000-000000000038', 'ee000000-0000-4000-8000-000000000015',
   'QA guild knowledge sessions', 'Monthly cross-team quality sessions.',
   'leadership', 55, 45, 100, 'completed')
) as v(id, emp, title, description, category, started_ago, due_in, progress, status)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Reviews (16): 10 completed in the closed Q1 cycle, 3 completed and
-- 3 pending in the active Mid-Year cycle. Reviewer = the employee's
-- manager; overall = average of the four ratings (one decimal).
-- ---------------------------------------------------------------------------
insert into public.performance_reviews
  (id, organization_id, employee_id, cycle_id, reviewer_employee_id,
   goal_achievement_rating, quality_rating, collaboration_rating,
   initiative_rating, overall_rating, strengths, development_areas,
   overall_comments, status, completed_at)
select v.id::uuid, 'aaaa0000-0000-4000-8000-000000000001', v.emp::uuid, v.cycle::uuid,
       case when v.status = 'completed'
            then (select manager_id from public.employees e where e.id = v.emp::uuid) end,
       v.r1, v.r2, v.r3, v.r4,
       case when v.status = 'completed' then round((v.r1 + v.r2 + v.r3 + v.r4) / 4.0, 1) end,
       v.strengths, v.development_areas, v.comments, v.status,
       case when v.status = 'completed' then now() - make_interval(days => v.completed_ago) end
from (values
  -- Q1 2026 (closed) — completed
  ('be000000-0000-4000-8000-000000000001', 'ee000000-0000-4000-8000-000000000009', 'cccc0000-0000-4000-8000-000000000001',
   5, 4, 4, 5, 'Outstanding delivery on latency work.', 'Delegate more of the routine reviews.', 'Strong quarter with clear technical leadership.', 'completed', 120),
  ('be000000-0000-4000-8000-000000000002', 'ee000000-0000-4000-8000-000000000010', 'cccc0000-0000-4000-8000-000000000001',
   4, 5, 4, 4, 'Excellent product quality instincts.', 'Speak up earlier when scope slips.', 'Consistently exceeds expectations.', 'completed', 119),
  ('be000000-0000-4000-8000-000000000003', 'ee000000-0000-4000-8000-000000000011', 'cccc0000-0000-4000-8000-000000000001',
   4, 4, 5, 3, 'Great collaborator across squads.', 'Push more initiative on tooling.', 'Solid, dependable quarter.', 'completed', 118),
  ('be000000-0000-4000-8000-000000000004', 'ee000000-0000-4000-8000-000000000013', 'cccc0000-0000-4000-8000-000000000001',
   4, 4, 4, 4, 'Reliable delivery of the settings module.', 'Broaden backend exposure.', 'Meets and often exceeds expectations.', 'completed', 116),
  ('be000000-0000-4000-8000-000000000005', 'ee000000-0000-4000-8000-000000000015', 'cccc0000-0000-4000-8000-000000000001',
   3, 4, 4, 3, 'Careful, thorough test engineering.', 'Increase pace on stability backlog.', 'Meets expectations with quality focus.', 'completed', 115),
  ('be000000-0000-4000-8000-000000000006', 'ee000000-0000-4000-8000-000000000020', 'cccc0000-0000-4000-8000-000000000001',
   4, 3, 4, 5, 'Relentless pipeline energy.', 'Tighten forecast accuracy.', 'Strong revenue quarter in the GCC.', 'completed', 114),
  ('be000000-0000-4000-8000-000000000007', 'ee000000-0000-4000-8000-000000000021', 'cccc0000-0000-4000-8000-000000000001',
   5, 4, 5, 4, 'Best-in-team discovery calls.', 'Document playbooks for peers.', 'Exceptional customer trust building.', 'completed', 113),
  ('be000000-0000-4000-8000-000000000008', 'ee000000-0000-4000-8000-000000000026', 'cccc0000-0000-4000-8000-000000000001',
   4, 4, 3, 4, 'Sharp campaign narratives.', 'Coordinate earlier with sales.', 'Good creative quarter.', 'completed', 112),
  ('be000000-0000-4000-8000-000000000009', 'ee000000-0000-4000-8000-000000000030', 'cccc0000-0000-4000-8000-000000000001',
   3, 4, 3, 3, 'Accurate, on-time closes.', 'Automate more of the checklist.', 'Meets expectations; ready for more scope.', 'completed', 111),
  ('be000000-0000-4000-8000-000000000010', 'ee000000-0000-4000-8000-000000000006', 'cccc0000-0000-4000-8000-000000000001',
   2, 3, 2, 2, 'Cares deeply about employee experience.', 'Needs stronger follow-through on commitments.', 'Improvement plan agreed for next quarter.', 'completed', 110),
  -- Mid-Year 2026 (active) — completed
  ('be000000-0000-4000-8000-000000000011', 'ee000000-0000-4000-8000-000000000010', 'cccc0000-0000-4000-8000-000000000002',
   5, 5, 4, 4, 'Dashboard launch was flawless.', 'Balance perfectionism with pace.', 'Tracking to an exceptional year.', 'completed', 9),
  ('be000000-0000-4000-8000-000000000012', 'ee000000-0000-4000-8000-000000000021', 'cccc0000-0000-4000-8000-000000000002',
   4, 4, 5, 4, 'EU pipeline growth ahead of target.', 'Develop negotiation depth.', 'Exceeds expectations at mid-year.', 'completed', 6),
  ('be000000-0000-4000-8000-000000000013', 'ee000000-0000-4000-8000-000000000027', 'cccc0000-0000-4000-8000-000000000002',
   4, 4, 4, 5, 'SEO program outperforming.', 'Share learnings across the team.', 'Excellent independent execution.', 'completed', 4),
  -- Mid-Year 2026 (active) — pending (ratings null until the RPC completes them)
  ('be000000-0000-4000-8000-000000000014', 'ee000000-0000-4000-8000-000000000009', 'cccc0000-0000-4000-8000-000000000002',
   null, null, null, null, null, null, null, 'pending', 0),
  ('be000000-0000-4000-8000-000000000015', 'ee000000-0000-4000-8000-000000000011', 'cccc0000-0000-4000-8000-000000000002',
   null, null, null, null, null, null, null, 'pending', 0),
  ('be000000-0000-4000-8000-000000000016', 'ee000000-0000-4000-8000-000000000020', 'cccc0000-0000-4000-8000-000000000002',
   null, null, null, null, null, null, null, 'pending', 0)
) as v(id, emp, cycle, r1, r2, r3, r4, strengths, development_areas, comments, status, completed_ago)
on conflict (id) do nothing;
