import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, formatISO, parseISO, subDays } from 'date-fns'
import { getSupabase } from '../lib/supabase'
import { attendanceRate, countAttendance } from '../lib/timeLeave'
import type { AttendanceRecord, AttendanceRecordWithEmployee } from '../types/db'

// Embeds carry explicit FK hints (Wave 1 convention — employees/departments
// have two relationships between them).
export const ATTENDANCE_SELECT = `
  *,
  employee:employees!attendance_records_employee_id_fkey(
    id, first_name, last_name, employee_code, avatar_url, manager_id,
    department:departments!employees_department_id_fkey(id, name)
  )
`

/** Most recent date with any attendance record (demo-friendly default). */
export function useLatestAttendanceDate() {
  return useQuery({
    queryKey: ['attendance', 'latest-date'],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await getSupabase()
        .from('attendance_records')
        .select('attendance_date')
        .order('attendance_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data?.attendance_date ?? null
    },
  })
}

/**
 * All visible attendance rows for one date (RLS scopes managers to
 * self + direct reports). The org is small, so department/status/search
 * filtering happens client-side on this single query.
 */
export function useAttendanceForDate(date: string | null) {
  return useQuery({
    queryKey: ['attendance', 'by-date', date],
    enabled: !!date,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('attendance_records')
        .select(ATTENDANCE_SELECT)
        .eq('attendance_date', date!)
        .limit(500)
      if (error) throw error
      const rows = (data ?? []) as unknown as AttendanceRecordWithEmployee[]
      return rows.sort((a, b) =>
        `${a.employee?.first_name} ${a.employee?.last_name}`.localeCompare(
          `${b.employee?.first_name} ${b.employee?.last_name}`,
        ),
      )
    },
  })
}

/** Recent attendance for one employee (profile tab). */
export function useEmployeeAttendance(employeeId: string | undefined, limit = 30) {
  return useQuery({
    queryKey: ['attendance', 'employee', employeeId, limit],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('attendance_date', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as AttendanceRecord[]
    },
  })
}

/** Existing record for employee/date — the drawer edits instead of duplicating. */
export function useExistingAttendance(employeeId: string, date: string) {
  return useQuery({
    queryKey: ['attendance', 'existing', employeeId, date],
    enabled: !!employeeId && !!date,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('attendance_date', date)
        .maybeSingle()
      if (error) throw error
      return (data as AttendanceRecord | null) ?? null
    },
  })
}

export interface AttendanceTrendPoint {
  day: string
  rate: number
}

/** Attendance rate per working day over the recent period, from live records. */
export function useAttendanceTrend(days = 21) {
  return useQuery({
    queryKey: ['attendance', 'trend', days],
    queryFn: async (): Promise<AttendanceTrendPoint[]> => {
      const cutoff = formatISO(subDays(new Date(), days), { representation: 'date' })
      const { data, error } = await getSupabase()
        .from('attendance_records')
        .select('attendance_date, status')
        .gte('attendance_date', cutoff)
        .limit(2000)
      if (error) throw error
      const byDate = new Map<string, Array<{ status: AttendanceRecord['status'] }>>()
      for (const row of (data ?? []) as Array<Pick<AttendanceRecord, 'attendance_date' | 'status'>>) {
        const bucket = byDate.get(row.attendance_date) ?? []
        bucket.push({ status: row.status })
        byDate.set(row.attendance_date, bucket)
      }
      return [...byDate.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, rows]) => ({
          day: format(parseISO(date), 'MMM d'),
          rate: attendanceRate(countAttendance(rows)) ?? 0,
        }))
    },
  })
}

export interface LatestAttendanceRate {
  date: string | null
  rate: number | null
}

/**
 * Attendance rate for the most recent day that has records — keeps the
 * dashboard meaningful even when today's attendance is not marked yet.
 */
export function useLatestAttendanceRate() {
  return useQuery({
    queryKey: ['dashboard', 'attendance-rate'],
    queryFn: async (): Promise<LatestAttendanceRate> => {
      const supabase = getSupabase()
      const { data: latest, error: latestErr } = await supabase
        .from('attendance_records')
        .select('attendance_date')
        .order('attendance_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (latestErr) throw latestErr
      if (!latest) return { date: null, rate: null }
      const { data, error } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('attendance_date', latest.attendance_date)
        .limit(500)
      if (error) throw error
      const rows = (data ?? []) as Array<Pick<AttendanceRecord, 'status'>>
      return {
        date: latest.attendance_date,
        rate: attendanceRate(countAttendance(rows)),
      }
    },
  })
}

export interface AttendancePayload {
  organization_id: string
  employee_id: string
  attendance_date: string
  status: AttendanceRecord['status']
  shift: AttendanceRecord['shift']
  check_in: string | null
  check_out: string | null
  notes: string | null
  marked_by: string
}

/**
 * Creates or updates the single record per employee/date. Upsert on the
 * unique key means an existing record is edited, never duplicated.
 */
export function useSaveAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AttendancePayload) => {
      const { data, error } = await getSupabase()
        .from('attendance_records')
        .upsert(payload, { onConflict: 'employee_id,attendance_date' })
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ['attendance'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
