import { differenceInCalendarDays, format, parse, parseISO } from 'date-fns'
import type { AttendanceStatus, LeaveStatus, ShiftType } from '../types/db'

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  remote: 'Remote',
  on_leave: 'On Leave',
}

export const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: 'Morning',
  standard: 'Standard',
  evening: 'Evening',
}

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

/**
 * Minutes worked between two `HH:mm[:ss]` times on the same day.
 * Returns null when either end is missing or the pair is invalid.
 */
export function workedMinutes(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
): number | null {
  if (!checkIn || !checkOut) return null
  const inMin = timeToMinutes(checkIn)
  const outMin = timeToMinutes(checkOut)
  if (inMin === null || outMin === null || outMin <= inMin) return null
  return outMin - inMin
}

function timeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(time)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/** "8h 30m" style label; em dash when not derivable. */
export function formatWorkedHours(minutes: number | null): string {
  if (minutes === null || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** "9:05 AM" from a `HH:mm[:ss]` time string. */
export function formatTime(time: string | null | undefined): string {
  if (!time) return '—'
  try {
    return format(parse(time.slice(0, 5), 'HH:mm', new Date()), 'h:mm a')
  } catch {
    return '—'
  }
}

export interface AttendanceCounts {
  present: number
  late: number
  absent: number
  remote: number
  on_leave: number
}

export const EMPTY_ATTENDANCE_COUNTS: AttendanceCounts = {
  present: 0,
  late: 0,
  absent: 0,
  remote: 0,
  on_leave: 0,
}

/**
 * Attendance rate as a whole-number percentage:
 * (present + late + remote) / (present + late + remote + absent).
 * Employees on leave are excluded from the denominator.
 * Null when there is nothing to measure.
 */
export function attendanceRate(counts: AttendanceCounts): number | null {
  const attended = counts.present + counts.late + counts.remote
  const denominator = attended + counts.absent
  if (denominator === 0) return null
  return Math.round((attended / denominator) * 100)
}

export function countAttendance(rows: Array<{ status: AttendanceStatus }>): AttendanceCounts {
  const counts = { ...EMPTY_ATTENDANCE_COUNTS }
  for (const row of rows) counts[row.status] += 1
  return counts
}

/**
 * Inclusive calendar days between two ISO dates (no weekend/holiday logic
 * by design). Null when either date is missing or the range is inverted.
 */
export function inclusiveLeaveDays(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): number | null {
  if (!startIso || !endIso) return null
  try {
    const days = differenceInCalendarDays(parseISO(endIso), parseISO(startIso)) + 1
    return days >= 1 ? days : null
  } catch {
    return null
  }
}

export interface LeaveBalanceSummary {
  leaveTypeId: string
  name: string
  isPaid: boolean
  entitlement: number
  used: number
  /** Null for unpaid leave — no balance is enforced. */
  remaining: number | null
}

/**
 * Derives used/remaining per leave type from entitlements plus approved
 * requests. Unpaid types report usage only (remaining = null).
 */
export function summarizeLeaveBalances(
  types: Array<{ id: string; name: string; is_paid: boolean; default_entitlement_days: number }>,
  balances: Array<{ leave_type_id: string; entitlement_days: number }>,
  approvedRequests: Array<{ leave_type_id: string; days_requested: number }>,
): LeaveBalanceSummary[] {
  const entitlementByType = new Map(balances.map((b) => [b.leave_type_id, b.entitlement_days]))
  const usedByType = new Map<string, number>()
  for (const req of approvedRequests) {
    usedByType.set(req.leave_type_id, (usedByType.get(req.leave_type_id) ?? 0) + req.days_requested)
  }
  return types.map((type) => {
    const entitlement = entitlementByType.get(type.id) ?? (type.is_paid ? type.default_entitlement_days : 0)
    const used = usedByType.get(type.id) ?? 0
    return {
      leaveTypeId: type.id,
      name: type.name,
      isPaid: type.is_paid,
      entitlement,
      used,
      remaining: type.is_paid ? Math.max(entitlement - used, 0) : null,
    }
  })
}
