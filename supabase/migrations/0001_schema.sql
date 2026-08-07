-- GrowthifyEdge HRMS — Wave 1 schema
-- Conventions: UUID primary keys, created_at/updated_at timestamps,
-- text + CHECK constraints instead of enums (simpler to evolve),
-- organization_id everywhere for future portability (one seeded org in Wave 1).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  default_currency text not null default 'USD'
    check (default_currency in ('USD', 'PKR', 'GBP', 'EUR')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles (linked to auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id),
  full_name text not null,
  email text not null,
  role text not null default 'employee'
    check (role in ('hr_admin', 'manager', 'employee')),
  avatar_url text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_organization_idx on public.profiles (organization_id);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- departments
-- ---------------------------------------------------------------------------
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null,
  code text not null,
  head_employee_id uuid, -- FK added after employees exists
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (organization_id, code)
);

create index departments_organization_idx on public.departments (organization_id);

create trigger departments_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- designations
-- ---------------------------------------------------------------------------
create table public.designations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  department_id uuid not null references public.departments (id),
  title text not null,
  level text,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, title)
);

create index designations_organization_idx on public.designations (organization_id);
create index designations_department_idx on public.designations (department_id);

create trigger designations_updated_at
  before update on public.designations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- work_locations
-- ---------------------------------------------------------------------------
create table public.work_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null,
  city text not null,
  country text not null,
  timezone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create index work_locations_organization_idx on public.work_locations (organization_id);

create trigger work_locations_updated_at
  before update on public.work_locations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------------
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  auth_user_id uuid references auth.users (id),
  employee_code text not null,
  first_name text not null,
  last_name text not null,
  work_email text not null,
  phone text,
  avatar_url text,
  country text,
  city text,
  department_id uuid references public.departments (id),
  designation_id uuid references public.designations (id),
  manager_id uuid references public.employees (id),
  employment_type text not null default 'full_time'
    check (employment_type in ('full_time', 'part_time', 'contract', 'intern')),
  work_location_id uuid references public.work_locations (id),
  joining_date date not null,
  status text not null default 'active'
    check (status in ('active', 'on_leave', 'probation', 'notice_period', 'inactive', 'future_hire')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_code),
  unique (organization_id, work_email)
);

create index employees_organization_idx on public.employees (organization_id);
create index employees_department_idx on public.employees (department_id);
create index employees_designation_idx on public.employees (designation_id);
create index employees_manager_idx on public.employees (manager_id);
create index employees_auth_user_idx on public.employees (auth_user_id);
create index employees_status_idx on public.employees (status);
create index employees_joining_date_idx on public.employees (joining_date);

create trigger employees_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

-- Department head FK (deferred until employees exists)
alter table public.departments
  add constraint departments_head_employee_fkey
  foreign key (head_employee_id) references public.employees (id);

-- ---------------------------------------------------------------------------
-- employee_compensation
-- ---------------------------------------------------------------------------
create table public.employee_compensation (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  employee_id uuid not null references public.employees (id),
  base_salary_usd numeric(12, 2) not null default 0 check (base_salary_usd >= 0),
  allowance_usd numeric(12, 2) not null default 0 check (allowance_usd >= 0),
  bonus_usd numeric(12, 2) not null default 0 check (bonus_usd >= 0),
  deduction_usd numeric(12, 2) not null default 0 check (deduction_usd >= 0),
  pay_frequency text not null default 'monthly'
    check (pay_frequency in ('monthly', 'biweekly', 'weekly')),
  effective_from date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index employee_compensation_employee_idx on public.employee_compensation (employee_id);
create index employee_compensation_organization_idx on public.employee_compensation (organization_id);

create trigger employee_compensation_updated_at
  before update on public.employee_compensation
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- employee_emergency_contacts
-- ---------------------------------------------------------------------------
create table public.employee_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  employee_id uuid not null references public.employees (id),
  contact_name text not null,
  relationship text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index employee_emergency_contacts_employee_idx
  on public.employee_emergency_contacts (employee_id);

create trigger employee_emergency_contacts_updated_at
  before update on public.employee_emergency_contacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- employee_documents
-- ---------------------------------------------------------------------------
create table public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  employee_id uuid not null references public.employees (id),
  document_name text not null,
  document_type text not null
    check (document_type in (
      'Employment Contract', 'Identification', 'Resume', 'Offer Letter',
      'Certificate', 'Policy Acknowledgement', 'Other')),
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  upload_date date not null default current_date,
  expiry_date date,
  status text not null default 'Pending Review'
    check (status in ('Valid', 'Expiring Soon', 'Expired', 'Pending Review')),
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index employee_documents_employee_idx on public.employee_documents (employee_id);
create index employee_documents_organization_idx on public.employee_documents (organization_id);

create trigger employee_documents_updated_at
  before update on public.employee_documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  title text not null,
  content text not null,
  audience text not null default 'all',
  status text not null default 'published'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index announcements_organization_idx on public.announcements (organization_id);
create index announcements_published_idx on public.announcements (status, published_at desc);

create trigger announcements_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- exchange_rates (configurable demo rates; USD is the stored base)
-- ---------------------------------------------------------------------------
create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  currency_code text not null check (currency_code in ('USD', 'PKR', 'GBP', 'EUR')),
  currency_symbol text not null,
  rate_from_usd numeric(14, 6) not null check (rate_from_usd > 0),
  decimal_precision smallint not null default 2 check (decimal_precision between 0 and 6),
  updated_at timestamptz not null default now(),
  unique (organization_id, currency_code)
);

create trigger exchange_rates_updated_at
  before update on public.exchange_rates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- dashboard_demo_metrics
-- TEMPORARY Wave 1 support table. Holds showcase metrics for modules whose
-- operational implementations (attendance, leave, recruitment) arrive in later
-- waves. Replace each field with real module queries when those waves land,
-- then drop this table.
-- ---------------------------------------------------------------------------
create table public.dashboard_demo_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) unique,
  attendance_rate numeric(5, 2) not null default 0,
  on_leave_today integer not null default 0,
  open_vacancies integer not null default 0,
  pending_hr_actions integer not null default 0,
  attendance_trend jsonb not null default '[]'::jsonb,
  recruitment_pipeline jsonb not null default '[]'::jsonb,
  pending_actions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger dashboard_demo_metrics_updated_at
  before update on public.dashboard_demo_metrics
  for each row execute function public.set_updated_at();
