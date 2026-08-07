import { z } from 'zod'

const money = z.coerce
  .number({ message: 'Enter a valid amount' })
  .min(0, 'Amount cannot be negative')
  .max(10_000_000, 'Amount is too large')

export const employeeFormSchema = z
  .object({
    // Section A — Personal
    first_name: z.string().trim().min(1, 'First name is required').max(80),
    last_name: z.string().trim().min(1, 'Last name is required').max(80),
    work_email: z.string().trim().min(1, 'Work email is required').email('Enter a valid email address'),
    phone: z.string().trim().max(30).optional().or(z.literal('')),
    country: z.string().trim().max(80).optional().or(z.literal('')),
    city: z.string().trim().max(80).optional().or(z.literal('')),
    avatar_url: z.string().trim().url('Enter a valid URL').optional().or(z.literal('')),

    // Section B — Employment
    employee_code: z
      .string()
      .trim()
      .min(2, 'Employee code is required')
      .max(20)
      .regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and dashes only'),
    department_id: z.string().min(1, 'Select a department'),
    designation_id: z.string().min(1, 'Select a designation'),
    manager_id: z.string().optional().or(z.literal('')),
    employment_type: z.enum(['full_time', 'part_time', 'contract', 'intern']),
    work_location_id: z.string().min(1, 'Select a work location'),
    joining_date: z.string().min(1, 'Joining date is required'),
    status: z.enum(['active', 'on_leave', 'probation', 'notice_period', 'inactive', 'future_hire']),

    // Section C — Compensation (stored in USD)
    base_salary_usd: money,
    pay_frequency: z.enum(['monthly', 'biweekly', 'weekly']),
    allowance_usd: money,
    bonus_usd: money,
    deduction_usd: money,

    // Section D — Emergency contact (all-or-nothing optional)
    ec_name: z.string().trim().max(120).optional().or(z.literal('')),
    ec_relationship: z.string().trim().max(60).optional().or(z.literal('')),
    ec_phone: z.string().trim().max(30).optional().or(z.literal('')),
  })
  .superRefine((values, ctx) => {
    const anyEc = !!(values.ec_name || values.ec_relationship || values.ec_phone)
    if (anyEc) {
      if (!values.ec_name)
        ctx.addIssue({ code: 'custom', path: ['ec_name'], message: 'Contact name is required' })
      if (!values.ec_relationship)
        ctx.addIssue({ code: 'custom', path: ['ec_relationship'], message: 'Relationship is required' })
      if (!values.ec_phone)
        ctx.addIssue({ code: 'custom', path: ['ec_phone'], message: 'Phone is required' })
    }
  })

/** Raw form values (inputs may be strings before coercion). */
export type EmployeeFormInput = z.input<typeof employeeFormSchema>
/** Parsed values after validation (numbers coerced). */
export type EmployeeFormValues = z.output<typeof employeeFormSchema>

/** True when the joining date is in the future (suggests `future_hire` status). */
export function isFutureJoiningDate(joiningDate: string): boolean {
  if (!joiningDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(`${joiningDate}T00:00:00`) > today
}
