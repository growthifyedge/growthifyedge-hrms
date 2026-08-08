import { useMemo, useState } from 'react'
import { Pencil, Search, X } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/StatusBadge'
import { TableSkeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/states'
import { useAuth } from '../../contexts/AuthContext'
import { useGoals } from '../../hooks/usePerformance'
import { GOAL_CATEGORY_LABELS, GOAL_STATUS_LABELS } from '../../lib/performance'
import { formatDate, fullName } from '../../lib/format'
import type { GoalStatus, PerformanceGoalWithRelations } from '../../types/db'

const GOAL_STATUS_TONES: Record<GoalStatus, 'slate' | 'blue' | 'green' | 'red'> = {
  not_started: 'slate',
  in_progress: 'blue',
  completed: 'green',
  cancelled: 'red',
}

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  return <Badge tone={GOAL_STATUS_TONES[status] ?? 'slate'} label={GOAL_STATUS_LABELS[status] ?? status} />
}

export function GoalProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 w-20 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Goal progress"
      >
        <div
          className={`h-full rounded-full ${value === 100 ? 'bg-emerald-500' : 'bg-accent-600'}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-600">{value}%</span>
    </div>
  )
}

const selectClass =
  'rounded-lg border border-slate-300 bg-white py-1.5 pl-2.5 pr-7 text-sm text-slate-700 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100'

interface GoalsTabProps {
  onEdit: (goal: PerformanceGoalWithRelations) => void
}

export function GoalsTab({ onEdit }: GoalsTabProps) {
  const { profile, employee } = useAuth()
  const isAdmin = profile?.role === 'hr_admin'
  const myEmployeeId = employee?.id ?? null
  const goals = useGoals()

  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (goals.data ?? []).filter((g) => {
      if (category && g.category !== category) return false
      if (status && g.status !== status) return false
      if (term) {
        const haystack = `${g.title} ${g.employee?.first_name ?? ''} ${g.employee?.last_name ?? ''} ${g.employee?.employee_code ?? ''}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }, [goals.data, category, status, search])

  /** HR admin edits anything; a manager edits direct-report goals only. */
  function canManage(goal: PerformanceGoalWithRelations): boolean {
    if (isAdmin) return true
    return !!myEmployeeId && goal.employee?.manager_id === myEmployeeId
  }

  const hasFilters = !!(category || status || search)

  return (
    <div>
      {/* Filter bar */}
      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category" className={selectClass}>
            <option value="">All categories</option>
            {Object.entries(GOAL_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by goal status" className={selectClass}>
            <option value="">All statuses</option>
            {Object.entries(GOAL_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search goals or employees…"
              aria-label="Search goals"
              className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100"
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setCategory(''); setStatus(''); setSearch('') }}>
              <X className="h-3.5 w-3.5" aria-hidden /> Clear filters
            </Button>
          )}
        </div>
      </Card>

      <Card>
        {goals.isPending ? (
          <TableSkeleton rows={8} />
        ) : goals.isError ? (
          <ErrorState onRetry={() => void goals.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'No goals match your filters' : 'No goals yet'}
            message={hasFilters ? 'Try adjusting or clearing the filters above.' : 'Create the first goal to get started.'}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-medium">Employee</th>
                    <th scope="col" className="px-4 py-3 font-medium">Goal</th>
                    <th scope="col" className="px-4 py-3 font-medium">Category</th>
                    <th scope="col" className="px-4 py-3 font-medium">Target Date</th>
                    <th scope="col" className="px-4 py-3 font-medium">Progress</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 font-medium">Manager</th>
                    <th scope="col" className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((goal) => (
                    <tr key={goal.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={goal.employee ? fullName(goal.employee) : '?'}
                            src={goal.employee?.avatar_url}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="max-w-[160px] truncate font-medium text-slate-800">
                              {goal.employee ? fullName(goal.employee) : '—'}
                            </p>
                            <p className="text-xs text-slate-500">{goal.employee?.department?.name ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[260px] px-4 py-2.5">
                        <p className="truncate font-medium text-slate-800" title={goal.title}>{goal.title}</p>
                        {goal.description && (
                          <p className="truncate text-xs text-slate-500" title={goal.description}>{goal.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{GOAL_CATEGORY_LABELS[goal.category]}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(goal.target_date)}</td>
                      <td className="px-4 py-2.5"><GoalProgressBar value={goal.progress_percent} /></td>
                      <td className="px-4 py-2.5"><GoalStatusBadge status={goal.status} /></td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {goal.manager ? `${goal.manager.first_name} ${goal.manager.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {canManage(goal) ? (
                          <Button variant="ghost" size="sm" onClick={() => onEdit(goal)} aria-label={`Edit goal ${goal.title}`}>
                            <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 md:hidden">
              {filtered.map((goal) => (
                <div key={goal.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{goal.title}</p>
                      <p className="truncate text-xs text-slate-500">
                        {goal.employee ? fullName(goal.employee) : '—'} · {GOAL_CATEGORY_LABELS[goal.category]}
                      </p>
                    </div>
                    <GoalStatusBadge status={goal.status} />
                  </div>
                  <div className="mt-3">
                    <GoalProgressBar value={goal.progress_percent} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Target {formatDate(goal.target_date)}</p>
                  {canManage(goal) && (
                    <div className="mt-3 flex justify-end">
                      <Button variant="secondary" size="sm" onClick={() => onEdit(goal)}>
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
