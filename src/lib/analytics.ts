import { format, parseISO } from 'date-fns'
import type { AttendanceStatus } from '../types/db'

/** Counts rows per value of the given key, preserving insertion order. */
export function countBy<T, K extends keyof T>(rows: T[], key: K): Map<string, number> {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const value = String(row[key] ?? '—')
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return counts
}

export interface AttendanceDayBreakdown {
  day: string
  present: number
  late: number
  remote: number
  absent: number
}

/**
 * Groups attendance rows into a per-day status breakdown for the stacked
 * trend chart (on_leave is intentionally excluded — it is not a work state).
 */
export function attendanceDailyBreakdown(
  rows: Array<{ attendance_date: string; status: AttendanceStatus }>,
): AttendanceDayBreakdown[] {
  const byDate = new Map<string, AttendanceDayBreakdown>()
  for (const row of rows) {
    let bucket = byDate.get(row.attendance_date)
    if (!bucket) {
      bucket = {
        day: format(parseISO(row.attendance_date), 'MMM d'),
        present: 0,
        late: 0,
        remote: 0,
        absent: 0,
      }
      byDate.set(row.attendance_date, bucket)
    }
    if (row.status === 'present' || row.status === 'late' || row.status === 'remote' || row.status === 'absent') {
      bucket[row.status] += 1
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, breakdown]) => breakdown)
}

/** Sums a numeric field per group label, sorted descending by total. */
export function sumByGroup<T>(
  rows: T[],
  groupOf: (row: T) => string,
  valueOf: (row: T) => number,
): Array<{ group: string; total: number }> {
  const totals = new Map<string, number>()
  for (const row of rows) {
    const group = groupOf(row)
    totals.set(group, (totals.get(group) ?? 0) + valueOf(row))
  }
  return [...totals.entries()]
    .map(([group, total]) => ({ group, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
}
