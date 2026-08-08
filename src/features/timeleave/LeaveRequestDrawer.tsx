import { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { FormSection, SelectField, TextAreaField, TextField } from '../../components/ui/form'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { useManagerOptions } from '../../hooks/useLookups'
import {
  useCreateLeaveRequest,
  useLeaveBalanceSummary,
  useLeaveTypes,
} from '../../hooks/useLeave'
import { inclusiveLeaveDays } from '../../lib/timeLeave'
import { makeLeaveFormSchema, type LeaveFormValues } from './schemas'

interface LeaveRequestDrawerProps {
  open: boolean
  onClose: () => void
}

const EMPTY = {
  employee_id: '',
  leave_type_id: '',
  start_date: '',
  end_date: '',
  reason: '',
}

/** HR admin creates a leave request on behalf of an employee. */
export function LeaveRequestDrawer({ open, onClose }: LeaveRequestDrawerProps) {
  const { toast } = useToast()
  const { profile } = useAuth()
  const employees = useManagerOptions()
  const leaveTypes = useLeaveTypes()
  const create = useCreateLeaveRequest()

  // The schema is stable; it reads the latest balances through a ref so
  // validation always sees fresh data without re-creating the resolver.
  const latestBalances = useRef(new Map<string, number | null>())
  const schema = useMemo(
    () =>
      makeLeaveFormSchema((leaveTypeId) => ({
        remaining: latestBalances.current.get(leaveTypeId) ?? null,
      })),
    [],
  )

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LeaveFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (open) reset(EMPTY)
  }, [open, reset])

  const employeeId = watch('employee_id')
  const leaveTypeId = watch('leave_type_id')
  const startDate = watch('start_date')
  const endDate = watch('end_date')

  const year = startDate ? new Date(`${startDate}T00:00:00`).getFullYear() : new Date().getFullYear()
  const balances = useLeaveBalanceSummary(employeeId || undefined, year)

  // leave_type_id -> remaining (null = unpaid, no enforcement).
  useEffect(() => {
    const map = new Map<string, number | null>()
    for (const b of balances.data ?? []) map.set(b.leaveTypeId, b.remaining)
    latestBalances.current = map
  }, [balances.data])

  const days = inclusiveLeaveDays(startDate || null, endDate || null)
  const selectedType = (leaveTypes.data ?? []).find((t) => t.id === leaveTypeId) ?? null
  const selectedBalance = (balances.data ?? []).find((b) => b.leaveTypeId === leaveTypeId) ?? null

  async function onSubmit(values: LeaveFormValues) {
    if (!profile) return
    const requestedDays = inclusiveLeaveDays(values.start_date, values.end_date)
    if (!requestedDays) return
    try {
      await create.mutateAsync({
        organization_id: profile.organization_id,
        employee_id: values.employee_id,
        leave_type_id: values.leave_type_id,
        start_date: values.start_date,
        end_date: values.end_date,
        days_requested: requestedDays,
        reason: values.reason,
        submitted_by: profile.id,
      })
      toast('success', 'Leave request submitted.')
      onClose()
    } catch {
      toast('error', 'Could not submit the leave request. Please try again.')
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New Leave Request"
      subtitle="Submitted on behalf of an employee — starts as Pending"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="leave-form" loading={create.isPending}>
            Submit request
          </Button>
        </div>
      }
    >
      <form id="leave-form" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        <FormSection title="Request">
          <SelectField
            label="Employee"
            required
            error={errors.employee_id?.message}
            {...register('employee_id')}
          >
            <option value="">Select employee…</option>
            {(employees.data ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.first_name} {e.last_name} ({e.employee_code})
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Leave type"
            required
            error={errors.leave_type_id?.message}
            {...register('leave_type_id')}
          >
            <option value="">Select leave type…</option>
            {(leaveTypes.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </SelectField>
          <TextField label="Start date" type="date" required error={errors.start_date?.message} {...register('start_date')} />
          <TextField label="End date" type="date" required error={errors.end_date?.message} {...register('end_date')} />
          <div className="sm:col-span-2">
            <TextAreaField
              label="Reason"
              rows={2}
              required
              placeholder="A short, concise reason…"
              error={errors.reason?.message}
              {...register('reason')}
            />
          </div>
        </FormSection>

        <div className="space-y-2 rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Calculated days</span>
            <span className="font-semibold text-slate-800">
              {days ? `${days} day${days === 1 ? '' : 's'}` : '—'}
            </span>
          </div>
          {selectedType && employeeId && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">
                {selectedType.is_paid ? 'Remaining balance' : 'Balance'}
              </span>
              <span className="font-semibold text-slate-800">
                {selectedType.is_paid
                  ? selectedBalance
                    ? `${selectedBalance.remaining} of ${selectedBalance.entitlement} days`
                    : '…'
                  : 'Unpaid — no balance limit'}
              </span>
            </div>
          )}
          <p className="text-xs text-slate-500">
            Days are inclusive calendar days. Paid requests cannot exceed the remaining balance.
          </p>
        </div>
      </form>
    </Drawer>
  )
}
