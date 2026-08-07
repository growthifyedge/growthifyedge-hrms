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
