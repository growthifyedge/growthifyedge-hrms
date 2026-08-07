import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/states'
import { useToast } from '../../contexts/ToastContext'
import { getSupabase } from '../../lib/supabase'
import type { ExchangeRate } from '../../types/db'

export function ExchangeRatesSettings() {
  const { toast } = useToast()
  const qc = useQueryClient()

  const rates = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('exchange_rates')
        .select('*')
        .order('currency_code')
      if (error) throw error
      return data as ExchangeRate[]
    },
  })

  const [draft, setDraft] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (rates.data) {
      setDraft(Object.fromEntries(rates.data.map((r) => [r.id, String(r.rate_from_usd)])))
    }
  }, [rates.data])

  const save = useMutation({
    mutationFn: async () => {
      const supabase = getSupabase()
      for (const rate of rates.data ?? []) {
        if (rate.currency_code === 'USD') continue // USD stays 1
        const value = Number(draft[rate.id])
        if (!Number.isFinite(value) || value <= 0) {
          throw new Error(`Rate for ${rate.currency_code} must be a positive number.`)
        }
        const { error } = await supabase
          .from('exchange_rates')
          .update({ rate_from_usd: value })
          .eq('id', rate.id)
        if (error) throw error
      }
    },
    onSuccess: async () => {
      toast('success', 'Exchange rates updated. Displayed values refresh immediately.')
      await qc.invalidateQueries({ queryKey: ['exchange-rates'] })
    },
    onError: (err) =>
      setFormError(err instanceof Error ? err.message : 'Could not save exchange rates.'),
  })

  if (rates.isPending) return <Skeleton className="h-64" />
  if (rates.isError) {
    return (
      <Card>
        <ErrorState onRetry={() => void rates.refetch()} />
      </Card>
    )
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    save.mutate()
  }

  return (
    <Card className="max-w-xl p-5">
      <h3 className="text-sm font-semibold text-slate-800">Exchange rates</h3>
      <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
        These are configurable <strong>demonstration rates</strong>, not live market rates. All
        salaries are stored in USD; rates only affect how values are displayed.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3" noValidate>
        {rates.data.map((rate) => (
          <div key={rate.id} className="flex items-center gap-3">
            <span className="w-16 text-sm font-semibold text-slate-700">{rate.currency_code}</span>
            <span className="w-10 text-sm text-slate-500">{rate.currency_symbol}</span>
            <div className="flex-1">
              <label className="sr-only" htmlFor={`rate-${rate.id}`}>
                Rate from USD to {rate.currency_code}
              </label>
              <input
                id={`rate-${rate.id}`}
                type="number"
                step="0.0001"
                min="0.0001"
                disabled={rate.currency_code === 'USD'}
                value={rate.currency_code === 'USD' ? '1' : (draft[rate.id] ?? '')}
                onChange={(e) => setDraft((d) => ({ ...d, [rate.id]: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
            <span className="w-24 text-right text-xs text-slate-400">1 USD → {rate.currency_code}</span>
          </div>
        ))}
        {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
        <div className="flex justify-end pt-1">
          <Button type="submit" loading={save.isPending}>Save rates</Button>
        </div>
      </form>
    </Card>
  )
}
