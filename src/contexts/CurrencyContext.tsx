import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '../lib/supabase'
import {
  CURRENCY_CODES,
  DEFAULT_RATES,
  convertFromUsd,
  formatMoney,
  ratesFromRows,
  type CurrencyInfo,
} from '../lib/currency'
import type { CurrencyCode, ExchangeRate } from '../types/db'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'ge-hrms.display-currency'

interface CurrencyState {
  currency: CurrencyCode
  setCurrency: (code: CurrencyCode) => void
  rates: Record<CurrencyCode, CurrencyInfo>
  /** Formats a stored-USD amount in the selected display currency. */
  format: (amountUsd: number, options?: { compact?: boolean }) => string
  convert: (amountUsd: number) => number
}

const CurrencyContext = createContext<CurrencyState | null>(null)

export function useCurrency(): CurrencyState {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider')
  return ctx
}

function readStoredCurrency(): CurrencyCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null
    if (stored && CURRENCY_CODES.includes(stored)) return stored
  } catch {
    // localStorage unavailable — fall through to default
  }
  return 'USD'
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [currency, setCurrencyState] = useState<CurrencyCode>(readStoredCurrency)

  const { data: rateRows } = useQuery({
    queryKey: ['exchange-rates'],
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await getSupabase().from('exchange_rates').select('*')
      if (error) throw error
      return data as ExchangeRate[]
    },
  })

  const rates = useMemo(() => (rateRows ? ratesFromRows(rateRows) : DEFAULT_RATES), [rateRows])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currency)
    } catch {
      // ignore persistence failure
    }
  }, [currency])

  const value = useMemo<CurrencyState>(
    () => ({
      currency,
      setCurrency: setCurrencyState,
      rates,
      format: (amountUsd, options) => formatMoney(amountUsd, currency, rates, options),
      convert: (amountUsd) => convertFromUsd(amountUsd, currency, rates),
    }),
    [currency, rates],
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}
