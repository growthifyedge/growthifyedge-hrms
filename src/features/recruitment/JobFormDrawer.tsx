import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { FormSection, SelectField, TextAreaField, TextField } from '../../components/ui/form'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { useDepartments, useDesignations, useManagerOptions, useWorkLocations } from '../../hooks/useLookups'
import { useSaveJob } from '../../hooks/useRecruitment'
import { JOB_EMPLOYMENT_TYPE_LABELS, JOB_STATUS_LABELS } from '../../lib/recruitment'
import { jobFormSchema, type JobFormInput, type JobFormValues } from './schemas'
import type { JobOpeningWithRelations } from '../../types/db'

interface JobFormDrawerProps {
  open: boolean
  onClose: () => void
  /** When set, the drawer edits this job; otherwise it creates a new one. */
  job?: JobOpeningWithRelations | null
}

export function JobFormDrawer({ open, onClose, job }: JobFormDrawerProps) {
  const isEdit = !!job
  const { toast } = useToast()
  const { profile } = useAuth()
  const departments = useDepartments()
  const designations = useDesignations()
  const locations = useWorkLocations()
  const managers = useManagerOptions()
  const save = useSaveJob(job?.id)

  const defaults: JobFormInput = useMemo(
    () => ({
      title: job?.title ?? '',
      department_id: job?.department_id ?? '',
      designation_id: job?.designation_id ?? '',
      location_id: job?.location_id ?? '',
      hiring_manager_id: job?.hiring_manager_id ?? '',
      employment_type: job?.employment_type ?? 'full_time',
      openings_count: job?.openings_count ?? 1,
      description: job?.description ?? '',
      status: job?.status ?? 'open',
    }),
    [job],
  )

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<JobFormInput, unknown, JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: defaults,
  })

  useEffect(() => {
    if (open) reset(defaults)
  }, [open, defaults, reset])

  const departmentId = watch('department_id')
  const departmentDesignations = useMemo(
    () => (designations.data ?? []).filter((d) => !departmentId || d.department_id === departmentId),
    [designations.data, departmentId],
  )

  async function onSubmit(values: JobFormValues) {
    if (!profile) return
    try {
      await save.mutateAsync({
        organization_id: profile.organization_id,
        title: values.title,
        department_id: values.department_id,
        designation_id: values.designation_id || null,
        location_id: values.location_id,
        hiring_manager_id: values.hiring_manager_id,
        employment_type: values.employment_type,
        openings_count: values.openings_count,
        description: values.description || null,
        status: values.status,
        ...(isEdit ? {} : { created_by: profile.id }),
      })
      toast('success', isEdit ? 'Job updated.' : 'Job opening created.')
      onClose()
    } catch {
      toast('error', 'Could not save the job opening. Please try again.')
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Job Opening' : 'New Job Opening'}
      subtitle={isEdit ? job?.title : 'Internal opening — no public posting'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="job-form" loading={save.isPending}>
            {isEdit ? 'Save changes' : 'Create job'}
          </Button>
        </div>
      }
    >
      <form id="job-form" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        <FormSection title="Role">
          <div className="sm:col-span-2">
            <TextField label="Job title" required error={errors.title?.message} {...register('title')} />
          </div>
          <SelectField label="Department" required error={errors.department_id?.message} {...register('department_id')}>
            <option value="">Select department…</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </SelectField>
          <SelectField
            label="Designation"
            hint="Optional — used when converting a hire"
            error={errors.designation_id?.message}
            {...register('designation_id')}
          >
            <option value="">No specific designation</option>
            {departmentDesignations.map((d) => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </SelectField>
          <SelectField label="Location" required error={errors.location_id?.message} {...register('location_id')}>
            <option value="">Select location…</option>
            {(locations.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.name} — {l.city}</option>
            ))}
          </SelectField>
          <SelectField
            label="Hiring manager"
            required
            error={errors.hiring_manager_id?.message}
            {...register('hiring_manager_id')}
          >
            <option value="">Select hiring manager…</option>
            {(managers.data ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.first_name} {m.last_name} ({m.employee_code})
              </option>
            ))}
          </SelectField>
        </FormSection>

        <FormSection title="Opening">
          <SelectField label="Employment type" required error={errors.employment_type?.message} {...register('employment_type')}>
            {Object.entries(JOB_EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectField>
          <TextField
            label="Number of openings"
            type="number"
            min={1}
            required
            error={errors.openings_count?.message}
            {...register('openings_count')}
          />
          <SelectField label="Status" required error={errors.status?.message} {...register('status')}>
            {Object.entries(JOB_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectField>
          <div className="sm:col-span-2">
            <TextAreaField
              label="Short description"
              rows={3}
              placeholder="One or two sentences about the role…"
              error={errors.description?.message}
              {...register('description')}
            />
          </div>
        </FormSection>
      </form>
    </Drawer>
  )
}
