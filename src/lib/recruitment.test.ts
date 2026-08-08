import { describe, expect, it } from 'vitest'
import {
  formatExperience,
  nextStageOptions,
  onboardingProgress,
  toEmployeeEmploymentType,
} from './recruitment'

describe('nextStageOptions', () => {
  it('moves forward through the funnel plus rejected', () => {
    expect(nextStageOptions('applied')).toEqual(['screening', 'interview', 'offer', 'rejected'])
    expect(nextStageOptions('screening')).toEqual(['interview', 'offer', 'rejected'])
    expect(nextStageOptions('interview')).toEqual(['offer', 'rejected'])
  })

  it('offer can only be rejected via the selector (hiring is a separate flow)', () => {
    expect(nextStageOptions('offer')).toEqual(['rejected'])
  })

  it('hired and rejected are terminal', () => {
    expect(nextStageOptions('hired')).toEqual([])
    expect(nextStageOptions('rejected')).toEqual([])
  })
})

describe('onboardingProgress', () => {
  it('is the completed share as a whole percentage', () => {
    expect(
      onboardingProgress([
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'pending' },
        { status: 'pending' },
        { status: 'pending' },
      ]),
    ).toBe(50)
    expect(onboardingProgress([{ status: 'completed' }, { status: 'pending' }, { status: 'pending' }])).toBe(33)
  })

  it('handles empty and complete checklists', () => {
    expect(onboardingProgress([])).toBe(0)
    expect(onboardingProgress([{ status: 'completed' }])).toBe(100)
  })
})

describe('formatExperience', () => {
  it('formats singular, plural and decimals', () => {
    expect(formatExperience(1)).toBe('1 yr')
    expect(formatExperience(7)).toBe('7 yrs')
    expect(formatExperience(3.5)).toBe('3.5 yrs')
  })

  it('em-dashes missing values', () => {
    expect(formatExperience(null)).toBe('—')
    expect(formatExperience(undefined)).toBe('—')
  })
})

describe('toEmployeeEmploymentType', () => {
  it('maps internship to intern and passes the rest through', () => {
    expect(toEmployeeEmploymentType('internship')).toBe('intern')
    expect(toEmployeeEmploymentType('full_time')).toBe('full_time')
    expect(toEmployeeEmploymentType('part_time')).toBe('part_time')
    expect(toEmployeeEmploymentType('contract')).toBe('contract')
  })
})
