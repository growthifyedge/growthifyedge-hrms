import type { LucideIcon } from 'lucide-react'
import { Card } from './Card'
import { Skeleton } from './Skeleton'
import { cn } from '../../lib/utils'

interface KpiCardProps {
  label: string
  value: string | number | null | undefined
  icon: LucideIcon
  hint?: string
  loading?: boolean
  error?: boolean
  onClick?: () => void
}

export function KpiCard({ label, value, icon: Icon, hint, loading, error, onClick }: KpiCardProps) {
  const body = (
    <div className="flex items-start gap-3 p-4">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {loading ? (
          <Skeleton className="mt-1.5 h-7 w-20" />
        ) : error ? (
          <p className="mt-1 text-sm text-red-600">Unavailable</p>
        ) : (
          <p className="mt-0.5 truncate text-2xl font-semibold text-slate-900">{value ?? '—'}</p>
        )}
        {hint && !loading && !error && <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  )

  if (onClick) {
    return (
      <Card className={cn('text-left transition-shadow hover:shadow-panel')}>
        <button type="button" onClick={onClick} className="w-full text-left" aria-label={label}>
          {body}
        </button>
      </Card>
    )
  }
  return <Card>{body}</Card>
}
