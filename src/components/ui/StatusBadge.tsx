import type { DocumentStatus, EmployeeStatus, RecordStatus } from '../../types/db'
import { EMPLOYEE_STATUS_LABELS } from '../../lib/format'
import { cn } from '../../lib/utils'

const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  blue: 'bg-accent-50 text-accent-700 ring-accent-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
} as const

type Tone = keyof typeof TONES

export function Badge({ tone = 'slate', label }: { tone?: Tone; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
      )}
    >
      {label}
    </span>
  )
}

const EMPLOYEE_STATUS_TONES: Record<EmployeeStatus, Tone> = {
  active: 'green',
  on_leave: 'amber',
  probation: 'blue',
  notice_period: 'amber',
  inactive: 'slate',
  future_hire: 'violet',
}

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  return <Badge tone={EMPLOYEE_STATUS_TONES[status] ?? 'slate'} label={EMPLOYEE_STATUS_LABELS[status] ?? status} />
}

const DOCUMENT_STATUS_TONES: Record<DocumentStatus, Tone> = {
  Valid: 'green',
  'Expiring Soon': 'amber',
  Expired: 'red',
  'Pending Review': 'blue',
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return <Badge tone={DOCUMENT_STATUS_TONES[status] ?? 'slate'} label={status} />
}

export function RecordStatusBadge({ status }: { status: RecordStatus }) {
  return <Badge tone={status === 'active' ? 'green' : 'slate'} label={status === 'active' ? 'Active' : 'Inactive'} />
}
