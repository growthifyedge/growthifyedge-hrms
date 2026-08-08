import { useMemo, useState } from 'react'
import { Check, CircleDashed } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/StatusBadge'
import { Drawer } from '../../components/ui/Drawer'
import { TableSkeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/states'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useOnboardingList, useToggleOnboardingTask, type OnboardingEntry } from '../../hooks/useOnboarding'
import { formatDate, fullName } from '../../lib/format'
import { MobileRow, StatCard } from './JobsTab'

export function OnboardingTab() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'hr_admin'
  const list = useOnboardingList()
  const [openEmployeeId, setOpenEmployeeId] = useState<string | null>(null)

  const stats = useMemo(() => {
    const entries = list.data ?? []
    const completed = entries.filter((e) => e.progress === 100).length
    const avg =
      entries.length === 0
        ? 0
        : Math.round(entries.reduce((sum, e) => sum + e.progress, 0) / entries.length)
    return {
      newHires: entries.length,
      inProgress: entries.length - completed,
      completed,
      avgProgress: `${avg}%`,
    }
  }, [list.data])

  const selected = (list.data ?? []).find((e) => e.employee.id === openEmployeeId) ?? null

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="New Hires" value={stats.newHires} tone="text-slate-900" loading={list.isPending} />
        <StatCard label="In Progress" value={stats.inProgress} tone="text-amber-600" loading={list.isPending} />
        <StatCard label="Completed" value={stats.completed} tone="text-emerald-600" loading={list.isPending} />
        <StatCard label="Average Progress" value={stats.avgProgress} tone="text-accent-600" loading={list.isPending} />
      </div>

      <Card className="mt-4">
        {list.isPending ? (
          <TableSkeleton rows={4} />
        ) : list.isError ? (
          <ErrorState onRetry={() => void list.refetch()} />
        ) : (list.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No onboarding in progress"
            message="Hired candidates start onboarding automatically."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-medium">Employee</th>
                    <th scope="col" className="px-4 py-3 font-medium">Department</th>
                    <th scope="col" className="px-4 py-3 font-medium">Joining Date</th>
                    <th scope="col" className="px-4 py-3 font-medium">Manager</th>
                    <th scope="col" className="px-4 py-3 font-medium">Progress</th>
                    <th scope="col" className="px-4 py-3 font-medium">Tasks</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(list.data ?? []).map((entry) => (
                    <tr
                      key={entry.employee.id}
                      onClick={() => setOpenEmployeeId(entry.employee.id)}
                      className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={fullName(entry.employee)} src={entry.employee.avatar_url} size="sm" />
                          <div className="min-w-0">
                            <p className="max-w-[180px] truncate font-medium text-slate-800">
                              {fullName(entry.employee)}
                            </p>
                            <p className="font-mono text-xs text-slate-500">{entry.employee.employee_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{entry.employee.department?.name ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                        {formatDate(entry.employee.joining_date)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {entry.employee.manager
                          ? `${entry.employee.manager.first_name} ${entry.employee.manager.last_name}`
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <ProgressBar value={entry.progress} />
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {entry.completed} / {entry.tasks.length}
                      </td>
                      <td className="px-4 py-2.5">
                        {entry.progress === 100 ? (
                          <Badge tone="green" label="Onboarding Complete" />
                        ) : (
                          <Badge tone="amber" label="In Progress" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 md:hidden">
              {(list.data ?? []).map((entry) => (
                <button
                  key={entry.employee.id}
                  type="button"
                  onClick={() => setOpenEmployeeId(entry.employee.id)}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-card transition-shadow hover:shadow-panel"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={fullName(entry.employee)} src={entry.employee.avatar_url} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{fullName(entry.employee)}</p>
                      <p className="truncate text-xs text-slate-500">{entry.employee.department?.name ?? '—'}</p>
                    </div>
                    {entry.progress === 100 ? (
                      <Badge tone="green" label="Complete" />
                    ) : (
                      <Badge tone="amber" label={`${entry.progress}%`} />
                    )}
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={entry.progress} />
                  </div>
                  <dl className="mt-2 space-y-1 text-xs text-slate-500">
                    <MobileRow label="Joined" value={formatDate(entry.employee.joining_date)} />
                    <MobileRow label="Tasks" value={`${entry.completed} / ${entry.tasks.length}`} />
                  </dl>
                </button>
              ))}
            </div>
          </>
        )}
      </Card>

      <OnboardingDrawer entry={selected} canManage={isAdmin} onClose={() => setOpenEmployeeId(null)} />
    </div>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 w-24 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Onboarding progress"
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

function OnboardingDrawer({
  entry,
  canManage,
  onClose,
}: {
  entry: OnboardingEntry | null
  canManage: boolean
  onClose: () => void
}) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const toggle = useToggleOnboardingTask()

  if (!entry) return null

  async function toggleTask(taskId: string, completed: boolean) {
    if (!profile) return
    try {
      await toggle.mutateAsync({ taskId, completed, profileId: profile.id })
    } catch {
      toast('error', 'Could not update the task. Please try again.')
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Onboarding — ${fullName(entry.employee)}`}
      subtitle={`Joined ${formatDate(entry.employee.joining_date)} · ${entry.completed} of ${entry.tasks.length} tasks complete`}
    >
      <div className="mb-4">
        <ProgressBar value={entry.progress} />
      </div>
      {entry.progress === 100 && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700">
          Onboarding Complete
        </p>
      )}
      <ul className="divide-y divide-slate-100">
        {entry.tasks.map((task) => {
          const done = task.status === 'completed'
          return (
            <li key={task.id} className="flex items-center gap-3 py-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {done ? <Check className="h-4 w-4" aria-hidden /> : <CircleDashed className="h-4 w-4" aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${done ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                  {task.title}
                </p>
                {done && task.completed_at && (
                  <p className="text-xs text-slate-400">Completed {formatDate(task.completed_at)}</p>
                )}
              </div>
              {canManage && (
                <Button
                  variant={done ? 'ghost' : 'secondary'}
                  size="sm"
                  onClick={() => void toggleTask(task.id, !done)}
                  aria-label={`${done ? 'Reopen' : 'Complete'} task ${task.title}`}
                >
                  {done ? 'Reopen' : 'Complete'}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </Drawer>
  )
}
