import { useMemo, useState } from 'react'
import { Pencil, ScanFace, Search, X } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/StatusBadge'
import { Skeleton, TableSkeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/states'
import { useAuth } from '../../contexts/AuthContext'
import { useDepartments } from '../../hooks/useLookups'
import { useAttendanceForDate, useLatestAttendanceDate } from '../../hooks/useAttendance'
import {
  ATTENDANCE_STATUS_LABELS,
  SHIFT_LABELS,
  attendanceRate,
  countAttendance,
  formatTime,
  formatWorkedHours,
  workedMinutes,
} from '../../lib/timeLeave'
import { formatDate, fullName } from '../../lib/format'
import { isFaceTerminalRecord } from '../../lib/faceDemo'
import { cn } from '../../lib/utils'
import type { AttendanceRecordWithEmployee, AttendanceStatus } from '../../types/db'

const STATUS_TONES: Record<AttendanceStatus, 'green' | 'amber' | 'red' | 'blue' | 'violet'> = {
  present: 'green',
  late: 'amber',
  absent: 'red',
  remote: 'blue',
  on_leave: 'violet',
}

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  return <Badge tone={STATUS_TONES[status] ?? 'slate'} label={ATTENDANCE_STATUS_LABELS[status] ?? status} />
}

/** Source badge for simulator-created records (raw marker never shown). */
function FaceTerminalBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-700">
      <ScanFace className="h-3 w-3" aria-hidden /> Face Terminal
    </span>
  )
}

const selectClass =
  'rounded-lg border border-slate-300 bg-white py-1.5 pl-2.5 pr-7 text-sm text-slate-700 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100'

interface AttendanceTabProps {
  onEdit: (record: AttendanceRecordWithEmployee) => void
  /** Effective date and setter are owned by TimeLeavePage (shared with the demo panel). */
  date: string | null
  onDateChange: (date: string) => void
}

export function AttendanceTab({ onEdit, date, onDateChange }: AttendanceTabProps) {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'hr_admin'

  const latestDate = useLatestAttendanceDate()

  const [departmentId, setDepartmentId] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  const departments = useDepartments()
  const records = useAttendanceForDate(date)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (records.data ?? []).filter((row) => {
      if (departmentId && row.employee?.department?.id !== departmentId) return false
      if (status && row.status !== status) return false
      if (term) {
        const haystack = `${row.employee?.first_name ?? ''} ${row.employee?.last_name ?? ''} ${row.employee?.employee_code ?? ''}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }, [records.data, departmentId, status, search])

  const counts = useMemo(() => countAttendance(records.data ?? []), [records.data])
  const rate = attendanceRate(counts)
  const hasFilters = !!(departmentId || status || search)
  const loading = latestDate.isPending || (!!date && records.isPending)

  return (
    <div>
      {/* Summary cards for the selected date */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Present" value={counts.present} tone="text-emerald-600" loading={loading} />
        <StatCard label="Late" value={counts.late} tone="text-amber-600" loading={loading} />
        <StatCard label="Absent" value={counts.absent} tone="text-red-600" loading={loading} />
        <StatCard label="Remote" value={counts.remote} tone="text-accent-600" loading={loading} />
        <StatCard label="On Leave" value={counts.on_leave} tone="text-violet-600" loading={loading} />
        <StatCard
          label="Attendance Rate"
          value={rate === null ? '—' : `${rate}%`}
          tone="text-slate-900"
          loading={loading}
        />
      </div>

      {/* Filter bar */}
      <Card className="mb-4 mt-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date ?? ''}
            onChange={(e) => onDateChange(e.target.value)}
            aria-label="Attendance date"
            className={selectClass}
          />
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            aria-label="Filter by department"
            className={selectClass}
          >
            <option value="">All departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by attendance status"
            className={selectClass}
          >
            <option value="">All statuses</option>
            {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee…"
              aria-label="Search attendance"
              className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100"
            />
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDepartmentId('')
                setStatus('')
                setSearch('')
              }}
            >
              <X className="h-3.5 w-3.5" aria-hidden /> Clear filters
            </Button>
          )}
        </div>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={8} />
        ) : records.isError ? (
          <ErrorState onRetry={() => void records.refetch()} />
        ) : !date ? (
          <EmptyState
            title="No attendance yet"
            message="Attendance records will appear here once the first day is marked."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'No records match your filters' : 'No attendance for this date'}
            message={hasFilters ? 'Try adjusting or clearing the filters above.' : 'Pick another date or mark attendance.'}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-medium">Employee</th>
                    <th scope="col" className="px-4 py-3 font-medium">Department</th>
                    <th scope="col" className="px-4 py-3 font-medium">Date</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 font-medium">Check In</th>
                    <th scope="col" className="px-4 py-3 font-medium">Check Out</th>
                    <th scope="col" className="px-4 py-3 font-medium">Worked</th>
                    <th scope="col" className="px-4 py-3 font-medium">Shift</th>
                    {isAdmin && <th scope="col" className="px-4 py-3 font-medium">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={row.employee ? fullName(row.employee) : '?'}
                            src={row.employee?.avatar_url}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="max-w-[180px] truncate font-medium text-slate-800">
                              {row.employee ? fullName(row.employee) : '—'}
                            </p>
                            <p className="font-mono text-xs text-slate-500">{row.employee?.employee_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{row.employee?.department?.name ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(row.attendance_date)}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          <AttendanceStatusBadge status={row.status} />
                          {isFaceTerminalRecord(row.notes) && <FaceTerminalBadge />}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{formatTime(row.check_in)}</td>
                      <td className="px-4 py-2.5 text-slate-600">{formatTime(row.check_out)}</td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {formatWorkedHours(workedMinutes(row.check_in, row.check_out))}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{SHIFT_LABELS[row.shift]}</td>
                      {isAdmin && (
                        <td className="px-4 py-2.5">
                          <Button variant="ghost" size="sm" onClick={() => onEdit(row)} aria-label={`Edit attendance for ${row.employee ? fullName(row.employee) : 'employee'}`}>
                            <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 md:hidden">
              {filtered.map((row) => (
                <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={row.employee ? fullName(row.employee) : '?'}
                      src={row.employee?.avatar_url}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {row.employee ? fullName(row.employee) : '—'}
                      </p>
                      <p className="truncate font-mono text-xs text-slate-400">{row.employee?.employee_code}</p>
                    </div>
                    <span className="inline-flex flex-col items-end gap-1">
                      <AttendanceStatusBadge status={row.status} />
                      {isFaceTerminalRecord(row.notes) && <FaceTerminalBadge />}
                    </span>
                  </div>
                  <dl className="mt-3 space-y-1 text-xs text-slate-500">
                    <MobileRow label="Date" value={formatDate(row.attendance_date)} />
                    <MobileRow label="Check in / out" value={`${formatTime(row.check_in)} – ${formatTime(row.check_out)}`} />
                    <MobileRow label="Worked" value={formatWorkedHours(workedMinutes(row.check_in, row.check_out))} />
                    <MobileRow label="Shift" value={SHIFT_LABELS[row.shift]} />
                  </dl>
                  {isAdmin && (
                    <div className="mt-3 flex justify-end">
                      <Button variant="secondary" size="sm" onClick={() => onEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
  loading,
}: {
  label: string
  value: string | number
  tone: string
  loading?: boolean
}) {
  return (
    <Card className="p-4">
      <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      {loading ? (
        <Skeleton className="mt-1.5 h-7 w-12" />
      ) : (
        <p className={cn('mt-0.5 text-2xl font-semibold', tone)}>{value}</p>
      )}
    </Card>
  )
}

function MobileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{label}</dt>
      <dd className="truncate text-right font-medium text-slate-700">{value}</dd>
    </div>
  )
}
