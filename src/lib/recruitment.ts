import type { CandidateSource, CandidateStage, JobEmploymentType, JobStatus, OnboardingTask } from '../types/db'

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  closed: 'Closed',
}

export const JOB_EMPLOYMENT_TYPE_LABELS: Record<JobEmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
}

/** Pipeline order — also drives the board column layout. */
export const STAGE_ORDER: CandidateStage[] = [
  'applied',
  'screening',
  'interview',
  'offer',
  'hired',
  'rejected',
]

export const STAGE_LABELS: Record<CandidateStage, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
}

export const CANDIDATE_SOURCES: CandidateSource[] = [
  'LinkedIn',
  'Referral',
  'Company Website',
  'Indeed',
  'Recruiter',
]

/**
 * Stages an HR admin can move a candidate to from the current stage.
 * Forward-only through the funnel, plus Rejected from any active stage;
 * hired is terminal (conversion happens via the Hire flow, not this list).
 */
export function nextStageOptions(current: CandidateStage): CandidateStage[] {
  if (current === 'hired' || current === 'rejected') return []
  const funnel: CandidateStage[] = ['applied', 'screening', 'interview', 'offer']
  const idx = funnel.indexOf(current)
  const forward = funnel.slice(idx + 1)
  return [...forward, 'rejected']
}

/** Whole-number percentage of completed onboarding tasks (0 when empty). */
export function onboardingProgress(tasks: Array<Pick<OnboardingTask, 'status'>>): number {
  if (tasks.length === 0) return 0
  const done = tasks.filter((t) => t.status === 'completed').length
  return Math.round((done / tasks.length) * 100)
}

/** "3.5 yrs" / "1 yr" style label. */
export function formatExperience(years: number | null | undefined): string {
  if (years === null || years === undefined) return '—'
  const rounded = Number.isInteger(years) ? years : Number(years.toFixed(1))
  return `${rounded} ${rounded === 1 ? 'yr' : 'yrs'}`
}

/** Employment type on the employees table for a hire from the given job type. */
export function toEmployeeEmploymentType(
  jobType: JobEmploymentType,
): 'full_time' | 'part_time' | 'contract' | 'intern' {
  return jobType === 'internship' ? 'intern' : jobType
}
