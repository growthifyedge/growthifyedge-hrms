import { describe, expect, it } from 'vitest'
import {
  EMPLOYEE_STATUS_LABELS,
  documentStatusFromExpiry,
  formatBytes,
  formatDate,
  fullName,
  initials,
} from './format'

describe('initials', () => {
  it('uses first and last name initials', () => {
    expect(initials('Amara Okafor')).toBe('AO')
  })

  it('handles single names', () => {
    expect(initials('Cher')).toBe('CH')
  })

  it('handles middle names by using first and last', () => {
    expect(initials('Ana Clara Souza')).toBe('AS')
  })

  it('handles empty input', () => {
    expect(initials('')).toBe('?')
  })
})

describe('fullName', () => {
  it('joins first and last name', () => {
    expect(fullName({ first_name: 'Priya', last_name: 'Sharma' })).toBe('Priya Sharma')
  })
})

describe('formatDate', () => {
  it('formats ISO dates', () => {
    expect(formatDate('2026-08-07')).toBe('Aug 7, 2026')
  })

  it('returns a dash for null', () => {
    expect(formatDate(null)).toBe('—')
  })
})

describe('formatBytes', () => {
  it('formats KB and MB', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB')
  })
})

describe('employee status labels', () => {
  it('covers all approved statuses', () => {
    expect(Object.keys(EMPLOYEE_STATUS_LABELS).sort()).toEqual(
      ['active', 'future_hire', 'inactive', 'notice_period', 'on_leave', 'probation'].sort(),
    )
  })
})

describe('documentStatusFromExpiry', () => {
  it('marks past expiry as Expired', () => {
    expect(documentStatusFromExpiry('2020-01-01', 'Valid')).toBe('Expired')
  })

  it('marks expiry within 30 days as Expiring Soon', () => {
    const soon = new Date()
    soon.setDate(soon.getDate() + 10)
    expect(documentStatusFromExpiry(soon.toISOString().slice(0, 10), 'Valid')).toBe('Expiring Soon')
  })

  it('keeps stored status when no expiry date', () => {
    expect(documentStatusFromExpiry(null, 'Pending Review')).toBe('Pending Review')
  })

  it('keeps Pending Review even with a distant expiry', () => {
    const far = new Date()
    far.setFullYear(far.getFullYear() + 2)
    expect(documentStatusFromExpiry(far.toISOString().slice(0, 10), 'Pending Review')).toBe('Pending Review')
  })
})
