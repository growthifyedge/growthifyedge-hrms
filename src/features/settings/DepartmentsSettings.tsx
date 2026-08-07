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
import { useDepartments, useManagerOptions } from '../../hooks/useLookups'
import { getSupabase } from '../../lib/supabase'
import { isUniqueViolation } from '../../lib/utils'
import type { Department, RecordStatus } from '../../types/db'

interface DeptForm {
  name: string
  code: string
  head_employee_id: string
  description: string
  status: RecordStatus
}

const EMPTY: DeptForm = { name: '', code: '', head_employee_id: '', description: '', status: 'active' }

export function DepartmentsSettings() {
  const departments = useDepartments(true)
  const managers = useManagerOptions()
  const { profile } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()

  const [editing, setEditing] = useState<Department | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<DeptForm>(EMPTY)
  const [formError, setFormError] = useState<string | null>(null)

  function openAdd() {
    setEditing(null)
    setForm(EMPTY)
    setFormError(null)
    setOpen(true)
  }

  function openEdit(dept: Department) {
    setEditing(dept)
    setForm({
      name: dept.name,
      code: dept.code,
      head_employee_id: dept.head_employee_id ?? '',
      description: dept.description ?? '',
      status: dept.status,
    })
    setFormError(null)
    setOpen(true)
  }

  const save = useMutation({
    mutationFn: async () => {
      const supabase = getSupabase()
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        head_employee_id: form.head_employee_id || null,
        description: form.description.trim() || null,
        status: form.status,
      }
      const result = editing
        ? await supabase.from('departments').update(payload).eq('id', editing.id)
        : await supabase
            .from('departments')
            .insert({ ...payload, organization_id: profile!.organization_id })
      if (result.error) throw result.error
    },
    onSuccess: async () => {
      toast('success', editing ? 'Department updated.' : 'Department created.')
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ['departments'] })
    },
    onError: (err) => {
      if (isUniqueViolation(err)) {
        setFormError('A department with this name or code already exists.')
      } else {
        setFormError('Could not save the department. Please try again.')
      }
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.code.trim()) {
      setFormError('Name and code are required.')
      return
    }
    setFormError(null)
    save.mutate()
  }

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">Departments</h3>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" aria-hidden /> Add department
        </Button>
      </div>
      {departments.isPending ? (
        <TableSkeleton />
      ) : departments.isError ? (
        <ErrorState onRetry={() => void departments.refetch()} />
      ) : departments.data.length === 0 ? (
        <EmptyState title="No departments yet" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-4 py-2.5 font-medium">Name</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Code</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Description</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-4 py-2.5 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {departments.data.map((dept) => (
                <tr key={dept.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{dept.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{dept.code}</td>
                  <td className="max-w-[280px] truncate px-4 py-2.5 text-slate-500">{dept.description ?? '—'}</td>
                  <td className="px-4 py-2.5"><RecordStatusBadge status={dept.status} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(dept)} aria-label={`Edit ${dept.name}`}>
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
        title={editing ? `Edit ${editing.name}` : 'Add department'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="dept-form" loading={save.isPending}>Save</Button>
          </div>
        }
      >
        <form id="dept-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <TextField label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="ENG" />
          <SelectField
            label="Department head"
            value={form.head_employee_id}
            onChange={(e) => setForm({ ...form, head_employee_id: e.target.value })}
          >
            <option value="">No head assigned</option>
            {(managers.data ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
            ))}
          </SelectField>
          <TextAreaField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <SelectField label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as RecordStatus })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectField>
          {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
          <p className="text-xs text-slate-500">
            Departments in use cannot be deleted — set them to inactive instead.
          </p>
        </form>
      </Modal>
    </Card>
  )
}
