export type Role = 'hr_admin' | 'manager' | 'employee'

export type EmployeeStatus =
  | 'active'
  | 'on_leave'
  | 'probation'
  | 'notice_period'
  | 'inactive'
  | 'future_hire'

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern'

export type PayFrequency = 'monthly' | 'biweekly' | 'weekly'

export type CurrencyCode = 'USD' | 'PKR' | 'GBP' | 'EUR'

export type RecordStatus = 'active' | 'inactive'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  default_currency: CurrencyCode
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  organization_id: string
  full_name: string
  email: string
  role: Role
  avatar_url: string | null
  status: RecordStatus
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  organization_id: string
  name: string
  code: string
  head_employee_id: string | null
  description: string | null
  status: RecordStatus
  created_at: string
  updated_at: string
}

export interface Designation {
  id: string
  organization_id: string
  department_id: string
  title: string
  level: string | null
  description: string | null
  status: RecordStatus
  created_at: string
  updated_at: string
}

export interface WorkLocation {
  id: string
  organization_id: string
  name: string
  city: string
  country: string
  timezone: string | null
  status: RecordStatus
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  organization_id: string
  auth_user_id: string | null
  employee_code: string
  first_name: string
  last_name: string
  work_email: string
  phone: string | null
  avatar_url: string | null
  country: string | null
  city: string | null
  department_id: string | null
  designation_id: string | null
  manager_id: string | null
  employment_type: EmploymentType
  work_location_id: string | null
  joining_date: string
  status: EmployeeStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

/** Employee row with joined lookup names, as returned by directory queries. */
export interface EmployeeWithRelations extends Employee {
  department: Pick<Department, 'id' | 'name'> | null
  designation: Pick<Designation, 'id' | 'title'> | null
  work_location: Pick<WorkLocation, 'id' | 'name' | 'city' | 'country'> | null
  manager: Pick<Employee, 'id' | 'first_name' | 'last_name'> | null
}

export interface EmployeeCompensation {
  id: string
  organization_id: string
  employee_id: string
  base_salary_usd: number
  allowance_usd: number
  bonus_usd: number
  deduction_usd: number
  pay_frequency: PayFrequency
  effective_from: string
  created_at: string
  updated_at: string
}

export interface EmergencyContact {
  id: string
  organization_id: string
  employee_id: string
  contact_name: string
  relationship: string
  phone: string
  created_at: string
  updated_at: string
}

export type DocumentType =
  | 'Employment Contract'
  | 'Identification'
  | 'Resume'
  | 'Offer Letter'
  | 'Certificate'
  | 'Policy Acknowledgement'
  | 'Other'

export type DocumentStatus = 'Valid' | 'Expiring Soon' | 'Expired' | 'Pending Review'

export interface EmployeeDocument {
  id: string
  organization_id: string
  employee_id: string
  document_name: string
  document_type: DocumentType
  storage_path: string
  mime_type: string
  size_bytes: number
  upload_date: string
  expiry_date: string | null
  status: DocumentStatus
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export interface Announcement {
  id: string
  organization_id: string
  title: string
  content: string
  audience: string
  status: 'draft' | 'published' | 'archived'
  published_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ExchangeRate {
  id: string
  organization_id: string
  currency_code: CurrencyCode
  currency_symbol: string
  rate_from_usd: number
  decimal_precision: number
  updated_at: string
}

// ---------------------------------------------------------------------------
// Wave 2 — Time & Leave
// ---------------------------------------------------------------------------

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'remote' | 'on_leave'

export type ShiftType = 'morning' | 'standard' | 'evening'

export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export interface AttendanceRecord {
  id: string
  organization_id: string
  employee_id: string
  attendance_date: string
  status: AttendanceStatus
  shift: ShiftType
  check_in: string | null
  check_out: string | null
  notes: string | null
  marked_by: string | null
  created_at: string
  updated_at: string
}

/** Compact employee embed used by attendance and leave listings. */
export interface EmployeeSummary {
  id: string
  first_name: string
  last_name: string
  employee_code: string
  avatar_url: string | null
  manager_id: string | null
  department: Pick<Department, 'id' | 'name'> | null
}

export interface AttendanceRecordWithEmployee extends AttendanceRecord {
  employee: EmployeeSummary | null
}

export interface LeaveType {
  id: string
  organization_id: string
  name: string
  code: string
  default_entitlement_days: number
  is_paid: boolean
  status: RecordStatus
  created_at: string
  updated_at: string
}

export interface LeaveBalance {
  id: string
  organization_id: string
  employee_id: string
  leave_type_id: string
  year: number
  entitlement_days: number
  created_at: string
  updated_at: string
}

export interface LeaveRequest {
  id: string
  organization_id: string
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  days_requested: number
  reason: string
  status: LeaveStatus
  submitted_by: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  updated_at: string
}

export interface LeaveRequestWithRelations extends LeaveRequest {
  employee: EmployeeSummary | null
  leave_type: Pick<LeaveType, 'id' | 'name' | 'code' | 'is_paid'> | null
  reviewer: { full_name: string } | null
}

// ---------------------------------------------------------------------------
// Wave 3 — Recruitment + Onboarding
// ---------------------------------------------------------------------------

export type JobStatus = 'draft' | 'open' | 'closed'

export type JobEmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship'

export type CandidateStage = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'

export type CandidateSource = 'LinkedIn' | 'Referral' | 'Company Website' | 'Indeed' | 'Recruiter'

export interface JobOpening {
  id: string
  organization_id: string
  title: string
  department_id: string | null
  designation_id: string | null
  location_id: string | null
  hiring_manager_id: string | null
  employment_type: JobEmploymentType
  openings_count: number
  description: string | null
  status: JobStatus
  posted_at: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface JobOpeningWithRelations extends JobOpening {
  department: Pick<Department, 'id' | 'name'> | null
  designation: Pick<Designation, 'id' | 'title'> | null
  location: Pick<WorkLocation, 'id' | 'name' | 'city'> | null
  hiring_manager: Pick<Employee, 'id' | 'first_name' | 'last_name'> | null
}

export interface Candidate {
  id: string
  organization_id: string
  job_opening_id: string
  full_name: string
  email: string
  phone: string | null
  location_text: string | null
  experience_years: number | null
  source: CandidateSource
  expected_salary: number | null
  proposed_salary: number | null
  stage: CandidateStage
  notes: string | null
  interview_at: string | null
  interviewer_employee_id: string | null
  interview_note: string | null
  application_date: string
  hired_employee_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CandidateWithRelations extends Candidate {
  job: Pick<
    JobOpening,
    'id' | 'title' | 'hiring_manager_id' | 'department_id' | 'designation_id' | 'location_id' | 'employment_type'
  > | null
  interviewer: Pick<Employee, 'id' | 'first_name' | 'last_name'> | null
}

export type OnboardingTaskStatus = 'pending' | 'completed'

export interface OnboardingTask {
  id: string
  organization_id: string
  employee_id: string
  task_key: string
  title: string
  status: OnboardingTaskStatus
  completed_at: string | null
  completed_by: string | null
  created_at: string
  updated_at: string
}

export interface OnboardingTaskWithEmployee extends OnboardingTask {
  employee:
    | (Pick<
        Employee,
        'id' | 'first_name' | 'last_name' | 'employee_code' | 'avatar_url' | 'joining_date' | 'manager_id'
      > & {
        department: Pick<Department, 'id' | 'name'> | null
        manager: Pick<Employee, 'id' | 'first_name' | 'last_name'> | null
      })
    | null
}

export interface PendingAction {
  id: string
  label: string
  detail: string
  kind: 'leave' | 'document' | 'review' | 'interview'
}

export interface DashboardDemoMetrics {
  id: string
  organization_id: string
  attendance_rate: number
  on_leave_today: number
  open_vacancies: number
  pending_hr_actions: number
  attendance_trend: { day: string; rate: number }[]
  recruitment_pipeline: { stage: string; count: number }[]
  pending_actions: PendingAction[] | null
  updated_at: string
}
