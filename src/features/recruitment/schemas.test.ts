import { describe, expect, it } from 'vitest'
import { candidateFormSchema, hireFormSchema, interviewDetailsSchema, jobFormSchema } from './schemas'

const validJob = {
  title: 'Senior Software Engineer',
  department_id: 'dept-1',
  designation_id: '',
  location_id: 'loc-1',
  hiring_manager_id: 'emp-1',
  employment_type: 'full_time',
  openings_count: 2,
  description: 'Own core services.',
  status: 'open',
}

describe('jobFormSchema', () => {
  it('accepts a complete job', () => {
    expect(jobFormSchema.safeParse(validJob).success).toBe(true)
  })

  it('requires title, department, location and hiring manager', () => {
    expect(jobFormSchema.safeParse({ ...validJob, title: '' }).success).toBe(false)
    expect(jobFormSchema.safeParse({ ...validJob, department_id: '' }).success).toBe(false)
    expect(jobFormSchema.safeParse({ ...validJob, location_id: '' }).success).toBe(false)
    expect(jobFormSchema.safeParse({ ...validJob, hiring_manager_id: '' }).success).toBe(false)
  })

  it('requires at least one whole opening', () => {
    expect(jobFormSchema.safeParse({ ...validJob, openings_count: 0 }).success).toBe(false)
    expect(jobFormSchema.safeParse({ ...validJob, openings_count: 1.5 }).success).toBe(false)
  })

  it('coerces numeric strings from form inputs', () => {
    const result = jobFormSchema.safeParse({ ...validJob, openings_count: '3' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.openings_count).toBe(3)
  })
})

const validCandidate = {
  full_name: 'Viktor Hansen',
  email: 'viktor@example.com',
  job_opening_id: 'job-1',
  source: 'LinkedIn',
  phone: '',
  location_text: '',
  notes: '',
}

describe('candidateFormSchema', () => {
  it('accepts required-only input', () => {
    expect(candidateFormSchema.safeParse(validCandidate).success).toBe(true)
  })

  it('requires name, valid email, job and source', () => {
    expect(candidateFormSchema.safeParse({ ...validCandidate, full_name: '' }).success).toBe(false)
    expect(candidateFormSchema.safeParse({ ...validCandidate, email: 'not-an-email' }).success).toBe(false)
    expect(candidateFormSchema.safeParse({ ...validCandidate, job_opening_id: '' }).success).toBe(false)
    expect(candidateFormSchema.safeParse({ ...validCandidate, source: 'Facebook' }).success).toBe(false)
  })

  it('rejects negative experience or salary', () => {
    expect(candidateFormSchema.safeParse({ ...validCandidate, experience_years: -1 }).success).toBe(false)
    expect(candidateFormSchema.safeParse({ ...validCandidate, expected_salary: -5 }).success).toBe(false)
  })
})

describe('hireFormSchema', () => {
  const validHire = {
    employee_code: 'GE-1042',
    manager_id: 'emp-8',
    joining_date: '2026-09-01',
    employment_type: 'full_time',
  }

  it('accepts a complete hire form', () => {
    expect(hireFormSchema.safeParse(validHire).success).toBe(true)
  })

  it('requires code, manager and joining date', () => {
    expect(hireFormSchema.safeParse({ ...validHire, employee_code: '' }).success).toBe(false)
    expect(hireFormSchema.safeParse({ ...validHire, manager_id: '' }).success).toBe(false)
    expect(hireFormSchema.safeParse({ ...validHire, joining_date: '' }).success).toBe(false)
  })

  it('rejects invalid code characters and employment types', () => {
    expect(hireFormSchema.safeParse({ ...validHire, employee_code: 'GE 10!' }).success).toBe(false)
    expect(hireFormSchema.safeParse({ ...validHire, employment_type: 'internship' }).success).toBe(false)
  })
})

describe('interviewDetailsSchema', () => {
  it('requires date/time and interviewer', () => {
    expect(
      interviewDetailsSchema.safeParse({
        interview_at: '2026-08-20T14:00',
        interviewer_employee_id: 'emp-8',
        interview_note: '',
      }).success,
    ).toBe(true)
    expect(
      interviewDetailsSchema.safeParse({ interview_at: '', interviewer_employee_id: 'emp-8' }).success,
    ).toBe(false)
    expect(
      interviewDetailsSchema.safeParse({ interview_at: '2026-08-20T14:00', interviewer_employee_id: '' }).success,
    ).toBe(false)
  })
})
