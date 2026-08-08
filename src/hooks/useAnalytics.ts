import { useQuery } from '@tanstack/react-query'
import { formatISO, subDays } from 'date-fns'
import { getSupabase } from '../lib/supabase'
import { attendanceDailyBreakdown, countBy, sumByGroup, type AttendanceDayBreakdown } from '../lib/analytics'
import { ratingDistribution, type RatingDistribution } from '../lib/performance'
import type { AttendanceStatus, GoalStatus, LeaveStatus } from '../types/db'

export interface WorkforceAnalytics {
  employmentStatus: Array<{ label: string; count: number }>
  byLocation: Array<{ label: string; count: number }>
}

const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  on_leave: 'On Leave',
  probation: 'Probation',
  notice_period: 'Notice Period',
  inactive: 'Inactive',
  future_hire: 'Future Hire',
}

/** Employment status + location distribution from one employees query. */
export function useWorkforceAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'workforce'],
    queryFn: async (): Promise<WorkforceAnalytics> => {
      const { data, error } = await getSupabase()
        .from('employees')
        .select('status, work_location:work_locations!employees_work_location_id_fkey(name)')
        .limit(500)
      if (error) throw error
      const rows = (data ?? []) as unknown as Array<{
        status: string
        work_location: { name: string } | null
      }>
      const statusCounts = countBy(rows, 'status')
      const current = rows.filter((r) => r.status !== 'inactive' && r.status !== 'future_hire')
      const locationCounts = new Map<string, number>()
      for (const row of current) {
        const name = row.work_location?.name ?? 'Unassigned'
        locationCounts.set(name, (locationCounts.get(name) ?? 0) + 1)
      }
      return {
        employmentStatus: [...statusCounts.entries()].map(([status, count]) => ({
          label: EMPLOYEE_STATUS_LABELS[status] ?? status,
          count,
        })),
        byLocation: [...locationCounts.entries()]
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count),
      }
    },
  })
}

/** Per-day attendance status breakdown over the recent window. */
export function useAttendanceBreakdown(days = 21) {
  return useQuery({
    queryKey: ['analytics', 'attendance-breakdown', days],
    queryFn: async (): Promise<AttendanceDayBreakdown[]> => {
      const cutoff = formatISO(subDays(new Date(), days), { representation: 'date' })
      const { data, error } = await getSupabase()
        .from('attendance_records')
        .select('attendance_date, status')
        .gte('attendance_date', cutoff)
        .limit(2000)
      if (error) throw error
      return attendanceDailyBreakdown(
        (data ?? []) as Array<{ attendance_date: string; status: AttendanceStatus }>,
      )
    },
  })
}

/** Leave request counts by status (all-time; demo dataset is small). */
export function useLeaveOverview() {
  return useQuery({
    queryKey: ['analytics', 'leave-overview'],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('leave_requests')
        .select('status')
        .limit(1000)
      if (error) throw error
      const counts = countBy((data ?? []) as Array<{ status: LeaveStatus }>, 'status')
      return {
        pending: counts.get('pending') ?? 0,
        approved: counts.get('approved') ?? 0,
        rejected: counts.get('rejected') ?? 0,
      }
    },
  })
}

export interface PerformanceAnalytics {
  averageRating: number | null
  completedReviews: number
  distribution: RatingDistribution[]
  goals: Array<{ label: string; count: number }>
}

const GOAL_LABELS: Record<GoalStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function usePerformanceAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'performance'],
    queryFn: async (): Promise<PerformanceAnalytics> => {
      const supabase = getSupabase()
      const [reviewsRes, goalsRes] = await Promise.all([
        supabase.from('performance_reviews').select('overall_rating, status').limit(500),
        supabase.from('performance_goals').select('status').limit(500),
      ])
      if (reviewsRes.error) throw reviewsRes.error
      if (goalsRes.error) throw goalsRes.error
      const ratings = ((reviewsRes.data ?? []) as Array<{ overall_rating: number | null; status: string }>)
        .filter((r) => r.status === 'completed' && r.overall_rating !== null)
        .map((r) => r.overall_rating!)
      const goalCounts = countBy((goalsRes.data ?? []) as Array<{ status: GoalStatus }>, 'status')
      return {
        averageRating:
          ratings.length === 0
            ? null
            : Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10,
        completedReviews: ratings.length,
        distribution: ratingDistribution(ratings),
        goals: (['not_started', 'in_progress', 'completed', 'cancelled'] as GoalStatus[]).map(
          (status) => ({ label: GOAL_LABELS[status], count: goalCounts.get(status) ?? 0 }),
        ),
      }
    },
  })
}

export interface PayrollAnalytics {
  trend: Array<{ period: string; gross: number; net: number }>
  byDepartment: Array<{ group: string; total: number }>
}

/**
 * Payroll trend (recent non-future runs) + latest-run net by department.
 * RLS restricts this to HR admins; the page itself is admin-only too.
 */
export function usePayrollAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'payroll'],
    queryFn: async (): Promise<PayrollAnalytics> => {
      const supabase = getSupabase()
      const today = formatISO(new Date(), { representation: 'date' })
      const { data: runs, error: runsErr } = await supabase
        .from('payroll_runs')
        .select('id, period_month, total_gross, total_net')
        .lte('period_month', today)
        .order('period_month', { ascending: false })
        .limit(6)
      if (runsErr) throw runsErr
      const runRows = (runs ?? []) as Array<{
        id: string
        period_month: string
        total_gross: number
        total_net: number
      }>

      let byDepartment: Array<{ group: string; total: number }> = []
      const latest = runRows[0]
      if (latest) {
        const { data: entries, error: entriesErr } = await supabase
          .from('payroll_entries')
          .select(
            'net_pay, employee:employees!payroll_entries_employee_id_fkey(department:departments!employees_department_id_fkey(name))',
          )
          .eq('payroll_run_id', latest.id)
          .limit(500)
        if (entriesErr) throw entriesErr
        byDepartment = sumByGroup(
          (entries ?? []) as unknown as Array<{ net_pay: number; employee: { department: { name: string } | null } | null }>,
          (row) => row.employee?.department?.name ?? 'Unassigned',
          (row) => row.net_pay,
        )
      }

      return {
        trend: runRows
          .slice()
          .reverse()
          .map((r) => ({ period: r.period_month, gross: r.total_gross, net: r.total_net })),
        byDepartment,
      }
    },
  })
}
