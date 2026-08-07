import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { RecordStatusBadge } from '../../components/ui/StatusBadge'
import { TableSkeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/states'
import { SelectField, TextAreaField, TextField } from '../../components/ui/form'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { useDepartments, useDesignations } from '../../hooks/useLookups'
import { getSupabase } from '../../lib/supabase'
import { isUniqueViolation } from '../../lib/utils'
import type { Designation, RecordStatus } from '../../types/db'

interface DesigForm {
  title: string
  department_id: string
  level: string
  description: string
  status: RecordStatus
}

const EMPTY: DesigForm = { title: '', department_id: '', level: '', description: '', status: 'active' }

export function DesignationsSettings() {
  const designations = useDesignations(true)
  const departments = useDepartments()
  const { profile } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()

  const [editing, setEditing] = useState<Designation | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<DesigForm>(EMPTY)
  const [formError, setFormError] = useState<string | null>(null)

  const deptName = (id: string) => departments.data?.find((d) => d.id === id)?.name ?? '—'

  function openAdd() {
    setEditing(null)
    setForm(EMPTY)
    setFormError(null)
    setOpen(true)
  }

  function openEdit(desig: Designation) {
    setEditing(desig)
    setForm({
      title: desig.title,
      department_id: desig.department_id,
      level: desig.level ?? '',
      description: desig.description ?? '',
      status: desig.status,
    })
    setFormError(null)
    setOpen(true)
  }

  const save = useMutation({
    mutationFn: async () => {
      const supabase = getSupabase()
      const payload = {
        title: form.title.trim(),
        department_id: form.department_id,
        level: form.level.trim() || null,
        description: form.description.trim() || null,
        status: form.status,
      }
      const result = editing
        ? await supabase.from('designations').update(payload).eq('id', editing.id)
        : await supabase
            .from('designations')
            .insert({ ...payload, organization_id: profile!.organization_id })
      if (result.error) throw result.error
    },
    onSuccess: async () => {
      toast('success', editing ? 'Designation updated.' : 'Designation created.')
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ['designations'] })
    },
    onError: (err) => {
      setFormError(
        isUniqueViolation(err)
          ? 'This designation already exists in the selected department.'
          : 'Could not save the designation. Please try again.',
      )
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.department_id) {
      setFormError('Title and department are required.')
      return
    }
    setFormError(null)
    save.mutate()
  }

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">Designations</h3>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" aria-hidden /> Add designation
        </Button>
      </div>
      {designations.isPending ? (
        <TableSkeleton />
      ) : designations.isError ? (
        <ErrorState onRetry={() => void designations.refetch()} />
      ) : designations.data.length === 0 ? (
        <EmptyState title="No designations yet" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-4 py-2.5 font-medium">Title</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Department</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Level</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-4 py-2.5 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {designations.data.map((desig) => (
                <tr key={desig.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{desig.title}</td>
                  <td className="px-4 py-2.5 text-slate-600">{deptName(desig.department_id)}</td>
                  <td className="px-4 py-2.5 text-slate-600">{desig.level ?? '—'}</td>
                  <td className="px-4 py-2.5"><RecordStatusBadge status={desig.status} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(desig)} aria-label={`Edit ${desig.title}`}>
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
        title={editing ? `Edit ${editing.title}` : 'Add designation'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="desig-form" loading={save.isPending}>Save</Button>
          </div>
        }
      >
        <form id="desig-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <TextField label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <SelectField
            label="Department"
            required
            value={form.department_id}
            onChange={(e) => setForm({ ...form, department_id: e.target.value })}
          >
            <option value="">Select department…</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </SelectField>
          <TextField label="Level" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="Senior / L3 / Lead…" />
          <TextAreaField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <SelectField label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as RecordStatus })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectField>
          {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
          <p className="text-xs text-slate-500">Assigned designations cannot be deleted — set them to inactive instead.</p>
        </form>
      </Modal>
    </Card>
  )
}
