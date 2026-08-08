import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { FormSection, SelectField, TextField } from '../../components/ui/form'
import { useToast } from '../../contexts/ToastContext'
import { useDepartments, useDesignations, useManagerOptions, useWorkLocations } from '../../hooks/useLookups'
import { useHireCandidate } from '../../hooks/useRecruitment'
import { toEmployeeEmploymentType } from '../../lib/recruitment'
import { EMPLOYMENT_TYPE_LABELS } from '../../lib/format'
import { isUniqueViolation, getErrorMessage } from '../../lib/utils'
import { hireFormSchema, type HireFormValues } from './schemas'
import type { CandidateWithRelations } from '../../types/db'

interface HireDrawerProps {
  candidate: CandidateWithRelations | null
  onClose: () => void
}

/**
 * Converts a candidate into an employee through the transactional
 * hire_candidate RPC (employee + compensation + onboarding in one step).
 */
export function HireDrawer({ candidate, onClose }: HireDrawerProps) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const departments = useDepartments()
  const designations = useDesignations()
  const locations = useWorkLocations()
  const managers = useManagerOptions()
  const hire = useHireCandidate()

  const defaults = useMemo<HireFormValues>(
    () => ({
      employee_code: '',
      manager_id: candidate?.job?.hiring_manager_id ?? '',
      joining_date: '',
      employment_type: toEmployeeEmploymentType(candidate?.job?.employment_type ?? 'full_time'),
    }),
    [candidate],
  )

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<HireFormValues>({
    resolver: zodResolver(hireFormSchema),
    defaultValues: defaults,
  })

  useEffect(() => {
    if (candidate) reset(defaults)
  }, [candidate, defaults, reset])

  if (!candidate) return null

  const departmentName =
    (departments.data ?? []).find((d) => d.id === candidate.job?.department_id)?.name ?? '—'
  const designationTitle =
    (designations.data ?? []).find((d) => d.id === candidate.job?.designation_id)?.title ?? '—'
  const locationName =
    (locations.data ?? []).find((l) => l.id === candidate.job?.location_id)?.name ?? '—'

  async function onSubmit(values: HireFormValues) {
    if (!candidate) return
    try {
      const result = await hire.mutateAsync({
        candidateId: candidate.id,
        employeeCode: values.employee_code.toUpperCase(),
        joiningDate: values.joining_date,
        employmentType: values.employment_type,
        managerId: values.manager_id || null,
      })
      toast('success', `${candidate.full_name} hired — onboarding started.`)
      onClose()
      navigate(`/people/${result.employee_id}`)
    } catch (err) {
      if (isUniqueViolation(err)) {
        const message = getErrorMessage(err)
        if (message.includes('work_email')) {
          toast('error', 'An employee with this email already exists.')
        } else {
          setError('employee_code', { message: 'This employee code is already in use.' })
        }
      } else if (/already been hired/i.test(getErrorMessage(err))) {
        toast('error', 'This candidate has already been hired.')
        onClose()
      } else {
        toast('error', 'Could not complete the hire. Please try again.')
      }
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Hire Candidate"
      subtitle={`${candidate.full_name} → new employee`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="hire-form" loading={hire.isPending}>
            Hire & start onboarding
          </Button>
        </div>
      }
    >
      <div className="mb-5 rounded-xl bg-slate-50 px-4 py-3 text-sm">
        <p className="font-medium text-slate-800">{candidate.full_name}</p>
        <p className="text-slate-500">{candidate.email}</p>
        <p className="mt-1.5 text-xs text-slate-500">
          {candidate.job?.title ?? '—'} · {departmentName} · {designationTitle} · {locationName}
        </p>
        <p className="mt-1.5 text-xs text-slate-400">
          Department, designation and location come from the job opening. Creates the employee,
          links this candidate and starts the six onboarding tasks in one step.
        </p>
      </div>

      <form id="hire-form" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        <FormSection title="Employment details">
          <TextField
            label="Employee code"
            required
            placeholder="GE-1042"
            error={errors.employee_code?.message}
            {...register('employee_code')}
          />
          <SelectField label="Manager" required error={errors.manager_id?.message} {...register('manager_id')}>
            <option value="">Select manager…</option>
            {(managers.data ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.first_name} {m.last_name} ({m.employee_code})
              </option>
            ))}
          </SelectField>
          <TextField
            label="Joining date"
            type="date"
            required
            hint="Future dates create a Future Hire"
            error={errors.joining_date?.message}
            {...register('joining_date')}
          />
          <SelectField
            label="Employment type"
            required
            error={errors.employment_type?.message}
            {...register('employment_type')}
          >
            {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectField>
        </FormSection>
      </form>
    </Drawer>
  )
}
