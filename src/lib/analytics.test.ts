import { describe, expect, it } from 'vitest'
import { attendanceDailyBreakdown, countBy, sumByGroup } from './analytics'
import type { AttendanceStatus } from '../types/db'

describe('countBy', () => {
  it('counts rows per key value', () => {
    const rows = [{ status: 'a' }, { status: 'b' }, { status: 'a' }]
    const counts = countBy(rows, 'status')
    expect(counts.get('a')).toBe(2)
    expect(counts.get('b')).toBe(1)
  })

  it('handles empty input and missing values', () => {
    expect(countBy([], 'x' as never).size).toBe(0)
    const counts = countBy([{ status: null }], 'status')
    expect(counts.get('—')).toBe(1)
  })
})

describe('attendanceDailyBreakdown', () => {
  const rows: Array<{ attendance_date: string; status: AttendanceStatus }> = [
    { attendance_date: '2026-08-06', status: 'present' },
    { attendance_date: '2026-08-06', status: 'present' },
    { attendance_date: '2026-08-06', status: 'late' },
    { attendance_date: '2026-08-06', status: 'on_leave' },
    { attendance_date: '2026-08-07', status: 'remote' },
    { attendance_date: '2026-08-07', status: 'absent' },
  ]

  it('groups by day in ascending order and counts work statuses', () => {
    const result = attendanceDailyBreakdown(rows)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ day: 'Aug 6', present: 2, late: 1, remote: 0, absent: 0 })
    expect(result[1]).toEqual({ day: 'Aug 7', present: 0, late: 0, remote: 1, absent: 1 })
  })

  it('excludes on-leave from the work-status mix', () => {
    const [day] = attendanceDailyBreakdown([
      { attendance_date: '2026-08-06', status: 'on_leave' },
    ])
    expect(day.present + day.late + day.remote + day.absent).toBe(0)
  })

  it('handles empty input', () => {
    expect(attendanceDailyBreakdown([])).toEqual([])
  })
})

describe('sumByGroup', () => {
  it('sums values per group, sorted descending', () => {
    const rows = [
      { dept: 'Engineering', net: 100.255 },
      { dept: 'Sales', net: 300 },
      { dept: 'Engineering', net: 50 },
    ]
    const result = sumByGroup(rows, (r) => r.dept, (r) => r.net)
    expect(result).toEqual([
      { group: 'Sales', total: 300 },
      { group: 'Engineering', total: 150.26 },
    ])
  })

  it('handles empty input', () => {
    expect(sumByGroup([], () => 'x', () => 0)).toEqual([])
  })
})
