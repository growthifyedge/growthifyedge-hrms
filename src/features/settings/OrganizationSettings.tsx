import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SelectField, TextField } from '../../components/ui/form'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/states'
import { useToast } from '../../contexts/ToastContext'
import { useOrganization } from '../../hooks/useLookups'
import { getSupabase } from '../../lib/supabase'
import { CURRENCY_CODES } from '../../lib/currency'
import type { CurrencyCode } from '../../types/db'

export function OrganizationSettings() {
  const org = useOrganization()
  const { toast } = useToast()
  const qc = useQueryClient()

  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>('USD')

  useEffect(() => {
    if (org.data) {
      setName(org.data.name)
      setLogoUrl(org.data.logo_url ?? '')
      setDefaultCurrency(org.data.default_currency)
    }
  }, [org.data])

  const save = useMutation({
    mutationFn: async () => {
      if (!org.data) return
      const { error } = await getSupabase()
        .from('organizations')
        .update({ name: name.trim(), logo_url: logoUrl.trim() || null, default_currency: defaultCurrency })
        .eq('id', org.data.id)
      if (error) throw error
    },
    onSuccess: async () => {
      toast('success', 'Organization settings saved.')
      await qc.invalidateQueries({ queryKey: ['organization'] })
    },
    onError: () => toast('error', 'Could not save organization settings.'),
  })

  if (org.isPending) return <Skeleton className="h-64" />
  if (org.isError || !org.data) {
    return (
      <Card>
        <ErrorState onRetry={() => void org.refetch()} />
      </Card>
    )
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast('error', 'Organization name is required.')
      return
    }
    save.mutate()
  }

  return (
    <Card className="max-w-xl p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-800">Organization profile</h3>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <TextField label="Organization name" required value={name} onChange={(e) => setName(e.target.value)} />
        <TextField
          label="Logo URL"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          hint="Optional — a text wordmark is used when empty"
        />
        <SelectField
          label="Default currency"
          value={defaultCurrency}
          onChange={(e) => setDefaultCurrency(e.target.value as CurrencyCode)}
        >
          {CURRENCY_CODES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </SelectField>
        <div className="flex justify-end">
          <Button type="submit" loading={save.isPending}>Save changes</Button>
        </div>
      </form>
    </Card>
  )
}
