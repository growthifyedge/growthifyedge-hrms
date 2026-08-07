import type { CurrencyCode, ExchangeRate, PayFrequency } from '../types/db'

export interface CurrencyInfo {
  code: CurrencyCode
  symbol: string
  rateFromUsd: number
  decimalPrecision: number
}

/** Safe demo defaults used while exchange-rate data is loading. */
export const DEFAULT_RATES: Record<CurrencyCode, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', rateFromUsd: 1, decimalPrecision: 2 },
  PKR: { code: 'PKR', symbol: 'Rs.', rateFromUsd: 280, decimalPrecision: 0 },
  GBP: { code: 'GBP', symbol: '£', rateFromUsd: 0.78, decimalPrecision: 2 },
  EUR: { code: 'EUR', symbol: '€', rateFromUsd: 0.92, decimalPrecision: 2 },
}

export const CURRENCY_CODES: CurrencyCode[] = ['USD', 'PKR', 'GBP', 'EUR']

export function ratesFromRows(rows: ExchangeRate[] | undefined): Record<CurrencyCode, CurrencyInfo> {
  const merged = { ...DEFAULT_RATES }
  for (const row of rows ?? []) {
    if (CURRENCY_CODES.includes(row.currency_code) && row.rate_from_usd > 0) {
      merged[row.currency_code] = {
        code: row.currency_code,
        symbol: row.currency_symbol,
        rateFromUsd: row.rate_from_usd,
        decimalPrecision: row.decimal_precision,
      }
    }
  }
  // USD is the base currency and must always be 1.
  merged.USD = { ...merged.USD, rateFromUsd: 1 }
  return merged
}

/** Converts a stored USD amount to the given display currency. */
export function convertFromUsd(
  amountUsd: number,
  currency: CurrencyCode,
  rates: Record<CurrencyCode, CurrencyInfo> = DEFAULT_RATES,
): number {
  const info = rates[currency] ?? DEFAULT_RATES.USD
  return amountUsd * info.rateFromUsd
}

/** Formats a USD amount in the selected display currency, e.g. "Rs. 1,420,000". */
export function formatMoney(
  amountUsd: number,
  currency: CurrencyCode,
  rates: Record<CurrencyCode, CurrencyInfo> = DEFAULT_RATES,
  options?: { compact?: boolean },
): string {
  const info = rates[currency] ?? DEFAULT_RATES.USD
  const value = convertFromUsd(amountUsd, currency, rates)
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: options?.compact ? 0 : info.decimalPrecision,
    maximumFractionDigits: options?.compact ? 1 : info.decimalPrecision,
    notation: options?.compact ? 'compact' : 'standard',
  })
  return `${info.symbol}${info.symbol.endsWith('.') ? ' ' : ''}${formatter.format(value)}`
}

/** Normalizes a per-period amount to a monthly amount for payroll estimates. */
export function toMonthlyUsd(amountUsd: number, frequency: PayFrequency): number {
  switch (frequency) {
    case 'monthly':
      return amountUsd
    case 'biweekly':
      return (amountUsd * 26) / 12
    case 'weekly':
      return (amountUsd * 52) / 12
  }
}

/** Net = base + allowance + bonus - deduction (per pay period, in USD). */
export function estimatedNetUsd(comp: {
  base_salary_usd: number
  allowance_usd: number
  bonus_usd: number
  deduction_usd: number
}): number {
  return comp.base_salary_usd + comp.allowance_usd + comp.bonus_usd - comp.deduction_usd
}
