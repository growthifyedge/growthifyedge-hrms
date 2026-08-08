import { useMemo } from 'react'
import { Card } from '../../../components/ui/Card'
import { Skeleton } from '../../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../../components/ui/states'
import { useEmployeeGoals, useEmployeeReviews } from '../../../hooks/usePerformance'
import { GOAL_CATEGORY_LABELS } from '../../../lib/performance'
import { formatDate } from '../../../lib/format'
import { GoalProgressBar, GoalStatusBadge } from '../../performance/GoalsTab'
import { RatingBadge } from '../../performance/ReviewDrawer'

/** Employee profile → Performance: goals + latest completed review. */
export function PerformanceTab({ employeeId }: { employeeId: string }) {
  const goals = useEmployeeGoals(employeeId)
  const reviews = useEmployeeReviews(employeeId)

  const latestReview = useMemo(
    () =>
      (reviews.data ?? [])
        .filter((r) => r.status === 'completed' && r.overall_rating !== null)
        .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))[0] ?? null,
    [reviews.data],
  )

  const dims = latestReview
    ? [
        { label: 'Goal Achievement', value: latestReview.goal_achievement_rating },
        { label: 'Quality', value: latestReview.quality_rating },
        { label: 'Collaboration', value: latestReview.collaboration_rating },
        { label: 'Initiative', value: latestReview.initiative_rating },
      ]
    : []

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Goals</h3>
        {goals.isPending ? (
          <Skeleton className="h-40" />
        ) : goals.isError ? (
          <ErrorState onRetry={() => void goals.refetch()} />
        ) : (goals.data?.length ?? 0) === 0 ? (
          <EmptyState title="No goals yet" message="Goals for this employee will appear here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {(goals.data ?? []).slice(0, 8).map((goal) => (
              <li key={goal.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{goal.title}</p>
                  <GoalStatusBadge status={goal.status} />
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <GoalProgressBar value={goal.progress_percent} />
                  <p className="text-xs text-slate-500">
                    {GOAL_CATEGORY_LABELS[goal.category]} · Target {formatDate(goal.target_date)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Latest review</h3>
        {reviews.isPending ? (
          <Skeleton className="h-40" />
        ) : reviews.isError ? (
          <ErrorState onRetry={() => void reviews.refetch()} />
        ) : !latestReview ? (
          <EmptyState
            title="No completed reviews"
            message="Completed performance reviews will appear here."
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {latestReview.overall_rating !== null && <RatingBadge rating={latestReview.overall_rating} />}
            </div>
            <dl className="divide-y divide-slate-100 text-sm">
              {dims.map((d) => (
                <div key={d.label} className="flex justify-between py-2">
                  <dt className="text-slate-500">{d.label}</dt>
                  <dd className="font-semibold text-slate-800">{d.value ?? '—'} / 5</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-slate-500">
              {latestReview.cycle?.name ?? '—'} · Reviewed by{' '}
              {latestReview.reviewer
                ? `${latestReview.reviewer.first_name} ${latestReview.reviewer.last_name}`
                : '—'}{' '}
              · {formatDate(latestReview.completed_at)}
            </p>
            {latestReview.overall_comments && (
              <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                {latestReview.overall_comments}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
