import { useMemo, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { formatISO } from 'date-fns'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/StatusBadge'
import { Skeleton, TableSkeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/states'
import { useAuth } from '../../contexts/AuthContext'
import { useLeaveRequests } from '../../hooks/useLeave'
import { LEAVE_STATUS_LABELS } from '../../lib/timeLeave'
import { formatDate, fullName } from '../../lib/format'
import { cn } from '../../lib/utils'
import { ReviewLeaveModal } from './ReviewLeaveModal'
import type { LeaveRequestWithRelations, LeaveStatus } from '../../types/db'

const LEAVE_TONES: Record<LeaveStatus, 'amber' | 'green' | 'red'> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
}

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  return <Badge tone={LEAVE_TONES[status] ?? 'slate'} label={LEAVE_STATUS_LABELS[status] ?? status} />
}

const selectClass =
  'rounded-lg border border-slate-300 bg-white py-1.5 pl-2.5 pr-7 text-sm text-slate-700 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100'

export function LeaveTab() {
  const { profile, employee } = useAuth()
  const isAdmin = profile?.role === 'hr_admin'
  const isManager = profile?.role === 'manager'
  const myEmployeeId = employee?.id ?? null

  const requests = useLeaveRequests()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [review, setReview] = useState<{
    request: LeaveRequestWithRelations
    decision: 'approved' | 'rejected'
  } | null>(null)

  const rows = useMemo(() => requests.data ?? [], [requests.data])
  const today = formatISO(new Date(), { representation: 'date' })

  const summary = useMemo(() => {
    const onLeaveEmployees = new Set<string>()
    let pending = 0
    let approved = 0
    let rejected = 0
    for (const row of rows) {
      if (row.status === 'pending') pending += 1
      if (row.status === 'approved') {
        approved += 1
        if (row.start_date <= today && row.end_date >= today) onLeaveEmployees.add(row.employee_id)
      }
      if (row.status === 'rejected') rejected += 1
    }
    return { pending, approved, rejected, onLeaveToday: onLeaveEmployees.size }
  }, [rows, today])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (status && row.status !== status) return false
      if (term) {
        const haystack = `${row.employee?.first_name ?? ''} ${row.employee?.last_name ?? ''} ${row.employee?.employee_code ?? ''} ${row.leave_type?.name ?? ''}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }, [rows, status, search])

  /** HR admin reviews anything pending; a manager only direct reports, never self. */
  function canReview(row: LeaveRequestWithRelations): boolean {
    if (row.status !== 'pending') return false
    if (isAdmin) return true
    if (isManager && myEmployeeId) {
      return row.employee_id !== myEmployeeId && row.employee?.manager_id === myEmployeeId
    }
    return false
  }

  const hasFilters = !!(status || search)

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Pending Requests" value={summary.pending} tone="text-amber-600" loading={requests.isPending} />
        <StatCard label="Approved" value={summary.approved} tone="text-emerald-600" loading={requests.isPending} />
        <StatCard label="Rejected" value={summary.rejected} tone="text-red-600" loading={requests.isPending} />
        <StatCard label="Employees on Leave" value={summary.onLeaveToday} tone="text-violet-600" loading={requests.isPending} />
      </div>

      {/* Filter bar */}
      <Card className="mb-4 mt-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by leave status"
            className={selectClass}
          >
            <option value="">All statuses</option>
            {Object.entries(LEAVE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee or leave type…"
              aria-label="Search leave requests"
              className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100"
            />
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
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
        {requests.isPending ? (
          <TableSkeleton rows={6} />
        ) : requests.isError ? (
          <ErrorState onRetry={() => void requests.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'No requests match your filters' : 'No leave requests yet'}
            message={hasFilters ? 'Try adjusting or clearing the filters above.' : undefined}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-medium">Employee</th>
                    <th scope="col" className="px-4 py-3 font-medium">Leave Type</th>
                    <th scope="col" className="px-4 py-3 font-medium">Start</th>
                    <th scope="col" className="px-4 py-3 font-medium">End</th>
                    <th scope="col" className="px-4 py-3 font-medium">Days</th>
                    <th scope="col" className="px-4 py-3 font-medium">Reason</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 font-medium">Submitted</th>
                    <th scope="col" className="px-4 py-3 font-medium">Approver</th>
                    <th scope="col" className="px-4 py-3 font-medium">Actions</th>
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
                            <p className="max-w-[160px] truncate font-medium text-slate-800">
                              {row.employee ? fullName(row.employee) : '—'}
                            </p>
                            <p className="font-mono text-xs text-slate-500">{row.employee?.employee_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{row.leave_type?.name ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(row.start_date)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(row.end_date)}</td>
                      <td className="px-4 py-2.5 text-slate-600">{row.days_requested}</td>
                      <td className="max-w-[200px] truncate px-4 py-2.5 text-slate-600" title={row.reason}>
                        {row.reason}
                      </td>
                      <td className="px-4 py-2.5"><LeaveStatusBadge status={row.status} /></td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(row.created_at)}</td>
                      <td className="px-4 py-2.5 text-slate-600">{row.reviewer?.full_name ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        {canReview(row) ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setReview({ request: row, decision: 'approved' })}
                              aria-label={`Approve leave for ${row.employee ? fullName(row.employee) : 'employee'}`}
                            >
                              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setReview({ request: row, decision: 'rejected' })}
                              aria-label={`Reject leave for ${row.employee ? fullName(row.employee) : 'employee'}`}
                            >
                              <X className="h-3.5 w-3.5 text-red-600" aria-hidden /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / tablet cards */}
            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:hidden">
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
                      <p className="truncate text-xs text-slate-500">{row.leave_type?.name ?? '—'}</p>
                    </div>
                    <LeaveStatusBadge status={row.status} />
                  </div>
                  <dl className="mt-3 space-y-1 text-xs text-slate-500">
                    <MobileRow
                      label="Dates"
                      value={`${formatDate(row.start_date)} – ${formatDate(row.end_date)} (${row.days_requested}d)`}
                    />
                    <MobileRow label="Reason" value={row.reason} />
                    {row.reviewer?.full_name && <MobileRow label="Approver" value={row.reviewer.full_name} />}
                  </dl>
                  {canReview(row) && (
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setReview({ request: row, decision: 'approved' })}
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> Approve
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setReview({ request: row, decision: 'rejected' })}
                      >
                        <X className="h-3.5 w-3.5 text-red-600" aria-hidden /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <ReviewLeaveModal
        request={review?.request ?? null}
        decision={review?.decision ?? 'approved'}
        onClose={() => setReview(null)}
      />
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
      <dt className="shrink-0">{label}</dt>
      <dd className="truncate text-right font-medium text-slate-700">{value}</dd>
    </div>
  )
}
