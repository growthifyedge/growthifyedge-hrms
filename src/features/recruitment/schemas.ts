import { z } from 'zod'

const optionalMoney = z.coerce
  .number({ message: 'Enter a valid amount' })
  .min(0, 'Amount cannot be negative')
  .max(10_000_000, 'Amount is too large')

export const jobFormSchema = z.object({
  title: z.string().trim().min(2, 'Job title is required').max(120),
  department_id: z.string().min(1, 'Select a department'),
  designation_id: z.string().optional().or(z.literal('')),
  location_id: z.string().min(1, 'Select a location'),
  hiring_manager_id: z.string().min(1, 'Select a hiring manager'),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'internship']),
  openings_count: z.coerce
    .number({ message: 'Enter the number of openings' })
    .int('Openings must be a whole number')
    .min(1, 'At least one opening')
    .max(50, 'Openings is too large'),
  description: z.string().trim().max(500, 'Keep the description short').optional().or(z.literal('')),
  status: z.enum(['draft', 'open', 'closed']),
})

export type JobFormInput = z.input<typeof jobFormSchema>
export type JobFormValues = z.output<typeof jobFormSchema>

export const candidateFormSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name is required').max(120),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  job_opening_id: z.string().min(1, 'Select a job opening'),
  source: z.enum(['LinkedIn', 'Referral', 'Company Website', 'Indeed', 'Recruiter'], {
    message: 'Select a source',
  }),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  location_text: z.string().trim().max(120).optional().or(z.literal('')),
  experience_years: z.coerce
    .number({ message: 'Enter years of experience' })
    .min(0, 'Cannot be negative')
    .max(60, 'Too large')
    .optional(),
  expected_salary: optionalMoney.optional(),
  notes: z.string().trim().max(300, 'Keep notes short').optional().or(z.literal('')),
})

export type CandidateFormInput = z.input<typeof candidateFormSchema>
export type CandidateFormValues = z.output<typeof candidateFormSchema>

export const hireFormSchema = z.object({
  employee_code: z
    .string()
    .trim()
    .min(2, 'Employee code is required')
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and dashes only'),
  manager_id: z.string().min(1, 'Select a manager'),
  joining_date: z.string().min(1, 'Joining date is required'),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'intern']),
})

export type HireFormValues = z.output<typeof hireFormSchema>

/** Fields captured when moving a candidate to the Interview stage. */
export const interviewDetailsSchema = z.object({
  interview_at: z.string().min(1, 'Interview date/time is required'),
  interviewer_employee_id: z.string().min(1, 'Select an interviewer'),
  interview_note: z.string().trim().max(300, 'Keep the note short').optional().or(z.literal('')),
})

export type InterviewDetailsValues = z.output<typeof interviewDetailsSchema>
