import { describe, expect, it } from 'vitest'
import { employeeFormSchema, isFutureJoiningDate } from './employeeSchema'

const validValues = {
  first_name: 'Test',
  last_name: 'Person',
  work_email: 'test.person@demo.growthifyedge.com',
  phone: '',
  country: '',
  city: '',
  avatar_url: '',
  employee_code: 'GE-9999',
  department_id: 'dept-1',
  designation_id: 'desig-1',
  manager_id: '',
  employment_type: 'full_time',
  work_location_id: 'loc-1',
  joining_date: '2026-01-15',
  status: 'active',
  base_salary_usd: 3000,
  pay_frequency: 'monthly',
  allowance_usd: 100,
  bonus_usd: 0,
  deduction_usd: 50,
  ec_name: '',
  ec_relationship: '',
  ec_phone: '',
}

describe('employeeFormSchema', () => {
  it('accepts a valid employee', () => {
    expect(employeeFormSchema.safeParse(validValues).success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const result = employeeFormSchema.safeParse({ ...validValues, first_name: '', department_id: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('first_name')
      expect(paths).toContain('department_id')
    }
  })

  it('rejects invalid emails', () => {
    expect(employeeFormSchema.safeParse({ ...validValues, work_email: 'not-an-email' }).success).toBe(false)
  })

  it('rejects negative compensation', () => {
    expect(employeeFormSchema.safeParse({ ...validValues, base_salary_usd: -100 }).success).toBe(false)
    expect(employeeFormSchema.safeParse({ ...validValues, deduction_usd: -1 }).success).toBe(false)
  })

  it('rejects invalid employee codes', () => {
    expect(employeeFormSchema.safeParse({ ...validValues, employee_code: 'has spaces' }).success).toBe(false)
  })

  it('allows manager to be blank (senior leadership)', () => {
    expect(employeeFormSchema.safeParse({ ...validValues, manager_id: '' }).success).toBe(true)
  })

  it('requires the full emergency contact once any field is set', () => {
    const result = employeeFormSchema.safeParse({ ...validValues, ec_name: 'Jane Doe' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('ec_relationship')
      expect(paths).toContain('ec_phone')
    }
  })

  it('accepts a complete emergency contact', () => {
    expect(
      employeeFormSchema.safeParse({
        ...validValues,
        ec_name: 'Jane Doe',
        ec_relationship: 'Spouse',
        ec_phone: '+1-555-0100',
      }).success,
    ).toBe(true)
  })
})

describe('isFutureJoiningDate', () => {
  it('detects future dates', () => {
    const future = new Date()
    future.setDate(future.getDate() + 30)
    expect(isFutureJoiningDate(future.toISOString().slice(0, 10))).toBe(true)
  })

  it('treats today and the past as not future', () => {
    expect(isFutureJoiningDate(new Date().toISOString().slice(0, 10))).toBe(false)
    expect(isFutureJoiningDate('2020-01-01')).toBe(false)
  })

  it('handles empty input', () => {
    expect(isFutureJoiningDate('')).toBe(false)
  })
})
