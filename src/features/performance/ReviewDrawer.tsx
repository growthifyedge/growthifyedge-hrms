import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/StatusBadge'
import { FormSection, SelectField, TextAreaField } from '../../components/ui/form'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { useCompleteReview, useEmployeeGoals } from '../../hooks/usePerformance'
import {
  RATING_DIMENSIONS,
  RATING_LABEL_TONES,
  formatRating,
  overallRating,
  ratingLabel,
} from '../../lib/performance'
import { getErrorMessage } from '../../lib/utils'
import { formatDate, fullName } from '../../lib/format'
import { reviewFormSchema, type ReviewFormInput, type ReviewFormValues } from './schemas'
import type { PerformanceReviewWithRelations } from '../../types/db'

export function RatingBadge({ rating }: { rating: number }) {
  const label = ratingLabel(rating)
  return <Badge tone={RATING_LABEL_TONES[label]} label={`${formatRating(rating)} · ${label}`} />
}

interface ReviewDrawerProps {
  review: PerformanceReviewWithRelations | null
  onClose: () => void
}

/** Completed reviews render read-only; pending ones show the rating form. */
export function ReviewDrawer({ review, onClose }: ReviewDrawerProps) {
  const { toast } = useToast()
  const { profile, employee } = useAuth()
  const isAdmin = profile?.role === 'hr_admin'
  const myEmployeeId = employee?.id ?? null

  const goals = useEmployeeGoals(review?.employee_id)
  const complete = useCompleteReview()

  const canComplete = useMemo(() => {
    if (!review || review.status !== 'pending') return false
    if (isAdmin) return true
    if (profile?.role === 'manager' && myEmployeeId) {
      return review.employee_id !== myEmployeeId && review.employee?.manager_id === myEmployeeId
    }
    return false
  }, [review, isAdmin, profile?.role, myEmployeeId])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ReviewFormInput, unknown, ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      goal_achievement_rating: '' as unknown as number,
      quality_rating: '' as unknown as number,
      collaboration_rating: '' as unknown as number,
      initiative_rating: '' as unknown as number,
      strengths: '',
      development_areas: '',
      overall_comments: '',
    },
  })

  useEffect(() => {
    if (review) reset()
  }, [review, reset])

  const watched = watch([
    'goal_achievement_rating',
    'quality_rating',
    'collaboration_rating',
    'initiative_rating',
  ])
  const allRated = watched.every((v) => Number(v) >= 1 && Number(v) <= 5)
  const previewOverall = allRated
    ? overallRating(Number(watched[0]), Number(watched[1]), Number(watched[2]), Number(watched[3]))
    : null

  const goalContext = useMemo(() => {
    const rows = goals.data ?? []
    const relevant = rows.filter((g) => g.status === 'in_progress' || g.status === 'completed')
    const avg =
      relevant.length === 0
        ? null
        : Math.round(relevant.reduce((sum, g) => sum + g.progress_percent, 0) / relevant.length)
    return { count: relevant.length, avg }
  }, [goals.data])

  if (!review) return null

  async function onSubmit(values: ReviewFormValues) {
    if (!review) return
    try {
      await complete.mutateAsync({
        reviewId: review.id,
        goalAchievement: values.goal_achievement_rating,
        quality: values.quality_rating,
        collaboration: values.collaboration_rating,
        initiative: values.initiative_rating,
        strengths: values.strengths || undefined,
        developmentAreas: values.development_areas || undefined,
        overallComments: values.overall_comments || undefined,
      })
      toast('success', 'Review completed.')
      onClose()
    } catch (err) {
      const message = getErrorMessage(err)
      toast(
        'error',
        /not permitted|review yourself|pending|between 1 and 5/i.test(message)
          ? message.replace(/^.*?:\s*/, '')
          : 'Could not complete the review. Please try again.',
      )
    }
  }

  const dims = [
    { label: 'Goal Achievement', value: review.goal_achievement_rating },
    { label: 'Quality of Work', value: review.quality_rating },
    { label: 'Collaboration', value: review.collaboration_rating },
    { label: 'Initiative', value: review.initiative_rating },
  ]

  return (
    <Drawer
      open
      onClose={onClose}
      title={review.status === 'pending' ? 'Performance Review' : 'Completed Review'}
      subtitle={`${review.employee ? fullName(review.employee) : '—'} · ${review.cycle?.name ?? ''}`}
      footer={
        canComplete ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Overall:{' '}
              <span className="font-semibold text-slate-800">
                {previewOverall !== null ? formatRating(previewOverall) : '—'}
              </span>
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" form="review-form" loading={complete.isPending}>
                Complete review
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      {/* Employee + goal context */}
      <div className="mb-5 rounded-xl bg-slate-50 px-4 py-3 text-sm">
        <p className="font-medium text-slate-800">
          {review.employee ? fullName(review.employee) : '—'}{' '}
          <span className="font-mono text-xs text-slate-400">{review.employee?.employee_code}</span>
        </p>
        <p className="text-xs text-slate-500">{review.employee?.department?.name ?? '—'}</p>
        <p className="mt-1.5 text-xs text-slate-500">
          Goal context: {goalContext.count} active/completed goal{goalContext.count === 1 ? '' : 's'}
          {goalContext.avg !== null ? ` · avg progress ${goalContext.avg}%` : ''}
        </p>
      </div>

      {review.status === 'completed' ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            {review.overall_rating !== null && <RatingBadge rating={review.overall_rating} />}
          </div>
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Ratings</h3>
            <dl className="divide-y divide-slate-100 text-sm">
              {dims.map((d) => (
                <div key={d.label} className="flex justify-between py-2">
                  <dt className="text-slate-500">{d.label}</dt>
                  <dd className="font-semibold text-slate-800">{d.value ?? '—'} / 5</dd>
                </div>
              ))}
            </dl>
          </section>
          {(review.strengths || review.development_areas || review.overall_comments) && (
            <section className="space-y-3 text-sm">
              {review.strengths && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Strengths</h4>
                  <p className="mt-1 text-slate-700">{review.strengths}</p>
                </div>
              )}
              {review.development_areas && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Development areas</h4>
                  <p className="mt-1 text-slate-700">{review.development_areas}</p>
                </div>
              )}
              {review.overall_comments && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overall comments</h4>
                  <p className="mt-1 text-slate-700">{review.overall_comments}</p>
                </div>
              )}
            </section>
          )}
          <p className="text-xs text-slate-400">
            Reviewed by {review.reviewer ? `${review.reviewer.first_name} ${review.reviewer.last_name}` : '—'} ·{' '}
            {formatDate(review.completed_at)}
          </p>
        </div>
      ) : canComplete ? (
        <form id="review-form" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
          <FormSection title="Ratings (1–5)">
            {RATING_DIMENSIONS.map((dim) => (
              <SelectField
                key={dim.key}
                label={dim.label}
                required
                error={errors[dim.key]?.message}
                {...register(dim.key)}
              >
                <option value="">Select…</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </SelectField>
            ))}
          </FormSection>
          <FormSection title="Comments">
            <div className="sm:col-span-2">
              <TextAreaField label="Strengths" rows={2} error={errors.strengths?.message} {...register('strengths')} />
            </div>
            <div className="sm:col-span-2">
              <TextAreaField label="Development areas" rows={2} error={errors.development_areas?.message} {...register('development_areas')} />
            </div>
            <div className="sm:col-span-2">
              <TextAreaField label="Overall comments" rows={2} error={errors.overall_comments?.message} {...register('overall_comments')} />
            </div>
          </FormSection>
        </form>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
          This review is pending. It will be completed by HR or the employee's direct manager.
        </p>
      )}
    </Drawer>
  )
}
