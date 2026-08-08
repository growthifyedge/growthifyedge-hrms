import { describe, expect, it } from 'vitest'
import { attendanceFormSchema, makeLeaveFormSchema } from './schemas'

const validAttendance = {
  employee_id: 'emp-1',
  attendance_date: '2026-08-07',
  status: 'present',
  shift: 'standard',
  check_in: '09:00',
  check_out: '17:30',
  notes: '',
}

describe('attendanceFormSchema', () => {
  it('accepts a complete present record', () => {
    expect(attendanceFormSchema.safeParse(validAttendance).success).toBe(true)
  })

  it('requires employee, status and shift', () => {
    const result = attendanceFormSchema.safeParse({
      ...validAttendance,
      employee_id: '',
    })
    expect(result.success).toBe(false)
  })

  it('requires check-in for present/late/remote', () => {
    const result = attendanceFormSchema.safeParse({
      ...validAttendance,
      check_in: '',
      check_out: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('check_in'))).toBe(true)
    }
  })

  it('allows missing times for absent and on-leave', () => {
    for (const status of ['absent', 'on_leave']) {
      const result = attendanceFormSchema.safeParse({
        ...validAttendance,
        status,
        check_in: '',
        check_out: '',
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects check-out earlier than check-in', () => {
    const result = attendanceFormSchema.safeParse({
      ...validAttendance,
      check_in: '17:00',
      check_out: '09:00',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('check_out'))).toBe(true)
    }
  })
})

const validLeave = {
  employee_id: 'emp-1',
  leave_type_id: 'type-annual',
  start_date: '2026-08-10',
  end_date: '2026-08-14',
  reason: 'Family holiday',
}

describe('leave form schema', () => {
  const unlimited = makeLeaveFormSchema(() => ({ remaining: null }))

  it('accepts a valid request', () => {
    expect(unlimited.safeParse(validLeave).success).toBe(true)
  })

  it('requires all fields including a concise reason', () => {
    expect(unlimited.safeParse({ ...validLeave, reason: '' }).success).toBe(false)
    expect(unlimited.safeParse({ ...validLeave, employee_id: '' }).success).toBe(false)
    expect(unlimited.safeParse({ ...validLeave, leave_type_id: '' }).success).toBe(false)
    expect(unlimited.safeParse({ ...validLeave, start_date: '' }).success).toBe(false)
    expect(unlimited.safeParse({ ...validLeave, end_date: '' }).success).toBe(false)
  })

  it('rejects an end date before the start date', () => {
    const result = unlimited.safeParse({ ...validLeave, end_date: '2026-08-01' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('end_date'))).toBe(true)
    }
  })

  it('blocks paid requests that exceed the remaining balance', () => {
    const limited = makeLeaveFormSchema(() => ({ remaining: 3 }))
    const result = limited.safeParse(validLeave) // 5 inclusive days > 3 remaining
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/3 days remaining/)
    }
  })

  it('allows unpaid requests of any length', () => {
    const unpaid = makeLeaveFormSchema(() => ({ remaining: null }))
    expect(
      unpaid.safeParse({ ...validLeave, start_date: '2026-08-01', end_date: '2026-08-30' }).success,
    ).toBe(true)
  })
})
