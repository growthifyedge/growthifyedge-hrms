import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { FormSection, SelectField, TextAreaField, TextField } from '../../components/ui/form'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { useManagerOptions } from '../../hooks/useLookups'
import { useSaveGoal } from '../../hooks/usePerformance'
import { GOAL_CATEGORY_LABELS, GOAL_STATUS_LABELS } from '../../lib/performance'
import { goalFormSchema, type GoalFormInput, type GoalFormValues } from './schemas'
import type { PerformanceGoalWithRelations } from '../../types/db'

interface GoalFormDrawerProps {
  open: boolean
  onClose: () => void
  /** When set, the drawer edits this goal; otherwise it creates a new one. */
  goal?: PerformanceGoalWithRelations | null
}

/** One reusable Create/Edit Goal drawer for HR admin and managers. */
export function GoalFormDrawer({ open, onClose, goal }: GoalFormDrawerProps) {
  const isEdit = !!goal
  const { toast } = useToast()
  const { profile, employee } = useAuth()
  const isAdmin = profile?.role === 'hr_admin'
  const employees = useManagerOptions()
  const save = useSaveGoal(goal?.id)

  // Managers may only pick their direct reports (RLS enforces this too);
  // useManagerOptions is already scoped to self + reports for managers.
  const employeeOptions = useMemo(
    () =>
      (employees.data ?? []).filter((e) => (isAdmin ? true : e.id !== employee?.id)),
    [employees.data, isAdmin, employee?.id],
  )

  const defaults: GoalFormInput = useMemo(
    () => ({
      employee_id: goal?.employee_id ?? '',
      title: goal?.title ?? '',
      description: goal?.description ?? '',
      category: goal?.category ?? 'performance',
      start_date: goal?.start_date ?? '',
      target_date: goal?.target_date ?? '',
      progress_percent: goal?.progress_percent ?? 0,
      status: goal?.status ?? 'not_started',
    }),
    [goal],
  )

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GoalFormInput, unknown, GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: defaults,
  })

  useEffect(() => {
    if (open) reset(defaults)
  }, [open, defaults, reset])

  const status = watch('status')
  useEffect(() => {
    if (status === 'completed') setValue('progress_percent', 100)
  }, [status, setValue])

  async function onSubmit(values: GoalFormValues) {
    if (!profile) return
    try {
      await save.mutateAsync({
        organization_id: profile.organization_id,
        employee_id: values.employee_id,
        // The employee's current manager owns the goal (kept fresh on edit).
        manager_employee_id: isAdmin
          ? (goal?.manager_employee_id ?? null)
          : (employee?.id ?? null),
        title: values.title,
        description: values.description || null,
        category: values.category,
        start_date: values.start_date,
        target_date: values.target_date,
        progress_percent: values.progress_percent,
        status: values.status,
        ...(isEdit ? {} : { created_by: profile.id }),
      })
      toast('success', isEdit ? 'Goal updated.' : 'Goal created.')
      onClose()
    } catch {
      toast('error', 'Could not save the goal. Please try again.')
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Goal' : 'Create Goal'}
      subtitle={isEdit ? goal?.title : 'A focused, measurable objective'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="goal-form" loading={save.isPending}>
            {isEdit ? 'Save changes' : 'Create goal'}
          </Button>
        </div>
      }
    >
      <form id="goal-form" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        <FormSection title="Goal">
          <div className="sm:col-span-2">
            <SelectField
              label="Employee"
              required
              disabled={isEdit}
              error={errors.employee_id?.message}
              {...register('employee_id')}
            >
              <option value="">Select employee…</option>
              {employeeOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name} ({e.employee_code})
                </option>
              ))}
            </SelectField>
          </div>
          <div className="sm:col-span-2">
            <TextField label="Goal title" required error={errors.title?.message} {...register('title')} />
          </div>
          <div className="sm:col-span-2">
            <TextAreaField
              label="Description"
              rows={2}
              placeholder="One or two sentences on the outcome…"
              error={errors.description?.message}
              {...register('description')}
            />
          </div>
          <SelectField label="Category" required error={errors.category?.message} {...register('category')}>
            {Object.entries(GOAL_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectField>
          <SelectField label="Status" required error={errors.status?.message} {...register('status')}>
            {Object.entries(GOAL_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectField>
          <TextField label="Start date" type="date" required error={errors.start_date?.message} {...register('start_date')} />
          <TextField label="Target date" type="date" required error={errors.target_date?.message} {...register('target_date')} />
          <TextField
            label="Progress (%)"
            type="number"
            min={0}
            max={100}
            required
            error={errors.progress_percent?.message}
            {...register('progress_percent')}
          />
        </FormSection>
      </form>
    </Drawer>
  )
}
