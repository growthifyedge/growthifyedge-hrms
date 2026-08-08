import { useState } from 'react'
import { CheckCheck, Lock, Table2 } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/StatusBadge'
import { ConfirmDialog } from '../../components/ui/Modal'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { TableSkeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/states'
import { useToast } from '../../contexts/ToastContext'
import { useFinalizePayrollRun, useMarkPayrollPaid, usePayrollRuns } from '../../hooks/usePayroll'
import { PAYROLL_STATUS_LABELS, PAYROLL_STATUS_TONES, formatPeriod } from '../../lib/payroll'
import { formatDate } from '../../lib/format'
import { getErrorMessage } from '../../lib/utils'
import type { PayrollRun, PayrollStatus } from '../../types/db'

export function PayrollStatusBadge({ status }: { status: PayrollStatus }) {
  return <Badge tone={PAYROLL_STATUS_TONES[status] ?? 'slate'} label={PAYROLL_STATUS_LABELS[status] ?? status} />
}

interface RunsTabProps {
  onOpenEntries: (runId: string) => void
}

export function RunsTab({ onOpenEntries }: RunsTabProps) {
  const { toast } = useToast()
  const runs = usePayrollRuns()
  const finalize = useFinalizePayrollRun()
  const markPaid = useMarkPayrollPaid()
  const [confirmAction, setConfirmAction] = useState<{ run: PayrollRun; kind: 'finalize' | 'paid' } | null>(null)

  async function onConfirm() {
    if (!confirmAction) return
    const { run, kind } = confirmAction
    try {
      if (kind === 'finalize') {
        await finalize.mutateAsync(run.id)
        toast('success', `${formatPeriod(run.period_month)} payroll finalized.`)
      } else {
        await markPaid.mutateAsync(run.id)
        toast('success', `${formatPeriod(run.period_month)} payroll marked as paid.`)
      }
      setConfirmAction(null)
    } catch (err) {
      const message = getErrorMessage(err)
      toast(
        'error',
        /draft|finalized|entries/i.test(message)
          ? message.replace(/^.*?:\s*/, '')
          : 'Could not update the payroll run. Please try again.',
      )
    }
  }

  return (
    <>
      <Card>
        {runs.isPending ? (
          <TableSkeleton rows={4} />
        ) : runs.isError ? (
          <ErrorState onRetry={() => void runs.refetch()} />
        ) : (runs.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No payroll runs yet"
            message="Create the first payroll run to snapshot current compensation."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-medium">Month</th>
                    <th scope="col" className="px-4 py-3 font-medium">Employees</th>
                    <th scope="col" className="px-4 py-3 font-medium">Gross</th>
                    <th scope="col" className="px-4 py-3 font-medium">Deductions</th>
                    <th scope="col" className="px-4 py-3 font-medium">Net</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 font-medium">Finalized</th>
                    <th scope="col" className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(runs.data ?? []).map((run) => (
                    <tr key={run.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-800">
                        {formatPeriod(run.period_month)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{run.employee_count}</td>
                      <td className="px-4 py-2.5 text-slate-600"><MoneyDisplay amountUsd={run.total_gross} /></td>
                      <td className="px-4 py-2.5 text-slate-600"><MoneyDisplay amountUsd={run.total_deductions} /></td>
                      <td className="px-4 py-2.5 font-medium text-slate-800"><MoneyDisplay amountUsd={run.total_net} /></td>
                      <td className="px-4 py-2.5"><PayrollStatusBadge status={run.status} /></td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                        {run.finalized_at ? formatDate(run.finalized_at) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenEntries(run.id)}
                            aria-label={`View entries for ${formatPeriod(run.period_month)}`}
                          >
                            <Table2 className="h-3.5 w-3.5" aria-hidden /> Entries
                          </Button>
                          {run.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmAction({ run, kind: 'finalize' })}
                              aria-label={`Finalize payroll for ${formatPeriod(run.period_month)}`}
                            >
                              <Lock className="h-3.5 w-3.5 text-accent-600" aria-hidden /> Finalize
                            </Button>
                          )}
                          {run.status === 'finalized' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmAction({ run, kind: 'paid' })}
                              aria-label={`Mark payroll paid for ${formatPeriod(run.period_month)}`}
                            >
                              <CheckCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> Mark as Paid
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 md:hidden">
              {(runs.data ?? []).map((run) => (
                <div key={run.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{formatPeriod(run.period_month)}</p>
                    <PayrollStatusBadge status={run.status} />
                  </div>
                  <dl className="mt-3 space-y-1 text-xs text-slate-500">
                    <MobileRow label="Employees" value={String(run.employee_count)} />
                    <MobileRow label="Gross" value={<MoneyDisplay amountUsd={run.total_gross} />} />
                    <MobileRow label="Deductions" value={<MoneyDisplay amountUsd={run.total_deductions} />} />
                    <MobileRow label="Net" value={<MoneyDisplay amountUsd={run.total_net} />} />
                  </dl>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => onOpenEntries(run.id)}>
                      Entries
                    </Button>
                    {run.status === 'draft' && (
                      <Button size="sm" onClick={() => setConfirmAction({ run, kind: 'finalize' })}>
                        Finalize
                      </Button>
                    )}
                    {run.status === 'finalized' && (
                      <Button size="sm" onClick={() => setConfirmAction({ run, kind: 'paid' })}>
                        Mark as Paid
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => void onConfirm()}
        title={
          confirmAction?.kind === 'finalize'
            ? `Finalize ${formatPeriod(confirmAction?.run.period_month)} payroll?`
            : `Mark ${formatPeriod(confirmAction?.run.period_month)} payroll as paid?`
        }
        message={
          confirmAction?.kind === 'finalize'
            ? 'Totals are recalculated and locked. Entries become read-only and allowances/deductions can no longer be changed.'
            : 'This is a demo status change only — no actual payment is triggered or processed.'
        }
        confirmLabel={confirmAction?.kind === 'finalize' ? 'Finalize payroll' : 'Mark as Paid'}
        loading={finalize.isPending || markPaid.isPending}
      />
    </>
  )
}

export function MobileRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="shrink-0">{label}</dt>
      <dd className="truncate text-right font-medium text-slate-700">{value}</dd>
    </div>
  )
}
