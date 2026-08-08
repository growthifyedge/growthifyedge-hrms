import { describe, expect, it } from 'vitest'
import { formatRating, overallRating, ratingDistribution, ratingLabel } from './performance'

describe('overallRating', () => {
  it('averages the four dimensions to one decimal', () => {
    expect(overallRating(5, 4, 4, 5)).toBe(4.5)
    expect(overallRating(4, 4, 4, 4)).toBe(4)
    expect(overallRating(3, 4, 4, 3)).toBe(3.5)
  })

  it('rounds correctly on uneven sums', () => {
    expect(overallRating(4, 4, 4, 5)).toBe(4.3) // 4.25 -> 4.3
    expect(overallRating(3, 3, 3, 4)).toBe(3.3) // 3.25 -> 3.3
    expect(overallRating(2, 3, 2, 2)).toBe(2.3)
  })

  it('covers the scale ends', () => {
    expect(overallRating(1, 1, 1, 1)).toBe(1)
    expect(overallRating(5, 5, 5, 5)).toBe(5)
  })
})

describe('ratingLabel', () => {
  it('maps each interpretation band', () => {
    expect(ratingLabel(5)).toBe('Exceptional')
    expect(ratingLabel(4.5)).toBe('Exceptional')
    expect(ratingLabel(4.4)).toBe('Exceeds Expectations')
    expect(ratingLabel(3.5)).toBe('Exceeds Expectations')
    expect(ratingLabel(3.4)).toBe('Meets Expectations')
    expect(ratingLabel(2.5)).toBe('Meets Expectations')
    expect(ratingLabel(2.4)).toBe('Needs Improvement')
    expect(ratingLabel(1.5)).toBe('Needs Improvement')
    expect(ratingLabel(1.4)).toBe('Unsatisfactory')
    expect(ratingLabel(1)).toBe('Unsatisfactory')
  })
})

describe('formatRating', () => {
  it('always shows one decimal', () => {
    expect(formatRating(4)).toBe('4.0')
    expect(formatRating(4.25)).toBe('4.3')
  })

  it('em-dashes missing ratings', () => {
    expect(formatRating(null)).toBe('—')
    expect(formatRating(undefined)).toBe('—')
  })
})

describe('ratingDistribution', () => {
  it('buckets ratings into all five bands in order', () => {
    const result = ratingDistribution([4.8, 4.5, 4.0, 3.5, 3.0, 2.0, 1.2])
    expect(result.map((r) => `${r.label}:${r.count}`)).toEqual([
      'Exceptional:2',
      'Exceeds Expectations:2',
      'Meets Expectations:1',
      'Needs Improvement:1',
      'Unsatisfactory:1',
    ])
  })

  it('handles an empty set', () => {
    expect(ratingDistribution([]).every((b) => b.count === 0)).toBe(true)
  })
})
