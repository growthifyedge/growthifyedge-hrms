import { useCurrency } from '../../contexts/CurrencyContext'

/** Renders a stored-USD amount in the globally selected display currency. */
export function MoneyDisplay({
  amountUsd,
  compact,
  className,
}: {
  amountUsd: number
  compact?: boolean
  className?: string
}) {
  const { format } = useCurrency()
  return <span className={className}>{format(amountUsd, { compact })}</span>
}
