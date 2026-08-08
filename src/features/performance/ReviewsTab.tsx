import { useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/StatusBadge'
import { TableSkeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/states'
import { useCycles, useReviews } from '../../hooks/usePerformance'
import {
  REVIEW_STATUS_LABELS,
  formatRating,
  ratingDistribution,
} from '../../lib/performance'
import { fullName } from '../../lib/format'
import { RatingBadge } from './ReviewDrawer'
import type { PerformanceReviewWithRelations, ReviewStatus } from '../../types/db'

const selectClass =
  'rounded-lg border border-slate-300 bg-white py-1.5 pl-2.5 pr-7 text-sm text-slate-700 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100'

const DISTRIBUTION_COLORS: Record<string, string> = {
  Exceptional: '#5ba85f',
  'Exceeds Expectations': '#3b74d9',
  'Meets Expectations': '#8ba3c2',
  'Needs Improvement': '#f0a04b',
  Unsatisfactory: '#e26d7a',
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <Badge tone={status === 'completed' ? 'green' : 'amber'} label={REVIEW_STATUS_LABELS[status]} />
  )
}

interface ReviewsTabProps {
  onOpenReview: (review: PerformanceReviewWithRelations) => void
}

export function ReviewsTab({ onOpenReview }: ReviewsTabProps) {
  const reviews = useReviews()
  const cycles = useCycles()

  const [cycleFilter, setCycleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = useMemo(
    () =>
      (reviews.data ?? []).filter((r) => {
        if (cycleFilter && r.cycle_id !== cycleFilter) return false
        if (statusFilter && r.status !== statusFilter) return false
        return true
      }),
    [reviews.data, cycleFilter, statusFilter],
  )

  const distribution = useMemo(() => {
    const completed = filtered.filter((r) => r.status === 'completed' && r.overall_rating !== null)
    return {
      total: completed.length,
      bands: ratingDistribution(completed.map((r) => r.overall_rating!)).filter(
        (b) => b.label !== 'Unsatisfactory' || b.count > 0,
      ),
    }
  }, [filtered])

  return (
    <div>
      {/* Filter bar + compact distribution */}
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="p-3 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              aria-label="Filter by review cycle"
              className={selectClass}
            >
              <option value="">All cycles</option>
              {(cycles.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by review status"
              className={selectClass}
            >
              <option value="">All statuses</option>
              {Object.entries(REVIEW_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-500">
              <ClipboardList className="h-3.5 w-3.5" aria-hidden />
              {filtered.length} review{filtered.length === 1 ? '' : 's'}
            </span>
          </div>
        </Card>
        <Card className="p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Rating distribution
          </p>
          {distribution.total === 0 ? (
            <p className="text-xs text-slate-400">No completed reviews in view.</p>
          ) : (
            <ul className="space-y-1">
              {distribution.bands.map((band) => (
                <li key={band.label} className="flex items-center gap-2 text-xs">
                  <span className="w-36 shrink-0 truncate text-slate-600">{band.label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${(band.count / distribution.total) * 100}%`,
                        backgroundColor: DISTRIBUTION_COLORS[band.label],
                      }}
                    />
                  </span>
                  <span className="w-4 shrink-0 text-right font-medium text-slate-700">{band.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        {reviews.isPending ? (
          <TableSkeleton rows={6} />
        ) : reviews.isError ? (
          <ErrorState onRetry={() => void reviews.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No reviews in view" message="Adjust the filters or create a new review." />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-medium">Employee</th>
                    <th scope="col" className="px-4 py-3 font-medium">Department</th>
                    <th scope="col" className="px-4 py-3 font-medium">Cycle</th>
                    <th scope="col" className="px-4 py-3 font-medium">Reviewer</th>
                    <th scope="col" className="px-4 py-3 font-medium">Goals</th>
                    <th scope="col" className="px-4 py-3 font-medium">Quality</th>
                    <th scope="col" className="px-4 py-3 font-medium">Collab.</th>
                    <th scope="col" className="px-4 py-3 font-medium">Initiative</th>
                    <th scope="col" className="px-4 py-3 font-medium">Overall</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((review) => (
                    <tr key={review.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={review.employee ? fullName(review.employee) : '?'}
                            src={review.employee?.avatar_url}
                            size="sm"
                          />
                          <p className="max-w-[160px] truncate font-medium text-slate-800">
                            {review.employee ? fullName(review.employee) : '—'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{review.employee?.department?.name ?? '—'}</td>
                      <td className="max-w-[150px] truncate px-4 py-2.5 text-slate-600">{review.cycle?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {review.reviewer ? `${review.reviewer.first_name} ${review.reviewer.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{review.goal_achievement_rating ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-600">{review.quality_rating ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-600">{review.collaboration_rating ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-600">{review.initiative_rating ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        {review.overall_rating !== null ? (
                          <span className="font-semibold text-slate-800">{formatRating(review.overall_rating)}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-2.5"><ReviewStatusBadge status={review.status} /></td>
                      <td className="px-4 py-2.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenReview(review)}
                          aria-label={`Open review for ${review.employee ? fullName(review.employee) : 'employee'}`}
                        >
                          {review.status === 'pending' ? 'Review' : 'View'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:hidden">
              {filtered.map((review) => (
                <button
                  key={review.id}
                  type="button"
                  onClick={() => onOpenReview(review)}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-card transition-shadow hover:shadow-panel"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={review.employee ? fullName(review.employee) : '?'}
                      src={review.employee?.avatar_url}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {review.employee ? fullName(review.employee) : '—'}
                      </p>
                      <p className="truncate text-xs text-slate-500">{review.cycle?.name ?? '—'}</p>
                    </div>
                    <ReviewStatusBadge status={review.status} />
                  </div>
                  <div className="mt-3">
                    {review.overall_rating !== null ? (
                      <RatingBadge rating={review.overall_rating} />
                    ) : (
                      <p className="text-xs text-slate-400">Awaiting review</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
