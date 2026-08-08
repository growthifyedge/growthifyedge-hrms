import { useState } from 'react'
import { Pencil, Search } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { TableSkeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/states'
import { usePayrollEntries, usePayrollRuns } from '../../hooks/usePayroll'
import { PAYROLL_STATUS_LABELS, formatPeriod } from '../../lib/payroll'
import { fullName } from '../../lib/format'
import { PayrollStatusBadge, MobileRow } from './RunsTab'
import { EditEntryDrawer } from './EditEntryDrawer'
import type { PayrollEntryWithRelations } from '../../types/db'

const selectClass =
  'rounded-lg border border-slate-300 bg-white py-1.5 pl-2.5 pr-7 text-sm text-slate-700 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100'

interface EntriesTabProps {
  runId: string | null
  onSelectRun: (runId: string) => void
}

export function EntriesTab({ runId, onSelectRun }: EntriesTabProps) {
  const runs = usePayrollRuns()
  const entries = usePayrollEntries(runId)
  const [search, setSearch] = useState('')
  const [editEntry, setEditEntry] = useState<PayrollEntryWithRelations | null>(null)

  const run = (runs.data ?? []).find((r) => r.id === runId) ?? null
  const isDraft = run?.status === 'draft'

  const term = search.trim().toLowerCase()
  const filtered = (entries.data ?? []).filter((e) => {
    if (!term) return true
    return `${e.employee?.first_name ?? ''} ${e.employee?.last_name ?? ''} ${e.employee?.employee_code ?? ''}`
      .toLowerCase()
      .includes(term)
  })

  return (
    <div>
      {/* Run selector + search */}
      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={runId ?? ''}
            onChange={(e) => onSelectRun(e.target.value)}
            aria-label="Select payroll run"
            className={selectClass}
          >
            {(runs.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {formatPeriod(r.period_month)} — {PAYROLL_STATUS_LABELS[r.status]}
              </option>
            ))}
          </select>
          {run && <PayrollStatusBadge status={run.status} />}
          {run && !isDraft && (
            <span className="text-xs text-slate-500">Read-only — this payroll is locked.</span>
          )}
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee…"
              aria-label="Search payroll entries"
              className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100"
            />
          </div>
        </div>
      </Card>

      <Card>
        {!runId ? (
          <EmptyState title="No payroll run selected" message="Create a payroll run to see employee entries." />
        ) : entries.isPending ? (
          <TableSkeleton rows={8} />
        ) : entries.isError ? (
          <ErrorState onRetry={() => void entries.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState title={term ? 'No employees match your search' : 'No entries in this run'} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-medium">Employee</th>
                    <th scope="col" className="px-4 py-3 font-medium">Department</th>
                    <th scope="col" className="px-4 py-3 font-medium">Base Pay</th>
                    <th scope="col" className="px-4 py-3 font-medium">Allowances</th>
                    <th scope="col" className="px-4 py-3 font-medium">Deductions</th>
                    <th scope="col" className="px-4 py-3 font-medium">Gross</th>
                    <th scope="col" className="px-4 py-3 font-medium">Net</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={entry.employee ? fullName(entry.employee) : '?'}
                            src={entry.employee?.avatar_url}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="max-w-[170px] truncate font-medium text-slate-800">
                              {entry.employee ? fullName(entry.employee) : '—'}
                            </p>
                            <p className="font-mono text-xs text-slate-500">{entry.employee?.employee_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{entry.employee?.department?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-600"><MoneyDisplay amountUsd={entry.base_pay} /></td>
                      <td className="px-4 py-2.5 text-slate-600"><MoneyDisplay amountUsd={entry.allowances} /></td>
                      <td className="px-4 py-2.5 text-slate-600"><MoneyDisplay amountUsd={entry.deductions} /></td>
                      <td className="px-4 py-2.5 text-slate-600"><MoneyDisplay amountUsd={entry.gross_pay} /></td>
                      <td className="px-4 py-2.5 font-medium text-slate-800"><MoneyDisplay amountUsd={entry.net_pay} /></td>
                      <td className="px-4 py-2.5"><PayrollStatusBadge status={entry.status} /></td>
                      <td className="px-4 py-2.5">
                        {isDraft ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditEntry(entry)}
                            aria-label={`Edit payroll for ${entry.employee ? fullName(entry.employee) : 'employee'}`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">Locked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 md:hidden">
              {filtered.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={entry.employee ? fullName(entry.employee) : '?'}
                      src={entry.employee?.avatar_url}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {entry.employee ? fullName(entry.employee) : '—'}
                      </p>
                      <p className="truncate text-xs text-slate-500">{entry.employee?.department?.name ?? '—'}</p>
                    </div>
                    <PayrollStatusBadge status={entry.status} />
                  </div>
                  <dl className="mt-3 space-y-1 text-xs text-slate-500">
                    <MobileRow label="Base" value={<MoneyDisplay amountUsd={entry.base_pay} />} />
                    <MobileRow label="Allowances" value={<MoneyDisplay amountUsd={entry.allowances} />} />
                    <MobileRow label="Deductions" value={<MoneyDisplay amountUsd={entry.deductions} />} />
                    <MobileRow label="Net" value={<MoneyDisplay amountUsd={entry.net_pay} />} />
                  </dl>
                  {isDraft && (
                    <div className="mt-3 flex justify-end">
                      <Button variant="secondary" size="sm" onClick={() => setEditEntry(entry)}>
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

      <EditEntryDrawer entry={editEntry} onClose={() => setEditEntry(null)} />
    </div>
  )
}
