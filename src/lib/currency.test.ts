import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RATES,
  convertFromUsd,
  estimatedNetUsd,
  formatMoney,
  ratesFromRows,
  toMonthlyUsd,
} from './currency'
import type { ExchangeRate } from '../types/db'

describe('convertFromUsd', () => {
  it('returns the same amount for USD', () => {
    expect(convertFromUsd(1000, 'USD')).toBe(1000)
  })

  it('converts to PKR with the demo rate', () => {
    expect(convertFromUsd(100, 'PKR')).toBe(28000)
  })

  it('converts to GBP and EUR with the demo rates', () => {
    expect(convertFromUsd(100, 'GBP')).toBeCloseTo(78)
    expect(convertFromUsd(100, 'EUR')).toBeCloseTo(92)
  })

  it('never mutates the stored USD amount (pure conversion)', () => {
    const stored = 5000
    convertFromUsd(stored, 'PKR')
    expect(stored).toBe(5000)
  })
})

describe('formatMoney', () => {
  it('formats USD with symbol and two decimals', () => {
    expect(formatMoney(1234.5, 'USD')).toBe('$1,234.50')
  })

  it('formats PKR with Rs. prefix and zero decimals', () => {
    expect(formatMoney(100, 'PKR')).toBe('Rs. 28,000')
  })

  it('formats GBP and EUR symbols', () => {
    expect(formatMoney(100, 'GBP')).toBe('£78.00')
    expect(formatMoney(100, 'EUR')).toBe('€92.00')
  })

  it('supports compact notation', () => {
    expect(formatMoney(1_500_000, 'USD', DEFAULT_RATES, { compact: true })).toBe('$1.5M')
  })
})

describe('ratesFromRows', () => {
  const row = (code: ExchangeRate['currency_code'], rate: number): ExchangeRate => ({
    id: `id-${code}`,
    organization_id: 'org',
    currency_code: code,
    currency_symbol: code === 'PKR' ? 'Rs.' : '$',
    rate_from_usd: rate,
    decimal_precision: 2,
    updated_at: '',
  })

  it('merges database rows over defaults', () => {
    const rates = ratesFromRows([row('PKR', 300)])
    expect(rates.PKR.rateFromUsd).toBe(300)
    expect(rates.GBP.rateFromUsd).toBe(DEFAULT_RATES.GBP.rateFromUsd)
  })

  it('forces USD rate to 1 even with a bad row', () => {
    const rates = ratesFromRows([row('USD', 2)])
    expect(rates.USD.rateFromUsd).toBe(1)
  })

  it('ignores non-positive rates', () => {
    const rates = ratesFromRows([row('PKR', 0)])
    expect(rates.PKR.rateFromUsd).toBe(DEFAULT_RATES.PKR.rateFromUsd)
  })

  it('falls back entirely to defaults when rows are undefined', () => {
    expect(ratesFromRows(undefined)).toEqual(DEFAULT_RATES)
  })
})

describe('toMonthlyUsd', () => {
  it('keeps monthly amounts unchanged', () => {
    expect(toMonthlyUsd(3000, 'monthly')).toBe(3000)
  })

  it('normalizes biweekly to monthly (26 periods / 12 months)', () => {
    expect(toMonthlyUsd(1200, 'biweekly')).toBeCloseTo(2600)
  })

  it('normalizes weekly to monthly (52 weeks / 12 months)', () => {
    expect(toMonthlyUsd(600, 'weekly')).toBeCloseTo(2600)
  })
})

describe('estimatedNetUsd', () => {
  it('adds base, allowance, bonus and subtracts deduction', () => {
    expect(
      estimatedNetUsd({ base_salary_usd: 4000, allowance_usd: 300, bonus_usd: 200, deduction_usd: 150 }),
    ).toBe(4350)
  })
})
