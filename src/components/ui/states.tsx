import type { ReactNode } from 'react'
import { Inbox, AlertTriangle, ShieldAlert, Hourglass, RefreshCw } from 'lucide-react'
import { Button } from './Button'

function StateShell({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode
  title: string
  message?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {message && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({
  title = 'Nothing here yet',
  message,
  action,
}: {
  title?: string
  message?: string
  action?: ReactNode
}) {
  return <StateShell icon={<Inbox className="h-6 w-6" aria-hidden />} title={title} message={message} action={action} />
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this data. Please try again.',
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <StateShell
      icon={<AlertTriangle className="h-6 w-6 text-amber-500" aria-hidden />}
      title={title}
      message={message}
      action={
        onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Retry
          </Button>
        )
      }
    />
  )
}

export function AccessDenied({ message = 'You do not have permission to view this page.' }: { message?: string }) {
  return (
    <StateShell
      icon={<ShieldAlert className="h-6 w-6 text-red-500" aria-hidden />}
      title="Access restricted"
      message={message}
    />
  )
}

export function ComingSoon({ module }: { module: string }) {
  return (
    <StateShell
      icon={<Hourglass className="h-6 w-6 text-accent-500" aria-hidden />}
      title={`${module} is coming soon`}
      message="This module is planned for a future release of GrowthifyEdge HRMS."
    />
  )
}
