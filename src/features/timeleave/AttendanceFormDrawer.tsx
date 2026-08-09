import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { FormSection, SelectField, TextAreaField, TextField } from '../../components/ui/form'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { useManagerOptions } from '../../hooks/useLookups'
import { useExistingAttendance, useSaveAttendance } from '../../hooks/useAttendance'
import {
  ATTENDANCE_STATUS_LABELS,
  SHIFT_LABELS,
  formatWorkedHours,
  workedMinutes,
} from '../../lib/timeLeave'
import { stripDemoMarker } from '../../lib/faceDemo'
import { attendanceFormSchema, type AttendanceFormInput, type AttendanceFormValues } from './schemas'
import type { AttendanceRecord } from '../../types/db'

interface AttendanceFormDrawerProps {
  open: boolean
  onClose: () => void
  /** When set, the drawer edits this record (employee/date locked). */
  record?: AttendanceRecord | null
  /** Prefilled date when marking fresh attendance. */
  defaultDate?: string
}

const TIMES_OPTIONAL = new Set(['absent', 'on_leave'])

/** One reusable drawer for both marking and editing attendance. */
export function AttendanceFormDrawer({ open, onClose, record, defaultDate }: AttendanceFormDrawerProps) {
  const { toast } = useToast()
  const { profile } = useAuth()
  const employees = useManagerOptions()
  const save = useSaveAttendance()

  const defaults: AttendanceFormInput = useMemo(
    () => ({
      employee_id: record?.employee_id ?? '',
      attendance_date: record?.attendance_date ?? defaultDate ?? '',
      status: record?.status ?? 'present',
      shift: record?.shift ?? 'standard',
      check_in: record?.check_in?.slice(0, 5) ?? '',
      check_out: record?.check_out?.slice(0, 5) ?? '',
      notes: stripDemoMarker(record?.notes),
    }),
    [record, defaultDate],
  )

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AttendanceFormInput, unknown, AttendanceFormValues>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: defaults,
  })

  useEffect(() => {
    if (open) reset(defaults)
  }, [open, defaults, reset])

  const employeeId = watch('employee_id')
  const date = watch('attendance_date')
  const status = watch('status')
  const checkIn = watch('check_in')
  const checkOut = watch('check_out')

  // If a record already exists for the picked employee/date, edit it in
  // place instead of creating a duplicate.
  const existing = useExistingAttendance(record ? '' : employeeId, record ? '' : date)
  useEffect(() => {
    if (!open || record || !existing.data) return
    const found = existing.data
    reset({
      employee_id: found.employee_id,
      attendance_date: found.attendance_date,
      status: found.status,
      shift: found.shift,
      check_in: found.check_in?.slice(0, 5) ?? '',
      check_out: found.check_out?.slice(0, 5) ?? '',
      notes: stripDemoMarker(found.notes),
    })
  }, [open, record, existing.data, reset])

  const timesOptional = TIMES_OPTIONAL.has(status)
  useEffect(() => {
    if (timesOptional) {
      setValue('check_in', '')
      setValue('check_out', '')
    }
  }, [timesOptional, setValue])

  const worked = workedMinutes(checkIn || null, checkOut || null)
  const isEdit = !!record || !!existing.data

  async function onSubmit(values: AttendanceFormValues) {
    if (!profile) return
    try {
      await save.mutateAsync({
        organization_id: profile.organization_id,
        employee_id: values.employee_id,
        attendance_date: values.attendance_date,
        status: values.status,
        shift: values.shift,
        check_in: !timesOptional && values.check_in ? values.check_in : null,
        check_out: !timesOptional && values.check_out ? values.check_out : null,
        notes: values.notes || null,
        marked_by: profile.id,
      })
      toast('success', isEdit ? 'Attendance updated.' : 'Attendance marked.')
      onClose()
    } catch {
      toast('error', 'Could not save attendance. Please try again.')
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Attendance' : 'Mark Attendance'}
      subtitle={isEdit ? 'Updating the existing record for this day' : 'One record per employee per day'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="attendance-form" loading={save.isPending}>
            {isEdit ? 'Save changes' : 'Mark attendance'}
          </Button>
        </div>
      }
    >
      <form id="attendance-form" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        <FormSection title="Employee & Day">
          <SelectField
            label="Employee"
            required
            disabled={!!record}
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
          <TextField
            label="Date"
            type="date"
            required
            disabled={!!record}
            error={errors.attendance_date?.message}
            {...register('attendance_date')}
          />
        </FormSection>

        <FormSection title="Attendance">
          <SelectField label="Status" required error={errors.status?.message} {...register('status')}>
            {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectField>
          <SelectField label="Shift" required error={errors.shift?.message} {...register('shift')}>
            {Object.entries(SHIFT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectField>
          <TextField
            label="Check in"
            type="time"
            disabled={timesOptional}
            hint={timesOptional ? 'Not needed for this status' : undefined}
            error={errors.check_in?.message}
            {...register('check_in')}
          />
          <TextField
            label="Check out"
            type="time"
            disabled={timesOptional}
            hint={
              !timesOptional && worked !== null ? `Worked hours: ${formatWorkedHours(worked)}` : undefined
            }
            error={errors.check_out?.message}
            {...register('check_out')}
          />
          <div className="sm:col-span-2">
            <TextAreaField
              label="Note"
              rows={2}
              placeholder="Optional short note…"
              error={errors.notes?.message}
              {...register('notes')}
            />
          </div>
        </FormSection>

        {!record && existing.data && (
          <p className="rounded-lg bg-accent-50 px-3 py-2.5 text-sm text-accent-700">
            An attendance record already exists for this employee and day — you are editing it.
          </p>
        )}
      </form>
    </Drawer>
  )
}
