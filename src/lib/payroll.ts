import { format, parseISO } from 'date-fns'
import type { PayrollStatus } from '../types/db'

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: 'Draft',
  finalized: 'Finalized',
  paid: 'Paid',
}

export const PAYROLL_STATUS_TONES: Record<PayrollStatus, 'amber' | 'blue' | 'green'> = {
  draft: 'amber',
  finalized: 'blue',
  paid: 'green',
}

/** Demo model: Gross = Base + Allowances. */
export function grossPay(basePay: number, allowances: number): number {
  return round2(basePay + allowances)
}

/** Demo model: Net = Gross - Deductions. */
export function netPay(gross: number, deductions: number): number {
  return round2(gross - deductions)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Deductions may not exceed gross (net stays >= 0, mirroring the DB check).
 * Returns an error message or null when valid.
 */
export function validateEntryAmounts(
  basePay: number,
  allowances: number,
  deductions: number,
): string | null {
  if (allowances < 0 || deductions < 0) return 'Amounts cannot be negative'
  const gross = grossPay(basePay, allowances)
  if (deductions > gross) return 'Deductions cannot exceed gross pay'
  return null
}

/** "August 2026" from a period_month ISO date. */
export function formatPeriod(periodMonth: string | null | undefined): string {
  if (!periodMonth) return '—'
  try {
    return format(parseISO(periodMonth), 'MMMM yyyy')
  } catch {
    return '—'
  }
}

/** First day of a month from an <input type="month"> value ("2026-08"). */
export function monthInputToPeriod(value: string): string | null {
  if (!/^\d{4}-\d{2}$/.test(value)) return null
  return `${value}-01`
}

/**
 * True when the period is the current month or earlier. Summary cards and
 * the dashboard KPI ignore future-dated runs (e.g. pre-created drafts).
 */
export function isCurrentOrPastPeriod(periodMonth: string, today = new Date()): boolean {
  const current = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
  return periodMonth <= current
}
