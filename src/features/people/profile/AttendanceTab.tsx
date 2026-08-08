import { useMemo } from 'react'
import { Card } from '../../../components/ui/Card'
import { Skeleton } from '../../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../../components/ui/states'
import { useEmployeeAttendance } from '../../../hooks/useAttendance'
import {
  SHIFT_LABELS,
  attendanceRate,
  countAttendance,
  formatTime,
  formatWorkedHours,
  workedMinutes,
} from '../../../lib/timeLeave'
import { formatDate } from '../../../lib/format'
import { cn } from '../../../lib/utils'
import { AttendanceStatusBadge } from '../../timeleave/AttendanceTab'

/** Employee profile → Attendance: personal stats + recent records. */
export function AttendanceTab({ employeeId }: { employeeId: string }) {
  const attendance = useEmployeeAttendance(employeeId, 30)

  const counts = useMemo(() => countAttendance(attendance.data ?? []), [attendance.data])
  const rate = attendanceRate(counts)

  if (attendance.isPending) return <Skeleton className="h-64" />
  if (attendance.isError) {
    return (
      <Card>
        <ErrorState onRetry={() => void attendance.refetch()} />
      </Card>
    )
  }

  const rows = attendance.data
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No attendance records"
          message="Attendance for this employee will appear here once marked."
        />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Stat label="Attendance rate" value={rate === null ? '—' : `${rate}%`} tone="text-slate-900" />
        <Stat label="Present" value={counts.present} tone="text-emerald-600" />
        <Stat label="Late" value={counts.late} tone="text-amber-600" />
        <Stat label="Absent" value={counts.absent} tone="text-red-600" />
        <Stat label="Remote" value={counts.remote} tone="text-accent-600" />
      </div>

      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">
          Recent attendance <span className="font-normal text-slate-400">(last {rows.length} records)</span>
        </h3>
        <ul className="divide-y divide-slate-100">
          {rows.slice(0, 15).map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
              <span className="w-28 shrink-0 font-medium text-slate-800">{formatDate(row.attendance_date)}</span>
              <AttendanceStatusBadge status={row.status} />
              <span className="text-slate-500">
                {formatTime(row.check_in)} – {formatTime(row.check_out)}
              </span>
              <span className="ml-auto text-slate-500">
                {formatWorkedHours(workedMinutes(row.check_in, row.check_out))}
                <span className="ml-3 text-xs text-slate-400">{SHIFT_LABELS[row.shift]}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <Card className="p-4">
      <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('mt-0.5 text-2xl font-semibold', tone)}>{value}</p>
    </Card>
  )
}
