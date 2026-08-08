import { useMemo, useState } from 'react'
import { CalendarRange, ClipboardPen, Plus } from 'lucide-react'
import { PageHeader } from '../../components/layout/AppShell'
import { Tabs } from '../../components/ui/Tabs'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { useAuth } from '../../contexts/AuthContext'
import { useCycles, useGoals, useReviews } from '../../hooks/usePerformance'
import { formatRating } from '../../lib/performance'
import { cn } from '../../lib/utils'
import { GoalsTab } from './GoalsTab'
import { ReviewsTab } from './ReviewsTab'
import { GoalFormDrawer } from './GoalFormDrawer'
import { ReviewDrawer } from './ReviewDrawer'
import { NewReviewDrawer } from './NewReviewDrawer'
import { CycleDrawer } from './CycleDrawer'
import type { PerformanceGoalWithRelations } from '../../types/db'

const TABS = [
  { key: 'goals', label: 'Goals' },
  { key: 'reviews', label: 'Reviews' },
]

export function PerformancePage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'hr_admin'
  const isManager = profile?.role === 'manager'
  const canManage = isAdmin || isManager
  const [tab, setTab] = useState('goals')

  const [goalDrawerOpen, setGoalDrawerOpen] = useState(false)
  const [editGoal, setEditGoal] = useState<PerformanceGoalWithRelations | null>(null)
  const [newReviewOpen, setNewReviewOpen] = useState(false)
  const [cycleOpen, setCycleOpen] = useState(false)
  const [openReviewId, setOpenReviewId] = useState<string | null>(null)

  const goals = useGoals()
  const reviews = useReviews()
  const cycles = useCycles()

  const openReview = (reviews.data ?? []).find((r) => r.id === openReviewId) ?? null

  // Page-level summary (RLS scopes managers to their team automatically).
  const stats = useMemo(() => {
    const goalRows = goals.data ?? []
    const reviewRows = reviews.data ?? []
    const activeCycleIds = new Set((cycles.data ?? []).filter((c) => c.status === 'active').map((c) => c.id))
    const completedReviews = reviewRows.filter((r) => r.status === 'completed' && r.overall_rating !== null)
    const avg =
      completedReviews.length === 0
        ? null
        : completedReviews.reduce((sum, r) => sum + (r.overall_rating ?? 0), 0) / completedReviews.length
    return {
      activeGoals: goalRows.filter((g) => g.status === 'in_progress' || g.status === 'not_started').length,
      completedGoals: goalRows.filter((g) => g.status === 'completed').length,
      reviewsDue: reviewRows.filter((r) => r.status === 'pending' && activeCycleIds.has(r.cycle_id)).length,
      averageRating: avg === null ? '—' : formatRating(Math.round(avg * 10) / 10),
    }
  }, [goals.data, reviews.data, cycles.data])

  const loading = goals.isPending || reviews.isPending || cycles.isPending

  return (
    <div>
      <PageHeader
        title="Performance"
        subtitle={
          isAdmin
            ? 'Goals and review cycles across the organization'
            : 'Goals and reviews for you and your team'
        }
        actions={
          canManage ? (
            tab === 'goals' ? (
              <Button onClick={() => { setEditGoal(null); setGoalDrawerOpen(true) }}>
                <Plus className="h-4 w-4" aria-hidden /> New Goal
              </Button>
            ) : (
              <div className="flex gap-2">
                {isAdmin && (
                  <Button variant="secondary" onClick={() => setCycleOpen(true)}>
                    <CalendarRange className="h-4 w-4" aria-hidden /> New Cycle
                  </Button>
                )}
                <Button onClick={() => setNewReviewOpen(true)}>
                  <ClipboardPen className="h-4 w-4" aria-hidden /> New Review
                </Button>
              </div>
            )
          ) : undefined
        }
      />

      {/* Summary cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Active Goals" value={stats.activeGoals} tone="text-accent-600" loading={loading} />
        <StatCard label="Goals Completed" value={stats.completedGoals} tone="text-emerald-600" loading={loading} />
        <StatCard label="Reviews Due" value={stats.reviewsDue} tone="text-amber-600" loading={loading} />
        <StatCard label="Average Rating" value={stats.averageRating} tone="text-slate-900" loading={loading} />
      </div>

      <div className="mb-5">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {tab === 'goals' && (
        <GoalsTab
          onEdit={(goal) => {
            setEditGoal(goal)
            setGoalDrawerOpen(true)
          }}
        />
      )}
      {tab === 'reviews' && <ReviewsTab onOpenReview={(r) => setOpenReviewId(r.id)} />}

      {canManage && (
        <>
          <GoalFormDrawer
            open={goalDrawerOpen}
            onClose={() => setGoalDrawerOpen(false)}
            goal={editGoal}
          />
          <NewReviewDrawer open={newReviewOpen} onClose={() => setNewReviewOpen(false)} />
        </>
      )}
      {isAdmin && <CycleDrawer open={cycleOpen} onClose={() => setCycleOpen(false)} />}
      <ReviewDrawer review={openReview} onClose={() => setOpenReviewId(null)} />
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
