import { describe, expect, it } from 'vitest'
import { cycleFormSchema, goalFormSchema, reviewFormSchema } from './schemas'

const validGoal = {
  employee_id: 'emp-1',
  title: 'Cut API p95 latency by 30%',
  description: '',
  category: 'performance',
  start_date: '2026-06-01',
  target_date: '2026-09-30',
  progress_percent: 40,
  status: 'in_progress',
}

describe('goalFormSchema', () => {
  it('accepts a complete goal', () => {
    expect(goalFormSchema.safeParse(validGoal).success).toBe(true)
  })

  it('requires employee, title, category and dates', () => {
    expect(goalFormSchema.safeParse({ ...validGoal, employee_id: '' }).success).toBe(false)
    expect(goalFormSchema.safeParse({ ...validGoal, title: '' }).success).toBe(false)
    expect(goalFormSchema.safeParse({ ...validGoal, start_date: '' }).success).toBe(false)
    expect(goalFormSchema.safeParse({ ...validGoal, target_date: '' }).success).toBe(false)
  })

  it('rejects target date before start date', () => {
    const result = goalFormSchema.safeParse({ ...validGoal, target_date: '2026-05-01' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('target_date'))).toBe(true)
    }
  })

  it('bounds progress to 0–100 whole numbers', () => {
    expect(goalFormSchema.safeParse({ ...validGoal, progress_percent: -5 }).success).toBe(false)
    expect(goalFormSchema.safeParse({ ...validGoal, progress_percent: 105 }).success).toBe(false)
    expect(goalFormSchema.safeParse({ ...validGoal, progress_percent: 55.5 }).success).toBe(false)
  })

  it('requires 100% when completed but lets cancelled keep its progress', () => {
    expect(
      goalFormSchema.safeParse({ ...validGoal, status: 'completed', progress_percent: 80 }).success,
    ).toBe(false)
    expect(
      goalFormSchema.safeParse({ ...validGoal, status: 'completed', progress_percent: 100 }).success,
    ).toBe(true)
    expect(
      goalFormSchema.safeParse({ ...validGoal, status: 'cancelled', progress_percent: 25 }).success,
    ).toBe(true)
  })
})

const validReview = {
  goal_achievement_rating: 4,
  quality_rating: 5,
  collaboration_rating: 4,
  initiative_rating: 3,
  strengths: 'Strong delivery.',
  development_areas: '',
  overall_comments: '',
}

describe('reviewFormSchema', () => {
  it('accepts a complete review', () => {
    expect(reviewFormSchema.safeParse(validReview).success).toBe(true)
  })

  it('requires all four ratings within 1–5', () => {
    expect(reviewFormSchema.safeParse({ ...validReview, quality_rating: '' }).success).toBe(false)
    expect(reviewFormSchema.safeParse({ ...validReview, initiative_rating: 0 }).success).toBe(false)
    expect(reviewFormSchema.safeParse({ ...validReview, collaboration_rating: 6 }).success).toBe(false)
  })

  it('coerces select string values', () => {
    const result = reviewFormSchema.safeParse({ ...validReview, goal_achievement_rating: '5' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.goal_achievement_rating).toBe(5)
  })
})

describe('cycleFormSchema', () => {
  const validCycle = {
    name: 'Mid-Year 2026 Review',
    start_date: '2026-06-01',
    end_date: '2026-08-31',
    status: 'active',
  }

  it('accepts a valid cycle and rejects inverted dates', () => {
    expect(cycleFormSchema.safeParse(validCycle).success).toBe(true)
    expect(cycleFormSchema.safeParse({ ...validCycle, end_date: '2026-05-01' }).success).toBe(false)
    expect(cycleFormSchema.safeParse({ ...validCycle, name: '' }).success).toBe(false)
  })
})
