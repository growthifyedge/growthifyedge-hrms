import { describe, expect, it } from 'vitest'
import {
  attendanceRate,
  countAttendance,
  formatTime,
  formatWorkedHours,
  inclusiveLeaveDays,
  summarizeLeaveBalances,
  workedMinutes,
} from './timeLeave'
import type { AttendanceStatus } from '../types/db'

describe('workedMinutes', () => {
  it('derives minutes from a check-in/check-out pair', () => {
    expect(workedMinutes('09:00', '17:30')).toBe(510)
    expect(workedMinutes('08:45:00', '17:00:00')).toBe(495)
  })

  it('returns null when either end is missing', () => {
    expect(workedMinutes(null, '17:00')).toBeNull()
    expect(workedMinutes('09:00', null)).toBeNull()
    expect(workedMinutes(null, null)).toBeNull()
  })

  it('returns null when check-out is not after check-in', () => {
    expect(workedMinutes('17:00', '09:00')).toBeNull()
    expect(workedMinutes('09:00', '09:00')).toBeNull()
  })

  it('returns null for malformed times', () => {
    expect(workedMinutes('nine', '17:00')).toBeNull()
    expect(workedMinutes('25:00', '26:00')).toBeNull()
  })
})

describe('formatWorkedHours', () => {
  it('formats hours and minutes', () => {
    expect(formatWorkedHours(510)).toBe('8h 30m')
    expect(formatWorkedHours(480)).toBe('8h')
    expect(formatWorkedHours(45)).toBe('45m')
  })

  it('em-dashes when not derivable', () => {
    expect(formatWorkedHours(null)).toBe('—')
    expect(formatWorkedHours(0)).toBe('—')
  })
})

describe('formatTime', () => {
  it('renders 12-hour labels', () => {
    expect(formatTime('09:05:00')).toBe('9:05 AM')
    expect(formatTime('17:30')).toBe('5:30 PM')
  })

  it('em-dashes empty values', () => {
    expect(formatTime(null)).toBe('—')
    expect(formatTime('')).toBe('—')
  })
})

describe('attendanceRate', () => {
  it('uses (present + late + remote) / (present + late + remote + absent)', () => {
    expect(
      attendanceRate({ present: 20, late: 3, remote: 5, absent: 2, on_leave: 4 }),
    ).toBe(93) // 28 / 30
  })

  it('excludes on-leave employees from the denominator', () => {
    expect(attendanceRate({ present: 9, late: 0, remote: 0, absent: 1, on_leave: 10 })).toBe(90)
  })

  it('is null when nothing is measurable', () => {
    expect(attendanceRate({ present: 0, late: 0, remote: 0, absent: 0, on_leave: 5 })).toBeNull()
    expect(attendanceRate({ present: 0, late: 0, remote: 0, absent: 0, on_leave: 0 })).toBeNull()
  })

  it('counts rows by status', () => {
    const rows: Array<{ status: AttendanceStatus }> = [
      { status: 'present' },
      { status: 'present' },
      { status: 'late' },
      { status: 'absent' },
      { status: 'on_leave' },
    ]
    expect(countAttendance(rows)).toEqual({ present: 2, late: 1, absent: 1, remote: 0, on_leave: 1 })
  })
})

describe('inclusiveLeaveDays', () => {
  it('counts inclusive calendar days', () => {
    expect(inclusiveLeaveDays('2026-08-10', '2026-08-14')).toBe(5)
    expect(inclusiveLeaveDays('2026-08-10', '2026-08-10')).toBe(1)
  })

  it('spans weekends and month boundaries as plain calendar days', () => {
    expect(inclusiveLeaveDays('2026-08-28', '2026-09-01')).toBe(5)
  })

  it('rejects inverted or missing ranges', () => {
    expect(inclusiveLeaveDays('2026-08-14', '2026-08-10')).toBeNull()
    expect(inclusiveLeaveDays('', '2026-08-10')).toBeNull()
    expect(inclusiveLeaveDays('2026-08-10', null)).toBeNull()
  })
})

describe('summarizeLeaveBalances', () => {
  const types = [
    { id: 't-annual', name: 'Annual Leave', is_paid: true, default_entitlement_days: 20 },
    { id: 't-sick', name: 'Sick Leave', is_paid: true, default_entitlement_days: 10 },
    { id: 't-unpaid', name: 'Unpaid Leave', is_paid: false, default_entitlement_days: 0 },
  ]

  it('derives used and remaining from approved requests', () => {
    const result = summarizeLeaveBalances(
      types,
      [{ leave_type_id: 't-annual', entitlement_days: 20 }],
      [
        { leave_type_id: 't-annual', days_requested: 5 },
        { leave_type_id: 't-annual', days_requested: 3 },
      ],
    )
    const annual = result.find((r) => r.leaveTypeId === 't-annual')
    expect(annual).toMatchObject({ entitlement: 20, used: 8, remaining: 12 })
  })

  it('falls back to the type default when no balance row exists', () => {
    const result = summarizeLeaveBalances(types, [], [])
    expect(result.find((r) => r.leaveTypeId === 't-sick')).toMatchObject({
      entitlement: 10,
      used: 0,
      remaining: 10,
    })
  })

  it('reports usage without a remaining balance for unpaid leave', () => {
    const result = summarizeLeaveBalances(types, [], [
      { leave_type_id: 't-unpaid', days_requested: 11 },
    ])
    expect(result.find((r) => r.leaveTypeId === 't-unpaid')).toMatchObject({
      used: 11,
      remaining: null,
    })
  })

  it('never reports negative remaining days', () => {
    const result = summarizeLeaveBalances(
      types,
      [{ leave_type_id: 't-sick', entitlement_days: 2 }],
      [{ leave_type_id: 't-sick', days_requested: 5 }],
    )
    expect(result.find((r) => r.leaveTypeId === 't-sick')?.remaining).toBe(0)
  })
})
