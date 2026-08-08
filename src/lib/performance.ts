import type { CycleStatus, GoalCategory, GoalStatus, ReviewStatus } from '../types/db'

export const GOAL_CATEGORY_LABELS: Record<GoalCategory, string> = {
  performance: 'Performance',
  development: 'Development',
  project: 'Project',
  leadership: 'Leadership',
}

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const CYCLE_STATUS_LABELS: Record<CycleStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  closed: 'Closed',
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
}

export const RATING_DIMENSIONS = [
  { key: 'goal_achievement_rating', label: 'Goal Achievement' },
  { key: 'quality_rating', label: 'Quality of Work' },
  { key: 'collaboration_rating', label: 'Collaboration' },
  { key: 'initiative_rating', label: 'Initiative' },
] as const

/** Average of the four 1–5 dimension ratings, rounded to one decimal. */
export function overallRating(
  goalAchievement: number,
  quality: number,
  collaboration: number,
  initiative: number,
): number {
  return Math.round(((goalAchievement + quality + collaboration + initiative) / 4) * 10) / 10
}

export type RatingLabel =
  | 'Exceptional'
  | 'Exceeds Expectations'
  | 'Meets Expectations'
  | 'Needs Improvement'
  | 'Unsatisfactory'

/** Fixed interpretation bands (no configurable scales by design). */
export function ratingLabel(rating: number): RatingLabel {
  if (rating >= 4.5) return 'Exceptional'
  if (rating >= 3.5) return 'Exceeds Expectations'
  if (rating >= 2.5) return 'Meets Expectations'
  if (rating >= 1.5) return 'Needs Improvement'
  return 'Unsatisfactory'
}

export const RATING_LABEL_TONES: Record<RatingLabel, 'green' | 'blue' | 'slate' | 'amber' | 'red'> = {
  Exceptional: 'green',
  'Exceeds Expectations': 'blue',
  'Meets Expectations': 'slate',
  'Needs Improvement': 'amber',
  Unsatisfactory: 'red',
}

/** "4.3" style display (one decimal, never trailing garbage). */
export function formatRating(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) return '—'
  return rating.toFixed(1)
}

export interface RatingDistribution {
  label: RatingLabel
  count: number
}

/** Distribution of completed-review ratings across the interpretation bands. */
export function ratingDistribution(ratings: number[]): RatingDistribution[] {
  const bands: RatingLabel[] = [
    'Exceptional',
    'Exceeds Expectations',
    'Meets Expectations',
    'Needs Improvement',
    'Unsatisfactory',
  ]
  const counts = new Map<RatingLabel, number>(bands.map((b) => [b, 0]))
  for (const r of ratings) {
    const label = ratingLabel(r)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return bands.map((label) => ({ label, count: counts.get(label) ?? 0 }))
}
