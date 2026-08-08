import { Card } from '../../../components/ui/Card'
import { Skeleton } from '../../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../../components/ui/states'
import { useEmployeeLeaveRequests, useLeaveBalanceSummary } from '../../../hooks/useLeave'
import { formatDate } from '../../../lib/format'
import { LeaveStatusBadge } from '../../timeleave/LeaveTab'

/** Employee profile → Leave: balance summary + recent requests. */
export function LeaveTab({ employeeId }: { employeeId: string }) {
  const year = new Date().getFullYear()
  const balances = useLeaveBalanceSummary(employeeId, year)
  const requests = useEmployeeLeaveRequests(employeeId)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">
          Leave balances <span className="font-normal text-slate-400">({year})</span>
        </h3>
        {balances.isPending ? (
          <Skeleton className="h-40" />
        ) : balances.isError ? (
          <ErrorState onRetry={() => void balances.refetch()} />
        ) : (balances.data?.length ?? 0) === 0 ? (
          <EmptyState title="No leave balances" message="Balances have not been set up for this employee." />
        ) : (
          <ul className="space-y-4">
            {balances.data.map((b) => (
              <li key={b.leaveTypeId}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-600">{b.name}</span>
                  <span className="font-medium text-slate-800">
                    {b.isPaid ? `${b.used} used · ${b.remaining} left of ${b.entitlement}` : `${b.used} used · unpaid`}
                  </span>
                </div>
                {b.isPaid && (
                  <div
                    className="h-2 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-valuenow={b.used}
                    aria-valuemin={0}
                    aria-valuemax={b.entitlement}
                    aria-label={`${b.name} used`}
                  >
                    <div
                      className="h-full rounded-full bg-accent-600"
                      style={{ width: `${b.entitlement > 0 ? Math.min((b.used / b.entitlement) * 100, 100) : 0}%` }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Recent leave requests</h3>
        {requests.isPending ? (
          <Skeleton className="h-40" />
        ) : requests.isError ? (
          <ErrorState onRetry={() => void requests.refetch()} />
        ) : (requests.data?.length ?? 0) === 0 ? (
          <EmptyState title="No leave requests" message="Requests for this employee will appear here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {requests.data.map((req) => (
              <li key={req.id} className="py-2.5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-slate-800">{req.leave_type?.name ?? 'Leave'}</span>
                  <LeaveStatusBadge status={req.status} />
                  <span className="ml-auto text-xs text-slate-500">
                    {req.days_requested} day{req.days_requested === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatDate(req.start_date)} – {formatDate(req.end_date)} · {req.reason}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
