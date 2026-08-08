import { describe, expect, it } from 'vitest'
import {
  PAYROLL_STATUS_LABELS,
  formatPeriod,
  grossPay,
  monthInputToPeriod,
  netPay,
  validateEntryAmounts,
} from './payroll'
import { toMonthlyUsd } from './currency'

describe('payroll calculations', () => {
  it('gross = base + allowances', () => {
    expect(grossPay(5000, 450)).toBe(5450)
    expect(grossPay(5000, 0)).toBe(5000)
    expect(grossPay(1234.56, 100.4)).toBe(1334.96)
  })

  it('net = gross - deductions', () => {
    expect(netPay(5450, 250)).toBe(5200)
    expect(netPay(5450, 0)).toBe(5450)
    expect(netPay(1334.96, 34.96)).toBe(1300)
  })
})

describe('monthly salary derivation (project convention)', () => {
  it('normalizes each pay frequency to monthly', () => {
    expect(toMonthlyUsd(6000, 'monthly')).toBe(6000)
    expect(toMonthlyUsd(3000, 'biweekly')).toBe(6500) // 3000 * 26 / 12
    expect(toMonthlyUsd(1500, 'weekly')).toBe(6500) // 1500 * 52 / 12
  })
})

describe('validateEntryAmounts', () => {
  it('accepts valid amounts', () => {
    expect(validateEntryAmounts(5000, 400, 300)).toBeNull()
    expect(validateEntryAmounts(5000, 0, 0)).toBeNull()
  })

  it('rejects negatives', () => {
    expect(validateEntryAmounts(5000, -1, 0)).toMatch(/negative/i)
    expect(validateEntryAmounts(5000, 0, -1)).toMatch(/negative/i)
  })

  it('rejects deductions exceeding gross (net must stay >= 0)', () => {
    expect(validateEntryAmounts(5000, 100, 5101)).toMatch(/exceed/i)
    expect(validateEntryAmounts(5000, 100, 5100)).toBeNull() // net exactly 0
  })
})

describe('status + period helpers', () => {
  it('labels every payroll status', () => {
    expect(PAYROLL_STATUS_LABELS.draft).toBe('Draft')
    expect(PAYROLL_STATUS_LABELS.finalized).toBe('Finalized')
    expect(PAYROLL_STATUS_LABELS.paid).toBe('Paid')
  })

  it('formats the payroll period', () => {
    expect(formatPeriod('2026-08-01')).toBe('August 2026')
    expect(formatPeriod(null)).toBe('—')
  })

  it('converts month-input values to first-of-month dates', () => {
    expect(monthInputToPeriod('2026-08')).toBe('2026-08-01')
    expect(monthInputToPeriod('not-a-month')).toBeNull()
    expect(monthInputToPeriod('')).toBeNull()
  })
})
