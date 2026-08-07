import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/Modal'
import { FormSection, SelectField, TextField } from '../../components/ui/form'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrency } from '../../contexts/CurrencyContext'
import { useDepartments, useDesignations, useManagerOptions, useWorkLocations } from '../../hooks/useLookups'
import {
  duplicateFieldFromError,
  PartialSaveError,
  useCreateEmployee,
  useUpdateEmployee,
  type EmployeePayload,
} from '../../hooks/useEmployees'
import {
  employeeFormSchema,
  isFutureJoiningDate,
  type EmployeeFormInput,
  type EmployeeFormValues,
} from './employeeSchema'
import { EMPLOYEE_STATUS_LABELS, EMPLOYMENT_TYPE_LABELS, PAY_FREQUENCY_LABELS } from '../../lib/format'
import type { EmergencyContact, EmployeeCompensation, EmployeeWithRelations } from '../../types/db'

const DEFAULTS: EmployeeFormInput = {
  first_name: '',
  last_name: '',
  work_email: '',
  phone: '',
  country: '',
  city: '',
  avatar_url: '',
  employee_code: '',
  department_id: '',
  designation_id: '',
  manager_id: '',
  employment_type: 'full_time',
  work_location_id: '',
  joining_date: '',
  status: 'active',
  base_salary_usd: 0,
  pay_frequency: 'monthly',
  allowance_usd: 0,
  bonus_usd: 0,
  deduction_usd: 0,
  ec_name: '',
  ec_relationship: '',
  ec_phone: '',
}

interface EmployeeFormDrawerProps {
  open: boolean
  onClose: () => void
  /** When set, the drawer edits this employee; otherwise it creates a new one. */
  employee?: EmployeeWithRelations | null
  compensation?: EmployeeCompensation | null
  emergencyContact?: EmergencyContact | null
}

export function EmployeeFormDrawer({
  open,
  onClose,
  employee,
  compensation,
  emergencyContact,
}: EmployeeFormDrawerProps) {
  const isEdit = !!employee
  const { toast } = useToast()
  const { profile } = useAuth()
  const { currency, format } = useCurrency()
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const departments = useDepartments()
  const designations = useDesignations()
  const locations = useWorkLocations()
  const managers = useManagerOptions()

  const createMutation = useCreateEmployee()
  const updateMutation = useUpdateEmployee(employee?.id ?? '')
  const mutation = isEdit ? updateMutation : createMutation

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<EmployeeFormInput, unknown, EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    if (!open) return
    if (employee) {
      reset({
        first_name: employee.first_name,
        last_name: employee.last_name,
        work_email: employee.work_email,
        phone: employee.phone ?? '',
        country: employee.country ?? '',
        city: employee.city ?? '',
        avatar_url: employee.avatar_url ?? '',
        employee_code: employee.employee_code,
        department_id: employee.department_id ?? '',
        designation_id: employee.designation_id ?? '',
        manager_id: employee.manager_id ?? '',
        employment_type: employee.employment_type,
        work_location_id: employee.work_location_id ?? '',
        joining_date: employee.joining_date,
        status: employee.status,
        base_salary_usd: compensation?.base_salary_usd ?? 0,
        pay_frequency: compensation?.pay_frequency ?? 'monthly',
        allowance_usd: compensation?.allowance_usd ?? 0,
        bonus_usd: compensation?.bonus_usd ?? 0,
        deduction_usd: compensation?.deduction_usd ?? 0,
        ec_name: emergencyContact?.contact_name ?? '',
        ec_relationship: emergencyContact?.relationship ?? '',
        ec_phone: emergencyContact?.phone ?? '',
      })
    } else {
      reset(DEFAULTS)
    }
  }, [open, employee, compensation, emergencyContact, reset])

  const departmentId = watch('department_id')
  const joiningDate = watch('joining_date')
  const status = watch('status')
  const baseSalary = Number(watch('base_salary_usd') ?? 0)

  // Designations react to the selected department.
  const departmentDesignations = useMemo(
    () => (designations.data ?? []).filter((d) => !departmentId || d.department_id === departmentId),
    [designations.data, departmentId],
  )

  const futureJoin = isFutureJoiningDate(joiningDate)

  function requestClose() {
    if (isDirty) setConfirmDiscard(true)
    else onClose()
  }

  async function onSubmit(values: EmployeeFormValues) {
    if (!profile) return
    const payload: EmployeePayload = {
      employee: {
        organization_id: profile.organization_id,
        first_name: values.first_name,
        last_name: values.last_name,
        work_email: values.work_email.toLowerCase(),
        phone: values.phone || null,
        country: values.country || null,
        city: values.city || null,
        avatar_url: values.avatar_url || null,
        employee_code: values.employee_code.toUpperCase(),
        department_id: values.department_id,
        designation_id: values.designation_id,
        manager_id: values.manager_id || null,
        employment_type: values.employment_type,
        work_location_id: values.work_location_id,
        joining_date: values.joining_date,
        status: values.status,
        ...(isEdit ? {} : { created_by: profile.id }),
      },
      compensation: {
        base_salary_usd: values.base_salary_usd,
        allowance_usd: values.allowance_usd,
        bonus_usd: values.bonus_usd,
        deduction_usd: values.deduction_usd,
        pay_frequency: values.pay_frequency,
      },
      emergencyContact: values.ec_name
        ? {
            contact_name: values.ec_name,
            relationship: values.ec_relationship ?? '',
            phone: values.ec_phone ?? '',
          }
        : null,
    }

    try {
      await mutation.mutateAsync(payload)
      toast('success', isEdit ? 'Employee updated successfully.' : 'Employee added successfully.')
      onClose()
    } catch (err) {
      const dup = duplicateFieldFromError(err)
      if (dup === 'employee_code') {
        setError('employee_code', { message: 'This employee code is already in use.' })
      } else if (dup === 'work_email') {
        setError('work_email', { message: 'This work email is already in use.' })
      } else if (err instanceof PartialSaveError) {
        toast('error', err.message)
        onClose()
      } else {
        toast('error', 'Could not save the employee. Please try again.')
      }
    }
  }

  return (
    <>
      <Drawer
        open={open}
        onClose={requestClose}
        wide
        title={isEdit ? 'Edit Employee' : 'Add Employee'}
        subtitle={isEdit ? `${employee?.first_name} ${employee?.last_name} · ${employee?.employee_code}` : 'Create a new employee record'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={requestClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="employee-form"
              loading={mutation.isPending}
            >
              {isEdit ? 'Save changes' : 'Add employee'}
            </Button>
          </div>
        }
      >
        <form id="employee-form" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
          <FormSection title="Personal Information">
            <TextField label="First name" required error={errors.first_name?.message} {...register('first_name')} />
            <TextField label="Last name" required error={errors.last_name?.message} {...register('last_name')} />
            <TextField label="Work email" type="email" required error={errors.work_email?.message} {...register('work_email')} />
            <TextField label="Phone" error={errors.phone?.message} {...register('phone')} />
            <TextField label="Country" error={errors.country?.message} {...register('country')} />
            <TextField label="City" error={errors.city?.message} {...register('city')} />
            <TextField
              label="Avatar URL"
              hint="Optional — initials are shown when empty"
              error={errors.avatar_url?.message}
              {...register('avatar_url')}
            />
          </FormSection>

          <FormSection title="Employment Information">
            <TextField
              label="Employee code"
              required
              placeholder="GE-1042"
              error={errors.employee_code?.message}
              {...register('employee_code')}
            />
            <SelectField label="Department" required error={errors.department_id?.message} {...register('department_id')}>
              <option value="">Select department…</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </SelectField>
            <SelectField label="Designation" required error={errors.designation_id?.message} {...register('designation_id')}>
              <option value="">Select designation…</option>
              {departmentDesignations.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </SelectField>
            <SelectField
              label="Manager"
              hint="Leave blank for senior leadership"
              error={errors.manager_id?.message}
              {...register('manager_id')}
            >
              <option value="">No manager</option>
              {(managers.data ?? [])
                .filter((m) => m.id !== employee?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.last_name} ({m.employee_code})
                  </option>
                ))}
            </SelectField>
            <SelectField label="Employment type" required error={errors.employment_type?.message} {...register('employment_type')}>
              {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </SelectField>
            <SelectField label="Work location" required error={errors.work_location_id?.message} {...register('work_location_id')}>
              <option value="">Select location…</option>
              {(locations.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.name} — {l.city}</option>
              ))}
            </SelectField>
            <TextField label="Joining date" type="date" required error={errors.joining_date?.message} {...register('joining_date')} />
            <SelectField label="Employment status" required error={errors.status?.message} {...register('status')}>
              {Object.entries(EMPLOYEE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </SelectField>
            {futureJoin && status !== 'future_hire' && (
              <div className="sm:col-span-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                The joining date is in the future.{' '}
                <button
                  type="button"
                  className="font-medium underline underline-offset-2"
                  onClick={() => setValue('status', 'future_hire', { shouldDirty: true })}
                >
                  Set status to Future Hire
                </button>
              </div>
            )}
          </FormSection>

          <FormSection title="Compensation (stored in USD)">
            <TextField
              label="Base salary (USD)"
              type="number"
              min={0}
              step="0.01"
              required
              hint={currency !== 'USD' && baseSalary > 0 ? `≈ ${format(Number(baseSalary) || 0)}` : undefined}
              error={errors.base_salary_usd?.message}
              {...register('base_salary_usd')}
            />
            <SelectField label="Pay frequency" required error={errors.pay_frequency?.message} {...register('pay_frequency')}>
              {Object.entries(PAY_FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </SelectField>
            <TextField label="Allowance (USD)" type="number" min={0} step="0.01" error={errors.allowance_usd?.message} {...register('allowance_usd')} />
            <TextField label="Bonus (USD)" type="number" min={0} step="0.01" error={errors.bonus_usd?.message} {...register('bonus_usd')} />
            <TextField label="Deduction (USD)" type="number" min={0} step="0.01" error={errors.deduction_usd?.message} {...register('deduction_usd')} />
          </FormSection>

          <FormSection title="Emergency Contact (optional)">
            <TextField label="Contact name" error={errors.ec_name?.message} {...register('ec_name')} />
            <TextField label="Relationship" error={errors.ec_relationship?.message} {...register('ec_relationship')} />
            <TextField label="Phone" error={errors.ec_phone?.message} {...register('ec_phone')} />
          </FormSection>
        </form>
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false)
          onClose()
        }}
        title="Discard unsaved changes?"
        message="You have unsaved changes in this form. Closing now will discard them."
        confirmLabel="Discard changes"
        danger
      />
    </>
  )
}
