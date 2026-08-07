import { useCurrency } from '../../contexts/CurrencyContext'
import { CURRENCY_CODES } from '../../lib/currency'
import type { CurrencyCode } from '../../types/db'

/** Global display-currency selector. Changes affect display only; stored values stay USD. */
export function CurrencySelector({ compact = false }: { compact?: boolean }) {
  const { currency, setCurrency, rates } = useCurrency()
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="sr-only">Display currency</span>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
        aria-label="Display currency"
        className="rounded-lg border border-slate-300 bg-white py-1.5 pl-2 pr-7 text-sm font-medium text-slate-700 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100"
      >
        {CURRENCY_CODES.map((code) => (
          <option key={code} value={code}>
            {compact ? code : `${code} ${rates[code].symbol}`}
          </option>
        ))}
      </select>
    </label>
  )
}
