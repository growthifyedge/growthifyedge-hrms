import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Compass className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="text-base font-semibold text-slate-800">Page not found</h2>
      <p className="max-w-sm text-sm text-slate-500">
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        to="/dashboard"
        className="mt-1 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
