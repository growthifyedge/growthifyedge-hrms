import { z } from 'zod'
import { inclusiveLeaveDays } from '../../lib/timeLeave'

const TIMES_OPTIONAL_STATUSES = new Set(['absent', 'on_leave'])

export const attendanceFormSchema = z
  .object({
    employee_id: z.string().min(1, 'Select an employee'),
    attendance_date: z.string().min(1, 'Date is required'),
    status: z.enum(['present', 'late', 'absent', 'remote', 'on_leave'], {
      message: 'Select a status',
    }),
    shift: z.enum(['morning', 'standard', 'evening'], { message: 'Select a shift' }),
    check_in: z.string().optional().or(z.literal('')),
    check_out: z.string().optional().or(z.literal('')),
    notes: z.string().trim().max(300, 'Keep the note under 300 characters').optional().or(z.literal('')),
  })
  .superRefine((values, ctx) => {
    const timesOptional = TIMES_OPTIONAL_STATUSES.has(values.status)
    if (!timesOptional && !values.check_in) {
      ctx.addIssue({ code: 'custom', path: ['check_in'], message: 'Check-in is required for this status' })
    }
    if (values.check_in && values.check_out && values.check_out <= values.check_in) {
      ctx.addIssue({
        code: 'custom',
        path: ['check_out'],
        message: 'Check-out cannot be earlier than check-in',
      })
    }
  })

export type AttendanceFormInput = z.input<typeof attendanceFormSchema>
export type AttendanceFormValues = z.output<typeof attendanceFormSchema>

export interface LeaveBalanceContext {
  /** Remaining days for the selected paid leave type; null = no enforcement. */
  remaining: number | null
}

export function makeLeaveFormSchema(getBalance: (leaveTypeId: string) => LeaveBalanceContext) {
  return z
    .object({
      employee_id: z.string().min(1, 'Select an employee'),
      leave_type_id: z.string().min(1, 'Select a leave type'),
      start_date: z.string().min(1, 'Start date is required'),
      end_date: z.string().min(1, 'End date is required'),
      reason: z
        .string()
        .trim()
        .min(3, 'A short reason is required')
        .max(200, 'Keep the reason under 200 characters'),
    })
    .superRefine((values, ctx) => {
      const days = inclusiveLeaveDays(values.start_date, values.end_date)
      if (values.start_date && values.end_date && days === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['end_date'],
          message: 'End date cannot be before the start date',
        })
        return
      }
      if (days !== null && values.leave_type_id) {
        const { remaining } = getBalance(values.leave_type_id)
        if (remaining !== null && days > remaining) {
          ctx.addIssue({
            code: 'custom',
            path: ['end_date'],
            message: `Only ${remaining} day${remaining === 1 ? '' : 's'} remaining for this leave type`,
          })
        }
      }
    })
}

export type LeaveFormValues = z.output<ReturnType<typeof makeLeaveFormSchema>>
