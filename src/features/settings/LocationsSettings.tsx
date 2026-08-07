import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { RecordStatusBadge } from '../../components/ui/StatusBadge'
import { TableSkeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/states'
import { SelectField, TextField } from '../../components/ui/form'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { useWorkLocations } from '../../hooks/useLookups'
import { getSupabase } from '../../lib/supabase'
import type { RecordStatus, WorkLocation } from '../../types/db'

interface LocForm {
  name: string
  city: string
  country: string
  timezone: string
  status: RecordStatus
}

const EMPTY: LocForm = { name: '', city: '', country: '', timezone: '', status: 'active' }

export function LocationsSettings() {
  const locations = useWorkLocations(true)
  const { profile } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()

  const [editing, setEditing] = useState<WorkLocation | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<LocForm>(EMPTY)
  const [formError, setFormError] = useState<string | null>(null)

  function openAdd() {
    setEditing(null)
    setForm(EMPTY)
    setFormError(null)
    setOpen(true)
  }

  function openEdit(loc: WorkLocation) {
    setEditing(loc)
    setForm({
      name: loc.name,
      city: loc.city,
      country: loc.country,
      timezone: loc.timezone ?? '',
      status: loc.status,
    })
    setFormError(null)
    setOpen(true)
  }

  const save = useMutation({
    mutationFn: async () => {
      const supabase = getSupabase()
      const payload = {
        name: form.name.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        timezone: form.timezone.trim() || null,
        status: form.status,
      }
      const result = editing
        ? await supabase.from('work_locations').update(payload).eq('id', editing.id)
        : await supabase
            .from('work_locations')
            .insert({ ...payload, organization_id: profile!.organization_id })
      if (result.error) throw result.error
    },
    onSuccess: async () => {
      toast('success', editing ? 'Location updated.' : 'Location created.')
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ['work-locations'] })
    },
    onError: () => setFormError('Could not save the location. Please try again.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.city.trim() || !form.country.trim()) {
      setFormError('Name, city and country are required.')
      return
    }
    setFormError(null)
    save.mutate()
  }

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">Work locations</h3>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" aria-hidden /> Add location
        </Button>
      </div>
      {locations.isPending ? (
        <TableSkeleton />
      ) : locations.isError ? (
        <ErrorState onRetry={() => void locations.refetch()} />
      ) : locations.data.length === 0 ? (
        <EmptyState title="No locations yet" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-4 py-2.5 font-medium">Name</th>
                <th scope="col" className="px-4 py-2.5 font-medium">City</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Country</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Timezone</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-4 py-2.5 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {locations.data.map((loc) => (
                <tr key={loc.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{loc.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{loc.city}</td>
                  <td className="px-4 py-2.5 text-slate-600">{loc.country}</td>
                  <td className="px-4 py-2.5 text-slate-600">{loc.timezone ?? '—'}</td>
                  <td className="px-4 py-2.5"><RecordStatusBadge status={loc.status} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(loc)} aria-label={`Edit ${loc.name}`}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add location'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="loc-form" loading={save.isPending}>Save</Button>
          </div>
        }
      >
        <form id="loc-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <TextField label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Karachi HQ" />
          <TextField label="City" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <TextField label="Country" required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <TextField label="Timezone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="Asia/Karachi" />
          <SelectField label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as RecordStatus })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectField>
          {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
        </form>
      </Modal>
    </Card>
  )
}
