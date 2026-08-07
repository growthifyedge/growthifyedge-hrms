import { format, parseISO, differenceInDays } from 'date-fns'
import type { DocumentStatus, EmployeeStatus, EmploymentType, PayFrequency } from '../types/db'

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'MMM d, yyyy')
  } catch {
    return '—'
  }
}

export function fullName(e: { first_name: string; last_name: string }): string {
  return `${e.first_name} ${e.last_name}`.trim()
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: 'Active',
  on_leave: 'On Leave',
  probation: 'Probation',
  notice_period: 'Notice Period',
  inactive: 'Inactive',
  future_hire: 'Future Hire',
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  intern: 'Intern',
}

export const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  monthly: 'Monthly',
  biweekly: 'Bi-weekly',
  weekly: 'Weekly',
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Derives a document status from its expiry date (falls back to stored status). */
export function documentStatusFromExpiry(
  expiry: string | null,
  stored: DocumentStatus,
): DocumentStatus {
  if (!expiry) return stored
  const days = differenceInDays(parseISO(expiry), new Date())
  if (days < 0) return 'Expired'
  if (days <= 30) return 'Expiring Soon'
  return stored === 'Pending Review' ? stored : 'Valid'
}
